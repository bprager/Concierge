import assert from "node:assert/strict";
import test from "node:test";
import { buildTextTurnContract } from "../src/contractBridge.js";
import {
  buildSuccessfulNapoleonResponsePresentation,
  clearNapoleonResponsePresentation,
  compareNapoleonResponseProofs,
  exportNapoleonResponseProofJson,
} from "../src/napoleonResponsePresentation.js";

function responseProofJson(input: {
  traceId: string;
  governanceOutcome?: "allow_prepare_only" | "requires_review";
  agentName?: string;
  blockedEffects?: string[];
}): string {
  const contract = buildTextTurnContract({
    message: "Summarize the bridge rollout",
    profile: "adult_owner",
    conversationId: `conv_${input.traceId}`,
    turnId: `turn_${input.traceId}`,
    traceId: input.traceId,
    governanceOutcome: input.governanceOutcome ?? "requires_review",
  });
  const agentName = input.agentName ?? "Passive Brain";
  const state = buildSuccessfulNapoleonResponsePresentation({
    text: `${agentName} found bridge rollout context.`,
    profileMode: "adult_owner",
    governanceDecision: contract.governanceDecision,
    traceEnvelope: contract.traceEnvelope,
    auditEnvelope: contract.auditEnvelope,
    requiresReview: input.governanceOutcome === "requires_review",
    delegation: {
      selectedAgents: [
        {
          agentId: agentName.toLocaleLowerCase().replaceAll(" ", "_"),
          displayName: agentName,
          selectionReason: "Relevant context was returned.",
          contributionSummary: "bridge rollout context",
        },
      ],
      allowedEffects: ["prepare_advisory_response"],
      blockedEffects: input.blockedEffects ?? ["memory_write", "external_send"],
      governanceState: input.governanceOutcome ?? "requires_review",
      traceId: input.traceId,
      auditId: contract.auditEnvelope.audit_id,
    },
  });

  return exportNapoleonResponseProofJson(state, {
    generatedAt: "2026-06-13T00:00:00.000Z",
    conversationId: `conv_${input.traceId}`,
  });
}

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

test("successful Napoleon response proof includes returned target capability without delegation", () => {
  const contract = buildTextTurnContract({
    message: "Summarize the bridge readiness",
    profile: "adult_owner",
    conversationId: "conv_target_capability",
    turnId: "turn_target_capability",
    traceId: "trace_target_capability",
    governanceOutcome: "requires_review",
  });
  const state = buildSuccessfulNapoleonResponsePresentation({
    text: "Napoleon prepared a bridge readiness summary.",
    profileMode: "adult_owner",
    governanceDecision: contract.governanceDecision,
    traceEnvelope: contract.traceEnvelope,
    auditEnvelope: contract.auditEnvelope,
    requiresReview: true,
    targetAgent: "napoleon.chief_of_staff",
  });

  assert.equal(state.delegation?.heading, "Napoleon target capability");
  assert.ok(state.delegation?.body.includes("napoleon.chief_of_staff"));
  assert.ok(
    state.delegation?.details.some(
      (detail: { label: string; value: string }) =>
        detail.label === "Target capability" && detail.value === "napoleon.chief_of_staff",
    ),
  );
  assert.ok(
    state.delegation?.details.some(
      (detail: { label: string; value: string }) =>
        detail.label === "Selected agents" && detail.value === "not returned",
    ),
  );
  assert.equal(state.proof?.status, "verified");
  assert.ok(state.proof?.summary.includes("Capability: napoleon.chief_of_staff"));
  assert.ok(
    state.proof?.details.some(
      (detail: { label: string; value: string }) =>
        detail.label === "Capability or agents" && detail.value === "napoleon.chief_of_staff",
    ),
  );

  const exported = JSON.parse(
    exportNapoleonResponseProofJson(state, {
      generatedAt: "2026-06-13T00:00:00.000Z",
      conversationId: "conv_target_capability",
    }),
  ) as { responseProof: { selectedAgents: string[] } };

  assert.deepEqual(exported.responseProof.selectedAgents, ["napoleon.chief_of_staff"]);
});

test("non-live response presentation clears stale delegation and proof together", () => {
  const state = clearNapoleonResponsePresentation();

  assert.equal(state.delegation, null);
  assert.equal(state.proof, null);
});

test("exports last successful Napoleon response proof without raw text endpoint or secrets", () => {
  const contract = buildTextTurnContract({
    message: "Summarize the bridge rollout",
    profile: "adult_owner",
    conversationId: "conv_response_export",
    turnId: "turn_response_export",
    traceId: "trace_response_export",
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
      traceId: "trace_response_export",
      auditId: contract.auditEnvelope.audit_id,
    },
    recommendationProvenance: {
      summary: "keeping the rollout in review",
      traceId: "trace_response_export",
      auditId: contract.auditEnvelope.audit_id,
    },
  });

  const json = exportNapoleonResponseProofJson(state, {
    generatedAt: "2026-06-13T00:00:00.000Z",
    conversationId: "conv_response_export",
  });
  const proof = JSON.parse(json) as {
    kind: string;
    generatedAt: string;
    responseProof: {
      status: string;
      heading: string;
      governance: string;
      traceId: string;
      auditId: string;
      selectedAgents: string[];
      allowedEffects: string[];
      blockedEffects: string[];
    };
    boundary: {
      approvalCaptured: boolean;
      memoryWritePerformed: boolean;
      agentDispatchPerformed: boolean;
      externalSendPerformed: boolean;
    };
  };

  assert.equal(proof.kind, "concierge_napoleon_response_proof");
  assert.equal(proof.generatedAt, "2026-06-13T00:00:00.000Z");
  assert.equal(proof.responseProof.status, "verified");
  assert.equal(proof.responseProof.traceId, "trace_response_export");
  assert.equal(proof.responseProof.governance, "requires_review");
  assert.deepEqual(proof.responseProof.selectedAgents, ["Passive Brain"]);
  assert.ok(proof.responseProof.blockedEffects.includes("memory_write"));
  assert.equal(proof.boundary.approvalCaptured, false);
  assert.equal(proof.boundary.memoryWritePerformed, false);
  assert.equal(proof.boundary.agentDispatchPerformed, false);
  assert.equal(proof.boundary.externalSendPerformed, false);

  assert.ok(!json.includes("Summarize the bridge rollout"));
  assert.ok(!json.includes("Napoleon recommends keeping the rollout"));
  assert.ok(!json.includes("127.0.0.1"));
  assert.ok(!json.toLocaleLowerCase().includes("token"));
});

test("compares sanitized Napoleon response proof exports", () => {
  const previous = responseProofJson({
    traceId: "trace_previous",
    governanceOutcome: "requires_review",
    agentName: "Passive Brain",
    blockedEffects: ["memory_write", "external_send"],
  });
  const current = responseProofJson({
    traceId: "trace_current",
    governanceOutcome: "allow_prepare_only",
    agentName: "Planner",
    blockedEffects: ["memory_write", "agent_dispatch"],
  });

  const comparison = compareNapoleonResponseProofs(previous, current);

  assert.equal(comparison.status, "changed");
  assert.ok(comparison.summary.includes("changed"));
  assert.ok(comparison.changes.some((change: { label: string }) => change.label === "Governance"));
  assert.ok(comparison.changes.some((change: { label: string }) => change.label === "Selected agents"));
  assert.ok(comparison.changes.some((change: { label: string }) => change.label === "Blocked effects"));
  assert.ok(
    comparison.changes.every(
      (change: { current: string }) => !change.current.includes("Summarize the bridge rollout"),
    ),
  );
});

test("rejects missing or unsafe previous Napoleon response proof comparison input", () => {
  const current = responseProofJson({ traceId: "trace_current" });

  const missing = compareNapoleonResponseProofs(null, current);
  assert.equal(missing.status, "not_available");

  const unsafe = compareNapoleonResponseProofs(
    JSON.stringify({
      kind: "concierge_napoleon_response_proof",
      responseProof: { rawPrompt: "secret prompt" },
    }),
    current,
  );
  assert.equal(unsafe.status, "invalid_previous");
});
