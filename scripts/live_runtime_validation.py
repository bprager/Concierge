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
from urllib import error, request


ROOT = Path(__file__).resolve().parents[1]
EVALUATOR = ROOT / "evaluator"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(EVALUATOR) not in sys.path:
    sys.path.insert(0, str(EVALUATOR))

from scripts import bridge_evidence_capture


DEFAULT_OUT_DIR = Path("/tmp/concierge-live-runtime-validation")
EVALUATOR_PATH = "/v1/concierge/evaluate"
NAPOLEON_EVALUATION_REVIEW_PATH = "/chief-of-staff/reviews/evaluation"
CHIEF_OF_STAFF_REQUEST_PATH = "/chief-of-staff/requests"
GOVERNANCE_EVALUATION_PATH = "/governance/evaluate"
KNOWN_BRIDGE_PATHS = bridge_evidence_capture.KNOWN_BRIDGE_PATHS
EVALUATION_REVIEW_HANDOFF_NAMES = {"evaluation_review", "evaluation_reviews"}
CHIEF_OF_STAFF_REQUEST_HANDOFF_NAMES = {"chief_of_staff_request", "chief_of_staff_requests"}
GOVERNANCE_EVALUATION_HANDOFF_NAMES = {"governance_evaluation", "governance_evaluations"}
EVALUATION_REVIEW_HANDOFF_REQUIRED_ACTION = (
    "Napoleon must expose /chief-of-staff/reviews/evaluation and advertise evaluation_review "
    "in supportedHandoffs, supported_handoffs, required_for, or descriptor endpoint metadata."
)
CHIEF_OF_STAFF_REQUEST_HANDOFF_REQUIRED_ACTION = (
    "Napoleon must advertise chief_of_staff_request in supportedHandoffs, supported_handoffs, "
    "required_for, or descriptor endpoint metadata for /chief-of-staff/requests."
)
GOVERNANCE_EVALUATION_HANDOFF_REQUIRED_ACTION = (
    "Napoleon must advertise governance_evaluation in supportedHandoffs, supported_handoffs, "
    "required_for, or descriptor endpoint metadata for /governance/evaluate."
)
EVALUATION_REVIEW_NAPOLEON_ACTION = {
    "id": "advertise_evaluation_review_handoff",
    "owner": "napoleon",
    "reason": "real_runtime_promotion_blocker",
    "handoffName": "evaluation_review",
    "targetPath": NAPOLEON_EVALUATION_REVIEW_PATH,
    "requestKind": "evaluation_review_handoff",
    "operationId": "evaluation_review",
    "advertiseUsing": [
        "supportedHandoffs",
        "supported_handoffs",
        "required_for",
        "descriptor route metadata for /chief-of-staff/reviews/evaluation",
    ],
    "requiredAction": EVALUATION_REVIEW_HANDOFF_REQUIRED_ACTION,
    "sideEffectsPerformed": False,
    "approvalCaptured": False,
    "memoryWritePerformed": False,
    "agentDispatchPerformed": False,
    "externalSendPerformed": False,
    "appliedLocally": False,
}
CHIEF_OF_STAFF_REQUEST_NAPOLEON_ACTION = {
    "id": "advertise_chief_of_staff_request_handoff",
    "owner": "napoleon",
    "reason": "real_runtime_promotion_blocker",
    "handoffName": "chief_of_staff_request",
    "targetPath": CHIEF_OF_STAFF_REQUEST_PATH,
    "requestKind": "chief_of_staff_request_handoff",
    "operationId": "chief_of_staff_request",
    "advertiseUsing": [
        "supportedHandoffs",
        "supported_handoffs",
        "required_for",
        "descriptor route metadata for /chief-of-staff/requests",
    ],
    "requiredAction": CHIEF_OF_STAFF_REQUEST_HANDOFF_REQUIRED_ACTION,
    "sideEffectsPerformed": False,
    "approvalCaptured": False,
    "memoryWritePerformed": False,
    "agentDispatchPerformed": False,
    "externalSendPerformed": False,
    "appliedLocally": False,
}
GOVERNANCE_EVALUATION_NAPOLEON_ACTION = {
    "id": "advertise_governance_evaluation_handoff",
    "owner": "napoleon",
    "reason": "real_runtime_promotion_blocker",
    "handoffName": "governance_evaluation",
    "targetPath": GOVERNANCE_EVALUATION_PATH,
    "requestKind": "governance_evaluation_handoff",
    "operationId": "governance_evaluation",
    "advertiseUsing": [
        "supportedHandoffs",
        "supported_handoffs",
        "required_for",
        "descriptor route metadata for /governance/evaluate",
    ],
    "requiredAction": GOVERNANCE_EVALUATION_HANDOFF_REQUIRED_ACTION,
    "sideEffectsPerformed": False,
    "approvalCaptured": False,
    "memoryWritePerformed": False,
    "agentDispatchPerformed": False,
    "externalSendPerformed": False,
    "appliedLocally": False,
}
CONTRACT_PACKET_NAPOLEON_ACTIONS = {
    "chief_of_staff_request": CHIEF_OF_STAFF_REQUEST_NAPOLEON_ACTION,
    "governance_evaluation": GOVERNANCE_EVALUATION_NAPOLEON_ACTION,
}

BOUNDARY = (
    "Live runtime validation is evidence only. It is not Napoleon approval, "
    "not release approval, not a memory write, not agent dispatch, not an "
    "external send, and not authority to apply self-evolution changes."
)
ACCEPTED_BRIDGE_ENDPOINT_FORMS = [
    "Napoleon base URL",
    "/v1/concierge/turn",
    "/v1/concierge/chief-of-staff/descriptor",
    "/v1/concierge/chief-of-staff/steering",
    "/v1/concierge/memory-proposals",
    "/cos",
    "/cos/descriptor",
    "/cos/capabilities",
    "/cos/text-turn",
]
REDACTED_REPORT_FIELDS = {"response_excerpt"}
RUNTIME_VALIDATION_SOURCES = ("real_runtime", "local_harness", "local_simulation")
RUNTIME_ARTIFACT_FILENAMES = [
    "bridge_evidence.json",
    "capability_discovery.json",
    "contract_packet_submissions.json",
    "eval_http.json",
    "summary.json",
    "promotion_review.md",
]
DESKTOP_RUNTIME_TRANSPORT_KIND = "concierge.desktop-runtime-transport-validation.v1"
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
FORBIDDEN_TRUE_ARTIFACT_FLAGS = {
    "agentDispatchPerformed",
    "approvalCaptured",
    "endpointHostRetained",
    "externalSendPerformed",
    "memoryWritePerformed",
    "requestBodyRetained",
    "responseBodyRetained",
    "tokenRetained",
}
FORBIDDEN_TRUE_ARTIFACT_FLAG_KEYS = {
    normalized_artifact_field_name(field) for field in FORBIDDEN_TRUE_ARTIFACT_FLAGS
}


def runtime_validation_caveat(source: str) -> str:
    if source == "local_harness":
        return "Local harness validation is not real Napoleon runtime validation."
    if source == "local_simulation":
        return "Local simulation validation is not real Napoleon runtime validation."
    return "Real Napoleon runtime validation source."


def strip_known_path(endpoint: str) -> str:
    value = endpoint.strip().split("?", 1)[0].split("#", 1)[0].rstrip("/")
    for path in [
        *KNOWN_BRIDGE_PATHS,
        "/cos",
        NAPOLEON_EVALUATION_REVIEW_PATH,
        CHIEF_OF_STAFF_REQUEST_PATH,
        GOVERNANCE_EVALUATION_PATH,
    ]:
        if value.endswith(path):
            return value[: -len(path)].rstrip("/")
    return value


def is_cos_endpoint(endpoint: str) -> bool:
    value = endpoint.strip().split("?", 1)[0].split("#", 1)[0].rstrip("/")
    return (
        value.endswith("/cos")
        or value.endswith("/cos/descriptor")
        or value.endswith("/cos/capabilities")
        or value.endswith("/cos/text-turn")
    )


def is_generated_concierge_endpoint(endpoint: str) -> bool:
    value = endpoint.strip().split("?", 1)[0].split("#", 1)[0].rstrip("/")
    if is_cos_endpoint(value):
        return False
    if value.endswith(NAPOLEON_EVALUATION_REVIEW_PATH):
        return False
    return (
        "/v1/concierge" in value
        or value.endswith("/concierge")
        or value.startswith("http://127.0.0.1:")
        or value.startswith("http://localhost:")
    )


def derive_eval_endpoint(bridge_endpoint: str) -> str:
    if is_generated_concierge_endpoint(bridge_endpoint):
        return f"{strip_known_path(bridge_endpoint)}{EVALUATOR_PATH}"
    return f"{strip_known_path(bridge_endpoint)}{NAPOLEON_EVALUATION_REVIEW_PATH}"


def evaluator_target_metadata(eval_endpoint: str | None) -> dict[str, Any]:
    if eval_endpoint is None:
        return {
            "evaluatorTargetPath": None,
            "evaluatorTargetRequestKind": None,
            "evaluatorTargetOperationId": None,
            "evaluatorEndpointHostRetained": False,
            "evaluatorTokenRetained": False,
            "evaluatorRequestBodyRetained": False,
            "evaluatorResponseBodyRetained": False,
            "evaluatorApprovalCaptured": False,
            "evaluatorMemoryWritePerformed": False,
            "evaluatorAgentDispatchPerformed": False,
            "evaluatorExternalSendPerformed": False,
        }
    if is_generated_concierge_endpoint(eval_endpoint):
        return {
            "evaluatorTargetPath": EVALUATOR_PATH,
            "evaluatorTargetRequestKind": "evaluator_prompt",
            "evaluatorTargetOperationId": "evaluate",
            "evaluatorEndpointHostRetained": False,
            "evaluatorTokenRetained": False,
            "evaluatorRequestBodyRetained": False,
            "evaluatorResponseBodyRetained": False,
            "evaluatorApprovalCaptured": False,
            "evaluatorMemoryWritePerformed": False,
            "evaluatorAgentDispatchPerformed": False,
            "evaluatorExternalSendPerformed": False,
        }
    return {
        "evaluatorTargetPath": NAPOLEON_EVALUATION_REVIEW_PATH,
        "evaluatorTargetRequestKind": "evaluation_review_handoff",
        "evaluatorTargetOperationId": "evaluation_review",
        "evaluatorEndpointHostRetained": False,
        "evaluatorTokenRetained": False,
        "evaluatorRequestBodyRetained": False,
        "evaluatorResponseBodyRetained": False,
        "evaluatorApprovalCaptured": False,
        "evaluatorMemoryWritePerformed": False,
        "evaluatorAgentDispatchPerformed": False,
        "evaluatorExternalSendPerformed": False,
    }


def napoleon_required_actions_for_evaluator_failure(failure_reason: str | None) -> list[dict[str, Any]]:
    if failure_reason not in {"http_evaluator_handoff_not_advertised", "http_evaluator_route_not_found"}:
        return []
    return [dict(EVALUATION_REVIEW_NAPOLEON_ACTION)]


def napoleon_required_actions_for_missing_contract_handoffs(missing_handoffs: list[str]) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = []
    for handoff in missing_handoffs:
        action = CONTRACT_PACKET_NAPOLEON_ACTIONS.get(handoff)
        if action:
            actions.append(dict(action))
    return actions


def merge_napoleon_required_actions(*action_groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    seen: set[str] = set()
    for actions in action_groups:
        for action in actions:
            if not isinstance(action, dict):
                continue
            action_id = str(action.get("id") or "")
            if not action_id or action_id in seen:
                continue
            seen.add(action_id)
            merged.append(action)
    return merged


def descriptor_payload(payload: dict[str, Any]) -> dict[str, Any]:
    descriptor = payload.get("descriptor") if isinstance(payload.get("descriptor"), dict) else payload
    return descriptor if isinstance(descriptor, dict) else {}


def descriptor_advertises_handoff(
    payload: dict[str, Any],
    handoff_names: set[str],
    target_path: str,
) -> tuple[bool, str]:
    descriptor = descriptor_payload(payload)
    raw_handoffs = (
        descriptor.get("supportedHandoffs")
        if isinstance(descriptor.get("supportedHandoffs"), list)
        else descriptor.get("supported_handoffs")
        if isinstance(descriptor.get("supported_handoffs"), list)
        else []
    )
    handoffs = {str(handoff) for handoff in raw_handoffs if isinstance(handoff, str)}
    if handoffs.intersection(handoff_names):
        return True, "supported_handoffs"

    raw_required_for = descriptor.get("required_for") if isinstance(descriptor.get("required_for"), list) else []
    required_for = {str(handoff) for handoff in raw_required_for if isinstance(handoff, str)}
    if required_for.intersection(handoff_names):
        return True, "required_for"

    endpoints = descriptor.get("endpoints") if isinstance(descriptor.get("endpoints"), dict) else {}
    for key, value in endpoints.items():
        key_text = str(key)
        value_text = str(value)
        if key_text in handoff_names:
            return True, "descriptor_endpoints"
        if target_path in value_text:
            return True, "descriptor_endpoints"
    return False, "not_advertised"


def descriptor_advertises_evaluation_handoff(payload: dict[str, Any]) -> tuple[bool, str]:
    return descriptor_advertises_handoff(
        payload,
        EVALUATION_REVIEW_HANDOFF_NAMES,
        NAPOLEON_EVALUATION_REVIEW_PATH,
    )


def descriptor_evaluation_handoff_status(bridge_endpoint: str, auth_token: str | None) -> dict[str, Any]:
    try:
        cos_mode = is_cos_endpoint(bridge_endpoint)
        status_code, payload = bridge_evidence_capture.get_json(
            bridge_evidence_capture.descriptor_url(bridge_endpoint),
            auth_token,
            cos_mode,
        )
        descriptor_preflight = bridge_evidence_capture.descriptor_connection_from_response(status_code, payload)
        if (
            not descriptor_preflight["descriptorConnection"]["canAttemptLiveBridge"]
            and not cos_mode
            and status_code == 404
        ):
            status_code, payload = bridge_evidence_capture.get_json(
                bridge_evidence_capture.bridge_url(bridge_endpoint, "/cos/descriptor"),
                auth_token,
                True,
            )
            descriptor_preflight = bridge_evidence_capture.descriptor_connection_from_response(status_code, payload)
        if not descriptor_preflight["descriptorConnection"]["canAttemptLiveBridge"]:
            return {
                "descriptorHandoffAdvertised": False,
                "descriptorHandoffSource": "descriptor_not_ready",
                "descriptorHandoffFailureReason": "descriptor_preflight_failed",
            }
        advertised, source = descriptor_advertises_evaluation_handoff(payload)
        return {
            "descriptorHandoffAdvertised": advertised,
            "descriptorHandoffSource": source,
            "descriptorHandoffFailureReason": "none" if advertised else "evaluation_handoff_not_advertised",
        }
    except Exception as exc:
        return {
            "descriptorHandoffAdvertised": False,
            "descriptorHandoffSource": "descriptor_check_failed",
            "descriptorHandoffFailureReason": exc.__class__.__name__,
        }


def bridge_target_metadata(bridge_endpoint: str | None) -> dict[str, Any]:
    if bridge_endpoint is None:
        return {
            "bridgeDescriptorTargetPath": None,
            "bridgeDescriptorTargetOperationId": None,
            "bridgeCapabilityTargetPath": None,
            "bridgeCapabilityTargetOperationId": None,
            "bridgeTextTurnTargetPath": None,
            "bridgeTextTurnTargetOperationId": None,
            "bridgeTraceEvidenceTargetPath": None,
            "bridgeTraceEvidenceRequired": False,
            "bridgeEndpointHostRetained": False,
            "bridgeTokenRetained": False,
            "bridgeRequestBodyRetained": False,
            "bridgeResponseBodyRetained": False,
            "bridgeApprovalCaptured": False,
            "bridgeMemoryWritePerformed": False,
            "bridgeAgentDispatchPerformed": False,
            "bridgeExternalSendPerformed": False,
        }
    if is_cos_endpoint(bridge_endpoint):
        return {
            "bridgeDescriptorTargetPath": "/cos/descriptor",
            "bridgeDescriptorTargetOperationId": "chief_of_staff_descriptor",
            "bridgeCapabilityTargetPath": "/cos/capabilities",
            "bridgeCapabilityTargetOperationId": "chief_of_staff_capabilities",
            "bridgeTextTurnTargetPath": "/cos/text-turn",
            "bridgeTextTurnTargetOperationId": "text_turn",
            "bridgeTraceEvidenceTargetPath": "/cos/trace/{trace_id}",
            "bridgeTraceEvidenceRequired": True,
            "bridgeEndpointHostRetained": False,
            "bridgeTokenRetained": False,
            "bridgeRequestBodyRetained": False,
            "bridgeResponseBodyRetained": False,
            "bridgeApprovalCaptured": False,
            "bridgeMemoryWritePerformed": False,
            "bridgeAgentDispatchPerformed": False,
            "bridgeExternalSendPerformed": False,
        }
    return {
        "bridgeDescriptorTargetPath": "/v1/concierge/chief-of-staff/descriptor",
        "bridgeDescriptorTargetOperationId": "chief_of_staff_descriptor",
        "bridgeCapabilityTargetPath": "/v1/concierge/chief-of-staff/capabilities",
        "bridgeCapabilityTargetOperationId": "chief_of_staff_capabilities",
        "bridgeTextTurnTargetPath": "/v1/concierge/turn",
        "bridgeTextTurnTargetOperationId": "turn",
        "bridgeTraceEvidenceTargetPath": None,
        "bridgeTraceEvidenceRequired": False,
        "bridgeEndpointHostRetained": False,
        "bridgeTokenRetained": False,
        "bridgeRequestBodyRetained": False,
        "bridgeResponseBodyRetained": False,
        "bridgeApprovalCaptured": False,
        "bridgeMemoryWritePerformed": False,
        "bridgeAgentDispatchPerformed": False,
        "bridgeExternalSendPerformed": False,
    }


def endpoint_from_env(env: dict[str, str], key: str) -> str | None:
    value = env.get(key)
    return value.strip() if value and value.strip() else None


def clear_runtime_artifacts(out_dir: Path) -> None:
    for filename in RUNTIME_ARTIFACT_FILENAMES:
        artifact = out_dir / filename
        if artifact.exists():
            artifact.unlink()


def resolve_endpoint_configuration(
    bridge_endpoint: str | None,
    eval_endpoint: str | None,
    env: dict[str, str],
) -> dict[str, Any]:
    bridge_arg = bridge_endpoint.strip() if bridge_endpoint and bridge_endpoint.strip() else None
    eval_arg = eval_endpoint.strip() if eval_endpoint and eval_endpoint.strip() else None
    bridge_env = endpoint_from_env(env, "NAPOLEON_BRIDGE_ENDPOINT")
    eval_env = endpoint_from_env(env, "NAPOLEON_EVAL_ENDPOINT")

    bridge = bridge_arg or bridge_env
    evaluator = eval_arg or eval_env
    bridge_resolution = "argument" if bridge_arg else "env:NAPOLEON_BRIDGE_ENDPOINT" if bridge_env else "missing"
    evaluator_resolution = "argument" if eval_arg else "env:NAPOLEON_EVAL_ENDPOINT" if eval_env else "missing"

    if bridge is None and evaluator is not None:
        bridge = strip_known_path(evaluator)
        bridge_resolution = "derived_from_evaluator_endpoint"
    if evaluator is None and bridge is not None:
        evaluator = derive_eval_endpoint(bridge)
        evaluator_resolution = "derived_from_bridge_endpoint"

    return {
        "bridgeEndpoint": bridge,
        "evalEndpoint": evaluator,
        "resolution": {
            "bridgeEndpointResolution": bridge_resolution,
            "evaluatorEndpointResolution": evaluator_resolution,
            "bridgeEndpointExplicitlyConfigured": bridge_resolution in {"argument", "env:NAPOLEON_BRIDGE_ENDPOINT"},
            "evaluatorEndpointExplicitlyConfigured": evaluator_resolution in {"argument", "env:NAPOLEON_EVAL_ENDPOINT"},
        },
    }


def resolve_endpoints(
    bridge_endpoint: str | None,
    eval_endpoint: str | None,
    env: dict[str, str],
) -> tuple[str | None, str | None]:
    config = resolve_endpoint_configuration(bridge_endpoint, eval_endpoint, env)
    return config["bridgeEndpoint"], config["evalEndpoint"]


def auth_provisioning_metadata(
    auth_token: str | None,
    auth_token_file: str | None,
    env: dict[str, str],
) -> dict[str, Any]:
    direct_token_configured = bool(auth_token and auth_token.strip())
    env_token_configured = bool(env.get("NAPOLEON_EVAL_TOKEN") and env.get("NAPOLEON_EVAL_TOKEN", "").strip())
    token_file = (
        auth_token_file.strip()
        if auth_token_file and auth_token_file.strip()
        else bridge_evidence_capture.token_file_from_env(env)
    )
    token_file_configured = token_file is not None
    token_file_exists = bool(Path(token_file).is_file() if token_file_configured and token_file is not None else False)
    token_file_readable = bool(
        bridge_evidence_capture.read_auth_token_file(token_file)
        if token_file_configured and token_file is not None
        else False
    )
    if direct_token_configured:
        source = "argument"
    elif token_file_configured and token_file_readable:
        source = "token_file"
    elif token_file_configured and not token_file_exists:
        source = "token_file_missing"
    elif token_file_configured:
        source = "token_file_unreadable"
    elif env_token_configured:
        source = "environment"
    else:
        source = "not_configured"
    return {
        "source": source,
        "tokenConfigured": direct_token_configured or env_token_configured or token_file_readable,
        "tokenFileConfigured": token_file_configured,
        "tokenFileExists": token_file_exists,
        "tokenFileReadable": token_file_readable,
        "tokenRetained": False,
        "tokenFilePathRetained": False,
    }


def live_runtime_preflight(
    bridge_endpoint: str | None,
    eval_endpoint: str | None,
    endpoint_resolution: dict[str, Any] | None = None,
    auth_provisioning: dict[str, Any] | None = None,
    packaged_desktop_transport: dict[str, Any] | None = None,
) -> dict[str, Any]:
    bridge_configured = bridge_endpoint is not None
    eval_configured = eval_endpoint is not None
    missing_configuration = [] if bridge_configured else ["NAPOLEON_BRIDGE_ENDPOINT"]
    resolution = endpoint_resolution or {
        "bridgeEndpointResolution": "configured" if bridge_configured else "missing",
        "evaluatorEndpointResolution": "configured" if eval_configured else "missing",
        "bridgeEndpointExplicitlyConfigured": bridge_configured,
        "evaluatorEndpointExplicitlyConfigured": eval_configured,
    }
    packaged_transport = packaged_desktop_transport or packaged_desktop_transport_default(False)
    next_validation_command = (
        "NAPOLEON_BRIDGE_ENDPOINT=<base-url-or-operation-url> make packaged-live-runtime-validation"
        if packaged_transport.get("required")
        else "NAPOLEON_BRIDGE_ENDPOINT=<base-url-or-operation-url> make live-runtime-validation"
    )
    return {
        "status": "ready_to_attempt" if bridge_configured else "blocked",
        "reason": "ready" if bridge_configured else "missing_bridge_endpoint",
        "missingConfiguration": missing_configuration,
        "bridgeEndpointConfigured": bridge_configured,
        "evaluatorEndpointConfiguredOrDerived": eval_configured,
        "expectedBridgeConfiguration": "Set NAPOLEON_BRIDGE_ENDPOINT to a Napoleon base URL or known governed bridge operation URL.",
        "expectedEvaluatorConfiguration": "Set NAPOLEON_EVAL_ENDPOINT only when the evaluator endpoint differs from /v1/concierge/evaluate on the bridge base.",
        "runtimeAlignment": {
            "requiredBridgeEndpointEnv": "NAPOLEON_BRIDGE_ENDPOINT",
            "requiredEvaluatorEndpointEnv": "NAPOLEON_EVAL_ENDPOINT",
            "acceptedBridgeEndpointForms": ACCEPTED_BRIDGE_ENDPOINT_FORMS,
            "descriptorDiscoveryRequired": True,
            "localHarnessSubstituteAllowed": False,
            "nextValidationCommand": next_validation_command,
            "boundary": "A local harness or simulation can test shape only; it cannot prove real Napoleon runtime readiness.",
            **resolution,
            **bridge_target_metadata(bridge_endpoint),
            **evaluator_target_metadata(eval_endpoint),
        },
        "endpointHostStored": False,
        "tokenStored": False,
        "authProvisioning": auth_provisioning or auth_provisioning_metadata(None, None, {}),
        "packagedDesktopTransport": packaged_transport,
        "approvalCaptured": False,
        "memoryWritePerformed": False,
        "agentDispatchPerformed": False,
        "externalSendPerformed": False,
        "appliedLocally": False,
        "boundary": BOUNDARY,
    }


def packaged_desktop_transport_default(required: bool) -> dict[str, Any]:
    return {
        "status": "missing" if required else "not_required",
        "required": required,
        "reportKind": None,
        "reportStatus": None,
        "usesTauriCommandPath": False,
        "browserProxyRequired": None,
        "nativeAuthFallbackWhenWebviewOmitsAuth": False,
        "webviewAuthHeadersStrippedWhenNativeAuthEnabled": False,
        "nativeAuthEnforcedAtCommandBoundary": False,
        "nativeEndpointResolution": False,
        "endpointHostOmittedFromInvokePayload": False,
        "nativeLocalEndpointReadiness": False,
        "packagedBinaryConfigProbePassed": False,
        "packagedBinaryTransportProbePassed": False,
        "packagedBinaryGeneratedLocalLiveProbePassed": False,
        "packagedBinaryCosLocalLiveProbePassed": False,
        "packagedBinaryLocalLiveProbePassed": False,
        "packagedBinaryLiveProbeConfigured": False,
        "packagedBinaryLiveProbePassed": False,
        "packagedBinaryLiveProbeDescriptorPassed": False,
        "packagedBinaryLiveProbeCapabilitiesPassed": False,
        "packagedBinaryLiveProbeTextTurnPassed": False,
        "packagedBinaryLiveProbeTracePassed": False,
        "packagedBinaryLiveProbeSideEffectClaimed": False,
        "packagedBinaryLiveProbeRouteFamily": "unknown",
        "packagedBinaryLiveProbeFailureStage": "unknown",
        "packagedBinaryLiveProbeFailureKind": "unknown",
        "macosAppBundleLiveProbeConfigured": False,
        "macosAppBundleLiveProbePassed": False,
        "macosAppBundleLiveProbeDescriptorPassed": False,
        "macosAppBundleLiveProbeCapabilitiesPassed": False,
        "macosAppBundleLiveProbeTextTurnPassed": False,
        "macosAppBundleLiveProbeTracePassed": False,
        "macosAppBundleLiveProbeSideEffectClaimed": False,
        "macosAppBundleLiveProbeRouteFamily": "unknown",
        "macosAppBundleLiveProbeFailureStage": "unknown",
        "macosAppBundleLiveProbeFailureKind": "unknown",
        "governedRouteAllowlistEnforced": False,
        "governedRouteMethodAllowlistEnforced": False,
        "packagedNoBundleBuildPassed": False,
        "endpointHostRetained": False,
        "tokenRetained": False,
        "tokenFilePathRetained": False,
        "requestBodyRetained": False,
        "responseBodyRetained": False,
        "approvalCaptured": False,
        "memoryWritePerformed": False,
        "agentDispatchPerformed": False,
        "externalSendPerformed": False,
        "runtimeAuthorityGranted": False,
        "doesNotContactNapoleon": True,
        "boundary": "Packaged desktop transport evidence was not provided for this run.",
    }


def packaged_desktop_transport_summary(report_path: Path | None, required: bool) -> dict[str, Any]:
    if report_path is None:
        return packaged_desktop_transport_default(required)
    try:
        report = load_json(report_path)
    except Exception as exc:
        return {
            **packaged_desktop_transport_default(required),
            "status": "failed",
            "failureReason": exc.__class__.__name__,
        }
    if not isinstance(report, dict):
        return {
            **packaged_desktop_transport_default(required),
            "status": "failed",
            "failureReason": "invalid_report",
        }

    transport = report.get("packagedDesktopTransport") if isinstance(report.get("packagedDesktopTransport"), dict) else {}
    boundary = report.get("authorityBoundary") if isinstance(report.get("authorityBoundary"), dict) else {}
    checks = report.get("checks") if isinstance(report.get("checks"), list) else []
    all_checks_passed = all(
        isinstance(check, dict)
        and (
            check.get("status") == "passed"
            or (
                check.get("id")
                in {
                    "tauri_packaged_desktop_binary_live_probe",
                    "tauri_macos_app_bundle_live_probe",
                }
                and check.get("status") == "not_configured"
            )
        )
        for check in checks
    )
    no_retention = not any(
        transport.get(flag) is True
        for flag in [
            "endpointHostRetained",
            "tokenRetained",
            "tokenFilePathRetained",
            "requestBodyRetained",
            "responseBodyRetained",
        ]
    )
    no_side_effects = not any(
        boundary.get(flag) is True
        for flag in [
            "runtimeAuthorityGranted",
            "approvalCaptured",
            "memoryWritePerformed",
            "agentDispatchPerformed",
            "externalSendPerformed",
        ]
    )
    passed = (
        report.get("kind") == DESKTOP_RUNTIME_TRANSPORT_KIND
        and report.get("status") == "passed"
        and all_checks_passed
        and transport.get("usesTauriCommandPath") is True
        and transport.get("browserProxyRequired") is False
        and transport.get("nativeAuthFallbackWhenWebviewOmitsAuth") is True
        and transport.get("webviewAuthHeadersStrippedWhenNativeAuthEnabled") is True
        and transport.get("nativeAuthEnforcedAtCommandBoundary") is True
        and transport.get("nativeEndpointResolution") is True
        and transport.get("endpointHostOmittedFromInvokePayload") is True
        and transport.get("nativeLocalEndpointReadiness") is True
        and transport.get("packagedBinaryConfigProbePassed") is True
        and transport.get("packagedBinaryTransportProbePassed") is True
        and transport.get("packagedBinaryGeneratedLocalLiveProbePassed") is True
        and transport.get("packagedBinaryCosLocalLiveProbePassed") is True
        and transport.get("packagedBinaryLocalLiveProbePassed") is True
        and transport.get("governedRouteAllowlistEnforced") is True
        and transport.get("governedRouteMethodAllowlistEnforced") is True
        and transport.get("packagedNoBundleBuildPassed") is True
        and no_retention
        and no_side_effects
    )
    does_not_contact_napoleon = boundary.get("doesNotContactNapoleon") is True
    boundary_text = (
        "Packaged desktop transport evidence is sanitized local build/transport proof only and does not contact Napoleon or grant authority."
        if does_not_contact_napoleon
        else "Packaged desktop transport evidence includes a configured validation-only live probe and does not grant authority or retain endpoint hosts, tokens, request bodies, or response bodies."
    )
    return {
        "status": "passed" if passed else "failed",
        "required": required,
        "reportKind": report.get("kind"),
        "reportStatus": report.get("status"),
        "checkCount": len(checks),
        "checksPassed": all_checks_passed,
        "usesTauriCommandPath": transport.get("usesTauriCommandPath") is True,
        "browserProxyRequired": transport.get("browserProxyRequired") is True,
        "nativeAuthFallbackWhenWebviewOmitsAuth": transport.get("nativeAuthFallbackWhenWebviewOmitsAuth") is True,
        "webviewAuthHeadersStrippedWhenNativeAuthEnabled": (
            transport.get("webviewAuthHeadersStrippedWhenNativeAuthEnabled") is True
        ),
        "nativeAuthEnforcedAtCommandBoundary": (
            transport.get("nativeAuthEnforcedAtCommandBoundary") is True
        ),
        "nativeEndpointResolution": transport.get("nativeEndpointResolution") is True,
        "endpointHostOmittedFromInvokePayload": (
            transport.get("endpointHostOmittedFromInvokePayload") is True
        ),
        "nativeLocalEndpointReadiness": transport.get("nativeLocalEndpointReadiness") is True,
        "packagedBinaryConfigProbePassed": (
            transport.get("packagedBinaryConfigProbePassed") is True
        ),
        "packagedBinaryTransportProbePassed": (
            transport.get("packagedBinaryTransportProbePassed") is True
        ),
        "packagedBinaryGeneratedLocalLiveProbePassed": (
            transport.get("packagedBinaryGeneratedLocalLiveProbePassed") is True
        ),
        "packagedBinaryCosLocalLiveProbePassed": (
            transport.get("packagedBinaryCosLocalLiveProbePassed") is True
        ),
        "packagedBinaryLocalLiveProbePassed": (
            transport.get("packagedBinaryLocalLiveProbePassed") is True
        ),
        "packagedBinaryLiveProbeConfigured": (
            transport.get("packagedBinaryLiveProbeConfigured") is True
        ),
        "packagedBinaryLiveProbePassed": (
            transport.get("packagedBinaryLiveProbePassed") is True
        ),
        "packagedBinaryLiveProbeDescriptorPassed": (
            transport.get("packagedBinaryLiveProbeDescriptorPassed") is True
        ),
        "packagedBinaryLiveProbeCapabilitiesPassed": (
            transport.get("packagedBinaryLiveProbeCapabilitiesPassed") is True
        ),
        "packagedBinaryLiveProbeTextTurnPassed": (
            transport.get("packagedBinaryLiveProbeTextTurnPassed") is True
        ),
        "packagedBinaryLiveProbeTracePassed": (
            transport.get("packagedBinaryLiveProbeTracePassed") is True
        ),
        "packagedBinaryLiveProbeSideEffectClaimed": (
            transport.get("packagedBinaryLiveProbeSideEffectClaimed") is True
        ),
        "packagedBinaryLiveProbeRouteFamily": (
            transport.get("packagedBinaryLiveProbeRouteFamily")
            if isinstance(transport.get("packagedBinaryLiveProbeRouteFamily"), str)
            else "unknown"
        ),
        "packagedBinaryLiveProbeFailureStage": (
            transport.get("packagedBinaryLiveProbeFailureStage")
            if isinstance(transport.get("packagedBinaryLiveProbeFailureStage"), str)
            else "unknown"
        ),
        "packagedBinaryLiveProbeFailureKind": (
            transport.get("packagedBinaryLiveProbeFailureKind")
            if isinstance(transport.get("packagedBinaryLiveProbeFailureKind"), str)
            else "unknown"
        ),
        "macosAppBundleLiveProbeConfigured": (
            transport.get("macosAppBundleLiveProbeConfigured") is True
        ),
        "macosAppBundleLiveProbePassed": (
            transport.get("macosAppBundleLiveProbePassed") is True
        ),
        "macosAppBundleLiveProbeDescriptorPassed": (
            transport.get("macosAppBundleLiveProbeDescriptorPassed") is True
        ),
        "macosAppBundleLiveProbeCapabilitiesPassed": (
            transport.get("macosAppBundleLiveProbeCapabilitiesPassed") is True
        ),
        "macosAppBundleLiveProbeTextTurnPassed": (
            transport.get("macosAppBundleLiveProbeTextTurnPassed") is True
        ),
        "macosAppBundleLiveProbeTracePassed": (
            transport.get("macosAppBundleLiveProbeTracePassed") is True
        ),
        "macosAppBundleLiveProbeSideEffectClaimed": (
            transport.get("macosAppBundleLiveProbeSideEffectClaimed") is True
        ),
        "macosAppBundleLiveProbeRouteFamily": (
            transport.get("macosAppBundleLiveProbeRouteFamily")
            if isinstance(transport.get("macosAppBundleLiveProbeRouteFamily"), str)
            else "unknown"
        ),
        "macosAppBundleLiveProbeFailureStage": (
            transport.get("macosAppBundleLiveProbeFailureStage")
            if isinstance(transport.get("macosAppBundleLiveProbeFailureStage"), str)
            else "unknown"
        ),
        "macosAppBundleLiveProbeFailureKind": (
            transport.get("macosAppBundleLiveProbeFailureKind")
            if isinstance(transport.get("macosAppBundleLiveProbeFailureKind"), str)
            else "unknown"
        ),
        "governedRouteAllowlistEnforced": transport.get("governedRouteAllowlistEnforced") is True,
        "governedRouteMethodAllowlistEnforced": (
            transport.get("governedRouteMethodAllowlistEnforced") is True
        ),
        "packagedNoBundleBuildPassed": transport.get("packagedNoBundleBuildPassed") is True,
        "endpointHostRetained": transport.get("endpointHostRetained") is True,
        "tokenRetained": transport.get("tokenRetained") is True,
        "tokenFilePathRetained": transport.get("tokenFilePathRetained") is True,
        "requestBodyRetained": transport.get("requestBodyRetained") is True,
        "responseBodyRetained": transport.get("responseBodyRetained") is True,
        "approvalCaptured": boundary.get("approvalCaptured") is True,
        "memoryWritePerformed": boundary.get("memoryWritePerformed") is True,
        "agentDispatchPerformed": boundary.get("agentDispatchPerformed") is True,
        "externalSendPerformed": boundary.get("externalSendPerformed") is True,
        "runtimeAuthorityGranted": boundary.get("runtimeAuthorityGranted") is True,
        "doesNotContactNapoleon": does_not_contact_napoleon,
        "failureReason": "none" if passed else "packaged_desktop_transport_report_failed",
        "boundary": boundary_text,
    }


def write_preflight(
    path: Path,
    bridge_endpoint: str | None,
    eval_endpoint: str | None,
    endpoint_resolution: dict[str, Any] | None = None,
    auth_provisioning: dict[str, Any] | None = None,
    packaged_desktop_transport: dict[str, Any] | None = None,
) -> dict[str, Any]:
    preflight = live_runtime_preflight(
        bridge_endpoint,
        eval_endpoint,
        endpoint_resolution,
        auth_provisioning,
        packaged_desktop_transport,
    )
    path.write_text(json.dumps(preflight, indent=2) + "\n", encoding="utf-8")
    return preflight


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


def classify_http_eval_failure(exc: Exception) -> str:
    status_code = getattr(getattr(exc, "response", None), "status_code", None)
    if status_code == 404:
        return "http_evaluator_route_not_found"
    if status_code == 401 or status_code == 403:
        return "http_evaluator_auth_failed"
    if status_code is not None:
        return "http_evaluator_failed"
    return "http_evaluator_failed"


def write_sanitized_evaluator_failure_report(
    path: Path,
    eval_endpoint: str,
    failure_reason: str,
    descriptor_handoff: dict[str, Any] | None = None,
) -> None:
    target = evaluator_target_metadata(eval_endpoint)
    handoff = descriptor_handoff or {}
    required_action = (
        EVALUATION_REVIEW_HANDOFF_REQUIRED_ACTION
        if failure_reason in {"http_evaluator_handoff_not_advertised", "http_evaluator_route_not_found"}
        else None
    )
    napoleon_required_actions = napoleon_required_actions_for_evaluator_failure(failure_reason)
    path.write_text(
        json.dumps(
            {
                "status": "failed",
                "run_id": "not_run",
                "failureReason": failure_reason,
                "evaluationTarget": {
                    "path": target["evaluatorTargetPath"],
                    "requestKind": target["evaluatorTargetRequestKind"],
                    "operationId": target["evaluatorTargetOperationId"],
                    "endpointHostRetained": False,
                    "tokenRetained": False,
                    "requestBodyRetained": False,
                    "responseBodyRetained": False,
                    "approvalCaptured": False,
                    "memoryWritePerformed": False,
                    "agentDispatchPerformed": False,
                    "externalSendPerformed": False,
                    "descriptorHandoffAdvertised": handoff.get("descriptorHandoffAdvertised"),
                    "descriptorHandoffSource": handoff.get("descriptorHandoffSource"),
                    "descriptorHandoffFailureReason": handoff.get("descriptorHandoffFailureReason", "none"),
                    "descriptorHandoffRequiredAction": required_action,
                    "napoleonRequiredActions": napoleon_required_actions,
                    "authorityBoundary": "Evaluator HTTP failure evidence is sanitized and non-authorizing.",
                },
                "live_runtime_sanitization": {
                    "responseExcerptsRemoved": 0,
                    "boundary": "Live runtime validation report omits endpoint values, tokens, request bodies, and response bodies.",
                },
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def capability_discovery_url(endpoint: str) -> str:
    base = endpoint.strip().split("?", 1)[0].split("#", 1)[0].rstrip("/")
    if is_cos_endpoint(endpoint):
        return f"{strip_known_path(base)}/cos/capabilities"
    return f"{strip_known_path(base)}/v1/concierge/chief-of-staff/capabilities"


def capability_target_path(endpoint: str) -> str:
    return "/cos/capabilities" if is_cos_endpoint(endpoint) else "/v1/concierge/chief-of-staff/capabilities"


def capability_discovery_candidates(endpoint: str) -> list[dict[str, Any]]:
    base = endpoint.strip().split("?", 1)[0].split("#", 1)[0].rstrip("/")
    stripped_base = strip_known_path(base)
    if is_cos_endpoint(endpoint):
        return [
            {
                "url": f"{stripped_base}/cos/capabilities",
                "targetPath": "/cos/capabilities",
                "cosMode": True,
            }
        ]
    return [
        {
            "url": f"{stripped_base}/v1/concierge/chief-of-staff/capabilities",
            "targetPath": "/v1/concierge/chief-of-staff/capabilities",
            "cosMode": False,
        },
        {
            "url": f"{stripped_base}/cos/capabilities",
            "targetPath": "/cos/capabilities",
            "cosMode": True,
        },
    ]


def capability_discovery_headers(auth_token: str | None, cos_mode: bool) -> dict[str, str]:
    if not auth_token:
        return {}
    return {"X-Napoleon-Auth": auth_token} if cos_mode else {"Authorization": f"Bearer {auth_token}"}


def load_remote_json(url: str, headers: dict[str, str]) -> tuple[int, Any]:
    req = request.Request(url, headers=headers, method="GET")
    try:
        with request.urlopen(req, timeout=10) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        payload = json.loads(body) if body else {}
        return exc.code, payload


def sanitized_capability_discovery_evidence(
    status_code: int,
    payload: Any,
    endpoint: str,
    runtime_validation_source: str,
    target_path: str | None = None,
) -> dict[str, Any]:
    capabilities = payload.get("capabilities") if isinstance(payload, dict) and isinstance(payload.get("capabilities"), list) else []
    safe_capabilities = [capability for capability in capabilities if isinstance(capability, dict)]
    capability_ids = sorted(
        str(capability.get("id") or capability.get("capability_id"))
        for capability in safe_capabilities
        if isinstance(capability.get("id") or capability.get("capability_id"), str)
        and (capability.get("id") or capability.get("capability_id"))
    )
    authority_tier_counts: dict[str, int] = {}
    for capability in safe_capabilities:
        tier = capability.get("authorityTier") or capability.get("authority_tier")
        if tier is None and isinstance(payload, dict):
            tier = payload.get("authorityTier") or payload.get("authority_tier")
        if isinstance(tier, str) and tier:
            authority_tier_counts[tier] = authority_tier_counts.get(tier, 0) + 1
    blocked_effects = []
    if isinstance(payload, dict):
        raw_blocked_effects = payload.get("blockedEffects") if isinstance(payload.get("blockedEffects"), list) else payload.get("blocked_effects")
        if isinstance(raw_blocked_effects, list):
            blocked_effects = sorted(str(effect) for effect in raw_blocked_effects if isinstance(effect, str) and effect)
    if not blocked_effects:
        nested_blocked_effects = set()
        for capability in safe_capabilities:
            raw_blocked_effects = (
                capability.get("blockedEffects")
                if isinstance(capability.get("blockedEffects"), list)
                else capability.get("blocked_effects")
            )
            if isinstance(raw_blocked_effects, list):
                nested_blocked_effects.update(str(effect) for effect in raw_blocked_effects if isinstance(effect, str) and effect)
        blocked_effects = sorted(nested_blocked_effects)
    runtime_authority = payload.get("runtimeAuthority") if isinstance(payload, dict) else None
    if runtime_authority is None and isinstance(payload, dict):
        runtime_authority = payload.get("runtime_authority")
    response_approval_captured = False
    response_memory_write_performed = False
    response_agent_dispatch_performed = False
    response_external_send_performed = False
    if isinstance(payload, dict):
        response_approval_captured = payload.get("approvalCaptured") is True or payload.get("approval_captured") is True
        response_memory_write_performed = (
            payload.get("memoryWritePerformed") is True or payload.get("memory_write_performed") is True
        )
        response_agent_dispatch_performed = (
            payload.get("agentDispatchPerformed") is True or payload.get("agent_dispatch_performed") is True
        )
        response_external_send_performed = (
            payload.get("externalSendPerformed") is True or payload.get("external_send_performed") is True
        )
    manifest_prepare_only = (
        isinstance(payload, dict)
        and (payload.get("status") == "advisory_prepare_only" or payload.get("authority_tier") == "advisory_prepare_only")
    )
    capabilities_are_proposal_only = all(
        capability.get("proposalOnly") is True
        or capability.get("proposal_only") is True
        or (manifest_prepare_only and capability.get("runtime_authority") is False)
        for capability in safe_capabilities
    )
    passed = (
        status_code == 200
        and bool(safe_capabilities)
        and runtime_authority is False
        and capabilities_are_proposal_only
        and not response_approval_captured
        and not response_memory_write_performed
        and not response_agent_dispatch_performed
        and not response_external_send_performed
    )
    return {
        "kind": "chief_of_staff_capability_discovery_evidence",
        "status": "passed" if passed else "failed",
        "httpStatus": status_code,
        "targetPath": target_path or capability_target_path(endpoint),
        "operationId": "chief_of_staff_capabilities",
        "requestKind": "chief_of_staff_capabilities",
        "runtimeValidationSource": runtime_validation_source,
        "capabilityCount": len(safe_capabilities),
        "capabilityIds": capability_ids,
        "authorityTierCounts": authority_tier_counts,
        "runtimeAuthority": runtime_authority is True,
        "responseApprovalCaptured": response_approval_captured,
        "responseMemoryWritePerformed": response_memory_write_performed,
        "responseAgentDispatchPerformed": response_agent_dispatch_performed,
        "responseExternalSendPerformed": response_external_send_performed,
        "blockedEffects": blocked_effects,
        "endpointHostRetained": False,
        "tokenRetained": False,
        "responseBodyRetained": False,
        "approvalCaptured": False,
        "memoryWritePerformed": False,
        "agentDispatchPerformed": False,
        "externalSendPerformed": False,
        "boundary": "Capability discovery evidence is sanitized metadata only and is not approval, dispatch, memory write, or external send authority.",
    }


def run_capability_discovery(
    bridge_endpoint: str,
    out_path: Path,
    auth_token: str | None,
    runtime_validation_source: str,
) -> tuple[int, str | None]:
    try:
        selected_target_path = capability_target_path(bridge_endpoint)
        status_code = 0
        payload: Any = {}
        for candidate in capability_discovery_candidates(bridge_endpoint):
            selected_target_path = str(candidate["targetPath"])
            status_code, payload = load_remote_json(
                str(candidate["url"]),
                capability_discovery_headers(auth_token, bool(candidate["cosMode"])),
            )
            if status_code != 404:
                break
        evidence = sanitized_capability_discovery_evidence(
            status_code,
            payload,
            bridge_endpoint,
            runtime_validation_source,
            selected_target_path,
        )
        out_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
        return (0 if evidence["status"] == "passed" else 1), None
    except Exception as exc:
        evidence = {
            "kind": "chief_of_staff_capability_discovery_evidence",
            "status": "failed",
            "failureReason": exc.__class__.__name__,
            "targetPath": capability_target_path(bridge_endpoint),
            "operationId": "chief_of_staff_capabilities",
            "requestKind": "chief_of_staff_capabilities",
            "runtimeValidationSource": runtime_validation_source,
            "capabilityCount": 0,
            "capabilityIds": [],
            "authorityTierCounts": {},
            "runtimeAuthority": False,
            "blockedEffects": [],
            "endpointHostRetained": False,
            "tokenRetained": False,
            "responseBodyRetained": False,
            "approvalCaptured": False,
            "memoryWritePerformed": False,
            "agentDispatchPerformed": False,
            "externalSendPerformed": False,
            "boundary": "Capability discovery failed closed without retaining endpoint hosts, tokens, or response bodies.",
        }
        out_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
        return 1, exc.__class__.__name__


def contract_packet_submission_targets(bridge_endpoint: str) -> list[dict[str, Any]]:
    base = strip_known_path(bridge_endpoint)
    return [
        {
            "targetPath": CHIEF_OF_STAFF_REQUEST_PATH,
            "operationId": "chief_of_staff_request",
            "requestKind": "chief_of_staff_request_handoff",
            "handoffNames": CHIEF_OF_STAFF_REQUEST_HANDOFF_NAMES,
            "url": f"{base}{CHIEF_OF_STAFF_REQUEST_PATH}",
        },
        {
            "targetPath": GOVERNANCE_EVALUATION_PATH,
            "operationId": "governance_evaluation",
            "requestKind": "governance_evaluation_handoff",
            "handoffNames": GOVERNANCE_EVALUATION_HANDOFF_NAMES,
            "url": f"{base}{GOVERNANCE_EVALUATION_PATH}",
        },
    ]


def contract_packet_headers(auth_token: str | None, bridge_endpoint: str) -> dict[str, str]:
    if not auth_token:
        return {"Content-Type": "application/json"}
    if is_generated_concierge_endpoint(bridge_endpoint):
        return {"Content-Type": "application/json", "Authorization": f"Bearer {auth_token}"}
    return {"Content-Type": "application/json", "X-Napoleon-Auth": auth_token}


def post_remote_json(url: str, payload: dict[str, Any], headers: dict[str, str]) -> tuple[int, Any]:
    data = json.dumps(payload).encode("utf-8")
    req = request.Request(url, data=data, headers=headers, method="POST")
    try:
        with request.urlopen(req, timeout=10) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        decoded = json.loads(raw) if raw else {}
        return exc.code, decoded


def load_descriptor_for_contract_packets(
    bridge_endpoint: str,
    auth_token: str | None,
) -> tuple[int, dict[str, Any], str]:
    cos_mode = is_cos_endpoint(bridge_endpoint)
    status_code, payload = bridge_evidence_capture.get_json(
        bridge_evidence_capture.descriptor_url(bridge_endpoint),
        auth_token,
        cos_mode,
    )
    descriptor_preflight = bridge_evidence_capture.descriptor_connection_from_response(status_code, payload)
    if (
        not descriptor_preflight["descriptorConnection"]["canAttemptLiveBridge"]
        and not cos_mode
        and status_code == 404
    ):
        status_code, payload = bridge_evidence_capture.get_json(
            bridge_evidence_capture.bridge_url(bridge_endpoint, "/cos/descriptor"),
            auth_token,
            True,
        )
        descriptor_preflight = bridge_evidence_capture.descriptor_connection_from_response(status_code, payload)
    if not descriptor_preflight["descriptorConnection"]["canAttemptLiveBridge"]:
        return status_code, {}, "descriptor_preflight_failed"
    return status_code, payload if isinstance(payload, dict) else {}, "none"


def contract_packet_payload(target: dict[str, Any]) -> dict[str, Any]:
    operation_id = str(target["operationId"])
    trace_id = f"trace_live_runtime_{operation_id}"
    request_id = f"request_live_runtime_{operation_id}"
    decision_id = f"decision_live_runtime_{operation_id}"
    audit_id = f"audit_live_runtime_{operation_id}"
    return {
        "requestKind": target["requestKind"],
        "packetType": operation_id,
        "profileMode": "adult_owner",
        "authorityTier": "advisory_review",
        "approvalRequirement": "chief_of_staff_and_owner_review",
        "traceEnvelope": {
            "trace_id": trace_id,
            "parent_trace_id": "live_runtime_validation",
            "actor_id": "concierge.live_runtime_validation",
            "request_id": request_id,
            "decision_id": decision_id,
            "timestamp": "2026-06-24T00:00:00.000Z",
        },
        "auditEnvelope": {
            "audit_id": audit_id,
            "trace_id": trace_id,
            "decision_id": decision_id,
            "actor_id": "concierge.live_runtime_validation",
            "authority_tier": "advisory_review",
            "approval_requirement": "chief_of_staff_and_owner_review",
            "evidence_links": ["live_runtime_validation"],
        },
        "governanceDecision": {
            "decision_id": decision_id,
            "request_id": request_id,
            "outcome": "requires_review",
            "authority_tier": "advisory_review",
            "approval_requirement": "chief_of_staff_and_owner_review",
            "blocked_effects": [
                "memory_write",
                "approval_capture",
                "external_send",
                "agent_dispatch",
                "routing",
                "registry_update",
                "trace_append",
                "local_application",
            ],
            "trace_id": trace_id,
            "audit_id": audit_id,
        },
        "requestedOperationId": operation_id,
        "requestedTargetPath": target["targetPath"],
        "blockedEffects": [
            "memory_write",
            "approval_capture",
            "external_send",
            "agent_dispatch",
            "routing",
            "registry_update",
            "trace_append",
            "local_application",
        ],
        "approvalCaptured": False,
        "memoryWritePerformed": False,
        "agentDispatchPerformed": False,
        "externalSendPerformed": False,
        "routingPerformed": False,
        "registryUpdatePerformed": False,
        "traceAppendPerformed": False,
        "appliedLocally": False,
        "boundary": "This is a live-runtime validation packet only; Concierge does not apply, approve, route, dispatch, write memory, update registries, append traces, or send externally.",
    }


def response_flag(payload: Any, camel: str, snake: str) -> bool:
    return isinstance(payload, dict) and (payload.get(camel) is True or payload.get(snake) is True)


def contract_packet_submission_record(
    target: dict[str, Any],
    status_code: int,
    payload: Any,
) -> dict[str, Any]:
    governance = payload.get("governanceDecision") if isinstance(payload, dict) else None
    if not isinstance(governance, dict) and isinstance(payload, dict):
        governance = payload.get("governance_decision") if isinstance(payload.get("governance_decision"), dict) else None
    trace = payload.get("traceEnvelope") if isinstance(payload, dict) else None
    if not isinstance(trace, dict) and isinstance(payload, dict):
        trace = payload.get("trace_envelope") if isinstance(payload.get("trace_envelope"), dict) else None
    audit = payload.get("auditEnvelope") if isinstance(payload, dict) else None
    if not isinstance(audit, dict) and isinstance(payload, dict):
        audit = payload.get("audit_envelope") if isinstance(payload.get("audit_envelope"), dict) else None
    outcome = ""
    if isinstance(governance, dict):
        outcome = str(governance.get("outcome") or governance.get("decision") or "")
    side_effects = {
        "approvalCaptured": response_flag(payload, "approvalCaptured", "approval_captured"),
        "memoryWritePerformed": response_flag(payload, "memoryWritePerformed", "memory_write_performed"),
        "agentDispatchPerformed": response_flag(payload, "agentDispatchPerformed", "agent_dispatch_performed"),
        "externalSendPerformed": response_flag(payload, "externalSendPerformed", "external_send_performed"),
        "routingPerformed": response_flag(payload, "routingPerformed", "routing_performed"),
        "registryUpdatePerformed": response_flag(payload, "registryUpdatePerformed", "registry_update_performed"),
        "traceAppendPerformed": response_flag(payload, "traceAppendPerformed", "trace_append_performed"),
        "appliedLocally": response_flag(payload, "appliedLocally", "applied_locally"),
    }
    passed = (
        200 <= status_code < 300
        and isinstance(governance, dict)
        and isinstance(trace, dict)
        and isinstance(audit, dict)
        and outcome not in {"deny", "denied", "no_go", "nogo"}
        and not any(side_effects.values())
    )
    return {
        "status": "passed" if passed else "failed",
        "statusCode": status_code,
        "targetPath": target["targetPath"],
        "operationId": target["operationId"],
        "requestKind": target["requestKind"],
        "governanceOutcome": outcome or "missing",
        "governanceDecisionObserved": isinstance(governance, dict),
        "traceEnvelopeObserved": isinstance(trace, dict),
        "auditEnvelopeObserved": isinstance(audit, dict),
        "endpointHostRetained": False,
        "tokenRetained": False,
        "requestBodyRetained": False,
        "responseBodyRetained": False,
        **side_effects,
    }


def run_contract_packet_submissions(
    bridge_endpoint: str,
    out_path: Path,
    auth_token: str | None,
    runtime_validation_source: str,
) -> tuple[int, str | None]:
    try:
        _, descriptor, descriptor_failure = load_descriptor_for_contract_packets(bridge_endpoint, auth_token)
        targets = contract_packet_submission_targets(bridge_endpoint)
        handoff_status: dict[str, Any] = {}
        missing_handoffs: list[str] = []
        for target in targets:
            advertised, source = descriptor_advertises_handoff(
                descriptor,
                set(target["handoffNames"]),
                str(target["targetPath"]),
            )
            handoff_status[str(target["operationId"])] = {
                "advertised": advertised,
                "source": source,
                "targetPath": target["targetPath"],
                "requestKind": target["requestKind"],
            }
            if not advertised:
                missing_handoffs.append(str(target["operationId"]))

        submissions: list[dict[str, Any]] = []
        failure_reason = "none"
        if descriptor_failure != "none":
            failure_reason = descriptor_failure
        elif missing_handoffs:
            failure_reason = "contract_packet_handoff_not_advertised"
        else:
            headers = contract_packet_headers(auth_token, bridge_endpoint)
            for target in targets:
                status_code, payload = post_remote_json(
                    str(target["url"]),
                    contract_packet_payload(target),
                    headers,
                )
                record = contract_packet_submission_record(target, status_code, payload)
                submissions.append(record)
            if any(record["status"] != "passed" for record in submissions):
                failure_reason = "contract_packet_submission_failed"

        passed = failure_reason == "none" and len(submissions) == len(targets)
        napoleon_required_actions = napoleon_required_actions_for_missing_contract_handoffs(missing_handoffs)
        evidence = {
            "kind": "governed_contract_packet_submission_evidence",
            "status": "passed" if passed else "failed",
            "failureReason": failure_reason,
            "runtimeValidationSource": runtime_validation_source,
            "descriptorHandoffStatus": handoff_status,
            "napoleonRequiredActions": napoleon_required_actions,
            "submissionCount": len(submissions),
            "submissions": submissions,
            "endpointHostRetained": False,
            "tokenRetained": False,
            "requestBodyRetained": False,
            "responseBodyRetained": False,
            "approvalCaptured": False,
            "memoryWritePerformed": False,
            "agentDispatchPerformed": False,
            "externalSendPerformed": False,
            "routingPerformed": False,
            "registryUpdatePerformed": False,
            "traceAppendPerformed": False,
            "appliedLocally": False,
            "boundary": "Contract packet submission evidence is sanitized metadata only and is not approval, routing, dispatch, memory write, trace append, registry update, external send, or local application authority.",
        }
        out_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
        return (0 if passed else 1), None if passed else failure_reason
    except Exception as exc:
        evidence = {
            "kind": "governed_contract_packet_submission_evidence",
            "status": "failed",
            "failureReason": exc.__class__.__name__,
            "runtimeValidationSource": runtime_validation_source,
            "descriptorHandoffStatus": {},
            "napoleonRequiredActions": [],
            "submissionCount": 0,
            "submissions": [],
            "endpointHostRetained": False,
            "tokenRetained": False,
            "requestBodyRetained": False,
            "responseBodyRetained": False,
            "approvalCaptured": False,
            "memoryWritePerformed": False,
            "agentDispatchPerformed": False,
            "externalSendPerformed": False,
            "routingPerformed": False,
            "registryUpdatePerformed": False,
            "traceAppendPerformed": False,
            "appliedLocally": False,
            "boundary": "Contract packet submission validation failed closed without retaining endpoints, tokens, request bodies, or response bodies.",
        }
        out_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
        return 1, exc.__class__.__name__


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
            if (
                normalized_artifact_field_name(key) in FORBIDDEN_TRUE_ARTIFACT_FLAG_KEYS
                and nested is True
            ):
                violations.append(f"{key_path}: forbidden true artifact boundary flag {key}")
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


def eval_target_summary(path: Path) -> dict[str, Any]:
    defaults = {
        "targetPath": None,
        "targetRequestKind": None,
        "targetOperationId": None,
        "endpointHostRetained": False,
        "tokenRetained": False,
        "requestBodyRetained": False,
        "responseBodyRetained": False,
        "approvalCaptured": False,
        "memoryWritePerformed": False,
        "agentDispatchPerformed": False,
        "externalSendPerformed": False,
        "descriptorHandoffAdvertised": None,
        "descriptorHandoffSource": None,
        "descriptorHandoffFailureReason": "none",
        "descriptorHandoffRequiredAction": None,
        "napoleonRequiredActions": [],
    }
    if not path.exists():
        return defaults
    report = load_json(path)
    target = report.get("evaluationTarget") if isinstance(report, dict) else None
    if not isinstance(target, dict):
        return defaults
    return {
        "targetPath": target.get("path"),
        "targetRequestKind": target.get("requestKind"),
        "targetOperationId": target.get("operationId"),
        "endpointHostRetained": target.get("endpointHostRetained") is True,
        "tokenRetained": target.get("tokenRetained") is True,
        "requestBodyRetained": target.get("requestBodyRetained") is True,
        "responseBodyRetained": target.get("responseBodyRetained") is True,
        "approvalCaptured": target.get("approvalCaptured") is True,
        "memoryWritePerformed": target.get("memoryWritePerformed") is True,
        "agentDispatchPerformed": target.get("agentDispatchPerformed") is True,
        "externalSendPerformed": target.get("externalSendPerformed") is True,
        "descriptorHandoffAdvertised": target.get("descriptorHandoffAdvertised"),
        "descriptorHandoffSource": target.get("descriptorHandoffSource"),
        "descriptorHandoffFailureReason": target.get("descriptorHandoffFailureReason") or "none",
        "descriptorHandoffRequiredAction": target.get("descriptorHandoffRequiredAction"),
        "napoleonRequiredActions": (
            target.get("napoleonRequiredActions")
            if isinstance(target.get("napoleonRequiredActions"), list)
            else []
        ),
    }


def capability_discovery_summary(path: Path, exit_code: int | None, failure_reason: str | None) -> dict[str, Any]:
    defaults = {
        "status": "not_run",
        "failureReason": failure_reason or "none",
        "path": str(path),
        "targetPath": None,
        "operationId": None,
        "requestKind": None,
        "capabilityCount": 0,
        "capabilityIds": [],
        "authorityTierCounts": {},
        "runtimeAuthority": False,
        "responseApprovalCaptured": False,
        "responseMemoryWritePerformed": False,
        "responseAgentDispatchPerformed": False,
        "responseExternalSendPerformed": False,
        "blockedEffects": [],
        "endpointHostRetained": False,
        "tokenRetained": False,
        "responseBodyRetained": False,
        "approvalCaptured": False,
        "memoryWritePerformed": False,
        "agentDispatchPerformed": False,
        "externalSendPerformed": False,
    }
    if exit_code is None or not path.exists():
        return defaults
    payload = load_json(path)
    if not isinstance(payload, dict):
        return {**defaults, "status": "failed", "failureReason": failure_reason or "invalid_capability_artifact"}
    return {
        "status": "passed" if exit_code == 0 and payload.get("status") == "passed" else "failed",
        "failureReason": failure_reason or str(payload.get("failureReason") or "none"),
        "path": str(path),
        "targetPath": payload.get("targetPath"),
        "operationId": payload.get("operationId"),
        "requestKind": payload.get("requestKind"),
        "capabilityCount": payload.get("capabilityCount", 0),
        "capabilityIds": payload.get("capabilityIds", []),
        "authorityTierCounts": payload.get("authorityTierCounts", {}),
        "runtimeAuthority": payload.get("runtimeAuthority") is True,
        "blockedEffects": payload.get("blockedEffects", []),
        "endpointHostRetained": payload.get("endpointHostRetained") is True,
        "tokenRetained": payload.get("tokenRetained") is True,
        "responseBodyRetained": payload.get("responseBodyRetained") is True,
        "approvalCaptured": payload.get("approvalCaptured") is True,
        "memoryWritePerformed": payload.get("memoryWritePerformed") is True,
        "agentDispatchPerformed": payload.get("agentDispatchPerformed") is True,
        "externalSendPerformed": payload.get("externalSendPerformed") is True,
    }


def contract_packet_submission_summary(path: Path, exit_code: int | None, failure_reason: str | None) -> dict[str, Any]:
    defaults = {
        "status": "not_run",
        "failureReason": failure_reason or "none",
        "path": str(path),
        "submissionCount": 0,
        "descriptorHandoffStatus": {},
        "napoleonRequiredActions": [],
        "submissions": [],
        "endpointHostRetained": False,
        "tokenRetained": False,
        "requestBodyRetained": False,
        "responseBodyRetained": False,
        "approvalCaptured": False,
        "memoryWritePerformed": False,
        "agentDispatchPerformed": False,
        "externalSendPerformed": False,
        "routingPerformed": False,
        "registryUpdatePerformed": False,
        "traceAppendPerformed": False,
        "appliedLocally": False,
    }
    if exit_code is None or not path.exists():
        return defaults
    payload = load_json(path)
    if not isinstance(payload, dict):
        return {**defaults, "status": "failed", "failureReason": failure_reason or "invalid_packet_artifact"}
    return {
        "status": "passed" if exit_code == 0 and payload.get("status") == "passed" else "failed",
        "failureReason": failure_reason or str(payload.get("failureReason") or "none"),
        "path": str(path),
        "submissionCount": payload.get("submissionCount", 0),
        "descriptorHandoffStatus": payload.get("descriptorHandoffStatus", {}),
        "napoleonRequiredActions": (
            payload.get("napoleonRequiredActions")
            if isinstance(payload.get("napoleonRequiredActions"), list)
            else []
        ),
        "submissions": payload.get("submissions", []),
        "endpointHostRetained": payload.get("endpointHostRetained") is True,
        "tokenRetained": payload.get("tokenRetained") is True,
        "requestBodyRetained": payload.get("requestBodyRetained") is True,
        "responseBodyRetained": payload.get("responseBodyRetained") is True,
        "approvalCaptured": payload.get("approvalCaptured") is True,
        "memoryWritePerformed": payload.get("memoryWritePerformed") is True,
        "agentDispatchPerformed": payload.get("agentDispatchPerformed") is True,
        "externalSendPerformed": payload.get("externalSendPerformed") is True,
        "routingPerformed": payload.get("routingPerformed") is True,
        "registryUpdatePerformed": payload.get("registryUpdatePerformed") is True,
        "traceAppendPerformed": payload.get("traceAppendPerformed") is True,
        "appliedLocally": payload.get("appliedLocally") is True,
    }


def promotion_readiness(summary: dict[str, Any]) -> dict[str, Any]:
    runtime = summary["runtimeValidation"]
    bridge = summary["bridgeEvidence"]
    capabilities = summary["capabilityDiscovery"]
    packets = summary["contractPacketSubmissions"]
    evaluator = summary["httpEvaluator"]
    artifact_privacy = summary["artifactPrivacy"]
    packaged_desktop = summary.get("packagedDesktopTransport", {})
    evaluator_failure_reason = evaluator.get("failureReason")
    evaluator_blocker = "Evaluator HTTP mode did not pass."
    if evaluator_failure_reason == "http_evaluator_handoff_not_advertised":
        evaluator_blocker = "Napoleon descriptor does not advertise the evaluation review handoff."
    elif evaluator_failure_reason == "http_evaluator_route_not_found":
        evaluator_blocker = "Napoleon evaluation review route was not found."
    elif evaluator_failure_reason == "http_evaluator_auth_failed":
        evaluator_blocker = "Napoleon evaluation review route rejected authentication."
    checks = [
        (runtime["source"] == "real_runtime", "Evidence source is not real Napoleon runtime."),
        (bridge["status"] == "passed", "Descriptor discovery and bridge evidence capture did not pass."),
        (capabilities["status"] == "passed", "Descriptor-gated capability discovery did not pass."),
        (packets["status"] == "passed", "Governed contract packet submission validation did not pass."),
        (evaluator["status"] == "passed", evaluator_blocker),
        (artifact_privacy["status"] == "passed", "Artifact privacy audit did not pass."),
        (
            not packaged_desktop.get("required") or packaged_desktop.get("status") == "passed",
            "Packaged desktop transport evidence did not pass.",
        ),
        (
            not packaged_desktop.get("required")
            or runtime["source"] != "real_runtime"
            or packaged_desktop.get("packagedBinaryLiveProbePassed") is True,
            "Packaged desktop binary live probe did not pass against the real runtime.",
        ),
        (
            not packaged_desktop.get("required")
            or runtime["source"] != "real_runtime"
            or packaged_desktop.get("macosAppBundleLiveProbePassed") is True,
            "Packaged desktop app-bundle live probe did not pass against the real runtime.",
        ),
        (
            len(summary.get("napoleonRequiredActions", [])) == 0,
            "Napoleon-owned required actions remain before promotion.",
        ),
    ]
    blocking_reasons = [reason for passed, reason in checks if not passed]
    locally_safe = not blocking_reasons
    gate = "ready_for_human_review"
    if not locally_safe:
        gate = (
            "blocked_until_runtime_contract_actions_cleared"
            if blocking_reasons == ["Napoleon-owned required actions remain before promotion."]
            else "blocked_until_real_runtime_evidence_passes"
        )
    return {
        "locallySafeToConsider": locally_safe,
        "gate": gate,
        "blockingReasons": blocking_reasons,
        "boundary": "Readiness is local evidence only; human review and any required Napoleon or release approval are still required.",
    }


def render_promotion_review(summary: dict[str, Any]) -> str:
    runtime = summary["runtimeValidation"]
    bridge = summary["bridgeEvidence"]
    capabilities = summary["capabilityDiscovery"]
    packets = summary["contractPacketSubmissions"]
    evaluator = summary["httpEvaluator"]
    artifact_privacy = summary["artifactPrivacy"]
    packaged_desktop = summary.get("packagedDesktopTransport", packaged_desktop_transport_default(False))
    boundary = summary["promotionBoundary"]
    readiness = summary["promotionReadiness"]
    napoleon_actions = summary.get("napoleonRequiredActions", [])
    blocking_reasons = readiness["blockingReasons"] or ["none"]
    checkbox = lambda checked, text: f"- [{'x' if checked else ' '}] {text}"
    action_lines: list[str] = []
    if napoleon_actions:
        for action in napoleon_actions:
            if not isinstance(action, dict):
                continue
            action_lines.extend([
                f"- Action ID: `{action.get('id')}`",
                f"- Owner: `{action.get('owner')}`",
                f"- Handoff: `{action.get('handoffName')}`",
                f"- Target path: `{action.get('targetPath')}`",
                f"- Request kind: `{action.get('requestKind')}`",
                f"- Operation ID: `{action.get('operationId')}`",
                f"- Advertise using: {', '.join(action.get('advertiseUsing', []))}",
                f"- Required action: {action.get('requiredAction')}",
                f"- Side effects performed by Concierge: `{str(action.get('sideEffectsPerformed') is True).lower()}`",
            ])
    else:
        action_lines.append("- none")
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
        f"- Capability discovery status: `{capabilities['status']}`",
        f"- Capability discovery target path: `{capabilities['targetPath']}`",
        f"- Capability discovery count: `{capabilities['capabilityCount']}`",
        f"- Contract packet submission status: `{packets['status']}`",
        f"- Contract packet submission count: `{packets['submissionCount']}`",
        f"- HTTP evaluator status: `{evaluator['status']}`",
        f"- HTTP evaluator run ID: `{evaluator['run_id']}`",
        f"- HTTP evaluator score: `{evaluator['score_total']}`",
        f"- HTTP evaluator target path: `{evaluator['targetPath']}`",
        f"- HTTP evaluator request kind: `{evaluator['targetRequestKind']}`",
        f"- HTTP evaluator operation ID: `{evaluator['targetOperationId']}`",
        f"- HTTP evaluator required action: {evaluator['descriptorHandoffRequiredAction'] or 'none'}",
        f"- Hard failure count: `{evaluator['hard_fail_count']}`",
        f"- Missing artifact count: `{evaluator['missing_artifact_count']}`",
        f"- Regression count: `{evaluator['regression_count']}`",
        f"- Artifact privacy audit: `{artifact_privacy['status']}`",
        f"- Packaged desktop transport required: `{str(packaged_desktop['required']).lower()}`",
        f"- Packaged desktop transport status: `{packaged_desktop['status']}`",
        f"- Packaged desktop no-bundle build passed: `{str(packaged_desktop['packagedNoBundleBuildPassed']).lower()}`",
        f"- Packaged desktop binary config probe passed: `{str(packaged_desktop['packagedBinaryConfigProbePassed']).lower()}`",
        f"- Packaged desktop binary transport probe passed: `{str(packaged_desktop['packagedBinaryTransportProbePassed']).lower()}`",
        f"- Packaged desktop binary generated local live probe passed: `{str(packaged_desktop['packagedBinaryGeneratedLocalLiveProbePassed']).lower()}`",
        f"- Packaged desktop binary cos local live probe passed: `{str(packaged_desktop['packagedBinaryCosLocalLiveProbePassed']).lower()}`",
        f"- Packaged desktop binary live probe configured: `{str(packaged_desktop['packagedBinaryLiveProbeConfigured']).lower()}`",
        f"- Packaged desktop binary live probe passed: `{str(packaged_desktop['packagedBinaryLiveProbePassed']).lower()}`",
        f"- Packaged desktop binary live probe route family: `{packaged_desktop['packagedBinaryLiveProbeRouteFamily']}`",
        f"- Packaged desktop binary live probe failure stage: `{packaged_desktop['packagedBinaryLiveProbeFailureStage']}`",
        f"- Packaged desktop binary live probe failure kind: `{packaged_desktop['packagedBinaryLiveProbeFailureKind']}`",
        f"- Packaged desktop app-bundle live probe configured: `{str(packaged_desktop['macosAppBundleLiveProbeConfigured']).lower()}`",
        f"- Packaged desktop app-bundle live probe passed: `{str(packaged_desktop['macosAppBundleLiveProbePassed']).lower()}`",
        f"- Packaged desktop app-bundle live probe route family: `{packaged_desktop['macosAppBundleLiveProbeRouteFamily']}`",
        f"- Packaged desktop app-bundle live probe failure stage: `{packaged_desktop['macosAppBundleLiveProbeFailureStage']}`",
        f"- Packaged desktop app-bundle live probe failure kind: `{packaged_desktop['macosAppBundleLiveProbeFailureKind']}`",
        f"- Browser proxy required by packaged transport: `{str(packaged_desktop['browserProxyRequired']).lower()}`",
        "",
        "## Napoleon Required Actions",
        "",
        *action_lines,
        "",
        "## Required Checklist",
        "",
        checkbox(bridge["status"] == "passed", "Descriptor discovery and bridge evidence capture passed."),
        checkbox(capabilities["status"] == "passed", "Descriptor-gated capability discovery passed."),
        checkbox(packets["status"] == "passed", "Governed contract packet submissions passed."),
        checkbox(evaluator["status"] == "passed", "Evaluator HTTP mode passed."),
        checkbox(artifact_privacy["status"] == "passed", "Artifact privacy audit passed."),
        checkbox(
            not packaged_desktop.get("required") or packaged_desktop.get("status") == "passed",
            "Packaged desktop transport evidence passed when required.",
        ),
        checkbox(
            not packaged_desktop.get("required")
            or runtime["source"] != "real_runtime"
            or packaged_desktop.get("packagedBinaryLiveProbePassed") is True,
            "Packaged desktop binary live probe passed against the real runtime when required.",
        ),
        checkbox(
            not packaged_desktop.get("required")
            or runtime["source"] != "real_runtime"
            or packaged_desktop.get("macosAppBundleLiveProbePassed") is True,
            "Packaged desktop app-bundle live probe passed against the real runtime when required.",
        ),
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
    eval_failure_reason: str | None,
    evidence_path: Path,
    capability_exit_code: int | None,
    capability_failure_reason: str | None,
    capability_path: Path,
    contract_packet_exit_code: int | None,
    contract_packet_failure_reason: str | None,
    contract_packet_path: Path,
    eval_report_path: Path,
    runtime_validation_source: str,
    artifact_privacy: dict[str, Any],
    auth_provisioning: dict[str, Any] | None = None,
    packaged_desktop_transport: dict[str, Any] | None = None,
) -> dict[str, Any]:
    summary = {
        "boundary": BOUNDARY,
        "runtimeValidation": {
            "source": runtime_validation_source,
            "caveat": runtime_validation_caveat(runtime_validation_source),
            "authProvisioning": auth_provisioning or auth_provisioning_metadata(None, None, {}),
        },
        "bridgeEvidence": {
            "status": "passed" if bridge_exit_code == 0 else "failed",
            "record_count": count_bridge_records(evidence_path),
            "path": str(evidence_path),
            **bridge_evidence_operation_summary(evidence_path),
        },
        "capabilityDiscovery": capability_discovery_summary(
            capability_path,
            capability_exit_code,
            capability_failure_reason,
        ),
        "contractPacketSubmissions": contract_packet_submission_summary(
            contract_packet_path,
            contract_packet_exit_code,
            contract_packet_failure_reason,
        ),
        "httpEvaluator": {
            "status": "passed" if eval_exit_code == 0 else "failed" if eval_exit_code is not None else "not_run",
            "failureReason": eval_failure_reason or "none",
            "path": str(eval_report_path),
            "sanitized": eval_report_path.exists(),
            **eval_counts(eval_report_path),
            **eval_target_summary(eval_report_path),
        },
        "artifactPrivacy": artifact_privacy,
        "packagedDesktopTransport": packaged_desktop_transport or packaged_desktop_transport_default(False),
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
    summary["napoleonRequiredActions"] = merge_napoleon_required_actions(
        summary["contractPacketSubmissions"].get("napoleonRequiredActions", []),
        summary["httpEvaluator"].get("napoleonRequiredActions", []),
    )
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
    parser.add_argument(
        "--eval-endpoint",
        help=(
            "Napoleon evaluator endpoint; defaults to /v1/concierge/evaluate for generated/local endpoints "
            "or /chief-of-staff/reviews/evaluation for explicit Napoleon endpoints"
        ),
    )
    parser.add_argument("--auth-token", default=None, help="Optional bearer token; never written to validation artifacts")
    parser.add_argument("--auth-token-file", default=None, help="Optional bearer token file; token contents are never written")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Directory for sanitized validation artifacts")
    parser.add_argument(
        "--desktop-runtime-transport-report",
        type=Path,
        default=None,
        help="Optional sanitized packaged desktop transport report to include in promotion readiness.",
    )
    parser.add_argument(
        "--require-packaged-desktop-transport",
        action="store_true",
        help="Block promotion readiness unless the packaged desktop transport report passes.",
    )
    parser.add_argument(
        "--runtime-validation-source",
        choices=RUNTIME_VALIDATION_SOURCES,
        default="real_runtime",
        help="Evidence source label written to the sanitized summary",
    )
    args = parser.parse_args(argv)

    active_env = os.environ if env is None else env
    auth_provisioning = auth_provisioning_metadata(args.auth_token, args.auth_token_file, active_env)
    auth_token = bridge_evidence_capture.resolve_auth_token(args.auth_token, args.auth_token_file, active_env)
    packaged_desktop_transport = packaged_desktop_transport_summary(
        args.desktop_runtime_transport_report,
        args.require_packaged_desktop_transport,
    )
    endpoint_config = resolve_endpoint_configuration(args.bridge_endpoint, args.eval_endpoint, active_env)
    bridge_endpoint = endpoint_config["bridgeEndpoint"]
    eval_endpoint = endpoint_config["evalEndpoint"]
    endpoint_resolution = endpoint_config["resolution"]
    if bridge_endpoint is None:
        out_dir = Path(args.out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        clear_runtime_artifacts(out_dir)
        preflight_path = out_dir / "preflight.json"
        write_preflight(
            preflight_path,
            bridge_endpoint,
            eval_endpoint,
            endpoint_resolution,
            auth_provisioning,
            packaged_desktop_transport,
        )
        print(
            "live runtime validation requires --bridge-endpoint, NAPOLEON_BRIDGE_ENDPOINT, "
            f"or NAPOLEON_EVAL_ENDPOINT; sanitized preflight written to {preflight_path}",
            file=sys.stderr,
        )
        return 2

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    clear_runtime_artifacts(out_dir)
    write_preflight(
        out_dir / "preflight.json",
        bridge_endpoint,
        eval_endpoint,
        endpoint_resolution,
        auth_provisioning,
        packaged_desktop_transport,
    )
    evidence_path = out_dir / "bridge_evidence.json"
    capability_path = out_dir / "capability_discovery.json"
    contract_packet_path = out_dir / "contract_packet_submissions.json"
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

    capability_exit_code: int | None = None
    capability_failure_reason: str | None = None
    if bridge_exit_code == 0:
        capability_exit_code, capability_failure_reason = run_capability_discovery(
            bridge_endpoint,
            capability_path,
            auth_token,
            args.runtime_validation_source,
        )
        if capability_exit_code != 0:
            print(
                "Capability discovery failed closed; summary will record sanitized capability failure.",
                file=sys.stderr,
            )

    contract_packet_exit_code: int | None = None
    contract_packet_failure_reason: str | None = None
    if bridge_exit_code == 0:
        contract_packet_exit_code, contract_packet_failure_reason = run_contract_packet_submissions(
            bridge_endpoint,
            contract_packet_path,
            auth_token,
            args.runtime_validation_source,
        )
        if contract_packet_exit_code != 0:
            print(
                "Contract packet submission validation failed closed; summary will record sanitized packet failure.",
                file=sys.stderr,
            )

    eval_exit_code: int | None = None
    eval_failure_reason: str | None = None
    descriptor_handoff_status: dict[str, Any] | None = None
    if bridge_exit_code == 0 and eval_endpoint is not None:
        should_check_descriptor_handoff = (
            is_cos_endpoint(bridge_endpoint)
            and endpoint_resolution.get("evaluatorEndpointResolution") == "derived_from_bridge_endpoint"
        )
        if should_check_descriptor_handoff:
            descriptor_handoff_status = descriptor_evaluation_handoff_status(bridge_endpoint, auth_token)
        if descriptor_handoff_status and not descriptor_handoff_status["descriptorHandoffAdvertised"]:
            eval_exit_code = 1
            eval_failure_reason = "http_evaluator_handoff_not_advertised"
            write_sanitized_evaluator_failure_report(
                eval_report_path,
                eval_endpoint,
                eval_failure_reason,
                descriptor_handoff_status,
            )
            print(
                "HTTP evaluator mode blocked because the descriptor does not advertise an evaluation review handoff; "
                "summary will record sanitized failure.",
                file=sys.stderr,
            )
        else:
            try:
                eval_exit_code = run_http_eval(eval_endpoint, eval_report_path, auth_token)
                sanitize_eval_report(eval_report_path)
            except Exception as exc:
                eval_exit_code = 1
                eval_failure_reason = classify_http_eval_failure(exc)
                write_sanitized_evaluator_failure_report(
                    eval_report_path,
                    eval_endpoint,
                    eval_failure_reason,
                    descriptor_handoff_status,
                )
                print(
                    f"HTTP evaluator mode failed with {eval_failure_reason}; summary will record sanitized failure.",
                    file=sys.stderr,
                )

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
    artifact_privacy = audit_artifact_privacy(
        [evidence_path, capability_path, contract_packet_path, eval_report_path],
        sensitive_values,
    )

    summary = write_summary(
        summary_path,
        promotion_review_path,
        bridge_exit_code,
        eval_exit_code,
        eval_failure_reason,
        evidence_path,
        capability_exit_code,
        capability_failure_reason,
        capability_path,
        contract_packet_exit_code,
        contract_packet_failure_reason,
        contract_packet_path,
        eval_report_path,
        args.runtime_validation_source,
        artifact_privacy,
        auth_provisioning,
        packaged_desktop_transport,
    )
    print(json.dumps({
        "summary": str(summary_path),
        "runtime_validation_source": summary["runtimeValidation"]["source"],
        "bridge_status": summary["bridgeEvidence"]["status"],
        "contract_packet_status": summary["contractPacketSubmissions"]["status"],
        "http_evaluator_status": summary["httpEvaluator"]["status"],
        "artifact_privacy_status": summary["artifactPrivacy"]["status"],
        "packaged_desktop_transport_status": summary["packagedDesktopTransport"]["status"],
        "boundary": BOUNDARY,
    }, indent=2))

    if bridge_exit_code != 0:
        return bridge_exit_code
    if capability_exit_code not in (None, 0):
        return capability_exit_code
    if contract_packet_exit_code not in (None, 0):
        return contract_packet_exit_code
    if eval_exit_code not in (None, 0):
        return eval_exit_code
    if summary["artifactPrivacy"]["status"] != "passed":
        return 1
    if (
        summary["packagedDesktopTransport"].get("required")
        and summary["packagedDesktopTransport"].get("status") != "passed"
    ):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
