import json
import tempfile
import unittest
from pathlib import Path

from scripts import create_goal_blocker_handoff


class GoalBlockerHandoffTests(unittest.TestCase):
    def test_render_handoff_includes_sanitized_blocker_details(self):
        audit = {
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

        rendered = create_goal_blocker_handoff.render_handoff(audit)

        self.assertIn("# Concierge Goal Blocker Handoff", rendered)
        self.assertIn("Overall status: goal_not_complete", rendered)
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


if __name__ == "__main__":
    unittest.main()
