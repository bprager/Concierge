#!/usr/bin/env python3
"""Local Napoleon-compatible bridge harness for Concierge validation."""

from __future__ import annotations

import argparse
import contextlib
import json
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Iterator


DESCRIPTOR = {
    "schemaVersion": "napoleon/concierge/chief-of-staff-service/v1",
    "serviceId": "napoleon.chief_of_staff",
    "runtimeAuthority": False,
    "commandExecution": False,
    "cachePolicy": "fail_closed_to_review_required",
    "blockedEffects": [
        "runtime_authority",
        "command_execution",
        "agent_dispatch",
        "memory_write",
        "approval_capture",
        "external_send",
    ],
}


def governance_response(trace_id: str, request_id: str, decision_id: str, audit_id: str) -> dict[str, Any]:
    return {
        "governanceDecision": {
            "decision_id": decision_id,
            "request_id": request_id,
            "outcome": "requires_review",
            "authority_tier": "advisory_review",
            "approval_requirement": "chief_of_staff_and_owner_review",
            "rationale": "Local harness requires governed review and never grants side-effect authority.",
            "blocked_effects": ["memory_write", "approval_capture", "external_send", "agent_dispatch"],
            "trace_id": trace_id,
            "audit_id": audit_id,
        },
        "traceEnvelope": {
            "trace_id": trace_id,
            "parent_trace_id": "local_harness",
            "actor_id": "napoleon.local_harness",
            "request_id": request_id,
            "decision_id": decision_id,
            "timestamp": "2026-06-11T00:00:00.000Z",
        },
        "auditEnvelope": {
            "audit_id": audit_id,
            "trace_id": trace_id,
            "decision_id": decision_id,
            "actor_id": "napoleon.local_harness",
            "authority_tier": "advisory_review",
            "approval_requirement": "chief_of_staff_and_owner_review",
            "evidence_links": [f"trace:{trace_id}", "harness:local"],
        },
    }


def evaluator_text(case_id: str, prompt: str) -> str:
    root = Path(__file__).resolve().parents[1]
    evaluator_path = root / "evaluator"
    if str(evaluator_path) not in sys.path:
        sys.path.insert(0, str(evaluator_path))
    from eval_runner import call_stub

    return call_stub(case_id, prompt)


def build_text_turn_response(payload: dict[str, Any]) -> dict[str, Any]:
    trace_id = str(payload.get("traceId") or "trace_harness")
    request_id = str(payload.get("chiefOfStaffRequest", {}).get("request_id") or f"cos_{trace_id}")
    response = {
        "text": "Napoleon recommends keeping this as a governed review draft. Passive Brain found bridge context.",
        **governance_response(trace_id, request_id, f"decision_{trace_id}", f"audit_{trace_id}"),
        "profileMode": payload.get("profileMode", "adult_owner"),
        "delegation": {
            "selectedAgents": [
                {
                    "agentId": "passive_brain",
                    "displayName": "Passive Brain",
                    "selectionReason": "Prior bridge context is relevant to the request.",
                    "contributionSummary": "bridge context",
                }
            ],
            "allowedEffects": ["prepare_advisory_response"],
            "blockedEffects": ["memory_write", "approval_capture", "external_send", "agent_dispatch"],
            "governanceState": "requires_review",
            "traceId": trace_id,
            "auditId": f"audit_{trace_id}",
        },
        "recommendationProvenance": {
            "summary": "keeping this as a governed review draft",
            "traceId": trace_id,
            "auditId": f"audit_{trace_id}",
        },
    }
    if "claim-side-effect" in str(payload.get("message") or ""):
        response.update(
            {
                "memoryWritePerformed": True,
                "approvalCaptured": True,
                "externalSendPerformed": True,
                "agentDispatchPerformed": True,
                "appliedLocally": True,
            }
        )
    return response


def has_side_effect_claim_trigger(payload: dict[str, Any]) -> bool:
    trigger = json.dumps(payload, sort_keys=True)
    return "claim-side-effect" in trigger


def build_review_response(
    payload: dict[str, Any],
    expected_request_kind: str,
    applied_locally: bool | None = None,
    memory_review: bool = False,
) -> dict[str, Any]:
    trace_id = str(payload.get("traceEnvelope", {}).get("trace_id") or "trace_harness_review")
    request_id = str(payload.get("traceEnvelope", {}).get("request_id") or f"cos_{trace_id}")
    response = {
        "text": "Napoleon accepted the proposal for governed review only.",
        **governance_response(trace_id, request_id, f"decision_{trace_id}", f"audit_{trace_id}"),
        "memoryWritePerformed": False,
        "approvalCaptured": False,
        "agentDispatchPerformed": False,
        "externalSendPerformed": False,
    }
    if applied_locally is not None:
        response["appliedLocally"] = applied_locally
    if has_side_effect_claim_trigger(payload):
        response.update(
            {
                "memoryWritePerformed": True,
                "approvalCaptured": True,
                "externalSendPerformed": True,
                "agentDispatchPerformed": True,
                "appliedLocally": True,
            }
        )
    return response


class HarnessHandler(BaseHTTPRequestHandler):
    server_version = "ConciergeLocalBridgeHarness/0.1"

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.write_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/v1/concierge/chief-of-staff/descriptor":
            self.write_json(
                200,
                {
                    "descriptor": DESCRIPTOR,
                    "checksum": {"expected": "sha256:local-harness", "actual": "sha256:local-harness"},
                    "signature": {"valid": True},
                    "serviceId": "napoleon.chief_of_staff",
                    "ready": True,
                    "runtimeAuthority": False,
                    "cachePolicy": "fail_closed_to_review_required",
                    "blockedEffects": DESCRIPTOR["blockedEffects"],
                },
            )
            return
        self.write_json(404, {"error": "not_found"})

    def do_POST(self) -> None:
        payload = self.read_json()
        if self.path == "/v1/concierge/turn":
            self.handle_turn(payload)
            return
        if self.path == "/v1/concierge/chief-of-staff/steering":
            self.handle_review(payload, "chief_of_staff_steering_handoff", applied_locally=False)
            return
        if self.path == "/v1/concierge/memory-proposals":
            self.handle_review(payload, "memory_proposal_review_handoff", memory_review=True)
            return
        if self.path == "/v1/concierge/evaluate":
            self.handle_evaluate(payload)
            return
        self.write_json(404, {"error": "not_found"})

    def handle_turn(self, payload: dict[str, Any]) -> None:
        if payload.get("requestKind") != "text_turn":
            self.write_json(400, {"error": "invalid_request_kind"})
            return
        self.write_json(200, build_text_turn_response(payload))

    def handle_review(
        self,
        payload: dict[str, Any],
        expected_request_kind: str,
        applied_locally: bool | None = None,
        memory_review: bool = False,
    ) -> None:
        if payload.get("requestKind") != expected_request_kind:
            self.write_json(400, {"error": "invalid_request_kind"})
            return
        self.write_json(200, build_review_response(payload, expected_request_kind, applied_locally, memory_review))

    def handle_evaluate(self, payload: dict[str, Any]) -> None:
        if payload.get("requestKind") != "evaluator_prompt":
            self.write_json(400, {"error": "invalid_request_kind"})
            return
        self.write_json(200, {"text": evaluator_text(str(payload.get("case_id", "")), str(payload.get("prompt", "")))})

    def read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def write_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.write_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def write_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, X-Napoleon-Auth, Content-Type")
        self.send_header("Access-Control-Max-Age", "600")

    def log_message(self, _format: str, *_args: Any) -> None:
        return


@contextlib.contextmanager
def running_harness(host: str = "127.0.0.1", port: int = 0) -> Iterator[str]:
    server = ThreadingHTTPServer((host, port), HarnessHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        actual_host, actual_port = server.server_address
        yield f"http://{actual_host}:{actual_port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), HarnessHandler)
    print(f"local bridge harness listening on http://{args.host}:{server.server_address[1]}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        return 0
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
