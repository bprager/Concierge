#!/usr/bin/env python3
"""Run live Napoleon runtime validation without storing raw prompts or responses."""

from __future__ import annotations

import argparse
import contextlib
import io
import json
import os
import re
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
KNOWN_BRIDGE_PATHS = bridge_evidence_capture.KNOWN_BRIDGE_PATHS

BOUNDARY = (
    "Live runtime validation is evidence only. It is not Napoleon approval, "
    "not release approval, not a memory write, not agent dispatch, not an "
    "external send, and not authority to apply self-evolution changes."
)
REDACTED_REPORT_FIELDS = {"response_excerpt"}
RUNTIME_VALIDATION_SOURCES = ("real_runtime", "local_harness", "local_simulation")
FORBIDDEN_ARTIFACT_FIELDS = {
    "authorization",
    "auth",
    "authToken",
    "bearerToken",
    "body",
    "endpoint",
    "headers",
    "host",
    "message",
    "prompt",
    "requestBody",
    "responseBody",
    "responseText",
    "response_excerpt",
    "text",
    "token",
    "url",
}
FIELD_SEPARATOR_PATTERN = re.compile(r"[^a-z0-9]+")


def normalized_artifact_field_name(field: str) -> str:
    return FIELD_SEPARATOR_PATTERN.sub("", field.lower())


FORBIDDEN_ARTIFACT_FIELD_KEYS = {normalized_artifact_field_name(field) for field in FORBIDDEN_ARTIFACT_FIELDS}


def runtime_validation_caveat(source: str) -> str:
    if source == "local_harness":
        return "Local harness validation is not real Napoleon runtime validation."
    if source == "local_simulation":
        return "Local simulation validation is not real Napoleon runtime validation."
    return "Real Napoleon runtime validation source."


def strip_known_path(endpoint: str) -> str:
    value = endpoint.strip().rstrip("/")
    for path in KNOWN_BRIDGE_PATHS:
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


def run_bridge_capture(
    bridge_endpoint: str,
    out_path: Path,
    auth_token: str | None,
    runtime_validation_source: str,
) -> tuple[int, str, str]:
    stdout = io.StringIO()
    stderr = io.StringIO()
    args = [
        "--endpoint",
        bridge_endpoint,
        "--out",
        str(out_path),
        "--runtime-validation-source",
        runtime_validation_source,
    ]
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


def artifact_privacy_violations(value: Any, sensitive_values: set[str], path: str = "$") -> list[str]:
    violations: list[str] = []
    if isinstance(value, dict):
        for key, nested in value.items():
            key_path = f"{path}.{key}"
            if normalized_artifact_field_name(key) in FORBIDDEN_ARTIFACT_FIELD_KEYS:
                violations.append(f"{key_path}: forbidden artifact field {key}")
            violations.extend(artifact_privacy_violations(nested, sensitive_values, key_path))
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            violations.extend(artifact_privacy_violations(nested, sensitive_values, f"{path}[{index}]"))
    elif isinstance(value, str):
        for sensitive in sensitive_values:
            if sensitive and sensitive in value:
                violations.append(f"{path}: sensitive runtime value present")
                break
    return violations


def audit_artifact_privacy(paths: list[Path], sensitive_values: set[str]) -> dict[str, Any]:
    artifacts: list[dict[str, Any]] = []
    violation_count = 0
    for path in paths:
        if not path.exists():
            artifacts.append({"path": str(path), "status": "not_found", "violation_count": 0})
            continue
        violations = artifact_privacy_violations(load_json(path), sensitive_values)
        violation_count += len(violations)
        artifacts.append({
            "path": str(path),
            "status": "passed" if not violations else "failed",
            "violation_count": len(violations),
            "violations": violations,
        })
    return {
        "status": "passed" if violation_count == 0 else "failed",
        "checked_count": len(artifacts),
        "violation_count": violation_count,
        "artifacts": artifacts,
        "boundary": "Artifact privacy audit reports field paths only and does not copy sensitive values.",
    }


def count_bridge_records(path: Path) -> int:
    if not path.exists():
        return 0
    payload = load_json(path)
    if isinstance(payload, list):
        return len(payload)
    if isinstance(payload, dict) and isinstance(payload.get("records"), list):
        return len(payload["records"])
    return 0


def bridge_evidence_operation_summary(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {
            "lastEvidenceStatus": None,
            "lastOperationId": None,
            "lastRequestKind": None,
            "lastTransport": None,
            "lastTargetPath": None,
            "lastRuntimeValidationSource": None,
            "traceEnvelopeObserved": None,
            "traceEnvelopeMatched": None,
            "traceTargetPath": None,
        }
    payload = load_json(path)
    records = payload if isinstance(payload, list) else payload.get("records", []) if isinstance(payload, dict) else []
    if not records or not isinstance(records[-1], dict):
        return {
            "lastEvidenceStatus": None,
            "lastOperationId": None,
            "lastRequestKind": None,
            "lastTransport": None,
            "lastTargetPath": None,
            "lastRuntimeValidationSource": None,
            "traceEnvelopeObserved": None,
            "traceEnvelopeMatched": None,
            "traceTargetPath": None,
        }
    record = records[-1]
    return {
        "lastEvidenceStatus": str(record.get("status") or ""),
        "lastOperationId": str(record.get("operationId") or ""),
        "lastRequestKind": str(record.get("requestKind") or ""),
        "lastTransport": str(record.get("transport") or ""),
        "lastTargetPath": str(record.get("targetPath") or ""),
        "lastRuntimeValidationSource": str(record.get("runtimeValidationSource") or ""),
        "traceEnvelopeObserved": record.get("traceEnvelopeObserved"),
        "traceEnvelopeMatched": record.get("traceEnvelopeMatched"),
        "traceTargetPath": str(record.get("traceTargetPath") or ""),
    }


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


def promotion_readiness(summary: dict[str, Any]) -> dict[str, Any]:
    runtime = summary["runtimeValidation"]
    bridge = summary["bridgeEvidence"]
    evaluator = summary["httpEvaluator"]
    artifact_privacy = summary["artifactPrivacy"]
    checks = [
        (runtime["source"] == "real_runtime", "Evidence source is not real Napoleon runtime."),
        (bridge["status"] == "passed", "Descriptor discovery and bridge evidence capture did not pass."),
        (evaluator["status"] == "passed", "Evaluator HTTP mode did not pass."),
        (artifact_privacy["status"] == "passed", "Artifact privacy audit did not pass."),
    ]
    blocking_reasons = [reason for passed, reason in checks if not passed]
    locally_safe = not blocking_reasons
    return {
        "locallySafeToConsider": locally_safe,
        "gate": "ready_for_human_review" if locally_safe else "blocked_until_real_runtime_evidence_passes",
        "blockingReasons": blocking_reasons,
        "boundary": "Readiness is local evidence only; human review and any required Napoleon or release approval are still required.",
    }


def render_promotion_review(summary: dict[str, Any]) -> str:
    runtime = summary["runtimeValidation"]
    bridge = summary["bridgeEvidence"]
    evaluator = summary["httpEvaluator"]
    artifact_privacy = summary["artifactPrivacy"]
    boundary = summary["promotionBoundary"]
    readiness = summary["promotionReadiness"]
    blocking_reasons = readiness["blockingReasons"] or ["none"]
    checkbox = lambda checked, text: f"- [{'x' if checked else ' '}] {text}"
    return "\n".join([
        "# Live Runtime Promotion Review Record",
        "",
        "## Review Boundary",
        "",
        BOUNDARY,
        "",
        "## Runtime Validation",
        "",
        f"- Source: `{runtime['source']}`",
        f"- Caveat: {runtime['caveat']}",
        f"- Bridge evidence status: `{bridge['status']}`",
        f"- Bridge evidence records: `{bridge['record_count']}`",
        f"- Last operation ID: `{bridge['lastOperationId']}`",
        f"- Last request kind: `{bridge['lastRequestKind']}`",
        f"- Last transport: `{bridge['lastTransport']}`",
        f"- Last target path: `{bridge['lastTargetPath']}`",
        f"- Trace envelope observed: `{str(bridge['traceEnvelopeObserved']).lower()}`",
        f"- Trace envelope matched: `{str(bridge['traceEnvelopeMatched']).lower()}`",
        f"- HTTP evaluator status: `{evaluator['status']}`",
        f"- HTTP evaluator run ID: `{evaluator['run_id']}`",
        f"- HTTP evaluator score: `{evaluator['score_total']}`",
        f"- Hard failure count: `{evaluator['hard_fail_count']}`",
        f"- Missing artifact count: `{evaluator['missing_artifact_count']}`",
        f"- Regression count: `{evaluator['regression_count']}`",
        f"- Artifact privacy audit: `{artifact_privacy['status']}`",
        "",
        "## Required Checklist",
        "",
        checkbox(bridge["status"] == "passed", "Descriptor discovery and bridge evidence capture passed."),
        checkbox(evaluator["status"] == "passed", "Evaluator HTTP mode passed."),
        checkbox(artifact_privacy["status"] == "passed", "Artifact privacy audit passed."),
        checkbox(runtime["source"] == "real_runtime", "Evidence source is real Napoleon runtime, not local harness or simulation."),
        checkbox(not boundary["approvalCaptured"], "No approval was captured by Concierge."),
        checkbox(not boundary["memoryWritePerformed"], "No memory write was performed by Concierge."),
        checkbox(not boundary["agentDispatchPerformed"], "No agent dispatch was performed by Concierge."),
        checkbox(not boundary["externalSendPerformed"], "No external send was performed by Concierge."),
        checkbox(not boundary["appliedLocally"], "No local application or self-evolution change was applied."),
        "",
        "## Promotion Result",
        "",
        f"- Locally safe to consider for promotion: `{str(readiness['locallySafeToConsider']).lower()}`",
        f"- Promotion gate: `{readiness['gate']}`",
        f"- Blocking reasons: {' '.join(blocking_reasons)}",
        "- Promotion remains blocked until this record is reviewed by a human and any required Napoleon or release process approves it.",
        "",
    ])


def write_promotion_review(path: Path, summary: dict[str, Any]) -> None:
    path.write_text(render_promotion_review(summary), encoding="utf-8")


def write_summary(
    out_path: Path,
    promotion_review_path: Path,
    bridge_exit_code: int,
    eval_exit_code: int | None,
    evidence_path: Path,
    eval_report_path: Path,
    runtime_validation_source: str,
    artifact_privacy: dict[str, Any],
) -> dict[str, Any]:
    summary = {
        "boundary": BOUNDARY,
        "runtimeValidation": {
            "source": runtime_validation_source,
            "caveat": runtime_validation_caveat(runtime_validation_source),
        },
        "bridgeEvidence": {
            "status": "passed" if bridge_exit_code == 0 else "failed",
            "record_count": count_bridge_records(evidence_path),
            "path": str(evidence_path),
            **bridge_evidence_operation_summary(evidence_path),
        },
        "httpEvaluator": {
            "status": "passed" if eval_exit_code == 0 else "failed" if eval_exit_code is not None else "not_run",
            "path": str(eval_report_path),
            "sanitized": eval_report_path.exists(),
            **eval_counts(eval_report_path),
        },
        "artifactPrivacy": artifact_privacy,
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
    summary["promotionReadiness"] = promotion_readiness(summary)
    write_promotion_review(promotion_review_path, summary)
    summary["promotionReview"] = {
        "status": "drafted",
        "path": str(promotion_review_path),
        "boundary": "Local review draft only; not Napoleon approval and not release approval by itself.",
    }
    out_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    return summary


def main(argv: list[str] | None = None, env: dict[str, str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bridge-endpoint", help="Napoleon base URL or known Concierge bridge operation URL")
    parser.add_argument("--eval-endpoint", help="Napoleon evaluator endpoint; defaults to bridge base + /v1/concierge/evaluate")
    parser.add_argument("--auth-token", default=None, help="Optional bearer token; never written to validation artifacts")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Directory for sanitized validation artifacts")
    parser.add_argument(
        "--runtime-validation-source",
        choices=RUNTIME_VALIDATION_SOURCES,
        default="real_runtime",
        help="Evidence source label written to the sanitized summary",
    )
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
    promotion_review_path = out_dir / "promotion_review.md"

    bridge_exit_code, bridge_stdout, bridge_stderr = run_bridge_capture(
        bridge_endpoint,
        evidence_path,
        auth_token,
        args.runtime_validation_source,
    )
    if bridge_stdout:
        print(bridge_stdout, end="")
    if bridge_stderr:
        print(bridge_stderr, end="", file=sys.stderr)

    eval_exit_code: int | None = None
    if bridge_exit_code == 0 and eval_endpoint is not None:
        eval_exit_code = run_http_eval(eval_endpoint, eval_report_path, auth_token)
        sanitize_eval_report(eval_report_path)

    sensitive_values = {
        value
        for value in [
            bridge_endpoint,
            eval_endpoint,
            strip_known_path(bridge_endpoint) if bridge_endpoint else None,
            strip_known_path(eval_endpoint) if eval_endpoint else None,
            auth_token,
        ]
        if value
    }
    artifact_privacy = audit_artifact_privacy([evidence_path, eval_report_path], sensitive_values)

    summary = write_summary(
        summary_path,
        promotion_review_path,
        bridge_exit_code,
        eval_exit_code,
        evidence_path,
        eval_report_path,
        args.runtime_validation_source,
        artifact_privacy,
    )
    print(json.dumps({
        "summary": str(summary_path),
        "runtime_validation_source": summary["runtimeValidation"]["source"],
        "bridge_status": summary["bridgeEvidence"]["status"],
        "http_evaluator_status": summary["httpEvaluator"]["status"],
        "artifact_privacy_status": summary["artifactPrivacy"]["status"],
        "boundary": BOUNDARY,
    }, indent=2))

    if bridge_exit_code != 0:
        return bridge_exit_code
    if eval_exit_code not in (None, 0):
        return eval_exit_code
    if summary["artifactPrivacy"]["status"] != "passed":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
