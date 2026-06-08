export interface TelemetryPayload {
  ts: string;
  event: string;
  attributes: Record<string, unknown>;
}

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

export function emitEvent(event: string, attributes: Record<string, unknown>) {
  const payload = makeTelemetryPayload(event, attributes);

  // P1 target: write to local buffer and optionally export via OTLP.
  // For now, keep it visible during development.
  emitPayload(payload);
}
