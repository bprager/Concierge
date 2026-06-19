#!/usr/bin/env python3
"""Compare captured bridge contract evidence with Concierge bridge contracts."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts import validate_repo

FORBIDDEN_EVIDENCE_FIELDS = {
    "authorization",
    "auth",
    "authToken",
    "bearerToken",
    "body",
    "endpoint",
    "headers",
    "host",
    "message",
    "prompt",
    "requestBody",
    "responseBody",
    "responseText",
    "text",
    "token",
    "url",
}
SECRET_VALUE_PATTERN = re.compile(r"bearer\s+\S+|secret[_\-\s]?\w*", re.IGNORECASE)
FIELD_SEPARATOR_PATTERN = re.compile(r"[^a-z0-9]+")
RUNTIME_VALIDATION_SOURCES = {"real_runtime", "local_harness", "local_simulation"}
ADVISORY_HARNESS_OPERATION_ALIASES = {
    ("text_turn", "/cos/text-turn"): {
        "transport": "http_post",
        "requestKind": "text_turn",
    }
}


def normalized_evidence_field_name(field: str) -> str:
    return FIELD_SEPARATOR_PATTERN.sub("", field.lower())


FORBIDDEN_EVIDENCE_FIELD_KEYS = {normalized_evidence_field_name(field) for field in FORBIDDEN_EVIDENCE_FIELDS}


def load_evidence_records(path: Path) -> list[dict[str, Any]]:
    source = path if path.is_absolute() else ROOT / path
    payload = json.loads(source.read_text(encoding="utf-8"))
    if isinstance(payload, dict) and isinstance(payload.get("records"), list):
        payload = payload["records"]
    if not isinstance(payload, list):
        raise ValueError("Bridge evidence must be a JSON list or an object with a records list")
    records: list[dict[str, Any]] = []
    for index, record in enumerate(payload):
        if not isinstance(record, dict):
            raise ValueError(f"Bridge evidence record {index} is not an object")
        records.append(record)
    return records


def operation_by_id() -> dict[str, dict[str, Any]]:
    return {operation["id"]: operation for operation in validate_repo.load_bridge_operations()}


def find_privacy_violations(record: Any, path: str = "$") -> list[str]:
    violations: list[str] = []
    if isinstance(record, dict):
        for key, value in record.items():
            key_path = f"{path}.{key}"
            if normalized_evidence_field_name(key) in FORBIDDEN_EVIDENCE_FIELD_KEYS:
                violations.append(f"{key_path}: forbidden evidence field {key}")
            violations.extend(find_privacy_violations(value, key_path))
    elif isinstance(record, list):
        for index, value in enumerate(record):
            violations.extend(find_privacy_violations(value, f"{path}[{index}]"))
    elif isinstance(record, str) and SECRET_VALUE_PATTERN.search(record):
        violations.append(f"{path}: secret-like evidence value")
    return violations


def require_string(record: dict[str, Any], field: str, index: int, violations: list[str]) -> str | None:
    value = record.get(field)
    if not isinstance(value, str) or not value:
        violations.append(f"record {index}: missing or invalid {field}")
        return None
    return value


def require_bool(record: dict[str, Any], field: str, index: int, violations: list[str]) -> bool | None:
    value = record.get(field)
    if not isinstance(value, bool):
        violations.append(f"record {index}: missing or invalid {field}")
        return None
    return value


def require_string_list(record: dict[str, Any], field: str, index: int, violations: list[str]) -> None:
    value = record.get(field)
    if value is not None and not (isinstance(value, list) and all(isinstance(item, str) for item in value)):
        violations.append(f"record {index}: {field} must be a list of strings")


def compare_bridge_evidence_records(records: list[dict[str, Any]]) -> list[str]:
    operations = operation_by_id()
    request_kinds = validate_repo.load_openapi_request_kinds()
    violations: list[str] = []

    for index, record in enumerate(records):
        prefix = f"record {index}"
        violations.extend(f"{prefix}{violation[1:]}" for violation in find_privacy_violations(record))

        if record.get("kind") != "bridge_contract_evidence":
            violations.append(f"{prefix}: kind must be bridge_contract_evidence")

        operation_id = require_string(record, "operationId", index, violations)
        request_kind = require_string(record, "requestKind", index, violations)
        transport = require_string(record, "transport", index, violations)
        status = require_string(record, "status", index, violations)
        target_path = require_string(record, "targetPath", index, violations)
        require_string(record, "traceId", index, violations)
        require_string(record, "requestId", index, violations)
        require_string(record, "descriptorStatus", index, violations)
        require_string(record, "profileMode", index, violations)
        runtime_validation_source = record.get("runtimeValidationSource")
        if runtime_validation_source is not None and runtime_validation_source not in RUNTIME_VALIDATION_SOURCES:
            violations.append(f"{prefix}: runtimeValidationSource must be one of {sorted(RUNTIME_VALIDATION_SOURCES)}")
        provenance_verified = require_bool(record, "provenanceVerified", index, violations)
        require_string_list(record, "selectedAgentIds", index, violations)
        require_string_list(record, "allowedEffects", index, violations)
        require_string_list(record, "blockedEffects", index, violations)
        if "traceEnvelopeObserved" in record:
            require_bool(record, "traceEnvelopeObserved", index, violations)
        if "traceEnvelopeMatched" in record:
            require_bool(record, "traceEnvelopeMatched", index, violations)
        if "traceTargetPath" in record and record.get("traceTargetPath") != "/cos/trace/{trace_id}":
            violations.append(f"{prefix}: traceTargetPath must be /cos/trace/{{trace_id}}")

        operation = operations.get(operation_id or "")
        if operation is None:
            violations.append(f"{prefix}: unknown operationId {operation_id}")
            continue

        expected_path = operation["path"]
        expected_transport = operation["transport"]
        advisory_alias = ADVISORY_HARNESS_OPERATION_ALIASES.get((operation_id, target_path or ""))
        if target_path != expected_path and advisory_alias is None:
            violations.append(
                f"{prefix}: targetPath does not match operation {operation_id}: {target_path} != {expected_path}"
            )
        if advisory_alias is not None:
            expected_transport = advisory_alias["transport"]
        if transport != expected_transport:
            violations.append(
                f"{prefix}: transport does not match operation {operation_id}: {transport} != {expected_transport}"
            )

        expected_request_kind = (
            advisory_alias["requestKind"] if advisory_alias is not None else request_kinds.get(expected_path)
        )
        if expected_request_kind and request_kind != expected_request_kind:
            violations.append(
                f"{prefix}: requestKind does not match OpenAPI for {target_path}: {request_kind} != {expected_request_kind}"
            )

        if status not in {"success", "fail_closed"}:
            violations.append(f"{prefix}: status must be success or fail_closed")
        if status == "success":
            for field in ["decisionId", "auditId", "governanceOutcome"]:
                require_string(record, field, index, violations)
            if provenance_verified is not True:
                violations.append(f"{prefix}: success evidence must have verified provenance")
            if "reason" in record:
                violations.append(f"{prefix}: success evidence must not include a fail-closed reason")
            if advisory_alias is not None and (
                record.get("traceEnvelopeObserved") is not True
                or record.get("traceEnvelopeMatched") is not True
                or record.get("traceTargetPath") != "/cos/trace/{trace_id}"
            ):
                violations.append(f"{prefix}: advisory harness success evidence must include a matching observed trace envelope")
            elif record.get("traceEnvelopeObserved") is True and record.get("traceEnvelopeMatched") is not True:
                violations.append(f"{prefix}: observed trace envelope must match the text-turn trace")
        if status == "fail_closed":
            require_string(record, "reason", index, violations)
            if provenance_verified is not False:
                violations.append(f"{prefix}: fail-closed evidence must not claim verified provenance")

    return violations


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("evidence_file", help="JSON bridge_contract_evidence file to compare")
    args = parser.parse_args(argv)

    try:
        records = load_evidence_records(Path(args.evidence_file))
        violations = compare_bridge_evidence_records(records)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"bridge evidence comparison failed: {error}", file=sys.stderr)
        return 1

    if violations:
        print("bridge evidence comparison failed:", file=sys.stderr)
        for violation in violations:
            print(f"- {violation}", file=sys.stderr)
        return 1

    print(f"bridge evidence comparison passed: {len(records)} record(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
