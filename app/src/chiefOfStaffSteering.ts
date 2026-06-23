import {
  answerCapabilityQuestion,
  type CapabilityArchitectureArea,
  type CapabilityAnswerRow,
  type CapabilityLedger,
  type ConversationCapabilitySignal,
  type RecommendationBoundary,
} from "./capabilityLedger.js";
import { resolveNapoleonEvolutionProposalReviewOperation } from "./bridgeEndpoint.js";
import { hasRequiredBridgeResponseFields } from "./bridgeResponseRequirements.js";
import { hasForbiddenSideEffectTextClaim } from "./bridgeSideEffectClaims.js";
import { readConfiguredAuthTokenFromStorage, readConfiguredEndpointFromStorage } from "./connectionStorage.js";
import {
  buildDescriptorConnectionState,
  defaultChiefOfStaffDescriptor,
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
import {
  buildLearningSignalFromCapabilitySignal,
  type LearningSignal,
} from "./learningSignal.js";

type SteeringFetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}>;

interface SteeringDraftOptions {
  conversationId: string;
  traceId: string;
  endpointConfigured: boolean;
  profileMode?: LocalProfile | NapoleonProfileMode;
}

interface SteeringRecommendation {
  recommendationType: "guided_readiness_repair" | "scored_capability_recommendation";
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
  learning_signals: LearningSignal[];
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
  rehearsalMode?: boolean;
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
  agentDispatchPerformed: false;
  externalSendPerformed: false;
}

interface SteeringTargetMetadata {
  bridgeTargetPath: string;
  bridgeTargetOperation: string;
  bridgeTargetRequestKind: string;
}

interface SteeringFailureMetadata {
  descriptorFailureReason?: DescriptorFailClosedReason;
  governanceReferences?: { decisionId?: string; auditId?: string; governanceOutcome?: string };
  targetMetadata?: SteeringTargetMetadata;
  recommendationType?: SteeringRecommendation["recommendationType"];
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

function supportsSteeringRecommendation(signal: ConversationCapabilitySignal, row: CapabilityAnswerRow | undefined): boolean {
  if (!row) return false;
  if (signal.capabilityLabel !== row.label) return false;
  if (row.architectureArea && signal.architectureArea !== row.architectureArea) return false;
  if (row.status && signal.capabilityStatus !== row.status) return false;
  if (signal.capabilityStatus === "missing") return true;
  if (
    signal.capabilityStatus === "blocked" &&
    signal.capabilityLabel.endsWith("media_session_readiness_summary")
  ) {
    return true;
  }
  return signal.capabilityStatus === "degraded" && signal.suggestedNextStep !== "needs_human_review";
}

function recommendationTypeForSteeringDraft(
  capabilityLabel: string,
  supportingSignals: ConversationCapabilitySignal[],
): SteeringRecommendation["recommendationType"] {
  return capabilityLabel.endsWith("media_session_readiness_summary") &&
    supportingSignals.some((signal) => signal.capabilityStatus === "blocked")
    ? "guided_readiness_repair"
    : "scored_capability_recommendation";
}

function normalizeSteeringProfileMode(profileMode: LocalProfile | NapoleonProfileMode | undefined): NapoleonProfileMode | undefined {
  if (!profileMode) return undefined;
  if (profileMode === "child_protected") return "child_protected_user";
  return profileMode;
}

export function draftChiefOfStaffSteering(
  ledger: CapabilityLedger,
  options: SteeringDraftOptions,
): ChiefOfStaffSteeringDraft {
  const profileMode = normalizeSteeringProfileMode(options.profileMode);
  const answer = answerCapabilityQuestion("What capabilities should be implemented next?", ledger, undefined, {
    profileMode,
  });
  const top = answer?.rows[0];
  const capabilityLabel = top?.label ?? "no_local_capability_gap";
  const architectureArea = top?.architectureArea ?? "observability";
  const confidence = top?.confidence ?? 0;
  const supportingSignals = ledger
    .listRecent()
    .filter((signal) => !profileMode || signal.profileMode === profileMode)
    .filter((signal) => supportsSteeringRecommendation(signal, top));
  const evidenceRefs = supportingSignals
    .flatMap((signal) => signal.evidenceRefs)
    .slice(0, 8);
  const caseId = `capability_gap_${capabilityLabel.replace(/[^a-z0-9_]+/gi, "_").toLowerCase()}`;
  const learningSignals = supportingSignals.slice(0, 8).map((signal, index) =>
    buildLearningSignalFromCapabilitySignal(signal, {
      signalId: `learning_${caseId}_${index + 1}_${signal.traceId.replace(/[^a-z0-9_:-]+/gi, "_")}`,
      createdAt: signal.observedAt,
      signalType: "repeated_pattern",
      patternCount: 1,
      redactedSummary: `Capability ${signal.capabilityLabel} was ${signal.capabilityStatus} in ${signal.architectureArea}.`,
    }),
  );

  const recommendationRationale =
    top?.recommendation ??
    top?.scoreExplanation ??
    "No strong local capability recommendation exists yet; keep gathering metadata-only signals.";
  const requestedAction = top?.recommendation ?? top?.suggestedNextStep ?? "needs_human_review";

  const recommendation: SteeringRecommendation = {
    recommendationType: recommendationTypeForSteeringDraft(capabilityLabel, supportingSignals),
    capabilityLabel,
    architectureArea,
    evidenceCount: top?.count ?? 0,
    confidence,
    suggestedNextStep: top?.suggestedNextStep ?? "needs_human_review",
    rationale: recommendationRationale,
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
      summary: top?.recommendation ?? `Improve ${capabilityLabel} in ${architectureArea} based on local capability signals.`,
      risk_level: riskForArchitecture(architectureArea),
      evidence: evidenceRefs,
      learning_signals: learningSignals,
      change: {
        capability: capabilityLabel,
        architecture_area: architectureArea,
        requested_action: requestedAction,
      },
      affected_profiles: [profileMode ?? "adult_owner"],
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
  return readConfiguredEndpointFromStorage();
}

function getConfiguredAuthToken(dependencies: SteeringSubmissionDependencies): string | null {
  if (dependencies.getAuthToken) return dependencies.getAuthToken();
  if (dependencies.getEndpoint) return null;
  return readConfiguredAuthTokenFromStorage();
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
  const requiredFalseFields = [
    "appliedLocally",
    "memoryWritePerformed",
    "approvalCaptured",
    "externalSendPerformed",
    "agentDispatchPerformed",
  ];
  return requiredFalseFields.some((field) => payload[field] !== false) || hasForbiddenSideEffectTextClaim(payload.text);
}

function draftMatchesActiveProfile(draft: ChiefOfStaffSteeringDraft, profileMode: NapoleonProfileMode): boolean {
  return draft.evolutionProposal.affected_profiles.includes(profileMode);
}

function failSteeringClosed(
  dependencies: SteeringSubmissionDependencies,
  reason: ConstructorParameters<typeof NapoleonBridgeError>[0],
  traceId: string,
  requestId: string,
  profileMode?: string,
  status?: number,
  blockedEffects: string[] = [],
  failureMetadata: SteeringFailureMetadata = {},
): never {
  const { descriptorFailureReason, governanceReferences, targetMetadata, recommendationType } = failureMetadata;
  const attributes: Record<string, unknown> = {
    traceId,
    requestId,
    profileMode,
    reason,
    status,
    blockedEffects,
  };
  if (recommendationType) attributes.recommendationType = recommendationType;
  if (descriptorFailureReason) attributes.descriptorFailureReason = descriptorFailureReason;
  if (governanceReferences?.decisionId) attributes.decisionId = governanceReferences.decisionId;
  if (governanceReferences?.auditId) attributes.auditId = governanceReferences.auditId;
  if (governanceReferences?.governanceOutcome) attributes.governanceOutcome = governanceReferences.governanceOutcome;
  if (targetMetadata) {
    attributes.bridgeTargetPath = targetMetadata.bridgeTargetPath;
    attributes.bridgeTargetOperation = targetMetadata.bridgeTargetOperation;
    attributes.bridgeTargetRequestKind = targetMetadata.bridgeTargetRequestKind;
  }
  emitSteeringEvent(dependencies, "capability_recommendation_send_failed", attributes);
  throw new NapoleonBridgeError(reason, traceId, requestId, status, blockedEffects, {
    profileMode,
    descriptorFailureReason,
    decisionId: governanceReferences?.decisionId,
    auditId: governanceReferences?.auditId,
    governanceOutcome: governanceReferences?.governanceOutcome,
  });
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
  const recommendationType = recommendation.recommendationType;
  const evolutionProposal = isChildProtected
    ? {
        ...draft.evolutionProposal,
        affected_profiles: ["child_protected_user"],
        approval_required: approvalRequirement,
      }
    : draft.evolutionProposal;

  if (!draftMatchesActiveProfile(draft, profileMode)) {
    failSteeringClosed(dependencies, "governance_no_go", dependencies.traceId, requestId, profileMode, undefined, blockedEffects, {
      recommendationType,
    });
  }
  if (dependencies.rehearsalMode) {
    failSteeringClosed(dependencies, "governance_no_go", dependencies.traceId, requestId, profileMode, undefined, blockedEffects, {
      recommendationType,
    });
  }
  if (!endpoint) {
    failSteeringClosed(dependencies, "no_endpoint", dependencies.traceId, requestId, profileMode, undefined, blockedEffects, {
      recommendationType,
    });
  }
  if (!descriptorConnection.canAttemptLiveBridge) {
    failSteeringClosed(
      dependencies,
      descriptorFailClosedReasonToBridgeFailure(descriptorConnection.failClosedReason),
      dependencies.traceId,
      requestId,
      profileMode,
      undefined,
      blockedEffects,
      {
        descriptorFailureReason: descriptorConnection.failClosedReason,
        recommendationType,
      },
    );
  }
  if (!descriptorSupportsGovernedHandoff(descriptorConnection, "evolution_proposal_review")) {
    failSteeringClosed(
      dependencies,
      "descriptor_mismatch",
      dependencies.traceId,
      requestId,
      profileMode,
      undefined,
      blockedEffects,
      {
        descriptorFailureReason: "descriptor_invalid",
        recommendationType,
      },
    );
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
  const target = resolveNapoleonEvolutionProposalReviewOperation(endpoint);
  const targetMetadata: SteeringTargetMetadata = {
    bridgeTargetPath: target.path,
    bridgeTargetOperation: target.operationId,
    bridgeTargetRequestKind: target.requestKind,
  };
  emitSteeringEvent(dependencies, "capability_recommendation_send_started", {
    traceId: dependencies.traceId,
    requestId,
    proposalId: evolutionProposal.proposal_id,
    recommendationType,
    profileMode,
    ...targetMetadata,
  });

  const fetcher = dependencies.fetch ?? globalThis.fetch.bind(globalThis);
  let response: Awaited<ReturnType<SteeringFetch>>;
  try {
    response = await fetcher(target.url, {
      method: "POST",
      headers: buildSteeringHeaders(authToken),
      body: JSON.stringify({
        requestKind: target.requestKind,
        bridgeTargetPath: target.path,
        bridgeTargetOperation: target.operationId,
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
    failSteeringClosed(
      dependencies,
      reason,
      dependencies.traceId,
      requestId,
      profileMode,
      undefined,
      blockedEffects,
      {
        targetMetadata,
        recommendationType,
      },
    );
  }

  if (!response.ok) {
    const reason = response.status === 401 || response.status === 403 ? "auth_failure" : "http_failure";
    failSteeringClosed(
      dependencies,
      reason,
      dependencies.traceId,
      requestId,
      profileMode,
      response.status,
      blockedEffects,
      {
        targetMetadata,
        recommendationType,
      },
    );
  }

  let payload: Partial<ChiefOfStaffSteeringSubmissionResult>;
  try {
    payload = (await response.json()) as Partial<ChiefOfStaffSteeringSubmissionResult>;
  } catch {
    failSteeringClosed(
      dependencies,
      "contract_mismatch",
      dependencies.traceId,
      requestId,
      profileMode,
      undefined,
      blockedEffects,
      {
        targetMetadata,
        recommendationType,
      },
    );
  }
  if (
    !hasRequiredBridgeResponseFields(payload, "chief_of_staff_steering") ||
    !isGovernanceDecision(payload.governanceDecision) ||
    !isTraceEnvelope(payload.traceEnvelope) ||
    !isAuditEnvelope(payload.auditEnvelope) ||
    !envelopesMatchDecision(payload.governanceDecision, payload.traceEnvelope, payload.auditEnvelope) ||
    hasForbiddenSteeringSideEffectClaim(payload as Partial<ChiefOfStaffSteeringSubmissionResult> & Record<string, unknown>)
  ) {
    failSteeringClosed(
      dependencies,
      "contract_mismatch",
      dependencies.traceId,
      requestId,
      profileMode,
      undefined,
      blockedEffects,
      {
        targetMetadata,
        recommendationType,
      },
    );
  }

  if (payload.governanceDecision.outcome === "deny" || payload.governanceDecision.outcome === "no_go") {
    failSteeringClosed(
      dependencies,
      payload.governanceDecision.outcome === "deny" ? "governance_denied" : "governance_no_go",
      dependencies.traceId,
      payload.governanceDecision.request_id,
      profileMode,
      response.status,
      payload.governanceDecision.blocked_effects,
      {
        governanceReferences: {
          decisionId: payload.governanceDecision.decision_id,
          auditId: payload.auditEnvelope.audit_id,
          governanceOutcome: payload.governanceDecision.outcome,
        },
        targetMetadata,
        recommendationType,
      },
    );
  }

  emitSteeringEvent(dependencies, "capability_recommendation_send_completed", {
    traceId: dependencies.traceId,
    requestId,
    proposalId: evolutionProposal.proposal_id,
    recommendationType,
    decisionId: payload.governanceDecision.decision_id,
    auditId: payload.auditEnvelope.audit_id,
    outcome: payload.governanceDecision.outcome,
    appliedLocally: false,
    approvalCaptured: false,
    memoryWritePerformed: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    ...targetMetadata,
  });

  return {
    text: payload.text ?? "Napoleon accepted the evolution proposal for governed review.",
    governanceDecision: payload.governanceDecision,
    traceEnvelope: payload.traceEnvelope,
    auditEnvelope: payload.auditEnvelope,
    appliedLocally: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
  };
}
