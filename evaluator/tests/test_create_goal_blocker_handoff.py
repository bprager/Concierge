import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from scripts import create_goal_blocker_handoff


class GoalBlockerHandoffTests(unittest.TestCase):
    def test_render_handoff_includes_sanitized_blocker_details(self):
        audit = _sample_audit()
        audit["alignmentEvidence"] = {
            "loaded": True,
            "alignmentStatus": "runtime_mapping_gaps_present",
            "runtimeAligned": False,
            "blockingLivePromotion": True,
            "napoleonRequiredActionCount": 1,
            "missingRuntimeTargets": ["/evolution/proposals/{proposal_id}/status"],
            "path": "/tmp/concierge-napoleon-alignment-current.json",
            "canClearEvolutionStatusBlocker": False,
            "nonAuthorityBoundary": "alignment_report_only",
        }

        rendered = create_goal_blocker_handoff.render_handoff(audit)

        self.assertIn("# Concierge Goal Blocker Handoff", rendered)
        self.assertIn("Overall status: goal_not_complete", rendered)
        self.assertIn("Alignment evidence:", rendered)
        self.assertIn("Alignment status: runtime_mapping_gaps_present", rendered)
        self.assertIn("Runtime aligned: no", rendered)
        self.assertIn("Missing runtime targets: /evolution/proposals/{proposal_id}/status", rendered)
        self.assertIn("Owner: napoleon_runtime", rendered)
        self.assertIn("Target path: /evolution/proposals/{proposal_id}/status", rendered)
        self.assertIn("Request kind: evolution_proposal_status_handoff", rendered)
        self.assertIn("Advertise using: supportedHandoffs, required_for", rendered)
        self.assertIn("Blocking live promotion: yes", rendered)
        self.assertIn("approvalCaptured: false", rendered)
        self.assertIn("memoryWritePerformed: false", rendered)
        self.assertIn("agentDispatchPerformed: false", rendered)
        self.assertIn("externalSendPerformed: false", rendered)
        self.assertIn("appliedLocally: false", rendered)
        self.assertIn("- make check", rendered)
        self.assertIn("This handoff is local evidence only.", rendered)

    def test_render_handoff_includes_local_runtime_token_handoff_without_secret_path(self):
        audit = _sample_audit()
        audit["blockerCount"] = 2
        audit["blockers"].append(
            {
                "requirementId": "runtime_handoff_token_access",
                "owner": "concierge_operator",
                "external": False,
                "nextAction": "Provision approved runtime token-file access without copying token values.",
                "validation": ["make runtime-handoff-status", "make goal-completion-audit", "make check"],
                "runtimeTokenHandoff": {
                    "tokenFileConfigured": True,
                    "tokenFileReadable": False,
                    "tokenRemotePresent": True,
                    "tokenLocalReadableDeclared": False,
                    "tokenRemoteReadableByOperator": False,
                    "tokenRetained": False,
                    "tokenFilePathRetained": False,
                },
            }
        )

        rendered = create_goal_blocker_handoff.render_handoff(audit)

        self.assertIn("## Blocker 2: runtime_handoff_token_access", rendered)
        self.assertIn("Owner: concierge_operator", rendered)
        self.assertIn("Runtime token handoff:", rendered)
        self.assertIn("- tokenFileConfigured: yes", rendered)
        self.assertIn("- tokenFileReadable: no", rendered)
        self.assertIn("- tokenRemotePresent: yes", rendered)
        self.assertIn("- tokenLocalReadableDeclared: no", rendered)
        self.assertIn("- tokenRemoteReadableByOperator: no", rendered)
        self.assertIn("- tokenRetained: no", rendered)
        self.assertIn("- tokenFilePathRetained: no", rendered)
        self.assertNotIn("napoleon-runtime-pilot-auth-token", rendered)
        self.assertNotIn("/private/tmp", rendered)

    def test_invalid_audit_kind_is_rejected(self):
        with self.assertRaises(ValueError):
            create_goal_blocker_handoff.render_handoff({"kind": "wrong"})

    def test_writes_handoff_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            audit_path = Path(tmp) / "audit.json"
            out_path = Path(tmp) / "handoff.md"
            audit_path.write_text(
                json.dumps(
                    {
                        "kind": "concierge.goal-completion-audit.v1",
                        "overallStatus": "all_local_evidence_present",
                        "blockerCount": 0,
                        "blockers": [],
                    }
                ),
                encoding="utf-8",
            )

            written = create_goal_blocker_handoff.write_handoff(audit_path, out_path)

            self.assertEqual(written, out_path)
            self.assertIn("No current blockers", out_path.read_text(encoding="utf-8"))

    def test_render_goal_prompt_is_copyable_and_under_goal_limit(self):
        audit = _sample_audit()
        audit["alignmentEvidence"] = {
            "loaded": True,
            "alignmentStatus": "runtime_mapping_gaps_present",
            "runtimeAligned": False,
            "blockingLivePromotion": True,
            "napoleonRequiredActionCount": 1,
            "missingRuntimeTargets": ["/evolution/proposals/{proposal_id}/status"],
            "path": "/tmp/concierge-napoleon-alignment-current.json",
            "canClearEvolutionStatusBlocker": False,
            "nonAuthorityBoundary": "alignment_report_only",
        }

        rendered = create_goal_blocker_handoff.render_goal_prompt(audit)

        self.assertLess(len(rendered), 4000)
        self.assertIn("Goal: Complete the remaining Concierge live-promotion blocker.", rendered)
        self.assertIn("Current Concierge evidence:", rendered)
        self.assertIn("Alignment status: runtime_mapping_gaps_present", rendered)
        self.assertIn("Runtime aligned: no", rendered)
        self.assertIn("Missing runtime target: /evolution/proposals/{proposal_id}/status", rendered)
        self.assertIn("/evolution/proposals/{proposal_id}/status", rendered)
        self.assertIn("evolution_proposal_status_handoff", rendered)
        self.assertIn("supportedHandoffs", rendered)
        self.assertIn("required_for", rendered)
        self.assertIn("Do not let Concierge apply proposals", rendered)
        self.assertIn("make napoleon-contract-alignment", rendered)
        self.assertIn("make goal-completion-audit", rendered)
        self.assertIn("make eval-http", rendered)
        self.assertIn("make check", rendered)

    def test_writes_goal_prompt_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            audit_path = Path(tmp) / "audit.json"
            out_path = Path(tmp) / "goal.md"
            audit_path.write_text(json.dumps(_sample_audit()), encoding="utf-8")

            written = create_goal_blocker_handoff.write_goal_prompt(audit_path, out_path)

            self.assertEqual(written, out_path)
            text = out_path.read_text(encoding="utf-8")
            self.assertLess(len(text), 4000)
            self.assertIn("Goal: Complete the remaining Concierge live-promotion blocker.", text)

    def test_rejects_goal_prompt_file_that_reaches_goal_limit_after_trailing_newline(self):
        with tempfile.TemporaryDirectory() as tmp:
            audit_path = Path(tmp) / "audit.json"
            out_path = Path(tmp) / "goal.md"
            audit_path.write_text(json.dumps(_sample_audit()), encoding="utf-8")

            with mock.patch.object(create_goal_blocker_handoff, "render_goal_prompt", return_value="x" * 3999):
                with self.assertRaises(ValueError):
                    create_goal_blocker_handoff.write_goal_prompt(audit_path, out_path)

    def test_writes_largest_goal_prompt_file_below_goal_limit(self):
        with tempfile.TemporaryDirectory() as tmp:
            audit_path = Path(tmp) / "audit.json"
            out_path = Path(tmp) / "goal.md"
            audit_path.write_text(json.dumps(_sample_audit()), encoding="utf-8")

            with mock.patch.object(create_goal_blocker_handoff, "render_goal_prompt", return_value="x" * 3998):
                create_goal_blocker_handoff.write_goal_prompt(audit_path, out_path)

            self.assertEqual(len(out_path.read_text(encoding="utf-8")), 3999)

    def test_goal_prompt_summary_includes_character_count(self):
        with tempfile.TemporaryDirectory() as tmp:
            audit_path = Path(tmp) / "audit.json"
            out_path = Path(tmp) / "goal.md"
            audit_path.write_text(json.dumps(_sample_audit()), encoding="utf-8")

            create_goal_blocker_handoff.write_goal_prompt(audit_path, out_path)

            summary = create_goal_blocker_handoff.render_goal_prompt_summary(out_path)

            self.assertIn(str(out_path), summary)
            self.assertIn("Character count:", summary)
            self.assertIn("/4000", summary)
            self.assertIn("under limit: yes", summary)


def _sample_audit():
    return {
        "kind": "concierge.goal-completion-audit.v1",
        "overallStatus": "goal_not_complete",
        "blockerCount": 1,
        "blockers": [
            {
                "requirementId": "evolution_status_runtime_blocker",
                "owner": "napoleon_runtime",
                "external": True,
                "nextAction": "Expose and advertise the read-only target.",
                "validation": ["make goal-completion-audit", "make check"],
                "napoleonRequiredAction": {
                    "id": "expose_evolution_proposal_status_runtime_target",
                    "owner": "napoleon_runtime",
                    "operationId": "evolution_proposal_status",
                    "targetPath": "/evolution/proposals/{proposal_id}/status",
                    "requestKind": "evolution_proposal_status_handoff",
                    "advertiseUsing": ["supportedHandoffs", "required_for"],
                    "blockingLivePromotion": True,
                    "approvalCaptured": False,
                    "memoryWritePerformed": False,
                    "agentDispatchPerformed": False,
                    "externalSendPerformed": False,
                    "appliedLocally": False,
                },
            }
        ],
    }


if __name__ == "__main__":
    unittest.main()
