import json
import sys
import tempfile
import types
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

    def test_resolves_generated_and_explicit_evaluation_review_targets(self):
        self.assertEqual(
            eval_runner.resolve_evaluation_review_target("http://127.0.0.1:8787"),
            {
                "url": "http://127.0.0.1:8787/v1/concierge/evaluate",
                "path": "/v1/concierge/evaluate",
                "requestKind": "evaluator_prompt",
                "operationId": "evaluate",
            },
        )
        self.assertEqual(
            eval_runner.resolve_evaluation_review_target("https://napoleon.example"),
            {
                "url": "https://napoleon.example/chief-of-staff/reviews/evaluation",
                "path": "/chief-of-staff/reviews/evaluation",
                "requestKind": "evaluation_review_handoff",
                "operationId": "evaluation_review",
            },
        )
        self.assertEqual(
            eval_runner.resolve_evaluation_review_target(
                "https://napoleon.example/chief-of-staff/reviews/evaluation?debug=1"
            )["url"],
            "https://napoleon.example/chief-of-staff/reviews/evaluation",
        )
        self.assertEqual(
            eval_runner.resolve_evaluation_review_target(
                "http://127.0.0.1:8787/chief-of-staff/reviews/evaluation"
            ),
            {
                "url": "http://127.0.0.1:8787/chief-of-staff/reviews/evaluation",
                "path": "/chief-of-staff/reviews/evaluation",
                "requestKind": "evaluation_review_handoff",
                "operationId": "evaluation_review",
            },
        )

    def test_http_eval_posts_named_explicit_evaluation_review_packet(self):
        calls = []

        class Response:
            def raise_for_status(self):
                return None

            def json(self):
                return {"text": "review accepted"}

        def post(url, headers, json, timeout):
            calls.append({"url": url, "headers": headers, "json": json, "timeout": timeout})
            return Response()

        previous = sys.modules.get("requests")
        sys.modules["requests"] = types.SimpleNamespace(post=post)
        try:
            text = eval_runner.call_http("https://napoleon.example", "CASE-1", "Prompt", "token_eval")
        finally:
            if previous is None:
                del sys.modules["requests"]
            else:
                sys.modules["requests"] = previous

        self.assertEqual(text, "review accepted")
        self.assertEqual(calls[0]["url"], "https://napoleon.example/chief-of-staff/reviews/evaluation")
        self.assertEqual(calls[0]["headers"]["Authorization"], "Bearer token_eval")
        self.assertEqual(calls[0]["json"]["requestKind"], "evaluation_review_handoff")
        self.assertEqual(calls[0]["json"]["bridgeTargetPath"], "/chief-of-staff/reviews/evaluation")
        self.assertEqual(calls[0]["json"]["bridgeTargetOperation"], "evaluation_review")
        self.assertEqual(calls[0]["json"]["boundary"]["proposalOnly"], True)
        self.assertEqual(calls[0]["json"]["boundary"]["approvalCaptured"], False)

    def test_http_report_records_sanitized_evaluation_target_metadata(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            out = Path(tmpdir) / "latest.json"

            previous = eval_runner.call_http
            eval_runner.call_http = lambda endpoint, case_id, prompt, token=None: eval_runner.call_stub(case_id, prompt)
            try:
                exit_code = eval_runner.main([
                    "--mode",
                    "http",
                    "--endpoint",
                    "https://napoleon.example/chief-of-staff/reviews/evaluation?debug=1",
                    "--token",
                    "token_eval",
                    "--out",
                    str(out),
                ])
            finally:
                eval_runner.call_http = previous

            self.assertEqual(exit_code, 0)
            report = json.loads(out.read_text(encoding="utf-8"))
            self.assertEqual(report["evaluationTarget"]["path"], "/chief-of-staff/reviews/evaluation")
            self.assertEqual(report["evaluationTarget"]["requestKind"], "evaluation_review_handoff")
            self.assertEqual(report["evaluationTarget"]["operationId"], "evaluation_review")
            self.assertEqual(report["evaluationTarget"]["endpointHostRetained"], False)
            self.assertEqual(report["evaluationTarget"]["tokenRetained"], False)
            self.assertEqual(report["evaluationTarget"]["approvalCaptured"], False)
            self.assertEqual(report["evaluationTarget"]["memoryWritePerformed"], False)
            self.assertEqual(report["evaluationTarget"]["agentDispatchPerformed"], False)
            self.assertEqual(report["evaluationTarget"]["externalSendPerformed"], False)
            self.assertNotIn("napoleon.example", json.dumps(report))
            self.assertNotIn("token_eval", json.dumps(report))


if __name__ == "__main__":
    unittest.main()
