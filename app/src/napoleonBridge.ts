import type { NapoleonRequest, NapoleonResponse } from "./types";
import { emitEvent } from "./telemetry";

export async function sendToNapoleon(request: NapoleonRequest): Promise<NapoleonResponse> {
  emitEvent("bridge_request_started", {
    traceId: request.traceId,
    profile: request.profile,
    channel: request.channel,
  });

  const endpoint = localStorage.getItem("napoleon_endpoint");

  if (!endpoint) {
    emitEvent("bridge_request_completed", {
      traceId: request.traceId,
      mode: "local_stub",
    });

    return {
      text:
        request.profile === "child_protected"
          ? "I can help, and I will keep it simple. I will not do anything outside this chat without guardian approval."
          : "I would route this through Napoleon. Configure a Napoleon endpoint in settings to enable live calls.",
      governanceDecision: "stub_read_only",
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    emitEvent("bridge_request_failed", {
      traceId: request.traceId,
      status: response.status,
    });
    throw new Error(`Napoleon bridge failed: ${response.status}`);
  }

  const payload = (await response.json()) as NapoleonResponse;
  emitEvent("bridge_request_completed", {
    traceId: request.traceId,
    mode: "http",
  });
  return payload;
}
