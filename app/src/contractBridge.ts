export type LocalProfile = "adult_owner" | "child_protected" | "guest" | "collaborator";
export type NapoleonProfileMode = "adult_owner" | "child_protected_user" | "guest" | "collaborator";
export type GovernanceOutcome = "allow_prepare_only" | "deny" | "requires_review" | "no_go";
export type AuthorityTier =
  | "metadata_only"
  | "advisory_review"
  | "prepare_only"
  | "approval_required"
  | "prohibited";

export interface ChiefOfStaffDescriptor {
  schemaVersion: string;
  serviceId: "napoleon.chief_of_staff";
  runtimeAuthority: false;
  commandExecution: false;
  cachePolicy: "fail_closed_to_review_required";
  blockedEffects: string[];
}

export interface DescriptorStatus {
  serviceId: string;
  ready: boolean;
  runtimeAuthority: boolean;
  cachePolicy: string;
  blockedEffects: string[];
  message: string;
}

export interface ChiefOfStaffRequest {
  request_id: string;
  requester: string;
  request_type: "new_agent_proposal_review" | "evolution_proposal_review" | "governance_review" | "evaluation_review";
  profile_mode: NapoleonProfileMode;
  source_evidence: string[];
  requested_authority_tier: AuthorityTier;
  trace_id: string;
  payload_schema: string;
}

export interface GovernanceEvaluationRequest {
  request_id: string;
  actor_id: string;
  action: string;
  target: string;
  requested_authority_tier: AuthorityTier;
  evidence_links: string[];
  trace_id: string;
}

export interface GovernanceDecision {
  decision_id: string;
  request_id: string;
  outcome: GovernanceOutcome;
  authority_tier: AuthorityTier;
  approval_requirement: string;
  rationale: string;
  blocked_effects: string[];
  trace_id: string;
  audit_id: string;
}

export interface TraceEnvelope {
  trace_id: string;
  parent_trace_id: string;
  actor_id: string;
  request_id: string;
  decision_id: string;
  timestamp: string;
}

export interface AuditEnvelope {
  audit_id: string;
  trace_id: string;
  decision_id: string;
  actor_id: string;
  authority_tier: AuthorityTier;
  approval_requirement: string;
  evidence_links: string[];
}

export interface TextTurnContractInput {
  message: string;
  profile: LocalProfile;
  conversationId: string;
  turnId: string;
  traceId: string;
  timestamp?: string;
}

export interface TextTurnContract {
  profileMode: NapoleonProfileMode;
  actorId: string;
  chiefOfStaffRequest: ChiefOfStaffRequest;
  governanceRequest: GovernanceEvaluationRequest;
  governanceDecision: GovernanceDecision;
  traceEnvelope: TraceEnvelope;
  auditEnvelope: AuditEnvelope;
  sourceEvidence: string[];
  blockedEffects: string[];
}

export interface RehearsalPreview {
  understoodRequest: string;
  proposedNapoleonPath: string[];
  chiefOfStaffReviewPacket: {
    requestId: string;
    requestType: ChiefOfStaffRequest["request_type"];
    profileMode: NapoleonProfileMode;
    authorityTier: AuthorityTier;
    evidenceLinks: string[];
    traceId: string;
  };
  allowedEffects: string[];
  blockedEffects: string[];
  approvalState: string;
  memoryProposal: {
    status: "candidate_only";
    summary: string;
    reviewRequired: true;
  };
  traceAuditPreview: {
    traceId: string;
    requestId: string;
    decisionId: string;
    auditId: string;
  };
  evaluatorCaseCandidate: {
    scenarioType: "rehearsal_mode_text_turn";
    sourceRequestId: string;
    profileMode: NapoleonProfileMode;
    traceId: string;
    expectedBlockedEffects: string[];
  };
}

const PROFILE_MAP: Record<LocalProfile, NapoleonProfileMode> = {
  adult_owner: "adult_owner",
  child_protected: "child_protected_user",
  guest: "guest",
  collaborator: "collaborator",
};

const DEFAULT_BLOCKED_EFFECTS = [
  "runtime_authority",
  "command_execution",
  "task_routing",
  "agent_dispatch",
  "registry_runtime_activation",
  "graph_write",
  "memory_write",
  "audit_append",
  "event_publication",
  "approval_capture",
  "external_send",
  "service_control",
  "remediation",
];

export const defaultChiefOfStaffDescriptor: ChiefOfStaffDescriptor = {
  schemaVersion: "napoleon/concierge/chief-of-staff-service/v1",
  serviceId: "napoleon.chief_of_staff",
  runtimeAuthority: false,
  commandExecution: false,
  cachePolicy: "fail_closed_to_review_required",
  blockedEffects: DEFAULT_BLOCKED_EFFECTS,
};

export function mapProfileToNapoleonMode(profile: LocalProfile): NapoleonProfileMode {
  return PROFILE_MAP[profile];
}

export function validateChiefOfStaffDescriptor(descriptor: ChiefOfStaffDescriptor): DescriptorStatus {
  const ready =
    descriptor.serviceId === "napoleon.chief_of_staff" &&
    descriptor.runtimeAuthority === false &&
    descriptor.commandExecution === false &&
    descriptor.cachePolicy === "fail_closed_to_review_required" &&
    descriptor.blockedEffects.includes("runtime_authority") &&
    descriptor.blockedEffects.includes("memory_write");

  return {
    serviceId: descriptor.serviceId,
    ready,
    runtimeAuthority: descriptor.runtimeAuthority,
    cachePolicy: descriptor.cachePolicy,
    blockedEffects: descriptor.blockedEffects,
    message: ready
      ? "Chief of Staff contract descriptor is valid and contract-only."
      : "Chief of Staff descriptor is invalid or grants authority.",
  };
}

export function buildTextTurnContract(input: TextTurnContractInput): TextTurnContract {
  const profileMode = mapProfileToNapoleonMode(input.profile);
  const requestId = `cos_${input.turnId}`;
  const decisionId = `decision_${input.turnId}`;
  const auditId = `audit_${input.turnId}`;
  const actorId = `concierge:${profileMode}`;
  const timestamp = input.timestamp ?? new Date().toISOString();
  const sourceEvidence = [
    "local_text_turn",
    "napoleon.chief_of_staff.contract",
    `profile_mode:${profileMode}`,
    `conversation:${input.conversationId}`,
  ];
  const blockedEffects = [...DEFAULT_BLOCKED_EFFECTS];

  const chiefOfStaffRequest: ChiefOfStaffRequest = {
    request_id: requestId,
    requester: "concierge.text",
    request_type: "governance_review",
    profile_mode: profileMode,
    source_evidence: sourceEvidence,
    requested_authority_tier: "advisory_review",
    trace_id: input.traceId,
    payload_schema: "napoleon/concierge/chief-of-staff-contract/v1#/definitions/ChiefOfStaffRequest",
  };

  const governanceRequest: GovernanceEvaluationRequest = {
    request_id: requestId,
    actor_id: actorId,
    action: "prepare_text_response",
    target: "napoleon.chief_of_staff",
    requested_authority_tier: "advisory_review",
    evidence_links: sourceEvidence,
    trace_id: input.traceId,
  };

  const governanceDecision: GovernanceDecision = {
    decision_id: decisionId,
    request_id: requestId,
    outcome: "allow_prepare_only",
    authority_tier: "advisory_review",
    approval_requirement: "none_for_metadata",
    rationale: "Text Concierge may prepare an advisory response but blocked effects remain unavailable.",
    blocked_effects: blockedEffects,
    trace_id: input.traceId,
    audit_id: auditId,
  };

  const traceEnvelope: TraceEnvelope = {
    trace_id: input.traceId,
    parent_trace_id: input.conversationId,
    actor_id: actorId,
    request_id: requestId,
    decision_id: decisionId,
    timestamp,
  };

  const auditEnvelope: AuditEnvelope = {
    audit_id: auditId,
    trace_id: input.traceId,
    decision_id: decisionId,
    actor_id: actorId,
    authority_tier: "advisory_review",
    approval_requirement: "none_for_metadata",
    evidence_links: sourceEvidence,
  };

  return {
    profileMode,
    actorId,
    chiefOfStaffRequest,
    governanceRequest,
    governanceDecision,
    traceEnvelope,
    auditEnvelope,
    sourceEvidence,
    blockedEffects,
  };
}

export function buildRehearsalPreview(contract: TextTurnContract, message: string): RehearsalPreview {
  const understoodRequest = message.trim();

  return {
    understoodRequest,
    proposedNapoleonPath: ["concierge.text", "napoleon.chief_of_staff", "napoleon.governance"],
    chiefOfStaffReviewPacket: {
      requestId: contract.chiefOfStaffRequest.request_id,
      requestType: contract.chiefOfStaffRequest.request_type,
      profileMode: contract.profileMode,
      authorityTier: contract.chiefOfStaffRequest.requested_authority_tier,
      evidenceLinks: contract.sourceEvidence,
      traceId: contract.chiefOfStaffRequest.trace_id,
    },
    allowedEffects: ["prepare_advisory_response"],
    blockedEffects: contract.blockedEffects,
    approvalState: "No approval captured. External effects remain blocked.",
    memoryProposal: {
      status: "candidate_only",
      summary: "Potential preference or memory changes stay as review-only candidates.",
      reviewRequired: true,
    },
    traceAuditPreview: {
      traceId: contract.traceEnvelope.trace_id,
      requestId: contract.traceEnvelope.request_id,
      decisionId: contract.traceEnvelope.decision_id,
      auditId: contract.auditEnvelope.audit_id,
    },
    evaluatorCaseCandidate: {
      scenarioType: "rehearsal_mode_text_turn",
      sourceRequestId: contract.chiefOfStaffRequest.request_id,
      profileMode: contract.profileMode,
      traceId: contract.traceEnvelope.trace_id,
      expectedBlockedEffects: contract.blockedEffects,
    },
  };
}
