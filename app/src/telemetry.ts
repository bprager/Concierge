export function newTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function emitEvent(event: string, attributes: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    event,
    attributes,
  };

  // P1 target: write to local buffer and optionally export via OTLP.
  // For now, keep it visible during development.
  console.info("[concierge.telemetry]", payload);
}
