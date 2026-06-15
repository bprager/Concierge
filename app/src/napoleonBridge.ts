import type { NapoleonDelegation, NapoleonRecommendationProvenance, NapoleonRequest, NapoleonResponse } from "./types";
import { resolveNapoleonBridgeOperation } from "./bridgeEndpoint.js";
import { getBridgeOperation, type BridgeOperation, type BridgeOperationId } from "./bridgeOperations.js";
import {
  buildDescriptorConnectionState,
  buildTextTurnContract,
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
  descriptorStatus: string;
  profileMode: string;
  runtimeValidationSource?: "real_runtime" | "local_harness" | "local_simulation";
  selectedAgentIds?: string[];
  allowedEffects?: string[];
  blockedEffects?: string[];
  provenanceVerified: boolean;
}

interface BridgeEvidenceContext {
  operationId: BridgeOperationId;
  requestKind: string;
  traceId: string;
  requestId: string;
  decisionId?: string;
  auditId?: string;
  governanceOutcome?: string;
  descriptorStatus: string;
  profileMode: string;
  blockedEffects?: string[];
  provenanceVerified?: boolean;
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
  return "descriptor_mismatch";
}

export interface NapoleonBridgeFailureMetadata {
  decisionId?: string;
  auditId?: string;
  governanceOutcome?: string;
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
    targetPath: getBridgeOperation(evidenceContext.operationId).path,
    traceId: evidenceContext.traceId,
    requestId: evidenceContext.requestId,
    descriptorStatus: evidenceContext.descriptorStatus,
    profileMode: evidenceContext.profileMode,
    provenanceVerified: evidenceContext.provenanceVerified ?? false,
  };
  if (evidenceContext.decisionId) record.decisionId = evidenceContext.decisionId;
  if (evidenceContext.auditId) record.auditId = evidenceContext.auditId;
  if (evidenceContext.governanceOutcome) record.governanceOutcome = evidenceContext.governanceOutcome;
  if (evidenceContext.blockedEffects) record.blockedEffects = evidenceContext.blockedEffects;
  return record;
}

function getConfiguredEndpoint(dependencies: BridgeDependencies): string | null {
  if (dependencies.getEndpoint) return dependencies.getEndpoint();
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("napoleon_endpoint");
}

function getConfiguredAuthToken(dependencies: BridgeDependencies): string | null {
  if (dependencies.getAuthToken) return dependencies.getAuthToken();
  if (dependencies.getEndpoint) return null;
  if (typeof localStorage === "undefined") return null;
  const token = localStorage.getItem("napoleon_auth_token");
  return token?.trim() ? token.trim() : null;
}

function buildBridgeHeaders(authToken: string | null): Record<string, string> {
  return authToken ? { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` } : { "Content-Type": "application/json" };
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

function hasUnprovenSelectedAgentAttribution(text: string | undefined, delegation: NapoleonDelegation | undefined): boolean {
  if (!text) return false;
  const protectedAgentNames = ["Passive Brain"];
  return protectedAgentNames.some((displayName) => {
    const claimsFinding = new RegExp(`\\b${escapeRegExp(displayName)}\\s+found\\b`, "i").test(text);
    if (!claimsFinding) return false;
    const agent = delegation?.selectedAgents.find((candidate) => candidate.displayName === displayName);
    return !agent?.contributionSummary;
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

  const text =
    typeof payload.text === "string"
      ? payload.text
          .split(/[.!?;\n]+/)
          .filter((sentence) => !/\b(did not|didn't|does not|has not|have not|not|no)\b/i.test(sentence))
          .join(". ")
      : "";
  return [
    /\b(wrote|written|saved|stored|committed)\s+(?:to\s+)?memory\b/i,
    /\b(captured|recorded)\s+approval\b/i,
    /\b(dispatched|called|ran|invoked)\s+(?:an?\s+)?agent\b/i,
    /\b(applied|implemented)\s+(?:the\s+)?(?:change|proposal|plan|it)\s+locally\b/i,
    /\b(sent|emailed|posted|published|shared|delivered)\b.{0,80}\b(externally|outside|email|message|deployment summary)\b/i,
  ].some((pattern) => pattern.test(text));
}

function hasRequiredResponseFields(payload: unknown, operation: BridgeOperation): boolean {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  return operation.responseRequired.every((field) => record[field] !== undefined);
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
    blockedEffects: evidenceContext?.blockedEffects ?? [],
  };
  if (evidenceContext?.decisionId) failureAttributes.decisionId = evidenceContext.decisionId;
  if (evidenceContext?.auditId) failureAttributes.auditId = evidenceContext.auditId;
  if (evidenceContext?.governanceOutcome) failureAttributes.governanceOutcome = evidenceContext.governanceOutcome;
  emitBridgeEvent(dependencies, "bridge_request_failed", failureAttributes);
  throw new NapoleonBridgeError(reason, traceId, requestId, status, evidenceContext?.blockedEffects ?? [], {
    decisionId: evidenceContext?.decisionId,
    auditId: evidenceContext?.auditId,
    governanceOutcome: evidenceContext?.governanceOutcome,
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
  emitBridgeEvent(dependencies, "bridge_request_started", {
    traceId: request.traceId,
    profile: request.profile,
    profileMode: contract.profileMode,
    channel: request.channel,
    requestId: contract.chiefOfStaffRequest.request_id,
  });

  const endpoint = getConfiguredEndpoint(dependencies);
  const authToken = getConfiguredAuthToken(dependencies);
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
    profileMode: contract.profileMode,
    blockedEffects: contract.blockedEffects,
  };

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

  const targetEndpoint = resolveNapoleonBridgeOperation(endpoint, "text_turn");
  const fetcher = dependencies.fetch ?? globalThis.fetch.bind(globalThis);
  let response: Awaited<ReturnType<BridgeFetch>>;
  try {
    response = await fetcher(targetEndpoint, {
      method: "POST",
      headers: buildBridgeHeaders(authToken),
      body: JSON.stringify({
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
      }),
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError" ? "bridge_timeout" : "http_failure";
    failClosed(dependencies, reason, request.traceId, contract.chiefOfStaffRequest.request_id, undefined, evidenceContext);
  }

  if (!response.ok) {
    const reason = response.status === 401 || response.status === 403 ? "auth_failure" : "http_failure";
    failClosed(dependencies, reason, request.traceId, contract.chiefOfStaffRequest.request_id, response.status, evidenceContext);
  }

  const payload = (await response.json()) as Partial<NapoleonResponse>;
  const textTurnOperation = getBridgeOperation("text_turn");
  if (!hasRequiredResponseFields(payload, textTurnOperation)) {
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
  if (hasUnprovenSelectedAgentAttribution(payload.text, delegation)) {
    failClosed(dependencies, "contract_mismatch", request.traceId, contract.chiefOfStaffRequest.request_id, response.status, evidenceContext);
  }
  const recommendationProvenance =
    payload.recommendationProvenance === undefined
      ? undefined
      : isNapoleonRecommendationProvenance(payload.recommendationProvenance)
        ? payload.recommendationProvenance
        : undefined;
  if (
    hasUnprovenNapoleonRecommendationAttribution(
      payload.text,
      recommendationProvenance,
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
    recommendationProvenance,
    stance: payload.stance,
  };

  emitBridgeEvent(dependencies, "bridge_request_completed", {
    traceId: request.traceId,
    mode: "http",
    outcome: normalized.governanceDecision.outcome,
    decisionId: normalized.governanceDecision.decision_id,
    auditId: normalized.auditEnvelope.audit_id,
  });
  captureBridgeEvidence(dependencies, {
    kind: "bridge_contract_evidence",
    operationId: "text_turn",
    requestKind: "text_turn",
    transport: getBridgeOperation("text_turn").transport,
    status: "success",
    httpStatus: response.status ?? 200,
    targetPath: getBridgeOperation("text_turn").path,
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
