import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path

from evaluator.tests.test_bridge_evidence_capture import RecordingCosHarness
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
                        "--runtime-validation-source", "local_harness",
                    ])

                summary = json.loads((Path(tmpdir) / "summary.json").read_text(encoding="utf-8"))
                evidence = json.loads((Path(tmpdir) / "bridge_evidence.json").read_text(encoding="utf-8"))
                report = json.loads((Path(tmpdir) / "eval_http.json").read_text(encoding="utf-8"))

        self.assertEqual(exit_code, 0)
        self.assertEqual(summary["bridgeEvidence"]["status"], "passed")
        self.assertEqual(summary["bridgeEvidence"]["record_count"], 1)
        self.assertEqual(summary["httpEvaluator"]["status"], "passed")
        self.assertTrue(summary["httpEvaluator"]["sanitized"])
        self.assertEqual(summary["runtimeValidation"]["source"], "local_harness")
        self.assertIn("not real Napoleon runtime validation", summary["runtimeValidation"]["caveat"])
        self.assertEqual(summary["artifactPrivacy"]["status"], "passed")
        self.assertEqual(summary["artifactPrivacy"]["violation_count"], 0)
        self.assertEqual(summary["artifactPrivacy"]["checked_count"], 2)
        self.assertEqual(report["score_total"], 100.0)
        self.assertNotIn("response_excerpt", json.dumps(report))
        self.assertNotIn("PRD: Concierge", json.dumps(report))
        self.assertGreater(report["live_runtime_sanitization"]["responseExcerptsRemoved"], 0)
        self.assertEqual(evidence[0]["targetPath"], "/v1/concierge/turn")
        self.assertEqual(evidence[0]["runtimeValidationSource"], "local_harness")
        self.assertIn("not Napoleon approval", summary["boundary"])
        self.assertFalse(summary["promotionBoundary"]["approvalCaptured"])
        self.assertFalse(summary["promotionBoundary"]["memoryWritePerformed"])
        self.assertFalse(base_url in json.dumps(summary))
        self.assertIn("runtime_validation_source", stdout.getvalue())
        self.assertIn("bridge_status", stdout.getvalue())
        self.assertIn("artifact_privacy_status", stdout.getvalue())

    def test_summary_reports_sanitized_cos_bridge_operation_metadata(self):
        with RecordingCosHarness(descriptor_ready=True) as cos_harness:
            with local_bridge_harness.running_harness() as eval_base_url:
                with tempfile.TemporaryDirectory() as tmpdir:
                    stdout = io.StringIO()
                    with contextlib.redirect_stdout(stdout):
                        exit_code = live_runtime_validation.main([
                            "--bridge-endpoint", f"{cos_harness.base_url}/cos/text-turn",
                            "--eval-endpoint", f"{eval_base_url}/v1/concierge/evaluate",
                            "--out-dir", tmpdir,
                            "--auth-token", "token_cos_summary",
                            "--runtime-validation-source", "local_harness",
                        ])

                    summary = json.loads((Path(tmpdir) / "summary.json").read_text(encoding="utf-8"))
                    evidence = json.loads((Path(tmpdir) / "bridge_evidence.json").read_text(encoding="utf-8"))

        summary_json = json.dumps(summary)
        self.assertEqual(exit_code, 0)
        self.assertEqual(cos_harness.last_get_path, "/cos/descriptor")
        self.assertEqual(cos_harness.last_post_path, "/cos/text-turn")
        self.assertEqual(evidence[0]["targetPath"], "/cos/text-turn")
        self.assertEqual(summary["bridgeEvidence"]["lastTargetPath"], "/cos/text-turn")
        self.assertEqual(summary["bridgeEvidence"]["lastOperationId"], "text_turn")
        self.assertEqual(summary["bridgeEvidence"]["lastRequestKind"], "text_turn")
        self.assertEqual(summary["bridgeEvidence"]["lastTransport"], "http_post")
        self.assertEqual(summary["bridgeEvidence"]["lastRuntimeValidationSource"], "local_harness")
        self.assertEqual(summary["bridgeEvidence"]["lastEvidenceStatus"], "success")
        self.assertEqual(summary["bridgeEvidence"]["status"], "passed")
        self.assertEqual(summary["httpEvaluator"]["status"], "passed")
        self.assertEqual(summary["artifactPrivacy"]["status"], "passed")
        self.assertNotIn(cos_harness.base_url, summary_json)
        self.assertNotIn(eval_base_url, summary_json)
        self.assertNotIn("token_cos_summary", summary_json)
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

    def test_derives_eval_endpoint_from_known_bridge_operation_urls(self):
        for path in [
            "/v1/concierge/chief-of-staff/descriptor",
            "/v1/concierge/chief-of-staff/steering",
            "/v1/concierge/memory-proposals",
        ]:
            with self.subTest(path=path):
                bridge, evaluator = live_runtime_validation.resolve_endpoints(
                    f"http://127.0.0.1:8787{path}",
                    None,
                    {},
                )

                self.assertEqual(bridge, f"http://127.0.0.1:8787{path}")
                self.assertEqual(evaluator, "http://127.0.0.1:8787/v1/concierge/evaluate")

    def test_runs_from_bridge_endpoint_environment_without_eval_endpoint(self):
        with local_bridge_harness.running_harness() as base_url:
            with tempfile.TemporaryDirectory() as tmpdir:
                stdout = io.StringIO()
                with contextlib.redirect_stdout(stdout):
                    exit_code = live_runtime_validation.main(
                        ["--out-dir", tmpdir, "--runtime-validation-source", "local_harness"],
                        env={"NAPOLEON_BRIDGE_ENDPOINT": base_url},
                    )

                summary = json.loads((Path(tmpdir) / "summary.json").read_text(encoding="utf-8"))

        self.assertEqual(exit_code, 0)
        self.assertEqual(summary["bridgeEvidence"]["status"], "passed")
        self.assertEqual(summary["httpEvaluator"]["status"], "passed")
        self.assertEqual(summary["runtimeValidation"]["source"], "local_harness")
        self.assertEqual(summary["artifactPrivacy"]["status"], "passed")
        self.assertIn("not real Napoleon runtime validation", summary["runtimeValidation"]["caveat"])
        self.assertNotIn(base_url, json.dumps(summary))
        self.assertIn("http_evaluator_status", stdout.getvalue())

    def test_fails_closed_when_local_harness_is_mislabeled_as_real_runtime(self):
        with local_bridge_harness.running_harness() as base_url:
            with tempfile.TemporaryDirectory() as tmpdir:
                stdout = io.StringIO()
                stderr = io.StringIO()
                with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                    exit_code = live_runtime_validation.main(["--bridge-endpoint", base_url, "--out-dir", tmpdir])

                summary = json.loads((Path(tmpdir) / "summary.json").read_text(encoding="utf-8"))

        self.assertEqual(exit_code, 1)
        self.assertEqual(summary["bridgeEvidence"]["status"], "failed")
        self.assertEqual(summary["httpEvaluator"]["status"], "not_run")
        self.assertEqual(summary["artifactPrivacy"]["status"], "passed")
        self.assertEqual(summary["runtimeValidation"]["source"], "real_runtime")
        self.assertIn("descriptor identifies local_harness", stderr.getvalue())
        self.assertFalse((Path(tmpdir) / "bridge_evidence.json").exists())

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

    def test_artifact_privacy_audit_rejects_forbidden_fields_and_sensitive_values(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            artifact = Path(tmpdir) / "artifact.json"
            artifact.write_text(
                json.dumps({
                    "safe": "metadata",
                    "nested": {
                        "responseText": "raw response",
                        "trace": "trace_123",
                        "note": "called http://127.0.0.1:8787 during validation",
                    },
                }),
                encoding="utf-8",
            )

            audit = live_runtime_validation.audit_artifact_privacy(
                [artifact],
                {"http://127.0.0.1:8787", "secret_token"},
            )

        self.assertEqual(audit["status"], "failed")
        self.assertEqual(audit["checked_count"], 1)
        self.assertEqual(audit["violation_count"], 2)
        self.assertTrue(any("forbidden artifact field responseText" in violation for violation in audit["artifacts"][0]["violations"]))
        self.assertTrue(any("sensitive runtime value present" in violation for violation in audit["artifacts"][0]["violations"]))
        self.assertNotIn("raw response", json.dumps(audit))
        self.assertNotIn("127.0.0.1:8787", json.dumps(audit))


if __name__ == "__main__":
    unittest.main()
