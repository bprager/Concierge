import contextlib
import io
import json
import tempfile
import unittest

from scripts import bridge_evidence_capture, bridge_evidence_compare, local_bridge_harness


class BridgeEvidenceCaptureTest(unittest.TestCase):
    def test_capture_runner_records_sanitized_harness_success_evidence(self):
        with local_bridge_harness.running_harness() as base_url:
            with tempfile.NamedTemporaryFile("r+", suffix=".json") as handle:
                with contextlib.redirect_stdout(io.StringIO()):
                    exit_code = bridge_evidence_capture.main(
                        [
                            "--endpoint",
                            base_url,
                            "--out",
                            handle.name,
                            "--message",
                            "Draft the private Napoleon bridge rollout note",
                        ]
                    )
                handle.seek(0)
                records = json.load(handle)

        self.assertEqual(exit_code, 0)
        self.assertEqual(bridge_evidence_compare.compare_bridge_evidence_records(records), [])
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["status"], "success")
        self.assertEqual(records[0]["targetPath"], "/v1/concierge/turn")
        self.assertEqual(records[0]["requestKind"], "text_turn")
        self.assertEqual(records[0]["governanceOutcome"], "requires_review")
        self.assertEqual(records[0]["selectedAgentIds"], ["passive_brain"])
        self.assertFalse("Draft the private Napoleon bridge rollout note" in json.dumps(records))
        self.assertFalse(base_url in json.dumps(records))

    def test_capture_runner_fails_without_endpoint_or_environment(self):
        with tempfile.NamedTemporaryFile("w", suffix=".json") as handle:
            with contextlib.redirect_stderr(io.StringIO()) as stderr:
                exit_code = bridge_evidence_capture.main(["--out", handle.name], env={})

        self.assertEqual(exit_code, 2)
        self.assertIn("NAPOLEON_EVAL_ENDPOINT", stderr.getvalue())

    def test_capture_runner_command_writes_json_list(self):
        with local_bridge_harness.running_harness() as base_url:
            with tempfile.NamedTemporaryFile("r+", suffix=".json") as handle:
                stdout = io.StringIO()
                with contextlib.redirect_stdout(stdout):
                    exit_code = bridge_evidence_capture.main(["--endpoint", base_url, "--out", handle.name])
                handle.seek(0)
                payload = json.load(handle)

        self.assertEqual(exit_code, 0)
        self.assertIsInstance(payload, list)
        self.assertIn("captured 1 bridge evidence record", stdout.getvalue())


if __name__ == "__main__":
    unittest.main()
