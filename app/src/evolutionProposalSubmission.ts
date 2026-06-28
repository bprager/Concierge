import type { ExportedCapabilityReviewPacket } from "./capabilityLedger.js";
import { buildEvolutionProposalSubmissionBridgeTarget, getNapoleonReviewOperation } from "./bridgeOperations.js";
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
import { NapoleonBridgeError, descriptorFailClosedReasonToBridgeFailure } from "./napoleonBridge.js";
import { emitEvent, makeTelemetryPayload, type TelemetryPayload } from "./telemetry.js";

type EvolutionProposalSubmissionFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}>;

export interface EvolutionProposalSubmissionPacket {
  schemaVersion: "concierge.evolution-proposal-submission.v1";
  requestKind: "evolution_proposal_submission_handoff";
  proposalId: string;
  profileMode: NapoleonProfileMode;
  evolutionProposal: {
    proposal_id: string;
    summary: string;
    risk_level: "low" | "medium" | "high" | "very_high";
    evidence: string[];
    change: {
      capability: string;
      architecture_area: string;
      requested_action: string;
    };
    affected_profiles: string[];
    affected_channels: string[];
    evaluator_cases: string[];
    approval_required: string;
    rollback_plan: string;
  };
  evaluatorCaseCandidate: {
    caseId: string;
    expectedBehavior: string;
  };
  boundary: {
    proposalOnly: true;
    submittedForNapoleonReview: true;
    approvalCaptured: false;
    memoryWritePerformed: false;
    agentDispatchPerformed: false;
    externalSendPerformed: false;
    registryUpdatePerformed: false;
    evolutionApplied: false;
    appliedLocally: false;
  };
  blockedEffects: string[];
}

interface EvolutionProposalSubmissionDependencies {
  conversationId: string;
  traceId: string;
  profile?: LocalProfile;
  rehearsalMode?: boolean;
  getEndpoint?: () => string | null;
  getAuthToken?: () => string | null;
  descriptorConnection?: DescriptorConnectionInput;
  emit?: (payload: TelemetryPayload) => void;
  fetch?: EvolutionProposalSubmissionFetch;
}

export interface EvolutionProposalSubmissionResult {
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
  evolutionApplied: false;
}

interface EvolutionProposalTargetMetadata {
  bridgeTargetPath: string;
  bridgeTargetOperation: string;
  bridgeTargetRequestKind: string;
}

const EVOLUTION_PROPOSAL_BLOCKED_EFFECTS = [
  "evolution_application",
  "registry_update",
  "approval_capture",
  "memory_write",
  "agent_dispatch",
  "external_send",
  "runtime_authority",
] as const;

function safeText(value: string, fallback: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return (trimmed || fallback).slice(0, 320);
}

function riskForArea(area: string): EvolutionProposalSubmissionPacket["evolutionProposal"]["risk_level"] {
  if (area === "napoleon_runtime" || area === "agent_registry" || area === "memory_review") return "high";
  if (area === "governance_ux" || area === "settings_privacy" || area === "bridge") return "medium";
  return "low";
}

function normalizeProfileMode(profile: LocalProfile | NapoleonProfileMode | undefined): NapoleonProfileMode {
  if (!profile) return "adult_owner";
  if (profile === "child_protected") return "child_protected_user";
  return profile;
}

export function buildEvolutionProposalSubmissionPacket(
  capabilityReviewPacket: ExportedCapabilityReviewPacket,
  options: { profile?: LocalProfile | NapoleonProfileMode; traceId: string },
): EvolutionProposalSubmissionPacket {
  const profileMode = normalizeProfileMode(options.profile);
  const draft = capabilityReviewPacket.evolutionProposalDraft;
  const architectureArea =
    draft.change.architectureArea === "unknown" ? "observability" : draft.change.architectureArea;
  const evidence = draft.evidence.length ? draft.evidence.slice(0, 8) : capabilityReviewPacket.reviewFocus.evidenceRefs.slice(0, 8);
  const approvalRequired =
    profileMode === "child_protected_user"
      ? "guardian_and_owner_review_required_before_child_protected_evolution"
      : draft.approvalRequired;

  return {
    schemaVersion: "concierge.evolution-proposal-submission.v1",
    requestKind: "evolution_proposal_submission_handoff",
    proposalId: draft.proposalId,
    profileMode,
    evolutionProposal: {
      proposal_id: draft.proposalId,
      summary: safeText(draft.summary, `Improve ${draft.change.capability} through Napoleon review.`),
      risk_level: riskForArea(architectureArea),
      evidence,
      change: {
        capability: safeText(draft.change.capability, "unknown capability"),
        architecture_area: architectureArea,
        requested_action: draft.change.requestedAction,
      },
      affected_profiles: [profileMode],
      affected_channels: ["text"],
      evaluator_cases: [capabilityReviewPacket.evaluatorCaseCandidate.caseId],
      approval_required: approvalRequired,
      rollback_plan: safeText(draft.rollbackPlan, "Keep current Concierge behavior as last known good."),
    },
    evaluatorCaseCandidate: {
      caseId: capabilityReviewPacket.evaluatorCaseCandidate.caseId,
      expectedBehavior:
        "Concierge may submit this proposal to Napoleon intake, but must not approve, apply, dispatch, write memory, update registries, or send externally.",
    },
    boundary: {
      proposalOnly: true,
      submittedForNapoleonReview: true,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      registryUpdatePerformed: false,
      evolutionApplied: false,
      appliedLocally: false,
    },
    blockedEffects: [...EVOLUTION_PROPOSAL_BLOCKED_EFFECTS],
  };
}

function emitEvolutionProposalEvent(
  dependencies: EvolutionProposalSubmissionDependencies,
  event: string,
  attributes: Record<string, unknown>,
) {
  if (dependencies.emit) {
    dependencies.emit(makeTelemetryPayload(event, attributes));
    return;
  }
  emitEvent(event, attributes);
}

function getConfiguredEndpoint(dependencies: EvolutionProposalSubmissionDependencies): string | null {
  if (dependencies.getEndpoint) return dependencies.getEndpoint();
  return readConfiguredEndpointFromStorage();
}

function getConfiguredAuthToken(dependencies: EvolutionProposalSubmissionDependencies): string | null {
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

function mergeBlockedEffects(returnedEffects: string[], requiredEffects: string[]): string[] {
  const merged = [...returnedEffects];
  const seen = new Set(merged.map((effect) => effect.trim()).filter(Boolean));
  for (const effect of requiredEffects) {
    if (!seen.has(effect)) {
      merged.push(effect);
      seen.add(effect);
    }
  }
  return merged;
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

function hasRequiredEvolutionProposalResponseFields(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  return getNapoleonReviewOperation("evolution_proposal_submission").responseRequired.every(
    (field) => record[field] !== undefined,
  );
}

function hasForbiddenEvolutionProposalSideEffectClaim(
  payload: Partial<EvolutionProposalSubmissionResult> & Record<string, unknown>,
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
  if (record.evolutionApplied === true || record.evolutionApplicationPerformed === true) return true;
  return hasForbiddenSideEffectTextClaim(payload.text);
}

function failClosed(
  dependencies: EvolutionProposalSubmissionDependencies,
  reason: ConstructorParameters<typeof NapoleonBridgeError>[0],
  packet: EvolutionProposalSubmissionPacket,
  requestId: string,
  status?: number,
  descriptorFailureReason?: DescriptorFailClosedReason,
  governanceReferences?: { decisionId?: string; auditId?: string; governanceOutcome?: string },
  targetMetadata?: EvolutionProposalTargetMetadata,
  failureMetadata: { profileMode?: NapoleonProfileMode; blockedEffects?: string[] } = {},
): never {
  const profileMode = failureMetadata.profileMode ?? packet.profileMode;
  const blockedEffects = failureMetadata.blockedEffects ?? packet.blockedEffects;
  emitEvolutionProposalEvent(dependencies, "evolution_proposal_submission_send_failed", {
    traceId: dependencies.traceId,
    conversationId: dependencies.conversationId,
    requestId,
    proposalId: packet.proposalId,
    profileMode,
    reason,
    status,
    descriptorFailureReason,
    decisionId: governanceReferences?.decisionId,
    auditId: governanceReferences?.auditId,
    governanceOutcome: governanceReferences?.governanceOutcome,
    blockedEffects,
    ...targetMetadata,
  });
  throw new NapoleonBridgeError(reason, dependencies.traceId, requestId, status, blockedEffects, {
    profileMode,
    descriptorFailureReason,
    decisionId: governanceReferences?.decisionId,
    auditId: governanceReferences?.auditId,
    governanceOutcome: governanceReferences?.governanceOutcome,
  });
}

export async function submitEvolutionProposalToNapoleon(
  packet: EvolutionProposalSubmissionPacket,
  dependencies: EvolutionProposalSubmissionDependencies,
): Promise<EvolutionProposalSubmissionResult> {
  const activeProfileMode = mapProfileToNapoleonMode(dependencies.profile ?? "adult_owner");
  const requestId = `cos_${dependencies.traceId}`;
  const localDecisionId = `local_evolution_submission_${dependencies.traceId}`;
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
    failClosed(dependencies, "governance_no_go", packet, requestId, undefined, undefined, undefined, undefined, {
      profileMode: activeProfileMode,
    });
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
  if (!descriptorSupportsGovernedHandoff(descriptorConnection, "evolution_proposal_submission")) {
    failClosed(dependencies, "descriptor_mismatch", packet, requestId, undefined, "descriptor_invalid");
  }

  const chiefOfStaffRequest: ChiefOfStaffRequest = {
    request_id: requestId,
    requester: "concierge.capability_intelligence",
    request_type: "evolution_proposal_submission",
    profile_mode: packet.profileMode,
    source_evidence: packet.evolutionProposal.evidence,
    requested_authority_tier: "advisory_review",
    trace_id: dependencies.traceId,
    payload_schema: packet.schemaVersion,
  };
  const governanceRequest: GovernanceEvaluationRequest = {
    request_id: `gov_${dependencies.traceId}`,
    actor_id: "concierge.capability_intelligence",
    action: "submit_evolution_proposal_to_napoleon",
    target: "napoleon.evolution_controller",
    requested_authority_tier: "advisory_review",
    evidence_links: packet.evolutionProposal.evidence,
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
    approval_requirement: packet.evolutionProposal.approval_required,
    evidence_links: packet.evolutionProposal.evidence,
  };
  const target = buildEvolutionProposalSubmissionBridgeTarget(endpoint);
  const targetMetadata: EvolutionProposalTargetMetadata = {
    bridgeTargetPath: target.path,
    bridgeTargetOperation: target.operationId,
    bridgeTargetRequestKind: target.requestKind,
  };
  emitEvolutionProposalEvent(dependencies, "evolution_proposal_submission_send_started", {
    traceId: dependencies.traceId,
    conversationId: dependencies.conversationId,
    requestId,
    proposalId: packet.proposalId,
    profileMode: packet.profileMode,
    ...targetMetadata,
  });

  const fetcher = dependencies.fetch ?? globalThis.fetch.bind(globalThis);
  let response: Awaited<ReturnType<EvolutionProposalSubmissionFetch>>;
  try {
    response = await fetcher(target.url, {
      method: "POST",
      headers: buildHeaders(authToken),
      body: JSON.stringify({
        requestKind: target.requestKind,
        handoffKind: "evolution_proposal_submission_handoff",
        bridgeTargetPath: target.path,
        bridgeTargetOperation: target.operationId,
        profileMode: packet.profileMode,
        descriptorStatus: descriptorConnection.descriptorStatus,
        descriptorConnection,
        chiefOfStaffRequest,
        governanceRequest,
        traceEnvelope,
        auditEnvelope,
        evolutionProposalSubmission: packet,
        evolutionProposal: packet.evolutionProposal,
        evaluatorCaseCandidate: packet.evaluatorCaseCandidate,
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

  let payload: Partial<EvolutionProposalSubmissionResult>;
  try {
    payload = (await response.json()) as Partial<EvolutionProposalSubmissionResult>;
  } catch {
    failClosed(dependencies, "contract_mismatch", packet, requestId, undefined, undefined, undefined, targetMetadata);
  }

  if (
    !hasRequiredEvolutionProposalResponseFields(payload) ||
    !isGovernanceDecision(payload.governanceDecision) ||
    !isTraceEnvelope(payload.traceEnvelope) ||
    !isAuditEnvelope(payload.auditEnvelope) ||
    !envelopesMatchDecision(payload.governanceDecision, payload.traceEnvelope, payload.auditEnvelope) ||
    hasUnsafeReturnedProofIdentifier(payload.governanceDecision, payload.traceEnvelope, payload.auditEnvelope) ||
    hasForbiddenEvolutionProposalSideEffectClaim(
      payload as Partial<EvolutionProposalSubmissionResult> & Record<string, unknown>,
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
      {
        blockedEffects: mergeBlockedEffects(payload.governanceDecision.blocked_effects, packet.blockedEffects),
      },
    );
  }

  emitEvolutionProposalEvent(dependencies, "evolution_proposal_submission_send_completed", {
    traceId: dependencies.traceId,
    conversationId: dependencies.conversationId,
    requestId,
    proposalId: packet.proposalId,
    decisionId: payload.governanceDecision.decision_id,
    auditId: payload.auditEnvelope.audit_id,
    outcome: payload.governanceDecision.outcome,
    appliedLocally: false,
    approvalCaptured: false,
    memoryWritePerformed: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    registryUpdatePerformed: false,
    evolutionApplied: false,
    ...targetMetadata,
  });

  return {
    text: payload.text ?? "Napoleon accepted the evolution proposal for governed intake.",
    governanceDecision: payload.governanceDecision,
    traceEnvelope: payload.traceEnvelope,
    auditEnvelope: payload.auditEnvelope,
    appliedLocally: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    registryUpdatePerformed: false,
    evolutionApplied: false,
  };
}
