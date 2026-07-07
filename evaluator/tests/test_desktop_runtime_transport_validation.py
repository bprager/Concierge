import subprocess
import tempfile
import unittest
from unittest import mock
import plistlib
from pathlib import Path

from scripts import desktop_runtime_transport_validation


class DesktopRuntimeTransportValidationTest(unittest.TestCase):
    def write_tauri_metadata(self, tauri_dir: Path):
        tauri_dir.mkdir(parents=True, exist_ok=True)
        (tauri_dir / "tauri.conf.json").write_text(
            '{"productName":"Concierge","identifier":"ws.prager.concierge"}',
            encoding="utf-8",
        )
        plist = {
            "CFBundleIdentifier": "ws.prager.concierge",
            "NSLocalNetworkUsageDescription": (
                "Concierge needs local network access to connect to your configured Napoleon runtime on this network."
            ),
        }
        with (tauri_dir / "Info.plist").open("wb") as handle:
            plistlib.dump(plist, handle)
        bundle_contents = (
            tauri_dir / "target" / "release" / "bundle" / "macos" / "Concierge.app" / "Contents"
        )
        bundle_contents.mkdir(parents=True, exist_ok=True)
        with (bundle_contents / "Info.plist").open("wb") as handle:
            plistlib.dump(plist, handle)

    def packaged_binary_probe_runner(self):
        probe_calls = []

        def runner(command, cwd):
            if str(command[0]).endswith("concierge-desktop") or command[0] == "open":
                probe_calls.append(list(command))
                stdout = (
                    '{"endpointConfigured":true,"authConfigured":true}'
                    if len(probe_calls) == 1
                    else '{"requestSucceeded":true,"statusOk":true}'
                    if len(probe_calls) == 2
                    else '{"descriptorOk":true,"capabilitiesOk":true,"textTurnOk":true,"traceOk":true,"sideEffectClaimed":false,"routeFamily":"cos","failureStage":"none","failureKind":"none"}'
                )
                return subprocess.CompletedProcess(command, 0, stdout=stdout, stderr="")
            return subprocess.CompletedProcess(command, 0, stdout="secret output", stderr="secret error")

        return runner

    def test_report_records_packaged_transport_without_secret_retention(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tauri_dir = Path(tmpdir) / "src-tauri"
            self.write_tauri_metadata(tauri_dir)
            runner = self.packaged_binary_probe_runner()
            report = desktop_runtime_transport_validation.build_report(
                runner=runner,
                tauri_dir=tauri_dir,
                live_probe_endpoint="https://napoleon.example/cos",
            )

        self.assertEqual(report["kind"], desktop_runtime_transport_validation.OUTPUT_KIND)
        self.assertEqual(report["status"], "passed")
        self.assertEqual(len(report["checks"]), 13)
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
        self.assertTrue(transport["macosLocalNetworkUsageDeclared"])
        self.assertTrue(transport["macosAppBundleBuilt"])
        self.assertTrue(transport["macosAppBundleIdentityBound"])
        self.assertTrue(transport["macosAppBundleLiveProbePassed"])
        self.assertTrue(transport["macosAppBundleLiveProbeDescriptorPassed"])
        self.assertEqual(transport["macosAppBundleLiveProbeFailureKind"], "none")
        self.assertTrue(transport["endpointHostOmittedFromInvokePayload"])
        self.assertTrue(transport["nativeLocalEndpointReadiness"])
        self.assertTrue(transport["packagedBinaryConfigProbePassed"])
        self.assertTrue(transport["packagedBinaryTransportProbePassed"])
        self.assertTrue(transport["packagedBinaryGeneratedLocalLiveProbePassed"])
        self.assertTrue(transport["packagedBinaryCosLocalLiveProbePassed"])
        self.assertTrue(transport["packagedBinaryLocalLiveProbePassed"])
        self.assertTrue(transport["packagedBinaryLiveProbeConfigured"])
        self.assertTrue(transport["packagedBinaryLiveProbePassed"])
        self.assertTrue(transport["packagedBinaryLiveProbeDescriptorPassed"])
        self.assertTrue(transport["packagedBinaryLiveProbeCapabilitiesPassed"])
        self.assertTrue(transport["packagedBinaryLiveProbeTextTurnPassed"])
        self.assertTrue(transport["packagedBinaryLiveProbeTracePassed"])
        self.assertFalse(transport["packagedBinaryLiveProbeSideEffectClaimed"])
        self.assertEqual(transport["packagedBinaryLiveProbeRouteFamily"], "cos")
        self.assertEqual(transport["packagedBinaryLiveProbeFailureStage"], "none")
        self.assertEqual(transport["packagedBinaryLiveProbeFailureKind"], "none")
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
            if str(command[0]).endswith("concierge-desktop") or command[0] == "open":
                binary_call_count = sum(
                    1
                    for call in calls
                    if str(call[0]).endswith("concierge-desktop") or call[0] == "open"
                )
                stdout = (
                    '{"endpointConfigured":true,"authConfigured":true}'
                    if binary_call_count == 1
                    else '{"requestSucceeded":true,"statusOk":true}'
                    if binary_call_count == 2
                    else '{"descriptorOk":true,"capabilitiesOk":true,"textTurnOk":true,"traceOk":true,"sideEffectClaimed":false,"routeFamily":"cos","failureStage":"none","failureKind":"none"}'
                )
                return subprocess.CompletedProcess(
                    command,
                    0,
                    stdout=stdout,
                    stderr="",
                )
            return subprocess.CompletedProcess(command, 1 if len(calls) == 1 else 0, stdout="", stderr="")

        with tempfile.TemporaryDirectory() as tmpdir:
            tauri_dir = Path(tmpdir) / "src-tauri"
            self.write_tauri_metadata(tauri_dir)
            report = desktop_runtime_transport_validation.build_report(
                runner=runner,
                tauri_dir=tauri_dir,
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
        self.assertEqual(report["checks"][7]["status"], "passed")
        self.assertEqual(report["checks"][8]["status"], "passed")
        self.assertEqual(report["checks"][9]["status"], "passed")
        self.assertEqual(report["checks"][10]["status"], "passed")
        self.assertEqual(report["checks"][11]["status"], "passed")
        self.assertEqual(report["checks"][12]["status"], "passed")
        self.assertTrue(report["packagedDesktopTransport"]["packagedNoBundleBuildPassed"])

    def test_generic_checks_do_not_inherit_live_runtime_auth_file(self):
        captured_envs = []

        def fake_run(command, **kwargs):
            captured_envs.append(kwargs.get("env", {}))
            return subprocess.CompletedProcess(command, 0, stdout="", stderr="")

        with mock.patch.dict(
            "os.environ",
            {
                "NAPOLEON_RUNTIME_ENDPOINT": "http://127.0.0.1:18765/cos",
                "NAPOLEON_RUNTIME_AUTH_TOKEN": "live_token",
                "NAPOLEON_RUNTIME_AUTH_TOKEN_FILE": "/tmp/live-token",
                "NAPOLEON_EVAL_TOKEN": "eval_token",
                "NAPOLEON_EVAL_TOKEN_FILE": "/tmp/eval-token",
                "UNRELATED_SETTING": "kept",
            },
            clear=False,
        ):
            with mock.patch.object(subprocess, "run", side_effect=fake_run):
                check = desktop_runtime_transport_validation.sanitized_check(
                    check_id="tauri_desktop_runtime_transport_tests",
                    description="Rust tests run without live runtime auth settings.",
                    command=["cargo", "test", "runtime"],
                    cwd=Path("."),
                    runner=desktop_runtime_transport_validation.DEFAULT_COMMAND_RUNNER,
                )

        self.assertEqual(check["status"], "passed")
        self.assertEqual(len(captured_envs), 1)
        scrubbed_env = captured_envs[0]
        self.assertNotIn("NAPOLEON_RUNTIME_ENDPOINT", scrubbed_env)
        self.assertNotIn("NAPOLEON_RUNTIME_AUTH_TOKEN", scrubbed_env)
        self.assertNotIn("NAPOLEON_RUNTIME_AUTH_TOKEN_FILE", scrubbed_env)
        self.assertNotIn("NAPOLEON_EVAL_TOKEN", scrubbed_env)
        self.assertNotIn("NAPOLEON_EVAL_TOKEN_FILE", scrubbed_env)
        self.assertEqual(scrubbed_env["UNRELATED_SETTING"], "kept")

    def test_report_requires_macos_local_network_usage_description(self):
        runner = self.packaged_binary_probe_runner()

        with tempfile.TemporaryDirectory() as tmpdir:
            tauri_dir = Path(tmpdir)
            (tauri_dir / "tauri.conf.json").write_text(
                '{"productName":"Concierge","identifier":"ws.prager.concierge"}',
                encoding="utf-8",
            )
            report = desktop_runtime_transport_validation.build_report(
                runner=runner,
                tauri_dir=tauri_dir,
                live_probe_endpoint="https://napoleon.example/cos",
            )

        self.assertEqual(report["status"], "failed")
        declaration_check = report["checks"][4]
        self.assertEqual(declaration_check["id"], "tauri_macos_local_network_usage_description")
        self.assertEqual(declaration_check["status"], "failed")
        self.assertFalse(report["packagedDesktopTransport"]["macosLocalNetworkUsageDeclared"])

    def test_report_requires_macos_app_bundle_identity_binding(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tauri_dir = Path(tmpdir) / "src-tauri"
            self.write_tauri_metadata(tauri_dir)
            bundle_info = (
                tauri_dir
                / "target"
                / "release"
                / "bundle"
                / "macos"
                / "Concierge.app"
                / "Contents"
                / "Info.plist"
            )
            with bundle_info.open("wb") as handle:
                plistlib.dump({"CFBundleIdentifier": "wrong.bundle"}, handle)

            report = desktop_runtime_transport_validation.build_report(
                runner=self.packaged_binary_probe_runner(),
                tauri_dir=tauri_dir,
                live_probe_endpoint="https://napoleon.example/cos",
            )

        self.assertEqual(report["status"], "failed")
        identity_check = report["checks"][6]
        self.assertEqual(identity_check["id"], "tauri_macos_app_bundle_identity")
        self.assertEqual(identity_check["status"], "failed")
        self.assertFalse(report["packagedDesktopTransport"]["macosAppBundleIdentityBound"])

    def test_failed_live_probe_retains_sanitized_failure_diagnostics(self):
        binary_calls = []

        def runner(command, cwd):
            if str(command[0]).endswith("concierge-desktop"):
                binary_calls.append(list(command))
                stdout = (
                    '{"endpointConfigured":true,"authConfigured":true}'
                    if len(binary_calls) == 1
                    else '{"requestSucceeded":true,"statusOk":true}'
                    if len(binary_calls) == 2
                    else '{"descriptorOk":false,"capabilitiesOk":false,"textTurnOk":false,"traceOk":false,"sideEffectClaimed":false,"routeFamily":"generated","failureStage":"descriptor","failureKind":"http_not_ok"}'
                )
                return subprocess.CompletedProcess(command, 0, stdout=stdout, stderr="")
            return subprocess.CompletedProcess(command, 0, stdout="", stderr="")

        with tempfile.TemporaryDirectory() as tmpdir:
            tauri_dir = Path(tmpdir) / "src-tauri"
            self.write_tauri_metadata(tauri_dir)
            report = desktop_runtime_transport_validation.build_report(
                runner=runner,
                tauri_dir=tauri_dir,
                live_probe_endpoint="https://napoleon.example/v1/concierge/turn",
            )

        self.assertEqual(report["status"], "failed")
        live_check = report["checks"][11]
        self.assertEqual(live_check["id"], "tauri_packaged_desktop_binary_live_probe")
        self.assertEqual(live_check["status"], "failed")
        self.assertEqual(live_check["routeFamily"], "generated")
        self.assertEqual(live_check["failureStage"], "descriptor")
        self.assertEqual(live_check["failureKind"], "http_not_ok")
        self.assertFalse(live_check["endpointHostRetained"])
        self.assertFalse(live_check["tokenRetained"])
        transport = report["packagedDesktopTransport"]
        self.assertEqual(transport["packagedBinaryLiveProbeRouteFamily"], "generated")
        self.assertEqual(transport["packagedBinaryLiveProbeFailureStage"], "descriptor")
        self.assertEqual(transport["packagedBinaryLiveProbeFailureKind"], "http_not_ok")

    def test_failed_app_bundle_live_probe_retains_sanitized_failure_diagnostics(self):
        probe_calls = []

        def runner(command, cwd):
            if str(command[0]).endswith("concierge-desktop") or command[0] == "open":
                probe_calls.append(list(command))
                stdout = (
                    '{"endpointConfigured":true,"authConfigured":true}'
                    if len(probe_calls) == 1
                    else '{"requestSucceeded":true,"statusOk":true}'
                    if len(probe_calls) == 2
                    else '{"descriptorOk":true,"capabilitiesOk":true,"textTurnOk":true,"traceOk":true,"sideEffectClaimed":false,"routeFamily":"cos","failureStage":"none","failureKind":"none"}'
                    if len(probe_calls) == 3
                    else '{"descriptorOk":false,"capabilitiesOk":false,"textTurnOk":false,"traceOk":false,"sideEffectClaimed":false,"routeFamily":"cos","failureStage":"descriptor","failureKind":"no_route_to_host"}'
                )
                return subprocess.CompletedProcess(command, 0, stdout=stdout, stderr="")
            return subprocess.CompletedProcess(command, 0, stdout="", stderr="")

        with tempfile.TemporaryDirectory() as tmpdir:
            tauri_dir = Path(tmpdir) / "src-tauri"
            self.write_tauri_metadata(tauri_dir)
            report = desktop_runtime_transport_validation.build_report(
                runner=runner,
                tauri_dir=tauri_dir,
                live_probe_endpoint="https://napoleon.example/cos",
            )

        self.assertEqual(report["status"], "failed")
        app_check = report["checks"][12]
        self.assertEqual(app_check["id"], "tauri_macos_app_bundle_live_probe")
        self.assertEqual(app_check["status"], "failed")
        self.assertEqual(app_check["routeFamily"], "cos")
        self.assertEqual(app_check["failureStage"], "descriptor")
        self.assertEqual(app_check["failureKind"], "no_route_to_host")
        self.assertFalse(app_check["endpointHostRetained"])
        self.assertFalse(app_check["tokenRetained"])
        transport = report["packagedDesktopTransport"]
        self.assertFalse(transport["macosAppBundleLiveProbePassed"])
        self.assertEqual(transport["macosAppBundleLiveProbeFailureKind"], "no_route_to_host")

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
        self.assertIn('"macosAppBundleLiveProbeConfigured": false', text)
        self.assertIn('"packagedBinaryLocalLiveProbePassed": true', text)
        self.assertIn('"status": "not_configured"', text)
        self.assertIn('"doesNotContactNapoleon": true', text)


if __name__ == "__main__":
    unittest.main()
