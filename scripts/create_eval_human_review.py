#!/usr/bin/env python3
"""Create a local human review record for evaluator promotion decisions."""

from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REPORT = ROOT / "evaluator/reports/latest.json"
DEFAULT_BASELINE = ROOT / "evaluator/reports/accepted_baseline.json"
DEFAULT_OUT = ROOT / "evaluator/reports/human_review.md"

VALID_DECISIONS = ("approve", "reject", "request_revision")
BOUNDARY = (
    "This is a local human review record only. It is not Napoleon approval, "
    "not release approval unless the release process says so, not a memory "
    "write, not an external send, not agent dispatch, and not permission to "
    "apply self-evolution changes."
)


def load_json(path: Path, label: str) -> dict[str, Any]:
    if not path.exists():
        raise SystemExit(f"{label} not found: {path}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"{label} is not valid JSON: {path}: {exc}") from exc


def count_items(report: dict[str, Any], key: str) -> int:
    value = report.get(key, [])
    return len(value) if isinstance(value, list) else 0


def relative(path: Path) -> str:
    return str(path.relative_to(ROOT) if path.is_relative_to(ROOT) else path)


def checkbox(checked: bool, text: str) -> str:
    marker = "x" if checked else " "
    return f"- [{marker}] {text}"


def render_review(
    report: dict[str, Any],
    report_path: Path,
    baseline: dict[str, Any] | None,
    baseline_path: Path | None,
    reviewer: str,
    decision: str,
    generated_at: str,
) -> str:
    hard_fail_count = count_items(report, "hard_fails")
    missing_artifact_count = count_items(report, "missing_artifacts")
    regression_count = count_items(report, "regressions")
    score = report.get("score_total", "unknown")
    run_id = report.get("run_id", "unknown")
    mode = report.get("mode", "unknown")
    scenario_count = report.get("scenario_count", "unknown")

    baseline_run_id = "not supplied"
    baseline_score = "not supplied"
    baseline_source = "not supplied"
    if baseline is not None and baseline_path is not None:
        acceptance = baseline.get("baseline_acceptance", {})
        baseline_run_id = str(baseline.get("run_id", acceptance.get("accepted_from_run_id", "unknown")))
        baseline_score = str(baseline.get("score_total", "unknown"))
        baseline_source = relative(baseline_path)

    safe_for_local_promotion = (
        hard_fail_count == 0
        and missing_artifact_count == 0
        and regression_count == 0
        and decision == "approve"
    )

    lines = [
        "# Evaluator Human Review Record",
        "",
        "## Review Boundary",
        "",
        BOUNDARY,
        "",
        "## Evaluator Run",
        "",
        f"- Report: `{relative(report_path)}`",
        f"- Run ID: `{run_id}`",
        f"- Mode: `{mode}`",
        f"- Scenario count: `{scenario_count}`",
        f"- Score total: `{score}`",
        f"- Hard failure count: `{hard_fail_count}`",
        f"- Missing artifact count: `{missing_artifact_count}`",
        f"- Regression count: `{regression_count}`",
        "",
        "## Baseline",
        "",
        f"- Baseline report: `{baseline_source}`",
        f"- Baseline run ID: `{baseline_run_id}`",
        f"- Baseline score total: `{baseline_score}`",
        "",
        "## Human Decision",
        "",
        f"- Reviewer: `{reviewer}`",
        f"- Review generated at: `{generated_at}`",
        "- Reviewed at: `TBD`",
        f"- Decision: `{decision}`",
        "- Allowed values: `approve`, `reject`, `request_revision`",
        "- Notes: `TBD`",
        "- Follow-up actions: `TBD`",
        "",
        "## Required Checklist",
        "",
        checkbox(hard_fail_count == 0, "No evaluator hard failures."),
        checkbox(missing_artifact_count == 0, "No missing required artifacts."),
        checkbox(regression_count == 0, "No regressions against the accepted baseline."),
        checkbox(True, "Napoleon remains the authority for governance, memory, routing, registry, delegation, and evolution approval."),
        checkbox(True, "Concierge did not gain direct tool, memory, external-send, shell, service, or agent-dispatch authority."),
        checkbox(True, "Rehearsal Mode remains local and does not contact Napoleon."),
        checkbox(True, "Memory review, capability recommendations, taxonomy edits, and self-evolution remain proposal-only."),
        checkbox(True, "Child protected mode remains stricter than adult owner mode."),
        checkbox(True, "Local acknowledgement is not Napoleon approval."),
        "",
        "## Promotion Result",
        "",
        f"- Locally safe to consider for promotion: `{str(safe_for_local_promotion).lower()}`",
        "- Promotion remains blocked unless this record is reviewed by a human and any required Napoleon/release process also approves it.",
        "",
    ]
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", default=str(DEFAULT_REPORT), help="evaluator report to review")
    parser.add_argument("--baseline", default=str(DEFAULT_BASELINE), help="accepted baseline report")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="markdown review record output path")
    parser.add_argument("--reviewer", default="TBD", help="human reviewer name")
    parser.add_argument("--decision", choices=VALID_DECISIONS, default="request_revision", help="initial human decision")
    parser.add_argument("--generated-at", default=None, help="UTC timestamp for deterministic tests")
    args = parser.parse_args(argv)

    report_path = Path(args.report)
    baseline_path = Path(args.baseline)
    out = Path(args.out)
    report = load_json(report_path, "Evaluator report")
    baseline = load_json(baseline_path, "Accepted baseline") if baseline_path.exists() else None
    baseline_arg = baseline_path if baseline is not None else None
    generated_at = args.generated_at or dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    review = render_review(
        report=report,
        report_path=report_path,
        baseline=baseline,
        baseline_path=baseline_arg,
        reviewer=args.reviewer,
        decision=args.decision,
        generated_at=generated_at,
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(review, encoding="utf-8")
    print(json.dumps({
        "out": str(out),
        "run_id": report.get("run_id", "unknown"),
        "decision": args.decision,
        "boundary": BOUNDARY,
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
