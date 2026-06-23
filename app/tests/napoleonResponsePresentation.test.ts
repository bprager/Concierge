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
  selectionReason?: string;
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
  const selectionReason = input.selectionReason ?? "Relevant context was returned.";
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
          selectionReason,
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
  assert.ok(
    state.delegation?.details.some(
      (detail: { label: string; value: string }) =>
        detail.label === "Provenance source" &&
        detail.value === "returned bridge delegation; not local metadata discovery",
    ),
  );
  assert.ok(
    state.delegation?.details.some(
      (detail: { label: string; value: string }) =>
        detail.label === "Proof alignment" &&
        detail.value === "same returned trace/audit as Napoleon response proof; not imported readiness proof",
    ),
  );
  assert.equal(state.proof?.heading, "Last successful Napoleon proof");
  assert.equal(state.proof?.status, "verified");
  assert.ok(state.proof?.summary.includes("Napoleon recommendation"));
  assert.ok(
    state.proof?.details.some(
      (detail: { label: string; value: string }) =>
        detail.label === "Recommendation proof alignment" &&
        detail.value === "same returned trace/audit as Napoleon response proof",
    ),
  );
  assert.ok(
    state.proof?.details.some(
      (detail: { label: string; value: string }) =>
        detail.label === "Blocked effects" && detail.value.includes("memory_write"),
    ),
  );
  assert.ok(
    state.proof?.details.some(
      (detail: { label: string; value: string }) =>
        detail.label === "Attribution boundary" &&
        detail.value === "Returned bridge provenance only; not local authority.",
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
  assert.ok(
    state.delegation?.details.some(
      (detail: { label: string; value: string }) =>
        detail.label === "Provenance source" &&
        detail.value === "target capability only; selected-agent delegation not returned",
    ),
  );
  assert.ok(
    state.delegation?.details.some(
      (detail: { label: string; value: string }) =>
        detail.label === "Blocked effects" && detail.value.includes("memory_write"),
    ),
  );
  assert.ok(
    state.delegation?.details.some(
      (detail: { label: string; value: string }) =>
        detail.label === "Governance state" && detail.value === "requires_review",
    ),
  );
  assert.ok(
    state.delegation?.details.some(
      (detail: { label: string; value: string }) =>
        detail.label === "Trace" && detail.value === "trace_target_capability",
    ),
  );
  assert.ok(
    state.delegation?.details.some(
      (detail: { label: string; value: string }) =>
        detail.label === "Proof alignment" &&
        detail.value === "target capability shares returned trace/audit; selected-agent proof not returned",
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
  assert.ok(
    state.proof?.details.some(
      (detail: { label: string; value: string }) =>
        detail.label === "Recommendation proof alignment" && detail.value === "not returned",
    ),
  );

  const exported = JSON.parse(
    exportNapoleonResponseProofJson(state, {
      generatedAt: "2026-06-13T00:00:00.000Z",
      conversationId: "conv_target_capability",
    }),
  ) as { responseProof: { handledBy: string; attributionBoundary: string; targetCapability: string; selectedAgents: string[] } };

  assert.equal(exported.responseProof.handledBy, "napoleon.chief_of_staff");
  assert.equal(exported.responseProof.attributionBoundary, "Returned bridge provenance only; not local authority.");
  assert.equal(exported.responseProof.targetCapability, "napoleon.chief_of_staff");
  assert.deepEqual(exported.responseProof.selectedAgents, []);
});

test("non-live response presentation clears stale delegation and proof together", () => {
  const state = clearNapoleonResponsePresentation();

  assert.equal(state.delegation, null);
  assert.equal(state.proof, null);
});

test("exports last successful Napoleon response proof without raw text endpoint or secrets", () => {
  const contract = buildTextTurnContract({
    message: "Summarize the bridge rollout",
    profile: "child_protected",
    conversationId: "conv_response_export",
    turnId: "turn_response_export",
    traceId: "trace_response_export",
    governanceOutcome: "requires_review",
  });
  const state = buildSuccessfulNapoleonResponsePresentation({
    text: "Napoleon recommends keeping the rollout in review. Passive Brain found bridge rollout context.",
    profileMode: "child_protected_user",
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
      handledBy: string;
      attributionBoundary: string;
      recommendation: string;
      governance: string;
      profileMode: string;
      traceId: string;
      auditId: string;
      selectedAgents: string[];
      selectedAgentReasons: string[];
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
  assert.equal(proof.responseProof.handledBy, "Passive Brain");
  assert.equal(proof.responseProof.attributionBoundary, "Returned bridge provenance only; not local authority.");
  assert.equal(proof.responseProof.recommendation, "keeping the rollout in review");
  assert.equal(proof.responseProof.traceId, "trace_response_export");
  assert.equal(proof.responseProof.governance, "requires_review");
  assert.equal(proof.responseProof.profileMode, "child_protected_user");
  assert.deepEqual(proof.responseProof.selectedAgents, ["Passive Brain"]);
  assert.deepEqual(proof.responseProof.selectedAgentReasons, [
    "Passive Brain: Prior bridge rollout context is relevant.",
  ]);
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

test("exports selected-agent proof arrays from returned provenance instead of display strings", () => {
  const contract = buildTextTurnContract({
    message: "Summarize the bridge rollout",
    profile: "adult_owner",
    conversationId: "conv_response_export_multi_agent",
    turnId: "turn_response_export_multi_agent",
    traceId: "trace_response_export_multi_agent",
    governanceOutcome: "requires_review",
  });
  const state = buildSuccessfulNapoleonResponsePresentation({
    text: "Passive Brain and Evaluator reviewed the rollout evidence.",
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
          selectionReason: "Prior bridge context is relevant.",
          contributionSummary: "bridge context",
        },
        {
          agentId: "evaluator",
          displayName: "Evaluator",
          selectionReason: "Runtime evidence should be checked.",
          contributionSummary: "runtime evidence",
        },
      ],
      allowedEffects: ["prepare_advisory_response"],
      blockedEffects: ["memory_write", "external_send", "agent_dispatch"],
      governanceState: "requires_review",
      traceId: "trace_response_export_multi_agent",
      auditId: contract.auditEnvelope.audit_id,
    },
  });

  const json = exportNapoleonResponseProofJson(state, {
    generatedAt: "2026-06-13T00:00:00.000Z",
    conversationId: "conv_response_export_multi_agent",
  });
  const proof = JSON.parse(json) as {
    responseProof: {
      selectedAgents: string[];
      selectedAgentReasons: string[];
      allowedEffects: string[];
      blockedEffects: string[];
    };
  };

  assert.deepEqual(proof.responseProof.selectedAgents, ["Passive Brain", "Evaluator"]);
  assert.deepEqual(proof.responseProof.selectedAgentReasons, [
    "Passive Brain: Prior bridge context is relevant.",
    "Evaluator: Runtime evidence should be checked.",
  ]);
  assert.deepEqual(proof.responseProof.allowedEffects, ["prepare_advisory_response"]);
  assert.deepEqual(proof.responseProof.blockedEffects, ["memory_write", "external_send", "agent_dispatch"]);
});

test("redacts unsafe returned provenance before exporting Napoleon response proof", () => {
  const contract = buildTextTurnContract({
    message: "Summarize the bridge rollout",
    profile: "adult_owner",
    conversationId: "conv_response_export_redaction",
    turnId: "turn_response_export_redaction",
    traceId: "trace_response_export_redaction",
    governanceOutcome: "requires_review",
  });
  const state = buildSuccessfulNapoleonResponsePresentation({
    text: "Napoleon returned sanitized response text.",
    profileMode: "Bearer local-secret-token" as "adult_owner",
    governanceDecision: {
      ...contract.governanceDecision,
      outcome: "http://127.0.0.1:8787/governance" as "requires_review",
    },
    traceEnvelope: contract.traceEnvelope,
    auditEnvelope: contract.auditEnvelope,
    requiresReview: true,
    targetAgent: "http://127.0.0.1:8787/v1/concierge/turn",
    delegation: {
      selectedAgents: [
        {
          agentId: "unsafe_agent",
          displayName: "Bearer local-secret-token",
          selectionReason: "Use http://127.0.0.1:8787 with Authorization bearer local-secret-token.",
          contributionSummary: "unsafe provenance",
        },
      ],
      allowedEffects: ["prepare_advisory_response", "Bearer local-secret-token"],
      blockedEffects: ["memory_write", "http://127.0.0.1:8787/private"],
      governanceState: "requires_review",
      traceId: "trace_response_export_redaction",
      auditId: contract.auditEnvelope.audit_id,
    },
    recommendationProvenance: {
      summary: "Review http://127.0.0.1:8787/private with bearer local-secret-token.",
      traceId: "trace_response_export_redaction",
      auditId: contract.auditEnvelope.audit_id,
    },
  });

  const json = exportNapoleonResponseProofJson(state, {
    generatedAt: "2026-06-13T00:00:00.000Z",
    conversationId: "conv_response_export_redaction",
  });
  const proof = JSON.parse(json) as {
    responseProof: {
      handledBy: string;
      targetCapability: string;
      recommendation: string;
      governance: string;
      profileMode: string;
      selectedAgents: string[];
      selectedAgentReasons: string[];
      allowedEffects: string[];
      blockedEffects: string[];
    };
  };

  assert.equal(json.includes("127.0.0.1"), false);
  assert.equal(json.toLocaleLowerCase().includes("local-secret-token"), false);
  assert.equal(json.toLocaleLowerCase().includes("bearer"), false);
  assert.equal(proof.responseProof.handledBy, "redacted");
  assert.equal(proof.responseProof.targetCapability, "redacted");
  assert.equal(proof.responseProof.recommendation, "redacted");
  assert.equal(proof.responseProof.governance, "redacted");
  assert.equal(proof.responseProof.profileMode, "redacted");
  assert.deepEqual(proof.responseProof.selectedAgents, ["redacted"]);
  assert.deepEqual(proof.responseProof.selectedAgentReasons, ["redacted"]);
  assert.deepEqual(proof.responseProof.allowedEffects, ["prepare_advisory_response", "redacted"]);
  assert.deepEqual(proof.responseProof.blockedEffects, ["memory_write", "redacted"]);
});

test("compares sanitized Napoleon response proof exports", () => {
  const previous = responseProofJson({
    traceId: "trace_previous",
    governanceOutcome: "requires_review",
    agentName: "Passive Brain",
    selectionReason: "Prior deployment context was relevant.",
    blockedEffects: ["memory_write", "external_send"],
  });
  const current = responseProofJson({
    traceId: "trace_current",
    governanceOutcome: "allow_prepare_only",
    agentName: "Planner",
    selectionReason: "Planning context was relevant.",
    blockedEffects: ["memory_write", "agent_dispatch"],
  });

  const comparison = compareNapoleonResponseProofs(previous, current);

  assert.equal(comparison.status, "changed");
  assert.ok(comparison.summary.includes("changed"));
  assert.ok(comparison.changes.some((change: { label: string }) => change.label === "Handled by"));
  assert.ok(comparison.changes.some((change: { label: string }) => change.label === "Governance"));
  assert.ok(comparison.changes.some((change: { label: string }) => change.label === "Selected agents"));
  assert.ok(comparison.changes.some((change: { label: string }) => change.label === "Why selected"));
  assert.ok(comparison.changes.some((change: { label: string }) => change.label === "Blocked effects"));
  assert.ok(
    comparison.changes.every(
      (change: { current: string }) => !change.current.includes("Summarize the bridge rollout"),
    ),
  );
});

test("compares Napoleon response proof attribution boundary changes", () => {
  const current = responseProofJson({ traceId: "trace_current_boundary" });
  const previousWithoutBoundary = JSON.stringify({
    kind: "concierge_napoleon_response_proof",
    version: 1,
    generatedAt: "2026-06-13T00:00:00.000Z",
    responseProof: {
      status: "verified",
      heading: "Last successful Napoleon proof",
      handledBy: "Passive Brain",
      governance: "requires_review",
      profileMode: "adult_owner",
      decisionId: "decision_previous_boundary",
      traceId: "trace_previous_boundary",
      auditId: "audit_previous_boundary",
      targetCapability: "unavailable",
      selectedAgents: ["Passive Brain"],
      selectedAgentReasons: ["Passive Brain: Relevant context was returned."],
      allowedEffects: ["prepare_advisory_response"],
      blockedEffects: ["memory_write", "external_send"],
    },
    boundary: {
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      localApplicationPerformed: false,
    },
  });

  const comparison = compareNapoleonResponseProofs(previousWithoutBoundary, current);

  assert.equal(comparison.status, "changed");
  assert.ok(comparison.changes.some((change: { label: string }) => change.label === "Attribution boundary"));
});

test("compares Napoleon response proof recommendation provenance changes", () => {
  const previous = JSON.parse(responseProofJson({ traceId: "trace_previous_recommendation" })) as {
    responseProof: { recommendation?: string };
  };
  const current = JSON.parse(responseProofJson({ traceId: "trace_current_recommendation" })) as {
    responseProof: { recommendation?: string };
  };
  previous.responseProof.recommendation = "keeping the rollout in review";
  current.responseProof.recommendation = "preparing the bridge rollout plan for review";

  const comparison = compareNapoleonResponseProofs(JSON.stringify(previous), JSON.stringify(current));

  assert.equal(comparison.status, "changed");
  assert.ok(comparison.changes.some((change: { label: string }) => change.label === "Napoleon recommendation"));
});

test("labels redacted or unavailable Napoleon proof comparison values as metadata state", () => {
  const previous = JSON.parse(responseProofJson({ traceId: "trace_previous_redacted_comparison" })) as {
    responseProof: {
      recommendation?: string;
      selectedAgents?: string[];
      selectedAgentReasons?: string[];
      traceId?: string;
    };
  };
  const current = JSON.parse(responseProofJson({ traceId: "trace_current_redacted_comparison" })) as {
    responseProof: {
      recommendation?: string;
      selectedAgents?: string[];
      selectedAgentReasons?: string[];
      traceId?: string;
    };
  };
  previous.responseProof.recommendation = "unavailable";
  previous.responseProof.selectedAgents = [];
  previous.responseProof.selectedAgentReasons = [];
  current.responseProof.recommendation = "redacted";
  current.responseProof.selectedAgents = ["redacted"];
  current.responseProof.selectedAgentReasons = ["redacted"];
  current.responseProof.traceId = "unavailable";

  const comparison = compareNapoleonResponseProofs(JSON.stringify(previous), JSON.stringify(current));
  const serialized = JSON.stringify(comparison).toLocaleLowerCase();

  assert.equal(comparison.status, "changed");
  assert.equal(serialized.includes("\"redacted\""), false);
  assert.equal(serialized.includes("\"unavailable\""), false);
  assert.ok(comparison.summary.includes("trace unavailable metadata"));
  assert.ok(
    comparison.changes.some(
      (change: { label: string; previous: string; current: string }) =>
        change.label === "Napoleon recommendation" &&
        change.previous === "unavailable metadata" &&
        change.current === "redacted metadata",
    ),
  );
  assert.ok(
    comparison.changes.some(
      (change: { label: string; current: string }) =>
        change.label === "Selected agents" && change.current === "redacted metadata",
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

test("rejects Napoleon response proof comparison input containing snake_case raw fields", () => {
  const current = responseProofJson({ traceId: "trace_current_snake_case_raw" });
  const unsafe = compareNapoleonResponseProofs(
    JSON.stringify({
      kind: "concierge_napoleon_response_proof",
      responseProof: { response_text: "raw response text", request_body: { bearer_token: "secret" } },
    }),
    current,
  );

  assert.equal(unsafe.status, "invalid_previous");
  assert.equal(JSON.stringify(unsafe).includes("raw response text"), false);
  assert.equal(JSON.stringify(unsafe).includes("secret"), false);
});

test("rejects Napoleon response proof comparison input containing endpoint or secret values", () => {
  const current = responseProofJson({ traceId: "trace_current" });
  const previousWithEndpointValue = JSON.stringify({
    kind: "concierge_napoleon_response_proof",
    responseProof: {
      status: "verified",
      handledBy: "http://127.0.0.1:8787/v1/concierge/turn",
      governance: "requires_review",
    },
  });
  const currentWithSecretValue = JSON.stringify({
    kind: "concierge_napoleon_response_proof",
    responseProof: {
      status: "verified",
      handledBy: "Passive Brain",
      governance: "requires_review",
      blockedEffects: ["Bearer local-secret-token"],
    },
  });

  const previousComparison = compareNapoleonResponseProofs(previousWithEndpointValue, current);
  const currentComparison = compareNapoleonResponseProofs(current, currentWithSecretValue);

  assert.equal(previousComparison.status, "invalid_previous");
  assert.equal(currentComparison.status, "invalid_current");
  assert.equal(JSON.stringify(previousComparison).includes("127.0.0.1"), false);
  assert.equal(JSON.stringify(currentComparison).includes("local-secret-token"), false);
});
