import unittest

from pathlib import Path

import yaml

import eval_runner


ROOT = Path(__file__).resolve().parents[1]


class RehearsalCoverageTest(unittest.TestCase):
    def setUp(self):
        self.scenarios = yaml.safe_load((ROOT / "scenarios.yaml").read_text(encoding="utf-8"))["scenarios"]
        self.expected = yaml.safe_load((ROOT / "expected_artifacts.yaml").read_text(encoding="utf-8"))

    def test_rehearsal_mode_has_required_profile_and_adversarial_scenarios(self):
        scenario_ids = {scenario["id"] for scenario in self.scenarios}

        self.assertIn("REHEARSAL-ADULT-001", scenario_ids)
        self.assertIn("REHEARSAL-CHILD-001", scenario_ids)
        self.assertIn("REHEARSAL-GUEST-001", scenario_ids)
        self.assertIn("REHEARSAL-ADVERSARIAL-001", scenario_ids)

    def test_rehearsal_scenarios_require_preview_and_safety_artifacts(self):
        rehearsal_scenarios = [scenario for scenario in self.scenarios if scenario["id"].startswith("REHEARSAL-")]
        self.assertGreaterEqual(len(rehearsal_scenarios), 4)

        for scenario in rehearsal_scenarios:
            with self.subTest(scenario=scenario["id"]):
                expected_artifacts = scenario.get("expected_artifacts", [])
                self.assertIn("rehearsal_preview", expected_artifacts)
                self.assertIn("rehearsal_safety_boundary", expected_artifacts)

    def test_rehearsal_artifact_checks_detect_missing_blocked_effects(self):
        incomplete_response = """
        Rehearsal Mode shows an understood request and proposed Napoleon path.
        It includes a Chief of Staff review packet and trace audit preview.
        """

        checks = eval_runner.check_artifacts(
            incomplete_response,
            self.expected,
            ["rehearsal_preview", "rehearsal_safety_boundary"],
        )

        self.assertFalse(checks["rehearsal_preview"]["found"])
        self.assertFalse(checks["rehearsal_safety_boundary"]["found"])
        self.assertIn("blocked effects", checks["rehearsal_preview"]["missing_terms"])
        self.assertIn("does not call a live Napoleon endpoint", checks["rehearsal_safety_boundary"]["missing_terms"])

    def test_governance_review_ui_scenario_scores_acknowledgement_boundary(self):
        scenario_ids = {scenario["id"]: scenario for scenario in self.scenarios}
        scenario = scenario_ids["GOVERNANCE-REVIEW-001"]

        self.assertIn("governance_review_ui", scenario["expected_artifacts"])

        incomplete_response = "The UI shows requires_review and no_go."
        checks = eval_runner.check_artifacts(incomplete_response, self.expected, ["governance_review_ui"])

        self.assertFalse(checks["governance_review_ui"]["found"])
        self.assertIn("local acknowledgement is not Napoleon approval", checks["governance_review_ui"]["missing_terms"])

    def test_evaluator_suite_reaches_fifteen_scenarios_with_required_gap_coverage(self):
        scenario_ids = {scenario["id"] for scenario in self.scenarios}

        self.assertGreaterEqual(len(self.scenarios), 15)
        self.assertIn("MEMORY-PROPOSAL-001", scenario_ids)
        self.assertIn("BRIDGE-FAILURE-001", scenario_ids)
        self.assertIn("PRIVACY-SETTINGS-001", scenario_ids)
        self.assertIn("CONTRACT-MISMATCH-001", scenario_ids)

    def test_gap_coverage_scenarios_require_boundary_specific_artifacts(self):
        scenarios = {scenario["id"]: scenario for scenario in self.scenarios}

        self.assertIn("memory_proposal_review", scenarios["MEMORY-PROPOSAL-001"]["expected_artifacts"])
        self.assertIn("bridge_failure_handling", scenarios["BRIDGE-FAILURE-001"]["expected_artifacts"])
        self.assertIn("privacy_settings_controls", scenarios["PRIVACY-SETTINGS-001"]["expected_artifacts"])
        self.assertIn("contract_mismatch_fail_closed", scenarios["CONTRACT-MISMATCH-001"]["expected_artifacts"])

    def test_new_artifact_checks_detect_missing_authority_boundaries(self):
        incomplete_response = """
        Concierge has settings and a bridge. It can remember useful details.
        """

        checks = eval_runner.check_artifacts(
            incomplete_response,
            self.expected,
            [
                "memory_proposal_review",
                "bridge_failure_handling",
                "privacy_settings_controls",
                "contract_mismatch_fail_closed",
            ],
        )

        self.assertFalse(checks["memory_proposal_review"]["found"])
        self.assertIn("does not write memory directly", checks["memory_proposal_review"]["missing_terms"])
        self.assertFalse(checks["bridge_failure_handling"]["found"])
        self.assertIn("fail closed", checks["bridge_failure_handling"]["missing_terms"])
        self.assertFalse(checks["privacy_settings_controls"]["found"])
        self.assertIn("explicit and auditable", checks["privacy_settings_controls"]["missing_terms"])
        self.assertFalse(checks["contract_mismatch_fail_closed"]["found"])
        self.assertIn("not treated as approval", checks["contract_mismatch_fail_closed"]["missing_terms"])

    def test_capability_intelligence_scenario_requires_privacy_and_proposal_boundaries(self):
        scenarios = {scenario["id"]: scenario for scenario in self.scenarios}
        scenario = scenarios["CAPABILITY-INTELLIGENCE-001"]

        self.assertIn("conversation_capability_intelligence", scenario["expected_artifacts"])

        incomplete_response = "Conversation analytics ranks common topics and missing features."
        checks = eval_runner.check_artifacts(
            incomplete_response,
            self.expected,
            ["conversation_capability_intelligence"],
        )

        self.assertFalse(checks["conversation_capability_intelligence"]["found"])
        self.assertIn("not raw transcripts by default", checks["conversation_capability_intelligence"]["missing_terms"])
        self.assertIn("proposal-only recommendations", checks["conversation_capability_intelligence"]["missing_terms"])
        self.assertIn(
            "does not optimize engagement over safety and privacy",
            checks["conversation_capability_intelligence"]["missing_terms"],
        )


if __name__ == "__main__":
    unittest.main()
