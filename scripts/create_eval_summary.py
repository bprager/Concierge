#!/usr/bin/env python3
"""Render a concise Markdown summary from an evaluator JSON report."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REPORT = ROOT / "evaluator/reports/latest.json"
DEFAULT_REVIEW = ROOT / "evaluator/reports/human_review.md"
DEFAULT_OUT = ROOT / "evaluator/reports/summary.md"

BOUNDARY = (
    "This summary is local evaluator evidence only. It is not Napoleon approval, "
    "not release approval, not a memory write, not agent dispatch, not an "
    "external send, and not authority to apply self-evolution changes."
)


def load_report(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise SystemExit(f"Evaluator report not found: {path}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Evaluator report is not valid JSON: {path}: {exc}") from exc


def relative(path: Path) -> str:
    return str(path.relative_to(ROOT) if path.is_relative_to(ROOT) else path)


def list_or_none(items: list[str]) -> list[str]:
    return items if items else ["None"]


def case_status(case: dict[str, Any]) -> str:
    hard_fails = case.get("hard_fails", [])
    artifacts = case.get("artifact_checks", {})
    missing = [
        artifact_id
        for artifact_id, check in artifacts.items()
        if isinstance(check, dict) and not check.get("found", False)
    ]
    if hard_fails:
        return "hard_fail"
    if missing:
        return "missing_artifact"
    return "pass"


def format_table(headers: list[str], rows: list[list[str]]) -> list[str]:
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    lines.extend("| " + " | ".join(row) + " |" for row in rows)
    return lines


def render_summary(report: dict[str, Any], report_path: Path, review_path: Path | None) -> str:
    hard_fails = report.get("hard_fails", [])
    missing_artifacts = report.get("missing_artifacts", [])
    regressions = report.get("regressions", [])
    recommendations = report.get("recommendations", [])
    dimensions = report.get("dimension_scores", {})
    cases = report.get("cases", [])
    failed_cases = [case for case in cases if case_status(case) != "pass"]
    lowest_cases = sorted(cases, key=lambda case: float(case.get("score", 0)))[:5]

    review_ref = "not generated"
    if review_path is not None:
        review_ref = relative(review_path) if review_path.exists() else f"{relative(review_path)} (missing)"

    lines = [
        "# Evaluator Summary",
        "",
        "## Boundary",
        "",
        BOUNDARY,
        "",
        "## Run",
        "",
        f"- Report: `{relative(report_path)}`",
        f"- Human review record: `{review_ref}`",
        f"- Run ID: `{report.get('run_id', 'unknown')}`",
        f"- Mode: `{report.get('mode', 'unknown')}`",
        f"- Scenario count: `{report.get('scenario_count', 'unknown')}`",
        f"- Score total: `{report.get('score_total', 'unknown')}`",
        f"- Hard failure count: `{len(hard_fails)}`",
        f"- Missing artifact count: `{len(missing_artifacts)}`",
        f"- Regression count: `{len(regressions)}`",
        "",
        "## Promotion Gate",
        "",
    ]

    if hard_fails or missing_artifacts or regressions:
        lines.append("- Status: `blocked`")
        lines.append("- Reason: hard failures, missing artifacts, or regressions must be resolved or explicitly reviewed before promotion.")
    else:
        lines.append("- Status: `clean_local_evaluator_run`")
        lines.append("- Reason: no hard failures, missing artifacts, or regressions were reported.")
    lines.extend([
        "- Human review: required before promotion.",
        "- Napoleon/release approval: required when the release process or governed endpoint requires it.",
        "",
        "## Dimension Scores",
        "",
    ])

    dimension_rows = [[name, str(score)] for name, score in sorted(dimensions.items())]
    lines.extend(format_table(["Dimension", "Score"], dimension_rows or [["None", "n/a"]]))

    lines.extend([
        "",
        "## Findings",
        "",
        "### Hard Failures",
        "",
    ])
    for item in list_or_none([f"{fail.get('case_id', 'unknown')}: {fail.get('message', fail.get('id', 'unknown'))}" for fail in hard_fails]):
        lines.append(f"- {item}")

    lines.extend([
        "",
        "### Missing Artifacts",
        "",
    ])
    for item in list_or_none([str(item) for item in missing_artifacts]):
        lines.append(f"- {item}")

    lines.extend([
        "",
        "### Regressions",
        "",
    ])
    for item in list_or_none([
        f"{regression.get('id', 'unknown')}: {regression.get('previous', 'unknown')} -> {regression.get('current', 'unknown')}"
        for regression in regressions
    ]):
        lines.append(f"- {item}")

    lines.extend([
        "",
        "## Case Summary",
        "",
    ])
    case_rows = [
        [
            str(case.get("case_id", "unknown")),
            str(case.get("title", "")),
            str(case.get("score", "unknown")),
            case_status(case),
        ]
        for case in lowest_cases
    ]
    lines.extend(format_table(["Case", "Title", "Score", "Status"], case_rows or [["None", "", "n/a", "n/a"]]))

    if failed_cases:
        lines.extend([
            "",
            "## Failed Or Incomplete Cases",
            "",
        ])
        for case in failed_cases:
            lines.append(f"- `{case.get('case_id', 'unknown')}`: {case_status(case)}")

    lines.extend([
        "",
        "## Recommendations",
        "",
    ])
    for item in list_or_none([str(item) for item in recommendations]):
        lines.append(f"- {item}")

    lines.append("")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", default=str(DEFAULT_REPORT), help="evaluator JSON report to summarize")
    parser.add_argument("--review", default=str(DEFAULT_REVIEW), help="human review record to reference")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="Markdown summary output path")
    args = parser.parse_args(argv)

    report_path = Path(args.report)
    review_path = Path(args.review) if args.review else None
    out = Path(args.out)
    report = load_report(report_path)
    summary = render_summary(report, report_path, review_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(summary, encoding="utf-8")
    print(json.dumps({
        "out": str(out),
        "run_id": report.get("run_id", "unknown"),
        "hard_fail_count": len(report.get("hard_fails", [])),
        "missing_artifact_count": len(report.get("missing_artifacts", [])),
        "regression_count": len(report.get("regressions", [])),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
