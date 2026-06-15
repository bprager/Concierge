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

export const TELEMETRY_BUFFER_STORAGE_KEY = "concierge_telemetry_buffer_v1";
export const TELEMETRY_BUFFER_MAX_EVENTS = 200;

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
  if (!storage) return emptyTelemetryBuffer();
  try {
    const raw = storage.getItem(TELEMETRY_BUFFER_STORAGE_KEY);
    if (!raw) return emptyTelemetryBuffer();
    const parsed = JSON.parse(raw) as unknown;
    if (!isTelemetryBuffer(parsed)) return emptyTelemetryBuffer();
    return {
      schemaVersion: "concierge.telemetry-buffer.v1",
      maxEvents: TELEMETRY_BUFFER_MAX_EVENTS,
      events: parsed.events.slice(-TELEMETRY_BUFFER_MAX_EVENTS),
    };
  } catch {
    return emptyTelemetryBuffer();
  }
}

export function appendTelemetryPayloadToBuffer(
  storage: Storage | null | undefined,
  payload: TelemetryPayload,
): LocalTelemetryBuffer {
  const current = loadTelemetryBufferFromStorage(storage);
  const next: LocalTelemetryBuffer = {
    schemaVersion: "concierge.telemetry-buffer.v1",
    maxEvents: TELEMETRY_BUFFER_MAX_EVENTS,
    events: [...current.events, sanitizeTelemetryPayload(payload)].slice(-TELEMETRY_BUFFER_MAX_EVENTS),
  };
  if (!storage) return next;
  try {
    storage.setItem(TELEMETRY_BUFFER_STORAGE_KEY, JSON.stringify(next));
  } catch {
    return current;
  }
  return next;
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
    "memory_proposal_review_created",
    "memory_proposal_acknowledged_locally",
    "memory_proposal_dismissed_locally",
    "response_failed",
    "response_generated",
  ]);

  if (!trackableEvents.has(event)) return null;

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

function emptyTelemetryBuffer(): LocalTelemetryBuffer {
  return {
    schemaVersion: "concierge.telemetry-buffer.v1",
    maxEvents: TELEMETRY_BUFFER_MAX_EVENTS,
    events: [],
  };
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
  return value;
}

function shouldRedactTelemetryAttribute(key: string): boolean {
  return SENSITIVE_ATTRIBUTE_KEYS.has(key.toLowerCase());
}
