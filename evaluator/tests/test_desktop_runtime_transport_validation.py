import subprocess
import tempfile
import unittest
from pathlib import Path

from scripts import desktop_runtime_transport_validation


class DesktopRuntimeTransportValidationTest(unittest.TestCase):
    def packaged_binary_probe_runner(self):
        binary_calls = []

        def runner(command, cwd):
            if str(command[0]).endswith("concierge-desktop"):
                binary_calls.append(list(command))
                stdout = (
                    '{"endpointConfigured":true,"authConfigured":true}'
                    if len(binary_calls) == 1
                    else '{"requestSucceeded":true,"statusOk":true}'
                    if len(binary_calls) == 2
                    else '{"descriptorOk":true,"capabilitiesOk":true,"textTurnOk":true,"traceOk":true,"sideEffectClaimed":false}'
                )
                return subprocess.CompletedProcess(command, 0, stdout=stdout, stderr="")
            return subprocess.CompletedProcess(command, 0, stdout="secret output", stderr="secret error")

        return runner

    def test_report_records_packaged_transport_without_secret_retention(self):
        runner = self.packaged_binary_probe_runner()
        report = desktop_runtime_transport_validation.build_report(
            runner=runner,
            tauri_dir=Path("/tmp/tauri"),
            live_probe_endpoint="https://napoleon.example/cos",
        )

        self.assertEqual(report["kind"], desktop_runtime_transport_validation.OUTPUT_KIND)
        self.assertEqual(report["status"], "passed")
        self.assertEqual(len(report["checks"]), 7)
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
        self.assertTrue(transport["nativeAuthEnforcedAtCommandBoundary"])
        self.assertTrue(transport["nativeEndpointResolution"])
        self.assertTrue(transport["endpointHostOmittedFromInvokePayload"])
        self.assertTrue(transport["nativeLocalEndpointReadiness"])
        self.assertTrue(transport["packagedBinaryConfigProbePassed"])
        self.assertTrue(transport["packagedBinaryTransportProbePassed"])
        self.assertTrue(transport["packagedBinaryLiveProbeConfigured"])
        self.assertTrue(transport["packagedBinaryLiveProbePassed"])
        self.assertTrue(transport["packagedBinaryLiveProbeDescriptorPassed"])
        self.assertTrue(transport["packagedBinaryLiveProbeCapabilitiesPassed"])
        self.assertTrue(transport["packagedBinaryLiveProbeTextTurnPassed"])
        self.assertTrue(transport["packagedBinaryLiveProbeTracePassed"])
        self.assertFalse(transport["packagedBinaryLiveProbeSideEffectClaimed"])
        self.assertTrue(transport["explicitWebviewAuthPreserved"])
        self.assertTrue(transport["governedRouteAllowlistEnforced"])
        self.assertTrue(transport["governedRouteMethodAllowlistEnforced"])
        self.assertTrue(transport["packagedNoBundleBuildPassed"])
        self.assertFalse(transport["endpointHostRetained"])
        self.assertFalse(transport["tokenRetained"])
        self.assertIn(
            "rejects_http_runtime_targets_outside_governed_napoleon_paths",
            report["coveredRustTests"],
        )
        self.assertIn(
            "enforces_governed_runtime_methods_for_known_paths",
            report["coveredRustTests"],
        )
        self.assertIn(
            "desktop_runtime_command_strips_webview_auth_when_native_auth_is_enabled",
            report["coveredRustTests"],
        )
        self.assertIn(
            "desktop_runtime_command_resolves_path_against_local_runtime_endpoint",
            report["coveredRustTests"],
        )
        self.assertIn(
            "desktop_runtime_config_status_reports_only_sanitized_booleans",
            report["coveredRustTests"],
        )
        self.assertIn(
            "desktop_runtime_config_status_probe_outputs_only_sanitized_booleans",
            report["coveredRustTests"],
        )
        self.assertIn(
            "desktop_runtime_transport_probe_outputs_only_sanitized_booleans",
            report["coveredRustTests"],
        )
        self.assertIn(
            "desktop_runtime_transport_probe_uses_native_endpoint_and_auth",
            report["coveredRustTests"],
        )
        self.assertIn(
            "desktop_runtime_live_probe_outputs_only_sanitized_booleans",
            report["coveredRustTests"],
        )
        self.assertIn(
            "desktop_runtime_live_probe_uses_governed_native_sequence",
            report["coveredRustTests"],
        )
        self.assertIn(
            "desktop_runtime_live_probe_uses_generated_governed_sequence",
            report["coveredRustTests"],
        )
        boundary = report["authorityBoundary"]
        self.assertTrue(boundary["validationEvidenceOnly"])
        self.assertFalse(boundary["doesNotContactNapoleon"])
        self.assertFalse(boundary["runtimeAuthorityGranted"])
        self.assertFalse(boundary["approvalCaptured"])
        self.assertFalse(boundary["memoryWritePerformed"])
        self.assertFalse(boundary["agentDispatchPerformed"])
        self.assertFalse(boundary["externalSendPerformed"])

    def test_report_fails_when_a_transport_check_fails(self):
        calls = []

        def runner(command, cwd):
            calls.append(list(command))
            if str(command[0]).endswith("concierge-desktop"):
                binary_call_count = sum(1 for call in calls if str(call[0]).endswith("concierge-desktop"))
                stdout = (
                    '{"endpointConfigured":true,"authConfigured":true}'
                    if binary_call_count == 1
                    else '{"requestSucceeded":true,"statusOk":true}'
                    if binary_call_count == 2
                    else '{"descriptorOk":true,"capabilitiesOk":true,"textTurnOk":true,"traceOk":true,"sideEffectClaimed":false}'
                )
                return subprocess.CompletedProcess(
                    command,
                    0,
                    stdout=stdout,
                    stderr="",
                )
            return subprocess.CompletedProcess(command, 1 if len(calls) == 1 else 0, stdout="", stderr="")

        report = desktop_runtime_transport_validation.build_report(
            runner=runner,
            tauri_dir=Path("/tmp/tauri"),
            live_probe_endpoint="https://napoleon.example/cos",
        )

        self.assertEqual(report["status"], "failed")
        self.assertEqual(report["checks"][0]["status"], "failed")
        self.assertEqual(report["checks"][1]["status"], "passed")
        self.assertEqual(report["checks"][2]["status"], "passed")
        self.assertEqual(report["checks"][3]["status"], "passed")
        self.assertEqual(report["checks"][4]["status"], "passed")
        self.assertEqual(report["checks"][5]["status"], "passed")
        self.assertEqual(report["checks"][6]["status"], "passed")
        self.assertTrue(report["packagedDesktopTransport"]["packagedNoBundleBuildPassed"])

    def test_main_writes_sanitized_report(self):
        runner = self.packaged_binary_probe_runner()

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
        self.assertIn('"packagedBinaryLiveProbeConfigured": false', text)
        self.assertIn('"status": "not_configured"', text)
        self.assertIn('"doesNotContactNapoleon": true', text)


if __name__ == "__main__":
    unittest.main()
