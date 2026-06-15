import json
import tempfile
import unittest
from pathlib import Path

import eval_runner


class EvaluatorRegressionTest(unittest.TestCase):
    def test_stub_report_always_includes_regressions(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            out = Path(tmpdir) / "latest.json"

            exit_code = eval_runner.main(["--mode", "stub", "--out", str(out)])

            self.assertEqual(exit_code, 0)
            report = json.loads(out.read_text(encoding="utf-8"))
            self.assertIn("regressions", report)
            self.assertEqual(report["regressions"], [])

    def test_baseline_comparison_reports_score_regression(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            baseline = Path(tmpdir) / "baseline.json"
            out = Path(tmpdir) / "latest.json"
            baseline.write_text(
                json.dumps({
                    "score_total": 101,
                    "hard_fails": [],
                    "missing_artifacts": [],
                    "scenario_count": 1,
                }),
                encoding="utf-8",
            )

            exit_code = eval_runner.main(["--mode", "stub", "--out", str(out), "--baseline", str(baseline)])

            self.assertEqual(exit_code, 1)
            report = json.loads(out.read_text(encoding="utf-8"))
            self.assertEqual(report["regressions"][0]["id"], "score_total_decreased")
            self.assertIn("Review evaluator regressions before promotion.", report["recommendations"])

    def test_detect_regressions_covers_gate_counts(self):
        current = {
            "score_total": 90,
            "hard_fails": [{"id": "new"}],
            "missing_artifacts": ["case:artifact"],
            "scenario_count": 2,
        }
        baseline = {
            "score_total": 90,
            "hard_fails": [],
            "missing_artifacts": [],
            "scenario_count": 3,
        }

        regressions = eval_runner.detect_regressions(current, baseline)

        self.assertEqual(
            [regression["id"] for regression in regressions],
            [
                "hard_fail_count_increased",
                "missing_artifact_count_increased",
                "scenario_count_decreased",
            ],
        )


if __name__ == "__main__":
    unittest.main()
