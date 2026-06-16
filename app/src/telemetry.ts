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

export const TELEMETRY_BUFFER_STORAGE_KEY = "concierge_telemetry_buffer_v1";
export const TELEMETRY_BUFFER_MAX_EVENTS = 200;
export const TELEMETRY_BUFFER_RETENTION_STORAGE_KEY = "concierge_telemetry_buffer_max_events";
export const TELEMETRY_BUFFER_RETENTION_OPTIONS = [25, 50, 100, 200] as const;
export const TELEMETRY_BUFFER_EXPORT_CAVEAT =
  "Local redacted metadata only; not Napoleon approval, not a memory write, not agent dispatch, and not permission to send externally.";

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
  return value;
}

function shouldRedactTelemetryAttribute(key: string): boolean {
  return SENSITIVE_ATTRIBUTE_KEYS.has(key.toLowerCase());
}
