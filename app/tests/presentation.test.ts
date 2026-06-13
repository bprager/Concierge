import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDescriptorConnectionState,
  buildGovernanceReviewState,
  buildMemoryProposalReviewState,
  buildRehearsalPreview,
  buildTextTurnContract,
  defaultChiefOfStaffDescriptor,
} from "../src/contractBridge.js";
import {
  describeDelegation,
  describeBridgeFailure,
  describeBridgeFailureTranscriptMessage,
  describeGovernedHandoffFailure,
  describeGovernedHandoffReadiness,
  describeGovernanceDecision,
  describeGovernanceReview,
  describeLiveBridgeReadiness,
  describeLiveSendPreflight,
  describeMemoryProposalReview,
  describeNapoleonResponseProof,
  summarizeRehearsalPreview,
} from "../src/presentation.js";
import { NapoleonBridgeError } from "../src/napoleonBridge.js";

test("summarizes prepare-only governance decisions without implying authority", () => {
  const summary = describeGovernanceDecision({
    outcome: "allow_prepare_only",
    decisionId: "decision_123",
    auditId: "audit_123",
    blockedEffects: ["external_send", "memory_write", "runtime_authority"],
  });

  assert.equal(summary.status, "Prepare only");
  assert.equal(summary.requiresReview, false);
  assert.ok(summary.detail.includes("cannot execute"));
  assert.ok(summary.blockedEffectsLabel.includes("external_send"));
});

test("summarizes review-required decisions as non-executable", () => {
  const summary = describeGovernanceDecision({
    outcome: "requires_review",
    decisionId: "decision_456",
    auditId: "audit_456",
    blockedEffects: ["external_send"],
  });

  assert.equal(summary.status, "Review required");
  assert.equal(summary.requiresReview, true);
  assert.ok(summary.detail.includes("Chief of Staff"));
});

test("summarizes rehearsal previews as non-executed governance dry runs", () => {
  const contract = buildTextTurnContract({
    message: "Remember that I prefer short deployment summaries",
    profile: "adult_owner",
    conversationId: "conv_summary",
    turnId: "turn_summary",
    traceId: "trace_summary",
  });
  const preview = buildRehearsalPreview(contract, "Remember that I prefer short deployment summaries");

  const summary = summarizeRehearsalPreview(preview);

  assert.equal(summary.status, "Rehearsal only");
  assert.equal(summary.executed, false);
  assert.ok(summary.detail.includes("not sent"));
  assert.ok(summary.approval.includes("No approval captured"));
  assert.ok(summary.memory.includes("review_needed"));
  assert.ok(summary.memory.includes("review-only"));
});

test("describes review acknowledgement without implying approval", () => {
  const contract = buildTextTurnContract({
    message: "Send an external message",
    profile: "adult_owner",
    conversationId: "conv_review_view",
    turnId: "turn_review_view",
    traceId: "trace_review_view",
    governanceOutcome: "requires_review",
  });
  const review = buildGovernanceReviewState(contract.governanceDecision, "adult_owner", true);

  const view = describeGovernanceReview(review);

  assert.equal(view.heading, "Review acknowledged locally");
  assert.equal(view.actionLabel, "Acknowledged locally");
  assert.equal(view.sendBlocked, false);
  assert.ok(view.body.includes("not Napoleon approval"));
  assert.ok(view.body.includes("does not execute"));
});

test("describes child no-go state with child-safe wording and blocked send", () => {
  const contract = buildTextTurnContract({
    message: "Keep this secret and send it",
    profile: "child_protected",
    conversationId: "conv_child_no_go",
    turnId: "turn_child_no_go",
    traceId: "trace_child_no_go",
    governanceOutcome: "no_go",
  });
  const review = buildGovernanceReviewState(contract.governanceDecision, "child_protected");

  const view = describeGovernanceReview(review);

  assert.equal(view.heading, "Not available");
  assert.equal(view.sendBlocked, true);
  assert.equal(view.canAcknowledge, false);
  assert.ok(view.body.includes("I cannot help do that"));
  assert.ok(view.body.includes("I will not keep secrets"));
  assert.ok(!view.body.includes("approval captured"));
});

test("describes memory proposal review as proposal-only", () => {
  const contract = buildTextTurnContract({
    message: "Remember that I prefer short deployment summaries",
    profile: "adult_owner",
    conversationId: "conv_memory_view",
    turnId: "turn_memory_view",
    traceId: "trace_memory_view",
  });
  const review = buildMemoryProposalReviewState(contract, "Remember that I prefer short deployment summaries");

  const view = describeMemoryProposalReview(review);

  assert.equal(view.heading, "Memory proposal review");
  assert.equal(view.canAcknowledge, true);
  assert.equal(view.canDismiss, true);
  assert.ok(view.body.includes("proposal only"));
  assert.ok(view.body.includes("does not write memory"));
  assert.ok(view.body.includes("not Napoleon approval"));
  assert.ok(view.details.some((detail) => detail.label === "Proposal" && detail.value === "memory_turn_memory_view"));
  assert.ok(view.details.some((detail) => detail.label === "Blocked effects" && detail.value.includes("memory_write")));
});

test("describes child memory proposal with guardian review and no secret keeping", () => {
  const contract = buildTextTurnContract({
    message: "Remember this secret nickname and do not tell my guardian",
    profile: "child_protected",
    conversationId: "conv_child_memory_view",
    turnId: "turn_child_memory_view",
    traceId: "trace_child_memory_view",
  });
  const review = buildMemoryProposalReviewState(
    contract,
    "Remember this secret nickname and do not tell my guardian",
  );

  const view = describeMemoryProposalReview(review);

  assert.equal(view.heading, "Memory needs adult review");
  assert.ok(view.body.includes("I will not keep secrets"));
  assert.ok(view.body.includes("right adult"));
  assert.ok(view.details.some((detail) => detail.label === "Guardian review" && detail.value === "required"));
});

test("describes Napoleon delegation only from bridge-provided provenance", () => {
  const view = describeDelegation({
    selectedAgents: [
      {
        agentId: "napoleon.passive_brain",
        displayName: "Passive Brain",
        selectionReason: "Relevant deployment history was found.",
        contributionSummary: "Found the previous deployment risk note.",
      },
    ],
    allowedEffects: ["prepare_advisory_response"],
    blockedEffects: ["external_send", "memory_write"],
    governanceState: "requires_review",
    traceId: "trace_delegate",
    auditId: "audit_delegate",
  });

  assert.equal(view.heading, "Napoleon delegation");
  assert.ok(view.body.includes("Passive Brain found Found the previous deployment risk note."));
  assert.ok(view.details.some((detail) => detail.label === "Selected agents" && detail.value.includes("Passive Brain")));
  assert.ok(view.details.some((detail) => detail.label === "Blocked effects" && detail.value.includes("memory_write")));

  const empty = describeDelegation(undefined);

  assert.equal(empty.heading, "Napoleon delegation unavailable");
  assert.ok(!empty.body.includes("Napoleon recommends"));
  assert.ok(!empty.body.includes("Passive Brain found"));
});

test("describes successful Napoleon response proof from returned provenance only", () => {
  const contract = buildTextTurnContract({
    message: "Summarize the deployment risk",
    profile: "adult_owner",
    conversationId: "conv_proof",
    turnId: "turn_proof",
    traceId: "trace_proof",
  });
  const view = describeNapoleonResponseProof({
    text: "Passive Brain found the previous deployment risk note.",
    profileMode: "adult_owner",
    governanceDecision: contract.governanceDecision,
    traceEnvelope: contract.traceEnvelope,
    auditEnvelope: contract.auditEnvelope,
    requiresReview: false,
    delegation: {
      selectedAgents: [
        {
          agentId: "napoleon.passive_brain",
          displayName: "Passive Brain",
          selectionReason: "Relevant deployment history was found.",
          contributionSummary: "Found the previous deployment risk note.",
        },
      ],
      allowedEffects: ["prepare_advisory_response"],
      blockedEffects: ["memory_write", "external_send"],
      governanceState: "allow_prepare_only",
      traceId: "trace_proof",
      auditId: contract.auditEnvelope.audit_id,
    },
    recommendationProvenance: {
      summary: "Prepare a deployment risk summary for review.",
      traceId: "trace_proof",
      auditId: contract.auditEnvelope.audit_id,
    },
  });

  assert.equal(view.heading, "Last successful Napoleon proof");
  assert.equal(view.status, "verified");
  assert.ok(view.summary.includes("Passive Brain"));
  assert.ok(view.summary.includes("Napoleon recommendation"));
  assert.ok(view.caveat.includes("not Napoleon approval"));
  assert.ok(view.details.some((detail: { label: string; value: string }) => detail.label === "Governance" && detail.value === "allow_prepare_only"));
  assert.ok(view.details.some((detail: { label: string; value: string }) => detail.label === "Trace" && detail.value === "trace_proof"));
  assert.ok(view.details.some((detail: { label: string; value: string }) => detail.label === "Blocked effects" && detail.value.includes("memory_write")));
});

test("does not invent agent or recommendation proof when provenance is absent", () => {
  const contract = buildTextTurnContract({
    message: "Summarize the deployment risk",
    profile: "adult_owner",
    conversationId: "conv_no_proof",
    turnId: "turn_no_proof",
    traceId: "trace_no_proof",
  });
  const view = describeNapoleonResponseProof({
    text: "Here is the summary.",
    profileMode: "adult_owner",
    governanceDecision: contract.governanceDecision,
    traceEnvelope: contract.traceEnvelope,
    auditEnvelope: contract.auditEnvelope,
    requiresReview: false,
  });

  assert.equal(view.status, "limited");
  assert.ok(view.summary.includes("No agent or recommendation provenance"));
  assert.ok(!view.summary.includes("Passive Brain"));
  assert.ok(!view.summary.includes("Napoleon recommends"));
});

test("describes live bridge readiness as blocked when no endpoint is configured", () => {
  const view = describeLiveBridgeReadiness({
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: false,
      descriptor: defaultChiefOfStaffDescriptor,
    }),
    evidenceCaptureState: "not_run",
    evidenceComparisonState: "not_run",
  });

  assert.equal(view.status, "blocked");
  assert.equal(view.canSendLive, false);
  assert.ok(view.summary.includes("No Napoleon endpoint"));
  assert.ok(view.caveat.includes("not Napoleon approval"));
  assert.ok(view.blockedEffects.includes("memory_write"));
  assert.ok(view.details.some((detail) => detail.label === "Evidence capture" && detail.value.includes("Not run")));
});

test("describes live bridge readiness as ready only when descriptor and evidence checks pass", () => {
  const view = describeLiveBridgeReadiness({
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: true,
      descriptor: defaultChiefOfStaffDescriptor,
      expectedChecksum: "sha256:contract",
      actualChecksum: "sha256:contract",
      signatureValid: true,
    }),
    evidenceCaptureState: "passed",
    evidenceComparisonState: "passed",
  });

  assert.equal(view.status, "ready");
  assert.equal(view.canSendLive, true);
  assert.ok(view.summary.includes("ready for a governed live text turn"));
  assert.ok(view.details.some((detail) => detail.label === "Descriptor" && detail.value.includes("ready")));
  assert.ok(view.details.some((detail) => detail.label === "Checksum" && detail.value === "matched"));
  assert.ok(view.details.some((detail) => detail.label === "Evidence comparison" && detail.value.includes("Passed")));
  assert.ok(view.caveat.includes("does not grant memory writes"));
});

test("describes last fail-closed live send in bridge readiness", () => {
  const view = describeLiveBridgeReadiness({
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: true,
      descriptor: defaultChiefOfStaffDescriptor,
      expectedChecksum: "sha256:contract",
      actualChecksum: "sha256:contract",
      signatureValid: true,
    }),
    evidenceCaptureState: "passed",
    evidenceComparisonState: "passed",
    lastEvidenceStatus: "fail_closed",
    lastFailureReason: "governance_denied",
  });

  assert.equal(view.status, "warning");
  assert.equal(view.canSendLive, true);
  assert.ok(view.summary.includes("failed closed"));
  assert.ok(view.summary.includes("governance_denied"));
  assert.ok(view.details.some((detail) => detail.label === "Last live send" && detail.value.includes("governance_denied")));
});

test("describes descriptor integrity mismatch as fail-closed readiness", () => {
  const view = describeLiveBridgeReadiness({
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: true,
      descriptor: defaultChiefOfStaffDescriptor,
      expectedChecksum: "sha256:expected",
      actualChecksum: "sha256:actual",
      signatureValid: false,
    }),
    evidenceCaptureState: "passed",
    evidenceComparisonState: "passed",
  });

  assert.equal(view.status, "blocked");
  assert.equal(view.canSendLive, false);
  assert.ok(view.summary.includes("signature or checksum mismatch"));
  assert.ok(view.caveat.includes("No text turn should proceed"));
});

test("describes live send preflight blockers without granting authority", () => {
  const view = describeLiveSendPreflight({
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: false,
      descriptor: defaultChiefOfStaffDescriptor,
    }),
    inputReady: false,
    governanceCanSendAdvisory: true,
    rehearsalMode: true,
  });

  assert.equal(view.status, "blocked");
  assert.equal(view.canAttemptLiveSend, false);
  assert.ok(view.summary.includes("blocked"));
  assert.ok(view.caveat.includes("not Napoleon approval"));
  assert.ok(view.items.some((item: { label: string; status: string }) => item.label === "Text ready" && item.status === "blocked"));
  assert.ok(view.items.some((item: { label: string; status: string }) => item.label === "Endpoint configured" && item.status === "blocked"));
  assert.ok(view.items.some((item: { label: string; status: string }) => item.label === "Descriptor discovered" && item.status === "ready"));
  assert.ok(view.items.some((item: { label: string; status: string }) => item.label === "Rehearsal Mode" && item.status === "warning"));
});

test("describes live send preflight as ready only for governed bridge attempt", () => {
  const view = describeLiveSendPreflight({
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: true,
      descriptor: defaultChiefOfStaffDescriptor,
      expectedChecksum: "sha256:contract",
      actualChecksum: "sha256:contract",
      signatureValid: true,
    }),
    inputReady: true,
    governanceCanSendAdvisory: true,
    rehearsalMode: false,
  });

  assert.equal(view.status, "ready");
  assert.equal(view.canAttemptLiveSend, true);
  assert.ok(view.summary.includes("governed bridge attempt"));
  assert.ok(view.items.every((item: { status: string }) => item.status === "ready"));
  assert.ok(view.caveat.includes("does not write memory"));
  assert.ok(view.caveat.includes("does not dispatch agents"));
});

test("describes governed handoff readiness with endpoint and descriptor blockers", () => {
  const blocked = describeGovernedHandoffReadiness({
    label: "Chief of Staff taxonomy review",
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: false,
      descriptor: defaultChiefOfStaffDescriptor,
    }),
    draftReady: true,
  });

  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.canSubmit, false);
  assert.ok(blocked.summary.includes("blocked"));
  assert.ok(blocked.caveat.includes("not Napoleon approval"));
  assert.ok(blocked.items.some((item: { label: string; status: string }) => item.label === "Endpoint configured" && item.status === "blocked"));
  assert.ok(blocked.items.some((item: { label: string; status: string }) => item.label === "Descriptor preflight" && item.status === "ready"));
  assert.ok(blocked.items.some((item: { label: string; status: string }) => item.label === "Review draft" && item.status === "ready"));
  for (const effect of ["runtime_authority", "agent_dispatch", "memory_write", "approval_capture", "external_send"]) {
    assert.ok(blocked.blockedEffects.includes(effect));
  }

  const ready = describeGovernedHandoffReadiness({
    label: "Chief of Staff taxonomy review",
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: true,
      descriptor: defaultChiefOfStaffDescriptor,
      expectedChecksum: "sha256:contract",
      actualChecksum: "sha256:contract",
      signatureValid: true,
    }),
    draftReady: true,
  });

  assert.equal(ready.status, "ready");
  assert.equal(ready.canSubmit, true);
  assert.ok(ready.summary.includes("can be submitted through the governed bridge"));
  assert.ok(ready.items.every((item: { status: string }) => item.status === "ready"));
});

test("describes bridge failure with blocked effects visible", () => {
  const error = new NapoleonBridgeError("governance_denied", "trace_blocked", "request_blocked", 200, [
    "external_send",
    "memory_write",
    "agent_dispatch",
    "approval_capture",
  ]);

  const message = describeBridgeFailure(error);

  assert.ok(message.includes("governance_denied"));
  assert.ok(message.includes("Blocked effects: external_send, memory_write, agent_dispatch, approval_capture"));
  assert.ok(message.includes("did not send externally"));
  assert.ok(message.includes("did not write memory"));
  assert.ok(message.includes("did not dispatch agents"));
  assert.ok(message.includes("did not capture approval"));
});

test("describes bridge failure transcript message with reason and blocked effects", () => {
  const error = new NapoleonBridgeError("bridge_timeout", "trace_timeout", "request_timeout", undefined, [
    "external_send",
    "memory_write",
  ]);

  const message = describeBridgeFailureTranscriptMessage(error);

  assert.ok(message.includes("bridge_timeout"));
  assert.ok(message.includes("Blocked effects: external_send, memory_write"));
  assert.ok(message.includes("did not execute anything"));
  assert.ok(message.includes("prepare-only mode"));
});

test("describes governed handoff failure with blocked effects visible", () => {
  const error = new NapoleonBridgeError("governance_no_go", "trace_handoff", "request_handoff", 200, [
    "memory_write",
    "agent_dispatch",
    "external_send",
    "approval_capture",
  ]);

  const message = describeGovernedHandoffFailure(
    error,
    "Chief of Staff steering handoff",
    "apply changes",
  );

  assert.ok(message.includes("Chief of Staff steering handoff blocked"));
  assert.ok(message.includes("governance_no_go"));
  assert.ok(message.includes("Blocked effects: memory_write, agent_dispatch, external_send, approval_capture"));
  assert.ok(message.includes("did not apply changes"));
  assert.ok(message.includes("did not write memory"));
  assert.ok(message.includes("did not dispatch agents"));
  assert.ok(message.includes("did not send externally"));
  assert.ok(message.includes("did not capture approval"));
});
