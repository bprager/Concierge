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


def bridge_url(endpoint: str, path: str = "/v1/concierge/turn") -> str:
    base = endpoint.rstrip("/")
    if base.endswith(path):
        return base
    return f"{base}{path}"


def get_json(url: str, auth_token: str | None = None) -> tuple[int, dict[str, Any]]:
    headers = {}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    req = request.Request(url, headers=headers, method="GET")
    try:
        with request.urlopen(req, timeout=10) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        payload = json.loads(body) if body else {}
        return exc.code, payload


def post_json(url: str, payload: dict[str, Any], auth_token: str | None = None) -> tuple[int, dict[str, Any]]:
    headers = {"Content-Type": "application/json"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
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


def descriptor_connection_from_response(status_code: int, payload: dict[str, Any]) -> dict[str, Any]:
    descriptor = payload.get("descriptor") if isinstance(payload.get("descriptor"), dict) else {}
    blocked_effects = descriptor.get("blockedEffects") if isinstance(descriptor.get("blockedEffects"), list) else []
    checksum = payload.get("checksum") if isinstance(payload.get("checksum"), dict) else {}
    signature = payload.get("signature") if isinstance(payload.get("signature"), dict) else {}
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
        and descriptor.get("serviceId") == "napoleon.chief_of_staff"
        and descriptor.get("runtimeAuthority") is False
        and descriptor.get("commandExecution") is False
        and descriptor.get("cachePolicy") == "fail_closed_to_review_required"
        and REQUIRED_DESCRIPTOR_BLOCKED_EFFECTS.issubset(set(str(effect) for effect in blocked_effects))
        and checksum_state != "mismatch"
        and signature_state != "invalid"
    )
    state = "ready" if ready else "descriptor_mismatch"
    return {
        "descriptorStatus": {
            "serviceId": str(descriptor.get("serviceId") or ""),
            "ready": ready,
            "runtimeAuthority": descriptor.get("runtimeAuthority") is True,
            "cachePolicy": str(descriptor.get("cachePolicy") or ""),
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


def evidence_from_response(status_code: int, response_payload: dict[str, Any]) -> dict[str, Any]:
    decision = response_payload.get("governanceDecision") if isinstance(response_payload, dict) else {}
    trace_id = str(decision.get("trace_id") or "trace_bridge_evidence_capture")
    request_id = str(decision.get("request_id") or "cos_bridge_evidence_capture")
    if status_code < 200 or status_code >= 300:
        return {
            "kind": "bridge_contract_evidence",
            "operationId": "text_turn",
            "requestKind": "text_turn",
            "status": "fail_closed",
            "reason": "http_failure",
            "httpStatus": status_code,
            "targetPath": "/v1/concierge/turn",
            "traceId": trace_id,
            "requestId": request_id,
            "descriptorStatus": "ready",
            "profileMode": "adult_owner",
            "provenanceVerified": False,
        }

    delegation = response_payload.get("delegation") if isinstance(response_payload.get("delegation"), dict) else {}
    agents = delegation.get("selectedAgents") if isinstance(delegation.get("selectedAgents"), list) else []
    return {
        "kind": "bridge_contract_evidence",
        "operationId": "text_turn",
        "requestKind": "text_turn",
        "status": "success",
        "httpStatus": status_code,
        "targetPath": "/v1/concierge/turn",
        "traceId": trace_id,
        "requestId": request_id,
        "decisionId": str(decision.get("decision_id") or ""),
        "auditId": str(decision.get("audit_id") or ""),
        "governanceOutcome": str(decision.get("outcome") or ""),
        "descriptorStatus": "ready",
        "profileMode": str(response_payload.get("profileMode") or "adult_owner"),
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


def endpoint_from_args(endpoint: str | None, env: dict[str, str]) -> str | None:
    if endpoint and endpoint.strip():
        return endpoint.strip()
    value = env.get("NAPOLEON_EVAL_ENDPOINT")
    return value.strip() if value and value.strip() else None


def main(argv: list[str] | None = None, env: dict[str, str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--endpoint", help="Napoleon base URL or full /v1/concierge/turn URL")
    parser.add_argument("--out", required=True, help="Where to write the sanitized bridge evidence JSON")
    parser.add_argument("--message", default=DEFAULT_MESSAGE, help="Text request used for the governed capture")
    parser.add_argument("--auth-token", help="Optional local bearer token for the governed bridge")
    args = parser.parse_args(argv)

    active_env = os.environ if env is None else env
    endpoint = endpoint_from_args(args.endpoint, active_env)
    if endpoint is None:
        print("bridge evidence capture requires --endpoint or NAPOLEON_EVAL_ENDPOINT", file=sys.stderr)
        return 2

    descriptor_status, descriptor_payload = get_json(
        bridge_url(endpoint, "/v1/concierge/chief-of-staff/descriptor"),
        args.auth_token,
    )
    descriptor_preflight = descriptor_connection_from_response(descriptor_status, descriptor_payload)
    if not descriptor_preflight["descriptorConnection"]["canAttemptLiveBridge"]:
        print("descriptor preflight failed; bridge evidence capture did not send text turn", file=sys.stderr)
        return 1

    status_code, response_payload = post_json(
        bridge_url(endpoint),
        request_payload(args.message, descriptor_preflight),
        args.auth_token,
    )
    records = [evidence_from_response(status_code, response_payload)]
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
