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
            self.assertIn("evolution_proposal_status", descriptor["descriptor"]["supportedHandoffs"])
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

    def test_harness_supports_browser_cors_for_descriptor_and_text_turn(self):
        with local_bridge_harness.running_harness() as base_url:
            preflight = request.Request(
                f"{base_url}/v1/concierge/turn",
                headers={
                    "Origin": "http://127.0.0.1:5178",
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "authorization,content-type",
                },
                method="OPTIONS",
            )
            with request.urlopen(preflight, timeout=10) as response:
                self.assertEqual(response.status, 204)
                self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "*")
                self.assertIn("POST", response.headers.get("Access-Control-Allow-Methods", ""))
                self.assertIn("Authorization", response.headers.get("Access-Control-Allow-Headers", ""))

            descriptor_req = request.Request(
                f"{base_url}/v1/concierge/chief-of-staff/descriptor",
                headers={"Origin": "http://127.0.0.1:5178", "Authorization": "Bearer local-harness-token"},
                method="GET",
            )
            with request.urlopen(descriptor_req, timeout=10) as response:
                self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "*")

            turn_req = request.Request(
                f"{base_url}/v1/concierge/turn",
                data=json.dumps(
                    {
                        "requestKind": "text_turn",
                        "traceId": "trace_cors",
                        "profileMode": "adult_owner",
                        "chiefOfStaffRequest": {"request_id": "cos_trace_cors"},
                    }
                ).encode("utf-8"),
                headers={
                    "Origin": "http://127.0.0.1:5178",
                    "Authorization": "Bearer local-harness-token",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with request.urlopen(turn_req, timeout=10) as response:
                self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "*")

    def test_harness_serves_metadata_only_agent_and_profile_discovery(self):
        with local_bridge_harness.running_harness() as base_url:
            agents = self.fetch_json(f"{base_url}/agents")
            agent = self.fetch_json(f"{base_url}/agents/passive_brain")
            profile = self.fetch_json(f"{base_url}/profiles/adult_owner")

            self.assertEqual(agents["agents"][0]["agentId"], "passive_brain")
            self.assertFalse(agents["runtimeAuthority"])
            self.assertFalse(agents["agentDispatchPerformed"])
            self.assertFalse(agents["memoryWritePerformed"])
            self.assertFalse(agents["approvalCaptured"])
            self.assertFalse(agents["externalSendPerformed"])
            self.assertEqual(agent["agentId"], "passive_brain")
            self.assertFalse(agent["runtimeAuthority"])
            self.assertFalse(agent["agentDispatchPerformed"])
            self.assertIn("agent_dispatch", agent["blockedEffects"])
            self.assertEqual(profile["profileId"], "adult_owner")
            self.assertFalse(profile["runtimeAuthority"])
            self.assertFalse(profile["memoryWritePerformed"])
            self.assertFalse(profile["approvalCaptured"])
            self.assertIn("memory_write", profile["blockedEffects"])

    def test_harness_can_build_text_turn_response_with_forbidden_side_effect_claims(self):
        payload = {
            "requestKind": "text_turn",
            "traceId": "trace_side_effect_claim_smoke",
            "profileMode": "adult_owner",
            "message": "claim-side-effect",
            "chiefOfStaffRequest": {"request_id": "cos_side_effect_claim_smoke"},
        }

        response = local_bridge_harness.build_text_turn_response(payload)

        self.assertEqual(response["governanceDecision"]["outcome"], "requires_review")
        self.assertTrue(response["memoryWritePerformed"])
        self.assertTrue(response["approvalCaptured"])
        self.assertTrue(response["externalSendPerformed"])
        self.assertTrue(response["agentDispatchPerformed"])
        self.assertTrue(response["appliedLocally"])

    def test_harness_can_build_steering_response_with_forbidden_side_effect_claims(self):
        response = local_bridge_harness.build_review_response(
            {
                "requestKind": "chief_of_staff_steering_handoff",
                "traceEnvelope": {"trace_id": "trace_steering_side_effect", "request_id": "cos_steering"},
                "evolutionProposal": {"proposal_id": "claim-side-effect"},
            },
            "chief_of_staff_steering_handoff",
            applied_locally=False,
        )

        self.assertEqual(response["governanceDecision"]["outcome"], "requires_review")
        self.assertTrue(response["appliedLocally"])
        self.assertTrue(response["memoryWritePerformed"])
        self.assertTrue(response["approvalCaptured"])
        self.assertTrue(response["externalSendPerformed"])
        self.assertTrue(response["agentDispatchPerformed"])

    def test_harness_can_build_memory_response_with_forbidden_side_effect_claims(self):
        response = local_bridge_harness.build_review_response(
            {
                "requestKind": "memory_proposal_review_handoff",
                "traceEnvelope": {"trace_id": "trace_memory_side_effect", "request_id": "cos_memory"},
                "memoryProposal": {"proposalId": "claim-side-effect"},
            },
            "memory_proposal_review_handoff",
            memory_review=True,
        )

        self.assertEqual(response["governanceDecision"]["outcome"], "requires_review")
        self.assertTrue(response["memoryWritePerformed"])
        self.assertTrue(response["approvalCaptured"])
        self.assertTrue(response["externalSendPerformed"])
        self.assertTrue(response["agentDispatchPerformed"])
        self.assertTrue(response["appliedLocally"])

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
            chief_request = self.post_json(
                f"{base_url}/chief-of-staff/requests",
                {
                    "requestKind": "chief_of_staff_request_handoff",
                    "traceEnvelope": {"trace_id": "trace_chief_request", "request_id": "cos_trace_chief_request"},
                    "auditEnvelope": {},
                    "chiefOfStaffRequest": {"request_id": "cos_trace_chief_request"},
                },
            )
            new_agent = self.post_json(
                f"{base_url}/chief-of-staff/reviews/new-agent-proposals",
                {
                    "requestKind": "new_agent_proposal_review_handoff",
                    "traceEnvelope": {"trace_id": "trace_new_agent", "request_id": "cos_trace_new_agent"},
                    "auditEnvelope": {},
                    "agentProposal": {"agentId": "proposed_agent_harness"},
                },
            )
            evolution_submission = self.post_json(
                f"{base_url}/evolution/proposals",
                {
                    "requestKind": "evolution_proposal_submission_handoff",
                    "traceEnvelope": {
                        "trace_id": "trace_evolution_submission",
                        "request_id": "evo_trace_submission",
                    },
                    "auditEnvelope": {},
                    "evolutionProposal": {"proposal_id": "evo_submission_harness"},
                },
            )
            governance_evaluation = self.post_json(
                f"{base_url}/governance/evaluate",
                {
                    "requestKind": "governance_evaluation_handoff",
                    "traceEnvelope": {"trace_id": "trace_governance_eval", "request_id": "gov_trace_eval"},
                    "auditEnvelope": {},
                    "governanceRequest": {"request_id": "gov_trace_eval"},
                },
            )
            observability_trace = self.post_json(
                f"{base_url}/observability/traces",
                {
                    "requestKind": "observability_trace_handoff",
                    "traceEnvelope": {"trace_id": "trace_observability", "request_id": "obs_trace_request"},
                    "auditEnvelope": {},
                    "observabilityEnvelope": {"trace_id": "trace_observability"},
                },
            )

            self.assertEqual(steering["governanceDecision"]["outcome"], "requires_review")
            self.assertEqual(memory["governanceDecision"]["outcome"], "requires_review")
            self.assertEqual(chief_request["governanceDecision"]["outcome"], "requires_review")
            self.assertEqual(new_agent["governanceDecision"]["outcome"], "requires_review")
            self.assertEqual(evolution_submission["governanceDecision"]["outcome"], "requires_review")
            self.assertEqual(governance_evaluation["governanceDecision"]["outcome"], "requires_review")
            self.assertEqual(observability_trace["governanceDecision"]["outcome"], "requires_review")
            self.assertFalse(steering["appliedLocally"])
            self.assertFalse(steering["memoryWritePerformed"])
            self.assertFalse(steering["approvalCaptured"])
            self.assertFalse(steering["agentDispatchPerformed"])
            self.assertFalse(steering["externalSendPerformed"])
            self.assertFalse(chief_request["appliedLocally"])
            self.assertFalse(chief_request["memoryWritePerformed"])
            self.assertFalse(chief_request["approvalCaptured"])
            self.assertFalse(chief_request["agentDispatchPerformed"])
            self.assertFalse(chief_request["externalSendPerformed"])
            self.assertFalse(new_agent["appliedLocally"])
            self.assertFalse(new_agent["memoryWritePerformed"])
            self.assertFalse(new_agent["approvalCaptured"])
            self.assertFalse(new_agent["agentDispatchPerformed"])
            self.assertFalse(new_agent["externalSendPerformed"])
            self.assertFalse(evolution_submission["appliedLocally"])
            self.assertFalse(evolution_submission["memoryWritePerformed"])
            self.assertFalse(evolution_submission["approvalCaptured"])
            self.assertFalse(evolution_submission["agentDispatchPerformed"])
            self.assertFalse(evolution_submission["externalSendPerformed"])
            self.assertFalse(governance_evaluation["appliedLocally"])
            self.assertFalse(governance_evaluation["memoryWritePerformed"])
            self.assertFalse(governance_evaluation["approvalCaptured"])
            self.assertFalse(governance_evaluation["agentDispatchPerformed"])
            self.assertFalse(governance_evaluation["externalSendPerformed"])
            self.assertFalse(observability_trace["appliedLocally"])
            self.assertFalse(observability_trace["memoryWritePerformed"])
            self.assertFalse(observability_trace["approvalCaptured"])
            self.assertFalse(observability_trace["agentDispatchPerformed"])
            self.assertFalse(observability_trace["externalSendPerformed"])
            self.assertFalse(memory["memoryWritePerformed"])
            self.assertFalse(memory["approvalCaptured"])
            self.assertFalse(memory["agentDispatchPerformed"])
            self.assertFalse(memory["externalSendPerformed"])

    def test_harness_supports_read_only_evolution_proposal_status(self):
        with local_bridge_harness.running_harness() as base_url:
            status = self.fetch_json(f"{base_url}/evolution/proposals/evo_harness/status")

            self.assertEqual(status["proposalId"], "evo_harness")
            self.assertEqual(status["lifecycleState"], "accepted_for_review")
            self.assertEqual(status["governanceDecision"]["outcome"], "requires_review")
            self.assertEqual(status["traceEnvelope"]["trace_id"], status["governanceDecision"]["trace_id"])
            self.assertEqual(status["auditEnvelope"]["audit_id"], status["governanceDecision"]["audit_id"])
            self.assertFalse(status["appliedLocally"])
            self.assertFalse(status["memoryWritePerformed"])
            self.assertFalse(status["approvalCaptured"])
            self.assertFalse(status["agentDispatchPerformed"])
            self.assertFalse(status["externalSendPerformed"])
            self.assertFalse(status["registryUpdatePerformed"])
            self.assertFalse(status["evolutionApplied"])

    def test_harness_supports_evaluator_http_request_kind(self):
        with local_bridge_harness.running_harness() as base_url:
            response = self.post_json(
                f"{base_url}/v1/concierge/evaluate",
                {"requestKind": "evaluator_prompt", "case_id": "HARNESS-001", "prompt": "Check bridge."},
            )

            self.assertIn("Bridge delegation provenance", response["text"])
            self.assertIn("Case: HARNESS-001", response["text"])

    def test_harness_supports_explicit_evaluation_review_request_kind(self):
        with local_bridge_harness.running_harness() as base_url:
            response = self.post_json(
                f"{base_url}/chief-of-staff/reviews/evaluation",
                {
                    "requestKind": "evaluation_review_handoff",
                    "bridgeTargetPath": "/chief-of-staff/reviews/evaluation",
                    "bridgeTargetOperation": "evaluation_review",
                    "case_id": "EVAL-REVIEW-001",
                    "prompt": "Check explicit evaluation review.",
                },
            )

            self.assertIn("Bridge delegation provenance", response["text"])
            self.assertIn("Case: EVAL-REVIEW-001", response["text"])

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

    def test_harness_can_drive_full_http_evaluator_run_from_napoleon_base_url(self):
        with local_bridge_harness.running_harness() as base_url:
            with tempfile.NamedTemporaryFile("r+", suffix=".json") as handle:
                exit_code = eval_runner.main(
                    [
                        "--mode",
                        "http",
                        "--endpoint",
                        base_url,
                        "--out",
                        handle.name,
                    ]
                )
                handle.seek(0)
                report = json.load(handle)

        self.assertEqual(exit_code, 0)
        self.assertEqual(report["mode"], "http")
        self.assertEqual(report["evaluationTarget"]["path"], "/chief-of-staff/reviews/evaluation")
        self.assertEqual(report["evaluationTarget"]["requestKind"], "evaluation_review_handoff")
        self.assertEqual(report["evaluationTarget"]["operationId"], "evaluation_review")
        self.assertFalse(report["evaluationTarget"]["endpointHostRetained"])
        self.assertFalse(report["evaluationTarget"]["tokenRetained"])
        self.assertFalse(report["evaluationTarget"]["requestBodyRetained"])
        self.assertFalse(report["evaluationTarget"]["responseBodyRetained"])
        self.assertFalse(report["evaluationTarget"]["approvalCaptured"])
        self.assertFalse(report["evaluationTarget"]["memoryWritePerformed"])
        self.assertFalse(report["evaluationTarget"]["agentDispatchPerformed"])
        self.assertFalse(report["evaluationTarget"]["externalSendPerformed"])
        self.assertGreaterEqual(report["score_total"], 90)
        self.assertEqual(report["hard_fails"], [])
        self.assertEqual(report["missing_artifacts"], [])
        self.assertNotIn(base_url, json.dumps(report))

    def test_local_harness_eval_script_runs_http_evaluator(self):
        with tempfile.NamedTemporaryFile("r+", suffix=".json") as handle:
            exit_code = eval_http_local_harness.main(["--out", handle.name])
            handle.seek(0)
            report = json.load(handle)

        self.assertEqual(exit_code, 0)
        self.assertEqual(report["mode"], "http")
        self.assertGreaterEqual(report["score_total"], 90)
        self.assertEqual(report["runtimeValidation"]["source"], "local_harness")
        self.assertIn("not real Napoleon runtime validation", report["runtimeValidation"]["caveat"])
        self.assertIn("test harness only", report["runtimeValidation"]["authorityBoundary"])
        self.assertNotIn("127.0.0.1", json.dumps(report))
        self.assertNotIn("local-harness-token", json.dumps(report))

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
