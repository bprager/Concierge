#!/usr/bin/env python3
"""Generate the Concierge bridge operation registry from the OpenAPI contract."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "api/napoleon_bridge.openapi.yaml"
OUTPUT_PATH = ROOT / "app/src/generatedBridgeOperations.ts"

OPERATION_IDS_BY_PATH = {
    "/v1/concierge/turn": "text_turn",
    "/v1/concierge/chief-of-staff/capabilities": "chief_of_staff_capabilities",
    "/v1/concierge/chief-of-staff/descriptor": "chief_of_staff_descriptor",
    "/v1/concierge/chief-of-staff/steering": "chief_of_staff_steering",
    "/v1/concierge/memory-proposals": "memory_proposal_review",
    "/v1/concierge/evaluate": "evaluate",
}

GET_REQUEST_KINDS_BY_PATH = {
    "/v1/concierge/chief-of-staff/capabilities": "chief_of_staff_capabilities",
    "/v1/concierge/chief-of-staff/descriptor": "chief_of_staff_descriptor",
}

HTTP_METHOD_TO_TRANSPORT = {
    "get": "http_get",
    "post": "http_post",
}

NAPOLEON_REVIEW_OPERATION_IDS = {
    "chief_of_staff_request",
    "evaluation_review",
    "evolution_proposal_review",
    "evolution_proposal_submission",
    "evolution_proposal_status",
    "governance_evaluation",
    "governance_review",
    "new_agent_proposal_review",
    "observability_trace",
}

NAPOLEON_REVIEW_REQUEST_KINDS = {
    "chief_of_staff_request_handoff",
    "evaluation_review_handoff",
    "evolution_proposal_review_handoff",
    "evolution_proposal_submission_handoff",
    "evolution_proposal_status_handoff",
    "governance_evaluation_handoff",
    "governance_review_handoff",
    "new_agent_proposal_review_handoff",
    "observability_trace_handoff",
}

NAPOLEON_REVIEW_PATH_PREFIXES = (
    "/chief-of-staff/",
    "/evolution/",
    "/governance/",
    "/observability/",
)

NAPOLEON_DISCOVERY_OPERATION_IDS = {
    "agent_manifest_list",
    "agent_manifest",
    "profile",
}

NAPOLEON_DISCOVERY_OPERATION_ORDER = {
    "agent_manifest_list": 0,
    "agent_manifest": 1,
    "profile": 2,
}

NAPOLEON_DISCOVERY_REQUEST_KINDS = {
    "agent_manifest_discovery",
    "profile_metadata_discovery",
}

NAPOLEON_DISCOVERY_PATH_PREFIXES = (
    "/agents",
    "/profiles",
)


def operation_method_for(path_spec: dict[str, Any], path: str) -> tuple[str, dict[str, Any]]:
    methods = [method for method in HTTP_METHOD_TO_TRANSPORT if method in path_spec]
    if len(methods) != 1:
        raise SystemExit(f"OpenAPI path must define exactly one supported bridge method: {path}")
    method = methods[0]
    return method, path_spec[method]


def request_kind_for(path: str, operation: dict[str, Any]) -> str:
    schema = (
        operation.get("requestBody", {})
        .get("content", {})
        .get("application/json", {})
        .get("schema", {})
    )
    request_kind = schema.get("properties", {}).get("requestKind", {}).get("const")
    if request_kind:
        return str(request_kind)
    request_kind = GET_REQUEST_KINDS_BY_PATH.get(path)
    if request_kind:
        return request_kind
    raise SystemExit(f"OpenAPI path lacks requestKind const: {path}")


def response_required_for(path: str, operation: dict[str, Any]) -> list[str]:
    schema = (
        operation.get("responses", {})
        .get("200", {})
        .get("content", {})
        .get("application/json", {})
        .get("schema", {})
    )
    required = schema.get("required")
    if not isinstance(required, list) or not all(isinstance(item, str) for item in required):
        raise SystemExit(f"OpenAPI path lacks 200 response required fields: {path}")
    return required


def sorted_review_operations(openapi: dict[str, Any]) -> list[dict[str, Any]]:
    review_operations = openapi.get("x-concierge-napoleon-review-operations", [])
    if not isinstance(review_operations, list):
        raise SystemExit("x-concierge-napoleon-review-operations must be a list")

    operations = []
    seen_ids: set[str] = set()
    for operation in review_operations:
        if not isinstance(operation, dict):
            raise SystemExit("Napoleon review operation entries must be objects")
        operation_id = operation.get("id")
        path = operation.get("path")
        request_kind = operation.get("requestKind")
        response_required = operation.get("responseRequired")
        transport = operation.get("transport", "http_post")
        if operation_id not in NAPOLEON_REVIEW_OPERATION_IDS:
            raise SystemExit(f"Unknown Napoleon review operation id: {operation_id}")
        if operation_id in seen_ids:
            raise SystemExit(f"Duplicate Napoleon review operation id: {operation_id}")
        if not isinstance(path, str) or not path.startswith(NAPOLEON_REVIEW_PATH_PREFIXES):
            raise SystemExit(f"Invalid Napoleon review operation path for {operation_id}: {path}")
        if request_kind not in NAPOLEON_REVIEW_REQUEST_KINDS:
            raise SystemExit(f"Invalid Napoleon review requestKind for {operation_id}: {request_kind}")
        if transport not in HTTP_METHOD_TO_TRANSPORT.values():
            raise SystemExit(f"Invalid Napoleon review transport for {operation_id}: {transport}")
        if not isinstance(response_required, list) or not all(isinstance(item, str) for item in response_required):
            raise SystemExit(f"Napoleon review operation lacks responseRequired list: {operation_id}")
        seen_ids.add(operation_id)
        operations.append(
            {
                "id": operation_id,
                "path": path,
                "requestKind": request_kind,
                "transport": transport,
                "responseRequired": response_required,
            }
        )

    missing = sorted(NAPOLEON_REVIEW_OPERATION_IDS - seen_ids)
    if missing:
        raise SystemExit(f"Missing Napoleon review operation metadata: {', '.join(missing)}")
    return sorted(operations, key=lambda operation: operation["id"])


def sorted_discovery_operations(openapi: dict[str, Any]) -> list[dict[str, Any]]:
    discovery_operations = openapi.get("x-concierge-napoleon-discovery-operations", [])
    if not isinstance(discovery_operations, list):
        raise SystemExit("x-concierge-napoleon-discovery-operations must be a list")

    operations = []
    seen_ids: set[str] = set()
    for operation in discovery_operations:
        if not isinstance(operation, dict):
            raise SystemExit("Napoleon discovery operation entries must be objects")
        operation_id = operation.get("id")
        path = operation.get("path")
        request_kind = operation.get("requestKind")
        response_required = operation.get("responseRequired")
        transport = operation.get("transport", "http_get")
        if operation_id not in NAPOLEON_DISCOVERY_OPERATION_IDS:
            raise SystemExit(f"Unknown Napoleon discovery operation id: {operation_id}")
        if operation_id in seen_ids:
            raise SystemExit(f"Duplicate Napoleon discovery operation id: {operation_id}")
        if not isinstance(path, str) or not path.startswith(NAPOLEON_DISCOVERY_PATH_PREFIXES):
            raise SystemExit(f"Invalid Napoleon discovery operation path for {operation_id}: {path}")
        if request_kind not in NAPOLEON_DISCOVERY_REQUEST_KINDS:
            raise SystemExit(f"Invalid Napoleon discovery requestKind for {operation_id}: {request_kind}")
        if transport != "http_get":
            raise SystemExit(f"Invalid Napoleon discovery transport for {operation_id}: {transport}")
        if not isinstance(response_required, list) or not all(isinstance(item, str) for item in response_required):
            raise SystemExit(f"Napoleon discovery operation lacks responseRequired list: {operation_id}")
        seen_ids.add(operation_id)
        operations.append(
            {
                "id": operation_id,
                "path": path,
                "requestKind": request_kind,
                "transport": transport,
                "responseRequired": response_required,
            }
        )

    missing = sorted(NAPOLEON_DISCOVERY_OPERATION_IDS - seen_ids)
    if missing:
        raise SystemExit(f"Missing Napoleon discovery operation metadata: {', '.join(missing)}")
    return sorted(operations, key=lambda operation: NAPOLEON_DISCOVERY_OPERATION_ORDER[operation["id"]])


def generated_text() -> str:
    openapi = yaml.safe_load(SOURCE_PATH.read_text(encoding="utf-8"))
    paths = openapi.get("paths", {})
    operations = []
    for path, path_spec in sorted(paths.items()):
        if not path.startswith("/v1/concierge/"):
            continue
        operation_id = OPERATION_IDS_BY_PATH.get(path)
        if not operation_id:
            raise SystemExit(f"OpenAPI path lacks local bridge operation id mapping: {path}")
        method, operation = operation_method_for(path_spec, path)
        security = operation.get("security", [])
        if not any("NapoleonBearer" in entry for entry in security if isinstance(entry, dict)):
            raise SystemExit(f"OpenAPI path lacks NapoleonBearer security: {path}")
        operations.append(
            {
                "id": operation_id,
                "path": path,
                "requestKind": request_kind_for(path, operation),
                "transport": HTTP_METHOD_TO_TRANSPORT[method],
                "responseRequired": response_required_for(path, operation),
            }
        )

    review_operations = sorted_review_operations(openapi)
    discovery_operations = sorted_discovery_operations(openapi)

    lines = [
        "// Generated by scripts/generate_bridge_operations.py from api/napoleon_bridge.openapi.yaml.",
        "// Do not edit by hand.",
        "",
        'export const GENERATED_BRIDGE_CONTRACT_SOURCE = "api/napoleon_bridge.openapi.yaml" as const;',
        "",
        "export const GENERATED_BRIDGE_OPERATIONS = [",
    ]
    for operation in operations:
        lines.extend(
            [
                "  {",
                f'    id: "{operation["id"]}",',
                f'    path: "{operation["path"]}",',
                f'    requestKind: "{operation["requestKind"]}",',
                f'    transport: "{operation["transport"]}",',
                "    responseRequired: ["
                + ", ".join(f'"{field}"' for field in operation["responseRequired"])
                + "],",
                "    governedBridgeOnly: true,",
                '    tokenPlacement: "authorization_header_only",',
                "  },",
            ]
        )
    lines.extend(["] as const;", ""])
    lines.append("export const GENERATED_NAPOLEON_REVIEW_OPERATIONS = [")
    for operation in review_operations:
        lines.extend(
            [
                "  {",
                f'    id: "{operation["id"]}",',
                f'    path: "{operation["path"]}",',
                f'    requestKind: "{operation["requestKind"]}",',
                f'    transport: "{operation["transport"]}",',
                "    responseRequired: ["
                + ", ".join(f'"{field}"' for field in operation["responseRequired"])
                + "],",
                "    governedBridgeOnly: true,",
                '    tokenPlacement: "authorization_header_only",',
                "  },",
            ]
        )
    lines.extend(["] as const;", ""])
    lines.append("export const GENERATED_NAPOLEON_DISCOVERY_OPERATIONS = [")
    for operation in discovery_operations:
        lines.extend(
            [
                "  {",
                f'    id: "{operation["id"]}",',
                f'    path: "{operation["path"]}",',
                f'    requestKind: "{operation["requestKind"]}",',
                f'    transport: "{operation["transport"]}",',
                "    responseRequired: ["
                + ", ".join(f'"{field}"' for field in operation["responseRequired"])
                + "],",
                "    governedBridgeOnly: true,",
                '    tokenPlacement: "authorization_header_only",',
                "  },",
            ]
        )
    lines.extend(["] as const;", ""])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="fail if the generated file is stale")
    args = parser.parse_args()

    expected = generated_text()
    if args.check:
        actual = OUTPUT_PATH.read_text(encoding="utf-8") if OUTPUT_PATH.exists() else ""
        if actual != expected:
            raise SystemExit("app/src/generatedBridgeOperations.ts is stale; run scripts/generate_bridge_operations.py")
        print("generated bridge operations are current")
        return 0

    OUTPUT_PATH.write_text(expected, encoding="utf-8")
    print(f"wrote {OUTPUT_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
