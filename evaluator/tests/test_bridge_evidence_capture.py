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


class RecordingBridgeHarness:
    def __init__(self, descriptor_ready: bool):
        self.descriptor_ready = descriptor_ready
        self.get_count = 0
        self.post_count = 0
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
                length = int(self.headers.get("Content-Length", "0"))
                parent.last_turn_payload = json.loads(self.rfile.read(length).decode("utf-8"))
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
