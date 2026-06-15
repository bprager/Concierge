import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path

from scripts import live_runtime_validation, local_bridge_harness


class LiveRuntimeValidationTest(unittest.TestCase):
    def test_runs_bridge_capture_and_http_eval_against_local_harness(self):
        with local_bridge_harness.running_harness() as base_url:
            with tempfile.TemporaryDirectory() as tmpdir:
                stdout = io.StringIO()
                with contextlib.redirect_stdout(stdout):
                    exit_code = live_runtime_validation.main([
                        "--bridge-endpoint", base_url,
                        "--out-dir", tmpdir,
                    ])

                summary = json.loads((Path(tmpdir) / "summary.json").read_text(encoding="utf-8"))
                evidence = json.loads((Path(tmpdir) / "bridge_evidence.json").read_text(encoding="utf-8"))
                report = json.loads((Path(tmpdir) / "eval_http.json").read_text(encoding="utf-8"))

        self.assertEqual(exit_code, 0)
        self.assertEqual(summary["bridgeEvidence"]["status"], "passed")
        self.assertEqual(summary["bridgeEvidence"]["record_count"], 1)
        self.assertEqual(summary["httpEvaluator"]["status"], "passed")
        self.assertTrue(summary["httpEvaluator"]["sanitized"])
        self.assertEqual(report["score_total"], 100.0)
        self.assertNotIn("response_excerpt", json.dumps(report))
        self.assertNotIn("PRD: Concierge", json.dumps(report))
        self.assertGreater(report["live_runtime_sanitization"]["responseExcerptsRemoved"], 0)
        self.assertEqual(evidence[0]["targetPath"], "/v1/concierge/turn")
        self.assertIn("not Napoleon approval", summary["boundary"])
        self.assertFalse(summary["promotionBoundary"]["approvalCaptured"])
        self.assertFalse(summary["promotionBoundary"]["memoryWritePerformed"])
        self.assertFalse(base_url in json.dumps(summary))
        self.assertIn("bridge_status", stdout.getvalue())

    def test_derives_bridge_base_from_eval_endpoint(self):
        bridge, evaluator = live_runtime_validation.resolve_endpoints(
            None,
            "http://127.0.0.1:8787/v1/concierge/evaluate",
            {},
        )

        self.assertEqual(bridge, "http://127.0.0.1:8787")
        self.assertEqual(evaluator, "http://127.0.0.1:8787/v1/concierge/evaluate")

    def test_derives_eval_endpoint_from_bridge_base(self):
        bridge, evaluator = live_runtime_validation.resolve_endpoints(
            "http://127.0.0.1:8787/v1/concierge/turn",
            None,
            {},
        )

        self.assertEqual(bridge, "http://127.0.0.1:8787/v1/concierge/turn")
        self.assertEqual(evaluator, "http://127.0.0.1:8787/v1/concierge/evaluate")

    def test_runs_from_bridge_endpoint_environment_without_eval_endpoint(self):
        with local_bridge_harness.running_harness() as base_url:
            with tempfile.TemporaryDirectory() as tmpdir:
                stdout = io.StringIO()
                with contextlib.redirect_stdout(stdout):
                    exit_code = live_runtime_validation.main(
                        ["--out-dir", tmpdir],
                        env={"NAPOLEON_BRIDGE_ENDPOINT": base_url},
                    )

                summary = json.loads((Path(tmpdir) / "summary.json").read_text(encoding="utf-8"))

        self.assertEqual(exit_code, 0)
        self.assertEqual(summary["bridgeEvidence"]["status"], "passed")
        self.assertEqual(summary["httpEvaluator"]["status"], "passed")
        self.assertNotIn(base_url, json.dumps(summary))
        self.assertIn("http_evaluator_status", stdout.getvalue())

    def test_fails_without_any_endpoint_and_writes_no_artifacts(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            stderr = io.StringIO()
            with contextlib.redirect_stderr(stderr):
                exit_code = live_runtime_validation.main(["--out-dir", tmpdir], env={})

            self.assertEqual(exit_code, 2)
            self.assertIn("NAPOLEON_BRIDGE_ENDPOINT", stderr.getvalue())
            self.assertFalse((Path(tmpdir) / "summary.json").exists())

    def test_sanitize_eval_report_removes_nested_response_excerpts(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            report_path = Path(tmpdir) / "eval_http.json"
            report_path.write_text(
                json.dumps({
                    "run_id": "run_raw",
                    "cases": [
                        {"case_id": "CASE-001", "response_excerpt": "raw live response"},
                        {"case_id": "CASE-002", "nested": {"response_excerpt": "another raw response"}},
                    ],
                }),
                encoding="utf-8",
            )

            removed = live_runtime_validation.sanitize_eval_report(report_path)
            report = json.loads(report_path.read_text(encoding="utf-8"))

        self.assertEqual(removed, 2)
        self.assertNotIn("response_excerpt", json.dumps(report))
        self.assertEqual(report["live_runtime_sanitization"]["responseExcerptsRemoved"], 2)


if __name__ == "__main__":
    unittest.main()
