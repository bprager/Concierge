import {
  appendCapabilitySignal,
  deriveCapabilitySignalFromEvent,
  type CapabilityLedger,
  type ConversationCapabilitySignal,
} from "./capabilityLedger.js";
import { loadCapabilityLedgerFromStorage, persistCapabilityLedgerToStorage } from "./capabilityLedgerStorage.js";

export interface TelemetryPayload {
  ts: string;
  event: string;
  attributes: Record<string, unknown>;
}

export interface LocalTelemetryBuffer {
  schemaVersion: "concierge.telemetry-buffer.v1";
  maxEvents: number;
  events: TelemetryPayload[];
}

export interface LocalTelemetryBufferExport {
  schemaVersion: "concierge.telemetry-buffer.export.v1";
  generatedAt: string;
  eventCount: number;
  maxEvents: number;
  caveat: string;
  events: TelemetryPayload[];
}

export interface InteractionTraceExport {
  schemaVersion: "concierge.interaction-trace.export.v1";
  generatedAt: string;
  trace_id: string;
  conversation_id: string;
  turn_id: string;
  user_profile: "adult_owner" | "child_protected" | "guest" | "collaborator";
  channel: "text" | "voice" | "avatar";
  governance_decision?: string;
  napoleon_references?: InteractionTraceNapoleonReferences;
  caveat: string;
  events: TelemetryPayload[];
}

export interface InteractionTraceNapoleonReferences {
  request_id: string;
  decision_id: string;
  audit_id: string;
  governance_outcome: string;
  blocked_effects: string[];
  bridge_failure_reason?: string;
  descriptor_failure_reason?: string;
}

export const TELEMETRY_BUFFER_STORAGE_KEY = "concierge_telemetry_buffer_v1";
export const TELEMETRY_BUFFER_MAX_EVENTS = 200;
export const TELEMETRY_BUFFER_RETENTION_STORAGE_KEY = "concierge_telemetry_buffer_max_events";
export const TELEMETRY_BUFFER_RETENTION_OPTIONS = [25, 50, 100, 200] as const;
export const TELEMETRY_BUFFER_EXPORT_CAVEAT =
  "Local redacted metadata only; not Napoleon approval, not a memory write, not agent dispatch, and not permission to send externally.";
export const INTERACTION_TRACE_EXPORT_CAVEAT =
  "Local sanitized trace metadata only; not Napoleon approval, not a memory write, not agent dispatch, and not permission to send externally.";

const SENSITIVE_ATTRIBUTE_KEYS = new Set([
  "authtoken",
  "authorization",
  "bearer_token",
  "bearertoken",
  "endpoint",
  "endpointurl",
  "message",
  "prompt",
  "rawaudio",
  "rawmessage",
  "rawprompt",
  "rawtext",
  "rawvideo",
  "requestbody",
  "responsebody",
  "responsetext",
  "token",
]);

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export const capabilityLedger: CapabilityLedger = loadCapabilityLedgerFromStorage(browserStorage());

export function newTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function makeTelemetryPayload(event: string, attributes: Record<string, unknown>): TelemetryPayload {
  return {
    ts: new Date().toISOString(),
    event,
    attributes,
  };
}

export function emitPayload(payload: TelemetryPayload) {
  console.info("[concierge.telemetry]", payload);
}

export function loadTelemetryBufferFromStorage(storage: Storage | null | undefined): LocalTelemetryBuffer {
  const maxEvents = loadTelemetryBufferRetentionLimit(storage);
  if (!storage) return emptyTelemetryBuffer(maxEvents);
  try {
    const raw = storage.getItem(TELEMETRY_BUFFER_STORAGE_KEY);
    if (!raw) return emptyTelemetryBuffer(maxEvents);
    const parsed = JSON.parse(raw) as unknown;
    if (!isTelemetryBuffer(parsed)) return emptyTelemetryBuffer(maxEvents);
    return {
      schemaVersion: "concierge.telemetry-buffer.v1",
      maxEvents,
      events: parsed.events.slice(-maxEvents),
    };
  } catch {
    return emptyTelemetryBuffer(maxEvents);
  }
}

export function appendTelemetryPayloadToBuffer(
  storage: Storage | null | undefined,
  payload: TelemetryPayload,
): LocalTelemetryBuffer {
  const current = loadTelemetryBufferFromStorage(storage);
  const maxEvents = loadTelemetryBufferRetentionLimit(storage);
  const next: LocalTelemetryBuffer = {
    schemaVersion: "concierge.telemetry-buffer.v1",
    maxEvents,
    events: [...current.events, sanitizeTelemetryPayload(payload)].slice(-maxEvents),
  };
  if (!storage) return next;
  try {
    storage.setItem(TELEMETRY_BUFFER_STORAGE_KEY, JSON.stringify(next));
  } catch {
    return current;
  }
  return next;
}

export function loadTelemetryBufferRetentionLimit(storage: Storage | null | undefined): number {
  if (!storage) return TELEMETRY_BUFFER_MAX_EVENTS;
  try {
    const raw = storage.getItem(TELEMETRY_BUFFER_RETENTION_STORAGE_KEY);
    const parsed = Number(raw);
    return isTelemetryBufferRetentionOption(parsed) ? parsed : TELEMETRY_BUFFER_MAX_EVENTS;
  } catch {
    return TELEMETRY_BUFFER_MAX_EVENTS;
  }
}

export function setTelemetryBufferRetentionLimit(
  storage: Storage | null | undefined,
  maxEvents: number,
): LocalTelemetryBuffer {
  const nextMaxEvents = isTelemetryBufferRetentionOption(maxEvents) ? maxEvents : TELEMETRY_BUFFER_MAX_EVENTS;
  const current = loadTelemetryBufferFromStorage(storage);
  const next: LocalTelemetryBuffer = {
    schemaVersion: "concierge.telemetry-buffer.v1",
    maxEvents: nextMaxEvents,
    events: current.events.slice(-nextMaxEvents),
  };
  if (!storage) return next;
  try {
    storage.setItem(TELEMETRY_BUFFER_RETENTION_STORAGE_KEY, String(nextMaxEvents));
    storage.setItem(TELEMETRY_BUFFER_STORAGE_KEY, JSON.stringify(next));
  } catch {
    return current;
  }
  return next;
}

export function exportTelemetryBufferJson(storage: Storage | null | undefined): string {
  const buffer = loadTelemetryBufferFromStorage(storage);
  const exportPayload: LocalTelemetryBufferExport = {
    schemaVersion: "concierge.telemetry-buffer.export.v1",
    generatedAt: new Date().toISOString(),
    eventCount: buffer.events.length,
    maxEvents: buffer.maxEvents,
    caveat: TELEMETRY_BUFFER_EXPORT_CAVEAT,
    events: buffer.events.map((event) => sanitizeTelemetryPayload(event)),
  };
  return JSON.stringify(exportPayload, null, 2);
}

export function exportInteractionTraceJson(storage: Storage | null | undefined, traceId: string): string {
  const events = loadTelemetryBufferFromStorage(storage)
    .events.filter((event) => event.attributes.traceId === traceId)
    .map((event) => sanitizeTelemetryPayload(event));
  const first = events[0];
  const lastWithGovernance = [...events].reverse().find((event) => typeof event.attributes.governanceOutcome === "string");
  const napoleonReferences = interactionTraceNapoleonReferences(events);
  const exportPayload: InteractionTraceExport = {
    schemaVersion: "concierge.interaction-trace.export.v1",
    generatedAt: new Date().toISOString(),
    trace_id: traceId,
    conversation_id: stringAttribute(first, "conversationId", "not_returned"),
    turn_id: stringAttribute(first, "turnId", "not_returned"),
    user_profile: userProfileAttribute(first),
    channel: channelAttribute(first),
    ...(lastWithGovernance
      ? { governance_decision: stringAttribute(lastWithGovernance, "governanceOutcome", "not_returned") }
      : {}),
    ...(napoleonReferences ? { napoleon_references: napoleonReferences } : {}),
    caveat: INTERACTION_TRACE_EXPORT_CAVEAT,
    events,
  };
  return JSON.stringify(exportPayload, null, 2);
}

export function findLatestInteractionTraceId(storage: Storage | null | undefined): string | null {
  const events = loadTelemetryBufferFromStorage(storage).events;
  for (const event of [...events].reverse()) {
    const traceId = event.attributes.traceId;
    const turnId = event.attributes.turnId;
    if (typeof traceId === "string" && traceId.length > 0 && typeof turnId === "string" && turnId.length > 0) {
      return traceId;
    }

    const responseTraceId = event.attributes.responseTraceId;
    if (
      typeof responseTraceId === "string" &&
      responseTraceId.length > 0 &&
      events.some((candidate) => candidate.attributes.traceId === responseTraceId && typeof candidate.attributes.turnId === "string")
    ) {
      return responseTraceId;
    }
  }
  return null;
}

export function clearTelemetryBuffer(storage: Storage | null | undefined): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(TELEMETRY_BUFFER_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

function localTelemetryEnabled(): boolean {
  const storage = browserStorage();
  if (!storage) return true;
  return storage.getItem("concierge_telemetry_enabled") !== "false";
}

function isPrivacyAuditEvent(event: string): boolean {
  return (
    event === "privacy_setting_changed" ||
    event === "mic_permission_requested" ||
    event === "mic_permission_result" ||
    event === "camera_permission_requested" ||
    event === "camera_permission_result"
  );
}

export function emitEvent(event: string, attributes: Record<string, unknown>) {
  if (!localTelemetryEnabled() && !isPrivacyAuditEvent(event)) {
    return;
  }

  const payload = makeTelemetryPayload(event, attributes);

  appendTelemetryPayloadToBuffer(browserStorage(), payload);
  emitPayload(payload);
  emitCapabilitySignal(event, attributes);
}

export function emitCapabilitySignal(
  event: string,
  attributes: Record<string, unknown>,
): ConversationCapabilitySignal | null {
  const trackableEvents = new Set([
    "rehearsal_preview_created",
    "governance_review_blocked",
    "governance_review_required",
    "governance_review_acknowledged_locally",
    "governance_review_send_started",
    "governance_review_send_completed",
    "governance_review_send_failed",
    "capability_recommendation_send_started",
    "capability_recommendation_send_completed",
    "capability_recommendation_send_failed",
    "capability_review_packet_send_started",
    "capability_review_packet_send_completed",
    "capability_review_packet_send_failed",
    "capability_taxonomy_review_send_started",
    "capability_taxonomy_review_send_completed",
    "capability_taxonomy_review_send_failed",
    "new_agent_proposal_review_drafted",
    "new_agent_proposal_review_send_started",
    "new_agent_proposal_review_send_completed",
    "new_agent_proposal_review_send_failed",
    "evolution_proposal_submission_drafted",
    "evolution_proposal_submission_send_started",
    "evolution_proposal_submission_send_completed",
    "evolution_proposal_submission_send_failed",
    "evolution_proposal_lifecycle_recorded",
    "evolution_proposal_lifecycle_exported",
    "observability_trace_handoff_started",
    "observability_trace_handoff_completed",
    "observability_trace_handoff_failed",
    "memory_proposal_review_created",
    "memory_proposal_acknowledged_locally",
    "memory_proposal_dismissed_locally",
    "memory_proposal_send_started",
    "memory_proposal_send_completed",
    "memory_proposal_send_failed",
    "descriptor_discovery_completed",
    "descriptor_discovery_failed",
    "chief_of_staff_capabilities_discovered",
    "chief_of_staff_capabilities_blocked",
    "evaluator_validation_artifact_imported",
    "bridge_request_failed",
    "bridge_request_completed",
    "response_failed",
    "response_generated",
    "avatar_state_changed",
    "child_avatar_policy_applied",
    "avatar_expression_set",
    "avatar_model_loaded",
    "avatar_renderer_readiness_prepared",
    "gaze_target_updated",
    "camera_state_estimated",
    "affect_signal_fused",
    "lip_sync_completed",
    "stt_completed",
    "tts_completed",
    "voice_turn_rehearsed",
    "barge_in_rehearsed",
    "voice_response_shaped",
    "child_voice_policy_applied",
    "wake_word_sample_detected",
    "voice_segment_detected",
    "mic_permission_result",
    "camera_permission_result",
    "media_session_readiness_summarized",
  ]);

  const isWakeWordReadinessEvent = event === "privacy_setting_changed" && attributes.setting === "wake_word";

  if (!trackableEvents.has(event) && !isWakeWordReadinessEvent) return null;
  if (event === "response_failed" && attributes.bridgeRequestFailureAlreadyTracked === true) return null;

  const signal = deriveCapabilitySignalFromEvent(event, attributes);
  appendCapabilitySignal(capabilityLedger, signal);
  if (persistCapabilityLedgerToStorage(browserStorage(), capabilityLedger)) {
    emitPayload(
      makeTelemetryPayload("capability_ledger_persisted", {
        traceId: signal.traceId,
        conversationId: signal.conversationId,
        turnId: signal.turnId,
        evidenceCount: capabilityLedger.listRecent().length,
        privacyClass: signal.privacyClass,
        storage: "local_browser",
      }),
    );
  }
  emitPayload(makeTelemetryPayload(signal.eventName, signal as unknown as Record<string, unknown>));
  return signal;
}

function emptyTelemetryBuffer(maxEvents = TELEMETRY_BUFFER_MAX_EVENTS): LocalTelemetryBuffer {
  return {
    schemaVersion: "concierge.telemetry-buffer.v1",
    maxEvents,
    events: [],
  };
}

function isTelemetryBufferRetentionOption(value: number): value is (typeof TELEMETRY_BUFFER_RETENTION_OPTIONS)[number] {
  return TELEMETRY_BUFFER_RETENTION_OPTIONS.includes(value as (typeof TELEMETRY_BUFFER_RETENTION_OPTIONS)[number]);
}

function isTelemetryBuffer(candidate: unknown): candidate is LocalTelemetryBuffer {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    (candidate as { schemaVersion?: unknown }).schemaVersion === "concierge.telemetry-buffer.v1" &&
    Array.isArray((candidate as { events?: unknown }).events)
  );
}

function sanitizeTelemetryPayload(payload: TelemetryPayload): TelemetryPayload {
  return {
    ts: payload.ts,
    event: payload.event,
    attributes: sanitizeTelemetryAttributes(payload.attributes),
  };
}

function sanitizeTelemetryAttributes(attributes: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attributes)) {
    sanitized[key] = shouldRedactTelemetryAttribute(key) ? "[redacted]" : sanitizeTelemetryValue(value);
  }
  return sanitized;
}

function sanitizeTelemetryValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sanitizeTelemetryValue(item));
  if (value && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = shouldRedactTelemetryAttribute(key) ? "[redacted]" : sanitizeTelemetryValue(nestedValue);
    }
    return sanitized;
  }
  if (typeof value === "string") return safeReferenceString(value);
  return value;
}

function shouldRedactTelemetryAttribute(key: string): boolean {
  return SENSITIVE_ATTRIBUTE_KEYS.has(key.toLowerCase());
}

function stringAttribute(payload: TelemetryPayload | undefined, key: string, fallback: string): string {
  const value = payload?.attributes[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function userProfileAttribute(payload: TelemetryPayload | undefined): InteractionTraceExport["user_profile"] {
  const profile = stringAttribute(payload, "profile", "guest");
  if (profile === "adult_owner" || profile === "child_protected" || profile === "guest" || profile === "collaborator") {
    return profile;
  }
  return "guest";
}

function channelAttribute(payload: TelemetryPayload | undefined): InteractionTraceExport["channel"] {
  const channel = stringAttribute(payload, "channel", "text");
  if (channel === "text" || channel === "voice" || channel === "avatar") {
    return channel;
  }
  return "text";
}

function interactionTraceNapoleonReferences(events: TelemetryPayload[]): InteractionTraceNapoleonReferences | null {
  if (!events.length) return null;
  const references: InteractionTraceNapoleonReferences = {
    request_id: safeReferenceAttribute(events, "requestId"),
    decision_id: safeReferenceAttribute(events, "decisionId"),
    audit_id: safeReferenceAttribute(events, "auditId"),
    governance_outcome: safeReferenceAttribute(events, "governanceOutcome", "outcome"),
    blocked_effects: safeReferenceArrayAttribute(events, "blockedEffects"),
  };
  const explicitBridgeFailureReason = safeReferenceAttribute(events, "bridgeFailureReason");
  const bridgeFailureReason =
    explicitBridgeFailureReason !== "not_returned"
      ? explicitBridgeFailureReason
      : safeReferenceAttributeFromFailureEvents(events, "reason");
  const descriptorFailureReason = safeReferenceAttribute(events, "descriptorFailureReason");
  if (bridgeFailureReason && bridgeFailureReason !== "not_returned") {
    references.bridge_failure_reason = bridgeFailureReason;
  }
  if (descriptorFailureReason !== "not_returned") {
    references.descriptor_failure_reason = descriptorFailureReason;
  }
  return references;
}

function safeReferenceAttribute(events: TelemetryPayload[], ...keys: string[]): string {
  for (const event of [...events].reverse()) {
    for (const key of keys) {
      const value = event.attributes[key];
      if (typeof value === "string" && value.length > 0) {
        return safeReferenceString(value);
      }
    }
  }
  return "not_returned";
}

function safeReferenceAttributeFromFailureEvents(events: TelemetryPayload[], key: string): string | null {
  for (const event of [...events].reverse()) {
    if (!event.event.endsWith("_failed") && event.event !== "bridge_request_failed") continue;
    const value = event.attributes[key];
    if (typeof value === "string" && value.length > 0) {
      return safeReferenceString(value);
    }
  }
  return null;
}

function safeReferenceArrayAttribute(events: TelemetryPayload[], key: string): string[] {
  for (const event of [...events].reverse()) {
    const value = event.attributes[key];
    if (Array.isArray(value) && value.length > 0) {
      return value.map((item) => (typeof item === "string" ? safeReferenceString(item) : "[redacted]")).slice(0, 20);
    }
  }
  return ["not_returned"];
}

function safeReferenceString(value: string): string {
  if (/https?:\/\//i.test(value)) return "[redacted]";
  if (/\b(localhost|127\.0\.0\.1|0\.0\.0\.0)\b/i.test(value)) return "[redacted]";
  if (/\b(bearer|authorization|token|secret)\b/i.test(value)) return "[redacted]";
  return value;
}
