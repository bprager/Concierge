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
        self.assertFalse(report["completionGate"]["canCloseGoal"])
        self.assertIn("make check", report["completionGate"]["requiredBeforeClose"])

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

    def test_make_target_can_forward_retained_alignment_report(self):
        makefile = Path("Makefile").read_text(encoding="utf-8")

        self.assertIn("GOAL_COMPLETION_ALIGNMENT_REPORT", makefile)
        self.assertIn("--contract-alignment-report $(GOAL_COMPLETION_ALIGNMENT_REPORT)", makefile)


if __name__ == "__main__":
    unittest.main()
