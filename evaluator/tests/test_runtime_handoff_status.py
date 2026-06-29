import json
import tempfile
import unittest
from pathlib import Path

from scripts import runtime_handoff_status


class RuntimeHandoffStatusTests(unittest.TestCase):
    def test_build_report_sanitizes_connection_health_and_alignment_blocker(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            env_path = tmp_path / ".env"
            token_path = tmp_path / "token"
            env_path.write_text(
                "\n".join(
                    [
                        "NAPOLEON_BRIDGE_ENDPOINT=http://192.168.1.8:8765",
                        "NAPOLEON_EVAL_ENDPOINT=http://192.168.1.8:8765",
                        f"NAPOLEON_RUNTIME_AUTH_TOKEN_FILE={token_path}",
                    ]
                ),
                encoding="utf-8",
            )
            health_path = tmp_path / "health.json"
            health_path.write_text(
                json.dumps(
                    {
                        "status": "safe_to_call_prepare_only",
                        "service_id": "napoleon.chief_of_staff",
                        "runtime_owner": "clawdbot",
                        "safe_to_call": True,
                        "memory_write": False,
                        "external_send": False,
                        "agent_dispatch": False,
                        "approval_captured": False,
                        "runtime_authority": False,
                    }
                ),
                encoding="utf-8",
            )
            alignment_path = tmp_path / "alignment.json"
            alignment_path.write_text(
                json.dumps(
                    {
                        "kind": "concierge.napoleon-contract-alignment.v1",
                        "alignmentStatus": "runtime_mapping_gaps_present",
                        "runtimeAligned": False,
                        "blockingLivePromotion": True,
                        "napoleonRequiredActions": [
                            {
                                "id": "expose_evolution_proposal_status_runtime_target",
                                "owner": "napoleon_runtime",
                                "path": "/evolution/proposals/{proposal_id}/status",
                                "requestKind": "evolution_proposal_status_handoff",
                                "operationId": "evolution_proposal_status",
                            }
                        ],
                        "approvalCaptured": False,
                        "memoryWritePerformed": False,
                        "agentDispatchPerformed": False,
                        "externalSendPerformed": False,
                        "sideEffectsPerformed": False,
                    }
                ),
                encoding="utf-8",
            )

            report = runtime_handoff_status.build_report(
                env_path=env_path,
                health_json_path=health_path,
                alignment_report_path=alignment_path,
            )

        self.assertEqual(report["kind"], "concierge.runtime-handoff-status.v1")
        self.assertTrue(report["connection"]["bridgeEndpointConfigured"])
        self.assertTrue(report["connection"]["evalEndpointConfigured"])
        self.assertTrue(report["authProvisioning"]["tokenFileConfigured"])
        self.assertFalse(report["authProvisioning"]["tokenFileReadable"])
        self.assertFalse(report["authProvisioning"]["tokenRetained"])
        self.assertFalse(report["authProvisioning"]["tokenFilePathRetained"])
        self.assertEqual(report["health"]["serviceId"], "napoleon.chief_of_staff")
        self.assertEqual(report["health"]["runtimeOwner"], "clawdbot")
        self.assertTrue(report["health"]["safeToCall"])
        self.assertEqual(report["contractAlignment"]["alignmentStatus"], "runtime_mapping_gaps_present")
        self.assertEqual(report["contractAlignment"]["napoleonRequiredActionCount"], 1)
        self.assertEqual(
            report["contractAlignment"]["napoleonRequiredActions"][0]["id"],
            "expose_evolution_proposal_status_runtime_target",
        )
        self.assertTrue(report["boundary"]["doesNotContactNapoleon"])
        self.assertTrue(report["boundary"]["localHandoffEvidenceOnly"])
        rendered = json.dumps(report)
        self.assertNotIn("192.168.1.8", rendered)
        self.assertNotIn(str(token_path), rendered)

    def test_rejects_alignment_report_with_authorizing_side_effect_claim(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            env_path = tmp_path / ".env"
            env_path.write_text("NAPOLEON_BRIDGE_ENDPOINT=http://192.168.1.8:8765\n", encoding="utf-8")
            alignment_path = tmp_path / "alignment.json"
            alignment_path.write_text(
                json.dumps(
                    {
                        "kind": "concierge.napoleon-contract-alignment.v1",
                        "alignmentStatus": "aligned",
                        "runtimeAligned": True,
                        "blockingLivePromotion": False,
                        "napoleonRequiredActions": [],
                        "approvalCaptured": True,
                        "memoryWritePerformed": False,
                        "agentDispatchPerformed": False,
                        "externalSendPerformed": False,
                        "sideEffectsPerformed": False,
                    }
                ),
                encoding="utf-8",
            )

            with self.assertRaises(ValueError):
                runtime_handoff_status.build_report(env_path=env_path, alignment_report_path=alignment_path)
