import assert from "node:assert/strict";
import test from "node:test";
import {
  buildObservabilityTraceHandoffPacket,
  submitObservabilityTraceHandoff,
} from "../src/observabilityTraceHandoff.js";
import { defaultChiefOfStaffDescriptor } from "../src/contractBridge.js";
import { NapoleonBridgeError } from "../src/napoleonBridge.js";
import type { TelemetryPayload } from "../src/telemetry.js";

const readyDescriptorConnection = {
  endpointConfigured: true,
  descriptor: defaultChiefOfStaffDescriptor,
  expectedChecksum: "sha256:local-static",
  actualChecksum: "sha256:local-static",
  signatureValid: true,
};

const textTurnOnlyDescriptorConnection = {
  endpointConfigured: true,
  descriptor: {
    schemaVersion: "napoleon/concierge/runtime-descriptor/v1",
    serviceId: "napoleon.chief_of_staff" as const,
    runtimeAuthority: false as const,
    commandExecution: false as const,
    cachePolicy: "runtime_descriptor_live_response" as const,
    blockedEffects: ["runtime_authority", "memory_write", "agent_dispatch", "external_send"],
    supportedHandoffs: ["text_turn" as const],
  },
};

function successfulTraceReviewResponse() {
  return {
    governanceDecision: {
      decision_id: "decision_trace_review",
      request_id: "trace_handoff_trace_observed",
      outcome: "allow_prepare_only",
      authority_tier: "advisory_review",
      approval_requirement: "Napoleon observability review only.",
      rationale: "Trace evidence accepted for review without append authority.",
      blocked_effects: ["trace_append", "approval_capture", "memory_write", "agent_dispatch", "external_send"],
      trace_id: "trace_observed",
      audit_id: "audit_trace_review",
    },
    traceEnvelope: {
      trace_id: "trace_observed",
      parent_trace_id: "conversation_trace_review",
      actor_id: "napoleon.observability",
      request_id: "trace_handoff_trace_observed",
      decision_id: "decision_trace_review",
      timestamp: "2026-06-23T12:00:00.000Z",
    },
    auditEnvelope: {
      audit_id: "audit_trace_review",
      trace_id: "trace_observed",
      decision_id: "decision_trace_review",
      actor_id: "napoleon.observability",
      authority_tier: "advisory_review",
      approval_requirement: "Napoleon observability review only.",
      evidence_links: ["trace:trace_observed"],
    },
    appliedLocally: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
  };
}

test("observability trace handoff packet keeps only sanitized evidence metadata", () => {
  const packet = buildObservabilityTraceHandoffPacket(
    {
      traceId: "trace_observed",
      requestId: "request_observed",
      decisionId: "decision_observed",
      auditId: "audit_observed",
      governanceOutcome: "allow_prepare_only",
      handledBy: "napoleon.chief_of_staff",
      failureReason: "https://127.0.0.1:8787/raw-response leaked",
      blockedEffects: ["memory_write", "Bearer secret-token"],
      evidenceRefs: ["trace:trace_observed", "https://private.example/raw"],
    },
    "adult_owner",
  );

  assert.equal(packet.schemaVersion, "concierge.observability-trace-handoff.v1");
  assert.equal(packet.requestKind, "observability_trace_handoff");
  assert.equal(packet.profileMode, "adult_owner");
  assert.equal(packet.boundary.evidenceOnly, true);
  assert.equal(packet.boundary.rawPromptRetained, false);
  assert.equal(packet.boundary.rawResponseRetained, false);
  assert.equal(packet.boundary.endpointRetained, false);
  assert.equal(packet.boundary.bearerTokenRetained, false);
  assert.equal(packet.boundary.traceAppendPerformed, false);
  assert.equal(packet.boundary.auditAuthorityCreated, false);
  assert.equal(packet.boundary.approvalCaptured, false);
  assert.equal(packet.boundary.memoryWritePerformed, false);
  assert.equal(packet.boundary.agentDispatchPerformed, false);
  assert.equal(packet.boundary.externalSendPerformed, false);
  assert.deepEqual(packet.traceEvidence.evidenceRefs, ["trace:trace_observed"]);
  assert.deepEqual(packet.traceEvidence.blockedEffects, ["memory_write", "[redacted]"]);
  assert.equal(packet.traceEvidence.failureReason, "[redacted]");
  assert.ok(packet.blockedEffects.includes("trace_append"));
});

test("observability trace handoff sends through the governed Napoleon trace target", async () => {
  const packet = buildObservabilityTraceHandoffPacket({ traceId: "trace_observed", evidenceRefs: ["trace:trace_observed"] });
  const events: TelemetryPayload[] = [];
  const capturedBodies: Record<string, unknown>[] = [];

  const result = await submitObservabilityTraceHandoff(packet, {
    getEndpoint: () => "https://napoleon.example",
    getAuthToken: () => "local-token",
    descriptorConnection: readyDescriptorConnection,
    emit: (event) => events.push(event),
    fetch: async (url, init) => {
      assert.equal(url, "https://napoleon.example/observability/traces");
      assert.equal(init?.method, "POST");
      assert.equal(init?.headers?.Authorization, "Bearer local-token");
      capturedBodies.push(JSON.parse(init?.body ?? "{}") as Record<string, unknown>);
      return {
        ok: true,
        status: 200,
        json: async () => successfulTraceReviewResponse(),
      };
    },
  });

  assert.equal(result.appliedLocally, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.agentDispatchPerformed, false);
  assert.equal(result.externalSendPerformed, false);
  assert.equal(result.traceAppendPerformed, false);
  assert.equal(result.auditAuthorityCreated, false);
  assert.equal(result.taskRoutingPerformed, false);
  assert.equal(capturedBodies.length, 1);
  const requestBody = capturedBodies[0];
  assert.equal(requestBody.requestKind, "observability_trace_handoff");
  assert.equal(requestBody.bridgeTargetPath, "/observability/traces");
  assert.equal(requestBody.bridgeTargetOperation, "observability_trace");
  assert.equal((requestBody.traceHandoff as { boundary: { evidenceOnly: boolean } }).boundary.evidenceOnly, true);
  assert.deepEqual(
    events.map((event) => event.event),
    ["observability_trace_handoff_started", "observability_trace_handoff_completed"],
  );
  assert.equal(events[0].attributes.bridgeTargetPath, "/observability/traces");
});

test("observability trace handoff fails closed before fetch when descriptor does not advertise the handoff", async () => {
  const packet = buildObservabilityTraceHandoffPacket({ traceId: "trace_observed" });
  let fetchCalled = false;

  await assert.rejects(
    () =>
      submitObservabilityTraceHandoff(packet, {
        getEndpoint: () => "https://napoleon.example",
        descriptorConnection: textTurnOnlyDescriptorConnection,
        fetch: async () => {
          fetchCalled = true;
          throw new Error("should not fetch");
        },
      }),
    (error) => error instanceof NapoleonBridgeError && error.reason === "descriptor_mismatch",
  );
  assert.equal(fetchCalled, false);
});

test("observability trace handoff rejects responses that claim trace append authority", async () => {
  const packet = buildObservabilityTraceHandoffPacket({ traceId: "trace_observed" });

  await assert.rejects(
    () =>
      submitObservabilityTraceHandoff(packet, {
        getEndpoint: () => "https://napoleon.example",
        descriptorConnection: readyDescriptorConnection,
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            ...successfulTraceReviewResponse(),
            traceAppendPerformed: true,
          }),
        }),
      }),
    (error) => error instanceof NapoleonBridgeError && error.reason === "contract_mismatch",
  );
});
