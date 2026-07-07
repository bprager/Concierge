#!/usr/bin/env python3
"""Create and check a reviewed release-gate artifact for packaged desktop evidence."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SUMMARY = Path("/tmp/concierge-live-runtime-validation/summary.json")
DEFAULT_OUT = ROOT / "docs/reports/PACKAGED_DESKTOP_RUNTIME_RELEASE_GATE.json"
KIND = "concierge.packaged-desktop-release-gate.v1"
VALID_DECISIONS = ("accept", "reject", "request_revision")
BOUNDARY = (
    "This is a local human review release-gate record for packaged desktop runtime evidence. "
    "It is not Napoleon approval, not release approval by itself, not a memory write, "
    "not agent dispatch, not an external send, and not permission to apply self-evolution changes."
)


def load_json(path: Path, label: str) -> dict[str, Any]:
    if not path.exists():
        raise SystemExit(f"{label} not found: {path}")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"{label} is not valid JSON: {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise SystemExit(f"{label} must be a JSON object: {path}")
    return payload


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def nested(summary: dict[str, Any], key: str) -> dict[str, Any]:
    value = summary.get(key)
    return value if isinstance(value, dict) else {}


def required_checks(summary: dict[str, Any]) -> list[dict[str, Any]]:
    runtime = nested(summary, "runtimeValidation")
    readiness = nested(summary, "promotionReadiness")
    desktop = nested(summary, "packagedDesktopRuntimeConnection")
    privacy = nested(summary, "artifactPrivacy")
    boundary = nested(summary, "promotionBoundary")
    required_actions = summary.get("napoleonRequiredActions")
    blocking_reasons = readiness.get("blockingReasons")
    desktop_blockers = desktop.get("blockingReasons")
    return [
        {
            "id": "real_runtime_source",
            "passed": runtime.get("source") == "real_runtime",
            "detail": "The summary came from real Napoleon runtime evidence.",
        },
        {
            "id": "promotion_ready_for_review",
            "passed": readiness.get("gate") == "ready_for_human_review"
            and readiness.get("locallySafeToConsider") is True,
            "detail": "The promotion gate was ready for human review.",
        },
        {
            "id": "packaged_desktop_evidence_path",
            "passed": readiness.get("evidencePath") == "packaged_desktop_runtime_connection",
            "detail": "The selected evidence path was the packaged desktop runtime connection.",
        },
        {
            "id": "no_promotion_blockers",
            "passed": isinstance(blocking_reasons, list) and len(blocking_reasons) == 0,
            "detail": "The promotion readiness record had no blocking reasons.",
        },
        {
            "id": "desktop_connection_passed",
            "passed": desktop.get("status") == "passed" and desktop.get("locallySafeToConsider") is True,
            "detail": "The packaged desktop runtime connection passed.",
        },
        {
            "id": "desktop_endpoint_and_token_local",
            "passed": desktop.get("pythonHostTransportRequired") is False
            and desktop.get("browserProxyRequired") is False
            and desktop.get("endpointAndTokenKeptLocal") is True,
            "detail": "The desktop path did not require host Python transport or browser proxying.",
        },
        {
            "id": "desktop_governed_routes_only",
            "passed": desktop.get("governedRoutesOnly") is True,
            "detail": "The desktop path used governed route and method allowlists.",
        },
        {
            "id": "desktop_live_proofs_passed",
            "passed": desktop.get("binaryLiveProofPassed") is True
            and desktop.get("appBundleLiveProofPassed") is True
            and desktop.get("descriptorProofPassed") is True
            and desktop.get("capabilityProofPassed") is True
            and desktop.get("textTurnProofPassed") is True
            and desktop.get("traceProofPassed") is True,
            "detail": "Binary and app-bundle descriptor, capability, text-turn, and trace proofs passed.",
        },
        {
            "id": "desktop_no_side_effect_claim",
            "passed": desktop.get("sideEffectClaimed") is not True
            and isinstance(desktop_blockers, list)
            and len(desktop_blockers) == 0,
            "detail": "The desktop evidence did not claim forbidden side effects.",
        },
        {
            "id": "artifact_privacy_passed",
            "passed": privacy.get("status") == "passed",
            "detail": "The retained artifacts passed the privacy audit.",
        },
        {
            "id": "no_napoleon_required_actions",
            "passed": isinstance(required_actions, list) and len(required_actions) == 0,
            "detail": "No Napoleon-owned required actions remained in the summary.",
        },
        {
            "id": "no_concierge_side_effects",
            "passed": not any(
                boundary.get(key) is True
                for key in [
                    "approvalCaptured",
                    "memoryWritePerformed",
                    "agentDispatchPerformed",
                    "externalSendPerformed",
                    "appliedLocally",
                ]
            ),
            "detail": "Concierge did not capture approval, write memory, dispatch agents, send externally, or apply changes.",
        },
    ]


def summarize_evidence(summary: dict[str, Any], summary_sha256: str) -> dict[str, Any]:
    readiness = nested(summary, "promotionReadiness")
    desktop = nested(summary, "packagedDesktopRuntimeConnection")
    privacy = nested(summary, "artifactPrivacy")
    runtime = nested(summary, "runtimeValidation")
    return {
        "sourceSummarySha256": summary_sha256,
        "runtimeSource": runtime.get("source", "unknown"),
        "promotionGate": readiness.get("gate", "unknown"),
        "evidencePath": readiness.get("evidencePath", "unknown"),
        "locallySafeToConsider": readiness.get("locallySafeToConsider") is True,
        "blockingReasons": readiness.get("blockingReasons") if isinstance(readiness.get("blockingReasons"), list) else [],
        "packagedDesktopRuntimeConnectionStatus": desktop.get("status", "unknown"),
        "artifactPrivacyStatus": privacy.get("status", "unknown"),
        "napoleonRequiredActionCount": len(summary.get("napoleonRequiredActions", []))
        if isinstance(summary.get("napoleonRequiredActions"), list)
        else 0,
    }


def build_artifact(
    summary: dict[str, Any],
    summary_sha256: str,
    reviewer: str,
    decision: str,
    reviewed_at: str,
    notes: str,
) -> dict[str, Any]:
    checks = required_checks(summary)
    checks_passed = all(check["passed"] is True for check in checks)
    accepted = decision == "accept" and checks_passed
    return {
        "kind": KIND,
        "schemaVersion": 1,
        "status": "reviewed_and_accepted" if accepted else "not_accepted",
        "humanReview": {
            "reviewer": reviewer,
            "reviewedAt": reviewed_at,
            "decision": decision,
            "notes": notes,
            "allowedDecisions": list(VALID_DECISIONS),
        },
        "releaseGate": {
            "record": "reviewed_and_accepted" if accepted else "not_accepted",
            "scope": "packaged_desktop_live_text_runtime_evidence",
            "canUseForFuturePromotionDecisions": accepted,
            "napoleonApprovalGranted": False,
            "releaseApprovalGranted": False,
            "memoryWriteAuthorized": False,
            "agentDispatchAuthorized": False,
            "externalSendAuthorized": False,
            "selfEvolutionAuthorized": False,
            "requiresFreshValidationForChangedEvidence": True,
        },
        "evidence": summarize_evidence(summary, summary_sha256),
        "requiredChecks": checks,
        "boundary": BOUNDARY,
    }


def render_markdown(artifact: dict[str, Any]) -> str:
    checks = artifact["requiredChecks"]
    checklist = [
        f"- [{'x' if check['passed'] else ' '}] `{check['id']}`: {check['detail']}"
        for check in checks
    ]
    evidence = artifact["evidence"]
    gate = artifact["releaseGate"]
    review = artifact["humanReview"]
    return "\n".join([
        "# Packaged Desktop Runtime Release Gate",
        "",
        "## Review Boundary",
        "",
        artifact["boundary"],
        "",
        "## Human Review",
        "",
        f"- Reviewer: `{review['reviewer']}`",
        f"- Reviewed at: `{review['reviewedAt']}`",
        f"- Decision: `{review['decision']}`",
        f"- Notes: {review['notes']}",
        f"- Record: `{gate['record']}`",
        "",
        "## Evidence",
        "",
        f"- Source summary SHA-256: `{evidence['sourceSummarySha256']}`",
        f"- Runtime source: `{evidence['runtimeSource']}`",
        f"- Promotion gate: `{evidence['promotionGate']}`",
        f"- Evidence path: `{evidence['evidencePath']}`",
        f"- Packaged desktop runtime connection: `{evidence['packagedDesktopRuntimeConnectionStatus']}`",
        f"- Artifact privacy: `{evidence['artifactPrivacyStatus']}`",
        f"- Napoleon required action count: `{evidence['napoleonRequiredActionCount']}`",
        "",
        "## Required Checks",
        "",
        *checklist,
        "",
        "## Result",
        "",
        f"- Future promotion decisions may use this reviewed and accepted record: `{str(gate['canUseForFuturePromotionDecisions']).lower()}`",
        f"- Napoleon approval granted: `{str(gate['napoleonApprovalGranted']).lower()}`",
        f"- Release approval granted by this artifact: `{str(gate['releaseApprovalGranted']).lower()}`",
        f"- Fresh validation required if the evidence changes: `{str(gate['requiresFreshValidationForChangedEvidence']).lower()}`",
        "",
    ])


def assert_accepted(artifact: dict[str, Any], summary_sha256: str) -> None:
    if artifact.get("kind") != KIND:
        raise SystemExit("Release gate artifact kind is invalid.")
    if artifact.get("status") != "reviewed_and_accepted":
        raise SystemExit("Release gate artifact is not reviewed and accepted.")
    evidence = nested(artifact, "evidence")
    if evidence.get("sourceSummarySha256") != summary_sha256:
        raise SystemExit("Release gate artifact does not match the current summary digest.")
    gate = nested(artifact, "releaseGate")
    if gate.get("canUseForFuturePromotionDecisions") is not True:
        raise SystemExit("Release gate artifact cannot be used for future promotion decisions.")
    if any(gate.get(key) is True for key in ["napoleonApprovalGranted", "releaseApprovalGranted"]):
        raise SystemExit("Release gate artifact incorrectly claims Napoleon or release approval.")
    checks = artifact.get("requiredChecks")
    if not isinstance(checks, list) or not checks or any(not isinstance(check, dict) or check.get("passed") is not True for check in checks):
        raise SystemExit("Release gate artifact required checks are not all passing.")


def current_timestamp() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--summary", default=str(DEFAULT_SUMMARY), help="live-runtime summary.json to review")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="release-gate JSON artifact path")
    parser.add_argument("--markdown-out", default=None, help="optional human-readable Markdown artifact path")
    parser.add_argument("--check-artifact", default=None, help="existing release-gate JSON artifact to validate")
    parser.add_argument("--reviewer", default="TBD", help="human reviewer name")
    parser.add_argument("--decision", choices=VALID_DECISIONS, default="request_revision")
    parser.add_argument("--reviewed-at", default=None, help="UTC review timestamp")
    parser.add_argument("--notes", default="Packaged desktop runtime evidence reviewed for local release-gate use.")
    args = parser.parse_args(argv)

    summary_path = Path(args.summary)
    summary = load_json(summary_path, "Live runtime summary")
    summary_sha256 = digest(summary_path)

    if args.check_artifact:
        artifact = load_json(Path(args.check_artifact), "Release gate artifact")
        assert_accepted(artifact, summary_sha256)
        print(json.dumps({
            "status": "accepted",
            "artifact": str(args.check_artifact),
            "summary_sha256": summary_sha256,
            "boundary": BOUNDARY,
        }, indent=2))
        return 0

    reviewed_at = args.reviewed_at or current_timestamp()
    artifact = build_artifact(
        summary=summary,
        summary_sha256=summary_sha256,
        reviewer=args.reviewer,
        decision=args.decision,
        reviewed_at=reviewed_at,
        notes=args.notes,
    )
    if args.decision == "accept" and artifact["status"] != "reviewed_and_accepted":
        failed = [check["id"] for check in artifact["requiredChecks"] if check["passed"] is not True]
        raise SystemExit(f"Cannot accept packaged desktop release gate; failed checks: {', '.join(failed)}")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(artifact, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    if args.markdown_out:
        markdown_out = Path(args.markdown_out)
        markdown_out.parent.mkdir(parents=True, exist_ok=True)
        markdown_out.write_text(render_markdown(artifact), encoding="utf-8")
    print(json.dumps({
        "out": str(out),
        "status": artifact["status"],
        "decision": args.decision,
        "summary_sha256": summary_sha256,
        "boundary": BOUNDARY,
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
