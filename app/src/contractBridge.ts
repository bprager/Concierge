export type LocalProfile = "adult_owner" | "child_protected" | "guest" | "collaborator";
export type NapoleonProfileMode = "adult_owner" | "child_protected_user" | "guest" | "collaborator";
export type GovernanceOutcome = "allow_prepare_only" | "deny" | "requires_review" | "no_go";
export type AuthorityTier =
  | "metadata_only"
  | "advisory_review"
  | "prepare_only"
  | "approval_required"
  | "prohibited";
export type GovernedHandoffCapability =
  | "text_turn"
  | "memory_proposal_review"
  | "chief_of_staff_steering"
  | "governance_review"
  | "evolution_proposal_review"
  | "taxonomy_review";

export interface ChiefOfStaffDescriptor {
  schemaVersion: string;
  serviceId: "napoleon.chief_of_staff";
  runtimeAuthority: false;
  commandExecution: false;
  cachePolicy: "fail_closed_to_review_required" | "runtime_descriptor_live_response";
  blockedEffects: string[];
  supportedHandoffs?: GovernedHandoffCapability[];
}

export interface DescriptorStatus {
  serviceId: string;
  ready: boolean;
  runtimeAuthority: boolean;
  cachePolicy: string;
  blockedEffects: string[];
  supportedHandoffs: GovernedHandoffCapability[];
  message: string;
}

export type DescriptorConnectionStateKind =
  | "no_endpoint"
  | "missing_descriptor"
  | "descriptor_mismatch"
  | "auth_failure"
  | "bridge_timeout"
  | "http_failure"
  | "ready";
export type DescriptorChecksumState = "not_checked" | "matched" | "mismatch";
export type DescriptorSignatureState = "not_checked" | "valid" | "invalid";
export type DescriptorFailClosedReason =
  | "no_endpoint"
  | "no_descriptor"
  | "descriptor_invalid"
  | "descriptor_signature_or_checksum_mismatch"
  | "descriptor_stale"
  | "auth_failure"
  | "bridge_timeout"
  | "http_failure";

export interface DescriptorConnectionInput {
  endpointConfigured: boolean;
  descriptor?: ChiefOfStaffDescriptor | null;
  expectedChecksum?: string;
  actualChecksum?: string;
  signatureValid?: boolean;
  failClosedReason?: DescriptorFailClosedReason;
  discoveredAt?: string;
  maxAgeSeconds?: number;
  now?: string;
}

export interface DescriptorConnectionState {
  state: DescriptorConnectionStateKind;
  descriptorStatus: DescriptorStatus | null;
  checksumState: DescriptorChecksumState;
  signatureState: DescriptorSignatureState;
  canAttemptLiveBridge: boolean;
  failClosedReason?: DescriptorFailClosedReason;
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
  memoryProposal: MemoryProposalReviewState;
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

export type MemoryProposalStatus = "none" | "review_needed" | "acknowledged_locally" | "dismissed_locally";
export type MemoryProposalKind = "preference" | "profile_note" | "unknown";

export interface MemoryProposalReviewState {
  status: MemoryProposalStatus;
  proposalId: string;
  sourceTurnId: string;
  profile: LocalProfile;
  proposedDiff: {
    kind: MemoryProposalKind;
    value: string;
  };
  rationale: string;
  reviewRequired: boolean;
  guardianReviewRequired: boolean;
  childSafetyNote?: string;
  blockedEffects: string[];
  traceId: string;
  auditId: string;
  canAcknowledge: boolean;
  canDismiss: boolean;
  memoryWritePerformed: false;
  approvalCaptured: false;
  localReview?: "acknowledged_not_approved" | "dismissed_not_deleted";
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

const MEMORY_TRIGGER_PATTERN = /\b(remember|prefer|preference|call me|nickname|my name is|i like|i usually)\b/i;

const DEFAULT_SUPPORTED_HANDOFFS: GovernedHandoffCapability[] = [
  "text_turn",
  "memory_proposal_review",
  "chief_of_staff_steering",
  "governance_review",
  "evolution_proposal_review",
  "taxonomy_review",
];

export const defaultChiefOfStaffDescriptor: ChiefOfStaffDescriptor = {
  schemaVersion: "napoleon/concierge/chief-of-staff-service/v1",
  serviceId: "napoleon.chief_of_staff",
  runtimeAuthority: false,
  commandExecution: false,
  cachePolicy: "fail_closed_to_review_required",
  blockedEffects: DEFAULT_BLOCKED_EFFECTS,
  supportedHandoffs: DEFAULT_SUPPORTED_HANDOFFS,
};

export function mapProfileToNapoleonMode(profile: LocalProfile): NapoleonProfileMode {
  return PROFILE_MAP[profile];
}

export function validateChiefOfStaffDescriptor(descriptor: ChiefOfStaffDescriptor): DescriptorStatus {
  const ready =
    descriptor.serviceId === "napoleon.chief_of_staff" &&
    descriptor.runtimeAuthority === false &&
    descriptor.commandExecution === false &&
    (descriptor.cachePolicy === "fail_closed_to_review_required" ||
      descriptor.cachePolicy === "runtime_descriptor_live_response") &&
    descriptor.blockedEffects.includes("runtime_authority") &&
    descriptor.blockedEffects.includes("memory_write");

  return {
    serviceId: descriptor.serviceId,
    ready,
    runtimeAuthority: descriptor.runtimeAuthority,
    cachePolicy: descriptor.cachePolicy,
    blockedEffects: descriptor.blockedEffects,
    supportedHandoffs: descriptor.supportedHandoffs ?? DEFAULT_SUPPORTED_HANDOFFS,
    message: ready
      ? "Chief of Staff contract descriptor is valid and contract-only."
      : "Chief of Staff descriptor is invalid or grants authority.",
  };
}

export function descriptorSupportsGovernedHandoff(
  connection: DescriptorConnectionState,
  capability: GovernedHandoffCapability,
): boolean {
  return Boolean(connection.canAttemptLiveBridge && connection.descriptorStatus?.supportedHandoffs.includes(capability));
}

export function buildDescriptorConnectionState(input: DescriptorConnectionInput): DescriptorConnectionState {
  const checksumState: DescriptorChecksumState =
    input.expectedChecksum === undefined || input.actualChecksum === undefined
      ? "not_checked"
      : input.expectedChecksum === input.actualChecksum
        ? "matched"
        : "mismatch";
  const signatureState: DescriptorSignatureState =
    input.signatureValid === undefined ? "not_checked" : input.signatureValid ? "valid" : "invalid";
  const descriptorStatus = input.descriptor ? validateChiefOfStaffDescriptor(input.descriptor) : null;
  const descriptorFresh =
    input.discoveredAt === undefined || input.maxAgeSeconds === undefined
      ? true
      : Date.parse(input.now ?? new Date().toISOString()) - Date.parse(input.discoveredAt) <= input.maxAgeSeconds * 1000;

  if (!input.endpointConfigured) {
    return {
      state: "no_endpoint",
      descriptorStatus,
      checksumState,
      signatureState,
      canAttemptLiveBridge: false,
      failClosedReason: "no_endpoint",
      message: "No Napoleon endpoint is configured, so Concierge cannot attempt a live bridge call.",
    };
  }

  if (!descriptorStatus) {
    if (input.failClosedReason === "descriptor_invalid") {
      return {
        state: "descriptor_mismatch",
        descriptorStatus: null,
        checksumState,
        signatureState,
        canAttemptLiveBridge: false,
        failClosedReason: "descriptor_invalid",
        message: "Chief of Staff descriptor is invalid or grants authority.",
      };
    }
    if (
      input.failClosedReason === "auth_failure" ||
      input.failClosedReason === "bridge_timeout" ||
      input.failClosedReason === "http_failure"
    ) {
      const messages: Record<typeof input.failClosedReason, string> = {
        auth_failure: "Napoleon descriptor discovery failed authentication, so Concierge is blocked from live bridge sends.",
        bridge_timeout: "Napoleon descriptor discovery timed out, so Concierge is blocked from live bridge sends.",
        http_failure: "Napoleon descriptor discovery failed over HTTP, so Concierge is blocked from live bridge sends.",
      };
      return {
        state: input.failClosedReason,
        descriptorStatus: null,
        checksumState,
        signatureState,
        canAttemptLiveBridge: false,
        failClosedReason: input.failClosedReason,
        message: messages[input.failClosedReason],
      };
    }
    return {
      state: "missing_descriptor",
      descriptorStatus: null,
      checksumState,
      signatureState,
      canAttemptLiveBridge: false,
      failClosedReason: "no_descriptor",
      message: "No Napoleon Chief of Staff descriptor has been discovered.",
    };
  }

  if (!descriptorStatus.ready) {
    return {
      state: "descriptor_mismatch",
      descriptorStatus,
      checksumState,
      signatureState,
      canAttemptLiveBridge: false,
      failClosedReason: "descriptor_invalid",
      message: descriptorStatus.message,
    };
  }

  if (checksumState === "mismatch" || signatureState === "invalid") {
    return {
      state: "descriptor_mismatch",
      descriptorStatus,
      checksumState,
      signatureState,
      canAttemptLiveBridge: false,
      failClosedReason: "descriptor_signature_or_checksum_mismatch",
      message: "Napoleon descriptor signature or checksum did not match the expected value.",
    };
  }

  if (!descriptorFresh) {
    return {
      state: "descriptor_mismatch",
      descriptorStatus,
      checksumState,
      signatureState,
      canAttemptLiveBridge: false,
      failClosedReason: "descriptor_stale",
      message: "Napoleon descriptor discovery is stale, so Concierge must rediscover it before any live bridge send.",
    };
  }

  return {
    state: "ready",
    descriptorStatus,
    checksumState,
    signatureState,
    canAttemptLiveBridge: true,
    message: "Napoleon Chief of Staff descriptor is discovered, valid, and contract-only.",
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

function sourceTurnIdFromContract(contract: TextTurnContract): string {
  return contract.traceEnvelope.request_id.replace(/^cos_/, "");
}

function inferMemoryProposalKind(message: string): MemoryProposalKind {
  const lower = message.toLowerCase();
  if (/\b(prefer|preference|i like|i usually)\b/.test(lower)) return "preference";
  if (/\b(call me|nickname|my name is)\b/.test(lower)) return "profile_note";
  if (MEMORY_TRIGGER_PATTERN.test(message)) return "unknown";
  return "unknown";
}

function extractMemoryProposalValue(message: string): string {
  const trimmed = message.trim().replace(/\s+/g, " ");
  const rememberMatch = trimmed.match(/\bremember(?: that)?\s+(.+)/i);
  if (rememberMatch?.[1]) return rememberMatch[1].trim();
  return trimmed;
}

export function hasMemoryProposalCandidate(message: string): boolean {
  return MEMORY_TRIGGER_PATTERN.test(message);
}

export function buildMemoryProposalReviewState(
  contract: TextTurnContract,
  message: string,
  status: MemoryProposalStatus = hasMemoryProposalCandidate(message) ? "review_needed" : "none",
): MemoryProposalReviewState {
  const sourceTurnId = sourceTurnIdFromContract(contract);
  const profile = localProfileFromNapoleonMode(contract.profileMode);
  const isChild = profile === "child_protected";
  const hasCandidate = hasMemoryProposalCandidate(message);
  const activeStatus = hasCandidate ? status : "none";
  const localReview =
    activeStatus === "acknowledged_locally"
      ? "acknowledged_not_approved"
      : activeStatus === "dismissed_locally"
        ? "dismissed_not_deleted"
        : undefined;

  return {
    status: activeStatus,
    proposalId: `memory_${sourceTurnId}`,
    sourceTurnId,
    profile,
    proposedDiff: {
      kind: hasCandidate ? inferMemoryProposalKind(message) : "unknown",
      value: hasCandidate ? extractMemoryProposalValue(message) : "No memory candidate detected.",
    },
    rationale: isChild
      ? "Child protected memory is minimized and requires guardian review before anything can be stored."
      : "Concierge identified a possible preference or profile note for review only.",
    reviewRequired: hasCandidate,
    guardianReviewRequired: isChild && hasCandidate,
    childSafetyNote: isChild
      ? "I will not keep secrets or save this as memory without the right adult review."
      : undefined,
    blockedEffects: contract.blockedEffects.filter((effect) =>
      ["memory_write", "approval_capture", "external_send", "audit_append"].includes(effect),
    ),
    traceId: contract.traceEnvelope.trace_id,
    auditId: contract.auditEnvelope.audit_id,
    canAcknowledge: activeStatus === "review_needed",
    canDismiss: activeStatus === "review_needed",
    memoryWritePerformed: false,
    approvalCaptured: false,
    localReview,
  };
}

export function transitionMemoryProposalReviewState(
  review: MemoryProposalReviewState,
  status: Extract<MemoryProposalStatus, "acknowledged_locally" | "dismissed_locally">,
): MemoryProposalReviewState {
  return {
    ...review,
    status,
    canAcknowledge: false,
    canDismiss: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    localReview: status === "acknowledged_locally" ? "acknowledged_not_approved" : "dismissed_not_deleted",
  };
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
    memoryProposal: buildMemoryProposalReviewState(contract, message),
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
