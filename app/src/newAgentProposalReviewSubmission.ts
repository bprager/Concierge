import { getNapoleonReviewOperation, buildNewAgentProposalReviewBridgeTarget } from "./bridgeOperations.js";
import { hasUnsafeReturnedProofIdentifier } from "./bridgeProofValidation.js";
import { hasForbiddenSideEffectTextClaim } from "./bridgeSideEffectClaims.js";
import { readConfiguredAuthTokenFromStorage, readConfiguredEndpointFromStorage } from "./connectionStorage.js";
import {
  buildDescriptorConnectionState,
  descriptorSupportsGovernedHandoff,
  mapProfileToNapoleonMode,
  type AuditEnvelope,
  type ChiefOfStaffRequest,
  type DescriptorConnectionInput,
  type DescriptorFailClosedReason,
  type GovernanceDecision,
  type GovernanceEvaluationRequest,
  type LocalProfile,
  type NapoleonProfileMode,
  type TraceEnvelope,
} from "./contractBridge.js";
import type { ExportedCapabilityReviewPacket } from "./capabilityLedger.js";
import { NapoleonBridgeError, descriptorFailClosedReasonToBridgeFailure } from "./napoleonBridge.js";
import { emitEvent, makeTelemetryPayload, type TelemetryPayload } from "./telemetry.js";

type NewAgentProposalReviewFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}>;

export interface NewAgentProposalReviewPacket {
  schemaVersion: "concierge.new-agent-proposal-review.v1";
  requestKind: "new_agent_proposal_review_handoff";
  bridgeTargetPath: "/chief-of-staff/reviews/new-agent-proposals";
  bridgeTargetOperation: "new_agent_proposal_review";
  bridgeTargetRequestKind: "new_agent_proposal_review_handoff";
  proposalId: string;
  profileMode: NapoleonProfileMode;
  proposedAgent: {
    agentId: string;
    displayName: string;
    lifecycleStatus: "draft";
    owner: "napoleon";
    capability: string;
    architectureArea: string;
    inputModes: ["text"];
    outputModes: ["text"];
    authorityTier: "advisory_review";
    activationRequested: false;
    registryUpdateRequested: false;
  };
  rationale: string;
  sourceEvidence: string[];
  evaluatorCaseCandidate: {
    caseId: string;
    expectedBehavior: string;
  };
  boundary: {
    proposalOnly: true;
    activationRequested: false;
    registryUpdateRequested: false;
    registryUpdatePerformed: false;
    agentActivated: false;
    approvalCaptured: false;
    memoryWritePerformed: false;
    agentDispatchPerformed: false;
    externalSendPerformed: false;
    appliedLocally: false;
  };
  blockedEffects: string[];
}

interface NewAgentProposalReviewSubmissionDependencies {
  conversationId: string;
  traceId: string;
  profile?: LocalProfile;
  rehearsalMode?: boolean;
  getEndpoint?: () => string | null;
  getAuthToken?: () => string | null;
  descriptorConnection?: DescriptorConnectionInput;
  emit?: (payload: TelemetryPayload) => void;
  fetch?: NewAgentProposalReviewFetch;
}

export interface NewAgentProposalReviewSubmissionResult {
  text: string;
  governanceDecision: GovernanceDecision;
  traceEnvelope: TraceEnvelope;
  auditEnvelope: AuditEnvelope;
  appliedLocally: false;
  memoryWritePerformed: false;
  approvalCaptured: false;
  agentDispatchPerformed: false;
  externalSendPerformed: false;
  registryUpdatePerformed: false;
  agentActivated: false;
}

interface NewAgentProposalTargetMetadata {
  bridgeTargetPath: string;
  bridgeTargetOperation: string;
  bridgeTargetRequestKind: string;
}

const NEW_AGENT_PROPOSAL_BLOCKED_EFFECTS = [
  "agent_activation",
  "registry_update",
  "agent_dispatch",
  "approval_capture",
  "memory_write",
  "external_send",
  "runtime_authority",
] as const;

function safeIdentifier(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return normalized || "capability";
}

function safeText(value: string, fallback: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return (trimmed || fallback).slice(0, 240);
}

function normalizeProfileMode(profile: LocalProfile | NapoleonProfileMode | undefined): NapoleonProfileMode {
  if (!profile) return "adult_owner";
  if (profile === "child_protected") return "child_protected_user";
  return profile;
}

export function buildNewAgentProposalReviewPacket(
  capabilityReviewPacket: ExportedCapabilityReviewPacket,
  options: { profile?: LocalProfile | NapoleonProfileMode; traceId: string },
): NewAgentProposalReviewPacket {
  const target = getNapoleonReviewOperation("new_agent_proposal_review");
  const profileMode = normalizeProfileMode(options.profile);
  const capability = safeText(capabilityReviewPacket.reviewFocus.capabilityLabel, "proposed capability");
  const architectureArea = safeText(capabilityReviewPacket.reviewFocus.architectureArea, "unknown");
  const capabilityId = safeIdentifier(capability);
  const evidence = capabilityReviewPacket.reviewFocus.evidenceRefs.length
    ? capabilityReviewPacket.reviewFocus.evidenceRefs.slice(0, 8)
    : capabilityReviewPacket.evolutionProposalDraft.evidence.slice(0, 8);

  return {
    schemaVersion: "concierge.new-agent-proposal-review.v1",
    requestKind: "new_agent_proposal_review_handoff",
    bridgeTargetPath: target.path as "/chief-of-staff/reviews/new-agent-proposals",
    bridgeTargetOperation: target.id as "new_agent_proposal_review",
    bridgeTargetRequestKind: target.requestKind as "new_agent_proposal_review_handoff",
    proposalId: `new_agent_${capabilityId}_${options.traceId}`,
    profileMode,
    proposedAgent: {
      agentId: `napoleon.proposed.${capabilityId}`,
      displayName: `Proposed ${capability}`,
      lifecycleStatus: "draft",
      owner: "napoleon",
      capability,
      architectureArea,
      inputModes: ["text"],
      outputModes: ["text"],
      authorityTier: "advisory_review",
      activationRequested: false,
      registryUpdateRequested: false,
    },
    rationale: safeText(
      capabilityReviewPacket.evolutionProposalDraft.summary,
      `Review whether Napoleon should create or map an agent for ${capability}.`,
    ),
    sourceEvidence: evidence,
    evaluatorCaseCandidate: {
      caseId: capabilityReviewPacket.evaluatorCaseCandidate.caseId,
      expectedBehavior:
        "Concierge may propose a draft agent for Napoleon review, but must not activate it, update the registry, dispatch agents, or capture approval locally.",
    },
    boundary: {
      proposalOnly: true,
      activationRequested: false,
      registryUpdateRequested: false,
      registryUpdatePerformed: false,
      agentActivated: false,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      appliedLocally: false,
    },
    blockedEffects: [...NEW_AGENT_PROPOSAL_BLOCKED_EFFECTS],
  };
}

function emitNewAgentProposalEvent(
  dependencies: NewAgentProposalReviewSubmissionDependencies,
  event: string,
  attributes: Record<string, unknown>,
) {
  if (dependencies.emit) {
    dependencies.emit(makeTelemetryPayload(event, attributes));
    return;
  }
  emitEvent(event, attributes);
}

function getConfiguredEndpoint(dependencies: NewAgentProposalReviewSubmissionDependencies): string | null {
  if (dependencies.getEndpoint) return dependencies.getEndpoint();
  return readConfiguredEndpointFromStorage();
}

function getConfiguredAuthToken(dependencies: NewAgentProposalReviewSubmissionDependencies): string | null {
  if (dependencies.getAuthToken) return dependencies.getAuthToken();
  if (dependencies.getEndpoint) return null;
  return readConfiguredAuthTokenFromStorage();
}

function buildHeaders(authToken: string | null): Record<string, string> {
  return authToken ? { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` } : { "Content-Type": "application/json" };
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

function hasRequiredNewAgentReviewResponseFields(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  return getNapoleonReviewOperation("new_agent_proposal_review").responseRequired.every(
    (field) => record[field] !== undefined,
  );
}

function hasForbiddenNewAgentProposalSideEffectClaim(
  payload: Partial<NewAgentProposalReviewSubmissionResult> & Record<string, unknown>,
): boolean {
  const requiredFalseFields = [
    "appliedLocally",
    "memoryWritePerformed",
    "approvalCaptured",
    "externalSendPerformed",
    "agentDispatchPerformed",
  ];
  if (requiredFalseFields.some((field) => payload[field] !== false)) return true;
  const record = payload as Record<string, unknown>;
  if (record.registryUpdatePerformed === true || record.registryUpdated === true) return true;
  if (record.agentActivated === true || record.agentActivationPerformed === true) return true;
  return hasForbiddenSideEffectTextClaim(payload.text);
}

function failClosed(
  dependencies: NewAgentProposalReviewSubmissionDependencies,
  reason: ConstructorParameters<typeof NapoleonBridgeError>[0],
  packet: NewAgentProposalReviewPacket,
  requestId: string,
  status?: number,
  descriptorFailureReason?: DescriptorFailClosedReason,
  governanceReferences?: { decisionId?: string; auditId?: string; governanceOutcome?: string },
  targetMetadata?: NewAgentProposalTargetMetadata,
): never {
  emitNewAgentProposalEvent(dependencies, "new_agent_proposal_review_send_failed", {
    traceId: dependencies.traceId,
    conversationId: dependencies.conversationId,
    requestId,
    proposalId: packet.proposalId,
    proposedAgentId: packet.proposedAgent.agentId,
    profileMode: packet.profileMode,
    reason,
    status,
    descriptorFailureReason,
    decisionId: governanceReferences?.decisionId,
    auditId: governanceReferences?.auditId,
    governanceOutcome: governanceReferences?.governanceOutcome,
    blockedEffects: packet.blockedEffects,
    ...targetMetadata,
  });
  throw new NapoleonBridgeError(reason, dependencies.traceId, requestId, status, packet.blockedEffects, {
    profileMode: packet.profileMode,
    descriptorFailureReason,
    decisionId: governanceReferences?.decisionId,
    auditId: governanceReferences?.auditId,
    governanceOutcome: governanceReferences?.governanceOutcome,
  });
}

export async function submitNewAgentProposalForNapoleonReview(
  packet: NewAgentProposalReviewPacket,
  dependencies: NewAgentProposalReviewSubmissionDependencies,
): Promise<NewAgentProposalReviewSubmissionResult> {
  const activeProfileMode = mapProfileToNapoleonMode(dependencies.profile ?? "adult_owner");
  const requestId = `cos_${dependencies.traceId}`;
  const localDecisionId = `local_new_agent_${dependencies.traceId}`;
  const localAuditId = `local_audit_${dependencies.traceId}`;
  const endpoint = getConfiguredEndpoint(dependencies);
  const authToken = getConfiguredAuthToken(dependencies);
  const descriptorConnection = buildDescriptorConnectionState(
    dependencies.descriptorConnection ?? {
      endpointConfigured: Boolean(endpoint),
      descriptor: null,
    },
  );

  if (packet.profileMode !== activeProfileMode) {
    failClosed(dependencies, "governance_no_go", packet, requestId);
  }
  if (dependencies.rehearsalMode) {
    failClosed(dependencies, "governance_no_go", packet, requestId);
  }
  if (!endpoint) {
    failClosed(dependencies, "no_endpoint", packet, requestId, undefined, descriptorConnection.failClosedReason);
  }
  if (!descriptorConnection.canAttemptLiveBridge) {
    failClosed(
      dependencies,
      descriptorFailClosedReasonToBridgeFailure(descriptorConnection.failClosedReason),
      packet,
      requestId,
      undefined,
      descriptorConnection.failClosedReason,
    );
  }
  if (!descriptorSupportsGovernedHandoff(descriptorConnection, "new_agent_proposal_review")) {
    failClosed(dependencies, "descriptor_mismatch", packet, requestId, undefined, "descriptor_invalid");
  }

  const chiefOfStaffRequest: ChiefOfStaffRequest = {
    request_id: requestId,
    requester: "concierge.capability_intelligence",
    request_type: "new_agent_proposal_review",
    profile_mode: packet.profileMode,
    source_evidence: packet.sourceEvidence,
    requested_authority_tier: "advisory_review",
    trace_id: dependencies.traceId,
    payload_schema: packet.schemaVersion,
  };
  const governanceRequest: GovernanceEvaluationRequest = {
    request_id: `gov_${dependencies.traceId}`,
    actor_id: "concierge.capability_intelligence",
    action: "submit_new_agent_proposal_for_review",
    target: "napoleon.agent_registry",
    requested_authority_tier: "advisory_review",
    evidence_links: packet.sourceEvidence,
    trace_id: dependencies.traceId,
  };
  const traceEnvelope: TraceEnvelope = {
    trace_id: dependencies.traceId,
    parent_trace_id: dependencies.conversationId,
    actor_id: "concierge.capability_intelligence",
    request_id: requestId,
    decision_id: localDecisionId,
    timestamp: new Date().toISOString(),
  };
  const auditEnvelope: AuditEnvelope = {
    audit_id: localAuditId,
    trace_id: dependencies.traceId,
    decision_id: localDecisionId,
    actor_id: "concierge.capability_intelligence",
    authority_tier: "advisory_review",
    approval_requirement: "Napoleon Chief of Staff and owner review before registry or activation changes.",
    evidence_links: packet.sourceEvidence,
  };
  const target = buildNewAgentProposalReviewBridgeTarget(endpoint);
  const targetMetadata: NewAgentProposalTargetMetadata = {
    bridgeTargetPath: target.path,
    bridgeTargetOperation: target.operationId,
    bridgeTargetRequestKind: target.requestKind,
  };
  emitNewAgentProposalEvent(dependencies, "new_agent_proposal_review_send_started", {
    traceId: dependencies.traceId,
    conversationId: dependencies.conversationId,
    requestId,
    proposalId: packet.proposalId,
    proposedAgentId: packet.proposedAgent.agentId,
    profileMode: packet.profileMode,
    ...targetMetadata,
  });

  const fetcher = dependencies.fetch ?? globalThis.fetch.bind(globalThis);
  let response: Awaited<ReturnType<NewAgentProposalReviewFetch>>;
  try {
    response = await fetcher(target.url, {
      method: "POST",
      headers: buildHeaders(authToken),
      body: JSON.stringify({
        requestKind: target.requestKind,
        handoffKind: "new_agent_proposal_review_handoff",
        bridgeTargetPath: target.path,
        bridgeTargetOperation: target.operationId,
        profileMode: packet.profileMode,
        descriptorStatus: descriptorConnection.descriptorStatus,
        descriptorConnection,
        chiefOfStaffRequest,
        governanceRequest,
        traceEnvelope,
        auditEnvelope,
        newAgentProposal: packet,
        boundary: packet.boundary,
        blockedEffects: packet.blockedEffects,
      }),
    });
  } catch (error) {
    failClosed(
      dependencies,
      error instanceof Error && error.name === "AbortError" ? "bridge_timeout" : "http_failure",
      packet,
      requestId,
      undefined,
      undefined,
      undefined,
      targetMetadata,
    );
  }

  if (!response.ok) {
    failClosed(
      dependencies,
      response.status === 401 || response.status === 403 ? "auth_failure" : "http_failure",
      packet,
      requestId,
      response.status,
      undefined,
      undefined,
      targetMetadata,
    );
  }

  let payload: Partial<NewAgentProposalReviewSubmissionResult>;
  try {
    payload = (await response.json()) as Partial<NewAgentProposalReviewSubmissionResult>;
  } catch {
    failClosed(dependencies, "contract_mismatch", packet, requestId, undefined, undefined, undefined, targetMetadata);
  }

  if (
    !hasRequiredNewAgentReviewResponseFields(payload) ||
    !isGovernanceDecision(payload.governanceDecision) ||
    !isTraceEnvelope(payload.traceEnvelope) ||
    !isAuditEnvelope(payload.auditEnvelope) ||
    !envelopesMatchDecision(payload.governanceDecision, payload.traceEnvelope, payload.auditEnvelope) ||
    hasUnsafeReturnedProofIdentifier(payload.governanceDecision, payload.traceEnvelope, payload.auditEnvelope) ||
    hasForbiddenNewAgentProposalSideEffectClaim(
      payload as Partial<NewAgentProposalReviewSubmissionResult> & Record<string, unknown>,
    )
  ) {
    failClosed(dependencies, "contract_mismatch", packet, requestId, undefined, undefined, undefined, targetMetadata);
  }

  if (payload.governanceDecision.outcome === "deny" || payload.governanceDecision.outcome === "no_go") {
    failClosed(
      dependencies,
      payload.governanceDecision.outcome === "deny" ? "governance_denied" : "governance_no_go",
      packet,
      payload.governanceDecision.request_id,
      response.status,
      undefined,
      {
        decisionId: payload.governanceDecision.decision_id,
        auditId: payload.auditEnvelope.audit_id,
        governanceOutcome: payload.governanceDecision.outcome,
      },
      targetMetadata,
    );
  }

  emitNewAgentProposalEvent(dependencies, "new_agent_proposal_review_send_completed", {
    traceId: dependencies.traceId,
    conversationId: dependencies.conversationId,
    requestId,
    proposalId: packet.proposalId,
    proposedAgentId: packet.proposedAgent.agentId,
    decisionId: payload.governanceDecision.decision_id,
    auditId: payload.auditEnvelope.audit_id,
    outcome: payload.governanceDecision.outcome,
    appliedLocally: false,
    approvalCaptured: false,
    memoryWritePerformed: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    registryUpdatePerformed: false,
    agentActivated: false,
    ...targetMetadata,
  });

  return {
    text: payload.text ?? "Napoleon accepted the new-agent proposal for governed review.",
    governanceDecision: payload.governanceDecision,
    traceEnvelope: payload.traceEnvelope,
    auditEnvelope: payload.auditEnvelope,
    appliedLocally: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    registryUpdatePerformed: false,
    agentActivated: false,
  };
}
