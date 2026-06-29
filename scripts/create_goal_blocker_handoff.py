#!/usr/bin/env python3
"""Render a copyable handoff from the local goal-completion audit blockers."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


EXPECTED_KIND = "concierge.goal-completion-audit.v1"


def _require_mapping(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be an object")
    return value


def _bool_word(value: Any) -> str:
    return "yes" if value is True else "no"


def _false_flag_line(action: dict[str, Any], key: str) -> str:
    value = action.get(key)
    if value is not False:
        raise ValueError(f"napoleonRequiredAction.{key} must be false")
    return f"- {key}: false"


def render_handoff(audit: dict[str, Any]) -> str:
    if audit.get("kind") != EXPECTED_KIND:
        raise ValueError(f"audit kind must be {EXPECTED_KIND}")
    blockers = audit.get("blockers")
    if not isinstance(blockers, list):
        raise ValueError("audit blockers must be a list")

    lines = [
        "# Concierge Goal Blocker Handoff",
        "",
        f"Overall status: {audit.get('overallStatus', 'unknown')}",
        f"Blocker count: {audit.get('blockerCount', len(blockers))}",
        "",
    ]
    if not blockers:
        lines.extend(
            [
                "No current blockers are reported by the local goal-completion audit.",
                "",
            ]
        )
    for index, blocker_value in enumerate(blockers, start=1):
        blocker = _require_mapping(blocker_value, f"blocker {index}")
        action = _require_mapping(blocker.get("napoleonRequiredAction", {}), "napoleonRequiredAction")
        validation = blocker.get("validation")
        if not isinstance(validation, list) or not all(isinstance(item, str) for item in validation):
            raise ValueError("blocker validation must be a list of strings")
        advertise_using = action.get("advertiseUsing", [])
        if not isinstance(advertise_using, list) or not all(isinstance(item, str) for item in advertise_using):
            raise ValueError("napoleonRequiredAction.advertiseUsing must be a list of strings")

        lines.extend(
            [
                f"## Blocker {index}: {blocker.get('requirementId', 'unknown')}",
                "",
                f"Owner: {blocker.get('owner', 'unknown')}",
                f"External blocker: {_bool_word(blocker.get('external'))}",
                f"Required action: {action.get('id', 'unknown')}",
                f"Operation: {action.get('operationId', 'unknown')}",
                f"Target path: {action.get('targetPath', 'unknown')}",
                f"Request kind: {action.get('requestKind', 'unknown')}",
                f"Advertise using: {', '.join(advertise_using) if advertise_using else 'unknown'}",
                f"Blocking live promotion: {_bool_word(action.get('blockingLivePromotion'))}",
                "",
                "Next action:",
                f"- {blocker.get('nextAction', 'No next action supplied.')}",
                "",
                "Validation after Napoleon changes:",
            ]
        )
        lines.extend(f"- {item}" for item in validation)
        lines.extend(
            [
                "",
                "Required false side-effect flags:",
                _false_flag_line(action, "approvalCaptured"),
                _false_flag_line(action, "memoryWritePerformed"),
                _false_flag_line(action, "agentDispatchPerformed"),
                _false_flag_line(action, "externalSendPerformed"),
                _false_flag_line(action, "appliedLocally"),
                "",
            ]
        )

    lines.extend(
        [
            "Boundary:",
            "This handoff is local evidence only. It does not contact Napoleon, approve anything, write memory, dispatch agents, send externally, apply evolution, or grant runtime authority.",
            "",
        ]
    )
    return "\n".join(lines)


def write_handoff(audit_path: Path, out_path: Path) -> Path:
    audit = json.loads(audit_path.read_text(encoding="utf-8"))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(render_handoff(_require_mapping(audit, "audit")) + "\n", encoding="utf-8")
    return out_path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audit", type=Path, required=True, help="Path to concierge-goal-completion-audit.json")
    parser.add_argument("--out", type=Path, required=True, help="Markdown handoff output path")
    args = parser.parse_args()

    out = write_handoff(args.audit, args.out)
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
