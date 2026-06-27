import type { CapabilityPrivacyClass } from "./capabilityLedger.js";
import type { NapoleonProfileMode } from "./contractBridge.js";
import type { EvolutionProposalLifecycleRecord } from "./evolutionProposalLifecycle.js";
import type { NewAgentProposalLifecycleRecord } from "./newAgentProposalLifecycle.js";

export type LocalReviewHistoryEntryType =
  | "governance_review"
  | "memory_proposal"
  | "chief_of_staff_request"
  | "governance_evaluation"
  | "steering_review"
  | "taxonomy_review"
  | "capability_review_packet"
  | "new_agent_proposal"
  | "evolution_proposal"
  | "observability_trace";

export interface LocalReviewHistoryBoundary {
  localReviewOnly: true;
  proposalOnly: true;
  approvalCaptured: false;
  memoryWritePerformed: false;
  agentDispatchPerformed: false;
  externalSendPerformed: false;
  registryUpdatePerformed: false;
  agentActivated: false;
  evolutionApplied: false;
  appliedLocally: false;
}

export interface LocalReviewHistoryEntry {
  schemaVersion: "concierge.local-review-history-entry.v1";
  entryType: LocalReviewHistoryEntryType;
  title: string;
  subjectId: string;
  profileMode?: NapoleonProfileMode;
  status: string;
  latestKnownOutcome: string;
  decisionId?: string;
  auditId?: string;
  traceId?: string;
  updatedAt?: string;
  privacyClass: CapabilityPrivacyClass;
  boundary: LocalReviewHistoryBoundary;
}

export interface LocalReviewHistoryExport {
  schemaVersion: "concierge.local-review-history-export.v1";
  generatedAt: string;
  entryCount: number;
  privacyCaveat: string;
  authorityCaveat: string;
  entries: LocalReviewHistoryEntry[];
}

export interface GovernedReviewHistorySource {
  entryType: LocalReviewHistoryEntryType;
  title: string;
  subjectId: string;
  status?: string;
  latestKnownOutcome?: string;
  profileMode?: NapoleonProfileMode;
  decisionId?: string;
  auditId?: string;
  traceId?: string;
  updatedAt?: string;
  privacyClass?: CapabilityPrivacyClass;
}

export interface LocalReviewHistoryInput {
  governedReviews?: GovernedReviewHistorySource[];
  newAgentProposalLifecycleRecords?: NewAgentProposalLifecycleRecord[];
  evolutionProposalLifecycleRecords?: EvolutionProposalLifecycleRecord[];
}

const MAX_LOCAL_REVIEW_HISTORY_ENTRIES = 24;
const SENSITIVE_VALUE_PATTERN =
  /(@|https?:\/\/|www\.|localhost|127\.0\.0\.1|0\.0\.0\.0|bearer\s+|authorization|secret|token|password|credential|private\.)/i;

function baseBoundary(): LocalReviewHistoryBoundary {
  return {
    localReviewOnly: true,
    proposalOnly: true,
    approvalCaptured: false,
    memoryWritePerformed: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    registryUpdatePerformed: false,
    agentActivated: false,
    evolutionApplied: false,
    appliedLocally: false,
  };
}

function safeText(value: string | undefined, fallback: string): string {
  const trimmed = (value ?? "").trim().replace(/\s+/g, " ");
  if (!trimmed || SENSITIVE_VALUE_PATTERN.test(trimmed)) return fallback;
  return trimmed.slice(0, 180);
}

function optionalSafeText(value: string | undefined): string | undefined {
  const trimmed = (value ?? "").trim().replace(/\s+/g, " ");
  if (!trimmed || SENSITIVE_VALUE_PATTERN.test(trimmed)) return undefined;
  return trimmed.slice(0, 180);
}

function governedReviewEntry(source: GovernedReviewHistorySource): LocalReviewHistoryEntry {
  return {
    schemaVersion: "concierge.local-review-history-entry.v1",
    entryType: source.entryType,
    title: safeText(source.title, "Local review"),
    subjectId: safeText(source.subjectId, `${source.entryType}:unknown`),
    ...(source.profileMode ? { profileMode: source.profileMode } : {}),
    status: safeText(source.status, "review_metadata_returned"),
    latestKnownOutcome: safeText(
      source.latestKnownOutcome,
      "Local review metadata is available; Concierge did not apply side effects.",
    ),
    ...(optionalSafeText(source.decisionId) ? { decisionId: optionalSafeText(source.decisionId) } : {}),
    ...(optionalSafeText(source.auditId) ? { auditId: optionalSafeText(source.auditId) } : {}),
    ...(optionalSafeText(source.traceId) ? { traceId: optionalSafeText(source.traceId) } : {}),
    ...(optionalSafeText(source.updatedAt) ? { updatedAt: optionalSafeText(source.updatedAt) } : {}),
    privacyClass: source.privacyClass ?? "metadata_only",
    boundary: baseBoundary(),
  };
}

function newAgentProposalEntry(record: NewAgentProposalLifecycleRecord): LocalReviewHistoryEntry {
  return {
    schemaVersion: "concierge.local-review-history-entry.v1",
    entryType: "new_agent_proposal",
    title: "New-agent proposal",
    subjectId: safeText(record.proposalId, "new-agent-proposal:unknown"),
    profileMode: record.profileMode,
    status: record.currentLifecycleState,
    latestKnownOutcome: safeText(record.latestKnownOutcome, "New-agent proposal metadata is available."),
    ...(optionalSafeText(record.reviewDecisionId) ? { decisionId: optionalSafeText(record.reviewDecisionId) } : {}),
    ...(optionalSafeText(record.reviewAuditId) ? { auditId: optionalSafeText(record.reviewAuditId) } : {}),
    ...(optionalSafeText(record.reviewTraceId) ? { traceId: optionalSafeText(record.reviewTraceId) } : {}),
    updatedAt: safeText(record.updatedAt, record.draftedAt),
    privacyClass: record.privacyClass,
    boundary: baseBoundary(),
  };
}

function evolutionProposalEntry(record: EvolutionProposalLifecycleRecord): LocalReviewHistoryEntry {
  return {
    schemaVersion: "concierge.local-review-history-entry.v1",
    entryType: "evolution_proposal",
    title: "Evolution proposal",
    subjectId: safeText(record.proposalId, "evolution-proposal:unknown"),
    profileMode: record.profileMode,
    status: record.currentLifecycleState,
    latestKnownOutcome: safeText(record.latestKnownOutcome, "Evolution proposal metadata is available."),
    ...(optionalSafeText(record.intakeDecisionId) ? { decisionId: optionalSafeText(record.intakeDecisionId) } : {}),
    ...(optionalSafeText(record.intakeAuditId) ? { auditId: optionalSafeText(record.intakeAuditId) } : {}),
    ...(optionalSafeText(record.intakeTraceId) ? { traceId: optionalSafeText(record.intakeTraceId) } : {}),
    updatedAt: safeText(record.updatedAt, record.draftedAt),
    privacyClass: record.privacyClass,
    boundary: baseBoundary(),
  };
}

export function buildLocalReviewHistoryEntries(input: LocalReviewHistoryInput): LocalReviewHistoryEntry[] {
  return [
    ...(input.governedReviews ?? []).map(governedReviewEntry),
    ...(input.newAgentProposalLifecycleRecords ?? []).map(newAgentProposalEntry),
    ...(input.evolutionProposalLifecycleRecords ?? []).map(evolutionProposalEntry),
  ]
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, MAX_LOCAL_REVIEW_HISTORY_ENTRIES);
}

export function exportLocalReviewHistoryEntries(
  entries: LocalReviewHistoryEntry[],
  options: { generatedAt?: string } = {},
): LocalReviewHistoryExport {
  return {
    schemaVersion: "concierge.local-review-history-export.v1",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    entryCount: entries.length,
    privacyCaveat:
      "Local metadata only. Original conversation content, credentials, endpoint hosts, request bodies, response bodies, audio, and video are excluded.",
    authorityCaveat:
      "This is not Napoleon approval. Concierge did not write memory, capture approval, dispatch agents, send externally, update registries, activate agents, apply evolution, or apply changes locally.",
    entries: entries.slice(0, MAX_LOCAL_REVIEW_HISTORY_ENTRIES),
  };
}
