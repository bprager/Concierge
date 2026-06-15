import { resolveNapoleonBridgeOperation } from "./bridgeEndpoint.js";
import { hasRequiredBridgeResponseFields } from "./bridgeResponseRequirements.js";
import {
  buildDescriptorConnectionState,
  mapProfileToNapoleonMode,
  type AuditEnvelope,
  type ChiefOfStaffRequest,
  type DescriptorConnectionInput,
  type GovernanceDecision,
  type GovernanceEvaluationRequest,
  type GovernanceReviewState,
  type TraceEnvelope,
} from "./contractBridge.js";
import { NapoleonBridgeError, descriptorFailClosedReasonToBridgeFailure } from "./napoleonBridge.js";
import { emitEvent, makeTelemetryPayload, type TelemetryPayload } from "./telemetry.js";

type GovernanceReviewFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}>;

interface GovernanceReviewSubmissionDependencies {
  conversationId: string;
  traceId: string;
  rehearsalMode?: boolean;
  getEndpoint?: () => string | null;
  getAuthToken?: () => string | null;
  descriptorConnection?: DescriptorConnectionInput;
  emit?: (payload: TelemetryPayload) => void;
  fetch?: GovernanceReviewFetch;
}

export interface GovernanceReviewSubmissionResult {
  text: string;
  governanceDecision: GovernanceDecision;
  traceEnvelope: TraceEnvelope;
  auditEnvelope: AuditEnvelope;
  approvalCaptured: false;
  memoryWritePerformed: false;
  agentDispatchPerformed: false;
  externalSendPerformed: false;
  appliedLocally: false;
}

const GOVERNANCE_REVIEW_BOUNDARY = {
  proposalOnly: true,
  approvalCaptured: false,
  memoryWriteAllowed: false,
  agentDispatchAllowed: false,
  externalSendAllowed: false,
  localApplicationAllowed: false,
} as const;

const GOVERNANCE_REVIEW_BLOCKED_EFFECTS = [
  "approval_capture",
  "memory_write",
  "agent_dispatch",
  "external_send",
  "runtime_authority",
  "audit_append",
];

function emitGovernanceReviewEvent(
  dependencies: GovernanceReviewSubmissionDependencies,
  event: string,
  attributes: Record<string, unknown>,
) {
  if (dependencies.emit) {
    dependencies.emit(makeTelemetryPayload(event, attributes));
    return;
  }
  emitEvent(event, attributes);
}

function getConfiguredEndpoint(dependencies: GovernanceReviewSubmissionDependencies): string | null {
  if (dependencies.getEndpoint) return dependencies.getEndpoint();
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("napoleon_endpoint");
}

function getConfiguredAuthToken(dependencies: GovernanceReviewSubmissionDependencies): string | null {
  if (dependencies.getAuthToken) return dependencies.getAuthToken();
  if (dependencies.getEndpoint) return null;
  if (typeof localStorage === "undefined") return null;
  const token = localStorage.getItem("napoleon_auth_token");
  return token?.trim() ? token.trim() : null;
}

function buildGovernanceReviewHeaders(authToken: string | null): Record<string, string> {
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

function hasForbiddenGovernanceReviewSideEffectClaim(
  payload: Partial<GovernanceReviewSubmissionResult> & Record<string, unknown>,
): boolean {
  const requiredFalseFields = [
    "appliedLocally",
    "memoryWritePerformed",
    "approvalCaptured",
    "externalSendPerformed",
    "agentDispatchPerformed",
  ];
  return requiredFalseFields.some((field) => payload[field] !== false);
}

function failGovernanceReviewClosed(
  dependencies: GovernanceReviewSubmissionDependencies,
  reason: ConstructorParameters<typeof NapoleonBridgeError>[0],
  traceId: string,
  requestId: string,
  decisionId?: string,
  auditId?: string,
  profile?: GovernanceReviewState["profile"],
  status?: number,
  blockedEffects: string[] = GOVERNANCE_REVIEW_BLOCKED_EFFECTS,
): never {
  emitGovernanceReviewEvent(dependencies, "governance_review_send_failed", {
    traceId,
    conversationId: dependencies.conversationId,
    requestId,
    decisionId,
    auditId,
    profile,
    reason,
    status,
    blockedEffects,
  });
  throw new NapoleonBridgeError(reason, traceId, requestId, status, blockedEffects, {
    decisionId,
    auditId,
    governanceOutcome: reason === "governance_no_go" ? "no_go" : reason === "governance_denied" ? "deny" : undefined,
  });
}

export async function submitGovernanceReviewForNapoleonReview(
  review: GovernanceReviewState,
  dependencies: GovernanceReviewSubmissionDependencies,
): Promise<GovernanceReviewSubmissionResult> {
  const profileMode = mapProfileToNapoleonMode(review.profile);
  const requestId = `cos_${dependencies.traceId}`;
  const localDecisionId = `local_governance_${dependencies.traceId}`;
  const localAuditId = `local_audit_${dependencies.traceId}`;
  const endpoint = getConfiguredEndpoint(dependencies);
  const authToken = getConfiguredAuthToken(dependencies);
  const descriptorConnection = buildDescriptorConnectionState(
    dependencies.descriptorConnection ?? {
      endpointConfigured: Boolean(endpoint),
      descriptor: null,
    },
  );
  const blockedEffects = GOVERNANCE_REVIEW_BLOCKED_EFFECTS;

  if (dependencies.rehearsalMode || review.outcome === "no_go" || review.outcome === "deny") {
    failGovernanceReviewClosed(
      dependencies,
      review.outcome === "deny" ? "governance_denied" : "governance_no_go",
      dependencies.traceId,
      requestId,
      review.decisionId,
      review.auditId,
      review.profile,
      undefined,
      review.blockedEffects.length ? review.blockedEffects : blockedEffects,
    );
  }
  if (!endpoint) {
    failGovernanceReviewClosed(
      dependencies,
      "no_endpoint",
      dependencies.traceId,
      requestId,
      review.decisionId,
      review.auditId,
      review.profile,
    );
  }
  if (!descriptorConnection.canAttemptLiveBridge) {
    failGovernanceReviewClosed(
      dependencies,
      descriptorFailClosedReasonToBridgeFailure(descriptorConnection.failClosedReason),
      dependencies.traceId,
      requestId,
      review.decisionId,
      review.auditId,
      review.profile,
    );
  }

  const evidenceLinks = [`trace:${review.traceId}`, `audit:${review.auditId}`, `decision:${review.decisionId}`];
  const approvalRequirement =
    review.profile === "child_protected"
      ? "guardian_and_owner_review_before_external_or_durable_effects"
      : review.approvalRequirement;
  const chiefOfStaffRequest: ChiefOfStaffRequest = {
    request_id: requestId,
    requester: "concierge.governance_review",
    request_type: "governance_review",
    profile_mode: profileMode,
    source_evidence: evidenceLinks,
    requested_authority_tier: "advisory_review",
    trace_id: dependencies.traceId,
    payload_schema: "napoleon/concierge/governance-review-handoff/v1",
  };
  const governanceRequest: GovernanceEvaluationRequest = {
    request_id: `gov_${dependencies.traceId}`,
    actor_id: "concierge.governance_review",
    action: "submit_governance_review_for_napoleon_review",
    target: "napoleon.governance",
    requested_authority_tier: "advisory_review",
    evidence_links: evidenceLinks,
    trace_id: dependencies.traceId,
  };
  const traceEnvelope: TraceEnvelope = {
    trace_id: dependencies.traceId,
    parent_trace_id: dependencies.conversationId,
    actor_id: "concierge.governance_review",
    request_id: requestId,
    decision_id: localDecisionId,
    timestamp: new Date().toISOString(),
  };
  const auditEnvelope: AuditEnvelope = {
    audit_id: localAuditId,
    trace_id: dependencies.traceId,
    decision_id: localDecisionId,
    actor_id: "concierge.governance_review",
    authority_tier: "advisory_review",
    approval_requirement: approvalRequirement,
    evidence_links: evidenceLinks,
  };

  emitGovernanceReviewEvent(dependencies, "governance_review_send_started", {
    traceId: dependencies.traceId,
    conversationId: dependencies.conversationId,
    requestId,
    decisionId: review.decisionId,
    auditId: review.auditId,
    profile: review.profile,
    profileMode,
  });

  const targetEndpoint = resolveNapoleonBridgeOperation(endpoint, "chief_of_staff_steering");
  const fetcher = dependencies.fetch ?? globalThis.fetch.bind(globalThis);
  let response: Awaited<ReturnType<GovernanceReviewFetch>>;
  try {
    response = await fetcher(targetEndpoint, {
      method: "POST",
      headers: buildGovernanceReviewHeaders(authToken),
      body: JSON.stringify({
        requestKind: "chief_of_staff_steering_handoff",
        handoffKind: "governance_review_handoff",
        profileMode,
        descriptorStatus: descriptorConnection.descriptorStatus,
        descriptorConnection,
        chiefOfStaffRequest,
        governanceRequest,
        traceEnvelope,
        auditEnvelope,
        governanceReview: review,
        boundary: GOVERNANCE_REVIEW_BOUNDARY,
        blockedEffects,
      }),
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError" ? "bridge_timeout" : "http_failure";
    failGovernanceReviewClosed(
      dependencies,
      reason,
      dependencies.traceId,
      requestId,
      review.decisionId,
      review.auditId,
      review.profile,
    );
  }

  if (!response.ok) {
    const reason = response.status === 401 || response.status === 403 ? "auth_failure" : "http_failure";
    failGovernanceReviewClosed(
      dependencies,
      reason,
      dependencies.traceId,
      requestId,
      review.decisionId,
      review.auditId,
      review.profile,
      response.status,
    );
  }

  const payload = (await response.json()) as Partial<GovernanceReviewSubmissionResult>;
  if (
    !hasRequiredBridgeResponseFields(payload, "chief_of_staff_steering") ||
    !isGovernanceDecision(payload.governanceDecision) ||
    !isTraceEnvelope(payload.traceEnvelope) ||
    !isAuditEnvelope(payload.auditEnvelope) ||
    !envelopesMatchDecision(payload.governanceDecision, payload.traceEnvelope, payload.auditEnvelope) ||
    hasForbiddenGovernanceReviewSideEffectClaim(payload as Partial<GovernanceReviewSubmissionResult> & Record<string, unknown>)
  ) {
    failGovernanceReviewClosed(
      dependencies,
      "contract_mismatch",
      dependencies.traceId,
      requestId,
      review.decisionId,
      review.auditId,
      review.profile,
    );
  }

  if (payload.governanceDecision.outcome === "deny" || payload.governanceDecision.outcome === "no_go") {
    failGovernanceReviewClosed(
      dependencies,
      payload.governanceDecision.outcome === "deny" ? "governance_denied" : "governance_no_go",
      dependencies.traceId,
      payload.governanceDecision.request_id,
      payload.governanceDecision.decision_id,
      payload.governanceDecision.audit_id,
      review.profile,
      response.status,
      payload.governanceDecision.blocked_effects,
    );
  }

  emitGovernanceReviewEvent(dependencies, "governance_review_send_completed", {
    traceId: dependencies.traceId,
    conversationId: dependencies.conversationId,
    requestId,
    decisionId: payload.governanceDecision.decision_id,
    auditId: payload.auditEnvelope.audit_id,
    profile: review.profile,
    outcome: payload.governanceDecision.outcome,
    approvalCaptured: false,
    memoryWritePerformed: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    appliedLocally: false,
  });

  return {
    text: payload.text ?? "Napoleon accepted the governance review packet for governed review.",
    governanceDecision: payload.governanceDecision,
    traceEnvelope: payload.traceEnvelope,
    auditEnvelope: payload.auditEnvelope,
    approvalCaptured: false,
    memoryWritePerformed: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    appliedLocally: false,
  };
}
