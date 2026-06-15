#!/usr/bin/env python3
"""Run live Napoleon runtime validation without storing raw prompts or responses."""

from __future__ import annotations

import argparse
import contextlib
import io
import json
import os
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
EVALUATOR = ROOT / "evaluator"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(EVALUATOR) not in sys.path:
    sys.path.insert(0, str(EVALUATOR))

from scripts import bridge_evidence_capture


DEFAULT_OUT_DIR = Path("/tmp/concierge-live-runtime-validation")
EVALUATOR_PATH = "/v1/concierge/evaluate"
TURN_PATH = "/v1/concierge/turn"

BOUNDARY = (
    "Live runtime validation is evidence only. It is not Napoleon approval, "
    "not release approval, not a memory write, not agent dispatch, not an "
    "external send, and not authority to apply self-evolution changes."
)
REDACTED_REPORT_FIELDS = {"response_excerpt"}


def strip_known_path(endpoint: str) -> str:
    value = endpoint.strip().rstrip("/")
    for path in [EVALUATOR_PATH, TURN_PATH]:
        if value.endswith(path):
            return value[: -len(path)].rstrip("/")
    return value


def derive_eval_endpoint(bridge_endpoint: str) -> str:
    return f"{strip_known_path(bridge_endpoint)}{EVALUATOR_PATH}"


def endpoint_from_env(env: dict[str, str], key: str) -> str | None:
    value = env.get(key)
    return value.strip() if value and value.strip() else None


def resolve_endpoints(
    bridge_endpoint: str | None,
    eval_endpoint: str | None,
    env: dict[str, str],
) -> tuple[str | None, str | None]:
    bridge = bridge_endpoint.strip() if bridge_endpoint and bridge_endpoint.strip() else endpoint_from_env(env, "NAPOLEON_BRIDGE_ENDPOINT")
    evaluator = eval_endpoint.strip() if eval_endpoint and eval_endpoint.strip() else endpoint_from_env(env, "NAPOLEON_EVAL_ENDPOINT")

    if bridge is None and evaluator is not None:
        bridge = strip_known_path(evaluator)
    if evaluator is None and bridge is not None:
        evaluator = derive_eval_endpoint(bridge)
    return bridge, evaluator


def run_bridge_capture(bridge_endpoint: str, out_path: Path, auth_token: str | None) -> tuple[int, str, str]:
    stdout = io.StringIO()
    stderr = io.StringIO()
    args = ["--endpoint", bridge_endpoint, "--out", str(out_path)]
    if auth_token:
        args.extend(["--auth-token", auth_token])
    with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
        exit_code = bridge_evidence_capture.main(args)
    return exit_code, stdout.getvalue(), stderr.getvalue()


def run_http_eval(eval_endpoint: str, out_path: Path, auth_token: str | None) -> int:
    from eval_runner import main as run_evaluator

    args = ["--mode", "http", "--endpoint", eval_endpoint, "--out", str(out_path)]
    if auth_token:
        args.extend(["--token", auth_token])
    return run_evaluator(args)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sanitize_eval_report_payload(payload: Any) -> tuple[Any, int]:
    if isinstance(payload, dict):
        removed = 0
        sanitized: dict[str, Any] = {}
        for key, value in payload.items():
            if key in REDACTED_REPORT_FIELDS:
                removed += 1
                continue
            sanitized_value, nested_removed = sanitize_eval_report_payload(value)
            removed += nested_removed
            sanitized[key] = sanitized_value
        return sanitized, removed
    if isinstance(payload, list):
        sanitized_items = []
        removed = 0
        for item in payload:
            sanitized_item, nested_removed = sanitize_eval_report_payload(item)
            sanitized_items.append(sanitized_item)
            removed += nested_removed
        return sanitized_items, removed
    return payload, 0


def sanitize_eval_report(path: Path) -> int:
    if not path.exists():
        return 0
    payload = load_json(path)
    sanitized, removed = sanitize_eval_report_payload(payload)
    if isinstance(sanitized, dict):
        sanitized["live_runtime_sanitization"] = {
            "responseExcerptsRemoved": removed,
            "boundary": "Live runtime validation report omits raw response excerpts.",
        }
    path.write_text(json.dumps(sanitized, indent=2) + "\n", encoding="utf-8")
    return removed


def count_bridge_records(path: Path) -> int:
    if not path.exists():
        return 0
    payload = load_json(path)
    if isinstance(payload, list):
        return len(payload)
    if isinstance(payload, dict) and isinstance(payload.get("records"), list):
        return len(payload["records"])
    return 0


def eval_counts(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {
            "run_id": "not_run",
            "score_total": None,
            "hard_fail_count": None,
            "missing_artifact_count": None,
            "regression_count": None,
        }
    report = load_json(path)
    return {
        "run_id": report.get("run_id", "unknown"),
        "score_total": report.get("score_total"),
        "hard_fail_count": len(report.get("hard_fails", [])),
        "missing_artifact_count": len(report.get("missing_artifacts", [])),
        "regression_count": len(report.get("regressions", [])),
    }


def write_summary(
    out_path: Path,
    bridge_exit_code: int,
    eval_exit_code: int | None,
    evidence_path: Path,
    eval_report_path: Path,
) -> dict[str, Any]:
    summary = {
        "boundary": BOUNDARY,
        "bridgeEvidence": {
            "status": "passed" if bridge_exit_code == 0 else "failed",
            "record_count": count_bridge_records(evidence_path),
            "path": str(evidence_path),
        },
        "httpEvaluator": {
            "status": "passed" if eval_exit_code == 0 else "failed" if eval_exit_code is not None else "not_run",
            "path": str(eval_report_path),
            "sanitized": eval_report_path.exists(),
            **eval_counts(eval_report_path),
        },
        "promotionBoundary": {
            "requiresHumanReview": True,
            "requiresNapoleonOrReleaseApprovalWhenApplicable": True,
            "approvalCaptured": False,
            "memoryWritePerformed": False,
            "agentDispatchPerformed": False,
            "externalSendPerformed": False,
            "appliedLocally": False,
        },
    }
    out_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    return summary


def main(argv: list[str] | None = None, env: dict[str, str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bridge-endpoint", help="Napoleon base URL or full /v1/concierge/turn URL")
    parser.add_argument("--eval-endpoint", help="Napoleon evaluator endpoint; defaults to bridge base + /v1/concierge/evaluate")
    parser.add_argument("--auth-token", default=None, help="Optional bearer token; never written to validation artifacts")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Directory for sanitized validation artifacts")
    args = parser.parse_args(argv)

    active_env = os.environ if env is None else env
    auth_token = args.auth_token or endpoint_from_env(active_env, "NAPOLEON_EVAL_TOKEN")
    bridge_endpoint, eval_endpoint = resolve_endpoints(args.bridge_endpoint, args.eval_endpoint, active_env)
    if bridge_endpoint is None:
        print(
            "live runtime validation requires --bridge-endpoint, NAPOLEON_BRIDGE_ENDPOINT, "
            "or NAPOLEON_EVAL_ENDPOINT",
            file=sys.stderr,
        )
        return 2

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    evidence_path = out_dir / "bridge_evidence.json"
    eval_report_path = out_dir / "eval_http.json"
    summary_path = out_dir / "summary.json"

    bridge_exit_code, bridge_stdout, bridge_stderr = run_bridge_capture(bridge_endpoint, evidence_path, auth_token)
    if bridge_stdout:
        print(bridge_stdout, end="")
    if bridge_stderr:
        print(bridge_stderr, end="", file=sys.stderr)

    eval_exit_code: int | None = None
    if bridge_exit_code == 0 and eval_endpoint is not None:
        eval_exit_code = run_http_eval(eval_endpoint, eval_report_path, auth_token)
        sanitize_eval_report(eval_report_path)

    summary = write_summary(summary_path, bridge_exit_code, eval_exit_code, evidence_path, eval_report_path)
    print(json.dumps({
        "summary": str(summary_path),
        "bridge_status": summary["bridgeEvidence"]["status"],
        "http_evaluator_status": summary["httpEvaluator"]["status"],
        "boundary": BOUNDARY,
    }, indent=2))

    if bridge_exit_code != 0:
        return bridge_exit_code
    if eval_exit_code not in (None, 0):
        return eval_exit_code
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
