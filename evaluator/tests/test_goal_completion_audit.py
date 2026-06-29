import unittest

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
        self.assertGreaterEqual(report["statusCounts"]["proven"], 1)

    def test_every_requirement_has_evidence_paths(self):
        report = goal_completion_audit.build_report()

        for requirement in report["requirements"]:
            self.assertTrue(requirement["id"])
            self.assertTrue(requirement["requirement"])
            self.assertGreater(len(requirement["evidence"]), 0, requirement["id"])
            for evidence in requirement["evidence"]:
                self.assertTrue(evidence["path"])
                self.assertIn(evidence["status"], {"present", "partial", "missing"})


if __name__ == "__main__":
    unittest.main()
