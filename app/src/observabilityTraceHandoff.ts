import { buildObservabilityTraceBridgeTarget, getNapoleonReviewOperation } from "./bridgeOperations.js";
import { hasUnsafeReturnedProofIdentifier } from "./bridgeProofValidation.js";
import { hasForbiddenSideEffectTextClaim } from "./bridgeSideEffectClaims.js";
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
import { NapoleonBridgeError, descriptorFailClosedReasonToBridgeFailure } from "./napoleonBridge.js";
import { emitEvent, makeTelemetryPayload, type TelemetryPayload } from "./telemetry.js";

type ObservabilityTraceFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}>;

const OBSERVABILITY_TRACE_SCHEMA_VERSION = "concierge.observability-trace-handoff.v1" as const;
const OBSERVABILITY_TRACE_BLOCKED_EFFECTS = [
  "trace_append",
  "audit_authority",
  "approval_capture",
  "memory_write",
  "agent_dispatch",
  "external_send",
  "task_routing",
  "local_application",
] as const;
const SAFE_REFERENCE_PATTERN = /^(trace|audit|decision|request|turn|event|capability):[a-z0-9][a-z0-9_.:-]{0,95}$/i;
const UNSAFE_VALUE_PATTERN = /(https?:\/\/|127\.0\.0\.1|localhost|bearer\s+|authorization|token|secret|raw(prompt|response|body|text)?)/i;

export interface ObservabilityTraceEvidenceInput {
  traceId: string;
  requestId?: string;
  decisionId?: string;
  auditId?: string;
  governanceOutcome?: string;
  handledBy?: string;
  failureReason?: string;
  blockedEffects?: string[];
  evidenceRefs?: string[];
}

export interface ObservabilityTraceHandoffPacket {
  schemaVersion: typeof OBSERVABILITY_TRACE_SCHEMA_VERSION;
  requestKind: "observability_trace_handoff";
  requestId: string;
  profileMode: NapoleonProfileMode;
  source: "concierge.local_presentation";
  traceEvidence: {
    traceId: string;
    requestId?: string;
    decisionId?: string;
    auditId?: string;
    governanceOutcome?: string;
    handledBy?: string;
    failureReason?: string;
    blockedEffects: string[];
    evidenceRefs: string[];
  };
  boundary: {
    evidenceOnly: true;
    rawPromptRetained: false;
    rawResponseRetained: false;
    endpointRetained: false;
    bearerTokenRetained: false;
    requestBodyRetained: false;
    responseBodyRetained: false;
    traceAppendPerformed: false;
    auditAuthorityCreated: false;
    approvalCaptured: false;
    memoryWritePerformed: false;
    agentDispatchPerformed: false;
    externalSendPerformed: false;
    taskRoutingPerformed: false;
    appliedLocally: false;
  };
  blockedEffects: string[];
}

export interface ObservabilityTraceHandoffResult {
  governanceDecision: GovernanceDecision;
  traceEnvelope: TraceEnvelope;
  auditEnvelope: AuditEnvelope;
  appliedLocally: false;
  memoryWritePerformed: false;
  approvalCaptured: false;
  agentDispatchPerformed: false;
  externalSendPerformed: false;
  traceAppendPerformed: false;
  auditAuthorityCreated: false;
  taskRoutingPerformed: false;
}

export interface ObservabilityTraceHandoffDependencies {
  profile?: LocalProfile;
  descriptorConnection?: DescriptorConnectionInput;
  getEndpoint?: () => string | null;
  getAuthToken?: () => string | null;
  rehearsalMode?: boolean;
  emit?: (payload: TelemetryPayload) => void;
  fetch?: ObservabilityTraceFetch;
}

function safeMetadata(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (UNSAFE_VALUE_PATTERN.test(trimmed)) return "[redacted]";
  return trimmed.slice(0, 120);
}

function safeList(values: string[] | undefined): string[] {
  return Array.from(new Set((values ?? []).map((value) => safeMetadata(value)).filter((value): value is string => Boolean(value)))).slice(0, 12);
}

function safeEvidenceRefs(values: string[] | undefined, fallbackTraceId: string): string[] {
  const refs = (values ?? []).filter((value) => SAFE_REFERENCE_PATTERN.test(value) && !UNSAFE_VALUE_PATTERN.test(value)).slice(0, 12);
  return refs.length > 0 ? refs : [`trace:${safeMetadata(fallbackTraceId) ?? "unknown"}`];
}

export function buildObservabilityTraceHandoffPacket(
  input: ObservabilityTraceEvidenceInput,
  profile: LocalProfile | NapoleonProfileMode = "adult_owner",
): ObservabilityTraceHandoffPacket {
  const profileMode = profile === "child_protected" ? "child_protected_user" : profile === "adult_owner" || profile === "guest" || profile === "collaborator" ? mapProfileToNapoleonMode(profile) : profile;
  const traceId = safeMetadata(input.traceId) ?? "trace_unknown";
  const requestId = `trace_handoff_${traceId}`;
  return {
    schemaVersion: OBSERVABILITY_TRACE_SCHEMA_VERSION,
    requestKind: "observability_trace_handoff",
    requestId,
    profileMode,
    source: "concierge.local_presentation",
    traceEvidence: {
      traceId,
      requestId: safeMetadata(input.requestId),
      decisionId: safeMetadata(input.decisionId),
      auditId: safeMetadata(input.auditId),
      governanceOutcome: safeMetadata(input.governanceOutcome),
      handledBy: safeMetadata(input.handledBy),
      failureReason: safeMetadata(input.failureReason),
      blockedEffects: safeList(input.blockedEffects),
      evidenceRefs: safeEvidenceRefs(input.evidenceRefs, traceId),
    },
    boundary: {
      evidenceOnly: true,
      rawPromptRetained: false,
      rawResponseRetained: false,
      endpointRetained: false,
      bearerTokenRetained: false,
      requestBodyRetained: false,
      responseBodyRetained: false,
      traceAppendPerformed: false,
      auditAuthorityCreated: false,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      taskRoutingPerformed: false,
      appliedLocally: false,
    },
    blockedEffects: [...OBSERVABILITY_TRACE_BLOCKED_EFFECTS],
  };
}

function getConfiguredEndpoint(dependencies: ObservabilityTraceHandoffDependencies): string | null {
  if (dependencies.getEndpoint) return dependencies.getEndpoint();
  return readConfiguredEndpointFromStorage();
}

function getConfiguredAuthToken(dependencies: ObservabilityTraceHandoffDependencies): string | null {
  if (dependencies.getAuthToken) return dependencies.getAuthToken();
  if (dependencies.getEndpoint) return null;
  return readConfiguredAuthTokenFromStorage();
}

function buildHeaders(authToken: string | null): Record<string, string> {
  return authToken ? { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` } : { "Content-Type": "application/json" };
}

function emitTraceHandoffEvent(
  dependencies: ObservabilityTraceHandoffDependencies,
  event: string,
  attributes: Record<string, unknown>,
) {
  if (dependencies.emit) {
    dependencies.emit(makeTelemetryPayload(event, attributes));
    return;
  }
  emitEvent(event, attributes);
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
    auditEnvelope.decision_id === decision.decision_id
  );
}

function hasRequiredObservabilityTraceResponseFields(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  return getNapoleonReviewOperation("observability_trace").responseRequired.every((field) => record[field] !== undefined);
}

function hasForbiddenTraceResponseClaim(payload: Record<string, unknown>): boolean {
  return (
    payload.appliedLocally !== false ||
    payload.memoryWritePerformed !== false ||
    payload.approvalCaptured !== false ||
    payload.agentDispatchPerformed !== false ||
    payload.externalSendPerformed !== false ||
    payload.traceAppendPerformed === true ||
    payload.auditAuthorityCreated === true ||
    payload.taskRoutingPerformed === true ||
    hasForbiddenSideEffectTextClaim(typeof payload.text === "string" ? payload.text : undefined)
  );
}

function failClosed(
  dependencies: ObservabilityTraceHandoffDependencies,
  reason: ConstructorParameters<typeof NapoleonBridgeError>[0],
  packet: ObservabilityTraceHandoffPacket,
  status?: number,
  descriptorFailureReason?: DescriptorFailClosedReason,
  governanceReferences?: { decisionId?: string; auditId?: string; governanceOutcome?: string },
  failureMetadata: { profileMode?: NapoleonProfileMode } = {},
): never {
  const profileMode = failureMetadata.profileMode ?? packet.profileMode;
  emitTraceHandoffEvent(dependencies, "observability_trace_handoff_failed", {
    traceId: packet.traceEvidence.traceId,
    requestId: packet.requestId,
    profileMode,
    reason,
    status,
    descriptorFailureReason,
    decisionId: governanceReferences?.decisionId,
    auditId: governanceReferences?.auditId,
    governanceOutcome: governanceReferences?.governanceOutcome,
    blockedEffects: packet.blockedEffects,
    bridgeTargetPath: "/observability/traces",
    bridgeTargetOperation: "observability_trace",
    bridgeTargetRequestKind: "observability_trace_handoff",
  });
  throw new NapoleonBridgeError(reason, packet.traceEvidence.traceId, packet.requestId, status, packet.blockedEffects, {
    profileMode,
    descriptorFailureReason,
    decisionId: governanceReferences?.decisionId,
    auditId: governanceReferences?.auditId,
    governanceOutcome: governanceReferences?.governanceOutcome,
  });
}

export async function submitObservabilityTraceHandoff(
  packet: ObservabilityTraceHandoffPacket,
  dependencies: ObservabilityTraceHandoffDependencies = {},
): Promise<ObservabilityTraceHandoffResult> {
  const endpoint = getConfiguredEndpoint(dependencies);
  const authToken = getConfiguredAuthToken(dependencies);
  const descriptorConnection = buildDescriptorConnectionState(
    dependencies.descriptorConnection ?? {
      endpointConfigured: Boolean(endpoint),
      descriptor: null,
    },
  );
  const activeProfileMode = mapProfileToNapoleonMode(dependencies.profile ?? "adult_owner");

  if (packet.profileMode !== activeProfileMode) {
    failClosed(dependencies, "governance_no_go", packet, undefined, undefined, undefined, {
      profileMode: activeProfileMode,
    });
  }
  if (dependencies.rehearsalMode) {
    failClosed(dependencies, "governance_no_go", packet);
  }
  if (!endpoint) {
    failClosed(dependencies, "no_endpoint", packet);
  }
  if (!descriptorConnection.canAttemptLiveBridge) {
    failClosed(
      dependencies,
      descriptorFailClosedReasonToBridgeFailure(descriptorConnection.failClosedReason),
      packet,
      undefined,
      descriptorConnection.failClosedReason,
    );
  }
  if (!descriptorSupportsGovernedHandoff(descriptorConnection, "observability_trace")) {
    failClosed(dependencies, "descriptor_mismatch", packet, undefined, "descriptor_invalid");
  }

  const target = buildObservabilityTraceBridgeTarget(endpoint);
  emitTraceHandoffEvent(dependencies, "observability_trace_handoff_started", {
    traceId: packet.traceEvidence.traceId,
    requestId: packet.requestId,
    profileMode: packet.profileMode,
    bridgeTargetPath: target.path,
    bridgeTargetOperation: target.operationId,
    bridgeTargetRequestKind: target.requestKind,
    evidenceRefCount: packet.traceEvidence.evidenceRefs.length,
  });

  const fetcher = dependencies.fetch ?? globalThis.fetch.bind(globalThis);
  let response: Awaited<ReturnType<ObservabilityTraceFetch>>;
  try {
    response = await fetcher(target.url, {
      method: "POST",
      headers: buildHeaders(authToken),
      body: JSON.stringify({
        requestKind: target.requestKind,
        bridgeTargetPath: target.path,
        bridgeTargetOperation: target.operationId,
        profileMode: packet.profileMode,
        descriptorStatus: descriptorConnection.descriptorStatus,
        descriptorConnection,
        traceHandoff: packet,
        boundary: packet.boundary,
        blockedEffects: packet.blockedEffects,
      }),
    });
  } catch (error) {
    failClosed(dependencies, error instanceof Error && error.name === "AbortError" ? "bridge_timeout" : "http_failure", packet);
  }

  if (!response.ok) {
    failClosed(dependencies, response.status === 401 || response.status === 403 ? "auth_failure" : "http_failure", packet, response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    failClosed(dependencies, "contract_mismatch", packet);
  }

  if (
    !hasRequiredObservabilityTraceResponseFields(payload) ||
    !isGovernanceDecision((payload as Record<string, unknown>).governanceDecision) ||
    !isTraceEnvelope((payload as Record<string, unknown>).traceEnvelope) ||
    !isAuditEnvelope((payload as Record<string, unknown>).auditEnvelope) ||
    !envelopesMatchDecision(
      (payload as { governanceDecision: GovernanceDecision }).governanceDecision,
      (payload as { traceEnvelope: TraceEnvelope }).traceEnvelope,
      (payload as { auditEnvelope: AuditEnvelope }).auditEnvelope,
    ) ||
    hasUnsafeReturnedProofIdentifier(
      (payload as { governanceDecision: GovernanceDecision }).governanceDecision,
      (payload as { traceEnvelope: TraceEnvelope }).traceEnvelope,
      (payload as { auditEnvelope: AuditEnvelope }).auditEnvelope,
    ) ||
    hasForbiddenTraceResponseClaim(payload as Record<string, unknown>)
  ) {
    failClosed(dependencies, "contract_mismatch", packet);
  }

  const result = payload as ObservabilityTraceHandoffResult;
  if (result.governanceDecision.outcome === "deny" || result.governanceDecision.outcome === "no_go") {
    failClosed(
      dependencies,
      result.governanceDecision.outcome === "deny" ? "governance_denied" : "governance_no_go",
      packet,
      response.status,
      undefined,
      {
        decisionId: result.governanceDecision.decision_id,
        auditId: result.governanceDecision.audit_id,
        governanceOutcome: result.governanceDecision.outcome,
      },
    );
  }

  emitTraceHandoffEvent(dependencies, "observability_trace_handoff_completed", {
    traceId: packet.traceEvidence.traceId,
    requestId: packet.requestId,
    profileMode: packet.profileMode,
    decisionId: result.governanceDecision.decision_id,
    auditId: result.governanceDecision.audit_id,
    governanceOutcome: result.governanceDecision.outcome,
    bridgeTargetPath: target.path,
    bridgeTargetOperation: target.operationId,
    bridgeTargetRequestKind: target.requestKind,
    evidenceRefCount: packet.traceEvidence.evidenceRefs.length,
  });

  return {
    ...result,
    appliedLocally: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    traceAppendPerformed: false,
    auditAuthorityCreated: false,
    taskRoutingPerformed: false,
  };
}
