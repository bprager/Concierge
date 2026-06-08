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


if __name__ == "__main__":
    unittest.main()
