import type {
  DescriptorConnectionState,
  GovernanceOutcome,
  GovernanceReviewState,
  MemoryProposalReviewState,
  RehearsalPreview,
} from "./contractBridge.js";
import type { NapoleonDelegation } from "./types.js";
import { NapoleonBridgeError } from "./napoleonBridge.js";

export interface GovernanceDecisionViewInput {
  outcome: GovernanceOutcome;
  decisionId: string;
  auditId: string;
  blockedEffects: string[];
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

export interface DelegationView {
  heading: string;
  body: string;
  details: Array<{ label: string; value: string }>;
}

export type LiveBridgeEvidenceState = "not_run" | "passed" | "failed";

export interface LiveBridgeReadinessInput {
  descriptorConnection: DescriptorConnectionState;
  evidenceCaptureState?: LiveBridgeEvidenceState;
  evidenceComparisonState?: LiveBridgeEvidenceState;
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

export function describeBridgeFailure(error: unknown): string {
  if (!(error instanceof NapoleonBridgeError)) {
    return "Napoleon bridge failed closed. Concierge did not send externally, did not write memory, did not dispatch agents, and did not capture approval.";
  }

  const blockedEffects = error.blockedEffects.length
    ? ` Blocked effects: ${error.blockedEffects.join(", ")}.`
    : "";
  return `Live Napoleon bridge blocked: ${error.reason}. Request ${error.requestId}, trace ${error.traceId}.${blockedEffects} Concierge did not send externally, did not write memory, did not dispatch agents, and did not capture approval.`;
}

export function describeBridgeFailureTranscriptMessage(error: unknown): string {
  if (!(error instanceof NapoleonBridgeError)) {
    return "Napoleon bridge failed closed. Concierge did not execute anything and remains in prepare-only mode.";
  }

  const blockedEffects = error.blockedEffects.length
    ? ` Blocked effects: ${error.blockedEffects.join(", ")}.`
    : "";
  return `Napoleon bridge blocked: ${error.reason}.${blockedEffects} Concierge did not execute anything and remains in prepare-only mode.`;
}

export function describeGovernedHandoffFailure(error: unknown, label: string, primaryEffect: string): string {
  if (!(error instanceof NapoleonBridgeError)) {
    return `${label} failed closed. Concierge did not ${primaryEffect}, did not write memory, did not dispatch agents, did not send externally, and did not capture approval.`;
  }

  const blockedEffects = error.blockedEffects.length
    ? ` Blocked effects: ${error.blockedEffects.join(", ")}.`
    : "";
  return `${label} blocked: ${error.reason}. Request ${error.requestId}, trace ${error.traceId}.${blockedEffects} Concierge did not ${primaryEffect}, did not write memory, did not dispatch agents, did not send externally, and did not capture approval.`;
}

function describeEvidenceState(state: LiveBridgeEvidenceState | undefined): string {
  if (state === "passed") return "Passed in local validation";
  if (state === "failed") return "Failed in local validation";
  return "Not run in this UI session";
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
  const integrityMismatch =
    descriptor.failClosedReason === "descriptor_signature_or_checksum_mismatch" ||
    descriptor.checksumState === "mismatch" ||
    descriptor.signatureState === "invalid";
  const evidenceFailed = evidenceCapture === "failed" || evidenceComparison === "failed";
  const evidencePending = evidenceCapture !== "passed" || evidenceComparison !== "passed";
  const canSendLive = descriptor.canAttemptLiveBridge && !evidenceFailed;
  const status: LiveBridgeReadinessView["status"] = !canSendLive
    ? "blocked"
    : evidencePending
      ? "warning"
      : "ready";

  let summary: string;
  if (!descriptor.canAttemptLiveBridge) {
    if (descriptor.failClosedReason === "no_endpoint") {
      summary = "No Napoleon endpoint is configured, so Concierge is blocked from live bridge sends.";
    } else if (integrityMismatch) {
      summary = "Napoleon descriptor signature or checksum mismatch detected; Concierge is fail-closed.";
    } else if (descriptor.failClosedReason === "no_descriptor") {
      summary = "Napoleon descriptor is missing, so Concierge is blocked from live bridge sends.";
    } else {
      summary = "Napoleon descriptor is invalid or grants authority, so Concierge is blocked from live bridge sends.";
    }
  } else if (evidenceFailed) {
    summary = "Local bridge evidence validation failed; Concierge should stay in rehearsal or review mode.";
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
      { label: "Live send", value: canSendLive ? "governed bridge allowed" : "blocked" },
    ],
  };
}

export function describeDelegation(delegation: NapoleonDelegation | undefined): DelegationView {
  if (!delegation || delegation.selectedAgents.length === 0) {
    return {
      heading: "Napoleon delegation unavailable",
      body: "No Napoleon delegation provenance was included with this response, so Concierge will not attribute the answer to a capability or agent.",
      details: [],
    };
  }

  const agentLabels = delegation.selectedAgents
    .map((agent) => `${agent.displayName} (${agent.agentId}): ${agent.selectionReason}`)
    .join("; ");
  const contribution = delegation.selectedAgents
    .filter((agent) => agent.contributionSummary)
    .map((agent) => `${agent.displayName} found ${agent.contributionSummary}.`)
    .join(" ");

  return {
    heading: "Napoleon delegation",
    body: contribution || "Napoleon provided delegation provenance for this response.",
    details: [
      { label: "Selected agents", value: agentLabels },
      { label: "Allowed effects", value: delegation.allowedEffects.join(", ") },
      { label: "Blocked effects", value: delegation.blockedEffects.join(", ") },
      { label: "Governance state", value: delegation.governanceState },
      { label: "Trace", value: delegation.traceId },
      { label: "Audit", value: delegation.auditId },
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
