import json
import tempfile
import unittest
from pathlib import Path

from scripts import create_eval_summary


class CreateEvalSummaryTest(unittest.TestCase):
    def test_creates_clean_non_authorizing_summary_without_response_excerpt(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            report = Path(tmpdir) / "latest.json"
            review = Path(tmpdir) / "human_review.md"
            out = Path(tmpdir) / "summary.md"
            review.write_text("# Review\n", encoding="utf-8")
            report.write_text(
                json.dumps({
                    "run_id": "run_clean",
                    "mode": "stub",
                    "scenario_count": 1,
                    "score_total": 100,
                    "hard_fails": [],
                    "missing_artifacts": [],
                    "regressions": [],
                    "recommendations": [],
                    "dimension_scores": {"governance": 15},
                    "cases": [{
                        "case_id": "CASE-001",
                        "title": "Clean case",
                        "score": 100,
                        "hard_fails": [],
                        "artifact_checks": {"contract": {"found": True}},
                        "response_excerpt": "raw response text should not be copied",
                    }],
                }),
                encoding="utf-8",
            )

            exit_code = create_eval_summary.main([
                "--report", str(report),
                "--review", str(review),
                "--out", str(out),
            ])

            self.assertEqual(exit_code, 0)
            summary = out.read_text(encoding="utf-8")
            self.assertIn("Run ID: `run_clean`", summary)
            self.assertIn("Status: `clean_local_evaluator_run`", summary)
            self.assertIn("not Napoleon approval", summary)
            self.assertIn("Human review: required before promotion.", summary)
            self.assertNotIn("raw response text should not be copied", summary)

    def test_marks_summary_blocked_for_regressions_and_missing_artifacts(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            report = Path(tmpdir) / "latest.json"
            out = Path(tmpdir) / "summary.md"
            report.write_text(
                json.dumps({
                    "run_id": "run_blocked",
                    "mode": "stub",
                    "scenario_count": 1,
                    "score_total": 80,
                    "hard_fails": [{"case_id": "CASE-001", "id": "unsafe", "message": "Unsafe authority."}],
                    "missing_artifacts": ["CASE-001:contract"],
                    "regressions": [{"id": "score_total_decreased", "previous": 100, "current": 80}],
                    "recommendations": ["Fix hard fails before promotion."],
                    "dimension_scores": {"governance": 5},
                    "cases": [{
                        "case_id": "CASE-001",
                        "title": "Blocked case",
                        "score": 80,
                        "hard_fails": [{"id": "unsafe", "message": "Unsafe authority."}],
                        "artifact_checks": {"contract": {"found": False}},
                    }],
                }),
                encoding="utf-8",
            )

            create_eval_summary.main(["--report", str(report), "--review", "", "--out", str(out)])

            summary = out.read_text(encoding="utf-8")
            self.assertIn("Status: `blocked`", summary)
            self.assertIn("CASE-001: Unsafe authority.", summary)
            self.assertIn("CASE-001:contract", summary)
            self.assertIn("score_total_decreased: 100 -> 80", summary)
            self.assertIn("`CASE-001`: hard_fail", summary)

    def test_missing_report_exits_without_writing_summary(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            out = Path(tmpdir) / "summary.md"

            with self.assertRaises(SystemExit):
                create_eval_summary.main(["--report", str(Path(tmpdir) / "missing.json"), "--out", str(out)])

            self.assertEqual(out.exists(), False)


if __name__ == "__main__":
    unittest.main()
