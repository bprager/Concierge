import json
import tempfile
import unittest
from pathlib import Path

from scripts import create_packaged_desktop_release_gate


def eligible_summary() -> dict:
    return {
        "runtimeValidation": {
            "source": "real_runtime",
        },
        "promotionReadiness": {
            "gate": "ready_for_human_review",
            "locallySafeToConsider": True,
            "evidencePath": "packaged_desktop_runtime_connection",
            "blockingReasons": [],
        },
        "packagedDesktopRuntimeConnection": {
            "status": "passed",
            "locallySafeToConsider": True,
            "pythonHostTransportRequired": False,
            "browserProxyRequired": False,
            "endpointAndTokenKeptLocal": True,
            "governedRoutesOnly": True,
            "binaryLiveProofPassed": True,
            "appBundleLiveProofPassed": True,
            "descriptorProofPassed": True,
            "capabilityProofPassed": True,
            "textTurnProofPassed": True,
            "traceProofPassed": True,
            "sideEffectClaimed": False,
            "blockingReasons": [],
        },
        "artifactPrivacy": {
            "status": "passed",
        },
        "napoleonRequiredActions": [],
        "promotionBoundary": {
            "approvalCaptured": False,
            "memoryWritePerformed": False,
            "agentDispatchPerformed": False,
            "externalSendPerformed": False,
            "appliedLocally": False,
        },
    }


class CreatePackagedDesktopReleaseGateTest(unittest.TestCase):
    def test_accepts_packaged_desktop_evidence_with_matching_artifact_check(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            summary = Path(tmpdir) / "summary.json"
            artifact = Path(tmpdir) / "release_gate.json"
            markdown = Path(tmpdir) / "release_gate.md"
            summary.write_text(json.dumps(eligible_summary(), sort_keys=True), encoding="utf-8")

            exit_code = create_packaged_desktop_release_gate.main([
                "--summary", str(summary),
                "--out", str(artifact),
                "--markdown-out", str(markdown),
                "--reviewer", "Owner reviewer",
                "--decision", "accept",
                "--reviewed-at", "2026-07-06T12:00:00Z",
            ])

            self.assertEqual(exit_code, 0)
            payload = json.loads(artifact.read_text(encoding="utf-8"))
            self.assertEqual(payload["kind"], "concierge.packaged-desktop-release-gate.v1")
            self.assertEqual(payload["status"], "reviewed_and_accepted")
            self.assertEqual(payload["humanReview"]["decision"], "accept")
            self.assertEqual(payload["releaseGate"]["record"], "reviewed_and_accepted")
            self.assertTrue(payload["releaseGate"]["canUseForFuturePromotionDecisions"])
            self.assertFalse(payload["releaseGate"]["napoleonApprovalGranted"])
            self.assertFalse(payload["releaseGate"]["releaseApprovalGranted"])
            self.assertEqual(payload["evidence"]["promotionGate"], "ready_for_human_review")
            self.assertEqual(payload["evidence"]["evidencePath"], "packaged_desktop_runtime_connection")
            self.assertTrue(all(check["passed"] for check in payload["requiredChecks"]))
            self.assertIn("not Napoleon approval", payload["boundary"])
            self.assertIn("reviewed and accepted", markdown.read_text(encoding="utf-8"))

            check_code = create_packaged_desktop_release_gate.main([
                "--summary", str(summary),
                "--check-artifact", str(artifact),
            ])
            self.assertEqual(check_code, 0)

    def test_blocks_acceptance_when_summary_is_only_ready_for_host_review(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            summary_payload = eligible_summary()
            summary_payload["promotionReadiness"]["evidencePath"] = "host_live_runtime_validation"
            summary = Path(tmpdir) / "summary.json"
            artifact = Path(tmpdir) / "release_gate.json"
            summary.write_text(json.dumps(summary_payload), encoding="utf-8")

            with self.assertRaises(SystemExit):
                create_packaged_desktop_release_gate.main([
                    "--summary", str(summary),
                    "--out", str(artifact),
                    "--reviewer", "Owner reviewer",
                    "--decision", "accept",
                    "--reviewed-at", "2026-07-06T12:00:00Z",
                ])

            self.assertFalse(artifact.exists())

    def test_check_rejects_artifact_for_different_summary_digest(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            summary = Path(tmpdir) / "summary.json"
            artifact = Path(tmpdir) / "release_gate.json"
            summary.write_text(json.dumps(eligible_summary(), sort_keys=True), encoding="utf-8")
            create_packaged_desktop_release_gate.main([
                "--summary", str(summary),
                "--out", str(artifact),
                "--reviewer", "Owner reviewer",
                "--decision", "accept",
                "--reviewed-at", "2026-07-06T12:00:00Z",
            ])

            mutated = eligible_summary()
            mutated["packagedDesktopRuntimeConnection"]["traceProofPassed"] = False
            summary.write_text(json.dumps(mutated, sort_keys=True), encoding="utf-8")

            with self.assertRaises(SystemExit):
                create_packaged_desktop_release_gate.main([
                    "--summary", str(summary),
                    "--check-artifact", str(artifact),
                ])


if __name__ == "__main__":
    unittest.main()
