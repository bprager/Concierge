import type { CapabilityPrivacyClass } from "./capabilityLedger.js";
import type { AuditEnvelope, GovernanceDecision, NapoleonProfileMode, TraceEnvelope } from "./contractBridge.js";
import type { EvolutionProposalSubmissionPacket, EvolutionProposalSubmissionResult } from "./evolutionProposalSubmission.js";

export const EVOLUTION_PROPOSAL_LIFECYCLE_STORAGE_KEY = "concierge_evolution_proposal_lifecycle";
const MAX_LIFECYCLE_RECORDS = 20;
const FORBIDDEN_LIFECYCLE_KEY_NAMES = new Set(
  [
    "authToken",
    "authorization",
    "bearerToken",
    "bearer_token",
    "endpoint",
    "host",
    "message",
    "prompt",
    "proposalBody",
    "proposal_body",
    "rawPrompt",
    "raw_prompt",
    "requestBody",
    "request_body",
    "responseBody",
    "response_body",
    "responseText",
    "response_text",
    "token",
  ].map((key) => key.toLocaleLowerCase()),
);
const FORBIDDEN_LIFECYCLE_NORMALIZED_KEY_NAMES = new Set(
  [...FORBIDDEN_LIFECYCLE_KEY_NAMES].map((key) => key.replace(/[_-]/g, "")),
);
const FORBIDDEN_LIFECYCLE_VALUE_PATTERNS = [
  /\bhttps?:\/\//i,
  /\bwss?:\/\//i,
  /\blocalhost\b/i,
  /\b127\.0\.0\.1\b/,
  /\b0\.0\.0\.0\b/,
  /\bbearer\b/i,
  /\bauthorization\b/i,
  /\btoken\b/i,
];

export type EvolutionProposalLifecycleState =
  | "drafted"
  | "submitted"
  | "accepted_for_review"
  | "rejected"
  | "blocked"
  | "status_refresh_unavailable"
  | "implemented"
  | "rolled_back";

export interface EvolutionProposalLifecycleRecord {
  schemaVersion: "concierge.evolution-proposal-lifecycle.v1";
  proposalId: string;
  sourceCapabilityReviewId: string;
  profileMode: NapoleonProfileMode;
  capability: string;
  architectureArea: string;
  draftedAt: string;
  submittedAt?: string;
  updatedAt: string;
  currentLifecycleState: EvolutionProposalLifecycleState;
  latestKnownOutcome: string;
  intakeDecisionId?: string;
  intakeAuditId?: string;
  intakeTraceId?: string;
  statusRefresh: {
    available: boolean;
    reason: "descriptor_status_route_not_advertised" | "refreshed_via_governed_route";
    nextStep: string;
  };
  nextRecommendedUserAction: string;
  privacyClass: CapabilityPrivacyClass;
  boundary: {
    proposalOnly: true;
    approvalCaptured: false;
    memoryWritePerformed: false;
    agentDispatchPerformed: false;
    externalSendPerformed: false;
    registryUpdatePerformed: false;
    evolutionApplied: false;
    appliedLocally: false;
  };
}

export interface EvolutionProposalLifecycleExport {
  schemaVersion: "concierge.evolution-proposal-lifecycle-export.v1";
  generatedAt: string;
  privacyCaveat: string;
  authorityCaveat: string;
  records: EvolutionProposalLifecycleRecord[];
}

export interface EvolutionProposalStatusResult {
  proposalId: string;
  lifecycleState: EvolutionProposalLifecycleState;
  latestKnownOutcome: string;
  governanceDecision: GovernanceDecision;
  traceEnvelope: TraceEnvelope;
  auditEnvelope: AuditEnvelope;
  appliedLocally: false;
  memoryWritePerformed: false;
  approvalCaptured: false;
  agentDispatchPerformed: false;
  externalSendPerformed: false;
  registryUpdatePerformed: false;
  evolutionApplied: false;
}

export interface EvolutionProposalLifecycleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function nowIso(now?: string): string {
  return now ?? new Date().toISOString();
}

function safeMetadata(value: string, fallback: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return (trimmed || fallback).slice(0, 160);
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function isCleanString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isCleanOptionalString(value: unknown): value is string | undefined {
  return value === undefined || isCleanString(value);
}

function isNapoleonProfileMode(value: unknown): value is NapoleonProfileMode {
  return value === "adult_owner" || value === "child_protected_user" || value === "guest" || value === "collaborator";
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

function isLifecyclePrivacyClass(value: unknown): value is CapabilityPrivacyClass {
  return (
    value === "metadata_only" ||
    value === "redacted_summary" ||
    value === "sensitive" ||
    value === "child_sensitive"
  );
}

function containsForbiddenLifecycleContent(value: unknown): boolean {
  if (typeof value === "string") {
    return FORBIDDEN_LIFECYCLE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  }
  if (Array.isArray(value)) return value.some((item) => containsForbiddenLifecycleContent(item));
  const record = objectRecord(value);
  if (!record) return false;
  return Object.entries(record).some(([key, nested]) => {
    const keyName = key.toLocaleLowerCase();
    const normalizedKeyName = keyName.replace(/[_-]/g, "");
    if (FORBIDDEN_LIFECYCLE_KEY_NAMES.has(keyName)) return true;
    if (FORBIDDEN_LIFECYCLE_NORMALIZED_KEY_NAMES.has(normalizedKeyName)) return true;
    return containsForbiddenLifecycleContent(nested);
  });
}

function baseBoundary(): EvolutionProposalLifecycleRecord["boundary"] {
  return {
    proposalOnly: true,
    approvalCaptured: false,
    memoryWritePerformed: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    registryUpdatePerformed: false,
    evolutionApplied: false,
    appliedLocally: false,
  };
}

function unavailableRefresh() {
  return {
    available: false as const,
    reason: "descriptor_status_route_not_advertised" as const,
    nextStep:
      "Keep the local intake result as evidence until Napoleon advertises a governed proposal status route.",
  };
}

export function buildDraftEvolutionProposalLifecycleRecord(
  packet: EvolutionProposalSubmissionPacket,
  options: { draftedAt?: string } = {},
): EvolutionProposalLifecycleRecord {
  const draftedAt = nowIso(options.draftedAt);
  return {
    schemaVersion: "concierge.evolution-proposal-lifecycle.v1",
    proposalId: packet.proposalId,
    sourceCapabilityReviewId: packet.evaluatorCaseCandidate.caseId,
    profileMode: packet.profileMode,
    capability: safeMetadata(packet.evolutionProposal.change.capability, "unknown capability"),
    architectureArea: safeMetadata(packet.evolutionProposal.change.architecture_area, "unknown"),
    draftedAt,
    updatedAt: draftedAt,
    currentLifecycleState: "drafted",
    latestKnownOutcome: "Drafted locally; not submitted to Napoleon.",
    statusRefresh: unavailableRefresh(),
    nextRecommendedUserAction: "Review the packet, then submit only if the governed Napoleon intake handoff is available.",
    privacyClass: "metadata_only",
    boundary: baseBoundary(),
  };
}

export function updateEvolutionProposalLifecycleAfterSubmission(
  current: EvolutionProposalLifecycleRecord,
  result: EvolutionProposalSubmissionResult,
  options: { submittedAt?: string } = {},
): EvolutionProposalLifecycleRecord {
  const submittedAt = nowIso(options.submittedAt);
  const outcome = result.governanceDecision.outcome;
  const accepted = outcome !== "deny" && outcome !== "no_go";
  return {
    ...current,
    submittedAt,
    updatedAt: submittedAt,
    currentLifecycleState: accepted ? "accepted_for_review" : "rejected",
    latestKnownOutcome: accepted
      ? "Napoleon accepted the proposal for governed intake review."
      : `Napoleon returned ${outcome}; Concierge did not apply the proposal.`,
    intakeDecisionId: result.governanceDecision.decision_id,
    intakeAuditId: result.auditEnvelope.audit_id,
    intakeTraceId: result.traceEnvelope.trace_id,
    statusRefresh: unavailableRefresh(),
    nextRecommendedUserAction: accepted
      ? "Wait for Napoleon-governed review, implementation, rollout, or rollback evidence."
      : "Revise or discard the proposal before attempting another governed handoff.",
    privacyClass: "metadata_only",
    boundary: baseBoundary(),
  };
}

export function updateEvolutionProposalLifecycleAfterFailure(
  current: EvolutionProposalLifecycleRecord,
  reason: string,
  options: { updatedAt?: string } = {},
): EvolutionProposalLifecycleRecord {
  const updatedAt = nowIso(options.updatedAt);
  return {
    ...current,
    updatedAt,
    currentLifecycleState: "blocked",
    latestKnownOutcome: safeMetadata(`Submission blocked: ${reason}`, "Submission blocked."),
    statusRefresh: unavailableRefresh(),
    nextRecommendedUserAction: "Fix the governed handoff blocker before attempting submission again.",
    privacyClass: "metadata_only",
    boundary: baseBoundary(),
  };
}

export function updateEvolutionProposalLifecycleFromStatus(
  current: EvolutionProposalLifecycleRecord,
  result: EvolutionProposalStatusResult,
  options: { updatedAt?: string } = {},
): EvolutionProposalLifecycleRecord {
  const updatedAt = nowIso(options.updatedAt);
  return {
    ...current,
    updatedAt,
    currentLifecycleState: result.lifecycleState,
    latestKnownOutcome: safeMetadata(result.latestKnownOutcome, "Napoleon returned proposal status metadata."),
    intakeDecisionId: result.governanceDecision.decision_id,
    intakeAuditId: result.auditEnvelope.audit_id,
    intakeTraceId: result.traceEnvelope.trace_id,
    statusRefresh: {
      available: true,
      reason: "refreshed_via_governed_route",
      nextStep: "Latest status was refreshed through a descriptor-advertised governed route.",
    },
    nextRecommendedUserAction:
      result.lifecycleState === "implemented" || result.lifecycleState === "rolled_back"
        ? "Review Napoleon's implementation, rollout, or rollback evidence before relying on the change."
        : "Continue tracking through Napoleon-governed status evidence.",
    privacyClass: "metadata_only",
    boundary: baseBoundary(),
  };
}

export function upsertEvolutionProposalLifecycleRecord(
  records: EvolutionProposalLifecycleRecord[],
  record: EvolutionProposalLifecycleRecord,
): EvolutionProposalLifecycleRecord[] {
  const remaining = records.filter((item) => item.proposalId !== record.proposalId);
  return [record, ...remaining]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_LIFECYCLE_RECORDS);
}

function isLifecycleRecord(value: unknown): value is EvolutionProposalLifecycleRecord {
  const candidate = objectRecord(value) as Partial<EvolutionProposalLifecycleRecord> | null;
  if (!candidate) return false;
  const refresh = objectRecord(candidate.statusRefresh);
  return (
    candidate.schemaVersion === "concierge.evolution-proposal-lifecycle.v1" &&
    isCleanString(candidate.proposalId) &&
    isCleanString(candidate.sourceCapabilityReviewId) &&
    isNapoleonProfileMode(candidate.profileMode) &&
    isCleanString(candidate.capability) &&
    isCleanString(candidate.architectureArea) &&
    isCleanString(candidate.draftedAt) &&
    isCleanOptionalString(candidate.submittedAt) &&
    isCleanString(candidate.updatedAt) &&
    isLifecycleState(candidate.currentLifecycleState) &&
    isCleanString(candidate.latestKnownOutcome) &&
    isCleanOptionalString(candidate.intakeDecisionId) &&
    isCleanOptionalString(candidate.intakeAuditId) &&
    isCleanOptionalString(candidate.intakeTraceId) &&
    refresh !== null &&
    typeof refresh.available === "boolean" &&
    (refresh.reason === "descriptor_status_route_not_advertised" || refresh.reason === "refreshed_via_governed_route") &&
    isCleanString(refresh.nextStep) &&
    isCleanString(candidate.nextRecommendedUserAction) &&
    isLifecyclePrivacyClass(candidate.privacyClass) &&
    candidate.boundary?.proposalOnly === true &&
    candidate.boundary.approvalCaptured === false &&
    candidate.boundary.memoryWritePerformed === false &&
    candidate.boundary.agentDispatchPerformed === false &&
    candidate.boundary.externalSendPerformed === false &&
    candidate.boundary?.evolutionApplied === false &&
    candidate.boundary?.registryUpdatePerformed === false &&
    candidate.boundary.appliedLocally === false &&
    !containsForbiddenLifecycleContent(candidate)
  );
}

export function loadEvolutionProposalLifecycleRecords(
  storage: EvolutionProposalLifecycleStorage | null | undefined,
): EvolutionProposalLifecycleRecord[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(EVOLUTION_PROPOSAL_LIFECYCLE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isLifecycleRecord).slice(0, MAX_LIFECYCLE_RECORDS);
  } catch {
    return [];
  }
}

export function persistEvolutionProposalLifecycleRecords(
  storage: EvolutionProposalLifecycleStorage | null | undefined,
  records: EvolutionProposalLifecycleRecord[],
): boolean {
  if (!storage) return false;
  storage.setItem(EVOLUTION_PROPOSAL_LIFECYCLE_STORAGE_KEY, JSON.stringify(records.slice(0, MAX_LIFECYCLE_RECORDS)));
  return true;
}

export function clearEvolutionProposalLifecycleRecords(
  storage: EvolutionProposalLifecycleStorage | null | undefined,
): boolean {
  if (!storage) return false;
  storage.removeItem(EVOLUTION_PROPOSAL_LIFECYCLE_STORAGE_KEY);
  return true;
}

export function exportEvolutionProposalLifecycleRecords(
  records: EvolutionProposalLifecycleRecord[],
  options: { generatedAt?: string } = {},
): EvolutionProposalLifecycleExport {
  return {
    schemaVersion: "concierge.evolution-proposal-lifecycle-export.v1",
    generatedAt: nowIso(options.generatedAt),
    privacyCaveat: "Metadata-only local proposal lifecycle records; raw conversation text and proposal payloads are not stored.",
    authorityCaveat:
      "Concierge tracks local handoff state only. Napoleon remains the authority for approval, implementation, rollout, and rollback.",
    records: records.slice(0, MAX_LIFECYCLE_RECORDS),
  };
}
