import type { NapoleonDelegation, NapoleonRequest, NapoleonResponse } from "./types";
import {
  buildDescriptorConnectionState,
  buildTextTurnContract,
  defaultChiefOfStaffDescriptor,
  type DescriptorConnectionInput,
  type GovernanceDecision,
} from "./contractBridge.js";
import { emitEvent, makeTelemetryPayload, type TelemetryPayload } from "./telemetry.js";

type BridgeFetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}>;

interface BridgeDependencies {
  getEndpoint?: () => string | null;
  descriptorConnection?: DescriptorConnectionInput;
  emit?: (payload: TelemetryPayload) => void;
  fetch?: BridgeFetch;
}

export type NapoleonBridgeFailureReason =
  | "no_endpoint"
  | "descriptor_mismatch"
  | "auth_failure"
  | "contract_mismatch"
  | "governance_no_go"
  | "bridge_timeout"
  | "http_failure";

export class NapoleonBridgeError extends Error {
  reason: NapoleonBridgeFailureReason;
  status?: number;
  traceId: string;
  requestId: string;

  constructor(reason: NapoleonBridgeFailureReason, traceId: string, requestId: string, status?: number) {
    super(`Napoleon bridge fail-closed: ${reason}${status ? ` (${status})` : ""}`);
    this.name = "NapoleonBridgeError";
    this.reason = reason;
    this.status = status;
    this.traceId = traceId;
    this.requestId = requestId;
  }
}

function emitBridgeEvent(dependencies: BridgeDependencies, event: string, attributes: Record<string, unknown>) {
  if (dependencies.emit) {
    dependencies.emit(makeTelemetryPayload(event, attributes));
    return;
  }
  emitEvent(event, attributes);
}

function getConfiguredEndpoint(dependencies: BridgeDependencies): string | null {
  if (dependencies.getEndpoint) return dependencies.getEndpoint();
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("napoleon_endpoint");
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

function failClosed(
  dependencies: BridgeDependencies,
  reason: NapoleonBridgeFailureReason,
  traceId: string,
  requestId: string,
  status?: number,
): never {
  emitBridgeEvent(dependencies, "bridge_request_failed", {
    traceId,
    requestId,
    reason,
    status,
  });
  throw new NapoleonBridgeError(reason, traceId, requestId, status);
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
  const descriptorConnection = buildDescriptorConnectionState(
    dependencies.descriptorConnection ?? {
      endpointConfigured: Boolean(endpoint),
      descriptor: defaultChiefOfStaffDescriptor,
    },
  );

  if (!endpoint) {
    failClosed(dependencies, "no_endpoint", request.traceId, contract.chiefOfStaffRequest.request_id);
  }

  if (!descriptorConnection.canAttemptLiveBridge) {
    failClosed(dependencies, "descriptor_mismatch", request.traceId, contract.chiefOfStaffRequest.request_id);
  }

  if (contract.governanceDecision.outcome === "no_go") {
    failClosed(dependencies, "governance_no_go", request.traceId, contract.chiefOfStaffRequest.request_id);
  }

  const fetcher = dependencies.fetch ?? globalThis.fetch.bind(globalThis);
  let response: Awaited<ReturnType<BridgeFetch>>;
  try {
    response = await fetcher(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
    failClosed(dependencies, reason, request.traceId, contract.chiefOfStaffRequest.request_id);
  }

  if (!response.ok) {
    const reason = response.status === 401 || response.status === 403 ? "auth_failure" : "http_failure";
    failClosed(dependencies, reason, request.traceId, contract.chiefOfStaffRequest.request_id, response.status);
  }

  const payload = (await response.json()) as Partial<NapoleonResponse>;
  if (!isGovernanceDecision(payload.governanceDecision)) {
    failClosed(dependencies, "contract_mismatch", request.traceId, contract.chiefOfStaffRequest.request_id);
  }

  const decision = payload.governanceDecision;

  const normalized: NapoleonResponse = {
    text: payload.text ?? "Napoleon returned no response text.",
    profileMode: payload.profileMode ?? contract.profileMode,
    governanceDecision: decision,
    traceEnvelope: payload.traceEnvelope ?? contract.traceEnvelope,
    auditEnvelope: payload.auditEnvelope ?? {
      ...contract.auditEnvelope,
      audit_id: decision.audit_id,
      decision_id: decision.decision_id,
    },
    requiresReview: requiresReview(decision),
    targetAgent: payload.targetAgent,
    delegation: isNapoleonDelegation(payload.delegation) ? payload.delegation : undefined,
    stance: payload.stance,
  };

  emitBridgeEvent(dependencies, "bridge_request_completed", {
    traceId: request.traceId,
    mode: "http",
    outcome: normalized.governanceDecision.outcome,
    decisionId: normalized.governanceDecision.decision_id,
    auditId: normalized.auditEnvelope.audit_id,
  });
  return normalized;
}
