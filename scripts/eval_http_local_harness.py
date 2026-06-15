#!/usr/bin/env python3
"""Run evaluator HTTP mode against the local Napoleon-compatible harness."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    from scripts import local_bridge_harness
except ImportError:
    import local_bridge_harness


ROOT = Path(__file__).resolve().parents[1]
EVALUATOR = ROOT / "evaluator"

LOCAL_HARNESS_RUNTIME_VALIDATION = {
    "source": "local_harness",
    "caveat": "Local harness evaluator HTTP validation is not real Napoleon runtime validation.",
    "authorityBoundary": (
        "This report proves local evaluator transport plumbing against a Napoleon-compatible "
        "test harness only; it does not prove live Napoleon governance, routing, memory, or approval behavior."
    ),
}


def label_local_harness_report(path: str) -> None:
    report_path = Path(path)
    report = json.loads(report_path.read_text(encoding="utf-8"))
    report["runtimeValidation"] = LOCAL_HARNESS_RUNTIME_VALIDATION
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="/tmp/concierge-eval-http-local-harness.json")
    args = parser.parse_args(argv)

    if str(EVALUATOR) not in sys.path:
        sys.path.insert(0, str(EVALUATOR))
    from eval_runner import main as run_evaluator

    with local_bridge_harness.running_harness() as base_url:
        exit_code = run_evaluator(
            [
                "--mode",
                "http",
                "--endpoint",
                f"{base_url}/v1/concierge/evaluate",
                "--out",
                args.out,
            ]
        )
    label_local_harness_report(args.out)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
