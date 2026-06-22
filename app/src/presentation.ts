import type {
  DescriptorConnectionState,
  DescriptorFailClosedReason,
  GovernedHandoffCapability,
  GovernanceOutcome,
  GovernanceReviewState,
  MemoryProposalReviewState,
  NapoleonProfileMode,
  RehearsalPreview,
} from "./contractBridge.js";
import { descriptorSupportsGovernedHandoff } from "./contractBridge.js";
import type { ConciergeMessage, NapoleonDelegation, NapoleonResponse } from "./types.js";
import { NapoleonBridgeError } from "./napoleonBridge.js";

export interface GovernanceDecisionViewInput {
  outcome: GovernanceOutcome;
  decisionId: string;
  auditId: string;
  blockedEffects: string[];
}

function describeDescriptorFailureReason(reason: DescriptorFailClosedReason | undefined): string {
  if (reason === "no_endpoint") return "no endpoint";
  if (reason === "no_descriptor") return "descriptor missing";
  if (reason === "descriptor_invalid") return "descriptor invalid";
  if (reason === "descriptor_signature_or_checksum_mismatch") return "descriptor signature/checksum mismatch";
  if (reason === "descriptor_stale") return "descriptor stale";
  if (reason === "auth_failure") return "descriptor auth failure";
  if (reason === "bridge_timeout") return "descriptor timeout";
  if (reason === "http_failure") return "descriptor HTTP failure";
  return "";
}

function describeBridgeDescriptorDetail(error: NapoleonBridgeError): string {
  const detail = describeDescriptorFailureReason(error.descriptorFailureReason);
  return detail ? ` Descriptor: ${detail}.` : "";
}

export interface GovernanceDecisionView {
  status: string;
  detail: string;
  requiresReview: boolean;
  blockedEffectsLabel: string;
}

export interface RehearsalPreviewView {
  status: string;
  detail: string;
  executed: false;
  approval: string;
  memory: string;
}

export interface GovernanceReviewView {
  heading: string;
  body: string;
  actionLabel: string;
  canAcknowledge: boolean;
  sendBlocked: boolean;
  details: Array<{ label: string; value: string }>;
}

export interface MemoryProposalReviewView {
  heading: string;
  body: string;
  actionLabel: string;
  dismissLabel: string;
  canAcknowledge: boolean;
  canDismiss: boolean;
  details: Array<{ label: string; value: string }>;
}

export interface GovernedReviewResponseInput {
  text: string;
  governanceDecision: {
    outcome: string;
    decision_id: string;
    authority_tier: string;
    approval_requirement: string;
    rationale: string;
    blocked_effects: string[];
  };
  traceEnvelope: {
    trace_id: string;
  };
  auditEnvelope: {
    audit_id: string;
  };
}

export interface GovernedReviewResponseView {
  rows: Array<{ label: string; value: string }>;
}

export interface DelegationView {
  heading: string;
  body: string;
  details: Array<{ label: string; value: string }>;
}

export interface DelegationFallbackProvenance {
  blockedEffects?: string[];
  governanceState?: string;
  traceId?: string;
  auditId?: string;
}

export interface NapoleonResponseProofView {
  heading: string;
  status: "verified" | "limited";
  summary: string;
  caveat: string;
  details: Array<{ label: string; value: string }>;
}

const FORBIDDEN_VISIBLE_PROVENANCE_PATTERNS = [
  /\bhttps?:\/\//i,
  /\bwss?:\/\//i,
  /\blocalhost\b/i,
  /\b127\.0\.0\.1\b/,
  /\b0\.0\.0\.0\b/,
  /\bbearer\b/i,
  /\bauthorization\b/i,
  /\btoken\b/i,
  /\bsecret\b/i,
];

export function sanitizeVisibleProvenanceValue(value: string | undefined, fallback = "not returned"): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return fallback;
  if (FORBIDDEN_VISIBLE_PROVENANCE_PATTERNS.some((pattern) => pattern.test(trimmed))) return "redacted";
  return trimmed;
}

export function sanitizeVisibleProvenanceList(values: string[] | undefined, fallback = "not returned"): string {
  if (!values?.length) return fallback;
  return values.map((value) => sanitizeVisibleProvenanceValue(value)).join(", ");
}

export function describeNapoleonTranscriptMetadata(
  response: NapoleonResponse,
): NonNullable<ConciergeMessage["metadata"]> {
  return {
    source: "Napoleon governed bridge",
    attributionBoundary: "Returned bridge provenance only; not local authority.",
    ...(response.targetAgent ? { targetCapability: sanitizeVisibleProvenanceValue(response.targetAgent) } : {}),
    governanceOutcome: response.governanceDecision.outcome,
    decisionId: sanitizeVisibleProvenanceValue(response.governanceDecision.decision_id),
    auditId: sanitizeVisibleProvenanceValue(response.auditEnvelope.audit_id),
    profileMode: response.profileMode,
    blockedEffects: response.governanceDecision.blocked_effects.map((effect) => sanitizeVisibleProvenanceValue(effect)),
  };
}

export type LiveBridgeEvidenceState = "not_run" | "passed" | "failed";

export interface LiveBridgeReadinessInput {
  descriptorConnection: DescriptorConnectionState;
  evidenceCaptureState?: LiveBridgeEvidenceState;
  evidenceComparisonState?: LiveBridgeEvidenceState;
  lastEvidenceStatus?: "success" | "fail_closed";
  lastFailureReason?: string;
  runtimeValidationSource?: "real_runtime" | "local_harness" | "local_simulation";
}

export interface LiveBridgeReadinessView {
  heading: string;
  status: "ready" | "blocked" | "warning";
  canSendLive: boolean;
  summary: string;
  caveat: string;
  blockedEffects: string[];
  details: Array<{ label: string; value: string }>;
}

export interface LiveSendPreflightInput {
  descriptorConnection: DescriptorConnectionState;
  inputReady: boolean;
  governanceCanSendAdvisory: boolean;
  governanceOutcome?: GovernanceOutcome;
  rehearsalMode: boolean;
  evidenceCaptureState?: LiveBridgeEvidenceState;
  evidenceComparisonState?: LiveBridgeEvidenceState;
  runtimeValidationSource?: LiveBridgeReadinessInput["runtimeValidationSource"];
}

export interface LiveSendPreflightItem {
  label: string;
  status: "ready" | "blocked" | "warning";
  detail: string;
}

export interface LiveSendPreflightView {
  heading: string;
  status: "ready" | "blocked" | "warning";
  canAttemptLiveSend: boolean;
  summary: string;
  caveat: string;
  items: LiveSendPreflightItem[];
}

export type MicrophonePermissionStatus = "not_requested" | "requested" | "granted" | "denied" | "unavailable";

export interface LiveVoiceReadinessInput {
  descriptorConnection: DescriptorConnectionState;
  profileMode?: NapoleonProfileMode;
  microphoneEnabled: boolean;
  microphonePermissionStatus: MicrophonePermissionStatus;
  evidenceCaptureState?: LiveBridgeEvidenceState;
  evidenceComparisonState?: LiveBridgeEvidenceState;
  runtimeValidationSource?: LiveBridgeReadinessInput["runtimeValidationSource"];
  rehearsalMode: boolean;
}

export interface LiveVoiceReadinessView {
  heading: string;
  status: "blocked" | "warning";
  canStartLiveVoice: false;
  summary: string;
  caveat: string;
  blockedEffects: string[];
  items: LiveSendPreflightItem[];
}

export interface GovernedHandoffReadinessInput {
  label: string;
  descriptorConnection: DescriptorConnectionState;
  draftReady: boolean;
  rehearsalMode?: boolean;
  requiredHandoff?: GovernedHandoffCapability;
}

export interface GovernedHandoffReadinessView {
  heading: string;
  status: "ready" | "blocked";
  canSubmit: boolean;
  summary: string;
  caveat: string;
  blockedEffects: string[];
  items: LiveSendPreflightItem[];
}

export function describeBridgeFailure(error: unknown): string {
  if (!(error instanceof NapoleonBridgeError)) {
    return "Napoleon bridge failed closed. Concierge did not send externally, did not write memory, did not dispatch agents, and did not capture approval.";
  }

  const blockedEffects = error.blockedEffects.length
    ? ` Blocked effects: ${sanitizeVisibleProvenanceList(error.blockedEffects)}.`
    : "";
  const decision = error.decisionId ? `, decision ${error.decisionId}` : "";
  const audit = error.auditId ? `, audit ${error.auditId}` : "";
  const governance = error.governanceOutcome ? `, governance ${error.governanceOutcome}` : "";
  const profile = error.profileMode ? `, profile ${error.profileMode}` : "";
  const descriptor = describeBridgeDescriptorDetail(error);
  return `Live Napoleon bridge blocked: ${error.reason}. Request ${error.requestId}, trace ${error.traceId}${profile}${decision}${audit}${governance}.${descriptor}${blockedEffects} Concierge did not send externally, did not write memory, did not dispatch agents, and did not capture approval.`;
}

export function describeBridgeFailureTranscriptMessage(error: unknown): string {
  if (!(error instanceof NapoleonBridgeError)) {
    return "Napoleon bridge failed closed. Concierge did not execute anything and remains in prepare-only mode.";
  }

  const blockedEffects = error.blockedEffects.length
    ? ` Blocked effects: ${sanitizeVisibleProvenanceList(error.blockedEffects)}.`
    : "";
  const decision = error.decisionId ? ` Decision ${error.decisionId}.` : "";
  const audit = error.auditId ? ` Audit ${error.auditId}.` : "";
  const governance = error.governanceOutcome ? ` Governance ${error.governanceOutcome}.` : "";
  const profile = error.profileMode ? ` Profile ${error.profileMode}.` : "";
  const descriptor = describeBridgeDescriptorDetail(error);
  return `Napoleon bridge blocked: ${error.reason}.${profile}${decision}${audit}${governance}${descriptor}${blockedEffects} Concierge did not execute anything and remains in prepare-only mode.`;
}

export function describeGovernedHandoffFailure(error: unknown, label: string, primaryEffect: string): string {
  if (!(error instanceof NapoleonBridgeError)) {
    return `${label} failed closed. Concierge did not ${primaryEffect}, did not write memory, did not dispatch agents, did not send externally, and did not capture approval.`;
  }

  const blockedEffects = error.blockedEffects.length
    ? ` Blocked effects: ${sanitizeVisibleProvenanceList(error.blockedEffects)}.`
    : "";
  const profile = error.profileMode ? `, profile ${error.profileMode}` : "";
  const decision = error.decisionId ? `, decision ${error.decisionId}` : "";
  const audit = error.auditId ? `, audit ${error.auditId}` : "";
  const governance = error.governanceOutcome ? `, governance ${error.governanceOutcome}` : "";
  const descriptor = describeBridgeDescriptorDetail(error);
  return `${label} blocked: ${error.reason}. Request ${error.requestId}, trace ${error.traceId}${profile}${decision}${audit}${governance}.${descriptor}${blockedEffects} Concierge did not ${primaryEffect}, did not write memory, did not dispatch agents, did not send externally, and did not capture approval.`;
}

function describeEvidenceState(state: LiveBridgeEvidenceState | undefined): string {
  if (state === "passed") return "Passed in local validation";
  if (state === "failed") return "Failed in local validation";
  return "Not run in this UI session";
}

function describeRuntimeValidationSource(source: LiveBridgeReadinessInput["runtimeValidationSource"]): string {
  if (source === "local_harness") return "Local harness only; not real Napoleon runtime validation";
  if (source === "local_simulation") return "Local simulation only; not real Napoleon runtime validation";
  if (source === undefined) return "Runtime validation source unavailable";
  return "Real Napoleon runtime";
}

function describePromotionGate(source: LiveBridgeReadinessInput["runtimeValidationSource"], evidencePending: boolean): string {
  if (source === undefined) {
    return "blocked until real Napoleon runtime evidence passes";
  }
  if (source === "local_harness" || source === "local_simulation") {
    return "blocked until real Napoleon runtime evidence passes";
  }
  if (evidencePending) return "blocked until evidence capture and comparison pass";
  return "real runtime evidence available";
}

export function describeLiveBridgeReadiness(input: LiveBridgeReadinessInput): LiveBridgeReadinessView {
  const descriptor = input.descriptorConnection;
  const blockedEffects = descriptor.descriptorStatus?.blockedEffects ?? [
    "runtime_authority",
    "agent_dispatch",
    "memory_write",
    "approval_capture",
    "external_send",
  ];
  const evidenceCapture = input.evidenceCaptureState ?? "not_run";
  const evidenceComparison = input.evidenceComparisonState ?? "not_run";
  const runtimeValidationSource = input.runtimeValidationSource;
  const localOnlyValidation = runtimeValidationSource === "local_harness" || runtimeValidationSource === "local_simulation";
  const runtimeValidationMissing = runtimeValidationSource === undefined;
  const integrityMismatch =
    descriptor.failClosedReason === "descriptor_signature_or_checksum_mismatch" ||
    descriptor.checksumState === "mismatch" ||
    descriptor.signatureState === "invalid";
  const evidenceFailed = evidenceCapture === "failed" || evidenceComparison === "failed";
  const evidencePending = evidenceCapture !== "passed" || evidenceComparison !== "passed";
  const lastSendFailedClosed = input.lastEvidenceStatus === "fail_closed";
  const canSendLive = descriptor.canAttemptLiveBridge && !evidenceFailed;
  const status: LiveBridgeReadinessView["status"] = !canSendLive
    ? "blocked"
    : evidencePending || lastSendFailedClosed || localOnlyValidation || runtimeValidationMissing
      ? "warning"
      : "ready";

  let summary: string;
  if (!descriptor.canAttemptLiveBridge) {
    if (descriptor.failClosedReason === "no_endpoint") {
      summary = "No Napoleon endpoint is configured, so Concierge is blocked from live bridge sends.";
    } else if (descriptor.failClosedReason === "auth_failure") {
      summary = "Napoleon descriptor discovery failed authentication; Concierge is blocked from live bridge sends.";
    } else if (descriptor.failClosedReason === "bridge_timeout") {
      summary = "Napoleon descriptor discovery timed out; Concierge is blocked from live bridge sends.";
    } else if (descriptor.failClosedReason === "http_failure") {
      summary = "Napoleon descriptor discovery failed over HTTP; Concierge is blocked from live bridge sends.";
    } else if (integrityMismatch) {
      summary = "Napoleon descriptor signature or checksum mismatch detected; Concierge is fail-closed.";
    } else if (descriptor.failClosedReason === "no_descriptor") {
      summary = "Napoleon descriptor is missing, so Concierge is blocked from live bridge sends.";
    } else {
      summary = "Napoleon descriptor is invalid or grants authority, so Concierge is blocked from live bridge sends.";
    }
  } else if (evidenceFailed) {
    summary = "Local bridge evidence validation failed; Concierge should stay in rehearsal or review mode.";
  } else if (lastSendFailedClosed) {
    summary = `Last Napoleon live text turn failed closed${input.lastFailureReason ? `: ${input.lastFailureReason}` : ""}. Concierge remains prepare-only for blocked effects.`;
  } else if (localOnlyValidation && !evidencePending) {
    summary =
      "Local harness or simulation checks pass, but real Napoleon runtime validation has not been proven in this UI session.";
  } else if (runtimeValidationMissing && !evidencePending) {
    summary = "Bridge checks pass, but real Napoleon runtime validation has not been proven in this UI session.";
  } else if (evidencePending) {
    summary = "Descriptor preflight passes, but bridge evidence capture or comparison has not been verified in this UI session.";
  } else {
    summary = "Napoleon bridge is ready for a governed live text turn through the descriptor-verified contract.";
  }

  return {
    heading: "Live bridge readiness",
    status,
    canSendLive,
    summary,
    caveat:
      "This readiness check is not Napoleon approval, does not grant memory writes, does not dispatch agents, and does not allow external sends. No text turn should proceed when descriptor integrity or contract checks fail.",
    blockedEffects,
    details: [
      { label: "Descriptor", value: descriptor.state },
      { label: "Checksum", value: descriptor.checksumState },
      { label: "Signature", value: descriptor.signatureState },
      { label: "Evidence capture", value: describeEvidenceState(evidenceCapture) },
      { label: "Evidence comparison", value: describeEvidenceState(evidenceComparison) },
      { label: "Runtime validation", value: describeRuntimeValidationSource(runtimeValidationSource) },
      { label: "Promotion gate", value: describePromotionGate(runtimeValidationSource, evidencePending) },
      {
        label: "Last live send",
        value:
          input.lastEvidenceStatus === "success"
            ? "success"
            : input.lastEvidenceStatus === "fail_closed"
              ? `fail-closed${input.lastFailureReason ? `: ${input.lastFailureReason}` : ""}`
              : "not run",
      },
      { label: "Live send", value: canSendLive ? "governed bridge allowed" : "blocked" },
    ],
  };
}

export function describeLiveVoiceReadiness(input: LiveVoiceReadinessInput): LiveVoiceReadinessView {
  const evidenceCapture = input.evidenceCaptureState ?? "not_run";
  const evidenceComparison = input.evidenceComparisonState ?? "not_run";
  const runtimeValidationSource = input.runtimeValidationSource;
  const realRuntimeReady =
    runtimeValidationSource === "real_runtime" && evidenceCapture === "passed" && evidenceComparison === "passed";
  const descriptorReady = input.descriptorConnection.canAttemptLiveBridge;
  const childProtected = input.profileMode === "child_protected_user";
  const blockedEffects = [
    "microphone_capture",
    "audio_playback",
    "raw_audio_storage",
    "live_napoleon_contact",
    "memory_write",
    "approval_capture",
    ...(childProtected ? ["guardian_approval_capture"] : []),
    "agent_dispatch",
    "external_send",
  ];

  return {
    heading: "Live voice readiness",
    status: "blocked",
    canStartLiveVoice: false,
    summary: "Live voice is blocked because the governed voice pipeline is not implemented.",
    caveat: childProtected
      ? "This voice readiness gate is not Napoleon approval, not microphone consent, not guardian approval, not permission to speak externally, and not a live voice start command."
      : "This voice readiness gate is not Napoleon approval, not microphone consent, not permission to speak externally, and not a live voice start command.",
    blockedEffects,
    items: [
      {
        label: "Microphone setting",
        status: input.microphoneEnabled ? "ready" : "blocked",
        detail: input.microphoneEnabled
          ? "Microphone preference is on."
          : "Microphone preference is off; live capture cannot start.",
      },
      {
        label: "Microphone permission",
        status: input.microphonePermissionStatus === "granted" ? "ready" : "blocked",
        detail:
          input.microphonePermissionStatus === "granted"
            ? "OS microphone permission is granted, but capture remains stopped."
            : "OS microphone permission is not granted.",
      },
      {
        label: "Descriptor preflight",
        status: descriptorReady ? "ready" : "blocked",
        detail: descriptorReady
          ? "Napoleon descriptor is ready for governed bridge calls."
          : `Napoleon descriptor blocks live voice: ${input.descriptorConnection.state}.`,
      },
      {
        label: "Runtime proof",
        status: realRuntimeReady ? "ready" : "blocked",
        detail: realRuntimeReady
          ? "Real Napoleon runtime evidence has passed for the bridge."
          : "Real Napoleon runtime proof is not available for live voice.",
      },
      {
        label: "Rehearsal Mode",
        status: input.rehearsalMode ? "blocked" : "ready",
        detail: input.rehearsalMode
          ? "Rehearsal Mode is local only and must not contact Napoleon."
          : "Rehearsal Mode is off.",
      },
      {
        label: "Voice pipeline",
        status: "blocked",
        detail: "Live microphone capture, live STT, governed Napoleon turn, and live TTS playback are not implemented.",
      },
    ],
  };
}

export function describeLiveSendPreflight(input: LiveSendPreflightInput): LiveSendPreflightView {
  const descriptor = input.descriptorConnection;
  const blockedEffects = descriptor.descriptorStatus?.blockedEffects ?? [
    "runtime_authority",
    "agent_dispatch",
    "memory_write",
    "approval_capture",
    "external_send",
  ];
  const evidenceCapture = input.evidenceCaptureState;
  const evidenceComparison = input.evidenceComparisonState;
  const runtimeValidationSource = input.runtimeValidationSource;
  const evidenceCaptureReady = evidenceCapture === undefined || evidenceCapture === "passed";
  const evidenceComparisonReady = evidenceComparison === undefined || evidenceComparison === "passed";
  const realRuntimeReady = runtimeValidationSource === "real_runtime";
  const descriptorDiscoveryBlocked =
    descriptor.failClosedReason === "no_descriptor" ||
    descriptor.failClosedReason === "descriptor_stale" ||
    descriptor.failClosedReason === "auth_failure" ||
    descriptor.failClosedReason === "bridge_timeout" ||
    descriptor.failClosedReason === "http_failure";
  const descriptorIntegrityBlocked =
    descriptor.failClosedReason === "descriptor_signature_or_checksum_mismatch" ||
    descriptor.failClosedReason === "descriptor_invalid" ||
    descriptor.failClosedReason === "descriptor_stale";
  const textTurnRouteReady = descriptorSupportsGovernedHandoff(descriptor, "text_turn");
  const items: LiveSendPreflightItem[] = [
    {
      label: "Text ready",
      status: input.inputReady ? "ready" : "blocked",
      detail: input.inputReady ? "Text is ready for a governed request." : "Enter text before attempting a live send.",
    },
    {
      label: "Endpoint configured",
      status: descriptor.failClosedReason === "no_endpoint" ? "blocked" : "ready",
      detail:
        descriptor.failClosedReason === "no_endpoint"
          ? "No Napoleon endpoint is configured."
          : "A Napoleon endpoint is configured locally.",
    },
    {
      label: "Descriptor discovered",
      status: descriptorDiscoveryBlocked ? "blocked" : "ready",
      detail:
        descriptor.failClosedReason === "no_descriptor"
          ? "No Napoleon Chief of Staff descriptor has been discovered."
          : descriptor.failClosedReason === "descriptor_stale"
            ? "Napoleon descriptor discovery is stale; rediscover before attempting a live send."
            : descriptorDiscoveryBlocked
              ? `${descriptor.failClosedReason}: ${descriptor.message}`
            : "Descriptor state is available for preflight.",
    },
    {
      label: "Descriptor integrity",
      status: descriptorIntegrityBlocked ? "blocked" : "ready",
      detail:
        descriptor.failClosedReason === "descriptor_stale"
          ? `Descriptor cache is stale. Checksum ${descriptor.checksumState}; signature ${descriptor.signatureState}.`
          : descriptor.failClosedReason === "descriptor_invalid"
            ? descriptor.message
          : `Checksum ${descriptor.checksumState}; signature ${descriptor.signatureState}.`,
    },
    {
      label: "Text-turn route",
      status: textTurnRouteReady ? "ready" : "blocked",
      detail: textTurnRouteReady
        ? "Napoleon descriptor advertises text_turn."
        : descriptor.canAttemptLiveBridge
          ? "Napoleon descriptor has not advertised text_turn."
          : "Descriptor preflight must pass before the text-turn route can be checked.",
    },
    {
      label: "Governance send gate",
      status: input.governanceCanSendAdvisory ? "ready" : "blocked",
      detail: input.governanceCanSendAdvisory
        ? "Local governance allows preparing an advisory bridge request."
        : input.governanceOutcome
          ? `Local governance blocks sending this request: ${input.governanceOutcome}.`
          : "Local governance blocks sending this request.",
    },
    {
      label: "Allowed effects",
      status: input.governanceCanSendAdvisory ? "ready" : "blocked",
      detail: input.governanceCanSendAdvisory ? "prepare_advisory_response" : "none",
    },
    {
      label: "Blocked effects",
      status: "ready",
      detail: blockedEffects.join(", "),
    },
    {
      label: "Rehearsal Mode",
      status: input.rehearsalMode ? "warning" : "ready",
      detail: input.rehearsalMode
        ? "Rehearsal Mode is on; preview first and send separately."
        : "Rehearsal Mode is off for direct governed send attempts.",
    },
  ];
  if (evidenceCapture !== undefined) {
    items.push({
      label: "Evidence capture",
      status: evidenceCaptureReady ? "ready" : "warning",
      detail: describeEvidenceState(evidenceCapture),
    });
  }
  if (evidenceComparison !== undefined) {
    items.push({
      label: "Evidence comparison",
      status: evidenceComparisonReady ? "ready" : "warning",
      detail: describeEvidenceState(evidenceComparison),
    });
  }
  items.push({
    label: "Runtime validation",
    status: realRuntimeReady ? "ready" : "warning",
    detail:
      runtimeValidationSource === undefined
        ? "Runtime validation source is unavailable; real Napoleon runtime evidence has not been proven."
        : describeRuntimeValidationSource(runtimeValidationSource),
  });
  items.push({
    label: "Promotion gate",
    status: realRuntimeReady && evidenceCaptureReady && evidenceComparisonReady ? "ready" : "warning",
    detail: describePromotionGate(runtimeValidationSource, !evidenceCaptureReady || !evidenceComparisonReady),
  });
  const hasBlocked = items.some((item) => item.status === "blocked") || !descriptor.canAttemptLiveBridge;
  const hasWarning = items.some((item) => item.status === "warning");
  const canAttemptLiveSend = !hasBlocked && !input.rehearsalMode && input.inputReady && input.governanceCanSendAdvisory;
  const status: LiveSendPreflightView["status"] = hasBlocked ? "blocked" : hasWarning ? "warning" : "ready";

  return {
    heading: "Live send preflight",
    status,
    canAttemptLiveSend,
    summary: canAttemptLiveSend
      ? "Ready for a governed bridge attempt through Napoleon."
      : input.rehearsalMode && !hasBlocked
        ? "Rehearsal Mode is active; preview locally before any separate governed bridge send."
        : "Live send is blocked until required preflight items pass.",
    caveat:
      "This checklist is not Napoleon approval, does not write memory, does not dispatch agents, does not capture approval, and does not send externally by itself.",
    items,
  };
}

export function describeDelegation(
  delegation: NapoleonDelegation | undefined,
  targetCapability?: string,
  fallback?: DelegationFallbackProvenance,
): DelegationView {
  const safeTargetCapability = sanitizeVisibleProvenanceValue(targetCapability);
  if (!delegation || delegation.selectedAgents.length === 0) {
    if (targetCapability) {
      const safeBlockedEffects = sanitizeVisibleProvenanceList(fallback?.blockedEffects);
      const safeGovernanceState = sanitizeVisibleProvenanceValue(fallback?.governanceState);
      const safeTraceId = sanitizeVisibleProvenanceValue(fallback?.traceId);
      const safeAuditId = sanitizeVisibleProvenanceValue(fallback?.auditId);
      return {
        heading: "Napoleon target capability",
        body: `Napoleon returned target capability ${safeTargetCapability}, but did not include selected-agent delegation provenance.`,
        details: [
          { label: "Target capability", value: safeTargetCapability },
          { label: "Provenance source", value: "target capability only; selected-agent delegation not returned" },
          { label: "Selected agents", value: "not returned" },
          { label: "Why selected", value: "not returned" },
          { label: "Allowed effects", value: "not returned" },
          { label: "Blocked effects", value: safeBlockedEffects },
          { label: "Governance state", value: safeGovernanceState },
          { label: "Trace", value: safeTraceId },
          { label: "Audit", value: safeAuditId },
        ],
      };
    }

    return {
      heading: "Napoleon delegation",
      body: "No Napoleon delegation provenance was returned, so Concierge will not attribute the answer to a capability or agent.",
      details: [
        { label: "Target capability", value: "not returned" },
        { label: "Provenance source", value: "not returned" },
        { label: "Selected agents", value: "not returned" },
        { label: "Why selected", value: "not returned" },
        { label: "Allowed effects", value: "not returned" },
        { label: "Blocked effects", value: "not returned" },
        { label: "Governance state", value: "not returned" },
        { label: "Trace", value: "not returned" },
        { label: "Audit", value: "not returned" },
      ],
    };
  }

  const agentLabels = delegation.selectedAgents
    .map(
      (agent) =>
        `${sanitizeVisibleProvenanceValue(agent.displayName)} (${sanitizeVisibleProvenanceValue(
          agent.agentId,
        )}): ${sanitizeVisibleProvenanceValue(agent.selectionReason)}`,
    )
    .join("; ");
  const selectionReasons = delegation.selectedAgents
    .map(
      (agent) =>
        `${sanitizeVisibleProvenanceValue(agent.displayName)}: ${sanitizeVisibleProvenanceValue(
          agent.selectionReason,
        )}`,
    )
    .join("; ");
  const contribution = delegation.selectedAgents
    .filter((agent) => agent.contributionSummary)
    .map(
      (agent) =>
        `${sanitizeVisibleProvenanceValue(agent.displayName)} found ${sanitizeVisibleProvenanceValue(
          agent.contributionSummary,
        )}.`,
    )
    .join(" ");

  return {
    heading: "Napoleon delegation",
    body: contribution || "Napoleon provided delegation provenance for this response.",
    details: [
      { label: "Target capability", value: safeTargetCapability },
      { label: "Provenance source", value: "returned bridge delegation; not local metadata discovery" },
      { label: "Selected agents", value: agentLabels },
      { label: "Why selected", value: selectionReasons },
      { label: "Allowed effects", value: sanitizeVisibleProvenanceList(delegation.allowedEffects) },
      { label: "Blocked effects", value: sanitizeVisibleProvenanceList(delegation.blockedEffects) },
      { label: "Governance state", value: sanitizeVisibleProvenanceValue(delegation.governanceState) },
      { label: "Trace", value: sanitizeVisibleProvenanceValue(delegation.traceId) },
      { label: "Audit", value: sanitizeVisibleProvenanceValue(delegation.auditId) },
    ],
  };
}

export function describeNapoleonResponseProof(response: NapoleonResponse): NapoleonResponseProofView {
  const agentLabels =
    response.delegation?.selectedAgents.map((agent) => sanitizeVisibleProvenanceValue(agent.displayName)).join(", ") ||
    "";
  const selectionReasons =
    response.delegation?.selectedAgents
      .map(
        (agent) =>
          `${sanitizeVisibleProvenanceValue(agent.displayName)}: ${sanitizeVisibleProvenanceValue(
            agent.selectionReason,
          )}`,
      )
      .join("; ") || "";
  const targetCapability = response.targetAgent
    ? sanitizeVisibleProvenanceValue(response.targetAgent, "")
    : "";
  const recommendation = response.recommendationProvenance?.summary
    ? sanitizeVisibleProvenanceValue(response.recommendationProvenance.summary, "")
    : undefined;
  const status: NapoleonResponseProofView["status"] = agentLabels || targetCapability || recommendation ? "verified" : "limited";
  const proofParts = [
    targetCapability ? `Capability: ${targetCapability}` : "",
    agentLabels ? `Agents: ${agentLabels}` : "",
    recommendation ? `Napoleon recommendation: ${recommendation}` : "",
  ].filter(Boolean);

  return {
    heading: "Last successful Napoleon proof",
    status,
    summary: proofParts.length
      ? proofParts.join(". ")
      : "No agent or recommendation provenance was returned with the successful response.",
    caveat:
      "This proof summarizes bridge-returned provenance only. It is not Napoleon approval, does not write memory, does not dispatch agents, and does not send externally.",
    details: [
      { label: "Governance", value: response.governanceDecision.outcome },
      { label: "Profile mode", value: response.profileMode },
      { label: "Decision", value: response.governanceDecision.decision_id },
      { label: "Trace", value: response.traceEnvelope.trace_id },
      { label: "Audit", value: response.auditEnvelope.audit_id },
      { label: "Attribution boundary", value: "Returned bridge provenance only; not local authority." },
      { label: "Target capability", value: targetCapability || "not returned" },
      { label: "Selected agents", value: agentLabels || "not returned" },
      { label: "Why selected", value: selectionReasons || "not returned" },
      { label: "Napoleon recommendation", value: recommendation || "not returned" },
      {
        label: "Capability or agents",
        value: agentLabels || targetCapability || "No selected-agent provenance returned",
      },
      {
        label: "Allowed effects",
        value: response.delegation?.allowedEffects
          ? sanitizeVisibleProvenanceList(response.delegation.allowedEffects)
          : "prepare_advisory_response",
      },
      {
        label: "Blocked effects",
        value: sanitizeVisibleProvenanceList(
          response.delegation?.blockedEffects || response.governanceDecision.blocked_effects,
        ),
      },
    ],
  };
}

export function describeGovernedHandoffReadiness(
  input: GovernedHandoffReadinessInput,
): GovernedHandoffReadinessView {
  const descriptor = input.descriptorConnection;
  const blockedEffects = descriptor.descriptorStatus?.blockedEffects ?? [
    "runtime_authority",
    "agent_dispatch",
    "memory_write",
    "approval_capture",
    "external_send",
  ];
  const endpointReady = descriptor.failClosedReason !== "no_endpoint";
  const descriptorReady =
    descriptor.failClosedReason === "no_endpoint"
      ? Boolean(descriptor.descriptorStatus?.ready) &&
        descriptor.checksumState !== "mismatch" &&
        descriptor.signatureState !== "invalid"
      : descriptor.canAttemptLiveBridge;
  const rehearsalReady = !input.rehearsalMode;
  const handoffRouteReady = input.requiredHandoff
    ? descriptorSupportsGovernedHandoff(descriptor, input.requiredHandoff)
    : true;
  const canSubmit = input.draftReady && endpointReady && descriptorReady && handoffRouteReady && rehearsalReady;
  const items: LiveSendPreflightItem[] = [
    {
      label: "Review draft",
      status: input.draftReady ? "ready" : "blocked",
      detail: input.draftReady ? "A proposal-only review draft is available." : "Create a review draft before handoff.",
    },
    {
      label: "Endpoint configured",
      status: endpointReady ? "ready" : "blocked",
      detail: endpointReady ? "A Napoleon endpoint is configured locally." : "No Napoleon endpoint is configured.",
    },
    {
      label: "Descriptor preflight",
      status: descriptorReady ? "ready" : "blocked",
      detail: descriptorReady
        ? "Descriptor discovery and integrity checks allow a governed bridge attempt."
        : descriptor.message,
    },
    ...(input.requiredHandoff
      ? [
          {
            label: "Governed handoff route",
            status: handoffRouteReady ? "ready" as const : "blocked" as const,
            detail: handoffRouteReady
              ? `Napoleon descriptor advertises ${input.requiredHandoff}.`
              : `Napoleon descriptor has not advertised ${input.requiredHandoff}.`,
          },
        ]
      : []),
    {
      label: "Rehearsal Mode",
      status: rehearsalReady ? "ready" : "blocked",
      detail: rehearsalReady
        ? "Rehearsal Mode is off for this governed handoff."
        : "Rehearsal Mode is active; keep this review local until rehearsal is turned off.",
    },
  ];

  return {
    heading: `${input.label} readiness`,
    status: canSubmit ? "ready" : "blocked",
    canSubmit,
    summary: canSubmit
      ? `${input.label} can be submitted through the governed bridge for Napoleon review.`
      : `${input.label} is blocked until the review draft, endpoint, descriptor preflight, governed handoff route, and Rehearsal Mode state are ready.`,
    caveat:
      "This handoff readiness check is not Napoleon approval, does not apply changes, does not write memory, does not dispatch agents, and does not send externally.",
    blockedEffects,
    items,
  };
}

export function describeGovernedReviewResponse(
  result: GovernedReviewResponseInput,
  localEffects: string,
): GovernedReviewResponseView {
  return {
    rows: [
      { label: "Napoleon review response", value: sanitizeVisibleProvenanceValue(result.text) },
      {
        label: "Governance",
        value: `${sanitizeVisibleProvenanceValue(result.governanceDecision.outcome)}, decision ${sanitizeVisibleProvenanceValue(
          result.governanceDecision.decision_id,
        )}`,
      },
      { label: "Authority tier", value: sanitizeVisibleProvenanceValue(result.governanceDecision.authority_tier) },
      {
        label: "Approval requirement",
        value: sanitizeVisibleProvenanceValue(result.governanceDecision.approval_requirement),
      },
      { label: "Rationale", value: sanitizeVisibleProvenanceValue(result.governanceDecision.rationale) },
      { label: "Trace", value: sanitizeVisibleProvenanceValue(result.traceEnvelope.trace_id) },
      { label: "Audit", value: sanitizeVisibleProvenanceValue(result.auditEnvelope.audit_id) },
      { label: "Blocked effects", value: sanitizeVisibleProvenanceList(result.governanceDecision.blocked_effects) },
      { label: "Local effects", value: sanitizeVisibleProvenanceValue(localEffects) },
    ],
  };
}

export function describeGovernanceDecision(input: GovernanceDecisionViewInput): GovernanceDecisionView {
  const blockedEffectsLabel = input.blockedEffects.slice(0, 5).join(", ");

  if (input.outcome === "requires_review") {
    return {
      status: "Review required",
      detail: `Chief of Staff review is required before this can move beyond preparation. Decision ${input.decisionId}, audit ${input.auditId}.`,
      requiresReview: true,
      blockedEffectsLabel,
    };
  }

  if (input.outcome === "no_go") {
    return {
      status: "No-go",
      detail: `Napoleon governance marked this as non-executable. Decision ${input.decisionId}, audit ${input.auditId}.`,
      requiresReview: true,
      blockedEffectsLabel,
    };
  }

  if (input.outcome === "deny") {
    return {
      status: "Denied",
      detail: `Napoleon governance denied the requested action. Decision ${input.decisionId}, audit ${input.auditId}.`,
      requiresReview: false,
      blockedEffectsLabel,
    };
  }

  return {
    status: "Prepare only",
    detail: `Concierge can prepare an advisory response but cannot execute blocked effects. Decision ${input.decisionId}, audit ${input.auditId}.`,
    requiresReview: false,
    blockedEffectsLabel,
  };
}

export function summarizeRehearsalPreview(preview: RehearsalPreview): RehearsalPreviewView {
  return {
    status: "Rehearsal only",
    detail: `This preview was not sent to Napoleon and did not execute anything. It shows the proposed CoS request ${preview.chiefOfStaffReviewPacket.requestId}.`,
    executed: false,
    approval: preview.approvalState,
    memory: `Memory status: ${preview.memoryProposal.status}. Proposal ${preview.memoryProposal.proposalId} is review-only.`,
  };
}

export function describeGovernanceReview(review: GovernanceReviewState): GovernanceReviewView {
  const details = [
    { label: "Decision", value: review.decisionId },
    { label: "Audit", value: review.auditId },
    { label: "Authority tier", value: review.authorityTier },
    { label: "Approval requirement", value: review.approvalRequirement },
    { label: "Rationale", value: review.rationale },
    { label: "Blocked effects", value: review.blockedEffects.join(", ") },
    { label: "Trace", value: review.traceId },
  ];

  if (review.status === "blocked_non_executable") {
    const childBody =
      "I cannot help do that. I will not keep secrets, send anything outside this chat, or do actions without the right adult review.";
    const adultBody =
      "This is blocked and non-executable. Concierge will not execute side effects, write memory, send externally, dispatch agents, or treat this as approved.";
    return {
      heading: review.profile === "child_protected" ? "Not available" : "No-go",
      body: review.profile === "child_protected" ? childBody : adultBody,
      actionLabel: "Blocked",
      canAcknowledge: false,
      sendBlocked: true,
      details,
    };
  }

  if (review.status === "review_acknowledged") {
    return {
      heading: "Review acknowledged locally",
      body:
        "This local acknowledgement is not Napoleon approval. It does not execute side effects, write memory, send externally, or dispatch agents.",
      actionLabel: "Acknowledged locally",
      canAcknowledge: false,
      sendBlocked: false,
      details,
    };
  }

  if (review.status === "review_needed") {
    const childBody =
      "This needs adult review before anything outside this chat can happen. Concierge will only show the request and will not keep secrets or send anything.";
    const adultBody =
      "Chief of Staff or Napoleon review is needed before this can move beyond preparation. Local acknowledgement records that review is needed, not approval.";
    return {
      heading: "Review required",
      body: review.profile === "child_protected" ? childBody : adultBody,
      actionLabel: "Acknowledge review needed",
      canAcknowledge: true,
      sendBlocked: false,
      details,
    };
  }

  return {
    heading: "Prepare only",
    body: "Concierge may prepare an advisory response, but blocked effects remain unavailable.",
    actionLabel: "No review needed",
    canAcknowledge: false,
    sendBlocked: false,
    details,
  };
}

export function describeMemoryProposalReview(review: MemoryProposalReviewState): MemoryProposalReviewView {
  const details = [
    { label: "Proposal", value: review.proposalId },
    { label: "Source turn", value: review.sourceTurnId },
    { label: "Profile", value: review.profile },
    { label: "Kind", value: review.proposedDiff.kind },
    { label: "Proposed value", value: review.proposedDiff.value },
    { label: "Review state", value: review.status },
    { label: "Guardian review", value: review.guardianReviewRequired ? "required" : "not required" },
    { label: "Memory write", value: review.memoryWritePerformed ? "performed" : "not performed" },
    { label: "Approval captured", value: review.approvalCaptured ? "yes" : "no" },
    { label: "Blocked effects", value: review.blockedEffects.join(", ") },
    { label: "Trace", value: review.traceId },
    { label: "Audit", value: review.auditId },
  ];

  if (review.profile === "child_protected") {
    return {
      heading: "Memory needs adult review",
      body:
        "This is a proposal only. I will not keep secrets or save this as memory without the right adult review.",
      actionLabel:
        review.status === "acknowledged_locally" ? "Acknowledged locally" : "Acknowledge review needed",
      dismissLabel: review.status === "dismissed_locally" ? "Dismissed locally" : "Dismiss proposal",
      canAcknowledge: review.canAcknowledge,
      canDismiss: review.canDismiss,
      details,
    };
  }

  if (review.status === "acknowledged_locally") {
    return {
      heading: "Memory review acknowledged locally",
      body:
        "This local acknowledgement is not Napoleon approval and does not write memory. The proposal remains review-only.",
      actionLabel: "Acknowledged locally",
      dismissLabel: "Dismiss proposal",
      canAcknowledge: false,
      canDismiss: false,
      details,
    };
  }

  if (review.status === "dismissed_locally") {
    return {
      heading: "Memory proposal dismissed locally",
      body:
        "This dismissal only hides the local proposal. It does not delete Napoleon memory and does not write memory.",
      actionLabel: "Acknowledge review needed",
      dismissLabel: "Dismissed locally",
      canAcknowledge: false,
      canDismiss: false,
      details,
    };
  }

  return {
    heading: "Memory proposal review",
    body:
      "This is a proposal only. Local acknowledgement is not Napoleon approval and does not write memory.",
    actionLabel: "Acknowledge review needed",
    dismissLabel: "Dismiss proposal",
    canAcknowledge: review.canAcknowledge,
    canDismiss: review.canDismiss,
    details,
  };
}
