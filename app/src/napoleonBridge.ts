import type { NapoleonDelegation, NapoleonRecommendationProvenance, NapoleonRequest, NapoleonResponse } from "./types";
import { resolveNapoleonBridgeOperation } from "./bridgeEndpoint.js";
import { getBridgeOperation, type BridgeOperation, type BridgeOperationId } from "./bridgeOperations.js";
import { hasRequiredBridgeResponseFields } from "./bridgeResponseRequirements.js";
import { hasForbiddenSideEffectTextClaim } from "./bridgeSideEffectClaims.js";
import { readConfiguredAuthTokenFromStorage, readConfiguredEndpointFromStorage } from "./connectionStorage.js";
import {
  buildDescriptorConnectionState,
  buildTextTurnContract,
  descriptorSupportsGovernedHandoff,
  type DescriptorConnectionInput,
  type DescriptorFailClosedReason,
  type AuditEnvelope,
  type GovernanceDecision,
  type TraceEnvelope,
} from "./contractBridge.js";
import { emitEvent, makeTelemetryPayload, type TelemetryPayload } from "./telemetry.js";

type BridgeFetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}>;

const FORBIDDEN_DELEGATION_ALLOWED_EFFECTS = new Set([
  "agent_dispatch",
  "approval_capture",
  "audit_append",
  "command_execution",
  "event_publication",
  "external_send",
  "graph_write",
  "memory_write",
  "registry_runtime_activation",
  "remediation",
  "runtime_authority",
  "service_control",
  "task_routing",
]);

export interface BridgeContractEvidence {
  kind: "bridge_contract_evidence";
  operationId: BridgeOperationId;
  requestKind: string;
  transport: BridgeOperation["transport"];
  status: "success" | "fail_closed";
  reason?: NapoleonBridgeFailureReason;
  httpStatus?: number;
  targetPath: string;
  traceId: string;
  requestId: string;
  decisionId?: string;
  auditId?: string;
  governanceOutcome?: string;
  descriptorFailureReason?: DescriptorFailClosedReason;
  descriptorStatus: string;
  profileMode: string;
  runtimeValidationSource?: "real_runtime" | "local_harness" | "local_simulation";
  selectedAgentIds?: string[];
  allowedEffects?: string[];
  blockedEffects?: string[];
  provenanceVerified: boolean;
  traceEnvelopeObserved?: boolean;
  traceEnvelopeMatched?: boolean;
  traceTargetPath?: "/cos/trace/{trace_id}";
}

interface BridgeEvidenceContext {
  operationId: BridgeOperationId;
  requestKind: string;
  traceId: string;
  requestId: string;
  decisionId?: string;
  auditId?: string;
  governanceOutcome?: string;
  descriptorFailureReason?: DescriptorFailClosedReason;
  descriptorStatus: string;
  profileMode: string;
  targetPath?: string;
  blockedEffects?: string[];
  provenanceVerified?: boolean;
}

function bridgeTargetTelemetryAttributes(evidenceContext?: BridgeEvidenceContext): Record<string, unknown> {
  if (!evidenceContext?.targetPath) return {};
  return {
    bridgeTargetPath: evidenceContext.targetPath,
    bridgeTargetOperation: evidenceContext.operationId,
    bridgeTargetRequestKind: evidenceContext.requestKind,
  };
}

interface BridgeDependencies {
  getEndpoint?: () => string | null;
  getAuthToken?: () => string | null;
  descriptorConnection?: DescriptorConnectionInput;
  emit?: (payload: TelemetryPayload) => void;
  captureEvidence?: (record: BridgeContractEvidence) => void;
  fetch?: BridgeFetch;
}

export type NapoleonBridgeFailureReason =
  | "no_endpoint"
  | "missing_descriptor"
  | "descriptor_mismatch"
  | "auth_failure"
  | "contract_mismatch"
  | "governance_denied"
  | "governance_no_go"
  | "bridge_timeout"
  | "http_failure";

export function descriptorFailClosedReasonToBridgeFailure(
  reason?: DescriptorFailClosedReason,
): NapoleonBridgeFailureReason {
  if (reason === "auth_failure" || reason === "bridge_timeout" || reason === "http_failure") return reason;
  if (reason === "no_endpoint") return "no_endpoint";
  if (reason === "no_descriptor") return "missing_descriptor";
  return "descriptor_mismatch";
}

export interface NapoleonBridgeFailureMetadata {
  decisionId?: string;
  auditId?: string;
  governanceOutcome?: string;
  descriptorFailureReason?: DescriptorFailClosedReason;
  profileMode?: string;
}

export class NapoleonBridgeError extends Error {
  reason: NapoleonBridgeFailureReason;
  status?: number;
  traceId: string;
  requestId: string;
  blockedEffects: string[];
  decisionId?: string;
  auditId?: string;
  governanceOutcome?: string;
  descriptorFailureReason?: DescriptorFailClosedReason;
  profileMode?: string;

  constructor(
    reason: NapoleonBridgeFailureReason,
    traceId: string,
    requestId: string,
    status?: number,
    blockedEffects: string[] = [],
    metadata: NapoleonBridgeFailureMetadata = {},
  ) {
    super(`Napoleon bridge fail-closed: ${reason}${status ? ` (${status})` : ""}`);
    this.name = "NapoleonBridgeError";
    this.reason = reason;
    this.status = status;
    this.traceId = traceId;
    this.requestId = requestId;
    this.blockedEffects = blockedEffects;
    this.decisionId = metadata.decisionId;
    this.auditId = metadata.auditId;
    this.governanceOutcome = metadata.governanceOutcome;
    this.descriptorFailureReason = metadata.descriptorFailureReason;
    this.profileMode = metadata.profileMode;
  }
}

function emitBridgeEvent(dependencies: BridgeDependencies, event: string, attributes: Record<string, unknown>) {
  if (dependencies.emit) {
    dependencies.emit(makeTelemetryPayload(event, attributes));
    return;
  }
  emitEvent(event, attributes);
}

function captureBridgeEvidence(dependencies: BridgeDependencies, record: BridgeContractEvidence) {
  dependencies.captureEvidence?.(record);
}

function buildFailClosedEvidence(
  reason: NapoleonBridgeFailureReason,
  status: number | undefined,
  evidenceContext: BridgeEvidenceContext,
): BridgeContractEvidence {
  const record: BridgeContractEvidence = {
    kind: "bridge_contract_evidence",
    operationId: evidenceContext.operationId,
    requestKind: evidenceContext.requestKind,
    transport: getBridgeOperation(evidenceContext.operationId).transport,
    status: "fail_closed",
    reason,
    httpStatus: status,
    targetPath: evidenceContext.targetPath ?? getBridgeOperation(evidenceContext.operationId).path,
    traceId: evidenceContext.traceId,
    requestId: evidenceContext.requestId,
    descriptorStatus: evidenceContext.descriptorStatus,
    profileMode: evidenceContext.profileMode,
    provenanceVerified: evidenceContext.provenanceVerified ?? false,
  };
  if (evidenceContext.decisionId) record.decisionId = evidenceContext.decisionId;
  if (evidenceContext.auditId) record.auditId = evidenceContext.auditId;
  if (evidenceContext.governanceOutcome) record.governanceOutcome = evidenceContext.governanceOutcome;
  if (evidenceContext.descriptorFailureReason) record.descriptorFailureReason = evidenceContext.descriptorFailureReason;
  if (evidenceContext.blockedEffects) record.blockedEffects = evidenceContext.blockedEffects;
  return record;
}

function getConfiguredEndpoint(dependencies: BridgeDependencies): string | null {
  if (dependencies.getEndpoint) return dependencies.getEndpoint();
  return readConfiguredEndpointFromStorage();
}

function getConfiguredAuthToken(dependencies: BridgeDependencies): string | null {
  if (dependencies.getAuthToken) return dependencies.getAuthToken();
  if (dependencies.getEndpoint) return null;
  return readConfiguredAuthTokenFromStorage();
}

function buildBridgeHeaders(authToken: string | null): Record<string, string> {
  return authToken ? { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` } : { "Content-Type": "application/json" };
}

function buildAdvisoryHarnessHeaders(authToken: string | null): Record<string, string> {
  return authToken
    ? { "Content-Type": "application/json", "X-Napoleon-Auth": authToken }
    : { "Content-Type": "application/json" };
}

function resolveAdvisoryHarnessTextTurnEndpoint(endpoint: string): string | null {
  const normalized = endpoint.trim().split(/[?#]/, 1)[0].replace(/\/+$/, "");
  if (normalized.endsWith("/cos/text-turn")) return normalized;
  if (normalized.endsWith("/cos/descriptor") || normalized.endsWith("/cos/capabilities")) {
    return normalized.replace(/\/cos\/(?:descriptor|capabilities)$/, "/cos/text-turn");
  }
  if (normalized.endsWith("/cos")) return `${normalized}/text-turn`;
  return null;
}

function normalizeAdvisoryHarnessTextTurnEndpoint(endpoint: string): string {
  return endpoint.trim().split(/[?#]/, 1)[0].replace(/\/+$/, "");
}

function buildAdvisoryHarnessTraceEndpoint(textTurnEndpoint: string, traceId: string): string {
  const normalized = normalizeAdvisoryHarnessTextTurnEndpoint(textTurnEndpoint);
  const base = normalized.replace(/\/cos\/text-turn$/, "");
  return `${base}/cos/trace/${encodeURIComponent(traceId)}`;
}

function isAdvisoryHarnessTraceEnvelope(value: unknown, traceId: string): boolean {
  return Boolean(value && typeof value === "object" && (value as { trace_id?: unknown }).trace_id === traceId);
}

function buildAdvisoryHarnessTextTurnRequest(
  request: NapoleonRequest,
  contract: ReturnType<typeof buildTextTurnContract>,
): Record<string, unknown> {
  return {
    request_id: contract.chiefOfStaffRequest.request_id,
    profile_mode: contract.profileMode,
    contract_version: "napoleon/concierge/text-turn/v1",
    requested_capability: "governance_review",
    user_text: request.message,
    requested_effects: [],
    authority_tier: "advisory_prepare_only",
    approval_requirement: contract.governanceDecision.approval_requirement,
    blocked_effects: contract.blockedEffects,
    source_evidence: contract.sourceEvidence,
    actor_id: contract.actorId,
    trace_id: request.traceId,
  };
}

function isGovernanceDecision(value: unknown): value is GovernanceDecision {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GovernanceDecision>;
  return Boolean(
    candidate.decision_id &&
      candidate.request_id &&
      candidate.outcome &&
      candidate.authority_tier &&
      candidate.approval_requirement &&
      candidate.trace_id &&
      candidate.audit_id &&
      Array.isArray(candidate.blocked_effects),
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

function requiresReview(decision: GovernanceDecision): boolean {
  return decision.outcome === "requires_review" || decision.outcome === "no_go";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNapoleonDelegation(value: unknown): value is NapoleonDelegation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<NapoleonDelegation>;
  const selectedAgents = candidate.selectedAgents;
  return Boolean(
    Array.isArray(selectedAgents) &&
      selectedAgents.every(
        (agent) =>
          agent &&
          typeof agent === "object" &&
          typeof agent.agentId === "string" &&
          typeof agent.displayName === "string" &&
          typeof agent.selectionReason === "string" &&
          (agent.contributionSummary === undefined || typeof agent.contributionSummary === "string"),
      ) &&
      isStringArray(candidate.allowedEffects) &&
      isStringArray(candidate.blockedEffects) &&
      typeof candidate.governanceState === "string" &&
      typeof candidate.traceId === "string" &&
      typeof candidate.auditId === "string",
  );
}

function hasForbiddenDelegationAllowedEffects(allowedEffects: string[]): boolean {
  return allowedEffects.some((effect) => FORBIDDEN_DELEGATION_ALLOWED_EFFECTS.has(effect.trim().toLocaleLowerCase()));
}

function advisoryHarnessClaimsRuntimeInvocation(delegationPlan: Record<string, unknown>): boolean {
  const candidateAgents = Array.isArray(delegationPlan.candidate_agents) ? delegationPlan.candidate_agents : [];
  return candidateAgents.some(
    (agent) => Boolean(agent && typeof agent === "object" && (agent as Record<string, unknown>).runtime_invoked === true),
  );
}

function isNapoleonRecommendationProvenance(value: unknown): value is NapoleonRecommendationProvenance {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<NapoleonRecommendationProvenance>;
  return Boolean(
    typeof candidate.summary === "string" &&
      candidate.summary.trim() &&
      typeof candidate.traceId === "string" &&
      typeof candidate.auditId === "string",
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

function delegationMatchesProvenance(
  delegation: NapoleonDelegation,
  decision: GovernanceDecision,
  traceEnvelope: TraceEnvelope,
  auditEnvelope: AuditEnvelope,
): boolean {
  return (
    delegation.traceId === traceEnvelope.trace_id &&
    delegation.traceId === decision.trace_id &&
    delegation.auditId === auditEnvelope.audit_id &&
    delegation.auditId === decision.audit_id &&
    delegation.governanceState === decision.outcome
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ATTRIBUTION_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "for",
  "found",
  "in",
  "is",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "were",
  "with",
]);

const SELECTED_AGENT_ATTRIBUTION_VERBS = [
  "assessed",
  "concluded",
  "confirmed",
  "found",
  "identified",
  "recommended",
  "reported",
  "surfaced",
  "verified",
];

const SELECTED_AGENT_ATTRIBUTION_VERB_PATTERN = SELECTED_AGENT_ATTRIBUTION_VERBS.map(escapeRegExp).join("|");

function normalizeAttributionText(value: string): string {
  return attributionTokens(value).join(" ");
}

function attributionTokens(value: string): string[] {
  return value
    .toLocaleLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((token) => token.length > 2 && !ATTRIBUTION_STOP_WORDS.has(token)) ?? [];
}

function extractSelectedAgentFindingClaim(text: string, displayName: string): string | null {
  const pattern = new RegExp(
    `\\b${escapeRegExp(displayName)}\\s+(?:${SELECTED_AGENT_ATTRIBUTION_VERB_PATTERN})\\b([^.!?]*)`,
    "i",
  );
  const match = text.match(pattern);
  if (!match) return null;
  const claim = match[1]?.trim();
  return claim ? claim : null;
}

function extractAgentStyleFindingClaims(text: string): Array<{ displayName: string; claim: string }> {
  const pattern = new RegExp(
    `\\b([A-Z][A-Za-z0-9]*(?:\\s+[A-Z][A-Za-z0-9]*){1,4})\\s+(?:${SELECTED_AGENT_ATTRIBUTION_VERB_PATTERN})\\b([^.!?]*)`,
    "g",
  );
  const claims: Array<{ displayName: string; claim: string }> = [];
  for (const match of text.matchAll(pattern)) {
    const displayName = match[1]?.trim();
    const claim = match[2]?.trim();
    if (displayName && claim) claims.push({ displayName, claim });
  }
  return claims;
}

function contributionMatchesFindingClaim(contributionSummary: string, claim: string): boolean {
  const normalizedContribution = normalizeAttributionText(contributionSummary);
  const normalizedClaim = normalizeAttributionText(claim);
  if (!normalizedContribution || !normalizedClaim) return false;
  return normalizedContribution.includes(normalizedClaim) || normalizedClaim.includes(normalizedContribution);
}

function hasUnprovenSelectedAgentAttribution(text: string | undefined, delegation: NapoleonDelegation | undefined): boolean {
  if (!text) return false;
  const protectedAgentNames = [
    "Passive Brain",
    ...(delegation?.selectedAgents.map((agent) => agent.displayName).filter((displayName) => displayName.trim()) ?? []),
  ];
  const directClaims = [
    ...protectedAgentNames
      .map((displayName) => ({ displayName, claim: extractSelectedAgentFindingClaim(text, displayName) }))
      .filter((item): item is { displayName: string; claim: string } => Boolean(item.claim)),
    ...extractAgentStyleFindingClaims(text),
  ];
  const uniqueClaims = new Map<string, { displayName: string; claim: string }>();
  for (const item of directClaims) uniqueClaims.set(`${item.displayName}\u0000${item.claim}`, item);
  return [...uniqueClaims.values()].some(({ displayName, claim }) => {
    const agent = delegation?.selectedAgents.find((candidate) => candidate.displayName === displayName);
    return !agent?.contributionSummary || !contributionMatchesFindingClaim(agent.contributionSummary, claim);
  });
}

function recommendationMatchesProvenance(
  text: string | undefined,
  recommendationProvenance: NapoleonRecommendationProvenance | undefined,
  decision: GovernanceDecision,
  traceEnvelope: TraceEnvelope,
  auditEnvelope: AuditEnvelope,
): boolean {
  if (!text || !recommendationProvenance) return false;
  return (
    recommendationProvenance.traceId === traceEnvelope.trace_id &&
    recommendationProvenance.traceId === decision.trace_id &&
    recommendationProvenance.auditId === auditEnvelope.audit_id &&
    recommendationProvenance.auditId === decision.audit_id &&
    text.toLocaleLowerCase().includes(recommendationProvenance.summary.toLocaleLowerCase())
  );
}

function recommendationProvenanceMatchesEnvelopes(
  recommendationProvenance: NapoleonRecommendationProvenance,
  decision: GovernanceDecision,
  traceEnvelope: TraceEnvelope,
  auditEnvelope: AuditEnvelope,
): boolean {
  return (
    recommendationProvenance.traceId === traceEnvelope.trace_id &&
    recommendationProvenance.traceId === decision.trace_id &&
    recommendationProvenance.auditId === auditEnvelope.audit_id &&
    recommendationProvenance.auditId === decision.audit_id
  );
}

function hasUnprovenNapoleonRecommendationAttribution(
  text: string | undefined,
  recommendationProvenance: NapoleonRecommendationProvenance | undefined,
  decision: GovernanceDecision,
  traceEnvelope: TraceEnvelope,
  auditEnvelope: AuditEnvelope,
): boolean {
  if (!text || !/\bNapoleon\s+recommends\b/i.test(text)) return false;
  return !recommendationMatchesProvenance(text, recommendationProvenance, decision, traceEnvelope, auditEnvelope);
}

function hasForbiddenTextTurnSideEffectClaim(payload: Partial<NapoleonResponse> & Record<string, unknown>): boolean {
  const forbiddenFalseFields = [
    "memoryWritePerformed",
    "approvalCaptured",
    "externalSendPerformed",
    "agentDispatchPerformed",
    "appliedLocally",
  ];
  if (forbiddenFalseFields.some((field) => payload[field] !== undefined && payload[field] !== false)) {
    return true;
  }

  return hasForbiddenSideEffectTextClaim(payload.text);
}

function mapAdvisoryHarnessAuthorityTier(value: unknown): GovernanceDecision["authority_tier"] {
  if (
    value === "metadata_only" ||
    value === "advisory_review" ||
    value === "prepare_only" ||
    value === "approval_required" ||
    value === "prohibited"
  ) {
    return value;
  }
  return "advisory_review";
}

function isAdvisoryHarnessResponse(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return Boolean(
    typeof candidate.schema_version === "string" &&
      typeof candidate.status === "string" &&
      typeof candidate.answer === "string" &&
      typeof candidate.trace_id === "string" &&
      typeof candidate.audit_id === "string" &&
      candidate.governance_decision &&
      typeof candidate.governance_decision === "object" &&
      candidate.delegation_plan &&
      typeof candidate.delegation_plan === "object" &&
      isStringArray(candidate.blocked_effects),
  );
}

function adaptAdvisoryHarnessResponse(
  payload: unknown,
  request: NapoleonRequest,
  contract: ReturnType<typeof buildTextTurnContract>,
): NapoleonResponse | null {
  if (!isAdvisoryHarnessResponse(payload)) return null;
  const governance = payload.governance_decision as Record<string, unknown>;
  const delegationPlan = payload.delegation_plan as Record<string, unknown>;
  if (
    (isStringArray(delegationPlan.allowed_effects) &&
      hasForbiddenDelegationAllowedEffects(delegationPlan.allowed_effects)) ||
    advisoryHarnessClaimsRuntimeInvocation(delegationPlan)
  ) {
    return null;
  }
  const outcome = governance.decision;
  if (
    outcome !== "allow_prepare_only" &&
    outcome !== "deny" &&
    outcome !== "requires_review" &&
    outcome !== "no_go"
  ) {
    return null;
  }
  const blockedEffects = isStringArray(payload.blocked_effects)
    ? payload.blocked_effects
    : isStringArray(governance.blocked_effects)
      ? governance.blocked_effects
      : contract.blockedEffects;
  const decisionId = `decision_${payload.trace_id}`;
  const governanceDecision: GovernanceDecision = {
    decision_id: decisionId,
    request_id: contract.chiefOfStaffRequest.request_id,
    outcome,
    authority_tier: mapAdvisoryHarnessAuthorityTier(governance.authority_tier),
    approval_requirement:
      outcome === "allow_prepare_only" ? "none_for_prepare_only" : contract.governanceDecision.approval_requirement,
    rationale: typeof governance.reason === "string" ? governance.reason : "Napoleon advisory harness response.",
    blocked_effects: blockedEffects,
    trace_id: String(payload.trace_id),
    audit_id: String(payload.audit_id),
  };
  const traceEnvelope: TraceEnvelope = {
    trace_id: String(payload.trace_id),
    parent_trace_id: request.conversationId,
    actor_id: "napoleon.chief_of_staff",
    request_id: contract.chiefOfStaffRequest.request_id,
    decision_id: decisionId,
    timestamp: new Date(0).toISOString(),
  };
  const auditEnvelope: AuditEnvelope = {
    audit_id: String(payload.audit_id),
    trace_id: String(payload.trace_id),
    decision_id: decisionId,
    actor_id: "napoleon.chief_of_staff",
    authority_tier: governanceDecision.authority_tier,
    approval_requirement: governanceDecision.approval_requirement,
    evidence_links: [`trace:${payload.trace_id}`],
  };
  const candidateAgents = Array.isArray(delegationPlan.candidate_agents) ? delegationPlan.candidate_agents : [];
  const selectedAgents = candidateAgents
    .filter((agent): agent is Record<string, unknown> => Boolean(agent && typeof agent === "object"))
    .map((agent) => ({
      agentId: typeof agent.agent_id === "string" ? agent.agent_id : "napoleon.unknown_agent",
      displayName: typeof agent.display_name === "string" ? agent.display_name : "Napoleon candidate agent",
      selectionReason:
        typeof agent.selection_reason === "string" ? agent.selection_reason : "Napoleon returned candidate delegation.",
      contributionSummary: typeof agent.contribution_summary === "string" ? agent.contribution_summary : undefined,
    }));
  const delegationBlockedEffects = isStringArray(delegationPlan.blocked_effects)
    ? delegationPlan.blocked_effects
    : blockedEffects;
  return {
    text: String(payload.answer),
    profileMode: contract.profileMode,
    governanceDecision,
    traceEnvelope,
    auditEnvelope,
    requiresReview: requiresReview(governanceDecision),
    targetAgent:
      typeof delegationPlan.requested_capability === "string"
        ? delegationPlan.requested_capability
        : "napoleon.chief_of_staff",
    delegation: {
      selectedAgents,
      allowedEffects: ["prepare_advisory_response"],
      blockedEffects: delegationBlockedEffects,
      governanceState: governanceDecision.outcome,
      traceId: traceEnvelope.trace_id,
      auditId: auditEnvelope.audit_id,
    },
  };
}

function failClosed(
  dependencies: BridgeDependencies,
  reason: NapoleonBridgeFailureReason,
  traceId: string,
  requestId: string,
  status?: number,
  evidenceContext?: BridgeEvidenceContext,
): never {
  if (evidenceContext) {
    captureBridgeEvidence(dependencies, buildFailClosedEvidence(reason, status, evidenceContext));
  }
  const failureAttributes: Record<string, unknown> = {
    traceId,
    requestId,
    reason,
    status,
    profileMode: evidenceContext?.profileMode,
    blockedEffects: evidenceContext?.blockedEffects ?? [],
  };
  if (evidenceContext?.decisionId) failureAttributes.decisionId = evidenceContext.decisionId;
  if (evidenceContext?.auditId) failureAttributes.auditId = evidenceContext.auditId;
  if (evidenceContext?.governanceOutcome) failureAttributes.governanceOutcome = evidenceContext.governanceOutcome;
  if (evidenceContext?.descriptorFailureReason) {
    failureAttributes.descriptorFailureReason = evidenceContext.descriptorFailureReason;
  }
  Object.assign(failureAttributes, bridgeTargetTelemetryAttributes(evidenceContext));
  emitBridgeEvent(dependencies, "bridge_request_failed", failureAttributes);
  throw new NapoleonBridgeError(reason, traceId, requestId, status, evidenceContext?.blockedEffects ?? [], {
    decisionId: evidenceContext?.decisionId,
    auditId: evidenceContext?.auditId,
    governanceOutcome: evidenceContext?.governanceOutcome,
    descriptorFailureReason: evidenceContext?.descriptorFailureReason,
    profileMode: evidenceContext?.profileMode,
  });
}

export async function sendToNapoleon(
  request: NapoleonRequest,
  dependencies: BridgeDependencies = {},
): Promise<NapoleonResponse> {
  const contract = buildTextTurnContract({
    message: request.message,
    profile: request.profile,
    conversationId: request.conversationId,
    turnId: request.turnId,
    traceId: request.traceId,
  });
  const endpoint = getConfiguredEndpoint(dependencies);
  const authToken = getConfiguredAuthToken(dependencies);
  const advisoryHarnessTextTurnEndpoint = endpoint ? resolveAdvisoryHarnessTextTurnEndpoint(endpoint) : null;
  const advisoryHarnessMode = Boolean(advisoryHarnessTextTurnEndpoint);
  const textTurnOperation = getBridgeOperation("text_turn");
  const targetPath = advisoryHarnessMode ? "/cos/text-turn" : textTurnOperation.path;
  const descriptorConnection = buildDescriptorConnectionState(
    dependencies.descriptorConnection ?? {
      endpointConfigured: Boolean(endpoint),
      descriptor: null,
    },
  );
  const evidenceContext: BridgeEvidenceContext = {
    operationId: "text_turn",
    requestKind: "text_turn",
    traceId: request.traceId,
    requestId: contract.chiefOfStaffRequest.request_id,
    descriptorStatus: descriptorConnection.state,
    descriptorFailureReason: descriptorConnection.failClosedReason,
    profileMode: contract.profileMode,
    blockedEffects: contract.blockedEffects,
    targetPath,
  };
  emitBridgeEvent(dependencies, "bridge_request_started", {
    traceId: request.traceId,
    profile: request.profile,
    profileMode: contract.profileMode,
    channel: request.channel,
    requestId: contract.chiefOfStaffRequest.request_id,
    ...bridgeTargetTelemetryAttributes(evidenceContext),
  });

  if (!endpoint) {
    failClosed(dependencies, "no_endpoint", request.traceId, contract.chiefOfStaffRequest.request_id, undefined, evidenceContext);
  }

  if (!descriptorConnection.canAttemptLiveBridge) {
    failClosed(
      dependencies,
      descriptorFailClosedReasonToBridgeFailure(descriptorConnection.failClosedReason),
      request.traceId,
      contract.chiefOfStaffRequest.request_id,
      undefined,
      evidenceContext,
    );
  }

  if (!descriptorSupportsGovernedHandoff(descriptorConnection, "text_turn")) {
    evidenceContext.descriptorFailureReason = "descriptor_invalid";
    failClosed(
      dependencies,
      "descriptor_mismatch",
      request.traceId,
      contract.chiefOfStaffRequest.request_id,
      undefined,
      evidenceContext,
    );
  }

  if (contract.governanceDecision.outcome === "no_go") {
    failClosed(
      dependencies,
      "governance_no_go",
      request.traceId,
      contract.chiefOfStaffRequest.request_id,
      undefined,
      evidenceContext,
    );
  }

  const targetEndpoint = advisoryHarnessTextTurnEndpoint
    ? normalizeAdvisoryHarnessTextTurnEndpoint(advisoryHarnessTextTurnEndpoint)
    : resolveNapoleonBridgeOperation(endpoint, "text_turn");
  const fetcher = dependencies.fetch ?? globalThis.fetch.bind(globalThis);
  let response: Awaited<ReturnType<BridgeFetch>>;
  try {
    response = await fetcher(targetEndpoint, {
      method: "POST",
      headers: advisoryHarnessMode ? buildAdvisoryHarnessHeaders(authToken) : buildBridgeHeaders(authToken),
      body: JSON.stringify(
        advisoryHarnessMode
          ? buildAdvisoryHarnessTextTurnRequest(request, contract)
          : {
              requestKind: "text_turn",
              ...request,
              profileMode: contract.profileMode,
              descriptorStatus: descriptorConnection.descriptorStatus,
              descriptorConnection,
              chiefOfStaffRequest: contract.chiefOfStaffRequest,
              governanceRequest: contract.governanceRequest,
              traceEnvelope: contract.traceEnvelope,
              auditEnvelope: contract.auditEnvelope,
              blockedEffects: contract.blockedEffects,
              sourceEvidence: contract.sourceEvidence,
            },
      ),
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError" ? "bridge_timeout" : "http_failure";
    failClosed(dependencies, reason, request.traceId, contract.chiefOfStaffRequest.request_id, undefined, evidenceContext);
  }

  if (!response.ok) {
    const reason = response.status === 401 || response.status === 403 ? "auth_failure" : "http_failure";
    failClosed(dependencies, reason, request.traceId, contract.chiefOfStaffRequest.request_id, response.status, evidenceContext);
  }

  let payload: Partial<NapoleonResponse>;
  try {
    payload = (await response.json()) as Partial<NapoleonResponse>;
  } catch {
    failClosed(dependencies, "contract_mismatch", request.traceId, contract.chiefOfStaffRequest.request_id, response.status, evidenceContext);
  }
  if (advisoryHarnessMode) {
    const adapted = adaptAdvisoryHarnessResponse(payload, request, contract);
    if (!adapted) {
      failClosed(dependencies, "contract_mismatch", request.traceId, contract.chiefOfStaffRequest.request_id, response.status, evidenceContext);
    }
    if (
      hasForbiddenTextTurnSideEffectClaim(adapted as Partial<NapoleonResponse> & Record<string, unknown>) ||
      hasUnprovenSelectedAgentAttribution(adapted.text, adapted.delegation) ||
      hasUnprovenNapoleonRecommendationAttribution(
        adapted.text,
        adapted.recommendationProvenance,
        adapted.governanceDecision,
        adapted.traceEnvelope,
        adapted.auditEnvelope,
      )
    ) {
      failClosed(dependencies, "contract_mismatch", request.traceId, contract.chiefOfStaffRequest.request_id, response.status, evidenceContext);
    }
    if (adapted.governanceDecision.outcome === "deny" || adapted.governanceDecision.outcome === "no_go") {
      failClosed(
        dependencies,
        adapted.governanceDecision.outcome === "deny" ? "governance_denied" : "governance_no_go",
        request.traceId,
        adapted.governanceDecision.request_id,
        response.status,
        {
          ...evidenceContext,
          requestId: adapted.governanceDecision.request_id,
          decisionId: adapted.governanceDecision.decision_id,
          auditId: adapted.auditEnvelope.audit_id,
          governanceOutcome: adapted.governanceDecision.outcome,
          blockedEffects: adapted.governanceDecision.blocked_effects,
        },
      );
    }
    let traceEnvelopeObserved = false;
    let traceEnvelopeMatched = false;
    try {
      const traceResponse = await fetcher(buildAdvisoryHarnessTraceEndpoint(targetEndpoint, adapted.traceEnvelope.trace_id), {
        method: "GET",
        headers: buildAdvisoryHarnessHeaders(authToken),
      });
      if (!traceResponse.ok) {
        failClosed(dependencies, "contract_mismatch", request.traceId, adapted.governanceDecision.request_id, traceResponse.status, {
          ...evidenceContext,
          requestId: adapted.governanceDecision.request_id,
          decisionId: adapted.governanceDecision.decision_id,
          auditId: adapted.auditEnvelope.audit_id,
          governanceOutcome: adapted.governanceDecision.outcome,
          blockedEffects: adapted.governanceDecision.blocked_effects,
        });
      }
      const tracePayload = await traceResponse.json();
      traceEnvelopeObserved = true;
      traceEnvelopeMatched = isAdvisoryHarnessTraceEnvelope(tracePayload, adapted.traceEnvelope.trace_id);
      if (!traceEnvelopeMatched) {
        failClosed(dependencies, "contract_mismatch", request.traceId, adapted.governanceDecision.request_id, traceResponse.status, {
          ...evidenceContext,
          requestId: adapted.governanceDecision.request_id,
          decisionId: adapted.governanceDecision.decision_id,
          auditId: adapted.auditEnvelope.audit_id,
          governanceOutcome: adapted.governanceDecision.outcome,
          blockedEffects: adapted.governanceDecision.blocked_effects,
        });
      }
    } catch (error) {
      if (error instanceof NapoleonBridgeError) throw error;
      const reason = error instanceof Error && error.name === "AbortError" ? "bridge_timeout" : "contract_mismatch";
      failClosed(dependencies, reason, request.traceId, adapted.governanceDecision.request_id, undefined, {
        ...evidenceContext,
        requestId: adapted.governanceDecision.request_id,
        decisionId: adapted.governanceDecision.decision_id,
        auditId: adapted.auditEnvelope.audit_id,
        governanceOutcome: adapted.governanceDecision.outcome,
        blockedEffects: adapted.governanceDecision.blocked_effects,
      });
    }
    emitBridgeEvent(dependencies, "bridge_request_completed", {
      traceId: request.traceId,
      mode: "http",
      outcome: adapted.governanceDecision.outcome,
      decisionId: adapted.governanceDecision.decision_id,
      auditId: adapted.auditEnvelope.audit_id,
      ...bridgeTargetTelemetryAttributes(evidenceContext),
    });
    captureBridgeEvidence(dependencies, {
      kind: "bridge_contract_evidence",
      operationId: "text_turn",
      requestKind: "text_turn",
      transport: textTurnOperation.transport,
      status: "success",
      httpStatus: response.status ?? 202,
      targetPath,
      traceId: request.traceId,
      requestId: adapted.governanceDecision.request_id,
      decisionId: adapted.governanceDecision.decision_id,
      auditId: adapted.auditEnvelope.audit_id,
      governanceOutcome: adapted.governanceDecision.outcome,
      descriptorStatus: descriptorConnection.state,
      profileMode: adapted.profileMode,
      selectedAgentIds: adapted.delegation?.selectedAgents.map((agent) => agent.agentId) ?? [],
      allowedEffects: adapted.delegation?.allowedEffects ?? [],
      blockedEffects: adapted.delegation?.blockedEffects ?? adapted.governanceDecision.blocked_effects,
      provenanceVerified: true,
      traceEnvelopeObserved,
      traceEnvelopeMatched,
      traceTargetPath: "/cos/trace/{trace_id}",
    });
    return adapted;
  }
  if (!hasRequiredBridgeResponseFields(payload, textTurnOperation.id)) {
    failClosed(dependencies, "contract_mismatch", request.traceId, contract.chiefOfStaffRequest.request_id, response.status, evidenceContext);
  }
  if (!isGovernanceDecision(payload.governanceDecision)) {
    failClosed(dependencies, "contract_mismatch", request.traceId, contract.chiefOfStaffRequest.request_id, response.status, evidenceContext);
  }

  const decision = payload.governanceDecision;
  if (!isTraceEnvelope(payload.traceEnvelope) || !isAuditEnvelope(payload.auditEnvelope)) {
    failClosed(dependencies, "contract_mismatch", request.traceId, contract.chiefOfStaffRequest.request_id, response.status, evidenceContext);
  }

  const traceEnvelope = payload.traceEnvelope;
  const auditEnvelope = payload.auditEnvelope;
  if (!envelopesMatchDecision(decision, traceEnvelope, auditEnvelope)) {
    failClosed(dependencies, "contract_mismatch", request.traceId, contract.chiefOfStaffRequest.request_id, response.status, evidenceContext);
  }
  if (payload.profileMode !== undefined && payload.profileMode !== contract.profileMode) {
    failClosed(dependencies, "contract_mismatch", request.traceId, contract.chiefOfStaffRequest.request_id, response.status, evidenceContext);
  }
  if (hasForbiddenTextTurnSideEffectClaim(payload as Partial<NapoleonResponse> & Record<string, unknown>)) {
    failClosed(dependencies, "contract_mismatch", request.traceId, contract.chiefOfStaffRequest.request_id, response.status, evidenceContext);
  }

  if (decision.outcome === "deny" || decision.outcome === "no_go") {
    failClosed(
      dependencies,
      decision.outcome === "deny" ? "governance_denied" : "governance_no_go",
      request.traceId,
      decision.request_id,
      response.status,
      {
        ...evidenceContext,
        requestId: decision.request_id,
        decisionId: decision.decision_id,
        auditId: decision.audit_id,
        governanceOutcome: decision.outcome,
        blockedEffects: decision.blocked_effects,
      },
    );
  }

  const delegation =
    payload.delegation === undefined
      ? undefined
      : isNapoleonDelegation(payload.delegation) &&
          delegationMatchesProvenance(payload.delegation, decision, traceEnvelope, auditEnvelope)
        ? payload.delegation
        : null;
  if (delegation === null) {
    failClosed(dependencies, "contract_mismatch", request.traceId, contract.chiefOfStaffRequest.request_id, response.status, evidenceContext);
  }
  if (delegation && hasForbiddenDelegationAllowedEffects(delegation.allowedEffects)) {
    failClosed(dependencies, "contract_mismatch", request.traceId, contract.chiefOfStaffRequest.request_id, response.status, evidenceContext);
  }
  if (hasUnprovenSelectedAgentAttribution(payload.text, delegation)) {
    failClosed(dependencies, "contract_mismatch", request.traceId, contract.chiefOfStaffRequest.request_id, response.status, evidenceContext);
  }
  const recommendationProvenance =
    payload.recommendationProvenance === undefined
      ? undefined
      : isNapoleonRecommendationProvenance(payload.recommendationProvenance)
        ? payload.recommendationProvenance
        : null;
  if (
    recommendationProvenance === null ||
    (recommendationProvenance &&
      !recommendationMatchesProvenance(payload.text, recommendationProvenance, decision, traceEnvelope, auditEnvelope))
  ) {
    failClosed(dependencies, "contract_mismatch", request.traceId, contract.chiefOfStaffRequest.request_id, response.status, evidenceContext);
  }
  if (
    hasUnprovenNapoleonRecommendationAttribution(
      payload.text,
      recommendationProvenance ?? undefined,
      decision,
      traceEnvelope,
      auditEnvelope,
    )
  ) {
    failClosed(dependencies, "contract_mismatch", request.traceId, contract.chiefOfStaffRequest.request_id, response.status, evidenceContext);
  }

  const normalized: NapoleonResponse = {
    text: payload.text ?? "Napoleon returned no response text.",
    profileMode: payload.profileMode ?? contract.profileMode,
    governanceDecision: decision,
    traceEnvelope,
    auditEnvelope,
    requiresReview: requiresReview(decision),
    targetAgent: payload.targetAgent,
    delegation,
    recommendationProvenance: recommendationProvenance ?? undefined,
    stance: payload.stance,
  };

  emitBridgeEvent(dependencies, "bridge_request_completed", {
    traceId: request.traceId,
    mode: "http",
    outcome: normalized.governanceDecision.outcome,
    decisionId: normalized.governanceDecision.decision_id,
    auditId: normalized.auditEnvelope.audit_id,
    ...bridgeTargetTelemetryAttributes(evidenceContext),
  });
  captureBridgeEvidence(dependencies, {
    kind: "bridge_contract_evidence",
    operationId: "text_turn",
    requestKind: "text_turn",
    transport: textTurnOperation.transport,
    status: "success",
    httpStatus: response.status ?? 200,
    targetPath,
    traceId: request.traceId,
    requestId: normalized.governanceDecision.request_id,
    decisionId: normalized.governanceDecision.decision_id,
    auditId: normalized.auditEnvelope.audit_id,
    governanceOutcome: normalized.governanceDecision.outcome,
    descriptorStatus: descriptorConnection.state,
    profileMode: normalized.profileMode,
    selectedAgentIds: normalized.delegation?.selectedAgents.map((agent) => agent.agentId) ?? [],
    allowedEffects: normalized.delegation?.allowedEffects ?? [],
    blockedEffects: normalized.delegation?.blockedEffects ?? normalized.governanceDecision.blocked_effects,
    provenanceVerified: true,
  });
  return normalized;
}
