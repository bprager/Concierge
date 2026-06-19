import type {
  CapabilityArchitectureArea,
  CapabilityOutcomeSignal,
  CapabilityPrivacyClass,
  CapabilityStatus,
  ConversationCapabilitySignal,
  SuggestedNextStep,
} from "./capabilityLedger.js";
import type { NapoleonProfileMode } from "./contractBridge.js";

export type LearningSignalType = "correction" | "interruption" | "rating" | "repeated_pattern";
export type LearningSignalSource =
  | "local_user_action"
  | "local_rehearsal"
  | "local_capability_ledger"
  | "governed_bridge_metadata";
export type LearningSignalArchitectureArea =
  | "text_ui"
  | "governance_ux"
  | "napoleon_bridge"
  | "memory_review"
  | "capability_intelligence"
  | "voice_pipeline"
  | "avatar_pipeline"
  | "observability"
  | "self_evolution"
  | "unknown";
export type LearningSignalOutcome =
  | "worked"
  | "degraded"
  | "missing"
  | "blocked_correctly"
  | "unsafe_refused"
  | "unknown";
export type LearningSignalSuggestedNextStep =
  | "no_action"
  | "add_evaluator_case"
  | "draft_evolution_proposal"
  | "improve_bridge_contract"
  | "improve_governance_ux"
  | "improve_voice_pipeline"
  | "improve_avatar_pipeline"
  | "human_review";
export type LearningSignalPrivacyClassification = "metadata_only" | "redacted_summary" | "child_sensitive";
export type LearningSignalRetention = "local_count_bounded" | "local_age_bounded" | "session_only";
export type LearningSignalProfileMode = "adult_owner" | "child_protected_user" | "guest_user" | "collaborator_user";
export type LearningSignalSeverity = "low" | "medium" | "high" | "critical";

export interface LearningSignalPrivacy {
  classification: LearningSignalPrivacyClassification;
  raw_user_text_stored: false;
  raw_audio_stored: false;
  raw_video_stored: false;
  child_minimized: boolean;
  retention: LearningSignalRetention;
}

export interface LearningSignalGovernanceBoundary {
  proposal_only: true;
  approval_captured: false;
  memory_write_performed: false;
  agent_dispatch_performed: false;
  external_send_performed: false;
  applied_locally: false;
}

export interface LearningSignal {
  signal_id: string;
  schema_version: "concierge.learning_signal.v1";
  created_at: string;
  conversation_id: string;
  turn_id: string;
  trace_id: string;
  profile_mode: LearningSignalProfileMode;
  channel: "text" | "voice" | "avatar";
  signal_type: LearningSignalType;
  source: LearningSignalSource;
  capability_id: string;
  architecture_area: LearningSignalArchitectureArea;
  outcome?: LearningSignalOutcome;
  confidence: number;
  severity?: LearningSignalSeverity;
  user_rating?: number;
  pattern_count?: number;
  evidence_refs: string[];
  redacted_summary?: string;
  suggested_next_step?: LearningSignalSuggestedNextStep;
  privacy: LearningSignalPrivacy;
  governance_boundary: LearningSignalGovernanceBoundary;
}

export interface LearningSignalInput {
  signalId: string;
  createdAt?: string;
  conversationId: string;
  turnId: string;
  traceId: string;
  profileMode: NapoleonProfileMode;
  channel: "text" | "voice" | "avatar";
  signalType: LearningSignalType;
  source: LearningSignalSource;
  capabilityId: string;
  architectureArea: LearningSignalArchitectureArea;
  outcome?: LearningSignalOutcome;
  confidence: number;
  severity?: LearningSignalSeverity;
  userRating?: number;
  patternCount?: number;
  evidenceRefs: string[];
  redactedSummary?: string;
  suggestedNextStep?: LearningSignalSuggestedNextStep;
  privacyClass: CapabilityPrivacyClass;
}

export interface LearningSignalFromCapabilityOptions {
  signalId: string;
  createdAt?: string;
  signalType: LearningSignalType;
  source?: LearningSignalSource;
  severity?: LearningSignalSeverity;
  userRating?: number;
  patternCount?: number;
  redactedSummary?: string;
}

export interface LearningSignalTelemetryAttributes {
  eventName: "learning_signal_recorded";
  signalId: string;
  signalType: LearningSignalType;
  source: LearningSignalSource;
  capabilityId: string;
  architectureArea: LearningSignalArchitectureArea;
  outcome?: LearningSignalOutcome;
  profileMode: LearningSignalProfileMode;
  channel: "text" | "voice" | "avatar";
  confidence: number;
  evidenceRefCount: number;
  privacyClassification: LearningSignalPrivacyClassification;
  childMinimized: boolean;
  proposalOnly: true;
  approvalCaptured: false;
  memoryWritePerformed: false;
  agentDispatchPerformed: false;
  externalSendPerformed: false;
  appliedLocally: false;
}

const LEARNING_SIGNAL_SCHEMA_VERSION = "concierge.learning_signal.v1" as const;
const GOVERNANCE_BOUNDARY: LearningSignalGovernanceBoundary = {
  proposal_only: true,
  approval_captured: false,
  memory_write_performed: false,
  agent_dispatch_performed: false,
  external_send_performed: false,
  applied_locally: false,
};

function clampConfidence(confidence: number): number {
  if (Number.isNaN(confidence)) return 0;
  return Math.max(0, Math.min(1, confidence));
}

const SAFE_LEARNING_LABEL_PATTERN = /^[a-z0-9][a-z0-9_.-]{0,63}$/i;
const SAFE_LEARNING_EVIDENCE_REF_PATTERN =
  /^(trace|audit|turn|capability|evaluator|event):[a-z0-9][a-z0-9_.:-]{0,95}$/i;
const SENSITIVE_LEARNING_METADATA_PATTERN =
  /(@|https?:\/\/|www\.|bearer\s+|sk-[a-z0-9_-]{8,}|secret|token|password|credential)/i;

function sanitizeLearningLabel(value: string): string {
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed.length > 64 ||
    /\s/.test(trimmed) ||
    SENSITIVE_LEARNING_METADATA_PATTERN.test(trimmed) ||
    !SAFE_LEARNING_LABEL_PATTERN.test(trimmed)
  ) {
    return "redacted_label";
  }
  return trimmed;
}

function normalizeProfileMode(profileMode: NapoleonProfileMode): LearningSignalProfileMode {
  if (profileMode === "child_protected_user") return "child_protected_user";
  if (profileMode === "guest") return "guest_user";
  if (profileMode === "collaborator") return "collaborator_user";
  return "adult_owner";
}

function mapArchitectureArea(area: CapabilityArchitectureArea): LearningSignalArchitectureArea {
  switch (area) {
    case "bridge":
      return "napoleon_bridge";
    case "evaluator":
      return "self_evolution";
    case "agent_registry":
    case "napoleon_runtime":
      return "capability_intelligence";
    case "settings_privacy":
      return "governance_ux";
    case "voice":
      return "voice_pipeline";
    case "avatar":
      return "avatar_pipeline";
    default:
      return area;
  }
}

function mapOutcome(status: CapabilityStatus, outcomeSignal: CapabilityOutcomeSignal): LearningSignalOutcome {
  if (outcomeSignal === "blocked") return "blocked_correctly";
  if (status === "working") return "worked";
  if (status === "degraded") return "degraded";
  if (status === "missing") return "missing";
  if (status === "blocked") return "blocked_correctly";
  return "unknown";
}

function mapSuggestedNextStep(step: SuggestedNextStep, area: CapabilityArchitectureArea): LearningSignalSuggestedNextStep {
  if (step === "write_evaluator_case") return "add_evaluator_case";
  if (step === "create_evolution_proposal") return "draft_evolution_proposal";
  if (step === "needs_human_review") return "human_review";
  if (step === "add_backlog_item") {
    if (area === "bridge") return "improve_bridge_contract";
    if (area === "governance_ux" || area === "settings_privacy") return "improve_governance_ux";
    if (area === "voice") return "improve_voice_pipeline";
    if (area === "avatar") return "improve_avatar_pipeline";
  }
  return "no_action";
}

function privacyFor(profileMode: LearningSignalProfileMode, privacyClass: CapabilityPrivacyClass): LearningSignalPrivacy {
  const childMinimized = profileMode === "child_protected_user";
  const classification: LearningSignalPrivacyClassification = childMinimized
    ? "child_sensitive"
    : privacyClass === "redacted_summary"
      ? "redacted_summary"
      : "metadata_only";

  return {
    classification,
    raw_user_text_stored: false,
    raw_audio_stored: false,
    raw_video_stored: false,
    child_minimized: childMinimized,
    retention: childMinimized ? "session_only" : "local_count_bounded",
  };
}

function normalizeEvidenceRefs(evidenceRefs: string[], capabilityId: string): string[] {
  const refs = evidenceRefs
    .map((ref) => ref.trim())
    .filter(
      (ref) =>
        ref.length <= 128 &&
        !/\s/.test(ref) &&
        !SENSITIVE_LEARNING_METADATA_PATTERN.test(ref) &&
        SAFE_LEARNING_EVIDENCE_REF_PATTERN.test(ref),
    );
  refs.push(`capability:${sanitizeLearningLabel(capabilityId)}`);
  return Array.from(new Set(refs));
}

function optionalRedactedSummary(summary: string | undefined): string | undefined {
  if (!summary) return undefined;
  const trimmed = summary.trim();
  if (!trimmed || SENSITIVE_LEARNING_METADATA_PATTERN.test(trimmed)) return undefined;
  return trimmed.slice(0, 240);
}

export function buildLearningSignal(input: LearningSignalInput): LearningSignal {
  const profileMode = normalizeProfileMode(input.profileMode);
  const learningSignal: LearningSignal = {
    signal_id: input.signalId,
    schema_version: LEARNING_SIGNAL_SCHEMA_VERSION,
    created_at: input.createdAt ?? new Date().toISOString(),
    conversation_id: input.conversationId,
    turn_id: input.turnId,
    trace_id: input.traceId,
    profile_mode: profileMode,
    channel: input.channel,
    signal_type: input.signalType,
    source: input.source,
    capability_id: sanitizeLearningLabel(input.capabilityId),
    architecture_area: input.architectureArea,
    confidence: clampConfidence(input.confidence),
    evidence_refs: normalizeEvidenceRefs(input.evidenceRefs, input.capabilityId),
    privacy: privacyFor(profileMode, input.privacyClass),
    governance_boundary: GOVERNANCE_BOUNDARY,
  };

  if (input.outcome !== undefined) learningSignal.outcome = input.outcome;
  if (input.severity !== undefined) learningSignal.severity = input.severity;
  if (input.signalType === "rating" && input.userRating !== undefined) learningSignal.user_rating = input.userRating;
  if (input.signalType === "repeated_pattern" && input.patternCount !== undefined) {
    learningSignal.pattern_count = input.patternCount;
  }
  const redactedSummary = optionalRedactedSummary(input.redactedSummary);
  if (redactedSummary !== undefined) learningSignal.redacted_summary = redactedSummary;
  if (input.suggestedNextStep !== undefined) learningSignal.suggested_next_step = input.suggestedNextStep;

  if (learningSignal.signal_type === "rating" && learningSignal.user_rating === undefined) {
    throw new Error("rating learning signals require userRating");
  }
  if (learningSignal.signal_type === "repeated_pattern" && learningSignal.pattern_count === undefined) {
    throw new Error("repeated pattern learning signals require patternCount");
  }

  return learningSignal;
}

export function buildLearningSignalFromCapabilitySignal(
  signal: ConversationCapabilitySignal,
  options: LearningSignalFromCapabilityOptions,
): LearningSignal {
  return buildLearningSignal({
    signalId: options.signalId,
    createdAt: options.createdAt,
    conversationId: signal.conversationId,
    turnId: signal.turnId,
    traceId: signal.traceId,
    profileMode: signal.profileMode,
    channel: signal.channel,
    signalType: options.signalType,
    source: options.source ?? "local_capability_ledger",
    capabilityId: signal.capabilityLabel,
    architectureArea: mapArchitectureArea(signal.architectureArea),
    outcome: mapOutcome(signal.capabilityStatus, signal.outcomeSignal),
    confidence: signal.confidence,
    severity: options.severity,
    userRating: options.userRating,
    patternCount: options.patternCount,
    evidenceRefs: signal.evidenceRefs,
    redactedSummary: options.redactedSummary,
    suggestedNextStep: mapSuggestedNextStep(signal.suggestedNextStep, signal.architectureArea),
    privacyClass: signal.privacyClass,
  });
}

export function buildLearningSignalTelemetryAttributes(
  signal: LearningSignal,
): LearningSignalTelemetryAttributes {
  return {
    eventName: "learning_signal_recorded",
    signalId: signal.signal_id,
    signalType: signal.signal_type,
    source: signal.source,
    capabilityId: signal.capability_id,
    architectureArea: signal.architecture_area,
    outcome: signal.outcome,
    profileMode: signal.profile_mode,
    channel: signal.channel,
    confidence: signal.confidence,
    evidenceRefCount: signal.evidence_refs.length,
    privacyClassification: signal.privacy.classification,
    childMinimized: signal.privacy.child_minimized,
    proposalOnly: signal.governance_boundary.proposal_only,
    approvalCaptured: signal.governance_boundary.approval_captured,
    memoryWritePerformed: signal.governance_boundary.memory_write_performed,
    agentDispatchPerformed: signal.governance_boundary.agent_dispatch_performed,
    externalSendPerformed: signal.governance_boundary.external_send_performed,
    appliedLocally: signal.governance_boundary.applied_locally,
  };
}
