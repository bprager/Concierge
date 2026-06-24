import type { CapabilityPrivacyClass } from "./capabilityLedger.js";
import type { NapoleonProfileMode } from "./contractBridge.js";
import type { EvolutionProposalSubmissionPacket, EvolutionProposalSubmissionResult } from "./evolutionProposalSubmission.js";

export const EVOLUTION_PROPOSAL_LIFECYCLE_STORAGE_KEY = "concierge_evolution_proposal_lifecycle";
const MAX_LIFECYCLE_RECORDS = 20;

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
    available: false;
    reason: "descriptor_status_route_not_advertised";
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
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EvolutionProposalLifecycleRecord>;
  return (
    candidate.schemaVersion === "concierge.evolution-proposal-lifecycle.v1" &&
    typeof candidate.proposalId === "string" &&
    typeof candidate.sourceCapabilityReviewId === "string" &&
    typeof candidate.currentLifecycleState === "string" &&
    candidate.boundary?.proposalOnly === true &&
    candidate.boundary?.evolutionApplied === false &&
    candidate.boundary?.registryUpdatePerformed === false
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
