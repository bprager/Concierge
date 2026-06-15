import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path

from scripts import bridge_evidence_compare


class BridgeEvidenceCompareTest(unittest.TestCase):
    def test_sample_evidence_aligns_with_openapi_and_privacy_rules(self):
        records = bridge_evidence_compare.load_evidence_records(
            Path("examples/sample_bridge_contract_evidence.json")
        )

        self.assertEqual(bridge_evidence_compare.compare_bridge_evidence_records(records), [])

    def test_rejects_path_that_does_not_match_operation_registry(self):
        record = self.valid_record()
        record["targetPath"] = "/v1/concierge/freeform"

        violations = bridge_evidence_compare.compare_bridge_evidence_records([record])

        self.assertIn("targetPath does not match operation text_turn", violations[0])

    def test_rejects_request_kind_that_does_not_match_openapi(self):
        record = self.valid_record()
        record["requestKind"] = "memory_proposal_review"

        violations = bridge_evidence_compare.compare_bridge_evidence_records([record])

        self.assertIn("requestKind does not match OpenAPI", violations[0])

    def test_rejects_transport_that_does_not_match_operation_registry(self):
        record = self.valid_record()
        record["transport"] = "http_get"

        violations = bridge_evidence_compare.compare_bridge_evidence_records([record])

        self.assertTrue(any("transport does not match operation text_turn" in violation for violation in violations))

    def test_rejects_raw_payload_or_secret_fields(self):
        record = self.valid_record()
        record["requestBody"] = {"message": "Draft the private bridge plan", "Authorization": "Bearer secret"}

        violations = bridge_evidence_compare.compare_bridge_evidence_records([record])

        self.assertTrue(any("forbidden evidence field requestBody" in violation for violation in violations))
        self.assertTrue(any("forbidden evidence field message" in violation for violation in violations))
        self.assertTrue(any("secret-like evidence value" in violation for violation in violations))

    def test_rejects_invalid_runtime_validation_source(self):
        record = self.valid_record()
        record["runtimeValidationSource"] = "localhost_but_probably_real"

        violations = bridge_evidence_compare.compare_bridge_evidence_records([record])

        self.assertTrue(any("runtimeValidationSource must be one of" in violation for violation in violations))

    def test_command_exits_nonzero_for_invalid_evidence_file(self):
        record = self.valid_record()
        record["targetPath"] = "https://napoleon.example/v1/concierge/turn"

        with tempfile.NamedTemporaryFile("w", suffix=".json") as handle:
            json.dump([record], handle)
            handle.flush()
            with contextlib.redirect_stderr(io.StringIO()):
                exit_code = bridge_evidence_compare.main([handle.name])

        self.assertEqual(exit_code, 1)

    @staticmethod
    def valid_record() -> dict[str, object]:
        return {
            "kind": "bridge_contract_evidence",
            "operationId": "text_turn",
            "requestKind": "text_turn",
            "transport": "http_post",
            "status": "success",
            "httpStatus": 200,
            "targetPath": "/v1/concierge/turn",
            "traceId": "trace_valid",
            "requestId": "cos_turn_valid",
            "decisionId": "decision_valid",
            "auditId": "audit_valid",
            "governanceOutcome": "requires_review",
            "descriptorStatus": "ready",
            "profileMode": "adult_owner",
            "runtimeValidationSource": "real_runtime",
            "selectedAgentIds": ["napoleon.passive_brain"],
            "allowedEffects": ["prepare_advisory_response"],
            "blockedEffects": ["external_send", "memory_write"],
            "provenanceVerified": True,
        }


if __name__ == "__main__":
    unittest.main()
