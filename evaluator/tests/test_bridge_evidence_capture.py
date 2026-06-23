import contextlib
import io
import json
import threading
import tempfile
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from scripts import bridge_evidence_capture, bridge_evidence_compare, local_bridge_harness


class BridgeEvidenceCaptureTest(unittest.TestCase):
    def test_capture_runner_records_sanitized_harness_success_evidence(self):
        with local_bridge_harness.running_harness() as base_url:
            with tempfile.NamedTemporaryFile("r+", suffix=".json") as handle:
                with contextlib.redirect_stdout(io.StringIO()):
                    exit_code = bridge_evidence_capture.main(
                        [
                            "--endpoint",
                            base_url,
                            "--out",
                            handle.name,
                            "--message",
                            "Draft the private Napoleon bridge rollout note",
                            "--runtime-validation-source",
                            "local_harness",
                        ]
                    )
                handle.seek(0)
                records = json.load(handle)

        self.assertEqual(exit_code, 0)
        self.assertEqual(bridge_evidence_compare.compare_bridge_evidence_records(records), [])
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["status"], "success")
        self.assertEqual(records[0]["targetPath"], "/v1/concierge/turn")
        self.assertEqual(records[0]["requestKind"], "text_turn")
        self.assertEqual(records[0]["transport"], "http_post")
        self.assertEqual(records[0]["governanceOutcome"], "requires_review")
        self.assertEqual(records[0]["runtimeValidationSource"], "local_harness")
        self.assertEqual(records[0]["selectedAgentIds"], ["passive_brain"])
        self.assertFalse("Draft the private Napoleon bridge rollout note" in json.dumps(records))
        self.assertFalse(base_url in json.dumps(records))

    def test_capture_runner_fails_without_endpoint_or_environment(self):
        with tempfile.NamedTemporaryFile("w", suffix=".json") as handle:
            with contextlib.redirect_stderr(io.StringIO()) as stderr:
                exit_code = bridge_evidence_capture.main(["--out", handle.name], env={})

        self.assertEqual(exit_code, 2)
        self.assertIn("NAPOLEON_BRIDGE_ENDPOINT", stderr.getvalue())
        self.assertIn("NAPOLEON_EVAL_ENDPOINT", stderr.getvalue())

    def test_capture_runner_command_writes_json_list(self):
        with local_bridge_harness.running_harness() as base_url:
            with tempfile.NamedTemporaryFile("r+", suffix=".json") as handle:
                stdout = io.StringIO()
                with contextlib.redirect_stdout(stdout):
                    exit_code = bridge_evidence_capture.main(
                        [
                            "--endpoint",
                            base_url,
                            "--out",
                            handle.name,
                            "--runtime-validation-source",
                            "local_harness",
                        ]
                    )
                handle.seek(0)
                payload = json.load(handle)

        self.assertEqual(exit_code, 0)
        self.assertIsInstance(payload, list)
        self.assertEqual(payload[0]["runtimeValidationSource"], "local_harness")
        self.assertIn("captured 1 bridge evidence record", stdout.getvalue())

    def test_capture_runner_uses_bridge_endpoint_environment(self):
        with local_bridge_harness.running_harness() as base_url:
            with tempfile.NamedTemporaryFile("r+", suffix=".json") as handle:
                with contextlib.redirect_stdout(io.StringIO()):
                    exit_code = bridge_evidence_capture.main(
                        ["--out", handle.name, "--runtime-validation-source", "local_harness"],
                        env={"NAPOLEON_BRIDGE_ENDPOINT": base_url},
                    )
                handle.seek(0)
                records = json.load(handle)

        self.assertEqual(exit_code, 0)
        self.assertEqual(records[0]["runtimeValidationSource"], "local_harness")
        self.assertEqual(records[0]["targetPath"], "/v1/concierge/turn")
        self.assertFalse(base_url in json.dumps(records))

    def test_capture_runner_discovers_descriptor_before_text_turn(self):
        with RecordingBridgeHarness(descriptor_ready=True) as harness:
            with tempfile.NamedTemporaryFile("r+", suffix=".json") as handle:
                with contextlib.redirect_stdout(io.StringIO()):
                    exit_code = bridge_evidence_capture.main(
                        [
                            "--endpoint",
                            harness.base_url,
                            "--out",
                            handle.name,
                            "--runtime-validation-source",
                            "local_simulation",
                        ]
                    )

        self.assertEqual(exit_code, 0)
        self.assertEqual(harness.get_count, 1)
        self.assertEqual(harness.post_count, 1)
        self.assertEqual(harness.last_turn_payload["descriptorConnection"]["state"], "ready")
        self.assertEqual(harness.last_turn_payload["descriptorConnection"]["checksumState"], "matched")
        self.assertEqual(harness.last_turn_payload["descriptorConnection"]["signatureState"], "valid")

    def test_capture_runner_normalizes_full_turn_endpoint_before_descriptor_preflight(self):
        with RecordingBridgeHarness(descriptor_ready=True) as harness:
            with tempfile.NamedTemporaryFile("r+", suffix=".json") as handle:
                with contextlib.redirect_stdout(io.StringIO()):
                    exit_code = bridge_evidence_capture.main(
                        [
                            "--endpoint",
                            f"{harness.base_url}/v1/concierge/turn",
                            "--out",
                            handle.name,
                            "--runtime-validation-source",
                            "local_simulation",
                        ]
                    )
                self.assertEqual(exit_code, 0)
                handle.seek(0)
                records = json.load(handle)

        self.assertEqual(harness.get_count, 1)
        self.assertEqual(harness.post_count, 1)
        self.assertEqual(records[0]["targetPath"], "/v1/concierge/turn")
        self.assertEqual(harness.last_post_path, "/v1/concierge/turn")
        self.assertEqual(harness.last_turn_payload["descriptorConnection"]["state"], "ready")

    def test_capture_runner_uses_cos_descriptor_before_cos_text_turn(self):
        with RecordingCosHarness(descriptor_ready=True) as harness:
            with tempfile.NamedTemporaryFile("r+", suffix=".json") as handle:
                with contextlib.redirect_stdout(io.StringIO()):
                    exit_code = bridge_evidence_capture.main(
                        [
                            "--endpoint",
                            f"{harness.base_url}/cos/text-turn",
                            "--out",
                            handle.name,
                            "--auth-token",
                            "token_cos_capture",
                            "--runtime-validation-source",
                            "local_harness",
                        ]
                    )
                handle.seek(0)
                records = json.load(handle)

        self.assertEqual(exit_code, 0)
        self.assertEqual(harness.get_count, 2)
        self.assertEqual(harness.post_count, 1)
        self.assertEqual(harness.last_get_path, "/cos/descriptor")
        self.assertEqual(harness.get_paths, ["/cos/descriptor", "/cos/trace/trace_bridge_evidence_capture"])
        self.assertEqual(harness.last_post_path, "/cos/text-turn")
        self.assertEqual(harness.last_auth_header, "token_cos_capture")
        self.assertEqual(harness.last_turn_payload["profile_mode"], "adult_owner")
        self.assertEqual(harness.last_turn_payload["contract_version"], "napoleon/concierge/text-turn/v1")
        self.assertEqual(harness.last_turn_payload["requested_capability"], "governance_review")
        self.assertEqual(harness.last_turn_payload["authority_tier"], "advisory_prepare_only")
        self.assertEqual(records[0]["targetPath"], "/cos/text-turn")
        self.assertEqual(records[0]["requestKind"], "text_turn")
        self.assertEqual(records[0]["runtimeValidationSource"], "local_harness")
        self.assertEqual(records[0]["selectedAgentIds"], ["napoleon.passive_brain"])
        self.assertTrue(records[0]["traceEnvelopeObserved"])
        self.assertTrue(records[0]["traceEnvelopeMatched"])
        self.assertEqual(records[0]["traceTargetPath"], "/cos/trace/{trace_id}")
        self.assertEqual(bridge_evidence_compare.compare_bridge_evidence_records(records), [])
        self.assertFalse("token_cos_capture" in json.dumps(records))
        self.assertFalse(harness.base_url in json.dumps(records))

    def test_cos_base_endpoint_normalizes_to_single_cos_path_prefix(self):
        endpoint = "http://127.0.0.1:8765/cos"

        self.assertEqual(
            bridge_evidence_capture.descriptor_url(endpoint),
            "http://127.0.0.1:8765/cos/descriptor",
        )
        self.assertEqual(
            bridge_evidence_capture.text_turn_url(endpoint),
            "http://127.0.0.1:8765/cos/text-turn",
        )
        self.assertEqual(
            bridge_evidence_capture.cos_trace_url(endpoint, "trace_example"),
            "http://127.0.0.1:8765/cos/trace/trace_example",
        )

    def test_capture_runner_falls_back_to_cos_descriptor_for_runtime_base_url(self):
        with RecordingCosHarness(descriptor_ready=True) as harness:
            with tempfile.NamedTemporaryFile("r+", suffix=".json") as handle:
                with contextlib.redirect_stdout(io.StringIO()):
                    exit_code = bridge_evidence_capture.main(
                        [
                            "--endpoint",
                            harness.base_url,
                            "--out",
                            handle.name,
                            "--runtime-validation-source",
                            "local_harness",
                        ]
                    )
                handle.seek(0)
                records = json.load(handle)

        self.assertEqual(exit_code, 0)
        self.assertEqual(
            harness.get_paths,
            [
                "/v1/concierge/chief-of-staff/descriptor",
                "/cos/descriptor",
                "/cos/trace/trace_bridge_evidence_capture",
            ],
        )
        self.assertEqual(harness.last_post_path, "/cos/text-turn")
        self.assertEqual(records[0]["targetPath"], "/cos/text-turn")

    def test_descriptor_preflight_accepts_live_runtime_descriptor_shape_without_file_cache_policy(self):
        preflight = bridge_evidence_capture.descriptor_connection_from_response(
            200,
            {
                "schema_version": "napoleon/concierge/runtime-descriptor/v1",
                "service_id": "napoleon.chief_of_staff",
                "runtime_authority": False,
                "command_execution": False,
                "endpoints": {
                    "descriptor": "GET /cos/descriptor",
                    "text_turn": "POST /cos/text-turn",
                    "trace": "GET /cos/trace/{trace_id}",
                },
                "supported_authority_tiers": ["advisory_prepare_only"],
                "blocked_effects": [
                    "runtime_authority",
                    "memory_write",
                    "approval_capture",
                    "agent_dispatch",
                    "external_send",
                ],
            },
        )

        self.assertTrue(preflight["descriptorConnection"]["canAttemptLiveBridge"])
        self.assertEqual(preflight["descriptorConnection"]["state"], "ready")
        self.assertEqual(preflight["descriptorStatus"]["cachePolicy"], "runtime_descriptor_live_response")

    def test_capture_runner_fails_closed_when_descriptor_discovery_is_invalid(self):
        with RecordingBridgeHarness(descriptor_ready=False) as harness:
            with tempfile.NamedTemporaryFile("w", suffix=".json") as handle:
                stderr = io.StringIO()
                with contextlib.redirect_stderr(stderr):
                    exit_code = bridge_evidence_capture.main(["--endpoint", harness.base_url, "--out", handle.name])

        self.assertEqual(exit_code, 1)
        self.assertEqual(harness.get_count, 1)
        self.assertEqual(harness.post_count, 0)
        self.assertIn("descriptor preflight failed", stderr.getvalue())

    def test_capture_runner_fails_closed_when_local_harness_is_mislabeled_as_real_runtime(self):
        with local_bridge_harness.running_harness() as base_url:
            with tempfile.NamedTemporaryFile("w", suffix=".json") as handle:
                stderr = io.StringIO()
                with contextlib.redirect_stderr(stderr):
                    exit_code = bridge_evidence_capture.main(["--endpoint", base_url, "--out", handle.name])

        self.assertEqual(exit_code, 1)
        self.assertIn("descriptor identifies local_harness", stderr.getvalue())
        self.assertIn("--runtime-validation-source local_harness", stderr.getvalue())

    def test_detects_local_harness_descriptor_from_checksum(self):
        detected = bridge_evidence_capture.detect_descriptor_runtime_source(
            {"checksum": {"expected": "sha256:local-harness", "actual": "sha256:local-harness"}}
        )

        self.assertEqual(detected, "local_harness")


class RecordingCosHarness:
    def __init__(self, descriptor_ready: bool, supported_handoffs: list[str] | None = None):
        self.descriptor_ready = descriptor_ready
        self.supported_handoffs = supported_handoffs
        self.get_count = 0
        self.get_paths = []
        self.post_count = 0
        self.last_get_path = ""
        self.last_post_path = ""
        self.last_auth_header = ""
        self.last_turn_payload = {}

    def __enter__(self):
        parent = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                parent.get_count += 1
                parent.get_paths.append(self.path)
                parent.last_auth_header = self.headers.get("X-Napoleon-Auth", "")
                if self.path.startswith("/cos/trace/"):
                    trace_id = self.path.rsplit("/", 1)[-1]
                    self.write_json(
                        200,
                        {
                            "trace_id": trace_id,
                            "audit_id": f"audit_{trace_id}",
                            "events": [
                                {
                                    "event_type": "advisory_text_turn_prepared",
                                    "authority_tier": "prepare_only",
                                    "blocked_effects": [
                                        "memory_write",
                                        "approval_capture",
                                        "agent_dispatch",
                                        "external_send",
                                    ],
                                }
                            ],
                        },
                    )
                    return
                parent.last_get_path = self.path
                if self.path == "/cos/capabilities":
                    self.write_json(
                        200,
                        {
                            "schema_version": "napoleon/concierge/capability-manifest/v1",
                            "status": "advisory_prepare_only",
                            "authority_tier": "advisory_prepare_only",
                            "capabilities": [
                                {
                                    "capability_id": "napoleon.capability.governed_text_turn",
                                    "name": "Governed text turn",
                                    "summary": "Prepare a governed advisory text response.",
                                    "runtime_authority": False,
                                    "blocked_effects": [
                                        "memory_write",
                                        "approval_capture",
                                        "agent_dispatch",
                                        "external_send",
                                    ],
                                },
                            ],
                            "runtime_authority": False,
                            "command_execution": False,
                            "memory_write": False,
                            "external_send": False,
                            "approval_captured": False,
                            "task_dispatch": False,
                        },
                    )
                    return
                if self.path != "/cos/descriptor":
                    self.write_json(404, {"error": "not_found"})
                    return
                descriptor_payload = {
                    "schema_version": "napoleon/concierge/chief-of-staff-service/v1",
                    "service_id": "napoleon.chief_of_staff" if parent.descriptor_ready else "bad.service",
                    "runtime_authority": False,
                    "command_execution": False,
                    "cache_policy": {
                        "ttl_seconds": 300,
                        "stale_descriptor_action": "fail_closed_to_review_required",
                    },
                    "security": {
                        "descriptor_signature": "pending_future_implementation",
                        "checksum": "pending_future_implementation",
                    },
                    "blocked_effects": [
                        "runtime_authority",
                        "memory_write",
                        "agent_dispatch",
                        "external_send",
                    ],
                }
                if parent.supported_handoffs is not None:
                    descriptor_payload["supported_handoffs"] = parent.supported_handoffs
                    descriptor_payload["endpoints"] = {
                        "descriptor": "GET /cos/descriptor",
                        "text_turn": "POST /cos/text-turn",
                    }
                    if "evaluation_review" in parent.supported_handoffs:
                        descriptor_payload["endpoints"]["evaluation_review"] = "POST /chief-of-staff/reviews/evaluation"
                self.write_json(200, descriptor_payload)

            def do_POST(self):
                parent.post_count += 1
                parent.last_post_path = self.path
                parent.last_auth_header = self.headers.get("X-Napoleon-Auth", "")
                length = int(self.headers.get("Content-Length", "0"))
                parent.last_turn_payload = json.loads(self.rfile.read(length).decode("utf-8"))
                if self.path != "/cos/text-turn":
                    self.write_json(404, {"error": "not_found"})
                    return
                trace_id = parent.last_turn_payload["trace_id"]
                self.write_json(
                    202,
                    {
                        "schema_version": "napoleon/concierge/runtime-bridge-schema/v1",
                        "status": "accepted_for_prepare_only",
                        "answer": "Prepared advisory response.",
                        "trace_id": trace_id,
                        "audit_id": f"audit_{trace_id}",
                        "governance_decision": {
                            "decision": "allow_prepare_only",
                            "reason": "Prepare-only advisory response.",
                            "authority_tier": "prepare_only",
                            "blocked_effects": [
                                "memory_write",
                                "approval_capture",
                                "agent_dispatch",
                                "external_send",
                            ],
                        },
                        "delegation_plan": {
                            "requested_capability": "napoleon.chief_of_staff",
                            "candidate_agents": [
                                {
                                    "agent_id": "napoleon.passive_brain",
                                    "display_name": "Passive Brain",
                                    "selection_reason": "Relevant context found.",
                                    "contribution_summary": "Found the bridge evidence pattern.",
                                }
                            ],
                            "blocked_effects": [
                                "memory_write",
                                "approval_capture",
                                "agent_dispatch",
                                "external_send",
                            ],
                        },
                        "blocked_effects": [
                            "memory_write",
                            "approval_capture",
                            "agent_dispatch",
                            "external_send",
                        ],
                    },
                )

            def log_message(self, *_args):
                return

            def write_json(self, status: int, payload: dict):
                body = json.dumps(payload).encode("utf-8")
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.server.server_address[1]}"
        return self

    def __exit__(self, *_args):
        self.server.shutdown()
        self.thread.join(timeout=5)


class RecordingBridgeHarness:
    def __init__(self, descriptor_ready: bool):
        self.descriptor_ready = descriptor_ready
        self.get_count = 0
        self.post_count = 0
        self.last_post_path = ""
        self.last_turn_payload = {}

    def __enter__(self):
        parent = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                parent.get_count += 1
                if self.path != "/v1/concierge/chief-of-staff/descriptor":
                    self.write_json(404, {"error": "not_found"})
                    return
                self.write_json(
                    200,
                    {
                        "descriptor": {
                            "serviceId": "napoleon.chief_of_staff" if parent.descriptor_ready else "bad.service",
                            "runtimeAuthority": False,
                            "commandExecution": False,
                            "cachePolicy": "fail_closed_to_review_required",
                            "blockedEffects": ["runtime_authority", "memory_write", "external_send"],
                        },
                        "checksum": {"expected": "sha256:test", "actual": "sha256:test"},
                        "signature": {"valid": True},
                    },
                )

            def do_POST(self):
                parent.post_count += 1
                parent.last_post_path = self.path
                length = int(self.headers.get("Content-Length", "0"))
                parent.last_turn_payload = json.loads(self.rfile.read(length).decode("utf-8"))
                if self.path != "/v1/concierge/turn":
                    self.write_json(404, {"error": "not_found"})
                    return
                trace_id = parent.last_turn_payload["traceId"]
                request_id = parent.last_turn_payload["chiefOfStaffRequest"]["request_id"]
                self.write_json(
                    200,
                    {
                        "text": "Napoleon recommends governed review.",
                        "profileMode": "adult_owner",
                        "governanceDecision": {
                            "decision_id": f"decision_{trace_id}",
                            "request_id": request_id,
                            "outcome": "requires_review",
                            "authority_tier": "advisory_review",
                            "approval_requirement": "chief_of_staff_and_owner_review",
                            "rationale": "Governed review required.",
                            "blocked_effects": ["memory_write", "external_send"],
                            "trace_id": trace_id,
                            "audit_id": f"audit_{trace_id}",
                        },
                        "traceEnvelope": {
                            "trace_id": trace_id,
                            "parent_trace_id": "local_test",
                            "actor_id": "napoleon.test",
                            "request_id": request_id,
                            "decision_id": f"decision_{trace_id}",
                            "timestamp": "2026-06-11T00:00:00.000Z",
                        },
                        "auditEnvelope": {
                            "audit_id": f"audit_{trace_id}",
                            "trace_id": trace_id,
                            "decision_id": f"decision_{trace_id}",
                            "actor_id": "napoleon.test",
                            "authority_tier": "advisory_review",
                            "approval_requirement": "chief_of_staff_and_owner_review",
                            "evidence_links": [f"trace:{trace_id}"],
                        },
                        "delegation": {
                            "selectedAgents": [],
                            "allowedEffects": ["prepare_advisory_response"],
                            "blockedEffects": ["memory_write", "external_send"],
                            "governanceState": "requires_review",
                            "traceId": trace_id,
                            "auditId": f"audit_{trace_id}",
                        },
                        "recommendationProvenance": {
                            "summary": "governed review",
                            "traceId": trace_id,
                            "auditId": f"audit_{trace_id}",
                        },
                    },
                )

            def write_json(self, status, payload):
                body = json.dumps(payload).encode("utf-8")
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, _format, *_args):
                return

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        host, port = self.server.server_address
        self.base_url = f"http://{host}:{port}"
        return self

    def __exit__(self, *_args):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)


if __name__ == "__main__":
    unittest.main()
