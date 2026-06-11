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
            if key in FORBIDDEN_EVIDENCE_FIELDS:
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
        status = require_string(record, "status", index, violations)
        target_path = require_string(record, "targetPath", index, violations)
        require_string(record, "traceId", index, violations)
        require_string(record, "requestId", index, violations)
        require_string(record, "descriptorStatus", index, violations)
        require_string(record, "profileMode", index, violations)
        provenance_verified = require_bool(record, "provenanceVerified", index, violations)
        require_string_list(record, "selectedAgentIds", index, violations)
        require_string_list(record, "allowedEffects", index, violations)
        require_string_list(record, "blockedEffects", index, violations)

        operation = operations.get(operation_id or "")
        if operation is None:
            violations.append(f"{prefix}: unknown operationId {operation_id}")
            continue

        expected_path = operation["path"]
        if target_path != expected_path:
            violations.append(
                f"{prefix}: targetPath does not match operation {operation_id}: {target_path} != {expected_path}"
            )

        expected_request_kind = request_kinds.get(expected_path)
        if expected_request_kind and request_kind != expected_request_kind:
            violations.append(
                f"{prefix}: requestKind does not match OpenAPI for {expected_path}: {request_kind} != {expected_request_kind}"
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
