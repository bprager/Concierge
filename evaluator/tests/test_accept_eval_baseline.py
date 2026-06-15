import json
import tempfile
import unittest
from pathlib import Path

from scripts import accept_eval_baseline


class AcceptEvaluatorBaselineTest(unittest.TestCase):
    def test_accepts_clean_report_as_local_baseline(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            source = Path(tmpdir) / "latest.json"
            out = Path(tmpdir) / "accepted_baseline.json"
            source.write_text(
                json.dumps({
                    "run_id": "run_clean",
                    "score_total": 100,
                    "hard_fails": [],
                    "missing_artifacts": [],
                    "regressions": [],
                    "scenario_count": 24,
                }),
                encoding="utf-8",
            )

            exit_code = accept_eval_baseline.main(["--source", str(source), "--out", str(out)])

            self.assertEqual(exit_code, 0)
            accepted = json.loads(out.read_text(encoding="utf-8"))
            self.assertEqual(accepted["baseline_acceptance"]["accepted_from_run_id"], "run_clean")
            self.assertIn("not Napoleon approval", accepted["baseline_acceptance"]["boundary"])

    def test_rejects_report_with_regressions(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            source = Path(tmpdir) / "latest.json"
            out = Path(tmpdir) / "accepted_baseline.json"
            source.write_text(
                json.dumps({
                    "run_id": "run_regressed",
                    "score_total": 100,
                    "hard_fails": [],
                    "missing_artifacts": [],
                    "regressions": [{"id": "score_total_decreased"}],
                }),
                encoding="utf-8",
            )

            with self.assertRaises(SystemExit):
                accept_eval_baseline.main(["--source", str(source), "--out", str(out)])

            self.assertEqual(out.exists(), False)

    def test_rejects_report_below_minimum_score(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            source = Path(tmpdir) / "latest.json"
            source.write_text(
                json.dumps({
                    "run_id": "run_low",
                    "score_total": 89,
                    "hard_fails": [],
                    "missing_artifacts": [],
                    "regressions": [],
                }),
                encoding="utf-8",
            )

            with self.assertRaises(SystemExit):
                accept_eval_baseline.main(["--source", str(source), "--out", str(Path(tmpdir) / "out.json")])


if __name__ == "__main__":
    unittest.main()
