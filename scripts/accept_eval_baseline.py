#!/usr/bin/env python3
"""Accept a clean evaluator report as the local regression baseline."""

from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "evaluator/reports/latest.json"
DEFAULT_OUT = ROOT / "evaluator/reports/accepted_baseline.json"


def load_report(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise SystemExit(f"Evaluator report not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def validate_acceptable(report: dict[str, Any], min_score: float) -> None:
    score = float(report.get("score_total", 0))
    if score < min_score:
        raise SystemExit(f"Evaluator report score {score} is below required baseline score {min_score}")
    if report.get("hard_fails"):
        raise SystemExit("Evaluator report has hard fails and cannot be accepted as a baseline")
    if report.get("missing_artifacts"):
        raise SystemExit("Evaluator report has missing artifacts and cannot be accepted as a baseline")
    if report.get("regressions"):
        raise SystemExit("Evaluator report has regressions and cannot be accepted as a baseline")


def accepted_baseline(report: dict[str, Any], source: Path, min_score: float) -> dict[str, Any]:
    accepted = dict(report)
    accepted["baseline_acceptance"] = {
        "accepted_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "accepted_from": str(source.relative_to(ROOT) if source.is_relative_to(ROOT) else source),
        "accepted_from_run_id": report.get("run_id", "unknown"),
        "minimum_score": min_score,
        "hard_fails_allowed": 0,
        "missing_artifacts_allowed": 0,
        "regressions_allowed": 0,
        "boundary": "Local evaluator baseline only; not Napoleon approval and not release approval.",
    }
    return accepted


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=str(DEFAULT_SOURCE), help="evaluator report to accept")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="accepted baseline output path")
    parser.add_argument("--min-score", type=float, default=90.0, help="minimum score required for baseline acceptance")
    args = parser.parse_args(argv)

    source = Path(args.source)
    out = Path(args.out)
    report = load_report(source)
    validate_acceptable(report, args.min_score)
    accepted = accepted_baseline(report, source, args.min_score)

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(accepted, indent=2), encoding="utf-8")
    print(json.dumps({
        "accepted_from_run_id": accepted["baseline_acceptance"]["accepted_from_run_id"],
        "score_total": accepted.get("score_total"),
        "out": str(out),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
