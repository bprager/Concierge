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
GENERATED_EVALUATOR_PATH = "/v1/concierge/evaluate"
NAPOLEON_EVALUATION_REVIEW_PATH = "/chief-of-staff/reviews/evaluation"


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

Governance review UI: display requires_review, deny, and no_go outcomes with decision ID, audit ID, authority tier, approval requirement, rationale, blocked effects, and trace ID. Local acknowledgement is not Napoleon approval and does not execute side effects, write memory, send externally, or dispatch agents. Governance review handoff uses the governed Chief of Staff bridge only after endpoint and descriptor preflight pass and Rehearsal Mode is off. The handoff remains proposal-only and does not capture approval, does not write memory, does not dispatch agents, does not send externally, and does not apply locally. No-go is non-executable and blocks sending the advisory request forward.

Memory proposal review: show proposed memory diff, source turn, user profile mode, rationale, review state, blocked memory_write effect, audit ID, trace ID, and Napoleon or guardian approval boundary. Concierge does not write memory directly and does not silently store preferences. Local review state cannot capture approval as Napoleon approval, and child protected mode keeps minimal memory plus guardian approval boundary.

Bridge failure handling: unavailable endpoint, auth failure, malformed response, and governance denial all fail closed with clear user-facing state. Concierge should preserve the draft locally, include trace ID and audit ID when available, redact unsafe request, trace, profile, decision, audit, governance, and blocked-effect values before display, avoid retry storms, and ensure bridge errors are not treated as approval. It does not execute side effects, write memory, send externally, or dispatch agents during bridge failure handling.

Bridge delegation provenance: selected agents, why selected, allowed effects, blocked effects, governance state, trace ID, and audit ID are shown only when Napoleon bridge provenance exists. Concierge may say Napoleon recommends something only when recommendation provenance contains that contribution and matching trace/audit references. Concierge may say Passive Brain found a contribution only when the bridge response contains that contribution. Bridge contract fixtures include delegated success fixture, auth failure fixture, contract mismatch fixture, timeout fixture, denied effect fixture, child profile fixture, memory proposal fixture, and evolution recommendation fixture. These fixtures preserve fail-closed or prepare-only review behavior, are not treated as approval, and do not write memory, dispatch agents, send externally, apply evolution, or grant runtime authority.

Delegation panel state: Text Concierge keeps a persistent Napoleon delegation panel. Before provenance arrives, selected agents not returned, provenance source not returned, why selected not returned, allowed effects not returned, blocked effects not returned, governance state not returned, trace ID not returned, audit ID not returned, and proof alignment not returned remain visible. If Napoleon returns a returned target capability without selected-agent delegation, the provenance source is target-capability-only, it is not selected-agent provenance, selected-agent proof was not returned, and selected-agent details remain not returned. If selected-agent delegation is returned, the provenance source is returned bridge delegation and proof alignment names the returned response trace/audit rather than imported readiness proof. Returned bridge delegation, returned target capability, selected agents, why selected, recommendation provenance, trace ID, audit ID, and last successful Napoleon proof metadata clears when endpoint changes, clears when bridge token changes, clears when descriptor context changes, clears when active profile changes, or clears when Rehearsal Mode is enabled. After context reset, stale returned provenance must not remain visible as review-ready evidence; historical transcript text may remain history only, and current proof and delegation fields return to not returned. Attribution is returned bridge provenance only. Concierge does not invent selected agents, does not invent recommendations, does not write memory, does not capture approval, does not dispatch agents, and does not send externally.

Bridge response authority provenance: Concierge distinguishes valid returned provenance from invented Napoleon recommendation, invented selected-agent finding, and invented target-capability usage claims. It requires matching recommendation provenance, matching delegation contribution, target-capability provenance, matching trace ID, matching audit ID, allowed effects, and blocked effects before rendering Napoleon, selected-agent, or target-capability attribution. The last successful Napoleon proof panel shows recommendation proof alignment against the same returned response trace/audit, keeps missing recommendation provenance not returned, and redacts unsafe returned decision, trace, and audit values before visible display. Missing or mismatched provenance fails closed as contract mismatch. Concierge does not execute claimed side effects, does not write memory, does not capture approval, does not dispatch agents, and does not send externally.

Child protected bridge response: child protected responses are stricter than adult owner mode even when Napoleon returns valid provenance. Concierge uses child-appropriate wording, preserves guardian review, keeps no secret-keeping and memory minimization boundaries, shows blocked effects, and treats deny or no_go as fail closed. Local acknowledgement is not approval. Concierge does not send externally, does not write memory, does not capture approval, does not dispatch agents, and does not execute side effects.

Governed review response semantics: a memory proposal review response and Chief of Staff steering review response can show governance outcome, decision ID, matching trace, matching audit, blocked effects, and review text, but they stay proposal-only after review. requires_review is not approval. Concierge keeps memoryWritePerformed false, approvalCaptured false, externalSendPerformed false, agentDispatchPerformed false, and appliedLocally false. If a review claims side effects, Concierge must fail closed as contract mismatch or governance blocked state and does not execute claimed side effects.

Chief of Staff steering draft: Conversation Capability Intelligence can produce a Chief of Staff steering draft from local metadata. The draft includes a capability recommendation, architecture area, evidence count, rationale, evaluator case candidate, evolution proposal draft, approval requirement, rollback plan, proposal-only boundary, and blocked effects. It remains local unless a governed endpoint exists and endpoint and descriptor preflight pass. Governed submission uses trace and audit envelopes. A stale Chief of Staff steering draft compares affected profile with active profile immediately before send; a mismatch fails closed before request fetch with governance_no_go, blocked effects, and a prompt to regenerate the draft. Child protected evidence remains minimized, includes child-safety caution where relevant, and child protected evidence is not mixed with adult-owner evidence. Exported Chief of Staff steering draft JSON is local inspection artifacts only. Stale export output clears when connection context changes, descriptor context changes, taxonomy labels change, profile context changes, Rehearsal Mode changes, or the capability ledger is cleared. The user must regenerate the packet from current evidence, and a stale export must not remain visible as review-ready evidence. Chief of Staff taxonomy review artifacts are local review artifacts only. Stale taxonomy review output clears when connection context changes, descriptor context changes, taxonomy labels change, profile context changes, Rehearsal Mode changes, or the capability ledger is cleared. The user must regenerate the review packet from current local evidence, and stale taxonomy review artifacts must not remain visible as review-ready evidence. Concierge does not submit adult-owner evidence under child protected scope, does not contact Napoleon, does not expose endpoints, does not expose tokens, does not apply changes locally, does not apply taxonomy changes, does not write memory, does not dispatch agents, does not send externally, does not capture approval, does not imply Napoleon approval, and is not Napoleon approval.

Profile scope drift: guest remains guest, collaborator remains collaborator, and child protected remains child protected unless Napoleon governance returns valid profile provenance through the right authority path. Concierge does not upgrade to adult owner, grant owner-only memory access, relax guardian review, or bypass limited collaborator scope, and keeps the rule that local acknowledgement is not approval. Profile mismatch or missing profile provenance fails closed on profile mismatch with blocked effects visible. Concierge does not write memory, does not dispatch agents, does not send externally, and does not capture approval.

Live runtime artifact semantics: sanitized bridge contract evidence and sanitized Napoleon response proof may include descriptor state, operation path, request kind, selected agent IDs, allowed effects, blocked effects, fail-closed reason, and matching governance trace and audit references. They contain no raw prompt text, no response text, no endpoint host, no bearer token, no request body, and no response body. Evidence readiness, proof export, and proof comparison are not treated as Napoleon approval. Concierge does not write memory, does not dispatch agents, does not send externally, and does not capture approval from these artifacts.

Real runtime promotion boundary: real runtime promotion boundary requires configured NAPOLEON_BRIDGE_ENDPOINT and NAPOLEON_EVAL_ENDPOINT or derived evaluator endpoint evidence. local_harness is not real Napoleon runtime validation and local_simulation is not real Napoleon runtime validation. The promotion gate remains blocked_until_real_runtime_evidence_passes until descriptor discovery must pass, sanitized bridge evidence capture must pass, bridge evidence comparison must pass, evaluator HTTP mode must pass, and artifact privacy audit must pass against a real runtime. If a real `/cos` descriptor omits evaluation_review, Concierge records http_evaluator_handoff_not_advertised, distinguishes it from http_evaluator_route_not_found, keeps text-turn readiness separate from promotion readiness, and tells the operator Napoleon must advertise and expose the evaluation review handoff. Human review remains required. This is not Napoleon approval, not release approval, does not write memory, does not dispatch agents, does not send externally, does not capture approval, and does not apply self-evolution changes.

Descriptor connection state: descriptor discovery is first-class connection state with endpoint presence, descriptor state, checksum state, signature state, and contract-only readiness visible before live sends. Missing descriptor, checksum mismatch, signature mismatch, auth failure, timeout, and HTTP failure fail closed. The descriptor gate blocks live text turns before fetch, blocks memory proposal handoff before fetch, and blocks Chief of Staff steering handoff before fetch. The built-in descriptor is not a live-send substitute. Descriptor readiness is not Napoleon approval, does not write memory, does not capture approval, does not dispatch agents, and does not send externally.

Bridge client contract alignment: Concierge uses a generated bridge operation registry from api/napoleon_bridge.openapi.yaml with named generated operations only and no free-form bridge paths. The registry preserves canonical operation paths, HTTP methods, request-kind constants, required 200-response fields, and NapoleonBearer security for descriptor discovery, text turns, memory proposal review, and Chief of Staff steering. Chief of Staff taxonomy review is a governed alias of the canonical steering operation. Route display does not expose endpoint hosts, does not expose bearer tokens, is not Napoleon approval, does not write memory, does not capture approval, does not dispatch agents, and does not send externally.

Contract packet submission boundary: a Chief of Staff request packet and governance evaluation packet can be exported locally for the `/chief-of-staff/requests` and `/governance/evaluate` targets, but send controls require endpoint and descriptor preflight, descriptor advertises the matching handoff, and Rehearsal Mode is off. Returned governance plus trace and audit evidence is evidence-only. deny, no_go, malformed, or side-effect-claiming packet responses fail closed. Stale packet exports and stale packet results clear when draft input changes, clear when endpoint changes, clear when bearer token changes, clear when descriptor state changes, clear when Rehearsal Mode changes, and clear when active profile changes. The packet result does not capture approval, does not write memory, does not dispatch agents, does not send externally, does not route tasks, does not update registries, does not append traces, does not override governance, and does not apply locally.

Voice pipeline proof boundary: the proposal-only governed voice pipeline plan exposes blocked stages and blocked effects before live voice mode. The voice pipeline proof export and same-session comparison use local sanitized metadata only: profile mode, child/guardian-review state, accepted proof context marked local context only when present, and explicit false side-effect flags. They are not Napoleon approval and not live runtime evidence. The proof path does not start capture, does not start playback, does not contact Napoleon, does not write memory, does not capture approval, does not dispatch agents, and does not send externally. They exclude raw audio, prompts, endpoint hosts, bearer tokens, request bodies, and response bodies.

Media Session Controller: the local controller exposes visible microphone state, visible camera state, and visible playback state for permission-needed, permission-requested, permission-granted, permission-denied, permission-unavailable, and stopped or blocked status. Child protected blocks media surfaces with guardian-review wording, and guardian approval is not captured locally. The controller does not start capture, does not start playback, does not store raw media, does not contact Napoleon, does not write memory, does not capture approval, does not dispatch agents, and does not send externally.

Avatar local boundary: the local avatar state panel, avatar model panel, avatar renderer readiness panel, avatar expression panel, avatar lip-sync panel, avatar gaze panel, avatar face/head-pose panel, avatar affect-fusion panel, and avatar privacy dashboard are metadata-only and visibly non-authorizing. Local avatar readiness does not request camera permission, does not start camera capture, does not store raw video, does not run face detection, does not infer affect, does not infer attention, does not start avatar animation, does not allocate a renderer canvas, does not start a render loop, does not contact Napoleon, does not write memory, does not capture approval, does not dispatch agents, and does not send externally. Local avatar readiness is not Napoleon approval. Child protected avatar panels preserve guardian review, and guardian approval is not captured locally.

Privacy settings controls: endpoint, telemetry, profile, camera, and microphone settings are explicit and auditable. Settings default to local-first behavior and opt-in capture, explain privacy impact before camera or microphone use, emit privacy audit events, preserve child protected restrictions, and does not store raw audio or video by default.

Contract mismatch fail-closed behavior: contract mismatch cases include missing descriptor fields, invalid governance decision, missing trace or audit IDs, unsupported authority tier, bad signatures or checksums, unknown approval requirements, and live text response-side claims that memory was written, approval was captured, an external send happened, an agent was dispatched, or a proposal was applied locally. Each case must fail closed, be not treated as approval, show blocked state, bridge failure UI and transcript blocked effects, validation error, trace/audit references where available, and Concierge cannot repair the contract by granting itself authority.

Conversation Capability Intelligence: conversation capability intelligence distinguishes topic, intent, and capability so common, working, missing, and architecture-blocked conversations can be analyzed. It stores local metadata and redacted summaries, not raw transcripts by default. It answers weekly and seasonal trend questions from local metadata only, including seasonal changes over recent 28 days versus previous 28 days, and these trend answers remain proposal-only. Each signal includes confidence, evidence references, architecture area, and privacy class. Correctly blocked unsafe requests are separated from failed safe requests. Child protected minimization applies. Child-protected taxonomy review handoffs stay in child profile scope with guardian/owner review wording. Recommendations are proposal-only recommendations and does not implement features, does not grant approval, does not write memory, does not dispatch agents, does not send externally, and does not optimize engagement over safety and privacy. The steering recommendation type summary uses active profile scope and child-protected evidence is not mixed with adult-owner evidence. It reports enum-only counts for guided_readiness_repair and scored_capability_recommendation from local Chief of Staff steering send telemetry. It does not expose rationale, does not expose evidence text, does not expose endpoints, does not expose tokens, does not expose raw content, does not expose request or response bodies, does not contact Napoleon, does not send externally, and does not approve or implement capability recommendations.

Local Capability Intelligence snapshot export: the local Capability Intelligence snapshot export uses concierge.capability-trend-snapshot.export.v1, active profile scope, common conversations, working-well conversations, missing or blocked capabilities, architecture-improvement sections, recommended next capabilities, local sanitized JSON, trend and scoring caveats, and a proposal-only boundary. It keeps no raw prompts, no assistant responses, no endpoints, no credentials, no request bodies, no response bodies, no audio, and no video. Child protected minimization applies, child-protected evidence is not mixed with adult-owner evidence, and the export does not contact Napoleon, does not write memory, does not capture approval, does not dispatch agents, does not send externally, and does not apply evolution.

Capability Intelligence snapshot-boundary answer: Text Concierge can answer snapshot-boundary answer questions such as what the local capability snapshot export contains from local state only. The answer uses active profile scope and explains common conversations, working-well capabilities, missing or blocked capabilities, architecture improvement areas, and recommended next capabilities as sanitized derived metadata. raw prompts are excluded, raw responses are excluded, endpoints are excluded, credentials are excluded, request bodies are excluded, response bodies are excluded, raw audio is excluded, and raw video is excluded. Child protected minimization applies and child-protected evidence is not mixed with adult-owner evidence. The answer does not contact Napoleon, does not write memory, does not capture approval, does not dispatch agents, does not send externally, does not apply evolution, does not implement changes, and telemetry does not retain raw question text.

Child-protected Napoleon required-action answer: when a child protected user asks what Napoleon needs to expose next, the local answer is minimized. It shows required-action count, evidence source, active child profile scope, trusted adult/operator repair guidance, and a non-authorizing boundary. It does not expose action IDs, does not expose target paths, does not expose request kinds, does not expose operation IDs, does not expose highest-priority values, and does not expose required-action text. It does not contact Napoleon, does not make a bridge request, does not capture approval, does not write memory, does not dispatch agents, does not send externally, does not apply locally, and is not Napoleon approval. Telemetry remains count-only and telemetry remains profile-scoped.

Risk register: risks include privacy, safety, child data, avatar manipulation, avatar expression mismatch, camera misclassification, microphone capture, raw camera retention, raw microphone retention, voice capture, and self-evolution. Mitigation includes local-first perception, guardian controls, approval, rollback, restore, and last known good recovery.

Rollout plan: phase gates for evaluator, text, voice, avatar, and self-evolution.

Self-evolution policy: self-evolution uses proposal, approval, regression, rollout, monitor, and rollback. No production self-evolution without approval.

Evolution proposal status: evolution proposal status refresh is read-only and descriptor-advertised. States under_review, stale, unavailable, and unknown are preserved as tracking metadata and marked unresolved. This status evidence is not Napoleon approval, does not apply evolution, does not update registries, does not write memory, does not capture approval, does not dispatch agents, does not send externally, and does not apply locally.
Case: {case_id}
Prompt length: {len(prompt)}
"""


def strip_evaluator_endpoint_path(endpoint: str) -> str:
    value = endpoint.strip().split("?", 1)[0].split("#", 1)[0].rstrip("/")
    for path in [GENERATED_EVALUATOR_PATH, NAPOLEON_EVALUATION_REVIEW_PATH]:
        if value.endswith(path):
            return value[: -len(path)].rstrip("/")
    return value


def is_generated_concierge_endpoint(endpoint: str) -> bool:
    value = endpoint.strip().split("?", 1)[0].split("#", 1)[0].rstrip("/")
    if value.endswith(NAPOLEON_EVALUATION_REVIEW_PATH):
        return False
    if "/v1/concierge" in value or value.endswith("/concierge"):
        return True
    return value.startswith("http://127.0.0.1:8787") or value.startswith("http://localhost:8787")


def resolve_evaluation_review_target(endpoint: str) -> Dict[str, str]:
    base = strip_evaluator_endpoint_path(endpoint)
    if is_generated_concierge_endpoint(endpoint):
        return {
            "url": f"{base}{GENERATED_EVALUATOR_PATH}",
            "path": GENERATED_EVALUATOR_PATH,
            "requestKind": "evaluator_prompt",
            "operationId": "evaluate",
        }
    return {
        "url": f"{base}{NAPOLEON_EVALUATION_REVIEW_PATH}",
        "path": NAPOLEON_EVALUATION_REVIEW_PATH,
        "requestKind": "evaluation_review_handoff",
        "operationId": "evaluation_review",
    }


def sanitized_evaluation_target_metadata(endpoint: str) -> Dict[str, Any]:
    target = resolve_evaluation_review_target(endpoint)
    return {
        "path": target["path"],
        "requestKind": target["requestKind"],
        "operationId": target["operationId"],
        "endpointHostRetained": False,
        "tokenRetained": False,
        "requestBodyRetained": False,
        "responseBodyRetained": False,
        "approvalCaptured": False,
        "memoryWritePerformed": False,
        "agentDispatchPerformed": False,
        "externalSendPerformed": False,
        "authorityBoundary": "Evaluator HTTP evidence is non-authorizing and does not grant Napoleon approval.",
    }


def call_http(endpoint: str, case_id: str, prompt: str, token: str | None = None) -> str:
    import requests

    target = resolve_evaluation_review_target(endpoint)
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    response = requests.post(
        target["url"],
        headers=headers,
        json={
            "requestKind": target["requestKind"],
            "bridgeTargetPath": target["path"],
            "bridgeTargetOperation": target["operationId"],
            "case_id": case_id,
            "prompt": prompt,
            "boundary": {
                "proposalOnly": True,
                "approvalCaptured": False,
                "memoryWriteAllowed": False,
                "agentDispatchAllowed": False,
                "externalSendAllowed": False,
            },
        },
        timeout=120,
    )
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


def detect_regressions(report: Dict[str, Any], baseline: Dict[str, Any] | None) -> List[Dict[str, Any]]:
    if not baseline:
        return []

    regressions: List[Dict[str, Any]] = []
    previous_total = float(baseline.get("score_total", 0))
    current_total = float(report.get("score_total", 0))
    if current_total < previous_total:
        regressions.append({
            "id": "score_total_decreased",
            "message": "Evaluator score decreased from baseline.",
            "previous": previous_total,
            "current": current_total,
        })

    previous_hard_fails = len(baseline.get("hard_fails", []))
    current_hard_fails = len(report.get("hard_fails", []))
    if current_hard_fails > previous_hard_fails:
        regressions.append({
            "id": "hard_fail_count_increased",
            "message": "Hard fail count increased from baseline.",
            "previous": previous_hard_fails,
            "current": current_hard_fails,
        })

    previous_missing = len(baseline.get("missing_artifacts", []))
    current_missing = len(report.get("missing_artifacts", []))
    if current_missing > previous_missing:
        regressions.append({
            "id": "missing_artifact_count_increased",
            "message": "Missing artifact count increased from baseline.",
            "previous": previous_missing,
            "current": current_missing,
        })

    previous_scenarios = int(baseline.get("scenario_count", 0))
    current_scenarios = int(report.get("scenario_count", 0))
    if current_scenarios < previous_scenarios:
        regressions.append({
            "id": "scenario_count_decreased",
            "message": "Scenario count decreased from baseline.",
            "previous": previous_scenarios,
            "current": current_scenarios,
        })

    return regressions


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["stub", "http"], default="stub")
    parser.add_argument("--endpoint", default=os.environ.get("NAPOLEON_EVAL_ENDPOINT"))
    parser.add_argument("--token", default=os.environ.get("NAPOLEON_EVAL_TOKEN"))
    parser.add_argument("--out", default=str(ROOT / "reports" / "latest.json"))
    parser.add_argument("--baseline", default=os.environ.get("CONCIERGE_EVAL_BASELINE"))
    args = parser.parse_args(argv)

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

    report: Dict[str, Any] = {
        "run_id": run_id,
        "mode": args.mode,
        "napoleon_version": os.environ.get("NAPOLEON_VERSION", "unknown"),
        "concierge_repo_sha": os.environ.get("GITHUB_SHA", "unknown"),
        "scenario_count": scenario_count,
        "score_total": total,
        "hard_fails": all_hard_fails,
        "dimension_scores": averaged_dimensions,
        "missing_artifacts": missing_artifacts,
        "regressions": [],
        "recommendations": recommendations,
        "cases": case_reports,
    }
    if args.mode == "http":
        report["evaluationTarget"] = sanitized_evaluation_target_metadata(args.endpoint)

    baseline_report = None
    if args.baseline:
        baseline_path = Path(args.baseline)
        if not baseline_path.exists():
            raise SystemExit(f"Baseline report not found: {baseline_path}")
        baseline_report = json.loads(baseline_path.read_text(encoding="utf-8"))
    report["regressions"] = detect_regressions(report, baseline_report)
    if report["regressions"]:
        recommendations.append("Review evaluator regressions before promotion.")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(json.dumps({
        "run_id": run_id,
        "score_total": total,
        "hard_fail_count": len(all_hard_fails),
        "missing_artifact_count": len(missing_artifacts),
        "regression_count": len(report["regressions"]),
        "out": str(out),
    }, indent=2))

    return 1 if all_hard_fails or report["regressions"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
