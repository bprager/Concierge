import json
import tempfile
import unittest
from pathlib import Path

from scripts import create_eval_human_review


class CreateEvalHumanReviewTest(unittest.TestCase):
    def test_creates_non_authorizing_review_record(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            report = Path(tmpdir) / "latest.json"
            baseline = Path(tmpdir) / "accepted_baseline.json"
            out = Path(tmpdir) / "review.md"
            report.write_text(
                json.dumps({
                    "run_id": "run_current",
                    "mode": "stub",
                    "score_total": 100,
                    "scenario_count": 24,
                    "hard_fails": [],
                    "missing_artifacts": [],
                    "regressions": [],
                }),
                encoding="utf-8",
            )
            baseline.write_text(
                json.dumps({
                    "run_id": "run_baseline",
                    "score_total": 99,
                }),
                encoding="utf-8",
            )

            exit_code = create_eval_human_review.main([
                "--report", str(report),
                "--baseline", str(baseline),
                "--out", str(out),
                "--reviewer", "Reviewer",
                "--decision", "approve",
                "--generated-at", "2026-06-14T00:00:00Z",
            ])

            self.assertEqual(exit_code, 0)
            review = out.read_text(encoding="utf-8")
            self.assertIn("Run ID: `run_current`", review)
            self.assertIn("Baseline run ID: `run_baseline`", review)
            self.assertIn("Decision: `approve`", review)
            self.assertIn("not Napoleon approval", review)
            self.assertIn("not release approval", review)
            self.assertIn("not a memory write", review)
            self.assertIn("not agent dispatch", review)
            self.assertIn("Locally safe to consider for promotion: `true`", review)

    def test_defaults_to_request_revision_until_human_approves(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            report = Path(tmpdir) / "latest.json"
            out = Path(tmpdir) / "review.md"
            report.write_text(
                json.dumps({
                    "run_id": "run_pending",
                    "mode": "stub",
                    "score_total": 100,
                    "hard_fails": [],
                    "missing_artifacts": [],
                    "regressions": [],
                }),
                encoding="utf-8",
            )

            create_eval_human_review.main([
                "--report", str(report),
                "--baseline", str(Path(tmpdir) / "missing_baseline.json"),
                "--out", str(out),
                "--generated-at", "2026-06-14T00:00:00Z",
            ])

            review = out.read_text(encoding="utf-8")
            self.assertIn("Decision: `request_revision`", review)
            self.assertIn("Locally safe to consider for promotion: `false`", review)

    def test_missing_report_exits_without_writing_review(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            out = Path(tmpdir) / "review.md"

            with self.assertRaises(SystemExit):
                create_eval_human_review.main([
                    "--report", str(Path(tmpdir) / "missing.json"),
                    "--out", str(out),
                ])

            self.assertEqual(out.exists(), False)

    def test_regression_prevents_local_promotion_even_if_approved(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            report = Path(tmpdir) / "latest.json"
            out = Path(tmpdir) / "review.md"
            report.write_text(
                json.dumps({
                    "run_id": "run_regressed",
                    "mode": "stub",
                    "score_total": 100,
                    "hard_fails": [],
                    "missing_artifacts": [],
                    "regressions": [{"id": "score_total_decreased"}],
                }),
                encoding="utf-8",
            )

            create_eval_human_review.main([
                "--report", str(report),
                "--out", str(out),
                "--decision", "approve",
                "--generated-at", "2026-06-14T00:00:00Z",
            ])

            review = out.read_text(encoding="utf-8")
            self.assertIn("Regression count: `1`", review)
            self.assertIn("Locally safe to consider for promotion: `false`", review)


if __name__ == "__main__":
    unittest.main()
