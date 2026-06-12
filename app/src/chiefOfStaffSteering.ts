import {
  answerCapabilityQuestion,
  type CapabilityArchitectureArea,
  type CapabilityLedger,
  type RecommendationBoundary,
} from "./capabilityLedger.js";
import { resolveNapoleonBridgeOperation } from "./bridgeEndpoint.js";
import {
  buildDescriptorConnectionState,
  defaultChiefOfStaffDescriptor,
  mapProfileToNapoleonMode,
  type AuditEnvelope,
  type ChiefOfStaffRequest,
  type DescriptorConnectionInput,
  type GovernanceDecision,
  type GovernanceEvaluationRequest,
  type LocalProfile,
  type TraceEnvelope,
} from "./contractBridge.js";
import { NapoleonBridgeError } from "./napoleonBridge.js";
import { emitEvent, makeTelemetryPayload, type TelemetryPayload } from "./telemetry.js";

type SteeringFetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}>;

interface SteeringDraftOptions {
  conversationId: string;
  traceId: string;
  endpointConfigured: boolean;
}

interface SteeringRecommendation {
  capabilityLabel: string;
  architectureArea: CapabilityArchitectureArea;
  evidenceCount: number;
  confidence: number;
  suggestedNextStep: string;
  rationale: string;
  childSafetyCaution?: true;
}

interface EvaluatorCaseCandidate {
  caseId: string;
  scenarioType: "capability_gap_regression";
  capabilityLabel: string;
  architectureArea: CapabilityArchitectureArea;
  expectedBehavior: string;
}

interface EvolutionProposalDraft {
  proposal_id: string;
  summary: string;
  risk_level: "low" | "medium" | "high" | "very_high";
  evidence: string[];
  change: {
    capability: string;
    architecture_area: CapabilityArchitectureArea;
    requested_action: string;
  };
  affected_profiles: string[];
  affected_channels: string[];
  evaluator_cases: string[];
  approval_required: string;
  rollback_plan: string;
}

export interface ChiefOfStaffSteeringDraft {
  recommendation: SteeringRecommendation;
  evaluatorCaseCandidate: EvaluatorCaseCandidate;
  evolutionProposal: EvolutionProposalDraft;
  sendState: {
    canSendToNapoleon: boolean;
    reason: string;
  };
  boundary: RecommendationBoundary;
}

interface SteeringSubmissionDependencies {
  conversationId: string;
  traceId: string;
  profile?: LocalProfile;
  getEndpoint?: () => string | null;
  getAuthToken?: () => string | null;
  descriptorConnection?: DescriptorConnectionInput;
  emit?: (payload: TelemetryPayload) => void;
  fetch?: SteeringFetch;
}

export interface ChiefOfStaffSteeringSubmissionResult {
  text: string;
  governanceDecision: GovernanceDecision;
  traceEnvelope: TraceEnvelope;
  auditEnvelope: AuditEnvelope;
  appliedLocally: false;
  memoryWritePerformed: false;
  approvalCaptured: false;
  externalSendPerformed: false;
}

const PROPOSAL_BOUNDARY: RecommendationBoundary = {
  proposalOnly: true,
  approvalCaptured: false,
  memoryWriteAllowed: false,
  agentDispatchAllowed: false,
  externalSendAllowed: false,
};

function riskForArchitecture(area: CapabilityArchitectureArea): EvolutionProposalDraft["risk_level"] {
  if (area === "napoleon_runtime" || area === "agent_registry" || area === "memory_review") return "high";
  if (area === "governance_ux" || area === "settings_privacy" || area === "bridge") return "medium";
  return "low";
}

export function draftChiefOfStaffSteering(
  ledger: CapabilityLedger,
  options: SteeringDraftOptions,
): ChiefOfStaffSteeringDraft {
  const answer = answerCapabilityQuestion("What capabilities should be implemented next?", ledger);
  const top = answer?.rows[0];
  const capabilityLabel = top?.label ?? "no_local_capability_gap";
  const architectureArea = top?.architectureArea ?? "observability";
  const confidence = top?.confidence ?? 0;
  const evidenceRefs = ledger
    .listRecent()
    .filter((signal) => signal.capabilityLabel === capabilityLabel)
    .flatMap((signal) => signal.evidenceRefs)
    .slice(0, 8);
  const caseId = `capability_gap_${capabilityLabel.replace(/[^a-z0-9_]+/gi, "_").toLowerCase()}`;

  const recommendation: SteeringRecommendation = {
    capabilityLabel,
    architectureArea,
    evidenceCount: top?.count ?? 0,
    confidence,
    suggestedNextStep: top?.suggestedNextStep ?? "needs_human_review",
    rationale:
      top?.scoreExplanation ??
      "No strong local capability recommendation exists yet; keep gathering metadata-only signals.",
  };
  const evaluatorCaseCandidate: EvaluatorCaseCandidate = {
    caseId,
    scenarioType: "capability_gap_regression",
    capabilityLabel,
    architectureArea,
    expectedBehavior:
      "Concierge should fail closed where authority is missing, show blocked effects, and keep the recommendation proposal-only.",
  };

  return {
    recommendation,
    evaluatorCaseCandidate,
    evolutionProposal: {
      proposal_id: `evo_${caseId}_${options.traceId}`,
      summary: `Improve ${capabilityLabel} in ${architectureArea} based on local capability signals.`,
      risk_level: riskForArchitecture(architectureArea),
      evidence: evidenceRefs,
      change: {
        capability: capabilityLabel,
        architecture_area: architectureArea,
        requested_action: recommendation.suggestedNextStep,
      },
      affected_profiles: ["adult_owner"],
      affected_channels: ["text"],
      evaluator_cases: [caseId],
      approval_required: "Napoleon Chief of Staff and owner review before implementation or rollout.",
      rollback_plan: "Keep the current Concierge behavior as last known good and disable the proposed capability path if evaluator or governance checks regress.",
    },
    sendState: {
      canSendToNapoleon: options.endpointConfigured,
      reason: options.endpointConfigured
        ? "A governed Napoleon endpoint is configured; sending still requires bridge permission."
        : "No governed Napoleon endpoint is configured, so this draft remains local.",
    },
    boundary: PROPOSAL_BOUNDARY,
  };
}

function emitSteeringEvent(dependencies: SteeringSubmissionDependencies, event: string, attributes: Record<string, unknown>) {
  if (dependencies.emit) {
    dependencies.emit(makeTelemetryPayload(event, attributes));
    return;
  }
  emitEvent(event, attributes);
}

function getConfiguredEndpoint(dependencies: SteeringSubmissionDependencies): string | null {
  if (dependencies.getEndpoint) return dependencies.getEndpoint();
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("napoleon_endpoint");
}

function getConfiguredAuthToken(dependencies: SteeringSubmissionDependencies): string | null {
  if (dependencies.getAuthToken) return dependencies.getAuthToken();
  if (dependencies.getEndpoint) return null;
  if (typeof localStorage === "undefined") return null;
  const token = localStorage.getItem("napoleon_auth_token");
  return token?.trim() ? token.trim() : null;
}

function buildSteeringHeaders(authToken: string | null): Record<string, string> {
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

function hasForbiddenSteeringSideEffectClaim(payload: Partial<ChiefOfStaffSteeringSubmissionResult> & Record<string, unknown>): boolean {
  const forbiddenFalseFields = [
    "appliedLocally",
    "memoryWritePerformed",
    "approvalCaptured",
    "externalSendPerformed",
    "agentDispatchPerformed",
  ];
  return forbiddenFalseFields.some((field) => payload[field] !== undefined && payload[field] !== false);
}

function failSteeringClosed(
  dependencies: SteeringSubmissionDependencies,
  reason: ConstructorParameters<typeof NapoleonBridgeError>[0],
  traceId: string,
  requestId: string,
  status?: number,
  blockedEffects: string[] = [],
): never {
  emitSteeringEvent(dependencies, "capability_recommendation_send_failed", {
    traceId,
    requestId,
    reason,
    status,
    blockedEffects,
  });
  throw new NapoleonBridgeError(reason, traceId, requestId, status, blockedEffects);
}

export async function submitChiefOfStaffSteeringDraft(
  draft: ChiefOfStaffSteeringDraft,
  dependencies: SteeringSubmissionDependencies,
): Promise<ChiefOfStaffSteeringSubmissionResult> {
  const profile = dependencies.profile ?? "adult_owner";
  const profileMode = mapProfileToNapoleonMode(profile);
  const isChildProtected = profileMode === "child_protected_user";
  const approvalRequirement = isChildProtected
    ? "guardian_and_owner_review_required_before_child_protected_capability_change"
    : "Napoleon Chief of Staff and owner review before implementation or rollout.";
  const requestId = `cos_${dependencies.traceId}`;
  const localDecisionId = `local_steering_${dependencies.traceId}`;
  const localAuditId = `local_audit_${dependencies.traceId}`;
  const endpoint = getConfiguredEndpoint(dependencies);
  const authToken = getConfiguredAuthToken(dependencies);
  const descriptorConnection = buildDescriptorConnectionState(
    dependencies.descriptorConnection ?? {
      endpointConfigured: Boolean(endpoint),
      descriptor: null,
    },
  );
  const blockedEffects = ["memory_write", "agent_dispatch", "external_send", "approval_capture", "runtime_authority"];
  const recommendation = isChildProtected ? { ...draft.recommendation, childSafetyCaution: true as const } : draft.recommendation;
  const evolutionProposal = isChildProtected
    ? {
        ...draft.evolutionProposal,
        affected_profiles: ["child_protected_user"],
        approval_required: approvalRequirement,
      }
    : draft.evolutionProposal;

  if (!endpoint) {
    failSteeringClosed(dependencies, "no_endpoint", dependencies.traceId, requestId, undefined, blockedEffects);
  }
  if (!descriptorConnection.canAttemptLiveBridge) {
    failSteeringClosed(dependencies, "descriptor_mismatch", dependencies.traceId, requestId, undefined, blockedEffects);
  }

  const chiefOfStaffRequest: ChiefOfStaffRequest = {
    request_id: requestId,
    requester: "concierge.capability_intelligence",
    request_type: "evolution_proposal_review",
    profile_mode: profileMode,
    source_evidence: evolutionProposal.evidence,
    requested_authority_tier: "advisory_review",
    trace_id: dependencies.traceId,
    payload_schema: "schemas/evolution_proposal.schema.json",
  };
  const governanceRequest: GovernanceEvaluationRequest = {
    request_id: `gov_${dependencies.traceId}`,
    actor_id: "concierge.capability_intelligence",
    action: isChildProtected ? "submit_child_evolution_proposal_for_review" : "submit_evolution_proposal_for_review",
    target: "napoleon.chief_of_staff",
    requested_authority_tier: "advisory_review",
    evidence_links: evolutionProposal.evidence,
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
    approval_requirement: approvalRequirement,
    evidence_links: evolutionProposal.evidence,
  };
  emitSteeringEvent(dependencies, "capability_recommendation_send_started", {
    traceId: dependencies.traceId,
    requestId,
    proposalId: evolutionProposal.proposal_id,
    profileMode,
  });

  const targetEndpoint = resolveNapoleonBridgeOperation(endpoint, "chief_of_staff_steering");
  const fetcher = dependencies.fetch ?? globalThis.fetch.bind(globalThis);
  let response: Awaited<ReturnType<SteeringFetch>>;
  try {
    response = await fetcher(targetEndpoint, {
      method: "POST",
      headers: buildSteeringHeaders(authToken),
      body: JSON.stringify({
        requestKind: "chief_of_staff_steering_handoff",
        profileMode,
        descriptorStatus: descriptorConnection.descriptorStatus,
        descriptorConnection,
        chiefOfStaffRequest,
        governanceRequest,
        traceEnvelope,
        auditEnvelope,
        recommendation,
        evaluatorCaseCandidate: draft.evaluatorCaseCandidate,
        evolutionProposal,
        boundary: draft.boundary,
        blockedEffects,
      }),
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError" ? "bridge_timeout" : "http_failure";
    failSteeringClosed(dependencies, reason, dependencies.traceId, requestId, undefined, blockedEffects);
  }

  if (!response.ok) {
    const reason = response.status === 401 || response.status === 403 ? "auth_failure" : "http_failure";
    failSteeringClosed(dependencies, reason, dependencies.traceId, requestId, response.status, blockedEffects);
  }

  const payload = (await response.json()) as Partial<ChiefOfStaffSteeringSubmissionResult>;
  if (
    !isGovernanceDecision(payload.governanceDecision) ||
    !isTraceEnvelope(payload.traceEnvelope) ||
    !isAuditEnvelope(payload.auditEnvelope) ||
    !envelopesMatchDecision(payload.governanceDecision, payload.traceEnvelope, payload.auditEnvelope) ||
    hasForbiddenSteeringSideEffectClaim(payload as Partial<ChiefOfStaffSteeringSubmissionResult> & Record<string, unknown>)
  ) {
    failSteeringClosed(dependencies, "contract_mismatch", dependencies.traceId, requestId, undefined, blockedEffects);
  }

  if (payload.governanceDecision.outcome === "deny" || payload.governanceDecision.outcome === "no_go") {
    failSteeringClosed(
      dependencies,
      payload.governanceDecision.outcome === "deny" ? "governance_denied" : "governance_no_go",
      dependencies.traceId,
      payload.governanceDecision.request_id,
      response.status,
      payload.governanceDecision.blocked_effects,
    );
  }

  emitSteeringEvent(dependencies, "capability_recommendation_send_completed", {
    traceId: dependencies.traceId,
    requestId,
    proposalId: evolutionProposal.proposal_id,
    decisionId: payload.governanceDecision.decision_id,
    auditId: payload.auditEnvelope.audit_id,
    outcome: payload.governanceDecision.outcome,
    appliedLocally: false,
    approvalCaptured: false,
    memoryWritePerformed: false,
    externalSendPerformed: false,
  });

  return {
    text: payload.text ?? "Napoleon accepted the evolution proposal for governed review.",
    governanceDecision: payload.governanceDecision,
    traceEnvelope: payload.traceEnvelope,
    auditEnvelope: payload.auditEnvelope,
    appliedLocally: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    externalSendPerformed: false,
  };
}
