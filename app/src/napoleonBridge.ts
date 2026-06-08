import type { NapoleonRequest, NapoleonResponse } from "./types";
import {
  buildTextTurnContract,
  defaultChiefOfStaffDescriptor,
  validateChiefOfStaffDescriptor,
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
  emit?: (payload: TelemetryPayload) => void;
  fetch?: BridgeFetch;
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
  const descriptorStatus = validateChiefOfStaffDescriptor(defaultChiefOfStaffDescriptor);

  emitBridgeEvent(dependencies, "bridge_request_started", {
    traceId: request.traceId,
    profile: request.profile,
    profileMode: contract.profileMode,
    channel: request.channel,
    requestId: contract.chiefOfStaffRequest.request_id,
  });

  const endpoint = getConfiguredEndpoint(dependencies);

  if (!endpoint) {
    emitBridgeEvent(dependencies, "bridge_request_completed", {
      traceId: request.traceId,
      mode: "local_stub",
      outcome: contract.governanceDecision.outcome,
      auditId: contract.auditEnvelope.audit_id,
    });

    return {
      text:
        request.profile === "child_protected"
          ? "I can prepare an answer, and I will keep it simple. I will not do anything outside this chat without guardian approval."
          : "I prepared this as an advisory Concierge response. Configure a Napoleon endpoint to send it through live Chief of Staff review.",
      profileMode: contract.profileMode,
      governanceDecision: contract.governanceDecision,
      traceEnvelope: contract.traceEnvelope,
      auditEnvelope: contract.auditEnvelope,
      requiresReview: requiresReview(contract.governanceDecision),
      stance: request.profile === "child_protected" ? "neutral_warm" : "direct_strategic",
    };
  }

  const fetcher = dependencies.fetch ?? globalThis.fetch.bind(globalThis);
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...request,
      profileMode: contract.profileMode,
      descriptorStatus,
      chiefOfStaffRequest: contract.chiefOfStaffRequest,
      governanceRequest: contract.governanceRequest,
      traceEnvelope: contract.traceEnvelope,
      auditEnvelope: contract.auditEnvelope,
      blockedEffects: contract.blockedEffects,
      sourceEvidence: contract.sourceEvidence,
    }),
  });

  if (!response.ok) {
    emitBridgeEvent(dependencies, "bridge_request_failed", {
      traceId: request.traceId,
      status: response.status,
      requestId: contract.chiefOfStaffRequest.request_id,
    });
    throw new Error(`Napoleon bridge failed: ${response.status}`);
  }

  const payload = (await response.json()) as Partial<NapoleonResponse>;
  const decision = isGovernanceDecision(payload.governanceDecision)
    ? payload.governanceDecision
    : contract.governanceDecision;

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
