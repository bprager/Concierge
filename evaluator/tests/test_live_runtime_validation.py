import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from evaluator.tests.test_bridge_evidence_capture import RecordingCosHarness
from scripts import desktop_runtime_transport_validation, live_runtime_validation, local_bridge_harness


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
                capabilities = json.loads((Path(tmpdir) / "capability_discovery.json").read_text(encoding="utf-8"))
                packets = json.loads((Path(tmpdir) / "contract_packet_submissions.json").read_text(encoding="utf-8"))
                report = json.loads((Path(tmpdir) / "eval_http.json").read_text(encoding="utf-8"))
                review = (Path(tmpdir) / "promotion_review.md").read_text(encoding="utf-8")

        self.assertEqual(exit_code, 0)
        self.assertEqual(summary["bridgeEvidence"]["status"], "passed")
        self.assertEqual(summary["bridgeEvidence"]["record_count"], 1)
        self.assertEqual(summary["capabilityDiscovery"]["status"], "passed")
        self.assertEqual(summary["capabilityDiscovery"]["targetPath"], "/v1/concierge/chief-of-staff/capabilities")
        self.assertEqual(summary["capabilityDiscovery"]["operationId"], "chief_of_staff_capabilities")
        self.assertEqual(summary["capabilityDiscovery"]["capabilityCount"], 2)
        self.assertFalse(summary["capabilityDiscovery"]["endpointHostRetained"])
        self.assertFalse(summary["capabilityDiscovery"]["tokenRetained"])
        self.assertFalse(summary["capabilityDiscovery"]["responseBodyRetained"])
        self.assertFalse(summary["capabilityDiscovery"]["approvalCaptured"])
        self.assertFalse(summary["capabilityDiscovery"]["memoryWritePerformed"])
        self.assertFalse(summary["capabilityDiscovery"]["agentDispatchPerformed"])
        self.assertFalse(summary["capabilityDiscovery"]["externalSendPerformed"])
        self.assertEqual(summary["contractPacketSubmissions"]["status"], "passed")
        self.assertEqual(summary["contractPacketSubmissions"]["submissionCount"], 2)
        packet_paths = {record["targetPath"] for record in summary["contractPacketSubmissions"]["submissions"]}
        self.assertEqual(packet_paths, {"/chief-of-staff/requests", "/governance/evaluate"})
        for record in summary["contractPacketSubmissions"]["submissions"]:
            self.assertEqual(record["status"], "passed")
            self.assertEqual(record["governanceOutcome"], "requires_review")
            self.assertTrue(record["governanceDecisionObserved"])
            self.assertTrue(record["traceEnvelopeObserved"])
            self.assertTrue(record["auditEnvelopeObserved"])
            self.assertFalse(record["endpointHostRetained"])
            self.assertFalse(record["tokenRetained"])
            self.assertFalse(record["requestBodyRetained"])
            self.assertFalse(record["responseBodyRetained"])
            self.assertFalse(record["approvalCaptured"])
            self.assertFalse(record["memoryWritePerformed"])
            self.assertFalse(record["agentDispatchPerformed"])
            self.assertFalse(record["externalSendPerformed"])
            self.assertFalse(record["routingPerformed"])
            self.assertFalse(record["registryUpdatePerformed"])
            self.assertFalse(record["traceAppendPerformed"])
            self.assertFalse(record["appliedLocally"])
        self.assertEqual(summary["httpEvaluator"]["status"], "passed")
        self.assertTrue(summary["httpEvaluator"]["sanitized"])
        self.assertEqual(summary["httpEvaluator"]["targetPath"], "/v1/concierge/evaluate")
        self.assertEqual(summary["httpEvaluator"]["targetRequestKind"], "evaluator_prompt")
        self.assertEqual(summary["httpEvaluator"]["targetOperationId"], "evaluate")
        self.assertFalse(summary["httpEvaluator"]["endpointHostRetained"])
        self.assertFalse(summary["httpEvaluator"]["tokenRetained"])
        self.assertFalse(summary["httpEvaluator"]["approvalCaptured"])
        self.assertFalse(summary["httpEvaluator"]["memoryWritePerformed"])
        self.assertFalse(summary["httpEvaluator"]["agentDispatchPerformed"])
        self.assertFalse(summary["httpEvaluator"]["externalSendPerformed"])
        self.assertEqual(summary["runtimeValidation"]["source"], "local_harness")
        self.assertIn("not real Napoleon runtime validation", summary["runtimeValidation"]["caveat"])
        self.assertEqual(summary["artifactPrivacy"]["status"], "passed")
        self.assertEqual(summary["artifactPrivacy"]["violation_count"], 0)
        self.assertEqual(summary["artifactPrivacy"]["checked_count"], 4)
        self.assertEqual(capabilities["kind"], "chief_of_staff_capability_discovery_evidence")
        self.assertEqual(capabilities["targetPath"], "/v1/concierge/chief-of-staff/capabilities")
        self.assertEqual(capabilities["operationId"], "chief_of_staff_capabilities")
        self.assertEqual(capabilities["capabilityCount"], 2)
        self.assertIn("napoleon.capability.governed_text_turn", capabilities["capabilityIds"])
        self.assertFalse(capabilities["runtimeAuthority"])
        self.assertFalse(capabilities["approvalCaptured"])
        self.assertFalse(capabilities["memoryWritePerformed"])
        self.assertFalse(capabilities["agentDispatchPerformed"])
        self.assertFalse(capabilities["externalSendPerformed"])
        self.assertEqual(packets["kind"], "governed_contract_packet_submission_evidence")
        self.assertEqual(packets["status"], "passed")
        self.assertEqual(packets["submissionCount"], 2)
        self.assertNotIn(base_url, json.dumps(packets))
        self.assertEqual(report["score_total"], 100.0)
        self.assertNotIn("response_excerpt", json.dumps(report))
        self.assertNotIn("PRD: Concierge", json.dumps(report))
        self.assertGreater(report["live_runtime_sanitization"]["responseExcerptsRemoved"], 0)
        self.assertEqual(evidence[0]["targetPath"], "/v1/concierge/turn")
        self.assertEqual(evidence[0]["runtimeValidationSource"], "local_harness")
        self.assertIn("not Napoleon approval", summary["boundary"])
        self.assertFalse(summary["promotionBoundary"]["approvalCaptured"])
        self.assertFalse(summary["promotionBoundary"]["memoryWritePerformed"])
        self.assertEqual(summary["promotionReview"]["status"], "drafted")
        self.assertEqual(summary["promotionReview"]["path"], str(Path(tmpdir) / "promotion_review.md"))
        self.assertFalse(summary["promotionReadiness"]["locallySafeToConsider"])
        self.assertEqual(summary["promotionReadiness"]["gate"], "blocked_until_real_runtime_evidence_passes")
        self.assertIn("Evidence source is not real Napoleon runtime.", summary["promotionReadiness"]["blockingReasons"])
        self.assertIn("Live Runtime Promotion Review Record", review)
        self.assertIn("Local harness validation is not real Napoleon runtime validation.", review)
        self.assertIn("not Napoleon approval", review)
        self.assertIn("- HTTP evaluator target path: `/v1/concierge/evaluate`", review)
        self.assertIn("- Capability discovery status: `passed`", review)
        self.assertIn("- Capability discovery target path: `/v1/concierge/chief-of-staff/capabilities`", review)
        self.assertIn("- Contract packet submission status: `passed`", review)
        self.assertIn("- Contract packet submission count: `2`", review)
        self.assertIn("- HTTP evaluator request kind: `evaluator_prompt`", review)
        self.assertIn("- HTTP evaluator operation ID: `evaluate`", review)
        self.assertIn("Artifact privacy audit passed.", review)
        self.assertIn("- Promotion gate: `blocked_until_real_runtime_evidence_passes`", review)
        self.assertIn("- Blocking reasons: Evidence source is not real Napoleon runtime.", review)
        self.assertFalse(base_url in json.dumps(summary))
        self.assertFalse(base_url in review)
        self.assertIn("runtime_validation_source", stdout.getvalue())
        self.assertIn("bridge_status", stdout.getvalue())
        self.assertIn("contract_packet_status", stdout.getvalue())
        self.assertIn("artifact_privacy_status", stdout.getvalue())

    def test_summary_reports_sanitized_cos_bridge_operation_metadata(self):
        with RecordingCosHarness(
            descriptor_ready=True,
            supported_handoffs=[
                "text_turn",
                "evaluation_review",
                "chief_of_staff_request",
                "governance_evaluation",
            ],
        ) as cos_harness:
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
        self.assertEqual(cos_harness.get_paths, [
            "/cos/descriptor",
            "/cos/trace/trace_bridge_evidence_capture",
            "/cos/capabilities",
            "/cos/descriptor",
        ])
        self.assertEqual(cos_harness.last_post_path, "/governance/evaluate")
        self.assertEqual(evidence[0]["targetPath"], "/cos/text-turn")
        self.assertTrue(evidence[0]["traceEnvelopeObserved"])
        self.assertTrue(evidence[0]["traceEnvelopeMatched"])
        self.assertEqual(evidence[0]["traceTargetPath"], "/cos/trace/{trace_id}")
        self.assertEqual(summary["bridgeEvidence"]["lastTargetPath"], "/cos/text-turn")
        self.assertTrue(summary["bridgeEvidence"]["traceEnvelopeObserved"])
        self.assertTrue(summary["bridgeEvidence"]["traceEnvelopeMatched"])
        self.assertEqual(summary["bridgeEvidence"]["traceTargetPath"], "/cos/trace/{trace_id}")
        self.assertEqual(summary["bridgeEvidence"]["lastOperationId"], "text_turn")
        self.assertEqual(summary["bridgeEvidence"]["lastRequestKind"], "text_turn")
        self.assertEqual(summary["bridgeEvidence"]["lastTransport"], "http_post")
        self.assertEqual(summary["bridgeEvidence"]["lastRuntimeValidationSource"], "local_harness")
        self.assertEqual(summary["bridgeEvidence"]["lastEvidenceStatus"], "success")
        self.assertEqual(summary["bridgeEvidence"]["status"], "passed")
        self.assertEqual(summary["capabilityDiscovery"]["status"], "passed")
        self.assertEqual(summary["capabilityDiscovery"]["targetPath"], "/cos/capabilities")
        self.assertEqual(summary["capabilityDiscovery"]["operationId"], "chief_of_staff_capabilities")
        self.assertEqual(summary["capabilityDiscovery"]["capabilityCount"], 1)
        self.assertEqual(summary["capabilityDiscovery"]["capabilityIds"], ["napoleon.capability.governed_text_turn"])
        self.assertEqual(summary["contractPacketSubmissions"]["status"], "passed")
        self.assertEqual(summary["contractPacketSubmissions"]["submissionCount"], 2)
        self.assertFalse(summary["capabilityDiscovery"]["endpointHostRetained"])
        self.assertFalse(summary["capabilityDiscovery"]["tokenRetained"])
        self.assertFalse(summary["capabilityDiscovery"]["responseBodyRetained"])
        self.assertFalse(summary["capabilityDiscovery"]["approvalCaptured"])
        self.assertFalse(summary["capabilityDiscovery"]["memoryWritePerformed"])
        self.assertFalse(summary["capabilityDiscovery"]["agentDispatchPerformed"])
        self.assertFalse(summary["capabilityDiscovery"]["externalSendPerformed"])
        self.assertEqual(summary["httpEvaluator"]["status"], "passed")
        self.assertEqual(summary["artifactPrivacy"]["status"], "passed")
        self.assertNotIn(cos_harness.base_url, summary_json)
        self.assertNotIn(eval_base_url, summary_json)
        self.assertNotIn("token_cos_summary", summary_json)
        self.assertIn("bridge_status", stdout.getvalue())

    def test_main_reads_auth_token_from_environment_file_without_retaining_it(self):
        with RecordingCosHarness(
            descriptor_ready=True,
            supported_handoffs=[
                "text_turn",
                "evaluation_review",
                "chief_of_staff_request",
                "governance_evaluation",
            ],
        ) as cos_harness:
            with local_bridge_harness.running_harness() as eval_base_url:
                with tempfile.NamedTemporaryFile("w", suffix=".token") as token_file:
                    token_file.write("token_from_file\n")
                    token_file.flush()
                    with tempfile.TemporaryDirectory() as tmpdir:
                        exit_code = live_runtime_validation.main(
                            [
                                "--bridge-endpoint",
                                f"{cos_harness.base_url}/cos/text-turn",
                                "--eval-endpoint",
                                f"{eval_base_url}/v1/concierge/evaluate",
                                "--out-dir",
                                tmpdir,
                                "--runtime-validation-source",
                                "local_harness",
                            ],
                            env={"NAPOLEON_EVAL_TOKEN_FILE": token_file.name},
                        )

                        summary = json.loads((Path(tmpdir) / "summary.json").read_text(encoding="utf-8"))
                        evidence = json.loads((Path(tmpdir) / "bridge_evidence.json").read_text(encoding="utf-8"))

        summary_json = json.dumps(summary)
        self.assertEqual(exit_code, 0)
        self.assertEqual(cos_harness.last_auth_header, "token_from_file")
        self.assertEqual(evidence[0]["targetPath"], "/cos/text-turn")
        self.assertEqual(summary["runtimeValidation"]["authProvisioning"]["source"], "token_file")
        self.assertTrue(summary["runtimeValidation"]["authProvisioning"]["tokenConfigured"])
        self.assertTrue(summary["runtimeValidation"]["authProvisioning"]["tokenFileConfigured"])
        self.assertTrue(summary["runtimeValidation"]["authProvisioning"]["tokenFileExists"])
        self.assertTrue(summary["runtimeValidation"]["authProvisioning"]["tokenFileReadable"])
        self.assertFalse(summary["runtimeValidation"]["authProvisioning"]["tokenRetained"])
        self.assertFalse(summary["runtimeValidation"]["authProvisioning"]["tokenFilePathRetained"])
        self.assertFalse(summary["capabilityDiscovery"]["tokenRetained"])
        self.assertFalse(summary["httpEvaluator"]["tokenRetained"])
        self.assertFalse("token_from_file" in summary_json)
        self.assertFalse(token_file.name in summary_json)

    def test_main_carries_packaged_desktop_transport_evidence_into_summary(self):
        with RecordingCosHarness(
            descriptor_ready=True,
            supported_handoffs=[
                "text_turn",
                "evaluation_review",
                "chief_of_staff_request",
                "governance_evaluation",
            ],
        ) as cos_harness:
            with local_bridge_harness.running_harness() as eval_base_url:
                with tempfile.TemporaryDirectory() as tmpdir:
                    report_path = Path(tmpdir) / "desktop-runtime.json"
                    binary_calls = []

                    def runner(command, cwd):
                        if str(command[0]).endswith("concierge-desktop"):
                            binary_calls.append(list(command))
                            stdout = (
                                '{"endpointConfigured":true,"authConfigured":true}'
                                if len(binary_calls) == 1
                                else '{"requestSucceeded":true,"statusOk":true}'
                                if len(binary_calls) == 2
                                else '{"descriptorOk":true,"capabilitiesOk":true,"textTurnOk":true,"traceOk":true,"sideEffectClaimed":false,"routeFamily":"cos","failureStage":"none","failureKind":"none"}'
                            )
                            return mock.Mock(returncode=0, stdout=stdout, stderr="")
                        if command[0] == "open":
                            return mock.Mock(
                                returncode=0,
                                stdout='{"descriptorOk":true,"capabilitiesOk":true,"textTurnOk":true,"traceOk":true,"sideEffectClaimed":false,"routeFamily":"cos","failureStage":"none","failureKind":"none"}',
                                stderr="",
                            )
                        return mock.Mock(returncode=0, stdout="", stderr="")

                    report = desktop_runtime_transport_validation.build_report(
                        runner=runner,
                        live_probe_endpoint=f"{cos_harness.base_url}/cos/text-turn",
                    )
                    desktop_runtime_transport_validation.write_report(report, report_path)
                    exit_code = live_runtime_validation.main([
                        "--bridge-endpoint", f"{cos_harness.base_url}/cos/text-turn",
                        "--eval-endpoint", f"{eval_base_url}/v1/concierge/evaluate",
                        "--out-dir", tmpdir,
                        "--auth-token", "token_packaged_desktop_summary",
                        "--runtime-validation-source", "local_harness",
                        "--desktop-runtime-transport-report", str(report_path),
                        "--require-packaged-desktop-transport",
                    ])

                    summary = json.loads((Path(tmpdir) / "summary.json").read_text(encoding="utf-8"))
                    review = (Path(tmpdir) / "promotion_review.md").read_text(encoding="utf-8")

        self.assertEqual(exit_code, 0)
        packaged = summary["packagedDesktopTransport"]
        self.assertEqual(packaged["status"], "passed")
        self.assertTrue(packaged["required"])
        self.assertTrue(packaged["usesTauriCommandPath"])
        self.assertFalse(packaged["browserProxyRequired"])
        self.assertTrue(packaged["governedRouteAllowlistEnforced"])
        self.assertTrue(packaged["governedRouteMethodAllowlistEnforced"])
        self.assertTrue(packaged["nativeAuthEnforcedAtCommandBoundary"])
        self.assertTrue(packaged["nativeEndpointResolution"])
        self.assertTrue(packaged["endpointHostOmittedFromInvokePayload"])
        self.assertTrue(packaged["nativeLocalEndpointReadiness"])
        self.assertTrue(packaged["packagedBinaryConfigProbePassed"])
        self.assertTrue(packaged["packagedBinaryTransportProbePassed"])
        self.assertTrue(packaged["packagedBinaryGeneratedLocalLiveProbePassed"])
        self.assertTrue(packaged["packagedBinaryCosLocalLiveProbePassed"])
        self.assertTrue(packaged["packagedBinaryLocalLiveProbePassed"])
        self.assertTrue(packaged["packagedBinaryLiveProbeConfigured"])
        self.assertTrue(packaged["packagedBinaryLiveProbePassed"])
        self.assertTrue(packaged["packagedBinaryLiveProbeDescriptorPassed"])
        self.assertTrue(packaged["packagedBinaryLiveProbeCapabilitiesPassed"])
        self.assertTrue(packaged["packagedBinaryLiveProbeTextTurnPassed"])
        self.assertTrue(packaged["packagedBinaryLiveProbeTracePassed"])
        self.assertFalse(packaged["packagedBinaryLiveProbeSideEffectClaimed"])
        self.assertEqual(packaged["packagedBinaryLiveProbeRouteFamily"], "cos")
        self.assertEqual(packaged["packagedBinaryLiveProbeFailureStage"], "none")
        self.assertEqual(packaged["packagedBinaryLiveProbeFailureKind"], "none")
        self.assertTrue(packaged["macosAppBundleLiveProbeConfigured"])
        self.assertTrue(packaged["macosAppBundleLiveProbePassed"])
        self.assertTrue(packaged["macosAppBundleLiveProbeDescriptorPassed"])
        self.assertTrue(packaged["macosAppBundleLiveProbeCapabilitiesPassed"])
        self.assertTrue(packaged["macosAppBundleLiveProbeTextTurnPassed"])
        self.assertTrue(packaged["macosAppBundleLiveProbeTracePassed"])
        self.assertFalse(packaged["macosAppBundleLiveProbeSideEffectClaimed"])
        self.assertEqual(packaged["macosAppBundleLiveProbeRouteFamily"], "cos")
        self.assertEqual(packaged["macosAppBundleLiveProbeFailureStage"], "none")
        self.assertEqual(packaged["macosAppBundleLiveProbeFailureKind"], "none")
        self.assertTrue(packaged["packagedNoBundleBuildPassed"])
        self.assertFalse(packaged["endpointHostRetained"])
        self.assertFalse(packaged["tokenRetained"])
        self.assertFalse(packaged["requestBodyRetained"])
        self.assertFalse(packaged["doesNotContactNapoleon"])
        self.assertFalse(packaged["responseBodyRetained"])
        self.assertFalse(packaged["approvalCaptured"])
        self.assertFalse(packaged["memoryWritePerformed"])
        self.assertFalse(packaged["agentDispatchPerformed"])
        self.assertFalse(packaged["externalSendPerformed"])
        self.assertNotIn("Packaged desktop transport evidence did not pass.", summary["promotionReadiness"]["blockingReasons"])
        self.assertIn("- Packaged desktop transport required: `true`", review)
        self.assertIn("- Packaged desktop transport status: `passed`", review)
        self.assertIn("- Packaged desktop binary config probe passed: `true`", review)
        self.assertIn("- Packaged desktop binary generated local live probe passed: `true`", review)
        self.assertIn("- Packaged desktop binary cos local live probe passed: `true`", review)
        self.assertIn("- Packaged desktop binary transport probe passed: `true`", review)
        self.assertIn("- Packaged desktop binary live probe configured: `true`", review)
        self.assertIn("- Packaged desktop binary live probe passed: `true`", review)
        self.assertIn("- Packaged desktop binary live probe route family: `cos`", review)
        self.assertIn("- Packaged desktop binary live probe failure stage: `none`", review)
        self.assertIn("- Packaged desktop binary live probe failure kind: `none`", review)
        self.assertIn("- Packaged desktop app-bundle live probe configured: `true`", review)
        self.assertIn("- Packaged desktop app-bundle live probe passed: `true`", review)
        self.assertIn("- Packaged desktop app-bundle live probe route family: `cos`", review)
        self.assertIn("- Packaged desktop app-bundle live probe failure stage: `none`", review)
        self.assertIn("- Packaged desktop app-bundle live probe failure kind: `none`", review)
        self.assertNotIn("token_packaged_desktop_summary", json.dumps(summary))

    def test_required_packaged_desktop_transport_blocks_readiness_when_report_is_missing(self):
        with RecordingCosHarness(
            descriptor_ready=True,
            supported_handoffs=[
                "text_turn",
                "evaluation_review",
                "chief_of_staff_request",
                "governance_evaluation",
            ],
        ) as cos_harness:
            with local_bridge_harness.running_harness() as eval_base_url:
                with tempfile.TemporaryDirectory() as tmpdir:
                    exit_code = live_runtime_validation.main([
                        "--bridge-endpoint", f"{cos_harness.base_url}/cos/text-turn",
                        "--eval-endpoint", f"{eval_base_url}/v1/concierge/evaluate",
                        "--out-dir", tmpdir,
                        "--auth-token", "token_missing_packaged_desktop",
                        "--runtime-validation-source", "real_runtime",
                        "--require-packaged-desktop-transport",
                    ])

                    summary = json.loads((Path(tmpdir) / "summary.json").read_text(encoding="utf-8"))

        self.assertEqual(exit_code, 1)
        self.assertEqual(summary["packagedDesktopTransport"]["status"], "missing")
        self.assertTrue(summary["packagedDesktopTransport"]["required"])
        self.assertIn(
            "Packaged desktop transport evidence did not pass.",
            summary["promotionReadiness"]["blockingReasons"],
        )
        self.assertNotIn("token_missing_packaged_desktop", json.dumps(summary))

    def test_main_blocks_when_contract_packet_handoffs_are_not_advertised(self):
        with RecordingCosHarness(descriptor_ready=True, supported_handoffs=["text_turn", "evaluation_review"]) as cos_harness:
            with local_bridge_harness.running_harness() as eval_base_url:
                with tempfile.TemporaryDirectory() as tmpdir:
                    stderr = io.StringIO()
                    with contextlib.redirect_stderr(stderr):
                        exit_code = live_runtime_validation.main([
                            "--bridge-endpoint", f"{cos_harness.base_url}/cos/text-turn",
                            "--eval-endpoint", f"{eval_base_url}/v1/concierge/evaluate",
                            "--out-dir", tmpdir,
                            "--auth-token", "token_missing_packet_handoff",
                            "--runtime-validation-source", "real_runtime",
                        ])

                    summary = json.loads((Path(tmpdir) / "summary.json").read_text(encoding="utf-8"))
                    packets = json.loads((Path(tmpdir) / "contract_packet_submissions.json").read_text(encoding="utf-8"))
                    review = (Path(tmpdir) / "promotion_review.md").read_text(encoding="utf-8")

        summary_json = json.dumps(summary)
        self.assertEqual(exit_code, 1)
        self.assertEqual(summary["bridgeEvidence"]["status"], "passed")
        self.assertEqual(summary["capabilityDiscovery"]["status"], "passed")
        self.assertEqual(summary["contractPacketSubmissions"]["status"], "failed")
        self.assertEqual(
            summary["contractPacketSubmissions"]["failureReason"],
            "contract_packet_handoff_not_advertised",
        )
        self.assertEqual(summary["contractPacketSubmissions"]["submissionCount"], 0)
        self.assertEqual(packets["status"], "failed")
        self.assertEqual(packets["failureReason"], "contract_packet_handoff_not_advertised")
        self.assertEqual(len(packets["napoleonRequiredActions"]), 2)
        packet_action_ids = {action["id"] for action in packets["napoleonRequiredActions"]}
        self.assertEqual(
            packet_action_ids,
            {
                "advertise_chief_of_staff_request_handoff",
                "advertise_governance_evaluation_handoff",
            },
        )
        self.assertEqual(summary["contractPacketSubmissions"]["napoleonRequiredActions"], packets["napoleonRequiredActions"])
        self.assertEqual(summary["napoleonRequiredActions"], packets["napoleonRequiredActions"])
        for action in summary["napoleonRequiredActions"]:
            self.assertEqual(action["owner"], "napoleon")
            self.assertEqual(action["reason"], "real_runtime_promotion_blocker")
            self.assertIn(action["handoffName"], {"chief_of_staff_request", "governance_evaluation"})
            self.assertIn(action["targetPath"], {"/chief-of-staff/requests", "/governance/evaluate"})
            self.assertIn(action["requestKind"], {"chief_of_staff_request_handoff", "governance_evaluation_handoff"})
            self.assertIn(action["operationId"], {"chief_of_staff_request", "governance_evaluation"})
            self.assertIn("supportedHandoffs", action["advertiseUsing"])
            self.assertFalse(action["sideEffectsPerformed"])
            self.assertFalse(action["approvalCaptured"])
            self.assertFalse(action["memoryWritePerformed"])
            self.assertFalse(action["agentDispatchPerformed"])
            self.assertFalse(action["externalSendPerformed"])
            self.assertFalse(action["appliedLocally"])
        self.assertFalse(packets["endpointHostRetained"])
        self.assertFalse(packets["tokenRetained"])
        self.assertFalse(packets["requestBodyRetained"])
        self.assertFalse(packets["responseBodyRetained"])
        self.assertNotIn(cos_harness.base_url, summary_json)
        self.assertNotIn(eval_base_url, summary_json)
        self.assertNotIn("token_missing_packet_handoff", summary_json)
        self.assertIn(
            "Governed contract packet submission validation did not pass.",
            summary["promotionReadiness"]["blockingReasons"],
        )
        self.assertIn("- Contract packet submission status: `failed`", review)
        self.assertIn("Contract packet submission validation failed closed", stderr.getvalue())

    def test_capability_discovery_evidence_fails_when_response_claims_side_effects(self):
        evidence = live_runtime_validation.sanitized_capability_discovery_evidence(
            200,
            {
                "serviceId": "napoleon.chief_of_staff",
                "capabilities": [
                    {
                        "id": "napoleon.capability.memory_update",
                        "label": "Memory update",
                        "description": "Unsafe runtime claim.",
                        "authorityTier": "prepare_only",
                        "proposalOnly": True,
                    },
                ],
                "runtimeAuthority": False,
                "approvalCaptured": True,
                "memoryWritePerformed": True,
                "agentDispatchPerformed": True,
                "externalSendPerformed": True,
                "blockedEffects": ["memory_write", "approval_capture"],
            },
            "https://napoleon.example/concierge",
            "real_runtime",
        )

        self.assertEqual(evidence["status"], "failed")
        self.assertTrue(evidence["responseApprovalCaptured"])
        self.assertTrue(evidence["responseMemoryWritePerformed"])
        self.assertTrue(evidence["responseAgentDispatchPerformed"])
        self.assertTrue(evidence["responseExternalSendPerformed"])
        self.assertFalse(evidence["approvalCaptured"])
        self.assertFalse(evidence["memoryWritePerformed"])
        self.assertFalse(evidence["agentDispatchPerformed"])
        self.assertFalse(evidence["externalSendPerformed"])

    def test_main_fails_when_capability_discovery_fails_even_if_http_eval_passes(self):
        with local_bridge_harness.running_harness() as base_url:
            with tempfile.TemporaryDirectory() as tmpdir:
                capability_path = Path(tmpdir) / "capability_discovery.json"

                def write_failed_capability_discovery(*args):
                    capability_path.write_text(
                        json.dumps({
                            "kind": "chief_of_staff_capability_discovery_evidence",
                            "status": "failed",
                            "failureReason": "unsafe_capability_claim",
                            "targetPath": "/v1/concierge/chief-of-staff/capabilities",
                            "operationId": "chief_of_staff_capabilities",
                            "requestKind": "chief_of_staff_capabilities",
                            "runtimeValidationSource": "local_harness",
                            "capabilityCount": 0,
                            "capabilityIds": [],
                            "authorityTierCounts": {},
                            "runtimeAuthority": False,
                            "blockedEffects": [],
                            "endpointHostRetained": False,
                            "tokenRetained": False,
                            "responseBodyRetained": False,
                            "approvalCaptured": False,
                            "memoryWritePerformed": False,
                            "agentDispatchPerformed": False,
                            "externalSendPerformed": False,
                        }),
                        encoding="utf-8",
                    )
                    return 1, "unsafe_capability_claim"

                stdout = io.StringIO()
                with mock.patch.object(
                    live_runtime_validation,
                    "run_capability_discovery",
                    side_effect=write_failed_capability_discovery,
                ):
                    with contextlib.redirect_stdout(stdout):
                        exit_code = live_runtime_validation.main([
                            "--bridge-endpoint", base_url,
                            "--out-dir", tmpdir,
                            "--runtime-validation-source", "local_harness",
                        ])

                summary = json.loads((Path(tmpdir) / "summary.json").read_text(encoding="utf-8"))

        self.assertEqual(exit_code, 1)
        self.assertEqual(summary["bridgeEvidence"]["status"], "passed")
        self.assertEqual(summary["capabilityDiscovery"]["status"], "failed")
        self.assertEqual(summary["capabilityDiscovery"]["failureReason"], "unsafe_capability_claim")
        self.assertEqual(summary["httpEvaluator"]["status"], "passed")
        self.assertEqual(summary["artifactPrivacy"]["status"], "passed")
        self.assertIn(
            "Descriptor-gated capability discovery did not pass.",
            summary["promotionReadiness"]["blockingReasons"],
        )

    def test_main_records_sanitized_missing_evaluator_route_metadata(self):
        class MissingRouteResponse:
            status_code = 404

        class MissingRouteError(Exception):
            response = MissingRouteResponse()

        with RecordingCosHarness(descriptor_ready=True, supported_handoffs=["text_turn", "evaluation_review"]) as cos_harness:
            with tempfile.TemporaryDirectory() as tmpdir:
                stdout = io.StringIO()
                stderr = io.StringIO()
                with mock.patch.object(
                    live_runtime_validation,
                    "run_http_eval",
                    side_effect=MissingRouteError("not found at http://127.0.0.1:9999/secret"),
                ):
                    with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                        exit_code = live_runtime_validation.main([
                            "--bridge-endpoint", f"{cos_harness.base_url}/cos/text-turn",
                            "--out-dir", tmpdir,
                            "--auth-token", "token_missing_eval",
                            "--runtime-validation-source", "real_runtime",
                        ])

                summary = json.loads((Path(tmpdir) / "summary.json").read_text(encoding="utf-8"))
                report = json.loads((Path(tmpdir) / "eval_http.json").read_text(encoding="utf-8"))
                review = (Path(tmpdir) / "promotion_review.md").read_text(encoding="utf-8")

        summary_json = json.dumps(summary)
        self.assertEqual(exit_code, 1)
        self.assertEqual(summary["bridgeEvidence"]["status"], "passed")
        self.assertEqual(summary["capabilityDiscovery"]["status"], "passed")
        self.assertEqual(summary["httpEvaluator"]["status"], "failed")
        self.assertEqual(summary["httpEvaluator"]["failureReason"], "http_evaluator_route_not_found")
        self.assertTrue(summary["httpEvaluator"]["sanitized"])
        self.assertEqual(summary["httpEvaluator"]["targetPath"], "/chief-of-staff/reviews/evaluation")
        self.assertEqual(summary["httpEvaluator"]["targetRequestKind"], "evaluation_review_handoff")
        self.assertEqual(summary["httpEvaluator"]["targetOperationId"], "evaluation_review")
        self.assertFalse(summary["httpEvaluator"]["endpointHostRetained"])
        self.assertFalse(summary["httpEvaluator"]["tokenRetained"])
        self.assertEqual(report["status"], "failed")
        self.assertEqual(report["failureReason"], "http_evaluator_route_not_found")
        self.assertEqual(report["evaluationTarget"]["path"], "/chief-of-staff/reviews/evaluation")
        self.assertEqual(len(report["evaluationTarget"]["napoleonRequiredActions"]), 1)
        napoleon_action = report["evaluationTarget"]["napoleonRequiredActions"][0]
        self.assertEqual(napoleon_action["id"], "advertise_evaluation_review_handoff")
        self.assertEqual(napoleon_action["targetPath"], "/chief-of-staff/reviews/evaluation")
        self.assertEqual(napoleon_action["requestKind"], "evaluation_review_handoff")
        self.assertIn(napoleon_action, summary["napoleonRequiredActions"])
        self.assertNotIn(cos_harness.base_url, summary_json)
        self.assertNotIn("token_missing_eval", summary_json)
        self.assertNotIn("127.0.0.1", json.dumps(report))
        self.assertNotIn("secret", json.dumps(report))
        self.assertIn("- HTTP evaluator target path: `/chief-of-staff/reviews/evaluation`", review)
        self.assertIn("Napoleon evaluation review route was not found.", summary["promotionReadiness"]["blockingReasons"])
        self.assertIn("http_evaluator_route_not_found", stderr.getvalue())

    def test_main_blocks_derived_cos_evaluator_when_descriptor_does_not_advertise_handoff(self):
        with RecordingCosHarness(descriptor_ready=True, supported_handoffs=["text_turn"]) as cos_harness:
            with tempfile.TemporaryDirectory() as tmpdir:
                stdout = io.StringIO()
                stderr = io.StringIO()
                with mock.patch.object(live_runtime_validation, "run_http_eval") as run_http_eval:
                    with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                        exit_code = live_runtime_validation.main([
                            "--bridge-endpoint", f"{cos_harness.base_url}/cos",
                            "--out-dir", tmpdir,
                            "--auth-token", "token_unadvertised_eval",
                            "--runtime-validation-source", "real_runtime",
                        ])

                summary = json.loads((Path(tmpdir) / "summary.json").read_text(encoding="utf-8"))
                report = json.loads((Path(tmpdir) / "eval_http.json").read_text(encoding="utf-8"))
                promotion_review = (Path(tmpdir) / "promotion_review.md").read_text(encoding="utf-8")

        summary_json = json.dumps(summary)
        self.assertEqual(exit_code, 1)
        run_http_eval.assert_not_called()
        self.assertEqual(summary["bridgeEvidence"]["status"], "passed")
        self.assertEqual(summary["capabilityDiscovery"]["status"], "passed")
        self.assertEqual(summary["httpEvaluator"]["status"], "failed")
        self.assertEqual(summary["httpEvaluator"]["failureReason"], "http_evaluator_handoff_not_advertised")
        self.assertEqual(summary["httpEvaluator"]["targetPath"], "/chief-of-staff/reviews/evaluation")
        self.assertFalse(summary["httpEvaluator"]["descriptorHandoffAdvertised"])
        self.assertEqual(summary["httpEvaluator"]["descriptorHandoffSource"], "not_advertised")
        self.assertEqual(
            summary["httpEvaluator"]["descriptorHandoffFailureReason"],
            "evaluation_handoff_not_advertised",
        )
        self.assertEqual(report["failureReason"], "http_evaluator_handoff_not_advertised")
        self.assertFalse(report["evaluationTarget"]["descriptorHandoffAdvertised"])
        self.assertIn("evaluation_review", summary["httpEvaluator"]["descriptorHandoffRequiredAction"])
        self.assertEqual(len(summary["napoleonRequiredActions"]), 3)
        summary_action_ids = {action["id"] for action in summary["napoleonRequiredActions"]}
        self.assertEqual(
            summary_action_ids,
            {
                "advertise_chief_of_staff_request_handoff",
                "advertise_governance_evaluation_handoff",
                "advertise_evaluation_review_handoff",
            },
        )
        self.assertEqual(len(report["evaluationTarget"]["napoleonRequiredActions"]), 1)
        napoleon_action = report["evaluationTarget"]["napoleonRequiredActions"][0]
        self.assertEqual(napoleon_action["id"], "advertise_evaluation_review_handoff")
        self.assertEqual(napoleon_action["owner"], "napoleon")
        self.assertEqual(napoleon_action["handoffName"], "evaluation_review")
        self.assertEqual(napoleon_action["targetPath"], "/chief-of-staff/reviews/evaluation")
        self.assertEqual(napoleon_action["requestKind"], "evaluation_review_handoff")
        self.assertEqual(napoleon_action["operationId"], "evaluation_review")
        self.assertIn("supportedHandoffs", napoleon_action["advertiseUsing"])
        self.assertFalse(napoleon_action["sideEffectsPerformed"])
        self.assertFalse(napoleon_action["approvalCaptured"])
        self.assertFalse(napoleon_action["memoryWritePerformed"])
        self.assertFalse(napoleon_action["agentDispatchPerformed"])
        self.assertFalse(napoleon_action["externalSendPerformed"])
        self.assertFalse(napoleon_action["appliedLocally"])
        self.assertIn(napoleon_action, summary["napoleonRequiredActions"])
        self.assertIn(
            "supportedHandoffs",
            report["evaluationTarget"]["descriptorHandoffRequiredAction"],
        )
        self.assertIn("required_for", promotion_review)
        self.assertIn("Napoleon Required Actions", promotion_review)
        self.assertIn("advertise_evaluation_review_handoff", promotion_review)
        self.assertNotIn(cos_harness.base_url, summary_json)
        self.assertNotIn("token_unadvertised_eval", summary_json)
        self.assertNotIn(cos_harness.base_url, promotion_review)
        self.assertNotIn("token_unadvertised_eval", promotion_review)
        self.assertIn("descriptor does not advertise an evaluation review handoff", stderr.getvalue())
        self.assertIn(
            "Napoleon descriptor does not advertise the evaluation review handoff.",
            summary["promotionReadiness"]["blockingReasons"],
        )

    def test_main_accepts_required_for_evaluation_review_handoff_advertisement(self):
        class MissingRouteResponse:
            status_code = 404

        class MissingRouteError(Exception):
            response = MissingRouteResponse()

        with RecordingCosHarness(descriptor_ready=True, required_for=["evaluation_review"]) as cos_harness:
            with tempfile.TemporaryDirectory() as tmpdir:
                with mock.patch.object(
                    live_runtime_validation,
                    "run_http_eval",
                    side_effect=MissingRouteError("not found"),
                ) as run_http_eval:
                    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                        exit_code = live_runtime_validation.main([
                            "--bridge-endpoint", f"{cos_harness.base_url}/cos",
                            "--out-dir", tmpdir,
                            "--runtime-validation-source", "real_runtime",
                        ])

                summary = json.loads((Path(tmpdir) / "summary.json").read_text(encoding="utf-8"))

        self.assertEqual(exit_code, 1)
        run_http_eval.assert_called_once()
        self.assertEqual(summary["httpEvaluator"]["failureReason"], "http_evaluator_route_not_found")
        self.assertTrue(summary["httpEvaluator"]["descriptorHandoffAdvertised"])
        self.assertEqual(summary["httpEvaluator"]["descriptorHandoffSource"], "required_for")

    def test_derives_bridge_base_from_eval_endpoint(self):
        bridge, evaluator = live_runtime_validation.resolve_endpoints(
            None,
            "http://127.0.0.1:8787/v1/concierge/evaluate",
            {},
        )

        self.assertEqual(bridge, "http://127.0.0.1:8787")
        self.assertEqual(evaluator, "http://127.0.0.1:8787/v1/concierge/evaluate")

    def test_derives_bridge_base_from_napoleon_evaluation_review_endpoint(self):
        bridge, evaluator = live_runtime_validation.resolve_endpoints(
            None,
            "https://napoleon.example/chief-of-staff/reviews/evaluation?debug=1",
            {},
        )

        self.assertEqual(bridge, "https://napoleon.example")
        self.assertEqual(evaluator, "https://napoleon.example/chief-of-staff/reviews/evaluation?debug=1")

    def test_endpoint_resolution_records_source_without_retaining_endpoint_values(self):
        config = live_runtime_validation.resolve_endpoint_configuration(
            None,
            None,
            {"NAPOLEON_EVAL_ENDPOINT": "http://127.0.0.1:8787/v1/concierge/evaluate"},
        )
        preflight = live_runtime_validation.live_runtime_preflight(
            config["bridgeEndpoint"],
            config["evalEndpoint"],
            config["resolution"],
        )

        self.assertEqual(config["bridgeEndpoint"], "http://127.0.0.1:8787")
        self.assertEqual(config["evalEndpoint"], "http://127.0.0.1:8787/v1/concierge/evaluate")
        self.assertEqual(preflight["runtimeAlignment"]["bridgeEndpointResolution"], "derived_from_evaluator_endpoint")
        self.assertEqual(preflight["runtimeAlignment"]["evaluatorEndpointResolution"], "env:NAPOLEON_EVAL_ENDPOINT")
        self.assertEqual(preflight["runtimeAlignment"]["evaluatorTargetPath"], "/v1/concierge/evaluate")
        self.assertEqual(preflight["runtimeAlignment"]["evaluatorTargetRequestKind"], "evaluator_prompt")
        self.assertEqual(preflight["runtimeAlignment"]["evaluatorTargetOperationId"], "evaluate")
        self.assertFalse(preflight["runtimeAlignment"]["evaluatorEndpointHostRetained"])
        self.assertFalse(preflight["runtimeAlignment"]["evaluatorTokenRetained"])
        self.assertEqual(preflight["runtimeAlignment"]["bridgeDescriptorTargetPath"], "/v1/concierge/chief-of-staff/descriptor")
        self.assertEqual(preflight["runtimeAlignment"]["bridgeDescriptorTargetOperationId"], "chief_of_staff_descriptor")
        self.assertEqual(preflight["runtimeAlignment"]["bridgeCapabilityTargetPath"], "/v1/concierge/chief-of-staff/capabilities")
        self.assertEqual(preflight["runtimeAlignment"]["bridgeTextTurnTargetPath"], "/v1/concierge/turn")
        self.assertEqual(preflight["runtimeAlignment"]["bridgeTextTurnTargetOperationId"], "turn")
        self.assertIsNone(preflight["runtimeAlignment"]["bridgeTraceEvidenceTargetPath"])
        self.assertFalse(preflight["runtimeAlignment"]["bridgeTraceEvidenceRequired"])
        self.assertFalse(preflight["runtimeAlignment"]["bridgeEndpointHostRetained"])
        self.assertFalse(preflight["runtimeAlignment"]["bridgeTokenRetained"])
        self.assertFalse(preflight["runtimeAlignment"]["bridgeEndpointExplicitlyConfigured"])
        self.assertTrue(preflight["runtimeAlignment"]["evaluatorEndpointExplicitlyConfigured"])
        self.assertNotIn("127.0.0.1", json.dumps(preflight))
        self.assertNotIn("8787", json.dumps(preflight))

    def test_preflight_records_sanitized_napoleon_cos_bridge_and_evaluation_targets(self):
        config = live_runtime_validation.resolve_endpoint_configuration(
            "https://napoleon.example/cos/text-turn",
            None,
            {},
        )
        preflight = live_runtime_validation.live_runtime_preflight(
            config["bridgeEndpoint"],
            config["evalEndpoint"],
            config["resolution"],
        )

        self.assertEqual(config["evalEndpoint"], "https://napoleon.example/chief-of-staff/reviews/evaluation")
        self.assertEqual(preflight["runtimeAlignment"]["evaluatorEndpointResolution"], "derived_from_bridge_endpoint")
        self.assertEqual(preflight["runtimeAlignment"]["evaluatorTargetPath"], "/chief-of-staff/reviews/evaluation")
        self.assertEqual(preflight["runtimeAlignment"]["evaluatorTargetRequestKind"], "evaluation_review_handoff")
        self.assertEqual(preflight["runtimeAlignment"]["evaluatorTargetOperationId"], "evaluation_review")
        self.assertFalse(preflight["runtimeAlignment"]["evaluatorEndpointHostRetained"])
        self.assertFalse(preflight["runtimeAlignment"]["evaluatorTokenRetained"])
        self.assertFalse(preflight["runtimeAlignment"]["evaluatorRequestBodyRetained"])
        self.assertFalse(preflight["runtimeAlignment"]["evaluatorResponseBodyRetained"])
        self.assertFalse(preflight["runtimeAlignment"]["evaluatorApprovalCaptured"])
        self.assertFalse(preflight["runtimeAlignment"]["evaluatorMemoryWritePerformed"])
        self.assertFalse(preflight["runtimeAlignment"]["evaluatorAgentDispatchPerformed"])
        self.assertFalse(preflight["runtimeAlignment"]["evaluatorExternalSendPerformed"])
        self.assertEqual(preflight["runtimeAlignment"]["bridgeDescriptorTargetPath"], "/cos/descriptor")
        self.assertEqual(preflight["runtimeAlignment"]["bridgeDescriptorTargetOperationId"], "chief_of_staff_descriptor")
        self.assertEqual(preflight["runtimeAlignment"]["bridgeCapabilityTargetPath"], "/cos/capabilities")
        self.assertEqual(preflight["runtimeAlignment"]["bridgeCapabilityTargetOperationId"], "chief_of_staff_capabilities")
        self.assertEqual(preflight["runtimeAlignment"]["bridgeTextTurnTargetPath"], "/cos/text-turn")
        self.assertEqual(preflight["runtimeAlignment"]["bridgeTextTurnTargetOperationId"], "text_turn")
        self.assertEqual(preflight["runtimeAlignment"]["bridgeTraceEvidenceTargetPath"], "/cos/trace/{trace_id}")
        self.assertTrue(preflight["runtimeAlignment"]["bridgeTraceEvidenceRequired"])
        self.assertFalse(preflight["runtimeAlignment"]["bridgeEndpointHostRetained"])
        self.assertFalse(preflight["runtimeAlignment"]["bridgeTokenRetained"])
        self.assertFalse(preflight["runtimeAlignment"]["bridgeRequestBodyRetained"])
        self.assertFalse(preflight["runtimeAlignment"]["bridgeResponseBodyRetained"])
        self.assertFalse(preflight["runtimeAlignment"]["bridgeApprovalCaptured"])
        self.assertFalse(preflight["runtimeAlignment"]["bridgeMemoryWritePerformed"])
        self.assertFalse(preflight["runtimeAlignment"]["bridgeAgentDispatchPerformed"])
        self.assertFalse(preflight["runtimeAlignment"]["bridgeExternalSendPerformed"])
        self.assertNotIn("napoleon.example", json.dumps(preflight))

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

    def test_derives_napoleon_evaluation_review_from_explicit_cos_endpoint(self):
        for path in ["/cos", "/cos/descriptor", "/cos/capabilities", "/cos/text-turn"]:
            with self.subTest(path=path):
                bridge, evaluator = live_runtime_validation.resolve_endpoints(
                    f"https://napoleon.example{path}",
                    None,
                    {},
                )

                self.assertEqual(bridge, f"https://napoleon.example{path}")
                self.assertEqual(evaluator, "https://napoleon.example/chief-of-staff/reviews/evaluation")

    def test_derives_napoleon_evaluation_review_from_napoleon_base_endpoint(self):
        bridge, evaluator = live_runtime_validation.resolve_endpoints(
            "https://napoleon.example",
            None,
            {},
        )

        self.assertEqual(bridge, "https://napoleon.example")
        self.assertEqual(evaluator, "https://napoleon.example/chief-of-staff/reviews/evaluation")

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

    def test_promotion_readiness_blocks_on_napoleon_required_actions(self):
        summary = {
            "runtimeValidation": {"source": "real_runtime"},
            "bridgeEvidence": {"status": "passed"},
            "capabilityDiscovery": {"status": "passed"},
            "contractPacketSubmissions": {"status": "passed"},
            "httpEvaluator": {"status": "passed", "failureReason": "none"},
            "artifactPrivacy": {"status": "passed"},
            "napoleonRequiredActions": [
                {
                    "id": "expose_evolution_proposal_status_runtime_target",
                    "owner": "napoleon_runtime",
                    "targetPath": "/evolution/proposals/{proposal_id}/status",
                    "requestKind": "evolution_proposal_status_handoff",
                    "operationId": "evolution_proposal_status",
                    "sideEffectsPerformed": False,
                    "approvalCaptured": False,
                    "memoryWritePerformed": False,
                    "agentDispatchPerformed": False,
                    "externalSendPerformed": False,
                    "appliedLocally": False,
                },
            ],
        }

        readiness = live_runtime_validation.promotion_readiness(summary)

        self.assertFalse(readiness["locallySafeToConsider"])
        self.assertEqual(readiness["gate"], "blocked_until_runtime_contract_actions_cleared")
        self.assertIn(
            "Napoleon-owned required actions remain before promotion.",
            readiness["blockingReasons"],
        )

    def test_promotion_readiness_requires_packaged_app_bundle_probe_for_real_runtime(self):
        packaged_desktop = {
            **live_runtime_validation.packaged_desktop_transport_default(True),
            "status": "passed",
            "packagedBinaryLiveProbePassed": True,
            "macosAppBundleLiveProbePassed": False,
        }
        summary = {
            "runtimeValidation": {"source": "real_runtime"},
            "bridgeEvidence": {"status": "passed"},
            "capabilityDiscovery": {"status": "passed"},
            "contractPacketSubmissions": {"status": "passed"},
            "httpEvaluator": {"status": "passed", "failureReason": "none"},
            "artifactPrivacy": {"status": "passed"},
            "packagedDesktopTransport": packaged_desktop,
            "napoleonRequiredActions": [],
        }

        readiness = live_runtime_validation.promotion_readiness(summary)

        self.assertFalse(readiness["locallySafeToConsider"])
        self.assertEqual(readiness["gate"], "blocked_until_real_runtime_evidence_passes")
        self.assertIn(
            "Packaged desktop app-bundle live probe did not pass against the real runtime.",
            readiness["blockingReasons"],
        )

    def test_records_http_evaluator_failure_without_traceback_or_endpoint_retention(self):
        with local_bridge_harness.running_harness() as base_url:
            with tempfile.TemporaryDirectory() as tmpdir:
                stdout = io.StringIO()
                stderr = io.StringIO()
                with mock.patch.object(
                    live_runtime_validation,
                    "run_http_eval",
                    side_effect=RuntimeError(f"failed against {base_url}/v1/concierge/evaluate"),
                ):
                    with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                        exit_code = live_runtime_validation.main(
                            [
                                "--bridge-endpoint",
                                base_url,
                                "--out-dir",
                                tmpdir,
                                "--runtime-validation-source",
                                "local_harness",
                            ]
                        )

                summary = json.loads((Path(tmpdir) / "summary.json").read_text(encoding="utf-8"))
                review = (Path(tmpdir) / "promotion_review.md").read_text(encoding="utf-8")

        summary_json = json.dumps(summary)
        self.assertEqual(exit_code, 1)
        self.assertEqual(summary["bridgeEvidence"]["status"], "passed")
        self.assertEqual(summary["httpEvaluator"]["status"], "failed")
        self.assertEqual(summary["httpEvaluator"]["failureReason"], "http_evaluator_failed")
        self.assertEqual(summary["artifactPrivacy"]["status"], "passed")
        self.assertFalse(summary["promotionReadiness"]["locallySafeToConsider"])
        self.assertIn("HTTP evaluator mode failed", stderr.getvalue())
        self.assertNotIn(base_url, summary_json)
        self.assertNotIn(base_url, review)
        self.assertNotIn(base_url, stderr.getvalue())

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

            preflight = json.loads((Path(tmpdir) / "preflight.json").read_text(encoding="utf-8"))
            self.assertEqual(exit_code, 2)
            self.assertIn("NAPOLEON_BRIDGE_ENDPOINT", stderr.getvalue())
            self.assertIn(str(Path(tmpdir) / "preflight.json"), stderr.getvalue())
            self.assertEqual(preflight["status"], "blocked")
            self.assertEqual(preflight["reason"], "missing_bridge_endpoint")
            self.assertIn("NAPOLEON_BRIDGE_ENDPOINT", preflight["missingConfiguration"])
            self.assertEqual(preflight["runtimeAlignment"]["requiredBridgeEndpointEnv"], "NAPOLEON_BRIDGE_ENDPOINT")
            self.assertEqual(preflight["runtimeAlignment"]["requiredEvaluatorEndpointEnv"], "NAPOLEON_EVAL_ENDPOINT")
            self.assertIn("/cos", preflight["runtimeAlignment"]["acceptedBridgeEndpointForms"])
            self.assertIn("/cos/descriptor", preflight["runtimeAlignment"]["acceptedBridgeEndpointForms"])
            self.assertIn("/cos/text-turn", preflight["runtimeAlignment"]["acceptedBridgeEndpointForms"])
            self.assertFalse(preflight["runtimeAlignment"]["localHarnessSubstituteAllowed"])
            self.assertTrue(preflight["runtimeAlignment"]["descriptorDiscoveryRequired"])
            self.assertEqual(
                preflight["runtimeAlignment"]["nextValidationCommand"],
                "NAPOLEON_BRIDGE_ENDPOINT=<base-url-or-operation-url> make live-runtime-validation",
            )
            self.assertIsNone(preflight["runtimeAlignment"]["bridgeDescriptorTargetPath"])
            self.assertIsNone(preflight["runtimeAlignment"]["bridgeTextTurnTargetPath"])
            self.assertFalse(preflight["runtimeAlignment"]["bridgeTraceEvidenceRequired"])
            self.assertFalse(preflight["runtimeAlignment"]["bridgeEndpointHostRetained"])
            self.assertFalse(preflight["runtimeAlignment"]["bridgeTokenRetained"])
            self.assertIsNone(preflight["runtimeAlignment"]["evaluatorTargetPath"])
            self.assertFalse(preflight["runtimeAlignment"]["evaluatorEndpointHostRetained"])
            self.assertFalse(preflight["runtimeAlignment"]["evaluatorTokenRetained"])
            self.assertFalse(preflight["endpointHostStored"])
            self.assertFalse(preflight["tokenStored"])
            self.assertEqual(preflight["packagedDesktopTransport"]["status"], "not_required")
            self.assertFalse(preflight["packagedDesktopTransport"]["required"])
            self.assertFalse(preflight["approvalCaptured"])
            self.assertFalse(preflight["memoryWritePerformed"])
            self.assertFalse(preflight["agentDispatchPerformed"])
            self.assertFalse(preflight["externalSendPerformed"])
            self.assertFalse((Path(tmpdir) / "summary.json").exists())

    def test_packaged_live_preflight_points_to_packaged_validation_when_required(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            report_path = Path(tmpdir) / "desktop-runtime.json"
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
                    return mock.Mock(returncode=0, stdout=stdout, stderr="")
                return mock.Mock(returncode=0, stdout="", stderr="")

            report = desktop_runtime_transport_validation.build_report(
                runner=runner,
            )
            desktop_runtime_transport_validation.write_report(report, report_path)
            with contextlib.redirect_stderr(io.StringIO()):
                exit_code = live_runtime_validation.main(
                    [
                        "--out-dir",
                        tmpdir,
                        "--desktop-runtime-transport-report",
                        str(report_path),
                        "--require-packaged-desktop-transport",
                    ],
                    env={},
                )

            preflight = json.loads((Path(tmpdir) / "preflight.json").read_text(encoding="utf-8"))

        self.assertEqual(exit_code, 2)
        self.assertEqual(
            preflight["runtimeAlignment"]["nextValidationCommand"],
            "NAPOLEON_BRIDGE_ENDPOINT=<base-url-or-operation-url> make packaged-live-runtime-validation",
        )
        self.assertEqual(preflight["packagedDesktopTransport"]["status"], "passed")
        self.assertTrue(preflight["packagedDesktopTransport"]["required"])
        self.assertTrue(preflight["packagedDesktopTransport"]["governedRouteAllowlistEnforced"])
        self.assertTrue(preflight["packagedDesktopTransport"]["governedRouteMethodAllowlistEnforced"])
        self.assertTrue(preflight["packagedDesktopTransport"]["nativeAuthEnforcedAtCommandBoundary"])
        self.assertTrue(preflight["packagedDesktopTransport"]["nativeEndpointResolution"])
        self.assertTrue(preflight["packagedDesktopTransport"]["endpointHostOmittedFromInvokePayload"])
        self.assertTrue(preflight["packagedDesktopTransport"]["nativeLocalEndpointReadiness"])
        self.assertTrue(preflight["packagedDesktopTransport"]["packagedBinaryConfigProbePassed"])
        self.assertTrue(preflight["packagedDesktopTransport"]["packagedBinaryTransportProbePassed"])
        self.assertTrue(preflight["packagedDesktopTransport"]["packagedBinaryGeneratedLocalLiveProbePassed"])
        self.assertTrue(preflight["packagedDesktopTransport"]["packagedBinaryCosLocalLiveProbePassed"])
        self.assertTrue(preflight["packagedDesktopTransport"]["packagedBinaryLocalLiveProbePassed"])
        self.assertFalse(preflight["packagedDesktopTransport"]["packagedBinaryLiveProbeConfigured"])
        self.assertFalse(preflight["packagedDesktopTransport"]["packagedBinaryLiveProbePassed"])
        self.assertEqual(preflight["packagedDesktopTransport"]["packagedBinaryLiveProbeRouteFamily"], "unknown")
        self.assertEqual(preflight["packagedDesktopTransport"]["packagedBinaryLiveProbeFailureStage"], "unknown")
        self.assertEqual(preflight["packagedDesktopTransport"]["packagedBinaryLiveProbeFailureKind"], "unknown")
        self.assertFalse(preflight["packagedDesktopTransport"]["macosAppBundleLiveProbeConfigured"])
        self.assertFalse(preflight["packagedDesktopTransport"]["macosAppBundleLiveProbePassed"])
        self.assertEqual(preflight["packagedDesktopTransport"]["macosAppBundleLiveProbeRouteFamily"], "unknown")
        self.assertEqual(preflight["packagedDesktopTransport"]["macosAppBundleLiveProbeFailureStage"], "unknown")
        self.assertEqual(preflight["packagedDesktopTransport"]["macosAppBundleLiveProbeFailureKind"], "unknown")
        self.assertFalse(preflight["packagedDesktopTransport"]["endpointHostRetained"])
        self.assertFalse(preflight["packagedDesktopTransport"]["tokenRetained"])
        self.assertFalse(preflight["packagedDesktopTransport"]["requestBodyRetained"])
        self.assertFalse(preflight["packagedDesktopTransport"]["responseBodyRetained"])
        self.assertTrue(preflight["packagedDesktopTransport"]["doesNotContactNapoleon"])

    def test_missing_endpoint_preflight_reports_missing_token_file_without_retaining_path(self):
        missing_token_path = "/tmp/concierge-runtime-token-that-does-not-exist"
        with tempfile.TemporaryDirectory() as tmpdir:
            with contextlib.redirect_stderr(io.StringIO()):
                exit_code = live_runtime_validation.main(
                    ["--out-dir", tmpdir],
                    env={"NAPOLEON_EVAL_TOKEN_FILE": missing_token_path},
                )

            preflight = json.loads((Path(tmpdir) / "preflight.json").read_text(encoding="utf-8"))

        preflight_json = json.dumps(preflight)
        self.assertEqual(exit_code, 2)
        self.assertEqual(preflight["authProvisioning"]["source"], "token_file_missing")
        self.assertFalse(preflight["authProvisioning"]["tokenConfigured"])
        self.assertTrue(preflight["authProvisioning"]["tokenFileConfigured"])
        self.assertFalse(preflight["authProvisioning"]["tokenFileExists"])
        self.assertFalse(preflight["authProvisioning"]["tokenFileReadable"])
        self.assertFalse(preflight["authProvisioning"]["tokenRetained"])
        self.assertFalse(preflight["authProvisioning"]["tokenFilePathRetained"])
        self.assertNotIn(missing_token_path, preflight_json)

    def test_reused_output_directory_does_not_retain_stale_runtime_artifacts(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            out_dir = Path(tmpdir)
            (out_dir / "bridge_evidence.json").write_text(
                json.dumps([{
                    "status": "success",
                    "operationId": "text_turn",
                    "requestKind": "text_turn",
                    "transport": "http_post",
                    "targetPath": "/cos/text-turn",
                    "runtimeValidationSource": "real_runtime",
                    "traceEnvelopeObserved": True,
                    "traceEnvelopeMatched": True,
                    "traceTargetPath": "/cos/trace/{trace_id}",
                }]),
                encoding="utf-8",
            )
            (out_dir / "capability_discovery.json").write_text(
                json.dumps({
                    "kind": "chief_of_staff_capability_discovery_evidence",
                    "status": "passed",
                    "targetPath": "/cos/capabilities",
                    "operationId": "chief_of_staff_capabilities",
                    "requestKind": "chief_of_staff_capabilities",
                    "capabilityCount": 6,
                    "capabilityIds": ["napoleon.capability.stale"],
                }),
                encoding="utf-8",
            )
            (out_dir / "eval_http.json").write_text(
                json.dumps({
                    "run_id": "stale_eval",
                    "score_total": 100,
                    "evaluationTarget": {
                        "path": "/chief-of-staff/reviews/evaluation",
                        "requestKind": "evaluation_review_handoff",
                        "operationId": "evaluation_review",
                    },
                }),
                encoding="utf-8",
            )

            def fail_bridge_capture(*args):
                return 1, "", "descriptor preflight failed\n"

            stderr = io.StringIO()
            with mock.patch.object(live_runtime_validation, "run_bridge_capture", side_effect=fail_bridge_capture):
                with contextlib.redirect_stderr(stderr):
                    exit_code = live_runtime_validation.main([
                        "--bridge-endpoint", "http://127.0.0.1:18765/cos",
                        "--eval-endpoint", "http://127.0.0.1:18765/chief-of-staff/reviews/evaluation",
                        "--out-dir", tmpdir,
                    ])

            summary = json.loads((out_dir / "summary.json").read_text(encoding="utf-8"))

        self.assertEqual(exit_code, 1)
        self.assertIn("descriptor preflight failed", stderr.getvalue())
        self.assertEqual(summary["bridgeEvidence"]["status"], "failed")
        self.assertEqual(summary["bridgeEvidence"]["record_count"], 0)
        self.assertIsNone(summary["bridgeEvidence"]["lastOperationId"])
        self.assertIsNone(summary["bridgeEvidence"]["lastTargetPath"])
        self.assertEqual(summary["capabilityDiscovery"]["status"], "not_run")
        self.assertEqual(summary["capabilityDiscovery"]["capabilityCount"], 0)
        self.assertEqual(summary["capabilityDiscovery"]["capabilityIds"], [])
        self.assertEqual(summary["httpEvaluator"]["status"], "not_run")
        self.assertEqual(summary["httpEvaluator"]["run_id"], "not_run")
        self.assertIsNone(summary["httpEvaluator"]["score_total"])
        self.assertEqual(summary["artifactPrivacy"]["status"], "passed")
        self.assertEqual(summary["artifactPrivacy"]["violation_count"], 0)

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

    def test_artifact_privacy_audit_rejects_snake_case_raw_fields(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            artifact = Path(tmpdir) / "artifact.json"
            artifact.write_text(
                json.dumps({
                    "safe": "metadata",
                    "response_text": "redacted value should still be a forbidden retained field",
                    "request_body": {"shape": "also forbidden"},
                    "bearer_token": "redacted",
                }),
                encoding="utf-8",
            )

            audit = live_runtime_validation.audit_artifact_privacy([artifact], set())

        self.assertEqual(audit["status"], "failed")
        self.assertEqual(audit["checked_count"], 1)
        self.assertEqual(audit["violation_count"], 3)
        violations = audit["artifacts"][0]["violations"]
        self.assertTrue(any("forbidden artifact field response_text" in violation for violation in violations))
        self.assertTrue(any("forbidden artifact field request_body" in violation for violation in violations))
        self.assertTrue(any("forbidden artifact field bearer_token" in violation for violation in violations))

    def test_artifact_privacy_audit_rejects_true_retention_or_side_effect_flags(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            artifact = Path(tmpdir) / "artifact.json"
            artifact.write_text(
                json.dumps({
                    "evaluationTarget": {
                        "targetPath": "/v1/concierge/evaluate",
                        "endpointHostRetained": True,
                        "tokenRetained": False,
                        "request_body_retained": True,
                        "responseBodyRetained": False,
                        "approvalCaptured": True,
                        "memory_write_performed": True,
                        "agentDispatchPerformed": False,
                        "external_send_performed": True,
                    },
                }),
                encoding="utf-8",
            )

            audit = live_runtime_validation.audit_artifact_privacy([artifact], set())

        self.assertEqual(audit["status"], "failed")
        self.assertEqual(audit["checked_count"], 1)
        self.assertEqual(audit["violation_count"], 5)
        violations = audit["artifacts"][0]["violations"]
        self.assertTrue(any("forbidden true artifact boundary flag endpointHostRetained" in violation for violation in violations))
        self.assertTrue(any("forbidden true artifact boundary flag request_body_retained" in violation for violation in violations))
        self.assertTrue(any("forbidden true artifact boundary flag approvalCaptured" in violation for violation in violations))
        self.assertTrue(any("forbidden true artifact boundary flag memory_write_performed" in violation for violation in violations))
        self.assertTrue(any("forbidden true artifact boundary flag external_send_performed" in violation for violation in violations))
        self.assertNotIn("tokenRetained: forbidden", json.dumps(audit))
        self.assertNotIn("agentDispatchPerformed: forbidden", json.dumps(audit))


if __name__ == "__main__":
    unittest.main()
