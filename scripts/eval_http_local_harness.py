#!/usr/bin/env python3
"""Run evaluator HTTP mode against the local Napoleon-compatible harness."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from scripts import local_bridge_harness
except ImportError:
    import local_bridge_harness


ROOT = Path(__file__).resolve().parents[1]
EVALUATOR = ROOT / "evaluator"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="/tmp/concierge-eval-http-local-harness.json")
    args = parser.parse_args(argv)

    if str(EVALUATOR) not in sys.path:
        sys.path.insert(0, str(EVALUATOR))
    from eval_runner import main as run_evaluator

    with local_bridge_harness.running_harness() as base_url:
        return run_evaluator(
            [
                "--mode",
                "http",
                "--endpoint",
                f"{base_url}/v1/concierge/evaluate",
                "--out",
                args.out,
            ]
        )


if __name__ == "__main__":
    raise SystemExit(main())
