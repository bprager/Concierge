import unittest
import tempfile
import json
from pathlib import Path

from scripts import goal_completion_audit


class GoalCompletionAuditTests(unittest.TestCase):
    def test_report_keeps_external_runtime_blocker_separate(self):
        report = goal_completion_audit.build_report()

        self.assertEqual(report["kind"], "concierge.goal-completion-audit.v1")
        self.assertEqual(report["overallStatus"], "goal_not_complete")
        self.assertTrue(report["boundary"]["localEvidenceOnly"])
        self.assertTrue(report["boundary"]["doesNotContactNapoleon"])
        self.assertTrue(report["boundary"]["doesNotApprove"])
        self.assertTrue(report["boundary"]["doesNotWriteMemory"])
        self.assertTrue(report["boundary"]["doesNotDispatchAgents"])
        self.assertTrue(report["boundary"]["doesNotSendExternally"])
        self.assertTrue(report["boundary"]["doesNotApplyEvolution"])

        by_id = {requirement["id"]: requirement for requirement in report["requirements"]}
        self.assertIn("descriptor_first_class_connection_state", by_id)
        self.assertIn("napoleon_delegation_panel", by_id)
        self.assertIn("evolution_status_runtime_blocker", by_id)
        self.assertEqual(by_id["evolution_status_runtime_blocker"]["status"], "external_blocker")
        self.assertEqual(by_id["evolution_status_runtime_blocker"]["blocker"]["owner"], "napoleon_runtime")
        self.assertTrue(by_id["evolution_status_runtime_blocker"]["blocker"]["external"])
        self.assertIn("/evolution/proposals/{proposal_id}/status", by_id["evolution_status_runtime_blocker"]["blocker"]["nextAction"])
        self.assertGreaterEqual(report["statusCounts"]["proven"], 1)
        self.assertEqual(report["blockerCount"], len(report["nextActions"]))
        self.assertEqual(report["nextActions"][0]["owner"], "napoleon_runtime")
        self.assertEqual(report["blockers"][0]["requirementId"], "evolution_status_runtime_blocker")
        self.assertEqual(report["blockers"][0]["owner"], "napoleon_runtime")
        self.assertTrue(report["blockers"][0]["external"])
        self.assertEqual(
            report["blockers"][0]["napoleonRequiredAction"]["id"],
            "expose_evolution_proposal_status_runtime_target",
        )
        self.assertIn("make check", report["blockers"][0]["validation"])
        self.assertFalse(report["completionGate"]["canCloseGoal"])
        self.assertIn("make check", report["completionGate"]["requiredBeforeClose"])

    def test_completion_gate_declares_validation_commands_are_not_run_by_audit(self):
        report = goal_completion_audit.build_report()

        gate = report["completionGate"]
        self.assertFalse(gate["validationCommandsExecutedByAudit"])
        self.assertEqual(gate["validationEvidenceSource"], "not_executed_by_goal_completion_audit")
        self.assertIn("make check", gate["requiredBeforeClose"])
        self.assertEqual(gate["requiredButNotRunByAudit"], gate["requiredBeforeClose"])

    def test_completion_gate_lists_blocking_requirements_by_owner_boundary(self):
        report = goal_completion_audit.build_report()

        gate = report["completionGate"]
        self.assertFalse(gate["canCloseGoal"])
        self.assertEqual(gate["blockingRequirementIds"], ["evolution_status_runtime_blocker"])
        self.assertEqual(gate["externalBlockerCount"], 1)
        self.assertEqual(gate["localBlockerCount"], 0)

    def test_report_tracks_original_acceptance_criteria(self):
        report = goal_completion_audit.build_report()

        by_id = {criterion["id"]: criterion for criterion in report["acceptanceCriteria"]}
        self.assertEqual(
            by_id["send_text_request_to_napoleon"]["requirementIds"],
            ["descriptor_first_class_connection_state", "generated_bridge_client_alignment"],
        )
        self.assertEqual(
            by_id["capability_intelligence_drafts_only"]["requirementIds"],
            ["capability_intelligence_local_only", "chief_of_staff_steering_proposal_only"],
        )
        self.assertEqual(
            by_id["evolution_status_runtime_status_route"]["status"],
            "external_blocker",
        )
        self.assertEqual(
            by_id["evolution_status_runtime_status_route"]["blockingRequirementIds"],
            ["evolution_status_runtime_blocker"],
        )
        self.assertEqual(report["acceptanceCriteriaStatusCounts"]["external_blocker"], 1)
        self.assertFalse(report["completionGate"]["acceptanceCriteriaSatisfied"])

    def test_external_runtime_blocker_includes_sanitized_required_action_packet(self):
        report = goal_completion_audit.build_report()

        action = report["nextActions"][0]["napoleonRequiredAction"]
        self.assertEqual(action["id"], "expose_evolution_proposal_status_runtime_target")
        self.assertEqual(action["owner"], "napoleon_runtime")
        self.assertEqual(action["operationId"], "evolution_proposal_status")
        self.assertEqual(action["targetPath"], "/evolution/proposals/{proposal_id}/status")
        self.assertEqual(action["requestKind"], "evolution_proposal_status_handoff")
        self.assertEqual(action["advertiseUsing"], ["supportedHandoffs", "required_for"])
        self.assertTrue(action["blockingLivePromotion"])
        self.assertFalse(action["approvalCaptured"])
        self.assertFalse(action["memoryWritePerformed"])
        self.assertFalse(action["agentDispatchPerformed"])
        self.assertFalse(action["externalSendPerformed"])
        self.assertFalse(action["appliedLocally"])

    def test_every_requirement_has_evidence_paths(self):
        report = goal_completion_audit.build_report()

        for requirement in report["requirements"]:
            self.assertTrue(requirement["id"])
            self.assertTrue(requirement["requirement"])
            self.assertGreater(len(requirement["validation"]), 0, requirement["id"])
            self.assertGreater(len(requirement["evidence"]), 0, requirement["id"])
            for evidence in requirement["evidence"]:
                self.assertTrue(evidence["path"])
                self.assertIn(evidence["status"], {"present", "partial", "missing"})

    def test_fresh_runtime_alignment_report_can_clear_external_status_blocker(self):
        with tempfile.TemporaryDirectory() as tmp:
            alignment_path = Path(tmp) / "alignment.json"
            alignment_path.write_text(
                json.dumps(
                    {
                        "runtimeAligned": True,
                        "blockingLivePromotion": False,
                        "kind": "concierge.napoleon-contract-alignment.v1",
                        "nonAuthorityBoundary": "alignment_check_only",
                        "supportedReviewRuntimePaths": ["/evolution/proposals/{proposal_id}/status"],
                        "napoleonRequiredActions": [],
                        "sideEffectsPerformed": False,
                        "approvalCaptured": False,
                        "memoryWritePerformed": False,
                        "agentDispatchPerformed": False,
                        "externalSendPerformed": False,
                    }
                ),
                encoding="utf-8",
            )

            report = goal_completion_audit.build_report(alignment_report_path=alignment_path)

        by_id = {requirement["id"]: requirement for requirement in report["requirements"]}
        self.assertEqual(by_id["evolution_status_runtime_blocker"]["status"], "proven")
        self.assertNotIn("external_blocker", report["statusCounts"])
        self.assertEqual(report["blockerCount"], 0)
        self.assertTrue(report["completionGate"]["canCloseGoal"])

    def test_alignment_report_without_expected_kind_cannot_clear_status_blocker(self):
        with tempfile.TemporaryDirectory() as tmp:
            alignment_path = Path(tmp) / "alignment.json"
            alignment_path.write_text(
                json.dumps(
                    {
                        "runtimeAligned": True,
                        "blockingLivePromotion": False,
                        "nonAuthorityBoundary": "alignment_check_only",
                        "supportedReviewRuntimePaths": ["/evolution/proposals/{proposal_id}/status"],
                        "napoleonRequiredActions": [],
                        "sideEffectsPerformed": False,
                        "approvalCaptured": False,
                        "memoryWritePerformed": False,
                        "agentDispatchPerformed": False,
                        "externalSendPerformed": False,
                    }
                ),
                encoding="utf-8",
            )

            report = goal_completion_audit.build_report(alignment_report_path=alignment_path)

        by_id = {requirement["id"]: requirement for requirement in report["requirements"]}
        self.assertEqual(by_id["evolution_status_runtime_blocker"]["status"], "external_blocker")
        self.assertEqual(report["blockerCount"], 1)
        self.assertFalse(report["completionGate"]["canCloseGoal"])

    def test_loaded_alignment_report_exposes_sanitized_summary_metadata(self):
        with tempfile.TemporaryDirectory() as tmp:
            alignment_path = Path(tmp) / "alignment.json"
            alignment_path.write_text(
                json.dumps(
                    {
                        "kind": "concierge.napoleon-contract-alignment.v1",
                        "alignmentStatus": "runtime_mapping_gaps_present",
                        "runtimeAligned": False,
                        "blockingLivePromotion": True,
                        "napoleonRequiredActionCount": 1,
                        "conciergeReviewPathsMissingFromNapoleonRuntime": [
                            "/evolution/proposals/{proposal_id}/status"
                        ],
                        "napoleonRequiredActions": [
                            {"id": "expose_evolution_proposal_status_runtime_target"}
                        ],
                        "napoleonContractSha256": (
                            "f935449c0d0f272542d43d5e4fd463b9f10c60e6407ce56f8ae1e34c334ef78d"
                        ),
                        "conciergeContractSha256": (
                            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
                        ),
                        "contractContentRetained": False,
                        "nonAuthorityBoundary": "alignment_check_only",
                        "sideEffectsPerformed": False,
                        "approvalCaptured": False,
                        "memoryWritePerformed": False,
                        "agentDispatchPerformed": False,
                        "externalSendPerformed": False,
                    }
                ),
                encoding="utf-8",
            )

            report = goal_completion_audit.build_report(alignment_report_path=alignment_path)

        evidence = report["alignmentEvidence"]
        self.assertTrue(evidence["loaded"])
        self.assertEqual(evidence["alignmentStatus"], "runtime_mapping_gaps_present")
        self.assertFalse(evidence["runtimeAligned"])
        self.assertTrue(evidence["blockingLivePromotion"])
        self.assertEqual(evidence["napoleonRequiredActionCount"], 1)
        self.assertEqual(
            evidence["missingRuntimeTargets"],
            ["/evolution/proposals/{proposal_id}/status"],
        )
        self.assertFalse(evidence["canClearEvolutionStatusBlocker"])
        self.assertEqual(evidence["nonAuthorityBoundary"], "alignment_report_only")
        self.assertEqual(
            evidence["napoleonContractSha256"],
            "f935449c0d0f272542d43d5e4fd463b9f10c60e6407ce56f8ae1e34c334ef78d",
        )
        self.assertEqual(
            evidence["conciergeContractSha256"],
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        )
        self.assertFalse(evidence["contractContentRetained"])

    def test_default_alignment_report_path_is_loaded_when_present(self):
        with tempfile.TemporaryDirectory() as tmp:
            default_alignment_path = Path(tmp) / "concierge-napoleon-alignment.json"
            default_alignment_path.write_text(
                json.dumps(
                    {
                        "kind": "concierge.napoleon-contract-alignment.v1",
                        "alignmentStatus": "runtime_mapping_gaps_present",
                        "runtimeAligned": False,
                        "blockingLivePromotion": True,
                        "napoleonRequiredActionCount": 1,
                        "conciergeReviewPathsMissingFromNapoleonRuntime": [
                            "/evolution/proposals/{proposal_id}/status"
                        ],
                        "napoleonRequiredActions": [
                            {"id": "expose_evolution_proposal_status_runtime_target"}
                        ],
                        "nonAuthorityBoundary": "alignment_check_only",
                        "sideEffectsPerformed": False,
                        "approvalCaptured": False,
                        "memoryWritePerformed": False,
                        "agentDispatchPerformed": False,
                        "externalSendPerformed": False,
                    }
                ),
                encoding="utf-8",
            )

            report = goal_completion_audit.build_report(default_alignment_report_path=default_alignment_path)

        evidence = report["alignmentEvidence"]
        self.assertTrue(evidence["loaded"])
        self.assertEqual(evidence["path"], str(default_alignment_path))
        self.assertEqual(evidence["alignmentStatus"], "runtime_mapping_gaps_present")
        self.assertEqual(
            evidence["missingRuntimeTargets"],
            ["/evolution/proposals/{proposal_id}/status"],
        )

    def test_runtime_handoff_token_blocker_becomes_local_completion_blocker_without_token_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            runtime_handoff_path = Path(tmp) / "concierge-runtime-handoff-status.json"
            runtime_handoff_path.write_text(
                json.dumps(
                    {
                        "kind": "concierge.runtime-handoff-status.v1",
                        "authProvisioning": {
                            "tokenConfigured": False,
                            "tokenFileConfigured": True,
                            "tokenFileReadable": False,
                            "tokenRemotePresent": True,
                            "tokenLocalReadableDeclared": False,
                            "tokenRemoteReadableByOperator": False,
                            "tokenRetained": False,
                            "tokenFilePathRetained": False,
                        },
                        "readiness": {
                            "canProceed": False,
                            "blockers": [
                                {
                                    "id": "token_file_unreadable",
                                    "owner": "concierge_operator",
                                    "external": False,
                                    "nextAction": (
                                        "Provision approved runtime token-file access for the Concierge process "
                                        "without copying token values into artifacts."
                                    ),
                                }
                            ],
                            "nextAction": "provision_runtime_token_access",
                            "validation": ["make runtime-handoff-status", "make check"],
                        },
                        "boundary": {
                            "localHandoffEvidenceOnly": True,
                            "doesNotContactNapoleon": True,
                            "doesNotApprove": True,
                            "doesNotWriteMemory": True,
                            "doesNotDispatchAgents": True,
                            "doesNotSendExternally": True,
                            "doesNotApplyEvolution": True,
                            "endpointHostRetained": False,
                            "tokenRetained": False,
                            "tokenFilePathRetained": False,
                            "requestBodyRetained": False,
                            "responseBodyRetained": False,
                        },
                    }
                ),
                encoding="utf-8",
            )

            report = goal_completion_audit.build_report(runtime_handoff_status_path=runtime_handoff_path)

        self.assertEqual(report["runtimeHandoffEvidence"]["path"], str(runtime_handoff_path))
        self.assertTrue(report["runtimeHandoffEvidence"]["loaded"])
        self.assertFalse(report["runtimeHandoffEvidence"]["canProceed"])
        self.assertEqual(report["runtimeHandoffEvidence"]["localBlockerCount"], 1)
        self.assertEqual(report["runtimeHandoffEvidence"]["externalBlockerCount"], 0)
        self.assertTrue(report["runtimeHandoffEvidence"]["authProvisioning"]["tokenRemotePresent"])
        self.assertFalse(report["runtimeHandoffEvidence"]["authProvisioning"]["tokenLocalReadableDeclared"])
        self.assertFalse(report["runtimeHandoffEvidence"]["authProvisioning"]["tokenRemoteReadableByOperator"])
        self.assertIn("runtime_handoff_token_access", report["completionGate"]["blockingRequirementIds"])
        self.assertEqual(report["completionGate"]["localBlockerCount"], 1)
        self.assertEqual(report["completionGate"]["externalBlockerCount"], 1)
        blocker = next(
            item for item in report["blockers"] if item["requirementId"] == "runtime_handoff_token_access"
        )
        self.assertEqual(blocker["owner"], "concierge_operator")
        self.assertFalse(blocker["external"])
        self.assertEqual(
            blocker["runtimeTokenHandoff"],
            {
                "tokenFileConfigured": True,
                "tokenFileReadable": False,
                "tokenRemotePresent": True,
                "tokenLocalReadableDeclared": False,
                "tokenRemoteReadableByOperator": False,
                "tokenRetained": False,
                "tokenFilePathRetained": False,
            },
        )
        token_action = next(
            item for item in report["nextActions"] if item["requirementId"] == "runtime_handoff_token_access"
        )
        self.assertEqual(token_action["runtimeTokenHandoff"], blocker["runtimeTokenHandoff"])
        self.assertNotIn("napoleon-runtime-pilot-auth-token", json.dumps(report))

    def test_make_target_can_forward_retained_alignment_report(self):
        makefile = Path("Makefile").read_text(encoding="utf-8")

        self.assertIn("NAPOLEON_CONTRACT_ALIGNMENT_OUT ?= /tmp/concierge-napoleon-alignment.json", makefile)
        self.assertIn("GOAL_COMPLETION_RUNTIME_HANDOFF_STATUS ?= /tmp/concierge-runtime-handoff-status.json", makefile)
        self.assertIn("GOAL_COMPLETION_ALIGNMENT_REPORT", makefile)
        self.assertIn("--contract-alignment-report $(GOAL_COMPLETION_ALIGNMENT_REPORT)", makefile)
        self.assertIn("--runtime-handoff-status $(GOAL_COMPLETION_RUNTIME_HANDOFF_STATUS)", makefile)


if __name__ == "__main__":
    unittest.main()
