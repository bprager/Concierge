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

function localTelemetryEnabled(): boolean {
  const storage = browserStorage();
  if (!storage) return true;
  return storage.getItem("concierge_telemetry_enabled") !== "false";
}

export function emitEvent(event: string, attributes: Record<string, unknown>) {
  if (!localTelemetryEnabled() && event !== "privacy_setting_changed") {
    return;
  }

  const payload = makeTelemetryPayload(event, attributes);

  // P1 target: write to local buffer and optionally export via OTLP.
  // For now, keep it visible during development.
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
