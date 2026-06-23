import type { LocalProfile, NapoleonProfileMode } from "./contractBridge.js";
import {
  applyTaxonomyToSignals,
  serializeCapabilityTaxonomy,
  type CapabilityTaxonomy,
  type SerializedCapabilityTaxonomy,
} from "./capabilityTaxonomy.js";

export type CapabilityStatus = "working" | "degraded" | "missing" | "blocked" | "unknown";
export type CapabilityOutcomeSignal =
  | "answered"
  | "clarified"
  | "rehearsed"
  | "review_required"
  | "blocked"
  | "bridge_failed"
  | "user_corrected"
  | "user_retried"
  | "dismissed"
  | "abandoned";
export type CapabilityArchitectureArea =
  | "text_ui"
  | "bridge"
  | "governance_ux"
  | "memory_review"
  | "settings_privacy"
  | "observability"
  | "evaluator"
  | "voice"
  | "avatar"
  | "napoleon_runtime"
  | "agent_registry";
export type CapabilityPrivacyClass = "metadata_only" | "redacted_summary" | "sensitive" | "child_sensitive";
export type SuggestedNextStep =
  | "no_action"
  | "write_evaluator_case"
  | "add_backlog_item"
  | "create_evolution_proposal"
  | "needs_human_review";

export interface RecommendationBoundary {
  proposalOnly: true;
  approvalCaptured: false;
  memoryWriteAllowed: false;
  agentDispatchAllowed: false;
  externalSendAllowed: false;
}

export interface ConversationCapabilitySignal {
  eventName: "conversation_capability_signal";
  observedAt: string;
  traceId: string;
  conversationId: string;
  turnId: string;
  profileMode: NapoleonProfileMode;
  channel: "text" | "voice" | "avatar";
  topicLabel: string;
  intentLabel: string;
  capabilityLabel: string;
  capabilityStatus: CapabilityStatus;
  outcomeSignal: CapabilityOutcomeSignal;
  confidence: number;
  evidenceRefs: string[];
  architectureArea: CapabilityArchitectureArea;
  privacyClass: CapabilityPrivacyClass;
  suggestedNextStep: SuggestedNextStep;
  recommendationBoundary: RecommendationBoundary;
}

export interface CapabilitySignalInput {
  observedAt?: string;
  traceId: string;
  conversationId: string;
  turnId: string;
  profileMode: NapoleonProfileMode;
  channel: "text" | "voice" | "avatar";
  topicLabel: string;
  intentLabel: string;
  capabilityLabel: string;
  capabilityStatus: CapabilityStatus;
  outcomeSignal: CapabilityOutcomeSignal;
  confidence: number;
  evidenceRefs: string[];
  architectureArea: CapabilityArchitectureArea;
  privacyClass: CapabilityPrivacyClass;
  suggestedNextStep: SuggestedNextStep;
  rawMessage?: string;
}

export interface CapabilityAggregate {
  total: number;
  byTopic: Record<string, number>;
  byIntent: Record<string, number>;
  byCapability: Record<string, number>;
  byStatus: Record<string, number>;
  byArchitectureArea: Record<string, number>;
}

export interface CapabilityLedger {
  append(signal: ConversationCapabilitySignal): ConversationCapabilitySignal;
  clear(): void;
  listRecent(limit?: number): ConversationCapabilitySignal[];
  aggregate(): CapabilityAggregate;
}

export interface CapabilityRetentionSettings {
  maxSignals: number;
  maxAgeDays: number;
}

export interface SerializedCapabilityLedger {
  schemaVersion: "concierge.capability-ledger.v1";
  generatedAt: string;
  privacyCaveat: string;
  retention: {
    maxSignals: number;
    maxAgeDays: number;
  };
  signals: ConversationCapabilitySignal[];
  trendCaveat: string;
  scoringCaveat: string;
  taxonomy?: SerializedCapabilityTaxonomy;
}

export interface ExportedCapabilityLedger {
  schemaVersion: "concierge.capability-ledger.export.v1";
  generatedAt: string;
  privacyCaveat: string;
  retention: {
    maxSignals: number;
    maxAgeDays: number;
  };
  signals: ConversationCapabilitySignal[];
  trendCaveat: string;
  scoringCaveat: string;
  taxonomy?: SerializedCapabilityTaxonomy;
}

export interface RecommendationScoreComponents {
  userValue: number;
  frequency: number;
  recentTrendDelta: number;
  failureSeverity: number;
  evaluatorGap: number;
  implementationEffort: number;
  governanceRisk: number;
  privacyRisk: number;
  childSafetyRisk: number;
  authorityExpansionRisk: number;
  finalPriorityScore: number;
}

export type CapabilityQuestionKind =
  | "common_conversations"
  | "missing_or_blocked_capabilities"
  | "working_well_conversations"
  | "easy_to_evolve_missing_capabilities"
  | "architecture_improvement_areas"
  | "recommended_next_capabilities"
  | "increasing_conversations"
  | "worsening_missing_capabilities"
  | "recent_working_capabilities"
  | "weekly_changes"
  | "seasonal_changes";

export interface CapabilityAnswerRow {
  label: string;
  count: number;
  status?: CapabilityStatus;
  architectureArea?: CapabilityArchitectureArea;
  confidence?: number;
  suggestedNextStep?: SuggestedNextStep;
  score?: number;
  scoreComponents?: RecommendationScoreComponents;
  scoreExplanation?: string;
  previousCount?: number;
  delta?: number;
}

export interface CapabilityQuestionAnswer {
  kind: CapabilityQuestionKind;
  question: string;
  summary: string;
  rows: CapabilityAnswerRow[];
  evidenceCount: number;
  caveat: string;
  boundary: RecommendationBoundary;
}

const DEFAULT_RECOMMENDATION_BOUNDARY: RecommendationBoundary = {
  proposalOnly: true,
  approvalCaptured: false,
  memoryWriteAllowed: false,
  agentDispatchAllowed: false,
  externalSendAllowed: false,
};

const CAPABILITY_LEDGER_SCHEMA_VERSION = "concierge.capability-ledger.v1" as const;
const CAPABILITY_LEDGER_EXPORT_SCHEMA_VERSION = "concierge.capability-ledger.export.v1" as const;
const CAPABILITY_LEDGER_PRIVACY_CAVEAT =
  "Local metadata-only capability signals. Raw user text, raw audio, and raw video are not stored by default.";
const CAPABILITY_LEDGER_EXPORT_PRIVACY_CAVEAT =
  "Local metadata-only capability signals. This export does not grant permission to share externally and does not approve, implement, write memory, dispatch agents, or send.";
const CAPABILITY_LEDGER_TREND_CAVEAT =
  "Trend summaries compare recent 7 days with the previous 7 days from local metadata only; sparse or disabled telemetry can distort trends.";
const CAPABILITY_LEDGER_SEASONAL_CAVEAT =
  "Seasonal summaries compare recent 28 days with the previous 28 days from local metadata only; sparse, disabled, or single-device telemetry can distort seasonal patterns.";
const CAPABILITY_LEDGER_SCORING_CAVEAT =
  "Recommendation scores are local risk/value heuristics only; they do not approve implementation, change policy, write memory, dispatch agents, or send externally.";

const DEFAULT_MAX_SIGNALS = 250;
const DEFAULT_MAX_AGE_DAYS = 90;
const TREND_WINDOW_DAYS = 7;
const SEASONAL_WINDOW_DAYS = 28;

const CAPABILITY_STATUSES: CapabilityStatus[] = ["working", "degraded", "missing", "blocked", "unknown"];
const CAPABILITY_OUTCOMES: CapabilityOutcomeSignal[] = [
  "answered",
  "clarified",
  "rehearsed",
  "review_required",
  "blocked",
  "bridge_failed",
  "user_corrected",
  "user_retried",
  "dismissed",
  "abandoned",
];
const CAPABILITY_ARCHITECTURE_AREAS: CapabilityArchitectureArea[] = [
  "text_ui",
  "bridge",
  "governance_ux",
  "memory_review",
  "settings_privacy",
  "observability",
  "evaluator",
  "voice",
  "avatar",
  "napoleon_runtime",
  "agent_registry",
];
const CAPABILITY_PRIVACY_CLASSES: CapabilityPrivacyClass[] = [
  "metadata_only",
  "redacted_summary",
  "sensitive",
  "child_sensitive",
];
const SUGGESTED_NEXT_STEPS: SuggestedNextStep[] = [
  "no_action",
  "write_evaluator_case",
  "add_backlog_item",
  "create_evolution_proposal",
  "needs_human_review",
];

function clampConfidence(confidence: number): number {
  if (Number.isNaN(confidence)) return 0;
  return Math.max(0, Math.min(1, confidence));
}

const SAFE_METADATA_LABEL_PATTERN = /^[a-z0-9][a-z0-9_.-]{0,63}$/i;
const SAFE_EVIDENCE_REF_PATTERN =
  /^(trace|event|turn|decision|audit|request|proposal|capability|taxonomy):[a-z0-9][a-z0-9_.:-]{0,95}$/i;
const SENSITIVE_METADATA_PATTERN =
  /(@|https?:\/\/|www\.|bearer\s+|sk-[a-z0-9_-]{8,}|secret|token|password|credential)/i;

function sanitizeCapabilityMetadataLabel(value: string): string {
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed.length > 64 ||
    /\s/.test(trimmed) ||
    SENSITIVE_METADATA_PATTERN.test(trimmed) ||
    !SAFE_METADATA_LABEL_PATTERN.test(trimmed)
  ) {
    return "redacted_label";
  }
  return trimmed;
}

function sanitizeCapabilityEvidenceRef(value: string): string {
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed.length > 128 ||
    /\s/.test(trimmed) ||
    SENSITIVE_METADATA_PATTERN.test(trimmed) ||
    !SAFE_EVIDENCE_REF_PATTERN.test(trimmed)
  ) {
    return "redacted_ref";
  }
  return trimmed;
}

function normalizeProfileMode(profile: LocalProfile | NapoleonProfileMode | undefined): NapoleonProfileMode {
  if (profile === "child_protected") return "child_protected_user";
  return profile ?? "adult_owner";
}

function privacyClassForProfile(
  profileMode: NapoleonProfileMode,
  privacyClass: CapabilityPrivacyClass,
): CapabilityPrivacyClass {
  return profileMode === "child_protected_user" ? "child_sensitive" : privacyClass;
}

export function buildCapabilitySignal(input: CapabilitySignalInput): ConversationCapabilitySignal {
  const profileMode = normalizeProfileMode(input.profileMode);

  return {
    eventName: "conversation_capability_signal",
    observedAt: input.observedAt ?? new Date().toISOString(),
    traceId: input.traceId,
    conversationId: input.conversationId,
    turnId: input.turnId,
    profileMode,
    channel: input.channel,
    topicLabel: sanitizeCapabilityMetadataLabel(input.topicLabel),
    intentLabel: sanitizeCapabilityMetadataLabel(input.intentLabel),
    capabilityLabel: sanitizeCapabilityMetadataLabel(input.capabilityLabel),
    capabilityStatus: input.capabilityStatus,
    outcomeSignal: input.outcomeSignal,
    confidence: clampConfidence(input.confidence),
    evidenceRefs: input.evidenceRefs.map(sanitizeCapabilityEvidenceRef),
    architectureArea: input.architectureArea,
    privacyClass: privacyClassForProfile(profileMode, input.privacyClass),
    suggestedNextStep: input.suggestedNextStep,
    recommendationBoundary: DEFAULT_RECOMMENDATION_BOUNDARY,
  };
}

export function createCapabilityLedger(
  options: { maxSignals?: number; maxAgeDays?: number; now?: () => Date } = {},
): CapabilityLedger {
  const maxSignals = Math.max(1, options.maxSignals ?? DEFAULT_MAX_SIGNALS);
  const maxAgeDays = Math.max(1, options.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS);
  const now = options.now ?? (() => new Date());
  const signals: ConversationCapabilitySignal[] = [];
  const prune = () => pruneSignalsInPlace(signals, { maxSignals, maxAgeDays }, now());

  return {
    append(signal) {
      const sanitizedSignal = buildCapabilitySignal(signal);
      signals.push(sanitizedSignal);
      prune();
      return sanitizedSignal;
    },
    clear() {
      signals.length = 0;
    },
    listRecent(limit = maxSignals) {
      prune();
      return signals.slice(Math.max(0, signals.length - limit));
    },
    aggregate() {
      prune();
      return aggregateCapabilitySignals(signals);
    },
  };
}

export function appendCapabilitySignal(
  ledger: CapabilityLedger,
  signal: ConversationCapabilitySignal,
): ConversationCapabilitySignal {
  return ledger.append(signal);
}

export function clearCapabilityLedger(ledger: CapabilityLedger) {
  ledger.clear();
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function sanitizeSignal(value: unknown): ConversationCapabilitySignal | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.eventName !== "conversation_capability_signal") return null;
  if (!isString(candidate.traceId) || !isString(candidate.conversationId) || !isString(candidate.turnId)) return null;
  if (!isOneOf(candidate.profileMode, ["adult_owner", "child_protected_user", "guest", "collaborator"])) return null;
  if (!isOneOf(candidate.channel, ["text", "voice", "avatar"])) return null;
  if (
    !isString(candidate.topicLabel) ||
    !isString(candidate.intentLabel) ||
    !isString(candidate.capabilityLabel)
  ) {
    return null;
  }
  if (!isOneOf(candidate.capabilityStatus, CAPABILITY_STATUSES)) return null;
  if (!isOneOf(candidate.outcomeSignal, CAPABILITY_OUTCOMES)) return null;
  if (!isNumber(candidate.confidence)) return null;
  if (!Array.isArray(candidate.evidenceRefs) || !candidate.evidenceRefs.every(isString)) return null;
  if (!isOneOf(candidate.architectureArea, CAPABILITY_ARCHITECTURE_AREAS)) return null;
  if (!isOneOf(candidate.privacyClass, CAPABILITY_PRIVACY_CLASSES)) return null;
  if (!isOneOf(candidate.suggestedNextStep, SUGGESTED_NEXT_STEPS)) return null;

  return buildCapabilitySignal({
    observedAt: typeof candidate.observedAt === "string" && candidate.observedAt.trim()
      ? candidate.observedAt
      : new Date().toISOString(),
    traceId: candidate.traceId,
    conversationId: candidate.conversationId,
    turnId: candidate.turnId,
    profileMode: candidate.profileMode,
    channel: candidate.channel,
    topicLabel: candidate.topicLabel,
    intentLabel: candidate.intentLabel,
    capabilityLabel: candidate.capabilityLabel,
    capabilityStatus: candidate.capabilityStatus,
    outcomeSignal: candidate.outcomeSignal,
    confidence: candidate.confidence,
    evidenceRefs: [...candidate.evidenceRefs],
    architectureArea: candidate.architectureArea,
    privacyClass: candidate.privacyClass,
    suggestedNextStep: candidate.suggestedNextStep,
  });
}

function observedTime(signal: ConversationCapabilitySignal): number {
  const time = Date.parse(signal.observedAt);
  return Number.isFinite(time) ? time : 0;
}

function retentionCutoffMs(retention: CapabilityRetentionSettings, now: Date): number {
  return now.getTime() - Math.max(1, retention.maxAgeDays) * 24 * 60 * 60 * 1000;
}

function normalizeRetention(options: { maxSignals?: number; maxAgeDays?: number } = {}): CapabilityRetentionSettings {
  return {
    maxSignals: Math.max(1, options.maxSignals ?? DEFAULT_MAX_SIGNALS),
    maxAgeDays: Math.max(1, options.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS),
  };
}

function prunedSignals(
  signals: ConversationCapabilitySignal[],
  retention: CapabilityRetentionSettings,
  now: Date = new Date(),
): ConversationCapabilitySignal[] {
  const cutoff = retentionCutoffMs(retention, now);
  const agePruned = signals.filter((signal) => observedTime(signal) >= cutoff);
  return agePruned.slice(Math.max(0, agePruned.length - retention.maxSignals));
}

function pruneSignalsInPlace(signals: ConversationCapabilitySignal[], retention: CapabilityRetentionSettings, now: Date) {
  const retained = prunedSignals(signals, retention, now);
  signals.length = 0;
  signals.push(...retained);
}

export function serializeCapabilityLedger(
  ledger: CapabilityLedger,
  options: { maxSignals?: number; maxAgeDays?: number; generatedAt?: string; taxonomy?: CapabilityTaxonomy } = {},
): SerializedCapabilityLedger {
  const retention = normalizeRetention(options);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  return {
    schemaVersion: CAPABILITY_LEDGER_SCHEMA_VERSION,
    generatedAt,
    privacyCaveat: CAPABILITY_LEDGER_PRIVACY_CAVEAT,
    retention,
    signals: prunedSignals(ledger.listRecent(), retention, new Date(generatedAt)),
    trendCaveat: CAPABILITY_LEDGER_TREND_CAVEAT,
    scoringCaveat: CAPABILITY_LEDGER_SCORING_CAVEAT,
    taxonomy: options.taxonomy ? serializeCapabilityTaxonomy(options.taxonomy, { generatedAt: options.generatedAt }) : undefined,
  };
}

export function deserializeCapabilityLedger(
  snapshot: unknown,
  options: { maxSignals?: number; maxAgeDays?: number; now?: () => Date } = {},
): CapabilityLedger {
  const snapshotRetention =
    snapshot &&
    typeof snapshot === "object" &&
    "retention" in snapshot &&
    snapshot.retention &&
    typeof snapshot.retention === "object"
      ? (snapshot.retention as Record<string, unknown>)
      : {};
  const retention = normalizeRetention({
    maxSignals: options.maxSignals ?? (typeof snapshotRetention.maxSignals === "number" ? snapshotRetention.maxSignals : undefined),
    maxAgeDays: options.maxAgeDays ?? (typeof snapshotRetention.maxAgeDays === "number" ? snapshotRetention.maxAgeDays : undefined),
  });
  const ledger = createCapabilityLedger({ ...retention, now: options.now });
  if (!snapshot || typeof snapshot !== "object") return ledger;
  const candidate = snapshot as Record<string, unknown>;
  if (candidate.schemaVersion !== CAPABILITY_LEDGER_SCHEMA_VERSION || !Array.isArray(candidate.signals)) return ledger;

  for (const signal of prunedSignals(
    candidate.signals.map(sanitizeSignal).filter((s) => s !== null),
    retention,
    options.now?.() ?? new Date(),
  )) {
    appendCapabilitySignal(ledger, signal);
  }
  return ledger;
}

export function exportCapabilityLedger(
  ledger: CapabilityLedger,
  options: { maxSignals?: number; maxAgeDays?: number; generatedAt?: string; taxonomy?: CapabilityTaxonomy } = {},
): ExportedCapabilityLedger {
  const retention = normalizeRetention(options);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  return {
    schemaVersion: CAPABILITY_LEDGER_EXPORT_SCHEMA_VERSION,
    generatedAt,
    privacyCaveat: CAPABILITY_LEDGER_EXPORT_PRIVACY_CAVEAT,
    retention,
    signals: prunedSignals(ledger.listRecent(), retention, new Date(generatedAt)),
    trendCaveat: CAPABILITY_LEDGER_TREND_CAVEAT,
    scoringCaveat: CAPABILITY_LEDGER_SCORING_CAVEAT,
    taxonomy: options.taxonomy ? serializeCapabilityTaxonomy(options.taxonomy, { generatedAt: options.generatedAt }) : undefined,
  };
}

function increment(bucket: Record<string, number>, key: string) {
  bucket[key] = (bucket[key] ?? 0) + 1;
}

export function aggregateCapabilitySignals(
  signals: ConversationCapabilitySignal[],
  taxonomy?: CapabilityTaxonomy,
): CapabilityAggregate {
  const aggregate: CapabilityAggregate = {
    total: signals.length,
    byTopic: {},
    byIntent: {},
    byCapability: {},
    byStatus: {},
    byArchitectureArea: {},
  };

  for (const signal of applyTaxonomyToSignals(signals, taxonomy)) {
    increment(aggregate.byTopic, signal.topicLabel);
    increment(aggregate.byIntent, signal.intentLabel);
    increment(aggregate.byCapability, signal.capabilityLabel);
    increment(aggregate.byStatus, signal.capabilityStatus);
    increment(aggregate.byArchitectureArea, signal.architectureArea);
  }

  return aggregate;
}

function sortedRows(bucket: Record<string, number>, limit = 5): CapabilityAnswerRow[] {
  return Object.entries(bucket)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function classifyCapabilityQuestion(question: string): CapabilityQuestionKind | null {
  const lower = question.toLowerCase();
  const asksAboutConversation = /\b(conversation|conversations|topics?)\b/.test(lower);
  const asksIncreasing = /\b(increasing|rising|growing|more common|trending up)\b/.test(lower);
  const asksWorse = /\b(worse|worsening|getting worse|regressing|increasing failures?)\b/.test(lower);
  const asksRecent = /\b(recent|recently|this week|week|changed|changing)\b/.test(lower);
  const asksSeasonal = /\b(seasonal|season|monthly|month|28 days|four weeks|quarterly|longer term)\b/.test(lower);
  const asksCommon = /\b(common|most|frequent|popular)\b/.test(lower);
  const asksWorkingWell = /\b(working well|works well|successful|succeeding|good)\b/.test(lower);
  const asksWorked = /\b(worked|working)\b/.test(lower);
  const asksCapability = /\b(capability|capabilities)\b/.test(lower);
  const asksMissingOrBlocked = /\b(missing|blocked|not working|failed|failing|architecture)\b/.test(lower);
  const asksEasyToEvolve = /\b(easy|easiest|evolve|evolution|small)\b/.test(lower);
  const asksArchitecture = /\b(architecture|part|area|component|improved|improve|fix)\b/.test(lower);
  const asksNext = /\b(implement|implemented|next|recommend|recommended|prioritize|priority)\b/.test(lower);

  if (asksSeasonal) return "seasonal_changes";
  if (asksAboutConversation && asksIncreasing) return "increasing_conversations";
  if (asksCapability && asksMissingOrBlocked && asksWorse) return "worsening_missing_capabilities";
  if (asksWorked && asksRecent) return "recent_working_capabilities";
  if (asksRecent && /\b(changed|changing|this week|week)\b/.test(lower)) return "weekly_changes";
  if (asksCapability && asksNext) return "recommended_next_capabilities";
  if (asksCapability && asksMissingOrBlocked && asksEasyToEvolve) return "easy_to_evolve_missing_capabilities";
  if (asksArchitecture && asksMissingOrBlocked) return "architecture_improvement_areas";
  if (asksAboutConversation && asksWorkingWell) return "working_well_conversations";
  if (asksAboutConversation && asksCommon) return "common_conversations";
  if (asksCapability && asksMissingOrBlocked) return "missing_or_blocked_capabilities";
  return null;
}

function describeRows(rows: CapabilityAnswerRow[]): string {
  if (rows.length === 0) return "No local signals yet";
  return rows.map((row) => `${row.label} (${row.count})`).join(", ");
}

function describeTrendRows(rows: CapabilityAnswerRow[]): string {
  if (rows.length === 0) return "No local trend changes yet";
  return rows
    .map((row) => `${row.label} (${row.count} recent, ${row.previousCount ?? 0} previous, delta ${row.delta ?? 0})`)
    .join(", ");
}

const LOCAL_PROPOSAL_CAVEAT =
  "Based on local metadata only; results are incomplete when telemetry is disabled or other devices are not included; recommendations are proposal-only.";

const MISSING_PROPOSAL_CAVEAT =
  "Based on local metadata only; results are incomplete when telemetry is disabled or other devices are not included; correctly blocked unsafe requests are excluded; recommendations are proposal-only.";

interface GroupedSignalStats {
  label: string;
  count: number;
  status?: CapabilityStatus;
  architectureArea?: CapabilityArchitectureArea;
  suggestedNextStep?: SuggestedNextStep;
  confidenceTotal: number;
  score: number;
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

function userValueForSignal(signal: ConversationCapabilitySignal): number {
  if (signal.architectureArea === "bridge" || signal.architectureArea === "text_ui") return 4;
  if (signal.architectureArea === "evaluator" || signal.architectureArea === "observability") return 3;
  if (signal.architectureArea === "governance_ux" || signal.architectureArea === "memory_review") return 2;
  return 1;
}

function failureSeverityForSignal(signal: ConversationCapabilitySignal): number {
  if (signal.capabilityStatus === "missing") return 3;
  if (signal.capabilityStatus === "degraded") return 1.5;
  return 0;
}

function evaluatorGapForSignal(signal: ConversationCapabilitySignal): number {
  if (signal.suggestedNextStep === "write_evaluator_case") return 3;
  if (signal.suggestedNextStep === "add_backlog_item") return 2;
  if (signal.suggestedNextStep === "create_evolution_proposal") return 1;
  return 0;
}

function implementationEffortForSignal(signal: ConversationCapabilitySignal): number {
  if (signal.architectureArea === "bridge" || signal.architectureArea === "text_ui" || signal.architectureArea === "evaluator") return 1;
  if (
    signal.architectureArea === "observability" ||
    signal.architectureArea === "governance_ux" ||
    signal.architectureArea === "settings_privacy"
  ) {
    return 2;
  }
  if (signal.architectureArea === "memory_review") return 3;
  return 4;
}

function governanceRiskForSignal(signal: ConversationCapabilitySignal): number {
  if (signal.architectureArea === "napoleon_runtime" || signal.architectureArea === "agent_registry") return 4;
  if (signal.architectureArea === "governance_ux") return 3;
  if (signal.architectureArea === "memory_review") return 2;
  if (signal.architectureArea === "voice" || signal.architectureArea === "avatar") return 2;
  return 1;
}

function privacyRiskForSignal(signal: ConversationCapabilitySignal): number {
  const classRisk =
    signal.privacyClass === "child_sensitive" ? 3 : signal.privacyClass === "sensitive" ? 3 : signal.privacyClass === "redacted_summary" ? 1 : 0;
  const areaRisk =
    signal.architectureArea === "voice" || signal.architectureArea === "avatar" || signal.architectureArea === "memory_review" ? 2 : 0;
  return classRisk + areaRisk;
}

function authorityExpansionRiskForSignal(signal: ConversationCapabilitySignal): number {
  const areaRisk =
    signal.architectureArea === "napoleon_runtime" || signal.architectureArea === "agent_registry"
      ? 5
      : signal.architectureArea === "memory_review" || signal.architectureArea === "voice" || signal.architectureArea === "avatar"
        ? 2
        : 0;
  return areaRisk + (signal.suggestedNextStep === "create_evolution_proposal" ? 1 : 0);
}

function childSafetyRiskForSignal(signal: ConversationCapabilitySignal): number {
  return signal.profileMode === "child_protected_user" || signal.privacyClass === "child_sensitive" ? 4 : 0;
}

function groupedRows(
  signals: ConversationCapabilitySignal[],
  keyForSignal: (signal: ConversationCapabilitySignal) => string,
  labelForSignal: (signal: ConversationCapabilitySignal) => string,
  scoreForSignal: (signal: ConversationCapabilitySignal) => number,
  options: { includeStatus?: boolean; includeArchitectureArea?: boolean; includeSuggestedNextStep?: boolean } = {},
): CapabilityAnswerRow[] {
  const grouped: Record<string, GroupedSignalStats> = {};
  for (const signal of signals) {
    const key = keyForSignal(signal);
    const row = grouped[key] ?? {
      label: labelForSignal(signal),
      count: 0,
      status: options.includeStatus ? signal.capabilityStatus : undefined,
      architectureArea: options.includeArchitectureArea ? signal.architectureArea : undefined,
      suggestedNextStep: options.includeSuggestedNextStep ? signal.suggestedNextStep : undefined,
      confidenceTotal: 0,
      score: 0,
    };
    row.count += 1;
    row.confidenceTotal += signal.confidence;
    row.score += scoreForSignal(signal);
    grouped[key] = row;
  }

  return Object.values(grouped)
    .map((row) => ({
      label: row.label,
      count: row.count,
      status: row.status,
      architectureArea: row.architectureArea,
      suggestedNextStep: row.suggestedNextStep,
      confidence: rounded(row.confidenceTotal / row.count),
      score: rounded(row.score),
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5);
}

function inWindow(signal: ConversationCapabilitySignal, startMs: number, endMs: number, includeEnd = false): boolean {
  const time = observedTime(signal);
  return time >= startMs && (includeEnd ? time <= endMs : time < endMs);
}

function trendWindows(signals: ConversationCapabilitySignal[], nowInput?: string | Date, windowDays = TREND_WINDOW_DAYS) {
  const now = typeof nowInput === "string" ? new Date(nowInput) : nowInput ?? new Date();
  const endMs = now.getTime();
  const recentStartMs = endMs - windowDays * 24 * 60 * 60 * 1000;
  const previousStartMs = recentStartMs - windowDays * 24 * 60 * 60 * 1000;
  return {
    recent: signals.filter((signal) => inWindow(signal, recentStartMs, endMs, true)),
    previous: signals.filter((signal) => inWindow(signal, previousStartMs, recentStartMs)),
  };
}

function trendRows(
  recentSignals: ConversationCapabilitySignal[],
  previousSignals: ConversationCapabilitySignal[],
  labelForSignal: (signal: ConversationCapabilitySignal) => string,
  options: { includeStatus?: boolean; includeArchitectureArea?: boolean } = {},
): CapabilityAnswerRow[] {
  const previous: Record<string, number> = {};
  const rows: Record<string, CapabilityAnswerRow> = {};

  for (const signal of previousSignals) {
    const label = labelForSignal(signal);
    previous[label] = (previous[label] ?? 0) + 1;
  }
  for (const signal of recentSignals) {
    const label = labelForSignal(signal);
    const row = rows[label] ?? {
      label,
      count: 0,
      previousCount: previous[label] ?? 0,
      delta: 0,
      status: options.includeStatus ? signal.capabilityStatus : undefined,
      architectureArea: options.includeArchitectureArea ? signal.architectureArea : undefined,
    };
    row.count += 1;
    row.delta = row.count - (row.previousCount ?? 0);
    rows[label] = row;
  }

  return Object.values(rows)
    .filter((row) => (row.delta ?? 0) > 0)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0) || b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5);
}

interface RecommendationGroup {
  label: string;
  key: string;
  count: number;
  status: CapabilityStatus;
  architectureArea: CapabilityArchitectureArea;
  suggestedNextStep: SuggestedNextStep;
  confidenceTotal: number;
  signals: ConversationCapabilitySignal[];
}

function strongestComponent<T extends string>(
  signals: ConversationCapabilitySignal[],
  valueForSignal: (signal: ConversationCapabilitySignal) => T,
): T {
  const counts: Record<string, number> = {};
  for (const signal of signals) counts[valueForSignal(signal)] = (counts[valueForSignal(signal)] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0] as T;
}

function maxBySignal(signals: ConversationCapabilitySignal[], valueForSignal: (signal: ConversationCapabilitySignal) => number): number {
  return signals.reduce((max, signal) => Math.max(max, valueForSignal(signal)), 0);
}

function averageBySignal(signals: ConversationCapabilitySignal[], valueForSignal: (signal: ConversationCapabilitySignal) => number): number {
  if (signals.length === 0) return 0;
  return signals.reduce((sum, signal) => sum + valueForSignal(signal), 0) / signals.length;
}

function recommendationTrendDelta(label: string, windows: ReturnType<typeof trendWindows>): number {
  const recent = windows.recent.filter((signal) => signal.capabilityLabel === label).length;
  const previous = windows.previous.filter((signal) => signal.capabilityLabel === label).length;
  return Math.max(0, recent - previous);
}

function recommendationExplanation(components: RecommendationScoreComponents): string {
  const risks = components.governanceRisk + components.privacyRisk + components.childSafetyRisk + components.authorityExpansionRisk;
  const childCaution = components.childSafetyRisk > 0 ? ", child safety caution" : "";
  return `value ${components.userValue}, evidence ${components.frequency}, trend +${components.recentTrendDelta}, severity ${components.failureSeverity}, evaluator gap ${components.evaluatorGap}, effort ${components.implementationEffort}, risk ${rounded(risks)}${childCaution}`;
}

function scoredRecommendationRows(
  signals: ConversationCapabilitySignal[],
  windows: ReturnType<typeof trendWindows>,
  options: { lowEffortBias?: boolean } = {},
): CapabilityAnswerRow[] {
  const groups: Record<string, RecommendationGroup> = {};

  for (const signal of signals) {
    const key = `${signal.capabilityLabel}:${signal.capabilityStatus}:${signal.architectureArea}`;
    const group = groups[key] ?? {
      key,
      label: signal.capabilityLabel,
      count: 0,
      status: signal.capabilityStatus,
      architectureArea: signal.architectureArea,
      suggestedNextStep: signal.suggestedNextStep,
      confidenceTotal: 0,
      signals: [],
    };
    group.count += 1;
    group.confidenceTotal += signal.confidence;
    group.signals.push(signal);
    groups[key] = group;
  }

  return Object.values(groups)
    .map((group) => {
      const implementationEffort = rounded(averageBySignal(group.signals, implementationEffortForSignal));
      const componentsWithoutScore = {
        userValue: rounded(maxBySignal(group.signals, userValueForSignal)),
        frequency: group.count,
        recentTrendDelta: recommendationTrendDelta(group.label, windows),
        failureSeverity: rounded(maxBySignal(group.signals, failureSeverityForSignal)),
        evaluatorGap: rounded(maxBySignal(group.signals, evaluatorGapForSignal)),
        implementationEffort,
        governanceRisk: rounded(maxBySignal(group.signals, governanceRiskForSignal)),
        privacyRisk: rounded(maxBySignal(group.signals, privacyRiskForSignal)),
        childSafetyRisk: rounded(maxBySignal(group.signals, childSafetyRiskForSignal)),
        authorityExpansionRisk: rounded(maxBySignal(group.signals, authorityExpansionRiskForSignal)),
      };
      const riskTotal =
        componentsWithoutScore.implementationEffort +
        componentsWithoutScore.governanceRisk +
        componentsWithoutScore.privacyRisk +
        componentsWithoutScore.childSafetyRisk +
        componentsWithoutScore.authorityExpansionRisk;
      const valueTotal =
        componentsWithoutScore.userValue +
        componentsWithoutScore.frequency +
        componentsWithoutScore.recentTrendDelta * 2 +
        componentsWithoutScore.failureSeverity +
        componentsWithoutScore.evaluatorGap +
        (options.lowEffortBias ? Math.max(0, 4 - implementationEffort) : 0);
      const finalPriorityScore = rounded(valueTotal - riskTotal);
      const scoreComponents: RecommendationScoreComponents = {
        ...componentsWithoutScore,
        finalPriorityScore,
      };
      return {
        label: group.label,
        count: group.count,
        status: strongestComponent(group.signals, (signal) => signal.capabilityStatus),
        architectureArea: strongestComponent(group.signals, (signal) => signal.architectureArea),
        suggestedNextStep: strongestComponent(group.signals, (signal) => signal.suggestedNextStep),
        confidence: rounded(group.confidenceTotal / group.count),
        score: finalPriorityScore,
        scoreComponents,
        scoreExplanation: recommendationExplanation(scoreComponents),
      };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5);
}

export function answerCapabilityQuestion(
  question: string,
  ledger: CapabilityLedger,
  taxonomy?: CapabilityTaxonomy,
  options: { now?: string | Date; profileMode?: LocalProfile | NapoleonProfileMode } = {},
): CapabilityQuestionAnswer | null {
  const kind = classifyCapabilityQuestion(question);
  if (!kind) return null;

  const activeProfileMode = options.profileMode ? normalizeProfileMode(options.profileMode) : null;
  const rawSignals = ledger
    .listRecent()
    .filter((signal) => !activeProfileMode || signal.profileMode === activeProfileMode);
  const signals = applyTaxonomyToSignals(rawSignals, taxonomy);
  const aggregate = aggregateCapabilitySignals(rawSignals, taxonomy);
  const windows = trendWindows(signals, options.now);

  if (kind === "increasing_conversations") {
    const rows = trendRows(windows.recent, windows.previous, (signal) => signal.topicLabel);
    return {
      kind,
      question,
      summary: `Increasing local conversation topics over recent 7 days vs previous 7 days: ${describeTrendRows(rows)}.`,
      rows,
      evidenceCount: windows.recent.length + windows.previous.length,
      caveat: CAPABILITY_LEDGER_TREND_CAVEAT,
      boundary: DEFAULT_RECOMMENDATION_BOUNDARY,
    };
  }

  if (kind === "worsening_missing_capabilities") {
    const recentMissing = windows.recent.filter((signal) => signal.capabilityStatus === "missing");
    const previousMissing = windows.previous.filter((signal) => signal.capabilityStatus === "missing");
    const rows = trendRows(recentMissing, previousMissing, (signal) => signal.capabilityLabel, {
      includeStatus: true,
      includeArchitectureArea: true,
    });
    return {
      kind,
      question,
      summary: `Missing capabilities getting worse over recent 7 days vs previous 7 days: ${describeTrendRows(rows)}.`,
      rows,
      evidenceCount: recentMissing.length + previousMissing.length,
      caveat: `${CAPABILITY_LEDGER_TREND_CAVEAT} Recommendations are proposal-only.`,
      boundary: DEFAULT_RECOMMENDATION_BOUNDARY,
    };
  }

  if (kind === "recent_working_capabilities") {
    const recentWorking = windows.recent.filter((signal) => signal.capabilityStatus === "working");
    const rows = groupedRows(
      recentWorking,
      (signal) => `${signal.capabilityLabel}:${signal.architectureArea}`,
      (signal) => signal.capabilityLabel,
      (signal) => 1 + signal.confidence,
      { includeStatus: true, includeArchitectureArea: true },
    );
    return {
      kind,
      question,
      summary: `Recently working local capabilities from the recent 7 day window: ${describeRows(rows)}.`,
      rows,
      evidenceCount: recentWorking.length,
      caveat: CAPABILITY_LEDGER_TREND_CAVEAT,
      boundary: DEFAULT_RECOMMENDATION_BOUNDARY,
    };
  }

  if (kind === "weekly_changes") {
    const rows = trendRows(windows.recent, windows.previous, (signal) => signal.topicLabel);
    return {
      kind,
      question,
      summary: `Local capability changes this week: ${describeTrendRows(rows)}.`,
      rows,
      evidenceCount: windows.recent.length + windows.previous.length,
      caveat: CAPABILITY_LEDGER_TREND_CAVEAT,
      boundary: DEFAULT_RECOMMENDATION_BOUNDARY,
    };
  }

  if (kind === "seasonal_changes") {
    const seasonalWindows = trendWindows(signals, options.now, SEASONAL_WINDOW_DAYS);
    const rows = trendRows(seasonalWindows.recent, seasonalWindows.previous, (signal) => signal.topicLabel);
    return {
      kind,
      question,
      summary: `Seasonal local conversation changes over recent 28 days vs previous 28 days: ${describeTrendRows(rows)}.`,
      rows,
      evidenceCount: seasonalWindows.recent.length + seasonalWindows.previous.length,
      caveat: `${CAPABILITY_LEDGER_SEASONAL_CAVEAT} Results remain proposal-only and do not grant authority.`,
      boundary: DEFAULT_RECOMMENDATION_BOUNDARY,
    };
  }

  if (kind === "common_conversations") {
    const rows = sortedRows(aggregate.byTopic);
    return {
      kind,
      question,
      summary: `Most common local conversation topics: ${describeRows(rows)}.`,
      rows,
      evidenceCount: signals.length,
      caveat: LOCAL_PROPOSAL_CAVEAT,
      boundary: DEFAULT_RECOMMENDATION_BOUNDARY,
    };
  }

  if (kind === "working_well_conversations") {
    const working = signals.filter((signal) => signal.capabilityStatus === "working");
    const rows = groupedRows(
      working,
      (signal) => `${signal.capabilityLabel}:${signal.architectureArea}`,
      (signal) => signal.capabilityLabel,
      (signal) => 1 + signal.confidence,
      { includeStatus: true, includeArchitectureArea: true },
    );
    return {
      kind,
      question,
      summary: `Working-well local conversation capabilities: ${describeRows(rows)}.`,
      rows,
      evidenceCount: working.length,
      caveat: LOCAL_PROPOSAL_CAVEAT,
      boundary: DEFAULT_RECOMMENDATION_BOUNDARY,
    };
  }

  const missingOrBlocked = signals.filter(
    (signal) => signal.capabilityStatus === "missing" || signal.capabilityStatus === "blocked",
  );
  const missingSafeRequests = signals.filter((signal) => signal.capabilityStatus === "missing");

  if (kind === "missing_or_blocked_capabilities") {
    const grouped: Record<string, CapabilityAnswerRow> = {};
    for (const signal of missingOrBlocked) {
      const key = `${signal.capabilityLabel}:${signal.capabilityStatus}:${signal.architectureArea}`;
      const row = grouped[key] ?? {
        label: signal.capabilityLabel,
        count: 0,
        status: signal.capabilityStatus,
        architectureArea: signal.architectureArea,
      };
      row.count += 1;
      grouped[key] = row;
    }
    const rows = Object.values(grouped).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    return {
      kind,
      question,
      summary: `Missing or blocked local capabilities: ${describeRows(rows)}.`,
      rows,
      evidenceCount: missingOrBlocked.length,
      caveat: "blocked can mean governance worked correctly; missing means a safe request path failed or is not implemented.",
      boundary: DEFAULT_RECOMMENDATION_BOUNDARY,
    };
  }

  if (kind === "easy_to_evolve_missing_capabilities") {
    const rows = scoredRecommendationRows(missingSafeRequests, windows, { lowEffortBias: true });
    return {
      kind,
      question,
      summary: `Easy-to-evolve missing capabilities by local risk/value score, proposal-only: ${describeRows(rows)}.`,
      rows,
      evidenceCount: missingSafeRequests.length,
      caveat: `${MISSING_PROPOSAL_CAVEAT} ${CAPABILITY_LEDGER_SCORING_CAVEAT}`,
      boundary: DEFAULT_RECOMMENDATION_BOUNDARY,
    };
  }

  if (kind === "architecture_improvement_areas") {
    const rows = groupedRows(
      missingSafeRequests,
      (signal) => signal.architectureArea,
      (signal) => signal.architectureArea,
      (signal) => 1 + signal.confidence,
      {},
    );
    return {
      kind,
      question,
      summary: `Architecture areas to improve for missing safe capabilities: ${describeRows(rows)}.`,
      rows,
      evidenceCount: missingSafeRequests.length,
      caveat: `${MISSING_PROPOSAL_CAVEAT} Correctly blocked unsafe requests are excluded from architecture-fix ranking.`,
      boundary: DEFAULT_RECOMMENDATION_BOUNDARY,
    };
  }

  if (kind === "recommended_next_capabilities") {
    const candidateSignals = signals.filter(
      (signal) =>
        signal.capabilityStatus === "missing" ||
        (signal.capabilityStatus === "degraded" && signal.suggestedNextStep !== "needs_human_review"),
    );
    const rows = scoredRecommendationRows(candidateSignals, windows);
    return {
      kind,
      question,
      summary: `Recommended next capabilities by local risk/value score, proposal-only: ${describeRows(rows)}.`,
      rows,
      evidenceCount: candidateSignals.length,
      caveat: `${MISSING_PROPOSAL_CAVEAT} ${CAPABILITY_LEDGER_SCORING_CAVEAT}`,
      boundary: DEFAULT_RECOMMENDATION_BOUNDARY,
    };
  }

  return null;
}

function stringAttr(attributes: Record<string, unknown>, key: string, fallback: string): string {
  const value = attributes[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function deriveCapabilitySignalFromEvent(
  eventName: string,
  attributes: Record<string, unknown>,
): ConversationCapabilitySignal {
  const traceId = stringAttr(attributes, "traceId", "trace_unknown");
  const conversationId = stringAttr(attributes, "conversationId", "conv_unknown");
  const turnId = stringAttr(attributes, "turnId", "turn_unknown");
  const profileMode = normalizeProfileMode(
    (attributes.profileMode ?? attributes.profile) as LocalProfile | NapoleonProfileMode | undefined,
  );
  const base = {
    traceId,
    conversationId,
    turnId,
    profileMode,
    channel: "text" as const,
    evidenceRefs: [`trace:${traceId}`, `event:${eventName}`],
    privacyClass: "metadata_only" as CapabilityPrivacyClass,
  };

  if (eventName === "rehearsal_preview_created") {
    return buildCapabilitySignal({
      ...base,
      topicLabel: "governed_text_turn",
      intentLabel: "preview",
      capabilityLabel: "rehearsal_mode",
      capabilityStatus: "working",
      outcomeSignal: "rehearsed",
      confidence: 0.85,
      architectureArea: "text_ui",
      suggestedNextStep: "no_action",
    });
  }

  if (eventName === "governance_review_blocked") {
    return buildCapabilitySignal({
      ...base,
      topicLabel: "governance",
      intentLabel: "blocked_action",
      capabilityLabel: "governance_review",
      capabilityStatus: "blocked",
      outcomeSignal: "blocked",
      confidence: 0.9,
      architectureArea: "governance_ux",
      suggestedNextStep: "no_action",
    });
  }

  if (eventName === "governance_review_acknowledged_locally") {
    return buildCapabilitySignal({
      ...base,
      topicLabel: "governance",
      intentLabel: "review_acknowledgement",
      capabilityLabel: "governance_review",
      capabilityStatus: "working",
      outcomeSignal: "review_required",
      confidence: 0.82,
      architectureArea: "governance_ux",
      suggestedNextStep: "needs_human_review",
    });
  }

  if (eventName === "governance_review_required") {
    return buildCapabilitySignal({
      ...base,
      topicLabel: "governance",
      intentLabel: "review_required",
      capabilityLabel: "governance_review",
      capabilityStatus: "degraded",
      outcomeSignal: "review_required",
      confidence: 0.86,
      architectureArea: "governance_ux",
      suggestedNextStep: "needs_human_review",
    });
  }

  if (eventName.startsWith("governance_review_send_")) {
    const failed = eventName.endsWith("_failed");
    return buildCapabilitySignal({
      ...base,
      topicLabel: "governance",
      intentLabel: "governed_review_handoff",
      capabilityLabel: "governance_review_handoff",
      capabilityStatus: failed ? "blocked" : "working",
      outcomeSignal: failed ? "bridge_failed" : "review_required",
      confidence: failed ? 0.88 : 0.82,
      architectureArea: failed ? "bridge" : "governance_ux",
      suggestedNextStep: failed ? "add_backlog_item" : "needs_human_review",
    });
  }

  if (eventName.startsWith("memory_proposal_")) {
    return buildCapabilitySignal({
      ...base,
      topicLabel: "memory",
      intentLabel: eventName.includes("dismissed") ? "dismiss_memory_proposal" : "review_memory_proposal",
      capabilityLabel: "memory_proposal_review",
      capabilityStatus: "working",
      outcomeSignal: eventName.includes("dismissed") ? "dismissed" : "review_required",
      confidence: 0.84,
      architectureArea: "memory_review",
      suggestedNextStep: eventName.includes("acknowledged") ? "create_evolution_proposal" : "no_action",
    });
  }

  if (eventName === "response_failed") {
    return buildCapabilitySignal({
      ...base,
      topicLabel: "bridge",
      intentLabel: "send_to_napoleon",
      capabilityLabel: "bridge_failure_handling",
      capabilityStatus: "missing",
      outcomeSignal: "bridge_failed",
      confidence: 0.9,
      architectureArea: "bridge",
      suggestedNextStep: "write_evaluator_case",
    });
  }

  if (eventName === "response_generated") {
    return buildCapabilitySignal({
      ...base,
      topicLabel: "text_response",
      intentLabel: "answer",
      capabilityLabel: "text_response_generation",
      capabilityStatus: "working",
      outcomeSignal: "answered",
      confidence: 0.78,
      architectureArea: "text_ui",
      suggestedNextStep: "no_action",
    });
  }

  if (eventName === "stt_completed") {
    return buildCapabilitySignal({
      ...base,
      channel: "voice",
      topicLabel: "voice",
      intentLabel: "transcribe_local_sample",
      capabilityLabel: "speech_transcription_sample",
      capabilityStatus: "working",
      outcomeSignal: "rehearsed",
      confidence: 0.76,
      architectureArea: "voice",
      suggestedNextStep: "no_action",
    });
  }

  return buildCapabilitySignal({
    ...base,
    topicLabel: "unknown",
    intentLabel: "unknown",
    capabilityLabel: "unknown",
    capabilityStatus: "unknown",
    outcomeSignal: "clarified",
    confidence: 0.2,
    architectureArea: "observability",
    suggestedNextStep: "no_action",
  });
}
