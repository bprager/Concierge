#!/usr/bin/env python3
"""Validate Concierge repository contracts and documentation links."""

from __future__ import annotations

import json
import re
import warnings
from pathlib import Path
from typing import Any

import jsonschema
import yaml

warnings.filterwarnings("ignore", message="jsonschema.RefResolver is deprecated.*", category=DeprecationWarning)


ROOT = Path(__file__).resolve().parents[1]

AUTHORITY_SOURCE_ROOTS = [
    ROOT / "app/src",
    ROOT / "app/src-tauri/src",
]

AUTHORITY_SOURCE_SUFFIXES = {".ts", ".tsx", ".rs"}
AUTHORITY_SOURCE_EXCLUDED_NAMES = {
    "napoleonBridgeFixtures.ts",
}
AUTHORITY_SOURCE_EXCLUDED_PARTS = {
    ".git",
    ".venv",
    "node_modules",
    "dist",
    "target",
    "tests",
    "__tests__",
}

AUTHORITY_BOUNDARY_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (
        re.compile(
            r"\b(child_process|std::process|subprocess|os\.system)\b"
            r"|\b(?:exec|spawn)\s*\("
            r"|\bCommand::new\s*\("
        ),
        "direct process or shell execution",
    ),
    (
        re.compile(
            r"\b(memgraph|neo4j|bolt://|writeMemory|saveMemory|memoryGraph)\b"
            r"|\bgraph_write\s*\("
        ),
        "direct memory or graph access",
    ),
    (
        re.compile(
            r"\b(dispatchAgent|agentRegistry|taskRouter|callTool)\b"
            r"|\btool\.execute\s*\("
        ),
        "direct agent or tool dispatch",
    ),
]


def load_json(path: str) -> object:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def validate_json_pairs() -> None:
    pairs = [
        ("schemas/evaluator_run.schema.json", "evaluator/reports/latest.json"),
        ("schemas/user_profile.schema.json", "examples/adult_owner_profile.json"),
        ("schemas/user_profile.schema.json", "examples/child_protected_profile.json"),
        ("schemas/interaction_trace.schema.json", "examples/sample_interaction_trace.json"),
        ("schemas/concierge_text_turn.schema.json", "examples/sample_text_turn_contract.json"),
    ]
    resolver = jsonschema.RefResolver.from_schema(
        {},
        store={
            "chief_of_staff_contract.schema.json": load_json("schemas/chief_of_staff_contract.schema.json"),
            "observability_envelope.schema.json": load_json("schemas/observability_envelope.schema.json"),
        },
    )
    for schema_path, data_path in pairs:
        schema = load_json(schema_path)
        data = load_json(data_path)
        jsonschema.Draft202012Validator.check_schema(schema)
        jsonschema.validate(data, schema, resolver=resolver)
        print(f"valid json: {data_path} against {schema_path}")


def validate_all_schemas() -> None:
    for path in sorted((ROOT / "schemas").glob("*.schema.json")):
        jsonschema.Draft202012Validator.check_schema(json.loads(path.read_text(encoding="utf-8")))
        print(f"valid schema: {path.relative_to(ROOT)}")


def validate_yaml() -> None:
    for path in sorted(ROOT.rglob("*.yaml")) + sorted(ROOT.rglob("*.yml")):
        if any(part in {".git", ".venv", "node_modules", "dist", "target"} for part in path.parts):
            continue
        yaml.safe_load(path.read_text(encoding="utf-8"))
        print(f"valid yaml: {path.relative_to(ROOT)}")


def validate_markdown_links() -> None:
    missing = []
    for path in ROOT.rglob("*.md"):
        if any(part in {".git", ".venv", "node_modules", "dist", "target"} for part in path.parts):
            continue
        text = path.read_text(encoding="utf-8")
        for match in re.finditer(r"\[[^\]]+\]\(([^)]+)\)", text):
            target = match.group(1).split("#", 1)[0]
            if not target or "://" in target or target.startswith("mailto:"):
                continue
            if not (path.parent / target).resolve().exists():
                missing.append(f"{path.relative_to(ROOT)}:{match.group(1)}")
    if missing:
        raise SystemExit("\n".join(missing))
    print("all markdown file links resolve")


def load_bridge_operations() -> list[dict[str, Any]]:
    text = (ROOT / "app/src/bridgeOperations.ts").read_text(encoding="utf-8")
    operations: list[dict[str, Any]] = []
    for match in re.finditer(r"\{\s*id:\s*\"([^\"]+)\"(?P<body>.*?)\n\s*\}", text, re.DOTALL):
        body = match.group("body")
        operation = {"id": match.group(1)}
        for key in ["path", "requestKind", "transport", "tokenPlacement"]:
            value = re.search(rf"{key}:\s*\"([^\"]+)\"", body)
            if value:
                operation[key] = value.group(1)
        governed = re.search(r"governedBridgeOnly:\s*(true|false)", body)
        if governed:
            operation["governedBridgeOnly"] = governed.group(1) == "true"
        operations.append(operation)
    if not operations:
        raise SystemExit("No bridge operations found in app/src/bridgeOperations.ts")
    return operations


def load_openapi() -> dict[str, Any]:
    return yaml.safe_load((ROOT / "api/napoleon_bridge.openapi.yaml").read_text(encoding="utf-8"))


def load_openapi_concierge_paths() -> list[str]:
    openapi = load_openapi()
    return sorted(path for path in openapi.get("paths", {}) if path.startswith("/v1/concierge/"))


def load_openapi_request_kinds() -> dict[str, str]:
    openapi = load_openapi()
    request_kinds: dict[str, str] = {}
    for path, path_spec in openapi.get("paths", {}).items():
        operation = path_spec.get("post") or path_spec.get("get") or {}
        schema = (
            operation.get("requestBody", {})
            .get("content", {})
            .get("application/json", {})
            .get("schema", {})
        )
        request_kind = schema.get("properties", {}).get("requestKind", {}).get("const")
        if request_kind:
            request_kinds[path] = request_kind
    return request_kinds


def load_openapi_bearer_security() -> dict[str, bool]:
    openapi = load_openapi()
    security: dict[str, bool] = {}
    for path, path_spec in openapi.get("paths", {}).items():
        operation = path_spec.get("post") or path_spec.get("get") or {}
        entries = operation.get("security", [])
        security[path] = any("NapoleonBearer" in entry for entry in entries if isinstance(entry, dict))
    return security


def find_freeform_bridge_path_callers() -> list[str]:
    offenders: list[str] = []
    for path in (ROOT / "app/src").glob("*.ts"):
        if path.name == "bridgeEndpoint.ts":
            continue
        text = path.read_text(encoding="utf-8")
        if "resolveNapoleonBridgeEndpoint(" in text:
            offenders.append(str(path.relative_to(ROOT)))
    return sorted(offenders)


def is_authority_source_path(path: Path) -> bool:
    if path.suffix not in AUTHORITY_SOURCE_SUFFIXES:
        return False
    if path.name in AUTHORITY_SOURCE_EXCLUDED_NAMES:
        return False
    if any(part in AUTHORITY_SOURCE_EXCLUDED_PARTS for part in path.parts):
        return False
    return any(path.is_relative_to(root) for root in AUTHORITY_SOURCE_ROOTS)


def authority_source_paths() -> list[Path]:
    paths: list[Path] = []
    for root in AUTHORITY_SOURCE_ROOTS:
        if not root.exists():
            continue
        paths.extend(path for path in root.rglob("*") if path.is_file() and is_authority_source_path(path))
    return sorted(paths)


def scan_authority_boundary_text(path: str, text: str) -> list[str]:
    violations: list[str] = []
    for line_number, line in enumerate(text.splitlines(), start=1):
        for pattern, reason in AUTHORITY_BOUNDARY_PATTERNS:
            if pattern.search(line):
                violations.append(f"{path}:{line_number}: {reason}")
    return violations


def find_direct_authority_boundary_violations() -> list[str]:
    violations: list[str] = []
    for path in authority_source_paths():
        relative_path = str(path.relative_to(ROOT))
        violations.extend(scan_authority_boundary_text(relative_path, path.read_text(encoding="utf-8")))
    return sorted(violations)


def validate_authority_boundary() -> None:
    violations = find_direct_authority_boundary_violations()
    if violations:
        raise SystemExit(
            "Concierge runtime code bypasses the governed Napoleon bridge:\n" + "\n".join(violations)
        )
    print("authority boundary scan passed")


def validate_bridge_contract_alignment() -> None:
    operations = load_bridge_operations()
    openapi_paths = load_openapi_concierge_paths()
    registry_paths = sorted(operation.get("path") for operation in operations)
    if registry_paths != openapi_paths:
        raise SystemExit(
            "Bridge operation paths do not match OpenAPI paths:\n"
            f"registry={registry_paths}\nopenapi={openapi_paths}"
        )

    request_kinds = load_openapi_request_kinds()
    security = load_openapi_bearer_security()
    missing_security: list[str] = []
    request_kind_mismatch: list[str] = []
    for operation in operations:
        path = operation["path"]
        if operation.get("governedBridgeOnly") is not True:
            raise SystemExit(f"Bridge operation is not governed-only: {operation['id']}")
        if operation.get("tokenPlacement") != "authorization_header_only":
            raise SystemExit(f"Bridge operation token placement is not header-only: {operation['id']}")
        if not security.get(path):
            missing_security.append(path)
        if operation["id"] != "chief_of_staff_descriptor" and request_kinds.get(path) != operation.get("requestKind"):
            request_kind_mismatch.append(
                f"{operation['id']} registry={operation.get('requestKind')} openapi={request_kinds.get(path)}"
            )

    if missing_security:
        raise SystemExit(f"OpenAPI paths missing NapoleonBearer security: {', '.join(missing_security)}")
    if request_kind_mismatch:
        raise SystemExit("Bridge requestKind mismatch:\n" + "\n".join(request_kind_mismatch))

    offenders = find_freeform_bridge_path_callers()
    if offenders:
        raise SystemExit("Bridge callers use free-form path resolution:\n" + "\n".join(offenders))
    print("bridge operations align with OpenAPI")


def main() -> int:
    validate_all_schemas()
    validate_json_pairs()
    validate_yaml()
    validate_bridge_contract_alignment()
    validate_authority_boundary()
    validate_markdown_links()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
