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

export interface SerializedCapabilityLedger {
  schemaVersion: "concierge.capability-ledger.v1";
  generatedAt: string;
  privacyCaveat: string;
  retention: {
    maxSignals: number;
  };
  signals: ConversationCapabilitySignal[];
  taxonomy?: SerializedCapabilityTaxonomy;
}

export interface ExportedCapabilityLedger {
  schemaVersion: "concierge.capability-ledger.export.v1";
  generatedAt: string;
  privacyCaveat: string;
  retention: {
    maxSignals: number;
  };
  signals: ConversationCapabilitySignal[];
  taxonomy?: SerializedCapabilityTaxonomy;
}

export type CapabilityQuestionKind =
  | "common_conversations"
  | "missing_or_blocked_capabilities"
  | "working_well_conversations"
  | "easy_to_evolve_missing_capabilities"
  | "architecture_improvement_areas"
  | "recommended_next_capabilities";

export interface CapabilityAnswerRow {
  label: string;
  count: number;
  status?: CapabilityStatus;
  architectureArea?: CapabilityArchitectureArea;
  confidence?: number;
  suggestedNextStep?: SuggestedNextStep;
  score?: number;
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
    traceId: input.traceId,
    conversationId: input.conversationId,
    turnId: input.turnId,
    profileMode,
    channel: input.channel,
    topicLabel: input.topicLabel,
    intentLabel: input.intentLabel,
    capabilityLabel: input.capabilityLabel,
    capabilityStatus: input.capabilityStatus,
    outcomeSignal: input.outcomeSignal,
    confidence: clampConfidence(input.confidence),
    evidenceRefs: [...input.evidenceRefs],
    architectureArea: input.architectureArea,
    privacyClass: privacyClassForProfile(profileMode, input.privacyClass),
    suggestedNextStep: input.suggestedNextStep,
    recommendationBoundary: DEFAULT_RECOMMENDATION_BOUNDARY,
  };
}

export function createCapabilityLedger(options: { maxSignals?: number } = {}): CapabilityLedger {
  const maxSignals = Math.max(1, options.maxSignals ?? 250);
  const signals: ConversationCapabilitySignal[] = [];

  return {
    append(signal) {
      signals.push(signal);
      while (signals.length > maxSignals) {
        signals.shift();
      }
      return signal;
    },
    clear() {
      signals.length = 0;
    },
    listRecent(limit = maxSignals) {
      return signals.slice(Math.max(0, signals.length - limit));
    },
    aggregate() {
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

function prunedSignals(signals: ConversationCapabilitySignal[], maxSignals: number): ConversationCapabilitySignal[] {
  return signals.slice(Math.max(0, signals.length - Math.max(1, maxSignals)));
}

export function serializeCapabilityLedger(
  ledger: CapabilityLedger,
  options: { maxSignals?: number; generatedAt?: string; taxonomy?: CapabilityTaxonomy } = {},
): SerializedCapabilityLedger {
  const maxSignals = Math.max(1, options.maxSignals ?? 250);
  return {
    schemaVersion: CAPABILITY_LEDGER_SCHEMA_VERSION,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    privacyCaveat: CAPABILITY_LEDGER_PRIVACY_CAVEAT,
    retention: { maxSignals },
    signals: prunedSignals(ledger.listRecent(), maxSignals),
    taxonomy: options.taxonomy ? serializeCapabilityTaxonomy(options.taxonomy, { generatedAt: options.generatedAt }) : undefined,
  };
}

export function deserializeCapabilityLedger(
  snapshot: unknown,
  options: { maxSignals?: number } = {},
): CapabilityLedger {
  const maxSignals =
    options.maxSignals ??
    (snapshot &&
    typeof snapshot === "object" &&
    "retention" in snapshot &&
    snapshot.retention &&
    typeof snapshot.retention === "object" &&
    "maxSignals" in snapshot.retention &&
    typeof snapshot.retention.maxSignals === "number"
      ? snapshot.retention.maxSignals
      : 250);
  const ledger = createCapabilityLedger({ maxSignals });
  if (!snapshot || typeof snapshot !== "object") return ledger;
  const candidate = snapshot as Record<string, unknown>;
  if (candidate.schemaVersion !== CAPABILITY_LEDGER_SCHEMA_VERSION || !Array.isArray(candidate.signals)) return ledger;

  for (const signal of prunedSignals(candidate.signals.map(sanitizeSignal).filter((s) => s !== null), maxSignals)) {
    appendCapabilitySignal(ledger, signal);
  }
  return ledger;
}

export function exportCapabilityLedger(
  ledger: CapabilityLedger,
  options: { maxSignals?: number; generatedAt?: string; taxonomy?: CapabilityTaxonomy } = {},
): ExportedCapabilityLedger {
  const maxSignals = Math.max(1, options.maxSignals ?? 250);
  return {
    schemaVersion: CAPABILITY_LEDGER_EXPORT_SCHEMA_VERSION,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    privacyCaveat: CAPABILITY_LEDGER_EXPORT_PRIVACY_CAVEAT,
    retention: { maxSignals },
    signals: prunedSignals(ledger.listRecent(), maxSignals),
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
  const asksCommon = /\b(common|most|frequent|popular)\b/.test(lower);
  const asksWorkingWell = /\b(working well|works well|successful|succeeding|good)\b/.test(lower);
  const asksCapability = /\b(capability|capabilities)\b/.test(lower);
  const asksMissingOrBlocked = /\b(missing|blocked|not working|failed|failing|architecture)\b/.test(lower);
  const asksEasyToEvolve = /\b(easy|easiest|evolve|evolution|small)\b/.test(lower);
  const asksArchitecture = /\b(architecture|part|area|component|improved|improve|fix)\b/.test(lower);
  const asksNext = /\b(implement|implemented|next|recommend|recommended|prioritize|priority)\b/.test(lower);

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

function easeWeight(area: CapabilityArchitectureArea): number {
  if (area === "bridge" || area === "text_ui" || area === "observability" || area === "evaluator") return 3;
  if (area === "governance_ux" || area === "memory_review" || area === "settings_privacy") return 2;
  return 1;
}

function suggestedStepWeight(step: SuggestedNextStep): number {
  if (step === "write_evaluator_case") return 3;
  if (step === "add_backlog_item") return 2;
  if (step === "create_evolution_proposal") return 2;
  if (step === "needs_human_review") return 1;
  return 0;
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

export function answerCapabilityQuestion(
  question: string,
  ledger: CapabilityLedger,
  taxonomy?: CapabilityTaxonomy,
): CapabilityQuestionAnswer | null {
  const kind = classifyCapabilityQuestion(question);
  if (!kind) return null;

  const rawSignals = ledger.listRecent();
  const signals = applyTaxonomyToSignals(rawSignals, taxonomy);
  const aggregate = aggregateCapabilitySignals(rawSignals, taxonomy);

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
    const rows = groupedRows(
      missingSafeRequests,
      (signal) => `${signal.capabilityLabel}:${signal.architectureArea}`,
      (signal) => signal.capabilityLabel,
      (signal) => easeWeight(signal.architectureArea) + suggestedStepWeight(signal.suggestedNextStep) + signal.confidence,
      { includeStatus: true, includeArchitectureArea: true, includeSuggestedNextStep: true },
    );
    return {
      kind,
      question,
      summary: `Easy-to-evolve missing capabilities, proposal-only: ${describeRows(rows)}.`,
      rows,
      evidenceCount: missingSafeRequests.length,
      caveat: MISSING_PROPOSAL_CAVEAT,
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
    const rows = groupedRows(
      candidateSignals,
      (signal) => `${signal.capabilityLabel}:${signal.capabilityStatus}:${signal.architectureArea}`,
      (signal) => signal.capabilityLabel,
      (signal) =>
        easeWeight(signal.architectureArea) +
        suggestedStepWeight(signal.suggestedNextStep) +
        signal.confidence +
        (signal.capabilityStatus === "missing" ? 2 : 1),
      { includeStatus: true, includeArchitectureArea: true, includeSuggestedNextStep: true },
    );
    return {
      kind,
      question,
      summary: `Recommended next capabilities, proposal-only: ${describeRows(rows)}.`,
      rows,
      evidenceCount: candidateSignals.length,
      caveat: MISSING_PROPOSAL_CAVEAT,
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
  const profileMode = normalizeProfileMode(attributes.profile as LocalProfile | NapoleonProfileMode | undefined);
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
