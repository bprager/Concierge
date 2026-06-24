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
  targetCapabilityLabel?: string;
  descriptorConnection?: DescriptorConnectionState;
  failure?: LastNapoleonTurnFailureInput | null;
}

export interface NapoleonResponseProofView {
  heading: string;
  status: "verified" | "limited";
  summary: string;
  caveat: string;
  details: Array<{ label: string; value: string }>;
}

export interface LastNapoleonTurnSummaryView {
  heading: string;
  status: "available" | "blocked" | "not_available";
  summary: string;
  caveat: string;
  details: Array<{ label: string; value: string }>;
}

export interface LastNapoleonTurnFailureInput {
  reason: string;
  traceId?: string;
  governanceOutcome?: string;
  descriptorFailureReason?: DescriptorFailClosedReason;
  blockedEffects?: string[];
  nextStep?: string;
}

export interface NapoleonTurnTimelineEntryView {
  label: string;
  status: LastNapoleonTurnSummaryView["status"];
  summary: string;
  details: Array<{ label: string; value: string }>;
}

export interface NapoleonTurnTimelineView {
  heading: string;
  status: "empty" | "has_entries";
  summary: string;
  caveat: string;
  entries: NapoleonTurnTimelineEntryView[];
  comparison: Array<{ label: string; value: string }>;
}

export interface NapoleonResponsePresentationLabels {
  targetCapabilityLabel?: string;
}

function displayReturnedTargetCapability(
  targetCapability: string | undefined,
  label: string | undefined,
  redactedDisplay = "redacted metadata",
): string {
  const safeTargetCapability = sanitizeVisibleProvenanceValue(targetCapability);
  if (safeTargetCapability === "redacted") return redactedDisplay;
  const safeTargetCapabilityLabel = sanitizeVisibleProvenanceValue(label, "");
  return safeTargetCapabilityLabel && safeTargetCapabilityLabel !== "redacted" && safeTargetCapabilityLabel !== safeTargetCapability
    ? `${safeTargetCapabilityLabel} (${safeTargetCapability})`
    : safeTargetCapability;
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

function visibleReferenceValue(value: string | undefined): string {
  const sanitized = sanitizeVisibleProvenanceValue(value);
  return sanitized === "redacted" ? "redacted metadata" : sanitized;
}

export function describeNapoleonTranscriptMetadata(
  response: NapoleonResponse,
  labels: NapoleonResponsePresentationLabels = {},
): NonNullable<ConciergeMessage["metadata"]> {
  return {
    source: "Napoleon governed bridge",
    attributionBoundary: "Returned bridge provenance only; not local authority.",
    ...(response.targetAgent
      ? { targetCapability: displayReturnedTargetCapability(response.targetAgent, labels.targetCapabilityLabel, "redacted") }
      : {}),
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
  lastEvidenceOperationId?: string;
  lastEvidenceTargetPath?: string;
  lastFailureReason?: string;
  runtimeValidationSource?: "real_runtime" | "local_harness" | "local_simulation";
  evaluatorValidationStatus?: "not_run" | "passed" | "failed";
  evaluatorFailureReason?: string;
  evaluatorTargetPath?: string;
  evaluatorDescriptorHandoffAdvertised?: boolean | null;
  evaluatorDescriptorHandoffSource?: string | null;
  evaluatorDescriptorHandoffFailureReason?: string;
  evaluatorDescriptorHandoffRequiredAction?: string;
}

export interface LiveBridgeReadinessView {
  heading: string;
  status: "ready" | "blocked" | "warning";
  canSendLive: boolean;
  summary: string;
  caveat: string;
  promotionBlockers: string[];
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
  evaluatorValidationStatus?: LiveBridgeReadinessInput["evaluatorValidationStatus"];
  evaluatorFailureReason?: string;
  evaluatorTargetPath?: string;
  evaluatorDescriptorHandoffAdvertised?: boolean | null;
  evaluatorDescriptorHandoffSource?: string | null;
  evaluatorDescriptorHandoffFailureReason?: string;
  evaluatorDescriptorHandoffRequiredAction?: string;
  acceptedRealRuntimeProof?: {
    status: "success";
    operationId: string;
    targetPath: string;
    promotionGate: string;
  };
}

export interface LiveSendPreflightItem {
  label: string;
  status: "ready" | "blocked" | "warning";
  detail: string;
  descriptorFailureReason?: DescriptorFailClosedReason;
  governanceOutcome?: GovernanceOutcome;
}

export interface LiveSendPreflightView {
  heading: string;
  status: "ready" | "blocked" | "warning";
  canAttemptLiveSend: boolean;
  summary: string;
  caveat: string;
  blockerSummary: string;
  nextStepSummary: string;
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
  acceptedRealRuntimeProof?: LiveSendPreflightInput["acceptedRealRuntimeProof"];
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
  artifactLabel?: string;
  artifactReadyDetail?: string;
  artifactBlockedDetail?: string;
  readyNextStepSummary?: string;
  rehearsalMode?: boolean;
  requiredHandoff?: GovernedHandoffCapability;
}

export interface GovernedHandoffReadinessView {
  heading: string;
  status: "ready" | "blocked";
  canSubmit: boolean;
  summary: string;
  nextStepSummary: string;
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
  const requestId = visibleReferenceValue(error.requestId);
  const traceId = visibleReferenceValue(error.traceId);
  const decision = error.decisionId ? `, decision ${visibleReferenceValue(error.decisionId)}` : "";
  const audit = error.auditId ? `, audit ${visibleReferenceValue(error.auditId)}` : "";
  const governance = error.governanceOutcome ? `, governance ${visibleReferenceValue(error.governanceOutcome)}` : "";
  const profile = error.profileMode ? `, profile ${visibleReferenceValue(error.profileMode)}` : "";
  const descriptor = describeBridgeDescriptorDetail(error);
  return `Live Napoleon bridge blocked: ${error.reason}. Request ${requestId}, trace ${traceId}${profile}${decision}${audit}${governance}.${descriptor}${blockedEffects} Concierge did not send externally, did not write memory, did not dispatch agents, and did not capture approval.`;
}

export function describeBridgeFailureTranscriptMessage(error: unknown): string {
  if (!(error instanceof NapoleonBridgeError)) {
    return "Napoleon bridge failed closed. Concierge did not execute anything and remains in prepare-only mode.";
  }

  const blockedEffects = error.blockedEffects.length
    ? ` Blocked effects: ${sanitizeVisibleProvenanceList(error.blockedEffects)}.`
    : "";
  const decision = error.decisionId ? ` Decision ${visibleReferenceValue(error.decisionId)}.` : "";
  const audit = error.auditId ? ` Audit ${visibleReferenceValue(error.auditId)}.` : "";
  const governance = error.governanceOutcome ? ` Governance ${visibleReferenceValue(error.governanceOutcome)}.` : "";
  const profile = error.profileMode ? ` Profile ${visibleReferenceValue(error.profileMode)}.` : "";
  const descriptor = describeBridgeDescriptorDetail(error);
  return `Napoleon bridge blocked: ${error.reason}.${profile}${decision}${audit}${governance}${descriptor}${blockedEffects} Concierge did not execute anything and remains in prepare-only mode.`;
}

function describeBridgeFailureNextStep(error: NapoleonBridgeError): string {
  if (error.descriptorFailureReason === "no_endpoint") {
    return "Configure a governed Napoleon endpoint, then refresh descriptor discovery.";
  }
  if (error.descriptorFailureReason === "no_descriptor") {
    return "Refresh descriptor discovery before attempting a live Napoleon turn.";
  }
  if (error.descriptorFailureReason === "descriptor_signature_or_checksum_mismatch") {
    return "Resolve the descriptor signature or checksum mismatch before sending again.";
  }
  if (error.descriptorFailureReason === "auth_failure" || error.reason === "auth_failure") {
    return "Check the governed bridge credentials, then refresh descriptor discovery.";
  }
  if (error.descriptorFailureReason === "bridge_timeout" || error.reason === "bridge_timeout") {
    return "Check Napoleon bridge availability, then retry through the governed endpoint.";
  }
  if (error.reason === "governance_denied" || error.reason === "governance_no_go") {
    return "Revise the request or keep it local; Napoleon governance did not allow forwarding.";
  }
  if (error.reason === "contract_mismatch" || error.reason === "descriptor_mismatch" || error.reason === "missing_descriptor") {
    return "Align the bridge contract or descriptor before attempting another live turn.";
  }
  return "Review the fail-closed bridge details before attempting another governed Napoleon turn.";
}

export function describeLastNapoleonTurnFailure(error: unknown): LastNapoleonTurnFailureInput {
  if (!(error instanceof NapoleonBridgeError)) {
    return {
      reason: "bridge_failed",
      nextStep: "Review the local failure, then retry only through the governed Napoleon bridge.",
    };
  }

  return {
    reason: error.reason,
    traceId: error.traceId,
    governanceOutcome: error.governanceOutcome,
    descriptorFailureReason: error.descriptorFailureReason,
    blockedEffects: error.blockedEffects,
    nextStep: describeBridgeFailureNextStep(error),
  };
}

export function describeGovernedHandoffFailure(error: unknown, label: string, primaryEffect: string): string {
  if (!(error instanceof NapoleonBridgeError)) {
    return `${label} failed closed. Concierge did not ${primaryEffect}, did not write memory, did not dispatch agents, did not send externally, and did not capture approval.`;
  }

  const blockedEffects = error.blockedEffects.length
    ? ` Blocked effects: ${sanitizeVisibleProvenanceList(error.blockedEffects)}.`
    : "";
  const requestId = visibleReferenceValue(error.requestId);
  const traceId = visibleReferenceValue(error.traceId);
  const profile = error.profileMode ? `, profile ${visibleReferenceValue(error.profileMode)}` : "";
  const decision = error.decisionId ? `, decision ${visibleReferenceValue(error.decisionId)}` : "";
  const audit = error.auditId ? `, audit ${visibleReferenceValue(error.auditId)}` : "";
  const governance = error.governanceOutcome ? `, governance ${visibleReferenceValue(error.governanceOutcome)}` : "";
  const descriptor = describeBridgeDescriptorDetail(error);
  return `${label} blocked: ${error.reason}. Request ${requestId}, trace ${traceId}${profile}${decision}${audit}${governance}.${descriptor}${blockedEffects} Concierge did not ${primaryEffect}, did not write memory, did not dispatch agents, did not send externally, and did not capture approval.`;
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

function describeLastRealRuntimeProof(input: {
  runtimeValidationSource?: LiveBridgeReadinessInput["runtimeValidationSource"];
  evidenceCapture: LiveBridgeEvidenceState;
  evidenceComparison: LiveBridgeEvidenceState;
  lastEvidenceStatus?: LiveBridgeReadinessInput["lastEvidenceStatus"];
  lastEvidenceOperationId?: string;
  lastEvidenceTargetPath?: string;
}): string {
  if (input.runtimeValidationSource !== "real_runtime") return "not proven";
  if (input.evidenceCapture !== "passed" || input.evidenceComparison !== "passed") return "not proven";
  if (input.lastEvidenceStatus !== "success") return "not proven";

  const operation = input.lastEvidenceOperationId?.trim() || "unknown operation";
  const targetPath = input.lastEvidenceTargetPath?.trim() || "unknown target";
  return `success: ${operation} at ${targetPath}`;
}

function describePromotionGate(
  source: LiveBridgeReadinessInput["runtimeValidationSource"],
  evidencePending: boolean,
  evaluatorValidationStatus?: LiveBridgeReadinessInput["evaluatorValidationStatus"],
): string {
  if (source === undefined) {
    return "blocked until real Napoleon runtime evidence passes";
  }
  if (source === "local_harness" || source === "local_simulation") {
    return "blocked until real Napoleon runtime evidence passes";
  }
  if (evidencePending) return "blocked until evidence capture and comparison pass";
  if (evaluatorValidationStatus === "failed" || evaluatorValidationStatus === "not_run") {
    return "blocked until evaluator HTTP mode passes";
  }
  return "real runtime evidence available";
}

function describePromotionBlockers(input: {
  descriptor: DescriptorConnectionState;
  textTurnRouteReady: boolean;
  evidenceCapture: LiveBridgeEvidenceState;
  evidenceComparison: LiveBridgeEvidenceState;
  runtimeValidationSource?: LiveBridgeReadinessInput["runtimeValidationSource"];
  evaluatorValidationStatus: NonNullable<LiveBridgeReadinessInput["evaluatorValidationStatus"]>;
  evaluatorFailureReason?: string;
  lastEvidenceStatus?: LiveBridgeReadinessInput["lastEvidenceStatus"];
  lastFailureReason?: string;
}): string[] {
  const blockers: string[] = [];
  const descriptor = input.descriptor;

  if (!descriptor.canAttemptLiveBridge) {
    if (descriptor.failClosedReason === "no_endpoint") {
      blockers.push("Configure a Napoleon endpoint.");
    } else if (descriptor.failClosedReason === "auth_failure") {
      blockers.push("Fix Napoleon descriptor authentication.");
    } else if (descriptor.failClosedReason === "bridge_timeout") {
      blockers.push("Restore Napoleon descriptor response before retrying.");
    } else if (descriptor.failClosedReason === "http_failure") {
      blockers.push("Fix Napoleon descriptor HTTP discovery.");
    } else if (descriptor.failClosedReason === "descriptor_signature_or_checksum_mismatch") {
      blockers.push("Resolve the descriptor signature or checksum mismatch.");
    } else if (descriptor.failClosedReason === "descriptor_stale") {
      blockers.push("Refresh the stale Napoleon descriptor.");
    } else if (descriptor.failClosedReason === "no_descriptor") {
      blockers.push("Discover a Napoleon Chief of Staff descriptor.");
    } else {
      blockers.push("Replace the invalid Napoleon descriptor with an authority-safe descriptor.");
    }
  }

  if (descriptor.canAttemptLiveBridge && !input.textTurnRouteReady) {
    blockers.push("Use a descriptor that advertises the governed text-turn route.");
  }

  if (input.evidenceCapture === "failed" || input.evidenceComparison === "failed") {
    blockers.push("Fix failed bridge evidence capture or comparison.");
  } else if (
    input.evidenceCapture !== "passed" ||
    input.evidenceComparison !== "passed" ||
    input.runtimeValidationSource === undefined ||
    input.runtimeValidationSource === "local_harness" ||
    input.runtimeValidationSource === "local_simulation"
  ) {
    blockers.push("Run real Napoleon bridge evidence capture and comparison.");
  }

  if (input.evaluatorValidationStatus === "failed" || input.evaluatorValidationStatus === "not_run") {
    blockers.push(
      input.evaluatorFailureReason === "http_evaluator_handoff_not_advertised"
        ? "Have Napoleon advertise the evaluation review handoff, or import an explicit evaluator endpoint proof."
        : "Pass evaluator HTTP mode against Napoleon.",
    );
  }

  if (input.lastEvidenceStatus === "fail_closed") {
    blockers.push(
      input.lastFailureReason
        ? `Resolve the last fail-closed live send: ${input.lastFailureReason}.`
        : "Resolve the last fail-closed live send.",
    );
  }

  return blockers;
}

function describeEvaluatorHttpDetail(input: {
  status?: "not_run" | "passed" | "failed";
  failureReason?: string;
  descriptorHandoffAdvertised?: boolean | null;
  descriptorHandoffSource?: string | null;
  descriptorHandoffFailureReason?: string;
  descriptorHandoffRequiredAction?: string;
}): string {
  if (input.status === "passed") return "passed";
  if (input.status !== "failed") return "not run";
  if (input.failureReason === "http_evaluator_handoff_not_advertised") {
    const advertised =
      input.descriptorHandoffAdvertised === true
        ? "advertised"
        : input.descriptorHandoffAdvertised === false
          ? "not advertised"
          : "unknown";
    const source = input.descriptorHandoffSource ? `; descriptor handoff ${advertised} via ${input.descriptorHandoffSource}` : "";
    const requiredAction = input.descriptorHandoffRequiredAction ? `; ${input.descriptorHandoffRequiredAction}` : "";
    return `failed: evaluation review handoff not advertised${source}${requiredAction}`;
  }
  return `failed${input.failureReason ? `: ${input.failureReason}` : ""}`;
}

function describePreflightBlockerSummary(items: LiveSendPreflightItem[]): string {
  const blockedPriority = [
    "Endpoint configured",
    "Descriptor discovered",
    "Descriptor integrity",
    "Text-turn route",
    "Governance send gate",
    "Text ready",
    "Allowed effects",
  ];
  const warningPriority = ["Rehearsal Mode", "Evidence capture", "Evidence comparison", "Runtime validation", "Evaluator HTTP", "Promotion gate"];
  const blocked = blockedPriority
    .map((label) => items.find((item) => item.label === label && item.status === "blocked"))
    .find((item): item is LiveSendPreflightItem => item !== undefined);
  if (blocked) {
    if (blocked.label === "Endpoint configured") return "Main preflight blocker: configure a Napoleon endpoint.";
    if (blocked.label === "Descriptor discovered") {
      const descriptorFailure = describeDescriptorFailureReason(blocked.descriptorFailureReason);
      return descriptorFailure
        ? `Main preflight blocker: ${descriptorFailure}.`
        : "Main preflight blocker: discover a current Napoleon descriptor.";
    }
    if (blocked.label === "Descriptor integrity") {
      const descriptorFailure = describeDescriptorFailureReason(blocked.descriptorFailureReason);
      return descriptorFailure
        ? `Main preflight blocker: ${descriptorFailure}.`
        : "Main preflight blocker: fix descriptor integrity before sending.";
    }
    if (blocked.label === "Text-turn route") return "Main preflight blocker: use a descriptor that advertises text_turn.";
    if (blocked.label === "Governance send gate") {
      return blocked.governanceOutcome
        ? `Main preflight blocker: local governance returned ${blocked.governanceOutcome}.`
        : "Main preflight blocker: local governance does not allow this send.";
    }
    if (blocked.label === "Text ready") return "Main preflight blocker: enter text before sending.";
    return `Main preflight blocker: ${blocked.label.toLowerCase()} is blocked.`;
  }

  const warning = warningPriority
    .map((label) => items.find((item) => item.label === label && item.status === "warning"))
    .find((item): item is LiveSendPreflightItem => item !== undefined);
  if (warning) {
    if (warning.label === "Rehearsal Mode") return "Main preflight warning: Rehearsal Mode is active.";
    if (warning.label === "Runtime validation") return "Main preflight warning: real Napoleon runtime evidence is not proven.";
    if (warning.label === "Evaluator HTTP") {
      return warning.detail.includes("not advertised")
        ? "Main preflight warning: Napoleon has not advertised evaluator review for promotion evidence."
        : "Main preflight warning: evaluator HTTP mode has not passed.";
    }
    if (warning.label === "Promotion gate") return "Main preflight warning: promotion evidence is incomplete.";
    return `Main preflight warning: ${warning.label.toLowerCase()} needs review.`;
  }
  return "No live-send blockers detected from current local preflight.";
}

function describePreflightNextStepSummary(items: LiveSendPreflightItem[]): string {
  const blockedPriority = [
    "Endpoint configured",
    "Descriptor discovered",
    "Descriptor integrity",
    "Text-turn route",
    "Governance send gate",
    "Text ready",
    "Allowed effects",
  ];
  const warningPriority = ["Rehearsal Mode", "Evidence capture", "Evidence comparison", "Runtime validation", "Evaluator HTTP", "Promotion gate"];
  const blocked = blockedPriority
    .map((label) => items.find((item) => item.label === label && item.status === "blocked"))
    .find((item): item is LiveSendPreflightItem => item !== undefined);
  if (blocked) {
    if (blocked.label === "Endpoint configured") return "Next step: add the governed Napoleon endpoint in settings, then run descriptor discovery.";
    if (blocked.label === "Descriptor discovered") {
      const descriptorFailure = describeDescriptorFailureReason(blocked.descriptorFailureReason);
      return descriptorFailure
        ? `Next step: resolve the ${descriptorFailure}, then refresh descriptor discovery.`
        : "Next step: run descriptor discovery for the configured Napoleon endpoint.";
    }
    if (blocked.label === "Descriptor integrity") {
      const descriptorFailure = describeDescriptorFailureReason(blocked.descriptorFailureReason);
      return descriptorFailure
        ? `Next step: resolve the ${descriptorFailure}, then refresh descriptor discovery.`
        : "Next step: refresh descriptor discovery or align the expected descriptor checksum/signature.";
    }
    if (blocked.label === "Text-turn route") return "Next step: use a Napoleon descriptor that advertises the governed text_turn route.";
    if (blocked.label === "Governance send gate") {
      return blocked.governanceOutcome
        ? `Next step: revise the request; local governance ${blocked.governanceOutcome} cannot be forwarded to Napoleon.`
        : "Next step: revise the request until local governance allows an advisory bridge send.";
    }
    if (blocked.label === "Text ready") return "Next step: enter the text request before attempting the governed bridge send.";
    return `Next step: resolve ${blocked.label.toLowerCase()} before attempting the governed bridge send.`;
  }

  const warning = warningPriority
    .map((label) => items.find((item) => item.label === label && item.status === "warning"))
    .find((item): item is LiveSendPreflightItem => item !== undefined);
  if (warning) {
    if (warning.label === "Rehearsal Mode") return "Next step: turn Rehearsal Mode off only when you want a separate governed bridge attempt.";
    if (warning.label === "Runtime validation") return "Next step: capture and compare real Napoleon runtime evidence before treating this as promotion-ready.";
    if (warning.label === "Evaluator HTTP") {
      return warning.detail.includes("not advertised")
        ? "Next step: have Napoleon advertise and expose evaluation review, or import an explicit evaluator endpoint proof."
        : "Next step: run evaluator HTTP validation against the configured Napoleon endpoint.";
    }
    if (warning.label === "Promotion gate") return "Next step: complete the remaining runtime and evaluator evidence before promotion.";
    return `Next step: review ${warning.label.toLowerCase()} before treating the bridge as promotion-ready.`;
  }

  return "Next step: send through the governed Napoleon bridge when you are ready.";
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
  const evaluatorValidationStatus = input.evaluatorValidationStatus ?? "not_run";
  const evaluatorNotPassed = evaluatorValidationStatus === "failed" || evaluatorValidationStatus === "not_run";
  const evaluatorPromotionBlocked = runtimeValidationSource === "real_runtime" && !evidencePending && evaluatorNotPassed;
  const lastSendFailedClosed = input.lastEvidenceStatus === "fail_closed";
  const textTurnRouteReady = descriptorSupportsGovernedHandoff(descriptor, "text_turn");
  const canSendLive = descriptor.canAttemptLiveBridge && textTurnRouteReady && !evidenceFailed;
  const status: LiveBridgeReadinessView["status"] = !canSendLive
    ? "blocked"
    : evidencePending || evaluatorPromotionBlocked || lastSendFailedClosed || localOnlyValidation || runtimeValidationMissing
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
    } else if (descriptor.failClosedReason === "descriptor_stale") {
      summary = "Napoleon descriptor discovery is stale; Concierge is fail-closed until rediscovery.";
    } else if (integrityMismatch) {
      summary = "Napoleon descriptor signature or checksum mismatch detected; Concierge is fail-closed.";
    } else if (descriptor.failClosedReason === "no_descriptor") {
      summary = "Napoleon descriptor is missing, so Concierge is blocked from live bridge sends.";
    } else {
      summary = "Napoleon descriptor is invalid or grants authority, so Concierge is blocked from live bridge sends.";
    }
  } else if (evidenceFailed) {
    summary = "Local bridge evidence validation failed; Concierge should stay in rehearsal or review mode.";
  } else if (!textTurnRouteReady) {
    summary = "Napoleon descriptor does not advertise text_turn, so Concierge is blocked from live text sends.";
  } else if (lastSendFailedClosed) {
    summary = `Last Napoleon live text turn failed closed${input.lastFailureReason ? `: ${input.lastFailureReason}` : ""}. Concierge remains prepare-only for blocked effects.`;
  } else if (evaluatorPromotionBlocked) {
    summary =
      input.evaluatorFailureReason === "http_evaluator_handoff_not_advertised"
        ? "Real Napoleon text bridge evidence passes, but the descriptor does not advertise evaluation review for promotion evidence."
        : input.evaluatorFailureReason === "http_evaluator_route_not_found"
        ? "Real Napoleon text bridge evidence passes, but the evaluator route is not available for promotion evidence."
        : "Real Napoleon text bridge evidence passes, but evaluator HTTP mode has not passed for promotion evidence.";
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
    promotionBlockers: describePromotionBlockers({
      descriptor,
      textTurnRouteReady,
      evidenceCapture,
      evidenceComparison,
      runtimeValidationSource,
      evaluatorValidationStatus,
      evaluatorFailureReason: input.evaluatorFailureReason,
      lastEvidenceStatus: input.lastEvidenceStatus,
      lastFailureReason: input.lastFailureReason,
    }),
    blockedEffects,
    details: [
      { label: "Descriptor", value: descriptor.state },
      { label: "Checksum", value: descriptor.checksumState },
      { label: "Signature", value: descriptor.signatureState },
      { label: "Text-turn route", value: textTurnRouteReady ? "advertised" : "blocked" },
      { label: "Evidence capture", value: describeEvidenceState(evidenceCapture) },
      { label: "Evidence comparison", value: describeEvidenceState(evidenceComparison) },
      { label: "Runtime validation", value: describeRuntimeValidationSource(runtimeValidationSource) },
      {
        label: "Evaluator HTTP",
        value: describeEvaluatorHttpDetail({
          status: evaluatorValidationStatus,
          failureReason: input.evaluatorFailureReason,
          descriptorHandoffAdvertised: input.evaluatorDescriptorHandoffAdvertised,
          descriptorHandoffSource: input.evaluatorDescriptorHandoffSource,
          descriptorHandoffFailureReason: input.evaluatorDescriptorHandoffFailureReason,
          descriptorHandoffRequiredAction: input.evaluatorDescriptorHandoffRequiredAction,
        }),
      },
      {
        label: "Evaluator descriptor handoff",
        value:
          input.evaluatorDescriptorHandoffAdvertised === true
            ? `advertised${input.evaluatorDescriptorHandoffSource ? ` via ${input.evaluatorDescriptorHandoffSource}` : ""}`
            : input.evaluatorDescriptorHandoffAdvertised === false
              ? `not advertised${input.evaluatorDescriptorHandoffFailureReason ? `: ${input.evaluatorDescriptorHandoffFailureReason}` : ""}`
              : "not returned",
      },
      {
        label: "Evaluator required action",
        value: input.evaluatorDescriptorHandoffRequiredAction ?? "not returned",
      },
      { label: "Evaluator target", value: input.evaluatorTargetPath ?? "not returned" },
      { label: "Promotion gate", value: describePromotionGate(runtimeValidationSource, evidencePending, evaluatorValidationStatus) },
      {
        label: "Last live send",
        value:
          input.lastEvidenceStatus === "success"
            ? "success"
            : input.lastEvidenceStatus === "fail_closed"
              ? `fail-closed${input.lastFailureReason ? `: ${input.lastFailureReason}` : ""}`
              : "not run",
      },
      {
        label: "Last real-runtime proof",
        value: describeLastRealRuntimeProof({
          runtimeValidationSource,
          evidenceCapture,
          evidenceComparison,
          lastEvidenceStatus: input.lastEvidenceStatus,
          lastEvidenceOperationId: input.lastEvidenceOperationId,
          lastEvidenceTargetPath: input.lastEvidenceTargetPath,
        }),
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
  const acceptedRealRuntimeProof = input.acceptedRealRuntimeProof;
  const runtimeProofReady = realRuntimeReady || Boolean(acceptedRealRuntimeProof);
  const descriptorReady = input.descriptorConnection.canAttemptLiveBridge;
  const descriptorFailureReason = describeDescriptorFailureReason(input.descriptorConnection.failClosedReason);
  const descriptorBlockedDetail = descriptorFailureReason
    ? `Napoleon descriptor blocks live voice: ${descriptorFailureReason}. Refresh descriptor discovery after resolving this blocker.`
    : `Napoleon descriptor blocks live voice: ${input.descriptorConnection.state}.`;
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
          : descriptorBlockedDetail,
      },
      {
        label: "Runtime proof",
        status: runtimeProofReady ? "ready" : "blocked",
        detail: acceptedRealRuntimeProof
          ? `Accepted real-runtime proof: ${acceptedRealRuntimeProof.status}: ${acceptedRealRuntimeProof.operationId} at ${acceptedRealRuntimeProof.targetPath}.`
          : realRuntimeReady
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
  const evaluatorValidationStatus = input.evaluatorValidationStatus ?? "not_run";
  const evaluatorPromotionBlocked =
    realRuntimeReady &&
    evidenceCaptureReady &&
    evidenceComparisonReady &&
    (evaluatorValidationStatus === "failed" || evaluatorValidationStatus === "not_run");
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
      descriptorFailureReason: descriptorDiscoveryBlocked ? descriptor.failClosedReason : undefined,
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
      descriptorFailureReason: descriptorIntegrityBlocked ? descriptor.failClosedReason : undefined,
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
      governanceOutcome: input.governanceCanSendAdvisory ? undefined : input.governanceOutcome,
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
    label: "Evaluator HTTP",
    status: evaluatorPromotionBlocked ? "warning" : evaluatorValidationStatus === "passed" ? "ready" : "warning",
    detail: describeEvaluatorHttpDetail({
      status: evaluatorValidationStatus,
      failureReason: input.evaluatorFailureReason,
      descriptorHandoffAdvertised: input.evaluatorDescriptorHandoffAdvertised,
      descriptorHandoffSource: input.evaluatorDescriptorHandoffSource,
      descriptorHandoffFailureReason: input.evaluatorDescriptorHandoffFailureReason,
      descriptorHandoffRequiredAction: input.evaluatorDescriptorHandoffRequiredAction,
    }),
  });
  if (input.evaluatorDescriptorHandoffRequiredAction !== undefined) {
    items.push({
      label: "Evaluator required action",
      status: "warning",
      detail: input.evaluatorDescriptorHandoffRequiredAction,
    });
  }
  if (input.evaluatorDescriptorHandoffAdvertised !== undefined) {
    items.push({
      label: "Evaluator descriptor handoff",
      status: input.evaluatorDescriptorHandoffAdvertised ? "ready" : "warning",
      detail:
        input.evaluatorDescriptorHandoffAdvertised === true
          ? `advertised${input.evaluatorDescriptorHandoffSource ? ` via ${input.evaluatorDescriptorHandoffSource}` : ""}`
          : `not advertised${input.evaluatorDescriptorHandoffFailureReason ? `: ${input.evaluatorDescriptorHandoffFailureReason}` : ""}`,
    });
  }
  if (input.evaluatorTargetPath !== undefined) {
    items.push({
      label: "Evaluator target",
      status: evaluatorPromotionBlocked ? "warning" : "ready",
      detail: input.evaluatorTargetPath,
    });
  }
  items.push({
    label: "Accepted real-runtime proof",
    status: "ready",
    detail: input.acceptedRealRuntimeProof
      ? `${input.acceptedRealRuntimeProof.status}: ${input.acceptedRealRuntimeProof.operationId} at ${input.acceptedRealRuntimeProof.targetPath}`
      : "No accepted real-runtime readiness proof imported for this local review session.",
  });
  items.push({
    label: "Promotion gate",
    status: realRuntimeReady && evidenceCaptureReady && evidenceComparisonReady && !evaluatorPromotionBlocked ? "ready" : "warning",
    detail: describePromotionGate(
      runtimeValidationSource,
      !evidenceCaptureReady || !evidenceComparisonReady,
      evaluatorValidationStatus,
    ),
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
    blockerSummary: describePreflightBlockerSummary(items),
    nextStepSummary: describePreflightNextStepSummary(items),
    items,
  };
}

export function describeDelegation(
  delegation: NapoleonDelegation | undefined,
  targetCapability?: string,
  fallback?: DelegationFallbackProvenance,
): DelegationView {
  const authorityBoundary =
    "Returned bridge provenance only; not approval, memory, dispatch, external send, or local application.";
  const safeTargetCapability = sanitizeVisibleProvenanceValue(targetCapability);
  const targetCapabilityDisplay = displayReturnedTargetCapability(targetCapability, fallback?.targetCapabilityLabel);
  if (!delegation || delegation.selectedAgents.length === 0) {
    if (targetCapability) {
      const safeBlockedEffects = sanitizeVisibleProvenanceList(fallback?.blockedEffects);
      const safeGovernanceState = sanitizeVisibleProvenanceValue(fallback?.governanceState);
      const safeTraceId = sanitizeVisibleProvenanceValue(fallback?.traceId);
      const safeAuditId = sanitizeVisibleProvenanceValue(fallback?.auditId);
      const hasVisibleTargetCapability = safeTargetCapability && safeTargetCapability !== "redacted";
      return {
        heading: "Napoleon target capability",
        body: hasVisibleTargetCapability
          ? `Napoleon returned target capability ${targetCapabilityDisplay}, but did not include selected-agent delegation provenance.`
          : "Napoleon returned target capability metadata, but it was redacted and did not include selected-agent delegation provenance.",
        details: [
          { label: "Handled by", value: targetCapabilityDisplay },
          { label: "Target capability", value: targetCapabilityDisplay },
          { label: "Provenance source", value: "target capability only; selected-agent delegation not returned" },
          { label: "Selected agents", value: "not returned" },
          { label: "Why selected", value: "not returned" },
          { label: "Allowed effects", value: "not returned" },
          { label: "Blocked effects", value: safeBlockedEffects },
          { label: "Governance state", value: safeGovernanceState },
          { label: "Trace", value: safeTraceId },
          { label: "Audit", value: safeAuditId },
          { label: "Authority boundary", value: authorityBoundary },
          {
            label: "Proof alignment",
            value: hasVisibleTargetCapability
              ? "target capability shares returned trace/audit; selected-agent proof not returned"
              : "selected-agent proof not returned",
          },
        ],
      };
    }

    if (fallback?.descriptorConnection && !fallback.descriptorConnection.canAttemptLiveBridge) {
      const connection = fallback.descriptorConnection;
      const failureReason = describeDescriptorFailureReason(connection.failClosedReason) || "none";
      const nextStep = connection.canAttemptLiveBridge
        ? "Ready for returned Napoleon delegation provenance."
        : connection.failClosedReason === "no_endpoint"
          ? "Configure a governed Napoleon endpoint and discover the descriptor before sending."
          : connection.failClosedReason === "descriptor_signature_or_checksum_mismatch"
            ? "Resolve the descriptor signature or checksum mismatch before sending."
            : connection.failClosedReason === "descriptor_stale"
              ? "Refresh the stale descriptor before sending."
              : connection.failClosedReason === "auth_failure"
                ? "Fix descriptor authentication or the bridge token before sending."
                : connection.failClosedReason === "bridge_timeout"
                  ? "Restore descriptor connectivity and rediscover the descriptor before sending."
                  : connection.failClosedReason === "http_failure"
                    ? "Resolve the descriptor HTTP failure and rediscover the descriptor before sending."
                    : "Discover a valid Napoleon descriptor before sending.";
      return {
        heading: "Napoleon delegation",
        body: connection.canAttemptLiveBridge
          ? "No Napoleon delegation provenance has been returned yet. Concierge will wait for governed bridge provenance before naming capabilities or agents."
          : "Napoleon delegation is blocked until descriptor discovery is valid. Concierge will not attribute the answer to a capability or agent.",
        details: [
          { label: "Handled by", value: "not returned" },
          { label: "Target capability", value: "not returned" },
          { label: "Provenance source", value: "not returned" },
          { label: "Selected agents", value: "not returned" },
          { label: "Why selected", value: "not returned" },
          { label: "Allowed effects", value: "not returned" },
          {
            label: "Blocked effects",
            value: connection.descriptorStatus
              ? sanitizeVisibleProvenanceList(connection.descriptorStatus.blockedEffects)
              : "memory_write, approval_capture, agent_dispatch, external_send",
          },
          { label: "Governance state", value: "not returned" },
          { label: "Trace", value: "not returned" },
          { label: "Audit", value: "not returned" },
          { label: "Connection state", value: sanitizeVisibleProvenanceValue(connection.state) },
          { label: "Descriptor failure", value: failureReason },
          { label: "Next step", value: nextStep },
          { label: "Authority boundary", value: authorityBoundary },
          { label: "Proof alignment", value: "not returned" },
        ],
      };
    }

    if (fallback?.failure) {
      const failure = fallback.failure;
      const safeBlockedEffects = sanitizeVisibleProvenanceList(failure.blockedEffects);
      const safeTraceId = sanitizeVisibleProvenanceValue(failure.traceId);
      const safeGovernanceState = sanitizeVisibleProvenanceValue(failure.governanceOutcome);
      const descriptorFailure = describeDescriptorFailureReason(failure.descriptorFailureReason) || "not returned";
      return {
        heading: "Napoleon delegation",
        body:
          "Napoleon bridge failed closed before delegation provenance could be accepted. Concierge will not attribute the answer to a capability or agent.",
        details: [
          { label: "Handled by", value: "not returned" },
          { label: "Target capability", value: "not returned" },
          { label: "Provenance source", value: "not returned" },
          { label: "Selected agents", value: "not returned" },
          { label: "Why selected", value: "not returned" },
          { label: "Allowed effects", value: "not returned" },
          { label: "Blocked effects", value: safeBlockedEffects },
          { label: "Governance state", value: safeGovernanceState },
          { label: "Trace", value: safeTraceId },
          { label: "Audit", value: "not returned" },
          { label: "Failure reason", value: sanitizeVisibleProvenanceValue(failure.reason) },
          { label: "Descriptor failure", value: descriptorFailure },
          { label: "Next step", value: sanitizeVisibleProvenanceValue(failure.nextStep) },
          { label: "Authority boundary", value: authorityBoundary },
          { label: "Proof alignment", value: "not returned; bridge failed closed before response proof was accepted" },
        ],
      };
    }

    if (fallback?.descriptorConnection) {
      const connection = fallback.descriptorConnection;
      return {
        heading: "Napoleon delegation",
        body:
          "No Napoleon delegation provenance has been returned yet. Concierge will wait for governed bridge provenance before naming capabilities or agents.",
        details: [
          { label: "Handled by", value: "not returned" },
          { label: "Target capability", value: "not returned" },
          { label: "Provenance source", value: "not returned" },
          { label: "Selected agents", value: "not returned" },
          { label: "Why selected", value: "not returned" },
          { label: "Allowed effects", value: "not returned" },
          {
            label: "Blocked effects",
            value: connection.descriptorStatus
              ? sanitizeVisibleProvenanceList(connection.descriptorStatus.blockedEffects)
              : "memory_write, approval_capture, agent_dispatch, external_send",
          },
          { label: "Governance state", value: "not returned" },
          { label: "Trace", value: "not returned" },
          { label: "Audit", value: "not returned" },
          { label: "Connection state", value: sanitizeVisibleProvenanceValue(connection.state) },
          { label: "Descriptor failure", value: "none" },
          { label: "Next step", value: "Ready for returned Napoleon delegation provenance." },
          { label: "Authority boundary", value: authorityBoundary },
          { label: "Proof alignment", value: "not returned" },
        ],
      };
    }

    return {
      heading: "Napoleon delegation",
      body: "No Napoleon delegation provenance was returned, so Concierge will not attribute the answer to a capability or agent.",
      details: [
        { label: "Handled by", value: "not returned" },
        { label: "Target capability", value: "not returned" },
        { label: "Provenance source", value: "not returned" },
        { label: "Selected agents", value: "not returned" },
        { label: "Why selected", value: "not returned" },
        { label: "Allowed effects", value: "not returned" },
        { label: "Blocked effects", value: "not returned" },
        { label: "Governance state", value: "not returned" },
        { label: "Trace", value: "not returned" },
        { label: "Audit", value: "not returned" },
        { label: "Authority boundary", value: "not returned" },
        { label: "Proof alignment", value: "not returned" },
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
  const handledByAgents = delegation.selectedAgents
    .map((agent) => sanitizeVisibleProvenanceValue(agent.displayName))
    .join(", ");
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
    .map((agent) => {
      const displayName = sanitizeVisibleProvenanceValue(agent.displayName, "");
      const summary = sanitizeVisibleProvenanceValue(agent.contributionSummary, "");
      const normalizedSummary = summary.replace(/^found\b\s*/i, "");
      return displayName && displayName !== "redacted" && normalizedSummary && normalizedSummary !== "redacted"
        ? `${displayName} found ${normalizedSummary}.`
        : "";
    })
    .filter(Boolean)
    .join(" ");

  return {
    heading: "Napoleon delegation",
    body: contribution || "Napoleon provided delegation provenance for this response.",
    details: [
      { label: "Handled by", value: handledByAgents || targetCapabilityDisplay || "not returned" },
      { label: "Target capability", value: targetCapabilityDisplay },
      { label: "Provenance source", value: "returned bridge delegation; not local metadata discovery" },
      { label: "Selected agents", value: agentLabels },
      { label: "Why selected", value: selectionReasons },
      { label: "Allowed effects", value: sanitizeVisibleProvenanceList(delegation.allowedEffects) },
      { label: "Blocked effects", value: sanitizeVisibleProvenanceList(delegation.blockedEffects) },
      { label: "Governance state", value: sanitizeVisibleProvenanceValue(delegation.governanceState) },
      { label: "Trace", value: sanitizeVisibleProvenanceValue(delegation.traceId) },
      { label: "Audit", value: sanitizeVisibleProvenanceValue(delegation.auditId) },
      { label: "Authority boundary", value: authorityBoundary },
      {
        label: "Proof alignment",
        value: "same returned trace/audit as Napoleon response proof; not imported readiness proof",
      },
    ],
  };
}

export function describeNapoleonResponseProof(
  response: NapoleonResponse,
  labels: NapoleonResponsePresentationLabels = {},
): NapoleonResponseProofView {
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
  const returnedTargetCapability = response.targetAgent
    ? sanitizeVisibleProvenanceValue(response.targetAgent, "")
    : "";
  const targetCapability = returnedTargetCapability === "redacted" ? "" : returnedTargetCapability;
  const targetCapabilityDisplay = targetCapability ? displayReturnedTargetCapability(targetCapability, labels.targetCapabilityLabel) : "";
  const returnedRecommendation = response.recommendationProvenance?.summary
    ? sanitizeVisibleProvenanceValue(response.recommendationProvenance.summary, "")
    : undefined;
  const recommendation = returnedRecommendation === "redacted" ? undefined : returnedRecommendation;
  const status: NapoleonResponseProofView["status"] = agentLabels || targetCapability || recommendation ? "verified" : "limited";
  const proofAlignment = agentLabels
    ? "same returned trace/audit as Napoleon response proof"
    : targetCapabilityDisplay
      ? "target capability shares returned trace/audit; selected-agent proof not returned"
      : "not returned";
  const proofParts = [
    targetCapabilityDisplay ? `Capability: ${targetCapabilityDisplay}` : "",
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
      { label: "Governance", value: sanitizeVisibleProvenanceValue(response.governanceDecision.outcome) },
      { label: "Profile mode", value: sanitizeVisibleProvenanceValue(response.profileMode) },
      { label: "Decision", value: sanitizeVisibleProvenanceValue(response.governanceDecision.decision_id) },
      { label: "Trace", value: sanitizeVisibleProvenanceValue(response.traceEnvelope.trace_id) },
      { label: "Audit", value: sanitizeVisibleProvenanceValue(response.auditEnvelope.audit_id) },
      { label: "Attribution boundary", value: "Returned bridge provenance only; not local authority." },
      {
        label: "Handled by",
        value: agentLabels || targetCapabilityDisplay || "not returned",
      },
      {
        label: "Target capability",
        value: returnedTargetCapability === "redacted" ? "redacted metadata" : targetCapabilityDisplay || "not returned",
      },
      { label: "Selected agents", value: agentLabels || "not returned" },
      { label: "Why selected", value: selectionReasons || "not returned" },
      {
        label: "Napoleon recommendation",
        value: returnedRecommendation === "redacted" ? "redacted metadata" : recommendation || "not returned",
      },
      {
        label: "Recommendation proof alignment",
        value: recommendation ? "same returned trace/audit as Napoleon response proof" : "not returned",
      },
      {
        label: "Proof alignment",
        value: proofAlignment,
      },
      {
        label: "Capability or agents",
        value: agentLabels || targetCapabilityDisplay || "No selected-agent provenance returned",
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

function proofDetailValue(proof: NapoleonResponseProofView, label: string, fallback = "not returned"): string {
  return proof.details.find((detail) => detail.label === label)?.value || fallback;
}

function timelineDetailValue(
  view: Pick<LastNapoleonTurnSummaryView, "details">,
  label: string,
  fallback = "not returned",
): string {
  return view.details.find((detail) => detail.label === label)?.value || fallback;
}

export function describeLastNapoleonTurnSummary(
  proof: NapoleonResponseProofView | null | undefined,
  failure?: LastNapoleonTurnFailureInput | null,
): LastNapoleonTurnSummaryView {
  const caveat =
    "Local returned-provenance summary only; not approval, memory permission, agent dispatch, external send, or local application.";

  if (failure) {
    const reason = sanitizeVisibleProvenanceValue(failure.reason);
    const governance = sanitizeVisibleProvenanceValue(failure.governanceOutcome);
    const descriptor = describeDescriptorFailureReason(failure.descriptorFailureReason) || "not returned";
    const blockedEffects = sanitizeVisibleProvenanceList(failure.blockedEffects);
    const trace = visibleReferenceValue(failure.traceId);
    const nextStep = sanitizeVisibleProvenanceValue(failure.nextStep);

    return {
      heading: "Latest Napoleon turn",
      status: "blocked",
      summary: `Blocked by ${reason}; governance ${governance}.`,
      caveat,
      details: [
        { label: "Handled by", value: "not accepted" },
        { label: "Governance", value: governance },
        { label: "Trace", value: trace },
        { label: "Blocked effects", value: blockedEffects },
        { label: "Boundary", value: "No Napoleon response was accepted; fail-closed local state only." },
        { label: "Attribution source", value: "fail-closed bridge metadata; no accepted delegation attribution" },
        { label: "Proof alignment", value: "not returned; bridge failed closed before response proof was accepted" },
        { label: "Failure reason", value: reason },
        { label: "Descriptor", value: descriptor },
        { label: "Next step", value: nextStep },
      ],
    };
  }

  if (!proof) {
    return {
      heading: "Latest Napoleon turn",
      status: "not_available",
      summary: "No successful Napoleon turn has returned proof in this session.",
      caveat,
      details: [
        { label: "Handled by", value: "not returned" },
        { label: "Governance", value: "not returned" },
        { label: "Trace", value: "not returned" },
        { label: "Blocked effects", value: "not returned" },
        { label: "Boundary", value: "not returned" },
        { label: "Attribution source", value: "not returned" },
        { label: "Proof alignment", value: "not returned" },
      ],
    };
  }

  const handledBy = proofDetailValue(proof, "Handled by");
  const governance = proofDetailValue(proof, "Governance");
  const recommendationProofAlignment = proofDetailValue(proof, "Recommendation proof alignment");
  const proofAlignment = proofDetailValue(
    proof,
    "Proof alignment",
    recommendationProofAlignment !== "not returned" ? recommendationProofAlignment : "not returned",
  );

  return {
    heading: "Latest Napoleon turn",
    status: "available",
    summary: `Handled by ${handledBy}; governance ${governance}.`,
    caveat,
    details: [
      { label: "Handled by", value: handledBy },
      { label: "Governance", value: governance },
      { label: "Trace", value: proofDetailValue(proof, "Trace") },
      { label: "Blocked effects", value: proofDetailValue(proof, "Blocked effects") },
      { label: "Boundary", value: proofDetailValue(proof, "Attribution boundary") },
      { label: "Attribution source", value: "accepted Napoleon bridge response proof" },
      { label: "Proof alignment", value: proofAlignment },
    ],
  };
}

export function describeNapoleonTurnTimeline(
  proof: NapoleonResponseProofView | null | undefined,
  failure?: LastNapoleonTurnFailureInput | null,
  preflight?: LiveSendPreflightView | null,
): NapoleonTurnTimelineView {
  const successful = describeLastNapoleonTurnSummary(proof, null);
  const blocked = failure
    ? describeLastNapoleonTurnSummary(null, failure)
    : {
        heading: "Latest Napoleon turn",
        status: "not_available" as const,
        summary: "No fail-closed Napoleon bridge attempt has been recorded in this session.",
        caveat:
          "Local returned-provenance summary only; not approval, memory permission, agent dispatch, external send, or local application.",
        details: [
          { label: "Handled by", value: "not returned" },
          { label: "Governance", value: "not returned" },
          { label: "Trace", value: "not returned" },
          { label: "Blocked effects", value: "not returned" },
          { label: "Boundary", value: "not returned" },
          { label: "Attribution source", value: "not returned" },
          { label: "Proof alignment", value: "not returned" },
          { label: "Failure reason", value: "not returned" },
          { label: "Descriptor", value: "not returned" },
          { label: "Next step", value: "not returned" },
        ],
      };
  const hasEntries = Boolean(proof || failure);
  const comparison = failure
    ? [
        {
          label: "Why blocked",
          value: `${timelineDetailValue(blocked, "Failure reason")}; ${timelineDetailValue(blocked, "Boundary")}`,
        },
        {
          label: "Prior accepted handler",
          value: timelineDetailValue(successful, "Handled by"),
        },
        {
          label: "Governance change",
          value: `${timelineDetailValue(successful, "Governance")} -> ${timelineDetailValue(blocked, "Governance")}`,
        },
        {
          label: "Trace change",
          value: `${timelineDetailValue(successful, "Trace")} -> ${timelineDetailValue(blocked, "Trace")}`,
        },
        {
          label: "Blocked effects now",
          value: timelineDetailValue(blocked, "Blocked effects"),
        },
        {
          label: "Retry preflight",
          value: preflight
            ? `${preflight.blockerSummary} ${preflight.nextStepSummary}`
            : "Live-send preflight has not been evaluated for this local view.",
        },
        {
          label: "Next step",
          value: timelineDetailValue(blocked, "Next step"),
        },
      ]
    : [
        {
          label: "Why blocked",
          value: "No fail-closed Napoleon bridge attempt has been recorded in this session.",
        },
        {
          label: "Prior accepted handler",
          value: timelineDetailValue(successful, "Handled by"),
        },
        {
          label: "Next step",
          value: proof
            ? "Continue from the latest accepted returned proof, or inspect preflight before sending again."
            : "Send through the governed bridge after descriptor and preflight readiness pass.",
        },
        {
          label: "Retry preflight",
          value: preflight
            ? `${preflight.blockerSummary} ${preflight.nextStepSummary}`
            : "Live-send preflight has not been evaluated for this local view.",
        },
      ];

  return {
    heading: "Napoleon turn timeline",
    status: hasEntries ? "has_entries" : "empty",
    summary: hasEntries
      ? "Compares the latest accepted Napoleon response with the latest fail-closed bridge attempt."
      : "No accepted or fail-closed Napoleon turn state has been recorded in this session.",
    caveat:
      "Local display metadata only; not approval, memory permission, agent dispatch, external send, or local application.",
    entries: [
      {
        label: "Latest successful response",
        status: successful.status,
        summary: successful.summary,
        details: successful.details,
      },
      {
        label: "Latest blocked attempt",
        status: blocked.status,
        summary: blocked.summary,
        details: blocked.details,
      },
    ],
    comparison,
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
  const artifactLabel = input.artifactLabel ?? "Review draft";
  const artifactReadyDetail = input.artifactReadyDetail ?? "A proposal-only review draft is available.";
  const artifactBlockedDetail = input.artifactBlockedDetail ?? "Create a review draft before handoff.";
  const items: LiveSendPreflightItem[] = [
    {
      label: artifactLabel,
      status: input.draftReady ? "ready" : "blocked",
      detail: input.draftReady ? artifactReadyDetail : artifactBlockedDetail,
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
  const blockedItem = items.find((item) => item.status === "blocked");
  const descriptorFailureReason = describeDescriptorFailureReason(descriptor.failClosedReason);
  const descriptorFailureNextStep =
    descriptor.failClosedReason === "no_endpoint"
      ? "Next step: add the governed Napoleon endpoint in settings, then refresh descriptor discovery."
      : descriptor.failClosedReason === "no_descriptor"
        ? "Next step: run descriptor discovery for the configured Napoleon endpoint before attempting the governed handoff."
        : descriptor.failClosedReason === "descriptor_signature_or_checksum_mismatch"
          ? "Next step: resolve the descriptor signature or checksum mismatch, then refresh descriptor discovery."
          : descriptor.failClosedReason === "descriptor_stale"
            ? "Next step: refresh the stale Napoleon descriptor before attempting the governed handoff."
            : descriptor.failClosedReason === "auth_failure"
              ? "Next step: fix descriptor authentication or the bridge token, then refresh descriptor discovery."
              : descriptor.failClosedReason === "bridge_timeout"
                ? "Next step: restore descriptor connectivity, then refresh descriptor discovery."
                : descriptor.failClosedReason === "http_failure"
                  ? "Next step: resolve the descriptor HTTP failure, then refresh descriptor discovery."
                  : descriptorFailureReason
                    ? `Next step: resolve ${descriptorFailureReason}, then refresh descriptor discovery.`
                    : "Next step: refresh descriptor discovery and resolve any descriptor integrity or transport failure.";
  const nextStepSummary = blockedItem
    ? blockedItem.label === artifactLabel
      ? `Next step: ${artifactBlockedDetail}`
      : blockedItem.label === "Endpoint configured"
        ? "Next step: add the governed Napoleon endpoint in settings, then refresh descriptor discovery."
        : blockedItem.label === "Descriptor preflight"
          ? descriptorFailureNextStep
          : blockedItem.label === "Governed handoff route"
            ? `Next step: use a Napoleon descriptor that advertises ${input.requiredHandoff ?? "the required governed handoff route"}.`
            : blockedItem.label === "Rehearsal Mode"
              ? "Next step: turn Rehearsal Mode off only when you want a separate governed handoff attempt."
              : `Next step: resolve ${blockedItem.label.toLowerCase()} before attempting the governed handoff.`
    : (input.readyNextStepSummary ?? "Next step: submit this proposal-only packet through the governed Napoleon bridge when ready.");

  return {
    heading: `${input.label} readiness`,
    status: canSubmit ? "ready" : "blocked",
    canSubmit,
    summary: canSubmit
      ? `${input.label} can be submitted through the governed bridge for Napoleon review.`
      : `${input.label} is blocked until the ${artifactLabel.toLowerCase()}, endpoint, descriptor preflight, governed handoff route, and Rehearsal Mode state are ready.`,
    nextStepSummary,
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
