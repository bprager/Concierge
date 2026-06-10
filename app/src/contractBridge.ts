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
  governanceOutcome?: GovernanceOutcome;
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
  governanceReview: GovernanceReviewState;
}

export type GovernanceReviewStatus =
  | "not_required"
  | "review_needed"
  | "review_acknowledged"
  | "blocked_non_executable";

export interface GovernanceReviewState {
  outcome: GovernanceOutcome;
  status: GovernanceReviewStatus;
  decisionId: string;
  auditId: string;
  authorityTier: AuthorityTier;
  approvalRequirement: string;
  rationale: string;
  blockedEffects: string[];
  traceId: string;
  profile: LocalProfile;
  canAcknowledge: boolean;
  canSendAdvisory: boolean;
  approvalCaptured: false;
  localAcknowledgement?: "review_acknowledged_not_approved";
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

export function inferLocalGovernanceOutcome(message: string, profile: LocalProfile): GovernanceOutcome {
  const lower = message.toLowerCase();
  const asksForExternalEffect = /\b(send|email|post|publish|upload|share|execute|run|dispatch|bypass|skip governance)\b/.test(lower);
  const asksForSecretKeeping = /\b(secret|do not tell|don't tell|hide|without (my )?guardian)\b/.test(lower);
  const asksForAuthorityBypass = /\b(bypass|skip governance|approval captured|without approval|execute command|run command|dispatch agent)\b/.test(lower);

  if (asksForAuthorityBypass || (profile === "child_protected" && asksForSecretKeeping && asksForExternalEffect)) {
    return "no_go";
  }

  if (asksForExternalEffect || asksForSecretKeeping) {
    return "requires_review";
  }

  return "allow_prepare_only";
}

function authorityTierForOutcome(outcome: GovernanceOutcome): AuthorityTier {
  if (outcome === "no_go") return "prohibited";
  if (outcome === "deny") return "prohibited";
  if (outcome === "requires_review") return "approval_required";
  return "advisory_review";
}

function approvalRequirementForOutcome(outcome: GovernanceOutcome, profileMode: NapoleonProfileMode): string {
  if (outcome === "no_go" || outcome === "deny") return "not_available";
  if (outcome === "requires_review" && profileMode === "child_protected_user") {
    return "guardian_and_owner_review";
  }
  if (outcome === "requires_review") return "explicit_owner_approval";
  return "none_for_metadata";
}

function rationaleForOutcome(outcome: GovernanceOutcome): string {
  if (outcome === "no_go") {
    return "Requested behavior is non-executable through Concierge because it attempts to bypass governance or protected-user boundaries.";
  }
  if (outcome === "deny") {
    return "Napoleon governance denied the requested action; Concierge may not proceed beyond local display.";
  }
  if (outcome === "requires_review") {
    return "The request may be prepared for review, but any external effect requires Napoleon or Chief of Staff approval.";
  }
  return "Text Concierge may prepare an advisory response but blocked effects remain unavailable.";
}

export function buildTextTurnContract(input: TextTurnContractInput): TextTurnContract {
  const profileMode = mapProfileToNapoleonMode(input.profile);
  const outcome = input.governanceOutcome ?? inferLocalGovernanceOutcome(input.message, input.profile);
  const authorityTier = authorityTierForOutcome(outcome);
  const approvalRequirement = approvalRequirementForOutcome(outcome, profileMode);
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
    requested_authority_tier: authorityTier,
    trace_id: input.traceId,
    payload_schema: "napoleon/concierge/chief-of-staff-contract/v1#/definitions/ChiefOfStaffRequest",
  };

  const governanceRequest: GovernanceEvaluationRequest = {
    request_id: requestId,
    actor_id: actorId,
    action: "prepare_text_response",
    target: "napoleon.chief_of_staff",
    requested_authority_tier: authorityTier,
    evidence_links: sourceEvidence,
    trace_id: input.traceId,
  };

  const governanceDecision: GovernanceDecision = {
    decision_id: decisionId,
    request_id: requestId,
    outcome,
    authority_tier: authorityTier,
    approval_requirement: approvalRequirement,
    rationale: rationaleForOutcome(outcome),
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
    authority_tier: authorityTier,
    approval_requirement: approvalRequirement,
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
    governanceReview: buildGovernanceReviewState(contract.governanceDecision, localProfileFromNapoleonMode(contract.profileMode)),
  };
}

function localProfileFromNapoleonMode(profileMode: NapoleonProfileMode): LocalProfile {
  if (profileMode === "child_protected_user") return "child_protected";
  return profileMode;
}

export function buildGovernanceReviewState(
  decision: GovernanceDecision,
  profile: LocalProfile,
  locallyAcknowledged = false,
): GovernanceReviewState {
  const blocked = decision.outcome === "no_go" || decision.outcome === "deny";
  const needsReview = decision.outcome === "requires_review";

  return {
    outcome: decision.outcome,
    status: blocked
      ? "blocked_non_executable"
      : needsReview
        ? locallyAcknowledged
          ? "review_acknowledged"
          : "review_needed"
        : "not_required",
    decisionId: decision.decision_id,
    auditId: decision.audit_id,
    authorityTier: decision.authority_tier,
    approvalRequirement: decision.approval_requirement,
    rationale: decision.rationale,
    blockedEffects: decision.blocked_effects,
    traceId: decision.trace_id,
    profile,
    canAcknowledge: needsReview,
    canSendAdvisory: !blocked,
    approvalCaptured: false,
    localAcknowledgement: needsReview && locallyAcknowledged ? "review_acknowledged_not_approved" : undefined,
  };
}
