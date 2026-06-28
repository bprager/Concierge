import {
  resolveNapoleonChiefOfStaffRequestOperation,
  resolveNapoleonGovernanceEvaluationOperation,
} from "./bridgeEndpoint.js";
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

type ContractPacketFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}>;

interface ContractPacketSubmissionDependencies {
  conversationId: string;
  profile?: LocalProfile;
  descriptorConnection?: DescriptorConnectionInput;
  rehearsalMode?: boolean;
  getEndpoint?: () => string | null;
  getAuthToken?: () => string | null;
  emit?: (payload: TelemetryPayload) => void;
  fetch?: ContractPacketFetch;
}

interface ContractPacketTargetMetadata {
  bridgeTargetPath: string;
  bridgeTargetOperation: string;
  bridgeTargetRequestKind: string;
}

export interface ChiefOfStaffRequestPacket {
  schemaVersion: "concierge/napoleon-contract-packet-export/v1";
  packetType: "chief_of_staff_request_handoff";
  generatedBy: "concierge.text";
  conversationId: string;
  profileMode: NapoleonProfileMode;
  bridgeTarget: {
    operationId: "chief_of_staff_request";
    path: "/chief-of-staff/requests";
    requestKind: "chief_of_staff_request_handoff";
    transport: "HTTP POST";
  };
  request: ChiefOfStaffRequest;
  traceEnvelope: TraceEnvelope;
  auditEnvelope: AuditEnvelope;
  handoffReadiness: {
    status: string;
    summary: string;
    nextStepSummary: string;
    blockedEffects: string[];
  };
  boundary: {
    localExportOnly: true;
    approvalCaptured: false;
    memoryWritePerformed: false;
    agentDispatchPerformed: false;
    externalSendPerformed: false;
    routingPerformed: false;
    registryUpdatePerformed: false;
    traceAppendPerformed: false;
    appliedLocally: false;
  };
}

export interface GovernanceEvaluationPacket {
  schemaVersion: "concierge/napoleon-contract-packet-export/v1";
  packetType: "governance_evaluation_handoff";
  generatedBy: "concierge.text";
  conversationId: string;
  profileMode: NapoleonProfileMode;
  bridgeTarget: {
    operationId: "governance_evaluation";
    path: "/governance/evaluate";
    requestKind: "governance_evaluation_handoff";
    transport: "HTTP POST";
  };
  request: GovernanceEvaluationRequest;
  localPreflightDecision: GovernanceDecision;
  traceEnvelope: TraceEnvelope;
  auditEnvelope: AuditEnvelope;
  handoffReadiness: {
    status: string;
    summary: string;
    nextStepSummary: string;
    blockedEffects: string[];
  };
  boundary: {
    localExportOnly: true;
    governanceOverrideApplied: false;
    approvalCaptured: false;
    memoryWritePerformed: false;
    agentDispatchPerformed: false;
    externalSendPerformed: false;
    routingPerformed: false;
    registryUpdatePerformed: false;
    traceAppendPerformed: false;
    appliedLocally: false;
  };
}

export interface ContractPacketSubmissionResult {
  text: string;
  governanceDecision: GovernanceDecision;
  traceEnvelope: TraceEnvelope;
  auditEnvelope: AuditEnvelope;
  approvalCaptured: false;
  memoryWritePerformed: false;
  agentDispatchPerformed: false;
  externalSendPerformed: false;
  routingPerformed: false;
  registryUpdatePerformed: false;
  traceAppendPerformed: false;
  governanceOverrideApplied?: false;
  appliedLocally: false;
}

const CHIEF_OF_STAFF_REQUEST_BLOCKED_EFFECTS = [
  "task_routing",
  "registry_update",
  "trace_append",
  "approval_capture",
  "memory_write",
  "agent_dispatch",
  "external_send",
  "local_application",
] as const;

const GOVERNANCE_EVALUATION_BLOCKED_EFFECTS = [
  "governance_override",
  "approval_capture",
  "memory_write",
  "agent_dispatch",
  "external_send",
  "registry_update",
  "trace_append",
  "task_routing",
  "local_application",
] as const;

function emitPacketEvent(
  dependencies: ContractPacketSubmissionDependencies,
  event: string,
  attributes: Record<string, unknown>,
) {
  if (dependencies.emit) {
    dependencies.emit(makeTelemetryPayload(event, attributes));
    return;
  }
  emitEvent(event, attributes);
}

function getConfiguredEndpoint(dependencies: ContractPacketSubmissionDependencies): string | null {
  if (dependencies.getEndpoint) return dependencies.getEndpoint();
  return readConfiguredEndpointFromStorage();
}

function getConfiguredAuthToken(dependencies: ContractPacketSubmissionDependencies): string | null {
  if (dependencies.getAuthToken) return dependencies.getAuthToken();
  if (dependencies.getEndpoint) return null;
  return readConfiguredAuthTokenFromStorage();
}

function buildHeaders(authToken: string | null): Record<string, string> {
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

function hasForbiddenContractPacketClaim(payload: Partial<ContractPacketSubmissionResult> & Record<string, unknown>) {
  const requiredFalseFields = [
    "appliedLocally",
    "memoryWritePerformed",
    "approvalCaptured",
    "externalSendPerformed",
    "agentDispatchPerformed",
    "routingPerformed",
    "registryUpdatePerformed",
    "traceAppendPerformed",
  ];
  return (
    requiredFalseFields.some((field) => payload[field] !== false) ||
    (payload.governanceOverrideApplied !== undefined && payload.governanceOverrideApplied !== false) ||
    hasForbiddenSideEffectTextClaim(payload.text)
  );
}

function failClosed(
  dependencies: ContractPacketSubmissionDependencies,
  eventPrefix: "chief_of_staff_request_packet" | "governance_evaluation_packet",
  reason: ConstructorParameters<typeof NapoleonBridgeError>[0],
  packet: ChiefOfStaffRequestPacket | GovernanceEvaluationPacket,
  blockedEffects: string[],
  status?: number,
  descriptorFailureReason?: DescriptorFailClosedReason,
  targetMetadata?: ContractPacketTargetMetadata,
  metadata: { decisionId?: string; auditId?: string; governanceOutcome?: string } = {},
): never {
  emitPacketEvent(dependencies, `${eventPrefix}_send_failed`, {
    traceId: packet.traceEnvelope.trace_id,
    conversationId: dependencies.conversationId,
    requestId: packet.traceEnvelope.request_id,
    profileMode: packet.profileMode,
    reason,
    status,
    blockedEffects,
    descriptorFailureReason,
    decisionId: metadata.decisionId,
    auditId: metadata.auditId,
    governanceOutcome: metadata.governanceOutcome,
    ...targetMetadata,
  });
  throw new NapoleonBridgeError(reason, packet.traceEnvelope.trace_id, packet.traceEnvelope.request_id, status, blockedEffects, {
    decisionId: metadata.decisionId,
    auditId: metadata.auditId,
    governanceOutcome: metadata.governanceOutcome,
    descriptorFailureReason,
    profileMode: packet.profileMode,
  });
}

async function submitPacket(
  packet: ChiefOfStaffRequestPacket | GovernanceEvaluationPacket,
  dependencies: ContractPacketSubmissionDependencies,
  kind: "chief_of_staff_request" | "governance_evaluation",
): Promise<ContractPacketSubmissionResult> {
  const endpoint = getConfiguredEndpoint(dependencies);
  const authToken = getConfiguredAuthToken(dependencies);
  const descriptorConnection = buildDescriptorConnectionState(
    dependencies.descriptorConnection ?? {
      endpointConfigured: Boolean(endpoint),
      descriptor: null,
    },
  );
  const eventPrefix = kind === "chief_of_staff_request" ? "chief_of_staff_request_packet" : "governance_evaluation_packet";
  const blockedEffects =
    kind === "chief_of_staff_request"
      ? [...CHIEF_OF_STAFF_REQUEST_BLOCKED_EFFECTS]
      : [...GOVERNANCE_EVALUATION_BLOCKED_EFFECTS];
  const activeProfileMode = mapProfileToNapoleonMode(dependencies.profile ?? "adult_owner");

  if (packet.profileMode !== activeProfileMode) {
    failClosed(dependencies, eventPrefix, "governance_no_go", packet, blockedEffects);
  }
  if (dependencies.rehearsalMode) {
    failClosed(dependencies, eventPrefix, "governance_no_go", packet, blockedEffects);
  }
  if (!endpoint) {
    failClosed(
      dependencies,
      eventPrefix,
      "no_endpoint",
      packet,
      blockedEffects,
      undefined,
      descriptorConnection.failClosedReason,
    );
  }
  if (!descriptorConnection.canAttemptLiveBridge) {
    failClosed(
      dependencies,
      eventPrefix,
      descriptorFailClosedReasonToBridgeFailure(descriptorConnection.failClosedReason),
      packet,
      blockedEffects,
      undefined,
      descriptorConnection.failClosedReason,
    );
  }
  if (!descriptorSupportsGovernedHandoff(descriptorConnection, kind)) {
    failClosed(dependencies, eventPrefix, "descriptor_mismatch", packet, blockedEffects, undefined, "descriptor_invalid");
  }

  const target =
    kind === "chief_of_staff_request"
      ? resolveNapoleonChiefOfStaffRequestOperation(endpoint)
      : resolveNapoleonGovernanceEvaluationOperation(endpoint);
  const targetMetadata = {
    bridgeTargetPath: target.path,
    bridgeTargetOperation: target.operationId,
    bridgeTargetRequestKind: target.requestKind,
  };

  emitPacketEvent(dependencies, `${eventPrefix}_send_started`, {
    traceId: packet.traceEnvelope.trace_id,
    conversationId: dependencies.conversationId,
    requestId: packet.traceEnvelope.request_id,
    profileMode: packet.profileMode,
    ...targetMetadata,
  });

  const fetcher = dependencies.fetch ?? globalThis.fetch.bind(globalThis);
  let response: Awaited<ReturnType<ContractPacketFetch>>;
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
        packetType: packet.packetType,
        contractPacket: packet,
        request: packet.request,
        traceEnvelope: packet.traceEnvelope,
        auditEnvelope: packet.auditEnvelope,
        boundary: packet.boundary,
        blockedEffects,
      }),
    });
  } catch (error) {
    failClosed(
      dependencies,
      eventPrefix,
      error instanceof Error && error.name === "AbortError" ? "bridge_timeout" : "http_failure",
      packet,
      blockedEffects,
      undefined,
      undefined,
      targetMetadata,
    );
  }

  if (!response.ok) {
    failClosed(
      dependencies,
      eventPrefix,
      response.status === 401 || response.status === 403 ? "auth_failure" : "http_failure",
      packet,
      blockedEffects,
      response.status,
      undefined,
      targetMetadata,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    failClosed(dependencies, eventPrefix, "contract_mismatch", packet, blockedEffects, undefined, undefined, targetMetadata);
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    typeof (payload as Partial<ContractPacketSubmissionResult>).text !== "string" ||
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
    hasForbiddenContractPacketClaim(payload as Partial<ContractPacketSubmissionResult> & Record<string, unknown>)
  ) {
    failClosed(dependencies, eventPrefix, "contract_mismatch", packet, blockedEffects, undefined, undefined, targetMetadata);
  }

  const result = payload as ContractPacketSubmissionResult;
  if (result.governanceDecision.outcome === "deny" || result.governanceDecision.outcome === "no_go") {
    failClosed(
      dependencies,
      eventPrefix,
      result.governanceDecision.outcome === "deny" ? "governance_denied" : "governance_no_go",
      packet,
      blockedEffects,
      response.status,
      undefined,
      targetMetadata,
      {
        decisionId: result.governanceDecision.decision_id,
        auditId: result.governanceDecision.audit_id,
        governanceOutcome: result.governanceDecision.outcome,
      },
    );
  }

  emitPacketEvent(dependencies, `${eventPrefix}_send_completed`, {
    traceId: packet.traceEnvelope.trace_id,
    conversationId: dependencies.conversationId,
    requestId: packet.traceEnvelope.request_id,
    profileMode: packet.profileMode,
    decisionId: result.governanceDecision.decision_id,
    auditId: result.governanceDecision.audit_id,
    governanceOutcome: result.governanceDecision.outcome,
    approvalCaptured: false,
    memoryWritePerformed: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    routingPerformed: false,
    registryUpdatePerformed: false,
    traceAppendPerformed: false,
    appliedLocally: false,
    ...targetMetadata,
  });

  return {
    ...result,
    approvalCaptured: false,
    memoryWritePerformed: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    routingPerformed: false,
    registryUpdatePerformed: false,
    traceAppendPerformed: false,
    governanceOverrideApplied: result.governanceOverrideApplied ?? false,
    appliedLocally: false,
  };
}

export async function submitChiefOfStaffRequestPacket(
  packet: ChiefOfStaffRequestPacket,
  dependencies: ContractPacketSubmissionDependencies,
): Promise<ContractPacketSubmissionResult> {
  return submitPacket(packet, dependencies, "chief_of_staff_request");
}

export async function submitGovernanceEvaluationPacket(
  packet: GovernanceEvaluationPacket,
  dependencies: ContractPacketSubmissionDependencies,
): Promise<ContractPacketSubmissionResult> {
  return submitPacket(packet, dependencies, "governance_evaluation");
}
