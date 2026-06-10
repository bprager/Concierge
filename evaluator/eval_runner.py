#!/usr/bin/env python3
"""Concierge evaluator runner.

This is an initial deterministic evaluator. It is not a replacement for human
review or a strong LLM judge, but it gives the repo a repeatable baseline.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
from pathlib import Path
from typing import Any, Dict, List

import yaml


ROOT = Path(__file__).resolve().parent


def load_yaml(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_prompt(scenario: Dict[str, Any]) -> str:
    if "prompt" in scenario:
        return scenario["prompt"]
    prompt_file = scenario.get("prompt_file")
    if not prompt_file:
        raise ValueError(f"Scenario {scenario.get('id')} has no prompt or prompt_file")
    return (ROOT / prompt_file).read_text(encoding="utf-8")


def call_stub(case_id: str, prompt: str) -> str:
    """Return a deliberately complete-ish response for local evaluator testing."""
    return f"""
PRD: Concierge
Purpose: Concierge is the adaptive human interface to Napoleon.
Goals include text, voice, avatar, adult owner mode, child protected mode, and observability.
Non-goals include unsafe side effects and any attempt to bypass governance.
Requirements include governance, memory, stance, observability, and evaluation.
Success metrics include routing accuracy, stance fit, latency, trace completeness, and hard fail count.

Capability map: capabilities include intent, routing, context, memory, delegation, stance, voice, avatar, and observability.

Agent contract: allowed inputs are user message, transcript, derived camera signals, and approved memory refs.
Allowed outputs are response, clarifying question, delegation request, and draft action.
Authority requires approval for side effects, sensitive access, memory write, external messages, purchases, and calendar changes.

Architecture: Napoleon integration uses Napoleon bridge, Chief of Staff, governance gate, policy engine, agent registry, task router, memory graph, and evaluation logger.

Governance model: side effects require confirmation. Sensitive data requires purpose-bound permission. Child mode requires guardian controls.

Memory policy: read relevant memory only. Write preferences only with approval. Child memory is minimal and guardian controlled.

Routing policy: routing goes through Napoleon task router, not direct uncontrolled tools. Delegation is logged.

Interaction stance policy: tone and stance selected from neutral_warm, direct_strategic, concerned, playful, somber, coaching, firm_boundary. Adult mode is concise and strategic. Child mode is warm, simple, and guardian bounded.

Observability plan: emit trace schema, metrics, logs, OpenTelemetry-compatible spans, privacy audit events, redaction controls, evaluator reports, stance decisions, latency metrics, and quality metrics.

Evaluation suite: scenario tests, rubric, hard fail tests, regression tests, acceptance criteria, and failure analysis.

Rehearsal Mode evaluator coverage: rehearsal preview includes understood request, proposed Napoleon path, Chief of Staff review packet, allowed effects, blocked effects, approval state, memory proposal state, trace audit preview, and evaluator-case candidate. Rehearsal safety boundary does not call a live Napoleon endpoint, does not capture approval, does not write memory, does not send externally, does not execute commands, does not dispatch agents, and does not weaken child protected mode. Adult owner, child protected, guest collaborator, and adversarial rehearsal scenarios all expose external_send, memory_write, command_execution, agent_dispatch, approval_capture, and runtime_authority as blocked effects.

Governance review UI: display requires_review, deny, and no_go outcomes with decision ID, audit ID, authority tier, approval requirement, rationale, blocked effects, and trace ID. Local acknowledgement is not Napoleon approval and does not execute side effects, write memory, send externally, or dispatch agents. No-go is non-executable and blocks sending the advisory request forward.

Memory proposal review: show proposed memory diff, source turn, user profile mode, rationale, review state, blocked memory_write effect, audit ID, trace ID, and Napoleon or guardian approval boundary. Concierge does not write memory directly and does not silently store preferences. Local review state cannot capture approval as Napoleon approval, and child protected mode keeps minimal memory plus guardian approval boundary.

Bridge failure handling: unavailable endpoint, auth failure, malformed response, and governance denial all fail closed with clear user-facing state. Concierge should preserve the draft locally, include trace ID and audit ID when available, avoid retry storms, and ensure bridge errors are not treated as approval. It does not execute side effects, write memory, send externally, or dispatch agents during bridge failure handling.

Privacy settings controls: endpoint, telemetry, profile, camera, and microphone settings are explicit and auditable. Settings default to local-first behavior and opt-in capture, explain privacy impact before camera or microphone use, emit privacy audit events, preserve child protected restrictions, and does not store raw audio or video by default.

Contract mismatch fail-closed behavior: contract mismatch cases include missing descriptor fields, invalid governance decision, missing trace or audit IDs, unsupported authority tier, bad signatures or checksums, and unknown approval requirements. Each case must fail closed, be not treated as approval, show blocked state and validation error, and Concierge cannot repair the contract by granting itself authority.

Conversation Capability Intelligence: conversation capability intelligence distinguishes topic, intent, and capability so common, working, missing, and architecture-blocked conversations can be analyzed. It stores local metadata and redacted summaries, not raw transcripts by default. Each signal includes confidence, evidence references, architecture area, and privacy class. Correctly blocked unsafe requests are separated from failed safe requests. Child protected minimization applies. Recommendations are proposal-only recommendations and does not implement features, does not grant approval, does not write memory, does not dispatch agents, does not send externally, and does not optimize engagement over safety and privacy.

Risk register: risks include privacy, safety, child data, avatar manipulation, avatar expression mismatch, camera misclassification, microphone capture, raw camera retention, raw microphone retention, voice capture, and self-evolution. Mitigation includes local-first perception, guardian controls, approval, rollback, restore, and last known good recovery.

Rollout plan: phase gates for evaluator, text, voice, avatar, and self-evolution.

Self-evolution policy: self-evolution uses proposal, approval, regression, rollout, monitor, and rollback. No production self-evolution without approval.
Case: {case_id}
Prompt length: {len(prompt)}
"""


def call_http(endpoint: str, case_id: str, prompt: str, token: str | None = None) -> str:
    import requests

    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    response = requests.post(endpoint, headers=headers, json={"case_id": case_id, "prompt": prompt}, timeout=120)
    response.raise_for_status()
    payload = response.json()
    return payload.get("text", "")


def score_dimension(text: str, required_terms: List[str], weight: float) -> Dict[str, Any]:
    lower = text.lower()
    found = [term for term in required_terms if term.lower() in lower]
    ratio = len(found) / max(len(required_terms), 1)
    return {
        "score": round(weight * ratio, 2),
        "weight": weight,
        "found": found,
        "missing": [term for term in required_terms if term not in found],
    }


def detect_hard_fails(text: str, hard_fail_rules: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    lower = text.lower()
    fails = []
    for rule in hard_fail_rules:
        missing_any = rule.get("missing_terms_any")
        if missing_any and not any(term.lower() in lower for term in missing_any):
            fails.append({"id": rule["id"], "message": rule["message"]})
        forbidden_any = rule.get("forbidden_terms_any")
        if forbidden_any and any(term.lower() in lower for term in forbidden_any):
            fails.append({"id": rule["id"], "message": rule["message"]})
    return fails


def check_artifacts(text: str, expected: Dict[str, Any], artifact_ids: List[str]) -> Dict[str, Any]:
    lower = text.lower()
    result = {}
    for artifact_id in artifact_ids:
        spec = expected["artifacts"].get(artifact_id)
        if spec is None:
            result[artifact_id] = {
                "found": False,
                "matched_terms": [],
                "missing_terms": [f"unknown artifact: {artifact_id}"],
            }
            continue
        required_terms = spec.get("required_terms", [])
        found = [term for term in required_terms if term.lower() in lower]
        result[artifact_id] = {
            "found": len(found) == len(required_terms),
            "matched_terms": found,
            "missing_terms": [term for term in required_terms if term not in found],
        }
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["stub", "http"], default="stub")
    parser.add_argument("--endpoint", default=os.environ.get("NAPOLEON_EVAL_ENDPOINT"))
    parser.add_argument("--token", default=os.environ.get("NAPOLEON_EVAL_TOKEN"))
    parser.add_argument("--out", default=str(ROOT / "reports" / "latest.json"))
    args = parser.parse_args()

    scenarios = load_yaml(ROOT / "scenarios.yaml")["scenarios"]
    rubric = load_yaml(ROOT / "rubrics.yaml")
    expected = load_yaml(ROOT / "expected_artifacts.yaml")

    if args.mode == "http" and not args.endpoint:
        raise SystemExit("HTTP mode requires --endpoint or NAPOLEON_EVAL_ENDPOINT")

    run_id = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    case_reports = []
    aggregate_scores = {name: 0.0 for name in rubric["dimensions"]}
    all_hard_fails = []

    for scenario in scenarios:
        case_id = scenario["id"]
        prompt = load_prompt(scenario)

        if args.mode == "stub":
            text = call_stub(case_id, prompt)
        else:
            text = call_http(args.endpoint, case_id, prompt, args.token)

        dimension_scores = {}
        for name, spec in rubric["dimensions"].items():
            scored = score_dimension(text, spec.get("required_terms", []), float(spec["weight"]))
            dimension_scores[name] = scored
            aggregate_scores[name] += scored["score"]

        hard_fails = detect_hard_fails(text, rubric.get("hard_fails", []))
        all_hard_fails.extend([{"case_id": case_id, **fail} for fail in hard_fails])

        artifact_checks = check_artifacts(text, expected, scenario.get("expected_artifacts", []))

        case_reports.append({
            "case_id": case_id,
            "title": scenario.get("title"),
            "stage": scenario.get("stage"),
            "score": round(sum(v["score"] for v in dimension_scores.values()), 2),
            "dimension_scores": dimension_scores,
            "hard_fails": hard_fails,
            "artifact_checks": artifact_checks,
            "response_excerpt": text[:1000],
        })

    scenario_count = len(scenarios)
    averaged_dimensions = {
        name: round(score / max(scenario_count, 1), 2)
        for name, score in aggregate_scores.items()
    }
    total = round(sum(averaged_dimensions.values()), 2)

    missing_artifacts = []
    for case in case_reports:
        for artifact_id, check in case["artifact_checks"].items():
            if not check["found"]:
                missing_artifacts.append(f"{case['case_id']}:{artifact_id}")

    recommendations = []
    if all_hard_fails:
        recommendations.append("Fix hard fails before promotion.")
    if missing_artifacts:
        recommendations.append("Complete missing artifacts and add regression cases.")
    if total < 90:
        recommendations.append("Review low-scoring rubric dimensions before implementation.")

    report = {
        "run_id": run_id,
        "mode": args.mode,
        "napoleon_version": os.environ.get("NAPOLEON_VERSION", "unknown"),
        "concierge_repo_sha": os.environ.get("GITHUB_SHA", "unknown"),
        "scenario_count": scenario_count,
        "score_total": total,
        "hard_fails": all_hard_fails,
        "dimension_scores": averaged_dimensions,
        "missing_artifacts": missing_artifacts,
        "recommendations": recommendations,
        "cases": case_reports,
    }

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(json.dumps({
        "run_id": run_id,
        "score_total": total,
        "hard_fail_count": len(all_hard_fails),
        "missing_artifact_count": len(missing_artifacts),
        "out": str(out),
    }, indent=2))

    return 1 if all_hard_fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
