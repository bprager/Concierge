import { buildEvolutionProposalStatusBridgeTarget, getNapoleonReviewOperation } from "./bridgeOperations.js";
import { hasUnsafeReturnedProofIdentifier } from "./bridgeProofValidation.js";
import { readConfiguredAuthTokenFromStorage, readConfiguredEndpointFromStorage } from "./connectionStorage.js";
import {
  buildDescriptorConnectionState,
  descriptorSupportsGovernedHandoff,
  mapProfileToNapoleonMode,
  type AuditEnvelope,
  type DescriptorConnectionInput,
  type DescriptorFailClosedReason,
  type GovernanceDecision,
  type LocalProfile,
  type NapoleonProfileMode,
  type TraceEnvelope,
} from "./contractBridge.js";
import type { EvolutionProposalLifecycleRecord, EvolutionProposalLifecycleState, EvolutionProposalStatusResult } from "./evolutionProposalLifecycle.js";
import { NapoleonBridgeError, descriptorFailClosedReasonToBridgeFailure } from "./napoleonBridge.js";
import { emitEvent, makeTelemetryPayload, type TelemetryPayload } from "./telemetry.js";

type EvolutionProposalStatusFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string> },
) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}>;

interface EvolutionProposalStatusDependencies {
  conversationId: string;
  traceId: string;
  profile?: LocalProfile;
  rehearsalMode?: boolean;
  getEndpoint?: () => string | null;
  getAuthToken?: () => string | null;
  descriptorConnection?: DescriptorConnectionInput;
  emit?: (payload: TelemetryPayload) => void;
  fetch?: EvolutionProposalStatusFetch;
}

interface EvolutionProposalStatusTargetMetadata {
  bridgeTargetPath: string;
  bridgeTargetOperation: string;
  bridgeTargetRequestKind: string;
}

const EVOLUTION_PROPOSAL_STATUS_BLOCKED_EFFECTS = [
  "evolution_application",
  "registry_update",
  "approval_capture",
  "memory_write",
  "agent_dispatch",
  "external_send",
  "runtime_authority",
] as const;

function emitEvolutionProposalStatusEvent(
  dependencies: EvolutionProposalStatusDependencies,
  event: string,
  attributes: Record<string, unknown>,
) {
  if (dependencies.emit) {
    dependencies.emit(makeTelemetryPayload(event, attributes));
    return;
  }
  emitEvent(event, attributes);
}

function getConfiguredEndpoint(dependencies: EvolutionProposalStatusDependencies): string | null {
  if (dependencies.getEndpoint) return dependencies.getEndpoint();
  return readConfiguredEndpointFromStorage();
}

function getConfiguredAuthToken(dependencies: EvolutionProposalStatusDependencies): string | null {
  if (dependencies.getAuthToken) return dependencies.getAuthToken();
  if (dependencies.getEndpoint) return null;
  return readConfiguredAuthTokenFromStorage();
}

function buildHeaders(authToken: string | null): Record<string, string> {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
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

function isLifecycleState(value: unknown): value is EvolutionProposalLifecycleState {
  return (
    value === "drafted" ||
    value === "submitted" ||
    value === "accepted_for_review" ||
    value === "rejected" ||
    value === "blocked" ||
    value === "status_refresh_unavailable" ||
    value === "implemented" ||
    value === "rolled_back"
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
    auditEnvelope.decision_id === decision.decision_id
  );
}

function hasRequiredStatusFields(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  return getNapoleonReviewOperation("evolution_proposal_status").responseRequired.every((field) => record[field] !== undefined);
}

function hasForbiddenStatusSideEffectClaim(payload: Partial<EvolutionProposalStatusResult> & Record<string, unknown>): boolean {
  return (
    payload.appliedLocally !== false ||
    payload.memoryWritePerformed !== false ||
    payload.approvalCaptured !== false ||
    payload.agentDispatchPerformed !== false ||
    payload.externalSendPerformed !== false ||
    payload.registryUpdatePerformed !== false ||
    payload.evolutionApplied !== false
  );
}

function failClosed(
  dependencies: EvolutionProposalStatusDependencies,
  reason: ConstructorParameters<typeof NapoleonBridgeError>[0],
  record: EvolutionProposalLifecycleRecord,
  requestId: string,
  status?: number,
  descriptorFailureReason?: DescriptorFailClosedReason,
  governanceReferences?: { decisionId?: string; auditId?: string; governanceOutcome?: string },
  targetMetadata?: EvolutionProposalStatusTargetMetadata,
): never {
  emitEvolutionProposalStatusEvent(dependencies, "evolution_proposal_status_refresh_failed", {
    traceId: dependencies.traceId,
    conversationId: dependencies.conversationId,
    requestId,
    proposalId: record.proposalId,
    profileMode: record.profileMode,
    reason,
    status,
    descriptorFailureReason,
    decisionId: governanceReferences?.decisionId,
    auditId: governanceReferences?.auditId,
    governanceOutcome: governanceReferences?.governanceOutcome,
    blockedEffects: [...EVOLUTION_PROPOSAL_STATUS_BLOCKED_EFFECTS],
    ...targetMetadata,
  });
  throw new NapoleonBridgeError(reason, dependencies.traceId, requestId, status, [...EVOLUTION_PROPOSAL_STATUS_BLOCKED_EFFECTS], {
    profileMode: record.profileMode,
    descriptorFailureReason,
    decisionId: governanceReferences?.decisionId,
    auditId: governanceReferences?.auditId,
    governanceOutcome: governanceReferences?.governanceOutcome,
  });
}

export async function refreshEvolutionProposalStatusFromNapoleon(
  record: EvolutionProposalLifecycleRecord,
  dependencies: EvolutionProposalStatusDependencies,
): Promise<EvolutionProposalStatusResult> {
  const activeProfileMode = mapProfileToNapoleonMode(dependencies.profile ?? "adult_owner") as NapoleonProfileMode;
  const requestId = `evo_status_${dependencies.traceId}`;
  const endpoint = getConfiguredEndpoint(dependencies);
  const authToken = getConfiguredAuthToken(dependencies);
  const descriptorConnection = buildDescriptorConnectionState(
    dependencies.descriptorConnection ?? {
      endpointConfigured: Boolean(endpoint),
      descriptor: null,
    },
  );

  if (record.profileMode !== activeProfileMode) {
    failClosed(dependencies, "governance_no_go", record, requestId);
  }
  if (dependencies.rehearsalMode) {
    failClosed(dependencies, "governance_no_go", record, requestId);
  }
  if (!endpoint) {
    failClosed(dependencies, "no_endpoint", record, requestId, undefined, descriptorConnection.failClosedReason);
  }
  if (!descriptorConnection.canAttemptLiveBridge) {
    failClosed(
      dependencies,
      descriptorFailClosedReasonToBridgeFailure(descriptorConnection.failClosedReason),
      record,
      requestId,
      undefined,
      descriptorConnection.failClosedReason,
    );
  }
  if (!descriptorSupportsGovernedHandoff(descriptorConnection, "evolution_proposal_status")) {
    failClosed(dependencies, "descriptor_mismatch", record, requestId, undefined, "descriptor_invalid");
  }

  const target = buildEvolutionProposalStatusBridgeTarget(endpoint, record.proposalId);
  const targetMetadata: EvolutionProposalStatusTargetMetadata = {
    bridgeTargetPath: target.path,
    bridgeTargetOperation: target.operationId,
    bridgeTargetRequestKind: target.requestKind,
  };
  emitEvolutionProposalStatusEvent(dependencies, "evolution_proposal_status_refresh_started", {
    traceId: dependencies.traceId,
    conversationId: dependencies.conversationId,
    requestId,
    proposalId: record.proposalId,
    profileMode: record.profileMode,
    ...targetMetadata,
  });

  const fetcher = dependencies.fetch ?? globalThis.fetch.bind(globalThis);
  let response: Awaited<ReturnType<EvolutionProposalStatusFetch>>;
  try {
    response = await fetcher(target.url, {
      method: "GET",
      headers: buildHeaders(authToken),
    });
  } catch (error) {
    failClosed(
      dependencies,
      error instanceof Error && error.name === "AbortError" ? "bridge_timeout" : "http_failure",
      record,
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
      record,
      requestId,
      response.status,
      undefined,
      undefined,
      targetMetadata,
    );
  }

  let payload: Partial<EvolutionProposalStatusResult>;
  try {
    payload = (await response.json()) as Partial<EvolutionProposalStatusResult>;
  } catch {
    failClosed(dependencies, "contract_mismatch", record, requestId, undefined, undefined, undefined, targetMetadata);
  }

  if (
    !hasRequiredStatusFields(payload) ||
    payload.proposalId !== record.proposalId ||
    !isLifecycleState(payload.lifecycleState) ||
    typeof payload.latestKnownOutcome !== "string" ||
    !isGovernanceDecision(payload.governanceDecision) ||
    !isTraceEnvelope(payload.traceEnvelope) ||
    !isAuditEnvelope(payload.auditEnvelope) ||
    !envelopesMatchDecision(payload.governanceDecision, payload.traceEnvelope, payload.auditEnvelope) ||
    hasUnsafeReturnedProofIdentifier(payload.governanceDecision, payload.traceEnvelope, payload.auditEnvelope) ||
    hasForbiddenStatusSideEffectClaim(payload as Partial<EvolutionProposalStatusResult> & Record<string, unknown>)
  ) {
    failClosed(dependencies, "contract_mismatch", record, requestId, undefined, undefined, undefined, targetMetadata);
  }

  if (payload.governanceDecision.outcome === "deny" || payload.governanceDecision.outcome === "no_go") {
    failClosed(
      dependencies,
      payload.governanceDecision.outcome === "deny" ? "governance_denied" : "governance_no_go",
      record,
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

  emitEvolutionProposalStatusEvent(dependencies, "evolution_proposal_status_refresh_completed", {
    traceId: dependencies.traceId,
    conversationId: dependencies.conversationId,
    requestId,
    proposalId: payload.proposalId,
    lifecycleState: payload.lifecycleState,
    decisionId: payload.governanceDecision.decision_id,
    auditId: payload.auditEnvelope.audit_id,
    governanceOutcome: payload.governanceDecision.outcome,
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
    proposalId: payload.proposalId,
    lifecycleState: payload.lifecycleState,
    latestKnownOutcome: payload.latestKnownOutcome,
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
