import type { LocalProfile, NapoleonProfileMode } from "./contractBridge.js";

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
  listRecent(limit?: number): ConversationCapabilitySignal[];
  aggregate(): CapabilityAggregate;
}

const DEFAULT_RECOMMENDATION_BOUNDARY: RecommendationBoundary = {
  proposalOnly: true,
  approvalCaptured: false,
  memoryWriteAllowed: false,
  agentDispatchAllowed: false,
  externalSendAllowed: false,
};

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

function increment(bucket: Record<string, number>, key: string) {
  bucket[key] = (bucket[key] ?? 0) + 1;
}

export function aggregateCapabilitySignals(signals: ConversationCapabilitySignal[]): CapabilityAggregate {
  const aggregate: CapabilityAggregate = {
    total: signals.length,
    byTopic: {},
    byIntent: {},
    byCapability: {},
    byStatus: {},
    byArchitectureArea: {},
  };

  for (const signal of signals) {
    increment(aggregate.byTopic, signal.topicLabel);
    increment(aggregate.byIntent, signal.intentLabel);
    increment(aggregate.byCapability, signal.capabilityLabel);
    increment(aggregate.byStatus, signal.capabilityStatus);
    increment(aggregate.byArchitectureArea, signal.architectureArea);
  }

  return aggregate;
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
