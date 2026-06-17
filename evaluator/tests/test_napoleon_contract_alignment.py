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


if __name__ == "__main__":
    unittest.main()
