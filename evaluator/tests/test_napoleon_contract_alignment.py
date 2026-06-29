import json
import tempfile
import unittest
from pathlib import Path

from scripts import napoleon_contract_alignment


class NapoleonContractAlignmentTests(unittest.TestCase):
    def write_yaml(self, directory: Path, name: str, text: str) -> Path:
        path = directory / name
        path.write_text(text, encoding="utf-8")
        return path

    def test_reports_runtime_harness_path_mismatch_without_authority(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            local = self.write_yaml(
                directory,
                "local.yaml",
                """
openapi: 3.1.0
paths:
  /v1/concierge/turn:
    post:
      responses:
        "200": {description: ok}
""",
            )
            napoleon = self.write_yaml(
                directory,
                "napoleon.yaml",
                """
openapi: 3.1.0
x-napoleon-runtime-authority: false
paths:
  /cos/descriptor:
    get:
      responses:
        "200": {description: descriptor}
  /cos/text-turn:
    post:
      responses:
        "202": {description: accepted}
""",
            )

            report = napoleon_contract_alignment.build_alignment_report(local, napoleon)

        self.assertFalse(report["aligned"])
        self.assertTrue(report["runtimeAligned"])
        self.assertEqual(report["alignmentStatus"], "runtime_mapped_with_local_contract_paths")
        self.assertEqual(report["unmappedNapoleonRuntimePaths"], [])
        self.assertIn("/cos/text-turn", report["napoleonOnlyPaths"])
        self.assertIn("/v1/concierge/turn", report["conciergeOnlyPaths"])
        self.assertEqual(report["napoleonRuntimeAuthority"], False)
        self.assertEqual(report["nonAuthorityBoundary"], "alignment_check_only")

    def test_reports_aligned_paths(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            local = self.write_yaml(
                directory,
                "local.yaml",
                """
openapi: 3.1.0
paths:
  /cos/text-turn:
    post:
      responses:
        "202": {description: accepted}
""",
            )
            napoleon = self.write_yaml(
                directory,
                "napoleon.yaml",
                """
openapi: 3.1.0
x-napoleon-runtime-authority: false
paths:
  /cos/text-turn:
    post:
      responses:
        "202": {description: accepted}
""",
            )

            report = napoleon_contract_alignment.build_alignment_report(local, napoleon)

        self.assertTrue(report["aligned"])
        self.assertTrue(report["runtimeAligned"])
        self.assertEqual(report["alignmentStatus"], "exact_path_match")
        self.assertEqual(report["unmappedNapoleonRuntimePaths"], [])
        self.assertEqual(report["napoleonOnlyPaths"], [])
        self.assertEqual(report["conciergeOnlyPaths"], [])
        self.assertEqual(report["napoleonRequiredActionCount"], 0)
        self.assertFalse(report["blockingLivePromotion"])

    def test_main_writes_report_to_optional_output_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            local = self.write_yaml(
                directory,
                "local.yaml",
                """
openapi: 3.1.0
paths:
  /cos/text-turn:
    post:
      responses:
        "202": {description: accepted}
""",
            )
            napoleon = self.write_yaml(
                directory,
                "napoleon.yaml",
                """
openapi: 3.1.0
x-napoleon-runtime-authority: false
paths:
  /cos/text-turn:
    post:
      responses:
        "202": {description: accepted}
""",
            )
            out = directory / "reports" / "alignment.json"

            code = napoleon_contract_alignment.main(
                [
                    "--concierge-openapi",
                    str(local),
                    "--napoleon-openapi",
                    str(napoleon),
                    "--out",
                    str(out),
                ]
            )

            self.assertEqual(code, 0)
            self.assertTrue(out.exists())
            report = json.loads(out.read_text(encoding="utf-8"))
            self.assertTrue(report["aligned"])
            self.assertTrue(report["runtimeAligned"])
            self.assertEqual(report["nonAuthorityBoundary"], "alignment_check_only")
            self.assertFalse(report["approvalCaptured"])
            self.assertFalse(report["memoryWritePerformed"])
            self.assertFalse(report["agentDispatchPerformed"])
            self.assertFalse(report["externalSendPerformed"])

    def test_reports_unmapped_napoleon_runtime_paths(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            local = self.write_yaml(
                directory,
                "local.yaml",
                """
openapi: 3.1.0
paths:
  /v1/concierge/turn:
    post:
      responses:
        "200": {description: ok}
""",
            )
            napoleon = self.write_yaml(
                directory,
                "napoleon.yaml",
                """
openapi: 3.1.0
x-napoleon-runtime-authority: false
paths:
  /cos/text-turn:
    post:
      responses:
        "202": {description: accepted}
  /chief-of-staff/reviews/unknown:
    post:
      responses:
        "202": {description: unknown review}
""",
            )

            report = napoleon_contract_alignment.build_alignment_report(local, napoleon)

        self.assertEqual(report["kind"], "concierge.napoleon-contract-alignment.v1")
        self.assertFalse(report["aligned"])
        self.assertFalse(report["runtimeAligned"])
        self.assertEqual(report["alignmentStatus"], "runtime_mapping_gaps_present")
        self.assertEqual(report["unmappedNapoleonRuntimePaths"], ["/chief-of-staff/reviews/unknown"])

    def test_reports_concierge_review_targets_missing_from_napoleon_runtime(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            local = self.write_yaml(
                directory,
                "local.yaml",
                """
openapi: 3.1.0
x-concierge-napoleon-review-operations:
  - id: evolution_proposal_status
    path: /evolution/proposals/{proposal_id}/status
    requestKind: evolution_proposal_status_handoff
paths:
  /v1/concierge/turn:
    post:
      responses:
        "200": {description: ok}
""",
            )
            napoleon = self.write_yaml(
                directory,
                "napoleon.yaml",
                """
openapi: 3.1.0
x-napoleon-runtime-authority: false
paths:
  /cos/text-turn:
    post:
      responses:
        "202": {description: accepted}
  /evolution/proposals:
    post:
      responses:
        "202": {description: evolution}
""",
            )

            report = napoleon_contract_alignment.build_alignment_report(local, napoleon)

        self.assertFalse(report["aligned"])
        self.assertFalse(report["runtimeAligned"])
        self.assertEqual(report["alignmentStatus"], "runtime_mapping_gaps_present")
        self.assertEqual(
            report["conciergeReviewPathsMissingFromNapoleonRuntime"],
            ["/evolution/proposals/{proposal_id}/status"],
        )
        self.assertEqual(
            report["conciergeReviewOperationsMissingFromNapoleonRuntime"],
            [
                {
                    "id": "evolution_proposal_status",
                    "path": "/evolution/proposals/{proposal_id}/status",
                    "requestKind": "evolution_proposal_status_handoff",
                    "sideEffectsPerformed": False,
                    "approvalCaptured": False,
                    "memoryWritePerformed": False,
                    "agentDispatchPerformed": False,
                    "externalSendPerformed": False,
                }
            ],
        )
        self.assertEqual(
            report["napoleonRequiredActions"],
            [
                {
                    "id": "expose_evolution_proposal_status_runtime_target",
                    "owner": "napoleon_runtime",
                    "operationId": "evolution_proposal_status",
                    "path": "/evolution/proposals/{proposal_id}/status",
                    "requestKind": "evolution_proposal_status_handoff",
                    "requiredAction": (
                        "Expose and advertise the read-only evolution_proposal_status runtime target at "
                        "/evolution/proposals/{proposal_id}/status before Concierge can refresh proposal status "
                        "against live Napoleon."
                    ),
                    "reason": "named_concierge_review_target_missing_from_napoleon_snapshot",
                    "blockingLivePromotion": True,
                    "boundary": (
                        "Concierge must not fall back to free-form paths, capture approval, apply evolution, "
                        "write memory, dispatch agents, send externally, update registries, append traces, or "
                        "treat proposal status as local authority."
                    ),
                    "sideEffectsPerformed": False,
                    "approvalCaptured": False,
                    "memoryWritePerformed": False,
                    "agentDispatchPerformed": False,
                    "externalSendPerformed": False,
                }
            ],
        )
        self.assertEqual(report["napoleonRequiredActionCount"], 1)
        self.assertTrue(report["blockingLivePromotion"])

    def test_current_alignment_finding_lists_generated_concierge_paths(self):
        doc = Path("docs/NAPOLEON_CONTRACT_ALIGNMENT.md").read_text(encoding="utf-8")

        for path in [
            "/v1/concierge/chief-of-staff/capabilities",
            "/v1/concierge/chief-of-staff/descriptor",
            "/v1/concierge/chief-of-staff/steering",
            "/v1/concierge/evaluate",
            "/v1/concierge/memory-proposals",
            "/v1/concierge/turn",
        ]:
            with self.subTest(path=path):
                self.assertIn(f"- `{path}`", doc)

    def test_classifies_advisory_runtime_and_unmapped_review_paths(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            local = self.write_yaml(
                directory,
                "local.yaml",
                """
openapi: 3.1.0
paths:
  /v1/concierge/chief-of-staff/descriptor:
    get:
      responses:
        "200": {description: descriptor}
  /v1/concierge/chief-of-staff/capabilities:
    get:
      responses:
        "200": {description: capabilities}
  /v1/concierge/chief-of-staff/steering:
    post:
      responses:
        "200": {description: steering}
  /v1/concierge/evaluate:
    post:
      responses:
        "200": {description: evaluation}
  /v1/concierge/turn:
    post:
      responses:
        "200": {description: turn}
""",
            )
            napoleon = self.write_yaml(
                directory,
                "napoleon.yaml",
                """
openapi: 3.1.0
x-napoleon-runtime-authority: false
paths:
  /cos/descriptor:
    get:
      responses:
        "200": {description: descriptor}
  /cos/capabilities:
    get:
      responses:
        "200": {description: capabilities}
  /cos/text-turn:
    post:
      responses:
        "202": {description: accepted}
  /cos/trace/{trace_id}:
    get:
      responses:
        "200": {description: trace}
  /chief-of-staff/requests:
    post:
      responses:
        "202": {description: request}
  /chief-of-staff/reviews/evolution-proposals:
    post:
      responses:
        "202": {description: evolution review}
  /chief-of-staff/reviews/governance:
    post:
      responses:
        "202": {description: governance review}
  /chief-of-staff/reviews/evaluation:
    post:
      responses:
        "202": {description: evaluation review}
  /chief-of-staff/reviews/new-agent-proposals:
    post:
      responses:
        "202": {description: new agent review}
  /governance/evaluate:
    post:
      responses:
        "200": {description: governance}
  /observability/traces:
    post:
      responses:
        "202": {description: trace}
  /evolution/proposals:
    post:
      responses:
        "202": {description: evolution}
  /evolution/proposals/{proposal_id}/status:
    get:
      responses:
        "200": {description: evolution status}
  /agents:
    get:
      responses:
        "200": {description: agents}
  /agents/{agent_id}:
    get:
      responses:
        "200": {description: agent}
  /profiles/{profile_id}:
    get:
      responses:
        "200": {description: profile}
""",
            )

            report = napoleon_contract_alignment.build_alignment_report(local, napoleon)

        self.assertEqual(
            report["supportedAdvisoryRuntimePaths"],
            ["/cos/capabilities", "/cos/descriptor", "/cos/text-turn", "/cos/trace/{trace_id}"],
        )
        self.assertEqual(
            report["supportedReviewRuntimePaths"],
            [
                "/chief-of-staff/requests",
                "/chief-of-staff/reviews/evaluation",
                "/chief-of-staff/reviews/evolution-proposals",
                "/chief-of-staff/reviews/governance",
                "/chief-of-staff/reviews/new-agent-proposals",
                "/evolution/proposals",
                "/evolution/proposals/{proposal_id}/status",
                "/governance/evaluate",
                "/observability/traces",
            ],
        )
        self.assertEqual(
            report["supportedDiscoveryRuntimePaths"],
            ["/agents", "/agents/{agent_id}", "/profiles/{profile_id}"],
        )
        self.assertEqual(report["napoleonDiscoveryPathsNeedingRuntimeMapping"], [])
        self.assertEqual(report["conciergeReviewPathsMissingFromNapoleonRuntime"], [])
        self.assertEqual(report["conciergeReviewOperationsMissingFromNapoleonRuntime"], [])
        self.assertEqual(report["napoleonRequiredActions"], [])
        self.assertEqual(report["napoleonRequiredActionCount"], 0)
        self.assertFalse(report["blockingLivePromotion"])
        self.assertTrue(report["runtimeAligned"])
        self.assertEqual(report["alignmentStatus"], "runtime_mapped_with_local_contract_paths")
        self.assertEqual(report["unmappedNapoleonRuntimePaths"], [])
        self.assertIn("/chief-of-staff/reviews/evolution-proposals", report["napoleonReviewContractPaths"])
        self.assertEqual(
            report["napoleonDiscoveryContractPaths"],
            ["/agents", "/agents/{agent_id}", "/profiles/{profile_id}"],
        )
        self.assertNotIn("/chief-of-staff/requests", report["napoleonReviewPathsNeedingRuntimeMapping"])
        self.assertNotIn("/chief-of-staff/reviews/evaluation", report["napoleonReviewPathsNeedingRuntimeMapping"])
        self.assertNotIn("/chief-of-staff/reviews/evolution-proposals", report["napoleonReviewPathsNeedingRuntimeMapping"])
        self.assertNotIn("/chief-of-staff/reviews/governance", report["napoleonReviewPathsNeedingRuntimeMapping"])
        self.assertNotIn("/chief-of-staff/reviews/new-agent-proposals", report["napoleonReviewPathsNeedingRuntimeMapping"])
        self.assertNotIn("/evolution/proposals", report["napoleonReviewPathsNeedingRuntimeMapping"])
        self.assertNotIn("/evolution/proposals/{proposal_id}/status", report["napoleonReviewPathsNeedingRuntimeMapping"])
        self.assertNotIn("/governance/evaluate", report["napoleonReviewPathsNeedingRuntimeMapping"])
        self.assertNotIn("/observability/traces", report["napoleonReviewPathsNeedingRuntimeMapping"])
        self.assertNotIn("/observability/traces", report["napoleonReviewPathsWithoutLocalAlias"])
        self.assertNotIn("/evolution/proposals", report["napoleonReviewPathsWithoutLocalAlias"])
        self.assertNotIn("/evolution/proposals/{proposal_id}/status", report["napoleonReviewPathsWithoutLocalAlias"])
        steering_alias = next(
            alias
            for alias in report["conciergeLocalHandoffAliases"]
            if alias["localOperation"] == "chief_of_staff_steering"
        )
        self.assertEqual(steering_alias["runtimeMappingStatus"], "explicit_napoleon_runtime_paths_supported")
        self.assertIn("/chief-of-staff/reviews/governance", steering_alias["napoleonContractPaths"])
        self.assertFalse(steering_alias["sideEffectsPerformed"])
        evaluator_alias = next(
            alias for alias in report["conciergeLocalHandoffAliases"] if alias["localOperation"] == "evaluate"
        )
        self.assertEqual(evaluator_alias["runtimeMappingStatus"], "explicit_napoleon_runtime_paths_supported")
        capability_alias = next(
            alias
            for alias in report["conciergeLocalHandoffAliases"]
            if alias["localOperation"] == "chief_of_staff_capabilities"
        )
        self.assertEqual(capability_alias["runtimeMappingStatus"], "explicit_metadata_discovery_paths_supported")
        self.assertFalse(capability_alias["agentDispatchPerformed"])


if __name__ == "__main__":
    unittest.main()
