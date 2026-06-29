#!/usr/bin/env python3
"""Capture sanitized bridge evidence from one governed text turn."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any
from urllib import error, request

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts import bridge_evidence_compare


DEFAULT_MESSAGE = "Ask Napoleon for a governed Concierge bridge evidence check."
REQUIRED_DESCRIPTOR_BLOCKED_EFFECTS = {"runtime_authority", "memory_write"}
RUNTIME_VALIDATION_SOURCES = ("real_runtime", "local_harness", "local_simulation")
LOCAL_HARNESS_CHECKSUM = "sha256:local-harness"
KNOWN_BRIDGE_PATHS = (
    "/v1/concierge/turn",
    "/v1/concierge/evaluate",
    "/v1/concierge/chief-of-staff/descriptor",
    "/v1/concierge/chief-of-staff/steering",
    "/v1/concierge/memory-proposals",
    "/cos/descriptor",
    "/cos/capabilities",
    "/cos/text-turn",
    "/cos/trace",
    "/cos",
)


def strip_known_bridge_path(endpoint: str) -> str:
    value = endpoint.strip().rstrip("/")
    for known_path in KNOWN_BRIDGE_PATHS:
        if value.endswith(known_path):
            return value[: -len(known_path)].rstrip("/")
    return value


def bridge_url(endpoint: str, path: str = "/v1/concierge/turn") -> str:
    base = endpoint.strip().rstrip("/")
    if base.endswith(path):
        return base
    return f"{strip_known_bridge_path(base)}{path}"


def is_cos_endpoint(endpoint: str) -> bool:
    value = endpoint.strip().split("?", 1)[0].split("#", 1)[0].rstrip("/")
    return (
        value.endswith("/cos")
        or value.endswith("/cos/descriptor")
        or value.endswith("/cos/capabilities")
        or value.endswith("/cos/text-turn")
    )


def descriptor_url(endpoint: str) -> str:
    return bridge_url(
        endpoint,
        "/cos/descriptor" if is_cos_endpoint(endpoint) else "/v1/concierge/chief-of-staff/descriptor",
    )


def text_turn_url(endpoint: str) -> str:
    return bridge_url(endpoint, "/cos/text-turn" if is_cos_endpoint(endpoint) else "/v1/concierge/turn")


def cos_trace_url(endpoint: str, trace_id: str) -> str:
    base = strip_known_bridge_path(endpoint.strip().split("?", 1)[0].split("#", 1)[0].rstrip("/"))
    return f"{base}/cos/trace/{trace_id}"


def auth_headers(auth_token: str | None, cos_mode: bool, content_type: bool = False) -> dict[str, str]:
    headers: dict[str, str] = {"Content-Type": "application/json"} if content_type else {}
    if auth_token:
        if cos_mode:
            headers["X-Napoleon-Auth"] = auth_token
        else:
            headers["Authorization"] = f"Bearer {auth_token}"
    return headers


def get_json(url: str, auth_token: str | None = None, cos_mode: bool = False) -> tuple[int, dict[str, Any]]:
    headers = {}
    headers.update(auth_headers(auth_token, cos_mode))
    req = request.Request(url, headers=headers, method="GET")
    try:
        with request.urlopen(req, timeout=10) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        payload = json.loads(body) if body else {}
        return exc.code, payload
    except error.URLError:
        return 0, {"error": "transport_unavailable"}


def post_json(url: str, payload: dict[str, Any], auth_token: str | None = None, cos_mode: bool = False) -> tuple[int, dict[str, Any]]:
    headers = auth_headers(auth_token, cos_mode, content_type=True)
    req = request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=10) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        payload = json.loads(body) if body else {}
        return exc.code, payload
    except error.URLError:
        return 0, {"error": "transport_unavailable"}


def token_file_from_env(env: dict[str, str]) -> str | None:
    for key in ("NAPOLEON_EVAL_TOKEN_FILE", "NAPOLEON_RUNTIME_AUTH_TOKEN_FILE"):
        value = env.get(key)
        if value and value.strip():
            return value.strip()
    return None


def read_auth_token_file(path: str) -> str | None:
    try:
        token = Path(path).read_text(encoding="utf-8").strip()
    except OSError:
        return None
    return token or None


def resolve_auth_token(
    auth_token: str | None,
    auth_token_file: str | None,
    env: dict[str, str],
) -> str | None:
    if auth_token and auth_token.strip():
        return auth_token.strip()
    token_file = auth_token_file.strip() if auth_token_file and auth_token_file.strip() else token_file_from_env(env)
    if token_file:
        return read_auth_token_file(token_file)
    value = env.get("NAPOLEON_EVAL_TOKEN")
    return value.strip() if value and value.strip() else None


def descriptor_connection_from_response(status_code: int, payload: dict[str, Any]) -> dict[str, Any]:
    descriptor = payload.get("descriptor") if isinstance(payload.get("descriptor"), dict) else payload
    blocked_effects = (
        descriptor.get("blockedEffects")
        if isinstance(descriptor.get("blockedEffects"), list)
        else descriptor.get("blocked_effects")
        if isinstance(descriptor.get("blocked_effects"), list)
        else []
    )
    checksum = payload.get("checksum") if isinstance(payload.get("checksum"), dict) else {}
    signature = payload.get("signature") if isinstance(payload.get("signature"), dict) else {}
    cache_policy = descriptor.get("cache_policy") if isinstance(descriptor.get("cache_policy"), dict) else {}
    runtime_authority = descriptor.get("runtimeAuthority") if "runtimeAuthority" in descriptor else descriptor.get("runtime_authority")
    command_execution = descriptor.get("commandExecution") if "commandExecution" in descriptor else descriptor.get("command_execution")
    service_id = descriptor.get("serviceId") or descriptor.get("service_id")
    endpoints = descriptor.get("endpoints") if isinstance(descriptor.get("endpoints"), dict) else {}
    supported_authority_tiers = (
        descriptor.get("supportedAuthorityTiers")
        if isinstance(descriptor.get("supportedAuthorityTiers"), list)
        else descriptor.get("supported_authority_tiers")
        if isinstance(descriptor.get("supported_authority_tiers"), list)
        else []
    )
    live_runtime_descriptor = (
        descriptor.get("schema_version") == "napoleon/concierge/runtime-descriptor/v1"
        and endpoints.get("descriptor") == "GET /cos/descriptor"
        and endpoints.get("text_turn") == "POST /cos/text-turn"
        and set(str(tier) for tier in supported_authority_tiers).issubset({"advisory_prepare_only"})
    )
    fail_closed_cache = (
        descriptor.get("cachePolicy") == "fail_closed_to_review_required"
        or cache_policy.get("stale_descriptor_action") == "fail_closed_to_review_required"
        or live_runtime_descriptor
    )
    checksum_state = (
        "matched"
        if checksum.get("expected") is not None and checksum.get("expected") == checksum.get("actual")
        else "mismatch"
        if checksum.get("expected") is not None or checksum.get("actual") is not None
        else "not_checked"
    )
    signature_state = "valid" if signature.get("valid") is True else "invalid" if signature.get("valid") is False else "not_checked"
    ready = (
        status_code == 200
        and service_id == "napoleon.chief_of_staff"
        and runtime_authority is False
        and command_execution is False
        and fail_closed_cache
        and REQUIRED_DESCRIPTOR_BLOCKED_EFFECTS.issubset(set(str(effect) for effect in blocked_effects))
        and checksum_state != "mismatch"
        and signature_state != "invalid"
    )
    state = "ready" if ready else "descriptor_mismatch"
    return {
        "descriptorStatus": {
            "serviceId": str(service_id or ""),
            "ready": ready,
            "runtimeAuthority": runtime_authority is True,
            "cachePolicy": (
                "fail_closed_to_review_required" if fail_closed_cache else str(descriptor.get("cachePolicy") or "")
            )
            if not live_runtime_descriptor
            else "runtime_descriptor_live_response",
            "blockedEffects": [str(effect) for effect in blocked_effects],
        },
        "descriptorConnection": {
            "state": state,
            "checksumState": checksum_state,
            "signatureState": signature_state,
            "canAttemptLiveBridge": ready,
            "message": "Descriptor discovery passed." if ready else "Descriptor discovery failed closed.",
        },
    }


def detect_descriptor_runtime_source(payload: dict[str, Any]) -> str | None:
    checksum = payload.get("checksum") if isinstance(payload.get("checksum"), dict) else {}
    if checksum.get("expected") == LOCAL_HARNESS_CHECKSUM or checksum.get("actual") == LOCAL_HARNESS_CHECKSUM:
        return "local_harness"
    return None


def validate_runtime_validation_source(payload: dict[str, Any], requested_source: str) -> str | None:
    detected_source = detect_descriptor_runtime_source(payload)
    if detected_source and requested_source != detected_source:
        return (
            f"descriptor identifies {detected_source}; rerun with "
            f"--runtime-validation-source {detected_source} so local evidence is not mislabeled"
        )
    return None


def request_payload(message: str, descriptor_preflight: dict[str, Any]) -> dict[str, Any]:
    trace_id = "trace_bridge_evidence_capture"
    request_id = "cos_bridge_evidence_capture"
    decision_id = "local_decision_bridge_evidence_capture"
    audit_id = "local_audit_bridge_evidence_capture"
    blocked_effects = ["memory_write", "approval_capture", "external_send", "agent_dispatch"]
    return {
        "requestKind": "text_turn",
        "traceId": trace_id,
        "conversationId": "conv_bridge_evidence_capture",
        "turnId": "turn_bridge_evidence_capture",
        "profile": "adult_owner",
        "profileMode": "adult_owner",
        "channel": "text",
        "message": message,
        "descriptorStatus": descriptor_preflight["descriptorStatus"],
        "descriptorConnection": descriptor_preflight["descriptorConnection"],
        "chiefOfStaffRequest": {
            "request_id": request_id,
            "requester": "concierge.text",
            "request_type": "governance_review",
            "profile_mode": "adult_owner",
            "source_evidence": ["bridge_evidence_capture"],
            "requested_authority_tier": "advisory_review",
            "trace_id": trace_id,
            "payload_schema": "concierge_text_turn",
        },
        "governanceRequest": {
            "request_id": request_id,
            "actor_id": "concierge.text",
            "action": "prepare_text_response",
            "target": "napoleon.chief_of_staff",
            "requested_authority_tier": "advisory_review",
            "evidence_links": ["bridge_evidence_capture"],
            "trace_id": trace_id,
        },
        "traceEnvelope": {
            "trace_id": trace_id,
            "parent_trace_id": "conv_bridge_evidence_capture",
            "actor_id": "concierge.text",
            "request_id": request_id,
            "decision_id": decision_id,
            "timestamp": "2026-06-11T00:00:00.000Z",
        },
        "auditEnvelope": {
            "audit_id": audit_id,
            "trace_id": trace_id,
            "decision_id": decision_id,
            "actor_id": "concierge.text",
            "authority_tier": "advisory_review",
            "approval_requirement": "chief_of_staff_review",
            "evidence_links": ["bridge_evidence_capture"],
        },
        "blockedEffects": blocked_effects,
        "sourceEvidence": ["bridge_evidence_capture"],
    }


def cos_request_payload(message: str, descriptor_preflight: dict[str, Any]) -> dict[str, Any]:
    payload = request_payload(message, descriptor_preflight)
    return {
        "request_id": payload["chiefOfStaffRequest"]["request_id"],
        "profile_mode": "adult_owner",
        "contract_version": "napoleon/concierge/text-turn/v1",
        "requested_capability": "governance_review",
        "user_text": message,
        "requested_effects": [],
        "authority_tier": "advisory_prepare_only",
        "approval_requirement": "chief_of_staff_review",
        "blocked_effects": payload["blockedEffects"],
        "source_evidence": payload["sourceEvidence"],
        "actor_id": "concierge.text",
        "trace_id": payload["traceId"],
    }


def evidence_from_response(
    status_code: int,
    response_payload: dict[str, Any],
    runtime_validation_source: str,
    target_path: str = "/v1/concierge/turn",
) -> dict[str, Any]:
    decision = response_payload.get("governanceDecision") if isinstance(response_payload, dict) else {}
    trace_id = str(decision.get("trace_id") or "trace_bridge_evidence_capture")
    request_id = str(decision.get("request_id") or "cos_bridge_evidence_capture")
    if status_code < 200 or status_code >= 300:
        return {
            "kind": "bridge_contract_evidence",
            "operationId": "text_turn",
            "requestKind": "text_turn",
            "transport": "http_post",
            "status": "fail_closed",
            "reason": "http_failure",
            "httpStatus": status_code,
            "targetPath": target_path,
            "traceId": trace_id,
            "requestId": request_id,
            "descriptorStatus": "ready",
            "profileMode": "adult_owner",
            "runtimeValidationSource": runtime_validation_source,
            "provenanceVerified": False,
        }

    delegation = response_payload.get("delegation") if isinstance(response_payload.get("delegation"), dict) else {}
    agents = delegation.get("selectedAgents") if isinstance(delegation.get("selectedAgents"), list) else []
    return {
        "kind": "bridge_contract_evidence",
        "operationId": "text_turn",
        "requestKind": "text_turn",
        "transport": "http_post",
        "status": "success",
        "httpStatus": status_code,
        "targetPath": target_path,
        "traceId": trace_id,
        "requestId": request_id,
        "decisionId": str(decision.get("decision_id") or ""),
        "auditId": str(decision.get("audit_id") or ""),
        "governanceOutcome": str(decision.get("outcome") or ""),
        "descriptorStatus": "ready",
        "profileMode": str(response_payload.get("profileMode") or "adult_owner"),
        "runtimeValidationSource": runtime_validation_source,
        "selectedAgentIds": [
            str(agent.get("agentId"))
            for agent in agents
            if isinstance(agent, dict) and isinstance(agent.get("agentId"), str)
        ],
        "allowedEffects": delegation.get("allowedEffects") if isinstance(delegation.get("allowedEffects"), list) else [],
        "blockedEffects": delegation.get("blockedEffects")
        if isinstance(delegation.get("blockedEffects"), list)
        else decision.get("blocked_effects", []),
        "provenanceVerified": True,
    }


def evidence_from_cos_response(
    status_code: int,
    response_payload: dict[str, Any],
    runtime_validation_source: str,
    request_id: str,
    trace_payload: dict[str, Any] | None = None,
    trace_status_code: int | None = None,
) -> dict[str, Any]:
    trace_id = str(response_payload.get("trace_id") or "trace_bridge_evidence_capture")
    if status_code < 200 or status_code >= 300:
        return {
            "kind": "bridge_contract_evidence",
            "operationId": "text_turn",
            "requestKind": "text_turn",
            "transport": "http_post",
            "status": "fail_closed",
            "reason": "http_failure",
            "httpStatus": status_code,
            "targetPath": "/cos/text-turn",
            "traceId": trace_id,
            "requestId": request_id,
            "descriptorStatus": "ready",
            "profileMode": "adult_owner",
            "runtimeValidationSource": runtime_validation_source,
            "provenanceVerified": False,
        }

    governance = response_payload.get("governance_decision") if isinstance(response_payload.get("governance_decision"), dict) else {}
    delegation = response_payload.get("delegation_plan") if isinstance(response_payload.get("delegation_plan"), dict) else {}
    agents = delegation.get("candidate_agents") if isinstance(delegation.get("candidate_agents"), list) else []
    blocked_effects = (
        delegation.get("blocked_effects")
        if isinstance(delegation.get("blocked_effects"), list)
        else response_payload.get("blocked_effects", [])
    )
    trace_observed = trace_status_code == 200 and isinstance(trace_payload, dict)
    returned_trace_id = str((trace_payload or {}).get("trace_id") or "")
    trace_matched = trace_observed and returned_trace_id == trace_id
    return {
        "kind": "bridge_contract_evidence",
        "operationId": "text_turn",
        "requestKind": "text_turn",
        "transport": "http_post",
        "status": "success",
        "httpStatus": status_code,
        "targetPath": "/cos/text-turn",
        "traceId": trace_id,
        "requestId": request_id,
        "decisionId": f"decision_{trace_id}",
        "auditId": str(response_payload.get("audit_id") or ""),
        "governanceOutcome": str(governance.get("decision") or ""),
        "descriptorStatus": "ready",
        "profileMode": "adult_owner",
        "runtimeValidationSource": runtime_validation_source,
        "selectedAgentIds": [
            str(agent.get("agent_id"))
            for agent in agents
            if isinstance(agent, dict) and isinstance(agent.get("agent_id"), str)
        ],
        "allowedEffects": ["prepare_advisory_response"],
        "blockedEffects": blocked_effects,
        "provenanceVerified": True,
        "traceEnvelopeObserved": trace_observed,
        "traceEnvelopeMatched": trace_matched,
        "traceTargetPath": "/cos/trace/{trace_id}",
    }


def endpoint_from_args(endpoint: str | None, env: dict[str, str]) -> str | None:
    if endpoint and endpoint.strip():
        return endpoint.strip()
    for key in ["NAPOLEON_BRIDGE_ENDPOINT", "NAPOLEON_EVAL_ENDPOINT"]:
        value = env.get(key)
        if value and value.strip():
            return value.strip()
    return None


def main(argv: list[str] | None = None, env: dict[str, str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--endpoint", help="Napoleon base URL or full /v1/concierge/turn URL")
    parser.add_argument("--out", required=True, help="Where to write the sanitized bridge evidence JSON")
    parser.add_argument("--message", default=DEFAULT_MESSAGE, help="Text request used for the governed capture")
    parser.add_argument("--auth-token", help="Optional local bearer token for the governed bridge")
    parser.add_argument("--auth-token-file", help="Optional local bearer token file; token contents are never retained")
    parser.add_argument(
        "--runtime-validation-source",
        choices=RUNTIME_VALIDATION_SOURCES,
        default="real_runtime",
        help="Evidence source label written to sanitized bridge evidence records",
    )
    args = parser.parse_args(argv)

    active_env = os.environ if env is None else env
    endpoint = endpoint_from_args(args.endpoint, active_env)
    auth_token = resolve_auth_token(args.auth_token, args.auth_token_file, active_env)
    if endpoint is None:
        print("bridge evidence capture requires --endpoint, NAPOLEON_BRIDGE_ENDPOINT, or NAPOLEON_EVAL_ENDPOINT", file=sys.stderr)
        return 2

    cos_mode = is_cos_endpoint(endpoint)
    descriptor_status, descriptor_payload = get_json(descriptor_url(endpoint), auth_token, cos_mode)
    descriptor_preflight = descriptor_connection_from_response(descriptor_status, descriptor_payload)
    if not descriptor_preflight["descriptorConnection"]["canAttemptLiveBridge"] and not cos_mode and descriptor_status == 404:
        cos_descriptor_status, cos_descriptor_payload = get_json(
            bridge_url(endpoint, "/cos/descriptor"),
            auth_token,
            True,
        )
        cos_descriptor_preflight = descriptor_connection_from_response(cos_descriptor_status, cos_descriptor_payload)
        if cos_descriptor_preflight["descriptorConnection"]["canAttemptLiveBridge"]:
            cos_mode = True
            descriptor_payload = cos_descriptor_payload
            descriptor_preflight = cos_descriptor_preflight
    if not descriptor_preflight["descriptorConnection"]["canAttemptLiveBridge"]:
        print("descriptor preflight failed; bridge evidence capture did not send text turn", file=sys.stderr)
        return 1
    source_error = validate_runtime_validation_source(descriptor_payload, args.runtime_validation_source)
    if source_error:
        print(source_error, file=sys.stderr)
        print("bridge evidence capture did not send text turn", file=sys.stderr)
        return 1

    payload = cos_request_payload(args.message, descriptor_preflight) if cos_mode else request_payload(args.message, descriptor_preflight)
    target_url = bridge_url(endpoint, "/cos/text-turn") if cos_mode else text_turn_url(endpoint)
    status_code, response_payload = post_json(target_url, payload, auth_token, cos_mode)
    trace_status_code: int | None = None
    trace_payload: dict[str, Any] | None = None
    if cos_mode and 200 <= status_code < 300:
        trace_id = str(response_payload.get("trace_id") or "")
        if trace_id:
            trace_status_code, trace_payload = get_json(cos_trace_url(endpoint, trace_id), auth_token, cos_mode)
    records = [
        evidence_from_cos_response(
            status_code,
            response_payload,
            args.runtime_validation_source,
            str(payload.get("request_id") or ""),
            trace_payload,
            trace_status_code,
        )
        if cos_mode
        else evidence_from_response(status_code, response_payload, args.runtime_validation_source)
    ]
    violations = bridge_evidence_compare.compare_bridge_evidence_records(records)
    if violations:
        print("captured bridge evidence failed comparison:", file=sys.stderr)
        for violation in violations:
            print(f"- {violation}", file=sys.stderr)
        return 1

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")
    print(f"captured {len(records)} bridge evidence record(s) to {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
