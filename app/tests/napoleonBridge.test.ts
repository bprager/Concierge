import assert from "node:assert/strict";
import test from "node:test";
import { sendToNapoleon } from "../src/napoleonBridge.js";
import type { TelemetryPayload } from "../src/telemetry.js";

test("local stub response includes CoS governance and trace contracts", async () => {
  const events: TelemetryPayload[] = [];

  const response = await sendToNapoleon(
    {
      traceId: "trace_bridge",
      conversationId: "conv_bridge",
      turnId: "turn_bridge",
      profile: "child_protected",
      channel: "text",
      message: "Can you send this to someone?",
    },
    {
      getEndpoint: () => null,
      emit: (event) => events.push(event),
    },
  );

  assert.equal(response.profileMode, "child_protected_user");
  assert.equal(response.governanceDecision.outcome, "requires_review");
  assert.equal(response.governanceDecision.decision_id, "decision_turn_bridge");
  assert.equal(response.auditEnvelope.audit_id, "audit_turn_bridge");
  assert.ok(response.governanceDecision.blocked_effects.includes("external_send"));
  assert.ok(response.text.includes("guardian"));
  assert.equal(events[0].event, "bridge_request_started");
  assert.equal(events.at(-1)?.event, "bridge_request_completed");
});

test("live bridge request sends contract-first payload to configured endpoint", async () => {
  let posted: Record<string, unknown> | undefined;

  const response = await sendToNapoleon(
    {
      traceId: "trace_live",
      conversationId: "conv_live",
      turnId: "turn_live",
      profile: "adult_owner",
      channel: "text",
      message: "Draft the bridge plan",
    },
    {
      getEndpoint: () => "https://napoleon.example/concierge",
      emit: () => undefined,
      fetch: async (_url, init) => {
        posted = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return {
          ok: true,
          json: async () => ({
            text: "Prepared through Napoleon.",
            governanceDecision: {
              decision_id: "decision_remote",
              request_id: "cos_turn_live",
              outcome: "requires_review",
              authority_tier: "prepare_only",
              approval_requirement: "explicit_owner_approval",
              rationale: "External effects require owner approval.",
              blocked_effects: ["external_send"],
              trace_id: "trace_live",
              audit_id: "audit_remote",
            },
          }),
        };
      },
    },
  );

  assert.equal((posted?.chiefOfStaffRequest as { request_type: string }).request_type, "governance_review");
  assert.equal((posted?.governanceRequest as { requested_authority_tier: string }).requested_authority_tier, "advisory_review");
  assert.equal((posted?.traceEnvelope as { trace_id: string }).trace_id, "trace_live");
  assert.equal(response.governanceDecision.outcome, "requires_review");
  assert.equal(response.requiresReview, true);
});
