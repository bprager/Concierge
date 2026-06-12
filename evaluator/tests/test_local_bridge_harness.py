import json
import tempfile
import unittest
from urllib import request

import eval_runner
from scripts import eval_http_local_harness
from scripts import local_bridge_harness


class LocalBridgeHarnessTest(unittest.TestCase):
    def test_harness_serves_descriptor_and_delegated_text_turn(self):
        with local_bridge_harness.running_harness() as base_url:
            descriptor = self.fetch_json(f"{base_url}/v1/concierge/chief-of-staff/descriptor")
            self.assertEqual(descriptor["descriptor"]["serviceId"], "napoleon.chief_of_staff")
            self.assertFalse(descriptor["descriptor"]["runtimeAuthority"])
            self.assertTrue(descriptor["signature"]["valid"])

            payload = {
                "requestKind": "text_turn",
                "traceId": "trace_harness",
                "conversationId": "conv_harness",
                "turnId": "turn_harness",
                "profile": "adult_owner",
                "profileMode": "adult_owner",
                "channel": "text",
                "message": "Ask Napoleon for a bridge summary",
                "chiefOfStaffRequest": {"request_id": "cos_turn_harness"},
                "governanceRequest": {"request_id": "cos_turn_harness"},
                "traceEnvelope": {},
                "auditEnvelope": {},
                "blockedEffects": ["memory_write", "external_send"],
                "sourceEvidence": ["local_harness"],
            }
            response = self.post_json(f"{base_url}/v1/concierge/turn", payload)

            self.assertEqual(response["governanceDecision"]["outcome"], "requires_review")
            self.assertEqual(response["traceEnvelope"]["trace_id"], "trace_harness")
            self.assertEqual(response["auditEnvelope"]["audit_id"], response["governanceDecision"]["audit_id"])
            self.assertEqual(response["delegation"]["selectedAgents"][0]["displayName"], "Passive Brain")
            self.assertIn("memory_write", response["delegation"]["blockedEffects"])

    def test_harness_accepts_governed_review_handoffs_without_applying_them(self):
        with local_bridge_harness.running_harness() as base_url:
            steering = self.post_json(
                f"{base_url}/v1/concierge/chief-of-staff/steering",
                {
                    "requestKind": "chief_of_staff_steering_handoff",
                    "traceEnvelope": {"trace_id": "trace_steering", "request_id": "cos_trace_steering"},
                    "auditEnvelope": {},
                    "evolutionProposal": {"proposal_id": "evo_harness"},
                },
            )
            memory = self.post_json(
                f"{base_url}/v1/concierge/memory-proposals",
                {
                    "requestKind": "memory_proposal_review_handoff",
                    "traceEnvelope": {"trace_id": "trace_memory", "request_id": "cos_trace_memory"},
                    "auditEnvelope": {},
                    "memoryProposal": {"proposalId": "memory_harness"},
                },
            )

            self.assertEqual(steering["governanceDecision"]["outcome"], "requires_review")
            self.assertEqual(memory["governanceDecision"]["outcome"], "requires_review")
            self.assertFalse(steering["appliedLocally"])
            self.assertFalse(memory["memoryWritePerformed"])
            self.assertFalse(memory["approvalCaptured"])

    def test_harness_supports_evaluator_http_request_kind(self):
        with local_bridge_harness.running_harness() as base_url:
            response = self.post_json(
                f"{base_url}/v1/concierge/evaluate",
                {"requestKind": "evaluator_prompt", "case_id": "HARNESS-001", "prompt": "Check bridge."},
            )

            self.assertIn("Bridge delegation provenance", response["text"])
            self.assertIn("Case: HARNESS-001", response["text"])

    def test_harness_can_drive_full_http_evaluator_run(self):
        with local_bridge_harness.running_harness() as base_url:
            with tempfile.NamedTemporaryFile("r+", suffix=".json") as handle:
                exit_code = eval_runner.main(
                    [
                        "--mode",
                        "http",
                        "--endpoint",
                        f"{base_url}/v1/concierge/evaluate",
                        "--out",
                        handle.name,
                    ]
                )
                handle.seek(0)
                report = json.load(handle)

        self.assertEqual(exit_code, 0)
        self.assertEqual(report["mode"], "http")
        self.assertGreaterEqual(report["score_total"], 90)
        self.assertEqual(report["hard_fails"], [])
        self.assertEqual(report["missing_artifacts"], [])

    def test_local_harness_eval_script_runs_http_evaluator(self):
        with tempfile.NamedTemporaryFile("r+", suffix=".json") as handle:
            exit_code = eval_http_local_harness.main(["--out", handle.name])
            handle.seek(0)
            report = json.load(handle)

        self.assertEqual(exit_code, 0)
        self.assertEqual(report["mode"], "http")
        self.assertGreaterEqual(report["score_total"], 90)

    def post_json(self, url, payload):
        req = request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": "Bearer local-harness-token"},
            method="POST",
        )
        with request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))

    def fetch_json(self, url):
        req = request.Request(url, headers={"Authorization": "Bearer local-harness-token"}, method="GET")
        with request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))


if __name__ == "__main__":
    unittest.main()
