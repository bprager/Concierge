#!/usr/bin/env python3
"""Compare Concierge's local bridge contract with Napoleon integration docs."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONCIERGE_OPENAPI = ROOT / "api/napoleon_bridge.openapi.yaml"

SUPPORTED_ADVISORY_RUNTIME_PATHS = {
    "/cos/descriptor",
    "/cos/capabilities",
    "/cos/text-turn",
    "/cos/trace/{trace_id}",
}

NAPOLEON_REVIEW_CONTRACT_PATHS = {
    "/chief-of-staff/requests",
    "/chief-of-staff/reviews/evaluation",
    "/chief-of-staff/reviews/evolution-proposals",
    "/chief-of-staff/reviews/governance",
    "/chief-of-staff/reviews/new-agent-proposals",
    "/governance/evaluate",
    "/observability/traces",
    "/evolution/proposals",
    "/evolution/proposals/{proposal_id}/status",
}

SUPPORTED_REVIEW_RUNTIME_PATHS = {
    "/chief-of-staff/requests",
    "/chief-of-staff/reviews/evaluation",
    "/chief-of-staff/reviews/evolution-proposals",
    "/chief-of-staff/reviews/governance",
    "/chief-of-staff/reviews/new-agent-proposals",
    "/evolution/proposals",
    "/evolution/proposals/{proposal_id}/status",
    "/governance/evaluate",
    "/observability/traces",
}

NAPOLEON_DISCOVERY_CONTRACT_PATHS = {
    "/agents",
    "/agents/{agent_id}",
    "/profiles/{profile_id}",
}

SUPPORTED_DISCOVERY_RUNTIME_PATHS = {
    "/agents",
    "/agents/{agent_id}",
    "/profiles/{profile_id}",
}

LOCAL_HANDOFF_ALIAS_CANDIDATES = [
    {
        "localPath": "/v1/concierge/chief-of-staff/steering",
        "localOperation": "chief_of_staff_steering",
        "handoffKinds": [
            "capability_recommendation_handoff",
            "taxonomy_review_handoff",
            "governance_review_handoff",
        ],
        "napoleonContractPaths": [
            "/chief-of-staff/reviews/evolution-proposals",
            "/chief-of-staff/reviews/governance",
            "/evolution/proposals",
            "/governance/evaluate",
        ],
        "runtimeMappingStatus": "local_alias_not_explicit_napoleon_runtime_path",
    },
    {
        "localPath": "/v1/concierge/evaluate",
        "localOperation": "evaluate",
        "handoffKinds": ["evaluator_prompt"],
        "napoleonContractPaths": ["/chief-of-staff/reviews/evaluation"],
        "runtimeMappingStatus": "local_alias_not_explicit_napoleon_runtime_path",
    },
    {
        "localPath": "/v1/concierge/chief-of-staff/capabilities",
        "localOperation": "chief_of_staff_capabilities",
        "handoffKinds": ["capability_descriptor_discovery"],
        "napoleonContractPaths": ["/agents", "/agents/{agent_id}"],
        "runtimeMappingStatus": "metadata_discovery_alias_not_agent_dispatch",
    },
]

BLOCKED_REVIEW_TARGET_EFFECTS = [
    "capture approval",
    "apply evolution",
    "write memory",
    "dispatch agents",
    "send externally",
    "update registries",
    "append traces",
    "treat proposal status as local authority",
]


def load_yaml(path: Path) -> dict[str, Any]:
    value = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"YAML document must be an object: {path}")
    return value


def operation_paths(openapi: dict[str, Any]) -> list[str]:
    paths = openapi.get("paths")
    if not isinstance(paths, dict):
        return []
    return sorted(path for path in paths if isinstance(path, str))


def present_paths(paths: set[str], candidates: set[str]) -> list[str]:
    return sorted(path for path in candidates if path in paths)


def concierge_review_operations_missing_from_napoleon(
    concierge: dict[str, Any],
    napoleon_paths: set[str],
) -> list[dict[str, Any]]:
    operations = concierge.get("x-concierge-napoleon-review-operations", [])
    if not isinstance(operations, list):
        return []
    missing: list[dict[str, Any]] = []
    for operation in operations:
        if not isinstance(operation, dict):
            continue
        operation_id = operation.get("id")
        path = operation.get("path")
        request_kind = operation.get("requestKind")
        if not isinstance(operation_id, str) or not isinstance(path, str) or not isinstance(request_kind, str):
            continue
        if path not in napoleon_paths:
            missing.append(
                {
                    "id": operation_id,
                    "path": path,
                    "requestKind": request_kind,
                    "sideEffectsPerformed": False,
                    "approvalCaptured": False,
                    "memoryWritePerformed": False,
                    "agentDispatchPerformed": False,
                    "externalSendPerformed": False,
                }
            )
    return sorted(missing, key=lambda item: (item["path"], item["id"]))


def napoleon_required_actions_for_missing_concierge_review_operations(
    operations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = []
    for operation in operations:
        operation_id = operation["id"]
        path = operation["path"]
        request_kind = operation["requestKind"]
        action_id = f"expose_{operation_id}_runtime_target"
        actions.append(
            {
                "id": action_id,
                "owner": "napoleon_runtime",
                "operationId": operation_id,
                "path": path,
                "requestKind": request_kind,
                "requiredAction": (
                    f"Expose and advertise the read-only {operation_id} runtime target at {path} before "
                    "Concierge can refresh proposal status against live Napoleon."
                    if operation_id == "evolution_proposal_status"
                    else f"Expose and advertise the {operation_id} runtime target at {path} before Concierge can "
                    "use that named live Napoleon handoff."
                ),
                "reason": "named_concierge_review_target_missing_from_napoleon_snapshot",
                "blockingLivePromotion": True,
                "boundary": (
                    "Concierge must not fall back to free-form paths, "
                    + ", ".join(BLOCKED_REVIEW_TARGET_EFFECTS[:-1])
                    + f", or {BLOCKED_REVIEW_TARGET_EFFECTS[-1]}."
                ),
                "sideEffectsPerformed": False,
                "approvalCaptured": False,
                "memoryWritePerformed": False,
                "agentDispatchPerformed": False,
                "externalSendPerformed": False,
            }
        )
    return sorted(actions, key=lambda item: (item["path"], item["operationId"]))


def local_handoff_aliases(concierge_paths: set[str], napoleon_paths: set[str]) -> list[dict[str, Any]]:
    aliases: list[dict[str, Any]] = []
    for alias in LOCAL_HANDOFF_ALIAS_CANDIDATES:
        local_path = alias["localPath"]
        if local_path not in concierge_paths:
            continue
        matched_napoleon_paths = [path for path in alias["napoleonContractPaths"] if path in napoleon_paths]
        if not matched_napoleon_paths:
            continue
        matched_path_set = set(matched_napoleon_paths)
        if matched_path_set <= SUPPORTED_DISCOVERY_RUNTIME_PATHS:
            runtime_mapping_status = "explicit_metadata_discovery_paths_supported"
        elif matched_path_set <= SUPPORTED_REVIEW_RUNTIME_PATHS:
            runtime_mapping_status = "explicit_napoleon_runtime_paths_supported"
        else:
            runtime_mapping_status = alias["runtimeMappingStatus"]
        aliases.append(
            {
                **alias,
                "napoleonContractPaths": matched_napoleon_paths,
                "runtimeMappingStatus": runtime_mapping_status,
                "sideEffectsPerformed": False,
                "approvalCaptured": False,
                "memoryWritePerformed": False,
                "agentDispatchPerformed": False,
                "externalSendPerformed": False,
            }
        )
    return aliases


def build_alignment_report(concierge_openapi: Path, napoleon_openapi: Path) -> dict[str, Any]:
    concierge = load_yaml(concierge_openapi)
    napoleon = load_yaml(napoleon_openapi)
    concierge_paths = operation_paths(concierge)
    napoleon_paths = operation_paths(napoleon)
    concierge_set = set(concierge_paths)
    napoleon_set = set(napoleon_paths)
    napoleon_only = sorted(napoleon_set - concierge_set)
    concierge_only = sorted(concierge_set - napoleon_set)
    supported_advisory_runtime_paths = present_paths(napoleon_set, SUPPORTED_ADVISORY_RUNTIME_PATHS)
    supported_review_runtime_paths = present_paths(napoleon_set, SUPPORTED_REVIEW_RUNTIME_PATHS)
    napoleon_review_contract_paths = present_paths(napoleon_set, NAPOLEON_REVIEW_CONTRACT_PATHS)
    napoleon_discovery_contract_paths = present_paths(napoleon_set, NAPOLEON_DISCOVERY_CONTRACT_PATHS)
    supported_discovery_runtime_paths = present_paths(napoleon_set, SUPPORTED_DISCOVERY_RUNTIME_PATHS)
    concierge_review_operations_missing = concierge_review_operations_missing_from_napoleon(concierge, napoleon_set)
    concierge_review_paths_missing = sorted({operation["path"] for operation in concierge_review_operations_missing})
    napoleon_required_actions = napoleon_required_actions_for_missing_concierge_review_operations(
        concierge_review_operations_missing
    )
    napoleon_required_action_count = len(napoleon_required_actions)
    blocking_live_promotion = any(action.get("blockingLivePromotion") is True for action in napoleon_required_actions)
    aliases = local_handoff_aliases(concierge_set, napoleon_set)
    alias_covered_paths = {
        path
        for alias in aliases
        for path in alias["napoleonContractPaths"]
        if isinstance(path, str)
    }
    review_paths_needing_runtime_mapping = sorted(
        path
        for path in napoleon_review_contract_paths
        if path not in concierge_set
        and path not in SUPPORTED_ADVISORY_RUNTIME_PATHS
        and path not in SUPPORTED_REVIEW_RUNTIME_PATHS
    )
    review_paths_without_local_alias = sorted(path for path in review_paths_needing_runtime_mapping if path not in alias_covered_paths)
    discovery_paths_needing_runtime_mapping = sorted(
        path for path in napoleon_discovery_contract_paths if path not in SUPPORTED_DISCOVERY_RUNTIME_PATHS
    )
    runtime_mapped_napoleon_paths = (
        set(supported_advisory_runtime_paths)
        | set(supported_review_runtime_paths)
        | set(supported_discovery_runtime_paths)
        | alias_covered_paths
    )
    unmapped_napoleon_runtime_paths = sorted(path for path in napoleon_only if path not in runtime_mapped_napoleon_paths)
    runtime_aligned = (
        not unmapped_napoleon_runtime_paths
        and not review_paths_needing_runtime_mapping
        and not discovery_paths_needing_runtime_mapping
        and not concierge_review_paths_missing
    )
    alignment_status = (
        "exact_path_match"
        if not napoleon_only and not concierge_only
        else "runtime_mapped_with_local_contract_paths"
        if runtime_aligned
        else "runtime_mapping_gaps_present"
    )

    return {
        "aligned": not napoleon_only and not concierge_only,
        "runtimeAligned": runtime_aligned,
        "alignmentStatus": alignment_status,
        "conciergeContract": str(concierge_openapi),
        "napoleonContract": str(napoleon_openapi),
        "conciergePaths": concierge_paths,
        "napoleonPaths": napoleon_paths,
        "napoleonOnlyPaths": napoleon_only,
        "conciergeOnlyPaths": concierge_only,
        "unmappedNapoleonRuntimePaths": unmapped_napoleon_runtime_paths,
        "supportedAdvisoryRuntimePaths": supported_advisory_runtime_paths,
        "supportedReviewRuntimePaths": supported_review_runtime_paths,
        "supportedDiscoveryRuntimePaths": supported_discovery_runtime_paths,
        "napoleonReviewContractPaths": napoleon_review_contract_paths,
        "napoleonDiscoveryContractPaths": napoleon_discovery_contract_paths,
        "conciergeLocalHandoffAliases": aliases,
        "napoleonReviewPathsNeedingRuntimeMapping": review_paths_needing_runtime_mapping,
        "napoleonReviewPathsWithoutLocalAlias": review_paths_without_local_alias,
        "napoleonDiscoveryPathsNeedingRuntimeMapping": discovery_paths_needing_runtime_mapping,
        "conciergeReviewPathsMissingFromNapoleonRuntime": concierge_review_paths_missing,
        "conciergeReviewOperationsMissingFromNapoleonRuntime": concierge_review_operations_missing,
        "napoleonRequiredActions": napoleon_required_actions,
        "napoleonRequiredActionCount": napoleon_required_action_count,
        "blockingLivePromotion": blocking_live_promotion,
        "napoleonRuntimeAuthority": napoleon.get("x-napoleon-runtime-authority"),
        "nonAuthorityBoundary": "alignment_check_only",
        "sideEffectsPerformed": False,
        "approvalCaptured": False,
        "memoryWritePerformed": False,
        "agentDispatchPerformed": False,
        "externalSendPerformed": False,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--concierge-openapi",
        type=Path,
        default=DEFAULT_CONCIERGE_OPENAPI,
        help="Path to Concierge's local bridge OpenAPI contract.",
    )
    parser.add_argument(
        "--napoleon-openapi",
        type=Path,
        required=True,
        help="Path to Napoleon's Concierge integration OpenAPI contract.",
    )
    parser.add_argument(
        "--out",
        type=Path,
        help="Optional path where the alignment report JSON should be written.",
    )
    parser.add_argument("--strict", action="store_true", help="Exit non-zero when paths are not aligned.")
    args = parser.parse_args(argv)

    report = build_alignment_report(args.concierge_openapi, args.napoleon_openapi)
    serialized = json.dumps(report, indent=2, sort_keys=True)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(serialized + "\n", encoding="utf-8")
    print(serialized)
    if args.strict and not report["aligned"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
