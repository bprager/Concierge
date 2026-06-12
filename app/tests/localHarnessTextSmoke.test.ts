import assert from "node:assert/strict";
import test from "node:test";
import { runLocalHarnessTextSmoke } from "../src/localHarnessSmoke.js";

function harnessJsonResponse(status: number, payload: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

test("smoke tests a governed text turn through a local Napoleon-compatible harness", async () => {
  const result = await runLocalHarnessTextSmoke({
    endpoint: "http://127.0.0.1:8787",
    message: "Draft a bridge readiness summary",
    profile: "adult_owner",
    fetch: async (url, init) => {
      if (url === "http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor") {
        return harnessJsonResponse(200, {
          descriptor: {
            schemaVersion: "napoleon/concierge/chief-of-staff-service/v1",
            serviceId: "napoleon.chief_of_staff",
            runtimeAuthority: false,
            commandExecution: false,
            cachePolicy: "fail_closed_to_review_required",
            blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "external_send"],
          },
          checksum: { expected: "sha256:smoke", actual: "sha256:smoke" },
          signature: { valid: true },
        });
      }

      assert.equal(url, "http://127.0.0.1:8787/v1/concierge/turn");
      assert.equal(init?.method, "POST");
      const body = JSON.parse(init?.body ?? "{}") as {
        traceId: string;
        profileMode: string;
        chiefOfStaffRequest: { request_id: string };
      };
      assert.equal(body.profileMode, "adult_owner");
      const traceId = body.traceId;
      const requestId = body.chiefOfStaffRequest.request_id;

      return harnessJsonResponse(200, {
        text: "Napoleon recommends keeping this as a governed review draft. Passive Brain found bridge context.",
        profileMode: body.profileMode,
        governanceDecision: {
          decision_id: `decision_${traceId}`,
          request_id: requestId,
          outcome: "requires_review",
          authority_tier: "advisory_review",
          approval_requirement: "chief_of_staff_and_owner_review",
          rationale: "Local harness requires governed review.",
          blocked_effects: ["memory_write", "approval_capture", "external_send", "agent_dispatch"],
          trace_id: traceId,
          audit_id: `audit_${traceId}`,
        },
        traceEnvelope: {
          trace_id: traceId,
          parent_trace_id: "local_harness",
          actor_id: "napoleon.local_harness",
          request_id: requestId,
          decision_id: `decision_${traceId}`,
          timestamp: "2026-06-12T00:00:00.000Z",
        },
        auditEnvelope: {
          audit_id: `audit_${traceId}`,
          trace_id: traceId,
          decision_id: `decision_${traceId}`,
          actor_id: "napoleon.local_harness",
          authority_tier: "advisory_review",
          approval_requirement: "chief_of_staff_and_owner_review",
          evidence_links: [`trace:${traceId}`, "harness:local"],
        },
        delegation: {
          selectedAgents: [
            {
              agentId: "passive_brain",
              displayName: "Passive Brain",
              selectionReason: "Prior bridge context is relevant to the request.",
              contributionSummary: "bridge context",
            },
          ],
          allowedEffects: ["prepare_advisory_response"],
          blockedEffects: ["memory_write", "approval_capture", "external_send", "agent_dispatch"],
          governanceState: "requires_review",
          traceId,
          auditId: `audit_${traceId}`,
        },
        recommendationProvenance: {
          summary: "keeping this as a governed review draft",
          traceId,
          auditId: `audit_${traceId}`,
        },
      });
    },
  });

  assert.equal(result.descriptorConnection.state, "ready");
  if (result.status !== "success") {
    throw new Error(`Expected success smoke result, got ${result.status}`);
  }
  assert.equal(result.response.governanceDecision.outcome, "requires_review");
  assert.equal(result.delegationView.heading, "Napoleon delegation");
  assert.ok(result.delegationView.body.includes("Passive Brain"));
  assert.ok(
    result.delegationView.details.some(
      (detail) => detail.label === "Blocked effects" && detail.value.includes("memory_write"),
    ),
  );
  assert.equal(result.readiness.captureState, "passed");
  assert.equal(result.readiness.comparisonState, "passed");
  assert.equal(result.liveBridgeReadiness.canSendLive, true);
  assert.ok(result.liveBridgeReadiness.blockedEffects.includes("memory_write"));
});

test("smoke test returns fail-closed bridge details when harness denies a text turn", async () => {
  const result = await runLocalHarnessTextSmoke({
    endpoint: "http://127.0.0.1:8787",
    message: "Send an external update",
    profile: "adult_owner",
    traceId: "trace_denied_smoke",
    fetch: async (url, init) => {
      if (url === "http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor") {
        return harnessJsonResponse(200, {
          descriptor: {
            schemaVersion: "napoleon/concierge/chief-of-staff-service/v1",
            serviceId: "napoleon.chief_of_staff",
            runtimeAuthority: false,
            commandExecution: false,
            cachePolicy: "fail_closed_to_review_required",
            blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "external_send"],
          },
          checksum: { expected: "sha256:smoke", actual: "sha256:smoke" },
          signature: { valid: true },
        });
      }

      assert.equal(url, "http://127.0.0.1:8787/v1/concierge/turn");
      const body = JSON.parse(init?.body ?? "{}") as {
        traceId: string;
        chiefOfStaffRequest: { request_id: string };
      };

      return harnessJsonResponse(200, {
        text: "Napoleon denied this request.",
        governanceDecision: {
          decision_id: "decision_denied_smoke",
          request_id: body.chiefOfStaffRequest.request_id,
          outcome: "deny",
          authority_tier: "prohibited",
          approval_requirement: "not_available",
          rationale: "External update is blocked.",
          blocked_effects: ["external_send", "memory_write", "approval_capture", "agent_dispatch"],
          trace_id: body.traceId,
          audit_id: "audit_denied_smoke",
        },
        traceEnvelope: {
          trace_id: body.traceId,
          parent_trace_id: "local_harness",
          actor_id: "napoleon.local_harness",
          request_id: body.chiefOfStaffRequest.request_id,
          decision_id: "decision_denied_smoke",
          timestamp: "2026-06-12T00:00:00.000Z",
        },
        auditEnvelope: {
          audit_id: "audit_denied_smoke",
          trace_id: body.traceId,
          decision_id: "decision_denied_smoke",
          actor_id: "napoleon.local_harness",
          authority_tier: "prohibited",
          approval_requirement: "not_available",
          evidence_links: [`trace:${body.traceId}`, "harness:local"],
        },
      });
    },
  });

  if (result.status !== "fail_closed") {
    throw new Error(`Expected fail-closed smoke result, got ${result.status}`);
  }
  assert.equal(result.failureReason, "governance_denied");
  assert.ok(result.failureMessage?.includes("governance_denied"));
  assert.ok(result.failureMessage?.includes("Blocked effects: external_send, memory_write, approval_capture, agent_dispatch"));
  assert.equal(result.readiness.captureState, "passed");
  assert.equal(result.readiness.comparisonState, "passed");
  assert.equal(result.liveBridgeReadiness.canSendLive, true);
});
