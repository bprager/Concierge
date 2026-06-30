import subprocess
import tempfile
import unittest
from pathlib import Path

from scripts import desktop_runtime_transport_validation


class DesktopRuntimeTransportValidationTest(unittest.TestCase):
    def test_report_records_packaged_transport_without_secret_retention(self):
        def runner(command, cwd):
            return subprocess.CompletedProcess(command, 0, stdout="secret output", stderr="secret error")

        report = desktop_runtime_transport_validation.build_report(runner=runner, tauri_dir=Path("/tmp/tauri"))

        self.assertEqual(report["kind"], desktop_runtime_transport_validation.OUTPUT_KIND)
        self.assertEqual(report["status"], "passed")
        self.assertEqual(len(report["checks"]), 4)
        for check in report["checks"]:
            self.assertEqual(check["status"], "passed")
            self.assertFalse(check["stdoutRetained"])
            self.assertFalse(check["stderrRetained"])
            self.assertFalse(check["endpointHostRetained"])
            self.assertFalse(check["tokenRetained"])
            self.assertFalse(check["tokenFilePathRetained"])
            self.assertFalse(check["requestBodyRetained"])
            self.assertFalse(check["responseBodyRetained"])
        transport = report["packagedDesktopTransport"]
        self.assertTrue(transport["usesTauriCommandPath"])
        self.assertFalse(transport["browserProxyRequired"])
        self.assertTrue(transport["nativeAuthFallbackWhenWebviewOmitsAuth"])
        self.assertTrue(transport["webviewAuthHeadersStrippedWhenNativeAuthEnabled"])
        self.assertTrue(transport["explicitWebviewAuthPreserved"])
        self.assertTrue(transport["governedRouteAllowlistEnforced"])
        self.assertTrue(transport["packagedNoBundleBuildPassed"])
        self.assertFalse(transport["endpointHostRetained"])
        self.assertFalse(transport["tokenRetained"])
        self.assertIn(
            "rejects_http_runtime_targets_outside_governed_napoleon_paths",
            report["coveredRustTests"],
        )
        boundary = report["authorityBoundary"]
        self.assertTrue(boundary["validationEvidenceOnly"])
        self.assertTrue(boundary["doesNotContactNapoleon"])
        self.assertFalse(boundary["runtimeAuthorityGranted"])
        self.assertFalse(boundary["approvalCaptured"])
        self.assertFalse(boundary["memoryWritePerformed"])
        self.assertFalse(boundary["agentDispatchPerformed"])
        self.assertFalse(boundary["externalSendPerformed"])

    def test_report_fails_when_a_transport_check_fails(self):
        calls = []

        def runner(command, cwd):
            calls.append(list(command))
            return subprocess.CompletedProcess(command, 1 if len(calls) == 1 else 0, stdout="", stderr="")

        report = desktop_runtime_transport_validation.build_report(runner=runner, tauri_dir=Path("/tmp/tauri"))

        self.assertEqual(report["status"], "failed")
        self.assertEqual(report["checks"][0]["status"], "failed")
        self.assertEqual(report["checks"][1]["status"], "passed")
        self.assertEqual(report["checks"][2]["status"], "passed")
        self.assertEqual(report["checks"][3]["status"], "passed")
        self.assertTrue(report["packagedDesktopTransport"]["packagedNoBundleBuildPassed"])

    def test_main_writes_sanitized_report(self):
        def runner(command, cwd):
            return subprocess.CompletedProcess(command, 0, stdout="token_value", stderr="/tmp/token-file")

        original = desktop_runtime_transport_validation.run_command
        desktop_runtime_transport_validation.run_command = runner
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                out_path = Path(tmpdir) / "desktop-runtime.json"
                exit_code = desktop_runtime_transport_validation.main(["--out", str(out_path)])
                text = out_path.read_text(encoding="utf-8")
        finally:
            desktop_runtime_transport_validation.run_command = original

        self.assertEqual(exit_code, 0)
        self.assertNotIn("token_value", text)
        self.assertNotIn("/tmp/token-file", text)
        self.assertIn('"status": "passed"', text)


if __name__ == "__main__":
    unittest.main()
