import { resolveNapoleonBridgeOperation } from "./bridgeEndpoint.js";
import { hasRequiredBridgeResponseFields } from "./bridgeResponseRequirements.js";
import {
  buildDescriptorConnectionState,
  defaultChiefOfStaffDescriptor,
  mapProfileToNapoleonMode,
  type AuditEnvelope,
  type ChiefOfStaffRequest,
  type DescriptorConnectionInput,
  type GovernanceDecision,
  type GovernanceEvaluationRequest,
  type MemoryProposalReviewState,
  type TraceEnvelope,
} from "./contractBridge.js";
import { NapoleonBridgeError, descriptorFailClosedReasonToBridgeFailure } from "./napoleonBridge.js";
import { emitEvent, makeTelemetryPayload, type TelemetryPayload } from "./telemetry.js";

type MemoryProposalFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}>;

interface MemoryProposalSubmissionDependencies {
  conversationId: string;
  traceId: string;
  rehearsalMode?: boolean;
  getEndpoint?: () => string | null;
  getAuthToken?: () => string | null;
  descriptorConnection?: DescriptorConnectionInput;
  emit?: (payload: TelemetryPayload) => void;
  fetch?: MemoryProposalFetch;
}

export interface MemoryProposalSubmissionResult {
  text: string;
  governanceDecision: GovernanceDecision;
  traceEnvelope: TraceEnvelope;
  auditEnvelope: AuditEnvelope;
  memoryWritePerformed: false;
  approvalCaptured: false;
  agentDispatchPerformed: false;
  externalSendPerformed: false;
}

const MEMORY_PROPOSAL_BOUNDARY = {
  proposalOnly: true,
  approvalCaptured: false,
  memoryWriteAllowed: false,
  agentDispatchAllowed: false,
  externalSendAllowed: false,
} as const;

function emitMemoryProposalEvent(
  dependencies: MemoryProposalSubmissionDependencies,
  event: string,
  attributes: Record<string, unknown>,
) {
  if (dependencies.emit) {
    dependencies.emit(makeTelemetryPayload(event, attributes));
    return;
  }
  emitEvent(event, attributes);
}

function getConfiguredEndpoint(dependencies: MemoryProposalSubmissionDependencies): string | null {
  if (dependencies.getEndpoint) return dependencies.getEndpoint();
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("napoleon_endpoint");
}

function getConfiguredAuthToken(dependencies: MemoryProposalSubmissionDependencies): string | null {
  if (dependencies.getAuthToken) return dependencies.getAuthToken();
  if (dependencies.getEndpoint) return null;
  if (typeof localStorage === "undefined") return null;
  const token = localStorage.getItem("napoleon_auth_token");
  return token?.trim() ? token.trim() : null;
}

function buildMemoryProposalHeaders(authToken: string | null): Record<string, string> {
  return authToken
    ? { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }
    : { "Content-Type": "application/json" };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isGovernanceDecision(value: unknown): value is GovernanceDecision {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GovernanceDecision>;
  return Boolean(
    typeof candidate.decision_id === "string" &&
      typeof candidate.request_id === "string" &&
      typeof candidate.outcome === "string" &&
      typeof candidate.authority_tier === "string" &&
      typeof candidate.approval_requirement === "string" &&
      typeof candidate.rationale === "string" &&
      isStringArray(candidate.blocked_effects) &&
      typeof candidate.trace_id === "string" &&
      typeof candidate.audit_id === "string",
  );
}

function isTraceEnvelope(value: unknown): value is TraceEnvelope {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<TraceEnvelope>;
  return Boolean(
    typeof candidate.trace_id === "string" &&
      typeof candidate.parent_trace_id === "string" &&
      typeof candidate.actor_id === "string" &&
      typeof candidate.request_id === "string" &&
      typeof candidate.decision_id === "string" &&
      typeof candidate.timestamp === "string",
  );
}

function isAuditEnvelope(value: unknown): value is AuditEnvelope {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AuditEnvelope>;
  return Boolean(
    typeof candidate.audit_id === "string" &&
      typeof candidate.trace_id === "string" &&
      typeof candidate.decision_id === "string" &&
      typeof candidate.actor_id === "string" &&
      typeof candidate.authority_tier === "string" &&
      typeof candidate.approval_requirement === "string" &&
      isStringArray(candidate.evidence_links),
  );
}

function envelopesMatchDecision(
  decision: GovernanceDecision,
  traceEnvelope: TraceEnvelope,
  auditEnvelope: AuditEnvelope,
): boolean {
  return (
    traceEnvelope.trace_id === decision.trace_id &&
    traceEnvelope.request_id === decision.request_id &&
    traceEnvelope.decision_id === decision.decision_id &&
    auditEnvelope.audit_id === decision.audit_id &&
    auditEnvelope.trace_id === decision.trace_id &&
    auditEnvelope.decision_id === decision.decision_id &&
    auditEnvelope.authority_tier === decision.authority_tier &&
    auditEnvelope.approval_requirement === decision.approval_requirement
  );
}

function hasForbiddenMemoryProposalSideEffectClaim(
  payload: Partial<MemoryProposalSubmissionResult> & Record<string, unknown>,
): boolean {
  const requiredFalseFields = [
    "memoryWritePerformed",
    "approvalCaptured",
    "externalSendPerformed",
    "agentDispatchPerformed",
  ];
  if (requiredFalseFields.some((field) => payload[field] !== false)) return true;
  return payload.appliedLocally !== undefined && payload.appliedLocally !== false;
}

function failMemoryProposalClosed(
  dependencies: MemoryProposalSubmissionDependencies,
  reason: ConstructorParameters<typeof NapoleonBridgeError>[0],
  traceId: string,
  requestId: string,
  proposalId?: string,
  profileMode?: string,
  status?: number,
  blockedEffects: string[] = [],
): never {
  emitMemoryProposalEvent(dependencies, "memory_proposal_send_failed", {
    traceId,
    conversationId: dependencies.conversationId,
    requestId,
    proposalId,
    profileMode,
    reason,
    status,
    blockedEffects,
  });
  throw new NapoleonBridgeError(reason, traceId, requestId, status, blockedEffects, { profileMode });
}

export async function submitMemoryProposalForReview(
  memoryProposal: MemoryProposalReviewState,
  dependencies: MemoryProposalSubmissionDependencies,
): Promise<MemoryProposalSubmissionResult> {
  const profileMode = mapProfileToNapoleonMode(memoryProposal.profile);
  const requestId = `cos_${dependencies.traceId}`;
  const localDecisionId = `local_memory_${dependencies.traceId}`;
  const localAuditId = `local_audit_${dependencies.traceId}`;
  const endpoint = getConfiguredEndpoint(dependencies);
  const authToken = getConfiguredAuthToken(dependencies);
  const descriptorConnection = buildDescriptorConnectionState(
    dependencies.descriptorConnection ?? {
      endpointConfigured: Boolean(endpoint),
      descriptor: null,
    },
  );
  const blockedEffects = ["memory_write", "approval_capture", "external_send", "agent_dispatch", "runtime_authority"];

  if (dependencies.rehearsalMode) {
    failMemoryProposalClosed(
      dependencies,
      "governance_no_go",
      dependencies.traceId,
      requestId,
      memoryProposal.proposalId,
      profileMode,
      undefined,
      blockedEffects,
    );
  }
  if (!endpoint) {
    failMemoryProposalClosed(
      dependencies,
      "no_endpoint",
      dependencies.traceId,
      requestId,
      memoryProposal.proposalId,
      profileMode,
      undefined,
      blockedEffects,
    );
  }
  if (!descriptorConnection.canAttemptLiveBridge) {
    failMemoryProposalClosed(
      dependencies,
      descriptorFailClosedReasonToBridgeFailure(descriptorConnection.failClosedReason),
      dependencies.traceId,
      requestId,
      memoryProposal.proposalId,
      profileMode,
      undefined,
      blockedEffects,
    );
  }

  const evidenceLinks = [
    `trace:${memoryProposal.traceId}`,
    `audit:${memoryProposal.auditId}`,
    `memory_proposal:${memoryProposal.proposalId}`,
  ];
  const chiefOfStaffRequest: ChiefOfStaffRequest = {
    request_id: requestId,
    requester: "concierge.memory_review",
    request_type: "governance_review",
    profile_mode: profileMode,
    source_evidence: evidenceLinks,
    requested_authority_tier: "advisory_review",
    trace_id: dependencies.traceId,
    payload_schema: "napoleon/concierge/memory-proposal-review/v1",
  };
  const governanceRequest: GovernanceEvaluationRequest = {
    request_id: `gov_${dependencies.traceId}`,
    actor_id: "concierge.memory_review",
    action: "submit_memory_proposal_for_review",
    target: "napoleon.memory",
    requested_authority_tier: "advisory_review",
    evidence_links: evidenceLinks,
    trace_id: dependencies.traceId,
  };
  const traceEnvelope: TraceEnvelope = {
    trace_id: dependencies.traceId,
    parent_trace_id: dependencies.conversationId,
    actor_id: "concierge.memory_review",
    request_id: requestId,
    decision_id: localDecisionId,
    timestamp: new Date().toISOString(),
  };
  const auditEnvelope: AuditEnvelope = {
    audit_id: localAuditId,
    trace_id: dependencies.traceId,
    decision_id: localDecisionId,
    actor_id: "concierge.memory_review",
    authority_tier: "advisory_review",
    approval_requirement: memoryProposal.guardianReviewRequired
      ? "guardian_and_owner_review_before_memory_write"
      : "napoleon_review_before_memory_write",
    evidence_links: evidenceLinks,
  };
  emitMemoryProposalEvent(dependencies, "memory_proposal_send_started", {
    traceId: dependencies.traceId,
    conversationId: dependencies.conversationId,
    requestId,
    proposalId: memoryProposal.proposalId,
    profileMode,
  });

  const targetEndpoint = resolveNapoleonBridgeOperation(endpoint, "memory_proposal_review");
  const fetcher = dependencies.fetch ?? globalThis.fetch.bind(globalThis);
  let response: Awaited<ReturnType<MemoryProposalFetch>>;
  try {
    response = await fetcher(targetEndpoint, {
      method: "POST",
      headers: buildMemoryProposalHeaders(authToken),
      body: JSON.stringify({
        requestKind: "memory_proposal_review_handoff",
        profileMode,
        descriptorStatus: descriptorConnection.descriptorStatus,
        descriptorConnection,
        chiefOfStaffRequest,
        governanceRequest,
        traceEnvelope,
        auditEnvelope,
        memoryProposal,
        boundary: MEMORY_PROPOSAL_BOUNDARY,
        blockedEffects,
      }),
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError" ? "bridge_timeout" : "http_failure";
    failMemoryProposalClosed(
      dependencies,
      reason,
      dependencies.traceId,
      requestId,
      memoryProposal.proposalId,
      profileMode,
      undefined,
      blockedEffects,
    );
  }

  if (!response.ok) {
    const reason = response.status === 401 || response.status === 403 ? "auth_failure" : "http_failure";
    failMemoryProposalClosed(
      dependencies,
      reason,
      dependencies.traceId,
      requestId,
      memoryProposal.proposalId,
      profileMode,
      response.status,
      blockedEffects,
    );
  }

  let payload: Partial<MemoryProposalSubmissionResult>;
  try {
    payload = (await response.json()) as Partial<MemoryProposalSubmissionResult>;
  } catch {
    failMemoryProposalClosed(
      dependencies,
      "contract_mismatch",
      dependencies.traceId,
      requestId,
      memoryProposal.proposalId,
      profileMode,
      undefined,
      blockedEffects,
    );
  }
  if (
    !hasRequiredBridgeResponseFields(payload, "memory_proposal_review") ||
    !isGovernanceDecision(payload.governanceDecision) ||
    !isTraceEnvelope(payload.traceEnvelope) ||
    !isAuditEnvelope(payload.auditEnvelope) ||
    !envelopesMatchDecision(payload.governanceDecision, payload.traceEnvelope, payload.auditEnvelope) ||
    hasForbiddenMemoryProposalSideEffectClaim(payload as Partial<MemoryProposalSubmissionResult> & Record<string, unknown>)
  ) {
    failMemoryProposalClosed(
      dependencies,
      "contract_mismatch",
      dependencies.traceId,
      requestId,
      memoryProposal.proposalId,
      profileMode,
      undefined,
      blockedEffects,
    );
  }

  if (payload.governanceDecision.outcome === "deny" || payload.governanceDecision.outcome === "no_go") {
    failMemoryProposalClosed(
      dependencies,
      payload.governanceDecision.outcome === "deny" ? "governance_denied" : "governance_no_go",
      dependencies.traceId,
      payload.governanceDecision.request_id,
      memoryProposal.proposalId,
      profileMode,
      response.status,
      payload.governanceDecision.blocked_effects,
    );
  }

  emitMemoryProposalEvent(dependencies, "memory_proposal_send_completed", {
    traceId: dependencies.traceId,
    conversationId: dependencies.conversationId,
    requestId,
    proposalId: memoryProposal.proposalId,
    decisionId: payload.governanceDecision.decision_id,
    auditId: payload.auditEnvelope.audit_id,
    outcome: payload.governanceDecision.outcome,
    memoryWritePerformed: false,
    approvalCaptured: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
  });

  return {
    text: payload.text ?? "Napoleon accepted the memory proposal for governed review.",
    governanceDecision: payload.governanceDecision,
    traceEnvelope: payload.traceEnvelope,
    auditEnvelope: payload.auditEnvelope,
    memoryWritePerformed: false,
    approvalCaptured: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
  };
}
