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


def _safe_string(value: Any, default: str = "unknown") -> str:
    return value if isinstance(value, str) and value else default


def _safe_string_list(value: Any) -> list[str]:
    return [item for item in value if isinstance(item, str)] if isinstance(value, list) else []


def _false_flag_line(action: dict[str, Any], key: str) -> str:
    value = action.get(key)
    if value is not False:
        raise ValueError(f"napoleonRequiredAction.{key} must be false")
    return f"- {key}: false"


def _alignment_evidence_lines(audit: dict[str, Any]) -> list[str]:
    evidence = audit.get("alignmentEvidence")
    if not isinstance(evidence, dict) or evidence.get("loaded") is not True:
        return []
    missing_targets = _safe_string_list(evidence.get("missingRuntimeTargets"))
    return [
        "Alignment evidence:",
        f"- Alignment status: {_safe_string(evidence.get('alignmentStatus'))}",
        f"- Runtime aligned: {_bool_word(evidence.get('runtimeAligned'))}",
        f"- Blocking live promotion: {_bool_word(evidence.get('blockingLivePromotion'))}",
        f"- Napoleon required-action count: {evidence.get('napoleonRequiredActionCount') if isinstance(evidence.get('napoleonRequiredActionCount'), int) else 'unknown'}",
        f"- Missing runtime targets: {', '.join(missing_targets) if missing_targets else 'none listed'}",
        f"- Can clear evolution-status blocker: {_bool_word(evidence.get('canClearEvolutionStatusBlocker'))}",
        "- Non-authority boundary: alignment_report_only",
        "",
    ]


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
    lines.extend(_alignment_evidence_lines(audit))
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


def render_goal_prompt(audit: dict[str, Any]) -> str:
    if audit.get("kind") != EXPECTED_KIND:
        raise ValueError(f"audit kind must be {EXPECTED_KIND}")
    blockers = audit.get("blockers")
    if not isinstance(blockers, list):
        raise ValueError("audit blockers must be a list")
    if not blockers:
        return "\n".join(
            [
                "Goal: Verify Concierge goal completion.",
                "",
                "The local goal-completion audit reports no current blockers. Run make check, make eval, and make goal-completion-audit before closing the Concierge/Napoleon UI goal.",
                "",
            ]
        )

    blocker = _require_mapping(blockers[0], "blocker 1")
    action = _require_mapping(blocker.get("napoleonRequiredAction", {}), "napoleonRequiredAction")
    advertise_using = action.get("advertiseUsing", [])
    if not isinstance(advertise_using, list) or not all(isinstance(item, str) for item in advertise_using):
        raise ValueError("napoleonRequiredAction.advertiseUsing must be a list of strings")
    for key in (
        "approvalCaptured",
        "memoryWritePerformed",
        "agentDispatchPerformed",
        "externalSendPerformed",
        "appliedLocally",
    ):
        _false_flag_line(action, key)

    target_path = action.get("targetPath", "unknown")
    request_kind = action.get("requestKind", "unknown")
    operation_id = action.get("operationId", "unknown")
    advertising = ", ".join(advertise_using) if advertise_using else "supportedHandoffs, required_for"
    alignment_evidence = audit.get("alignmentEvidence")
    missing_targets: list[str] = []
    if isinstance(alignment_evidence, dict):
        missing_targets = _safe_string_list(alignment_evidence.get("missingRuntimeTargets"))

    lines = [
        "Goal: Complete the remaining Concierge live-promotion blocker.",
        "",
        "Context:",
        "Concierge is the primary UI for Napoleon, but Napoleon owns authority, governance, memory, routing, registry, and evolution approval. Concierge may display, export, and validate status only.",
        "",
        "Current Concierge evidence:",
        f"- Alignment status: {_safe_string(alignment_evidence.get('alignmentStatus') if isinstance(alignment_evidence, dict) else None)}.",
        f"- Runtime aligned: {_bool_word(alignment_evidence.get('runtimeAligned') if isinstance(alignment_evidence, dict) else None)}.",
        f"- Missing runtime target: {missing_targets[0] if missing_targets else target_path}.",
        "",
        "Objective:",
        "Implement and advertise the Napoleon-owned read-only evolution proposal status handoff required by Concierge.",
        "",
        "Required capability:",
        f"- Expose read-only GET {target_path}.",
        f"- Support request kind {request_kind}.",
        f"- Support operation {operation_id}.",
        f"- Advertise it through {advertising}.",
        "- Return enough status evidence for pending, approved, rejected, applied, rolled back, stale, unavailable, or unknown.",
        "- Do not let Concierge apply proposals, capture approvals, write memory, dispatch agents, send externally, route tasks, update registries, append traces, or perform side effects.",
        "",
        "Acceptance:",
        "- Concierge contract alignment no longer reports this runtime gap.",
        "- make goal-completion-audit reports no external blocker for evolution proposal status.",
        "- Live evaluator validation can prove the status target is reachable and governed.",
        "- Concierge-side effect flags remain false.",
        "",
        "Validation:",
        "1. NAPOLEON_CONTRACT_OPENAPI=/path/to/concierge-integration.openapi.yaml make napoleon-contract-alignment",
        "2. make goal-completion-audit",
        "3. NAPOLEON_EVAL_ENDPOINT=<local Napoleon URL> make eval-http",
        "4. make check",
        "",
        "Expected outcome:",
        "The Concierge goal audit can close without Concierge taking over Napoleon authority.",
        "",
    ]
    rendered = "\n".join(lines)
    if len(rendered) >= 4000:
        raise ValueError("goal prompt must be shorter than 4000 characters")
    return rendered


def write_handoff(audit_path: Path, out_path: Path) -> Path:
    audit = json.loads(audit_path.read_text(encoding="utf-8"))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(render_handoff(_require_mapping(audit, "audit")) + "\n", encoding="utf-8")
    return out_path


def write_goal_prompt(audit_path: Path, out_path: Path) -> Path:
    audit = json.loads(audit_path.read_text(encoding="utf-8"))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(render_goal_prompt(_require_mapping(audit, "audit")) + "\n", encoding="utf-8")
    return out_path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audit", type=Path, required=True, help="Path to concierge-goal-completion-audit.json")
    parser.add_argument("--out", type=Path, required=True, help="Markdown handoff output path")
    parser.add_argument(
        "--format",
        choices=("handoff", "goal-prompt"),
        default="handoff",
        help="Output format to render",
    )
    args = parser.parse_args()

    if args.format == "goal-prompt":
        out = write_goal_prompt(args.audit, args.out)
    else:
        out = write_handoff(args.audit, args.out)
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
