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
        self.assertEqual(report["napoleonOnlyPaths"], [])
        self.assertEqual(report["conciergeOnlyPaths"], [])

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
                "/chief-of-staff/reviews/evaluation",
                "/chief-of-staff/reviews/evolution-proposals",
                "/chief-of-staff/reviews/governance",
            ],
        )
        self.assertIn("/chief-of-staff/reviews/evolution-proposals", report["napoleonReviewContractPaths"])
        self.assertIn("/evolution/proposals", report["napoleonReviewPathsNeedingRuntimeMapping"])
        self.assertIn("/observability/traces", report["napoleonReviewPathsNeedingRuntimeMapping"])
        self.assertNotIn("/chief-of-staff/reviews/evaluation", report["napoleonReviewPathsNeedingRuntimeMapping"])
        self.assertNotIn("/chief-of-staff/reviews/evolution-proposals", report["napoleonReviewPathsNeedingRuntimeMapping"])
        self.assertNotIn("/chief-of-staff/reviews/governance", report["napoleonReviewPathsNeedingRuntimeMapping"])
        self.assertIn("/chief-of-staff/requests", report["napoleonReviewPathsWithoutLocalAlias"])
        self.assertIn("/chief-of-staff/reviews/new-agent-proposals", report["napoleonReviewPathsWithoutLocalAlias"])
        self.assertIn("/observability/traces", report["napoleonReviewPathsWithoutLocalAlias"])
        self.assertNotIn("/evolution/proposals", report["napoleonReviewPathsWithoutLocalAlias"])
        steering_alias = next(
            alias
            for alias in report["conciergeLocalHandoffAliases"]
            if alias["localOperation"] == "chief_of_staff_steering"
        )
        self.assertEqual(steering_alias["runtimeMappingStatus"], "local_alias_not_explicit_napoleon_runtime_path")
        self.assertIn("/chief-of-staff/reviews/governance", steering_alias["napoleonContractPaths"])
        self.assertFalse(steering_alias["sideEffectsPerformed"])


if __name__ == "__main__":
    unittest.main()
