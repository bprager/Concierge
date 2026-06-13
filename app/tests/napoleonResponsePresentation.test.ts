import assert from "node:assert/strict";
import test from "node:test";
import { buildTextTurnContract } from "../src/contractBridge.js";
import {
  buildSuccessfulNapoleonResponsePresentation,
  clearNapoleonResponsePresentation,
} from "../src/napoleonResponsePresentation.js";

test("successful Napoleon response presentation includes returned delegation and proof", () => {
  const contract = buildTextTurnContract({
    message: "Summarize the bridge rollout",
    profile: "adult_owner",
    conversationId: "conv_response_presentation",
    turnId: "turn_response_presentation",
    traceId: "trace_response_presentation",
    governanceOutcome: "requires_review",
  });

  const state = buildSuccessfulNapoleonResponsePresentation({
    text: "Napoleon recommends keeping the rollout in review. Passive Brain found bridge rollout context.",
    profileMode: "adult_owner",
    governanceDecision: contract.governanceDecision,
    traceEnvelope: contract.traceEnvelope,
    auditEnvelope: contract.auditEnvelope,
    requiresReview: true,
    delegation: {
      selectedAgents: [
        {
          agentId: "passive_brain",
          displayName: "Passive Brain",
          selectionReason: "Prior bridge rollout context is relevant.",
          contributionSummary: "bridge rollout context",
        },
      ],
      allowedEffects: ["prepare_advisory_response"],
      blockedEffects: ["memory_write", "external_send", "agent_dispatch"],
      governanceState: "requires_review",
      traceId: "trace_response_presentation",
      auditId: contract.auditEnvelope.audit_id,
    },
    recommendationProvenance: {
      summary: "keeping the rollout in review",
      traceId: "trace_response_presentation",
      auditId: contract.auditEnvelope.audit_id,
    },
  });

  assert.equal(state.delegation?.heading, "Napoleon delegation");
  assert.ok(state.delegation?.body.includes("Passive Brain"));
  assert.equal(state.proof?.heading, "Last successful Napoleon proof");
  assert.equal(state.proof?.status, "verified");
  assert.ok(state.proof?.summary.includes("Napoleon recommendation"));
  assert.ok(
    state.proof?.details.some(
      (detail: { label: string; value: string }) =>
        detail.label === "Blocked effects" && detail.value.includes("memory_write"),
    ),
  );
});

test("non-live response presentation clears stale delegation and proof together", () => {
  const state = clearNapoleonResponsePresentation();

  assert.equal(state.delegation, null);
  assert.equal(state.proof, null);
});
