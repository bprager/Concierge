import type { CapabilityPrivacyClass } from "./capabilityLedger.js";
import type { NapoleonProfileMode } from "./contractBridge.js";
import type {
  NewAgentProposalReviewPacket,
  NewAgentProposalReviewSubmissionResult,
} from "./newAgentProposalReviewSubmission.js";

export const NEW_AGENT_PROPOSAL_LIFECYCLE_STORAGE_KEY = "concierge_new_agent_proposal_lifecycle";
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

export type NewAgentProposalLifecycleState = "drafted" | "sent_for_review" | "review_returned" | "failed_closed";

export interface NewAgentProposalLifecycleRecord {
  schemaVersion: "concierge.new-agent-proposal-lifecycle.v1";
  proposalId: string;
  proposedAgentId: string;
  profileMode: NapoleonProfileMode;
  capability: string;
  architectureArea: string;
  draftedAt: string;
  sentAt?: string;
  reviewedAt?: string;
  updatedAt: string;
  currentLifecycleState: NewAgentProposalLifecycleState;
  latestKnownOutcome: string;
  reviewDecisionId?: string;
  reviewAuditId?: string;
  reviewTraceId?: string;
  nextRecommendedUserAction: string;
  privacyClass: CapabilityPrivacyClass;
  boundary: {
    proposalOnly: true;
    approvalCaptured: false;
    memoryWritePerformed: false;
    agentDispatchPerformed: false;
    externalSendPerformed: false;
    registryUpdatePerformed: false;
    agentActivated: false;
    appliedLocally: false;
  };
}

export interface NewAgentProposalLifecycleExport {
  schemaVersion: "concierge.new-agent-proposal-lifecycle-export.v1";
  generatedAt: string;
  privacyCaveat: string;
  authorityCaveat: string;
  records: NewAgentProposalLifecycleRecord[];
}

export interface NewAgentProposalLifecycleStorage {
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

function safeOutcome(value: string, fallback: string): string {
  const withoutSensitiveWords = value
    .replace(/\bhttps?:\/\/\S+/gi, "[redacted]")
    .replace(/\bwss?:\/\/\S+/gi, "[redacted]")
    .replace(/\b\S*token\S*\b/gi, "[redacted]")
    .replace(/\b\S*authorization\S*\b/gi, "[redacted]")
    .replace(/\bprivate\.[^\s]+/gi, "[redacted]")
    .trim()
    .replace(/\s+/g, " ");
  return (withoutSensitiveWords || fallback).slice(0, 160);
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

function isLifecycleState(value: unknown): value is NewAgentProposalLifecycleState {
  return (
    value === "drafted" ||
    value === "sent_for_review" ||
    value === "review_returned" ||
    value === "failed_closed"
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

function baseBoundary(): NewAgentProposalLifecycleRecord["boundary"] {
  return {
    proposalOnly: true,
    approvalCaptured: false,
    memoryWritePerformed: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    registryUpdatePerformed: false,
    agentActivated: false,
    appliedLocally: false,
  };
}

export function buildDraftNewAgentProposalLifecycleRecord(
  packet: NewAgentProposalReviewPacket,
  options: { draftedAt?: string } = {},
): NewAgentProposalLifecycleRecord {
  const draftedAt = nowIso(options.draftedAt);
  return {
    schemaVersion: "concierge.new-agent-proposal-lifecycle.v1",
    proposalId: packet.proposalId,
    proposedAgentId: safeMetadata(packet.proposedAgent.agentId, "unknown proposed agent"),
    profileMode: packet.profileMode,
    capability: safeMetadata(packet.proposedAgent.capability, "unknown capability"),
    architectureArea: safeMetadata(packet.proposedAgent.architectureArea, "unknown"),
    draftedAt,
    updatedAt: draftedAt,
    currentLifecycleState: "drafted",
    latestKnownOutcome: "Drafted locally; not sent to Napoleon.",
    nextRecommendedUserAction: "Review the packet, then submit only if the governed Napoleon review handoff is available.",
    privacyClass: "metadata_only",
    boundary: baseBoundary(),
  };
}

export function markNewAgentProposalLifecycleSentForReview(
  current: NewAgentProposalLifecycleRecord,
  options: { sentAt?: string } = {},
): NewAgentProposalLifecycleRecord {
  const sentAt = nowIso(options.sentAt);
  return {
    ...current,
    sentAt,
    updatedAt: sentAt,
    currentLifecycleState: "sent_for_review",
    latestKnownOutcome: "Sent to Napoleon for governed review; no activation or registry update performed.",
    nextRecommendedUserAction: "Wait for Napoleon review metadata before relying on any proposed agent change.",
    privacyClass: "metadata_only",
    boundary: baseBoundary(),
  };
}

export function updateNewAgentProposalLifecycleAfterSubmission(
  current: NewAgentProposalLifecycleRecord,
  result: NewAgentProposalReviewSubmissionResult,
  options: { reviewedAt?: string } = {},
): NewAgentProposalLifecycleRecord {
  const reviewedAt = nowIso(options.reviewedAt);
  return {
    ...current,
    sentAt: current.sentAt ?? reviewedAt,
    reviewedAt,
    updatedAt: reviewedAt,
    currentLifecycleState: "review_returned",
    latestKnownOutcome:
      "Napoleon returned governed review metadata; Concierge did not activate an agent or update a registry.",
    reviewDecisionId: result.governanceDecision.decision_id,
    reviewAuditId: result.auditEnvelope.audit_id,
    reviewTraceId: result.traceEnvelope.trace_id,
    nextRecommendedUserAction: "Wait for Napoleon-governed approval, registry, activation, or rejection evidence.",
    privacyClass: "metadata_only",
    boundary: baseBoundary(),
  };
}

export function updateNewAgentProposalLifecycleAfterFailure(
  current: NewAgentProposalLifecycleRecord,
  reason: string,
  options: { updatedAt?: string } = {},
): NewAgentProposalLifecycleRecord {
  const updatedAt = nowIso(options.updatedAt);
  return {
    ...current,
    updatedAt,
    currentLifecycleState: "failed_closed",
    latestKnownOutcome: safeOutcome(`Submission failed closed: ${reason}`, "Submission failed closed."),
    nextRecommendedUserAction: "Fix the governed handoff blocker before attempting submission again.",
    privacyClass: "metadata_only",
    boundary: baseBoundary(),
  };
}

export function upsertNewAgentProposalLifecycleRecord(
  records: NewAgentProposalLifecycleRecord[],
  record: NewAgentProposalLifecycleRecord,
): NewAgentProposalLifecycleRecord[] {
  const remaining = records.filter((item) => item.proposalId !== record.proposalId);
  return [record, ...remaining]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_LIFECYCLE_RECORDS);
}

function isLifecycleRecord(value: unknown): value is NewAgentProposalLifecycleRecord {
  const candidate = objectRecord(value) as Partial<NewAgentProposalLifecycleRecord> | null;
  if (!candidate) return false;
  return (
    candidate.schemaVersion === "concierge.new-agent-proposal-lifecycle.v1" &&
    isCleanString(candidate.proposalId) &&
    isCleanString(candidate.proposedAgentId) &&
    isNapoleonProfileMode(candidate.profileMode) &&
    isCleanString(candidate.capability) &&
    isCleanString(candidate.architectureArea) &&
    isCleanString(candidate.draftedAt) &&
    isCleanOptionalString(candidate.sentAt) &&
    isCleanOptionalString(candidate.reviewedAt) &&
    isCleanString(candidate.updatedAt) &&
    isLifecycleState(candidate.currentLifecycleState) &&
    isCleanString(candidate.latestKnownOutcome) &&
    isCleanOptionalString(candidate.reviewDecisionId) &&
    isCleanOptionalString(candidate.reviewAuditId) &&
    isCleanOptionalString(candidate.reviewTraceId) &&
    isCleanString(candidate.nextRecommendedUserAction) &&
    isLifecyclePrivacyClass(candidate.privacyClass) &&
    candidate.boundary?.proposalOnly === true &&
    candidate.boundary.approvalCaptured === false &&
    candidate.boundary.memoryWritePerformed === false &&
    candidate.boundary.agentDispatchPerformed === false &&
    candidate.boundary.externalSendPerformed === false &&
    candidate.boundary.registryUpdatePerformed === false &&
    candidate.boundary.agentActivated === false &&
    candidate.boundary.appliedLocally === false &&
    !containsForbiddenLifecycleContent(candidate)
  );
}

export function loadNewAgentProposalLifecycleRecords(
  storage: NewAgentProposalLifecycleStorage | null | undefined,
): NewAgentProposalLifecycleRecord[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(NEW_AGENT_PROPOSAL_LIFECYCLE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isLifecycleRecord).slice(0, MAX_LIFECYCLE_RECORDS);
  } catch {
    return [];
  }
}

export function persistNewAgentProposalLifecycleRecords(
  storage: NewAgentProposalLifecycleStorage | null | undefined,
  records: NewAgentProposalLifecycleRecord[],
): boolean {
  if (!storage) return false;
  storage.setItem(NEW_AGENT_PROPOSAL_LIFECYCLE_STORAGE_KEY, JSON.stringify(records.slice(0, MAX_LIFECYCLE_RECORDS)));
  return true;
}

export function clearNewAgentProposalLifecycleRecords(
  storage: NewAgentProposalLifecycleStorage | null | undefined,
): boolean {
  if (!storage) return false;
  storage.removeItem(NEW_AGENT_PROPOSAL_LIFECYCLE_STORAGE_KEY);
  return true;
}

export function exportNewAgentProposalLifecycleRecords(
  records: NewAgentProposalLifecycleRecord[],
  options: { generatedAt?: string } = {},
): NewAgentProposalLifecycleExport {
  return {
    schemaVersion: "concierge.new-agent-proposal-lifecycle-export.v1",
    generatedAt: nowIso(options.generatedAt),
    privacyCaveat: "Metadata-only local new-agent proposal lifecycle records; raw conversation text and proposal payloads are not stored.",
    authorityCaveat:
      "Concierge tracks local handoff state only. Napoleon remains the authority for approval, registry updates, activation, and rejection.",
    records: records.slice(0, MAX_LIFECYCLE_RECORDS),
  };
}
