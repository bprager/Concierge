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
  describeGovernedReviewResponse,
  describeGovernanceDecision,
  describeGovernanceReview,
  describeLiveBridgeReadiness,
  describeLiveVoiceReadiness,
  describeLiveSendPreflight,
  describeMemoryProposalReview,
  describeNapoleonTranscriptMetadata,
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
  const view = describeDelegation(
    {
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
    },
    "napoleon.chief_of_staff",
  );

  assert.equal(view.heading, "Napoleon delegation");
  assert.ok(view.body.includes("Passive Brain found Found the previous deployment risk note."));
  assert.ok(view.details.some((detail) => detail.label === "Target capability" && detail.value === "napoleon.chief_of_staff"));
  assert.ok(view.details.some((detail) => detail.label === "Selected agents" && detail.value.includes("Passive Brain")));
  assert.ok(view.details.some((detail) => detail.label === "Why selected" && detail.value.includes("Relevant deployment history")));
  assert.ok(view.details.some((detail) => detail.label === "Blocked effects" && detail.value.includes("memory_write")));
  assert.ok(
    view.details.some(
      (detail) =>
        detail.label === "Proof alignment" &&
        detail.value === "same returned trace/audit as Napoleon response proof; not imported readiness proof",
    ),
  );

  const empty = describeDelegation(undefined);

  assert.equal(empty.heading, "Napoleon delegation");
  assert.ok(empty.body.includes("No Napoleon delegation provenance was returned"));
  assert.ok(!empty.body.includes("Napoleon recommends"));
  assert.ok(!empty.body.includes("Passive Brain found"));
  assert.ok(empty.details.some((detail) => detail.label === "Target capability" && detail.value === "not returned"));
  assert.ok(empty.details.some((detail) => detail.label === "Selected agents" && detail.value === "not returned"));
  assert.ok(empty.details.some((detail) => detail.label === "Why selected" && detail.value === "not returned"));
  assert.ok(empty.details.some((detail) => detail.label === "Allowed effects" && detail.value === "not returned"));
  assert.ok(empty.details.some((detail) => detail.label === "Blocked effects" && detail.value === "not returned"));
  assert.ok(empty.details.some((detail) => detail.label === "Governance state" && detail.value === "not returned"));
  assert.ok(empty.details.some((detail) => detail.label === "Trace" && detail.value === "not returned"));
  assert.ok(empty.details.some((detail) => detail.label === "Audit" && detail.value === "not returned"));
  assert.ok(empty.details.some((detail) => detail.label === "Proof alignment" && detail.value === "not returned"));
});

test("redacts unsafe returned provenance from visible Napoleon delegation and proof views", () => {
  const contract = buildTextTurnContract({
    message: "Summarize the deployment risk",
    profile: "adult_owner",
    conversationId: "conv_visible_redaction",
    turnId: "turn_visible_redaction",
    traceId: "trace_visible_redaction",
  });
  const delegation = {
    selectedAgents: [
      {
        agentId: "napoleon.passive_brain",
        displayName: "Bearer local-secret-token",
        selectionReason: "Use http://127.0.0.1:8787 with Authorization bearer local-secret-token.",
        contributionSummary: "http://127.0.0.1:8787/private",
      },
    ],
    allowedEffects: ["prepare_advisory_response", "Bearer local-secret-token"],
    blockedEffects: ["memory_write", "http://127.0.0.1:8787/private"],
    governanceState: "requires_review",
    traceId: "trace_visible_redaction",
    auditId: contract.auditEnvelope.audit_id,
  };

  const delegationView = describeDelegation(delegation, "http://127.0.0.1:8787/v1/concierge/turn");
  const proofView = describeNapoleonResponseProof({
    text: "Napoleon returned sanitized response text.",
    profileMode: "adult_owner",
    governanceDecision: {
      ...contract.governanceDecision,
      decision_id: "Bearer local-secret-token",
    },
    traceEnvelope: {
      ...contract.traceEnvelope,
      trace_id: "http://127.0.0.1:8787/trace",
    },
    auditEnvelope: {
      ...contract.auditEnvelope,
      audit_id: "http://127.0.0.1:8787/audit",
    },
    requiresReview: true,
    targetAgent: "http://127.0.0.1:8787/v1/concierge/turn",
    delegation,
    recommendationProvenance: {
      summary: "Review http://127.0.0.1:8787/private with bearer local-secret-token.",
      traceId: "trace_visible_redaction",
      auditId: contract.auditEnvelope.audit_id,
    },
  });
  const visibleText = JSON.stringify({ delegationView, proofView }).toLocaleLowerCase();

  assert.equal(visibleText.includes("127.0.0.1"), false);
  assert.equal(visibleText.includes("local-secret-token"), false);
  assert.equal(visibleText.includes("bearer"), false);
  assert.ok(delegationView.details.some((detail) => detail.label === "Target capability" && detail.value === "redacted"));
  assert.ok(proofView.details.some((detail) => detail.label === "Napoleon recommendation" && detail.value === "redacted"));
  assert.ok(proofView.details.some((detail) => detail.label === "Decision" && detail.value === "redacted"));
  assert.ok(proofView.details.some((detail) => detail.label === "Trace" && detail.value === "redacted"));
  assert.ok(proofView.details.some((detail) => detail.label === "Audit" && detail.value === "redacted"));
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
    profileMode: "child_protected_user",
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
  assert.ok(view.details.some((detail: { label: string; value: string }) => detail.label === "Profile mode" && detail.value === "child_protected_user"));
  assert.ok(view.details.some((detail: { label: string; value: string }) => detail.label === "Trace" && detail.value === "trace_proof"));
  assert.ok(view.details.some((detail: { label: string; value: string }) => detail.label === "Blocked effects" && detail.value.includes("memory_write")));
});

test("describes transcript metadata with returned target capability provenance", () => {
  const contract = buildTextTurnContract({
    message: "Summarize the bridge readiness",
    profile: "adult_owner",
    conversationId: "conv_transcript_capability",
    turnId: "turn_transcript_capability",
    traceId: "trace_transcript_capability",
    governanceOutcome: "requires_review",
  });

  const metadata = describeNapoleonTranscriptMetadata({
    text: "Napoleon prepared a bridge readiness summary.",
    profileMode: "adult_owner",
    governanceDecision: contract.governanceDecision,
    traceEnvelope: contract.traceEnvelope,
    auditEnvelope: contract.auditEnvelope,
    requiresReview: true,
    targetAgent: "napoleon.chief_of_staff",
  });

  assert.equal(metadata.source, "Napoleon governed bridge");
  assert.equal(metadata.attributionBoundary, "Returned bridge provenance only; not local authority.");
  assert.equal(metadata.targetCapability, "napoleon.chief_of_staff");
  assert.equal(metadata.governanceOutcome, "requires_review");
  assert.equal(metadata.decisionId, contract.governanceDecision.decision_id);
  assert.equal(metadata.auditId, contract.auditEnvelope.audit_id);
  assert.deepEqual(metadata.blockedEffects, contract.governanceDecision.blocked_effects);
});

test("redacts unsafe returned provenance from visible transcript metadata", () => {
  const contract = buildTextTurnContract({
    message: "Summarize the bridge readiness",
    profile: "adult_owner",
    conversationId: "conv_transcript_redaction",
    turnId: "turn_transcript_redaction",
    traceId: "trace_transcript_redaction",
    governanceOutcome: "requires_review",
  });

  const metadata = describeNapoleonTranscriptMetadata({
    text: "Napoleon prepared a bridge readiness summary.",
    profileMode: "adult_owner",
    governanceDecision: {
      ...contract.governanceDecision,
      decision_id: "Bearer local-secret-token",
      blocked_effects: ["memory_write", "http://127.0.0.1:8787/private", "Bearer local-secret-token"],
    },
    traceEnvelope: contract.traceEnvelope,
    auditEnvelope: {
      ...contract.auditEnvelope,
      audit_id: "http://127.0.0.1:8787/audit",
    },
    requiresReview: true,
    targetAgent: "http://127.0.0.1:8787/v1/concierge/turn",
  });
  const visibleText = JSON.stringify(metadata).toLocaleLowerCase();

  assert.equal(visibleText.includes("127.0.0.1"), false);
  assert.equal(visibleText.includes("local-secret-token"), false);
  assert.equal(visibleText.includes("bearer"), false);
  assert.equal(metadata.targetCapability, "redacted");
  assert.equal(metadata.decisionId, "redacted");
  assert.equal(metadata.auditId, "redacted");
  assert.deepEqual(metadata.blockedEffects, ["memory_write", "redacted", "redacted"]);
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
  assert.deepEqual(view.promotionBlockers.slice(0, 3), [
    "Configure a Napoleon endpoint.",
    "Run real Napoleon bridge evidence capture and comparison.",
    "Pass evaluator HTTP mode against Napoleon.",
  ]);
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
    runtimeValidationSource: "real_runtime",
    evaluatorValidationStatus: "passed",
    lastEvidenceStatus: "success",
    lastEvidenceOperationId: "text_turn",
    lastEvidenceTargetPath: "/v1/concierge/turn",
  });

  assert.equal(view.status, "ready");
  assert.equal(view.canSendLive, true);
  assert.ok(view.summary.includes("ready for a governed live text turn"));
  assert.ok(view.details.some((detail) => detail.label === "Descriptor" && detail.value.includes("ready")));
  assert.ok(view.details.some((detail) => detail.label === "Checksum" && detail.value === "matched"));
  assert.ok(view.details.some((detail) => detail.label === "Evidence comparison" && detail.value.includes("Passed")));
  assert.ok(view.details.some((detail) => detail.label === "Runtime validation" && detail.value === "Real Napoleon runtime"));
  assert.ok(
    view.details.some(
      (detail) => detail.label === "Last real-runtime proof" && detail.value === "success: text_turn at /v1/concierge/turn",
    ),
  );
  assert.ok(view.details.some((detail) => detail.label === "Promotion gate" && detail.value === "real runtime evidence available"));
  assert.deepEqual(view.promotionBlockers, []);
  assert.ok(view.caveat.includes("does not grant memory writes"));
});

test("describes local harness bridge readiness as validation warning only", () => {
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
    runtimeValidationSource: "local_harness",
  });

  assert.equal(view.status, "warning");
  assert.equal(view.canSendLive, true);
  assert.ok(view.summary.includes("real Napoleon runtime validation has not been proven"));
  assert.ok(
    view.details.some(
      (detail) =>
        detail.label === "Runtime validation" &&
        detail.value === "Local harness only; not real Napoleon runtime validation",
    ),
  );
  assert.ok(
    view.details.some(
      (detail) =>
        detail.label === "Promotion gate" &&
        detail.value === "blocked until real Napoleon runtime evidence passes",
    ),
  );
});

test("describes missing evaluator HTTP as a real-runtime promotion blocker", () => {
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
    runtimeValidationSource: "real_runtime",
  });

  assert.equal(view.status, "warning");
  assert.equal(view.canSendLive, true);
  assert.ok(view.summary.includes("evaluator HTTP mode has not passed"));
  assert.ok(
    view.details.some(
      (detail) => detail.label === "Evaluator HTTP" && detail.value === "not run",
    ),
  );
  assert.ok(
    view.details.some(
      (detail) =>
        detail.label === "Promotion gate" &&
        detail.value === "blocked until evaluator HTTP mode passes",
    ),
  );
});

test("describes missing runtime source as unproven bridge readiness", () => {
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

  assert.equal(view.status, "warning");
  assert.equal(view.canSendLive, true);
  assert.ok(view.summary.includes("real Napoleon runtime validation has not been proven"));
  assert.ok(
    view.details.some(
      (detail) => detail.label === "Runtime validation" && detail.value === "Runtime validation source unavailable",
    ),
  );
  assert.ok(
    view.details.some(
      (detail) =>
        detail.label === "Promotion gate" &&
        detail.value === "blocked until real Napoleon runtime evidence passes",
    ),
  );
});

test("describes missing evaluator route as a real-runtime promotion blocker", () => {
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
    runtimeValidationSource: "real_runtime",
    evaluatorValidationStatus: "failed",
    evaluatorFailureReason: "http_evaluator_route_not_found",
    evaluatorTargetPath: "/chief-of-staff/reviews/evaluation",
  });

  assert.equal(view.status, "warning");
  assert.equal(view.canSendLive, true);
  assert.ok(view.summary.includes("evaluator route is not available"));
  assert.ok(
    view.details.some(
      (detail) =>
        detail.label === "Evaluator HTTP" &&
        detail.value === "failed: http_evaluator_route_not_found",
    ),
  );
  assert.ok(
    view.details.some(
      (detail) =>
        detail.label === "Evaluator target" &&
        detail.value === "/chief-of-staff/reviews/evaluation",
    ),
  );
  assert.ok(
    view.details.some(
      (detail) =>
        detail.label === "Promotion gate" &&
        detail.value === "blocked until evaluator HTTP mode passes",
    ),
  );
});

test("describes live bridge readiness as blocked when descriptor lacks text-turn route", () => {
  const view = describeLiveBridgeReadiness({
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: true,
      descriptor: {
        ...defaultChiefOfStaffDescriptor,
        supportedHandoffs: ["memory_proposal_review"],
      },
      expectedChecksum: "sha256:contract",
      actualChecksum: "sha256:contract",
      signatureValid: true,
    }),
    evidenceCaptureState: "passed",
    evidenceComparisonState: "passed",
    runtimeValidationSource: "real_runtime",
    evaluatorValidationStatus: "passed",
  });

  assert.equal(view.status, "blocked");
  assert.equal(view.canSendLive, false);
  assert.ok(view.summary.includes("does not advertise text_turn"));
  assert.ok(view.details.some((detail) => detail.label === "Text-turn route" && detail.value === "blocked"));
  assert.ok(view.details.some((detail) => detail.label === "Live send" && detail.value === "blocked"));
});

test("describes live voice readiness as blocked until the governed voice pipeline exists", () => {
  const view = describeLiveVoiceReadiness({
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: true,
      descriptor: defaultChiefOfStaffDescriptor,
      expectedChecksum: "sha256:contract",
      actualChecksum: "sha256:contract",
      signatureValid: true,
    }),
    microphoneEnabled: true,
    microphonePermissionStatus: "granted",
    evidenceCaptureState: "passed",
    evidenceComparisonState: "passed",
    runtimeValidationSource: "real_runtime",
    rehearsalMode: false,
  });

  assert.equal(view.status, "blocked");
  assert.equal(view.canStartLiveVoice, false);
  assert.ok(view.summary.includes("voice pipeline is not implemented"));
  assert.ok(view.caveat.includes("not Napoleon approval"));
  assert.ok(view.blockedEffects.includes("microphone_capture"));
  assert.ok(view.blockedEffects.includes("audio_playback"));
  assert.ok(view.items.some((item: { label: string; status: string }) => item.label === "Microphone permission" && item.status === "ready"));
  assert.ok(view.items.some((item: { label: string; status: string }) => item.label === "Descriptor preflight" && item.status === "ready"));
  assert.ok(view.items.some((item: { label: string; status: string }) => item.label === "Voice pipeline" && item.status === "blocked"));
});

test("describes missing real runtime proof as a live voice blocker", () => {
  const view = describeLiveVoiceReadiness({
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: true,
      descriptor: defaultChiefOfStaffDescriptor,
      expectedChecksum: "sha256:contract",
      actualChecksum: "sha256:contract",
      signatureValid: true,
    }),
    microphoneEnabled: true,
    microphonePermissionStatus: "granted",
    evidenceCaptureState: "passed",
    evidenceComparisonState: "passed",
    runtimeValidationSource: "local_harness",
    rehearsalMode: false,
  });

  assert.equal(view.status, "blocked");
  assert.equal(view.canStartLiveVoice, false);
  assert.ok(view.items.some((item: { label: string; status: string }) => item.label === "Runtime proof" && item.status === "blocked"));
  assert.ok(view.items.some((item: { label: string; detail: string }) => item.label === "Runtime proof" && item.detail.includes("not available")));
});

test("describes accepted real runtime proof in live voice readiness without starting voice", () => {
  const view = describeLiveVoiceReadiness({
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: true,
      descriptor: defaultChiefOfStaffDescriptor,
      expectedChecksum: "sha256:contract",
      actualChecksum: "sha256:contract",
      signatureValid: true,
    }),
    microphoneEnabled: true,
    microphonePermissionStatus: "granted",
    evidenceCaptureState: "not_run",
    evidenceComparisonState: "not_run",
    runtimeValidationSource: "local_harness",
    rehearsalMode: false,
    acceptedRealRuntimeProof: {
      status: "success",
      operationId: "text_turn",
      targetPath: "/v1/concierge/turn",
      promotionGate: "real_runtime_evidence_available",
    },
  });

  assert.equal(view.status, "blocked");
  assert.equal(view.canStartLiveVoice, false);
  assert.ok(
    view.items.some(
      (item: { label: string; status: string; detail: string }) =>
        item.label === "Runtime proof" &&
        item.status === "ready" &&
        item.detail === "Accepted real-runtime proof: success: text_turn at /v1/concierge/turn.",
    ),
  );
  assert.ok(view.items.some((item: { label: string; status: string }) => item.label === "Voice pipeline" && item.status === "blocked"));
});

test("describes missing runtime source as a live voice blocker", () => {
  const view = describeLiveVoiceReadiness({
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: true,
      descriptor: defaultChiefOfStaffDescriptor,
      expectedChecksum: "sha256:contract",
      actualChecksum: "sha256:contract",
      signatureValid: true,
    }),
    microphoneEnabled: true,
    microphonePermissionStatus: "granted",
    evidenceCaptureState: "passed",
    evidenceComparisonState: "passed",
    rehearsalMode: false,
  });

  assert.equal(view.status, "blocked");
  assert.equal(view.canStartLiveVoice, false);
  assert.ok(view.items.some((item: { label: string; status: string }) => item.label === "Runtime proof" && item.status === "blocked"));
  assert.ok(view.items.some((item: { label: string; detail: string }) => item.label === "Runtime proof" && item.detail.includes("not available")));
});

test("describes child protected live voice readiness with guardian approval blocked", () => {
  const view = describeLiveVoiceReadiness({
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: true,
      descriptor: defaultChiefOfStaffDescriptor,
      expectedChecksum: "sha256:contract",
      actualChecksum: "sha256:contract",
      signatureValid: true,
    }),
    microphoneEnabled: true,
    microphonePermissionStatus: "granted",
    evidenceCaptureState: "passed",
    evidenceComparisonState: "passed",
    runtimeValidationSource: "real_runtime",
    rehearsalMode: false,
    profileMode: "child_protected_user",
  });

  assert.equal(view.status, "blocked");
  assert.ok(view.blockedEffects.includes("guardian_approval_capture"));
  assert.ok(view.caveat.includes("guardian approval"));
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

test("describes descriptor auth failure as fail-closed readiness", () => {
  const view = describeLiveBridgeReadiness({
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: true,
      descriptor: null,
      failClosedReason: "auth_failure",
    }),
    evidenceCaptureState: "not_run",
    evidenceComparisonState: "not_run",
  });

  assert.equal(view.status, "blocked");
  assert.equal(view.canSendLive, false);
  assert.ok(view.summary.includes("failed authentication"));
  assert.ok(view.details.some((detail) => detail.label === "Descriptor" && detail.value.includes("auth_failure")));
});

test("describes stale descriptor cache as a visible live send preflight blocker", () => {
  const view = describeLiveSendPreflight({
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: true,
      descriptor: defaultChiefOfStaffDescriptor,
      expectedChecksum: "sha256:contract",
      actualChecksum: "sha256:contract",
      signatureValid: true,
      discoveredAt: "2026-06-16T10:00:00.000Z",
      maxAgeSeconds: 300,
      now: "2026-06-16T10:06:00.000Z",
    }),
    inputReady: true,
    governanceCanSendAdvisory: true,
    rehearsalMode: false,
    evidenceCaptureState: "passed",
    evidenceComparisonState: "passed",
    runtimeValidationSource: "real_runtime",
  });

  assert.equal(view.status, "blocked");
  assert.equal(view.canAttemptLiveSend, false);
  assert.ok(view.items.some((item) => item.label === "Descriptor discovered" && item.status === "blocked"));
  assert.ok(view.items.some((item) => item.label === "Descriptor integrity" && item.status === "blocked"));
  assert.ok(view.items.some((item) => item.detail.includes("stale")));
});

test("describes descriptor transport failures as visible live send preflight blockers", () => {
  const view = describeLiveSendPreflight({
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: true,
      descriptor: null,
      failClosedReason: "auth_failure",
    }),
    inputReady: true,
    governanceCanSendAdvisory: true,
    rehearsalMode: false,
    evidenceCaptureState: "passed",
    evidenceComparisonState: "passed",
    runtimeValidationSource: "real_runtime",
  });

  assert.equal(view.status, "blocked");
  assert.equal(view.canAttemptLiveSend, false);
  assert.ok(
    view.items.some(
      (item) =>
        item.label === "Descriptor discovered" &&
        item.status === "blocked" &&
        item.detail.includes("auth_failure"),
    ),
  );
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
  assert.equal(view.blockerSummary, "Main preflight blocker: configure a Napoleon endpoint.");
  assert.equal(view.nextStepSummary, "Next step: add the governed Napoleon endpoint in settings, then run descriptor discovery.");
  assert.ok(view.items.some((item: { label: string; status: string }) => item.label === "Text ready" && item.status === "blocked"));
  assert.ok(view.items.some((item: { label: string; status: string }) => item.label === "Endpoint configured" && item.status === "blocked"));
  assert.ok(view.items.some((item: { label: string; status: string }) => item.label === "Descriptor discovered" && item.status === "ready"));
  assert.ok(view.items.some((item: { label: string; status: string }) => item.label === "Rehearsal Mode" && item.status === "warning"));
});

test("describes local no-go governance in live send preflight", () => {
  const view = describeLiveSendPreflight({
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: true,
      descriptor: defaultChiefOfStaffDescriptor,
      expectedChecksum: "sha256:contract",
      actualChecksum: "sha256:contract",
      signatureValid: true,
    }),
    inputReady: true,
    governanceCanSendAdvisory: false,
    governanceOutcome: "no_go",
    rehearsalMode: false,
  });

  assert.equal(view.status, "blocked");
  assert.equal(view.canAttemptLiveSend, false);
  assert.ok(
    view.items.some(
      (item) =>
        item.label === "Governance send gate" &&
        item.status === "blocked" &&
        item.detail.includes("no_go"),
    ),
  );
  assert.ok(
    view.items.some(
      (item) =>
        item.label === "Allowed effects" &&
        item.status === "blocked" &&
        item.detail === "none",
    ),
  );
});

test("describes blocked effects in live send preflight", () => {
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

  assert.ok(
    view.items.some(
      (item) =>
        item.label === "Blocked effects" &&
        item.status === "ready" &&
        item.detail.includes("memory_write") &&
        item.detail.includes("agent_dispatch") &&
        item.detail.includes("external_send"),
    ),
  );
});

test("describes allowed advisory effect in live send preflight", () => {
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

  assert.ok(
    view.items.some(
      (item) =>
        item.label === "Allowed effects" &&
        item.status === "ready" &&
        item.detail === "prepare_advisory_response",
    ),
  );
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
    evidenceCaptureState: "passed",
    evidenceComparisonState: "passed",
    runtimeValidationSource: "real_runtime",
    evaluatorValidationStatus: "passed",
  });

  assert.equal(view.status, "ready");
  assert.equal(view.canAttemptLiveSend, true);
  assert.ok(view.summary.includes("governed bridge attempt"));
  assert.equal(view.blockerSummary, "No live-send blockers detected from current local preflight.");
  assert.equal(view.nextStepSummary, "Next step: send through the governed Napoleon bridge when you are ready.");
  assert.ok(view.items.every((item: { status: string }) => item.status === "ready"));
  assert.ok(view.caveat.includes("does not write memory"));
  assert.ok(view.caveat.includes("does not dispatch agents"));
});

test("describes missing evaluator HTTP as a promotion warning in live send preflight", () => {
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
    evidenceCaptureState: "passed",
    evidenceComparisonState: "passed",
    runtimeValidationSource: "real_runtime",
  });

  assert.equal(view.status, "warning");
  assert.equal(view.canAttemptLiveSend, true);
  assert.ok(
    view.items.some(
      (item) =>
        item.label === "Evaluator HTTP" &&
        item.status === "warning" &&
        item.detail === "not run",
    ),
  );
  assert.ok(
    view.items.some(
      (item) =>
        item.label === "Promotion gate" &&
        item.status === "warning" &&
        item.detail.includes("blocked until evaluator HTTP mode passes"),
    ),
  );
});

test("describes rehearsal mode as not directly live-send attemptable", () => {
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
    rehearsalMode: true,
  });

  assert.equal(view.status, "warning");
  assert.equal(view.canAttemptLiveSend, false);
  assert.ok(view.summary.includes("Rehearsal Mode"));
  assert.ok(
    view.items.some(
      (item: { label: string; status: string }) => item.label === "Rehearsal Mode" && item.status === "warning",
    ),
  );
});

test("describes runtime evidence and promotion gate in live send preflight", () => {
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
    evidenceCaptureState: "not_run",
    evidenceComparisonState: "passed",
    runtimeValidationSource: "local_harness",
  });

  assert.equal(view.status, "warning");
  assert.equal(view.canAttemptLiveSend, true);
  assert.ok(view.items.some((item) => item.label === "Evidence capture" && item.status === "warning"));
  assert.ok(view.items.some((item) => item.label === "Evidence comparison" && item.status === "ready"));
  assert.ok(view.items.some((item) => item.label === "Runtime validation" && item.status === "warning"));
  assert.ok(
    view.items.some(
      (item) =>
        item.label === "Promotion gate" &&
        item.detail.includes("blocked until real Napoleon runtime evidence passes"),
    ),
  );
});

test("describes missing runtime source as unproven in live send preflight", () => {
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
    evidenceCaptureState: "passed",
    evidenceComparisonState: "passed",
  });

  assert.equal(view.status, "warning");
  assert.equal(view.canAttemptLiveSend, true);
  assert.ok(
    view.items.some(
      (item) =>
        item.label === "Runtime validation" &&
        item.status === "warning" &&
        item.detail.includes("source is unavailable"),
    ),
  );
  assert.ok(
    view.items.some(
      (item) =>
        item.label === "Promotion gate" &&
        item.detail.includes("blocked until real Napoleon runtime evidence passes"),
    ),
  );
});

test("describes accepted real-runtime proof in live send preflight", () => {
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
    evidenceCaptureState: "passed",
    evidenceComparisonState: "passed",
    runtimeValidationSource: "real_runtime",
    evaluatorValidationStatus: "passed",
    acceptedRealRuntimeProof: {
      status: "success",
      operationId: "text_turn",
      targetPath: "/v1/concierge/turn",
      promotionGate: "real_runtime_evidence_available",
    },
  });

  assert.ok(
    view.items.some(
      (item) =>
        item.label === "Accepted real-runtime proof" &&
        item.status === "ready" &&
        item.detail === "success: text_turn at /v1/concierge/turn",
    ),
  );
});

test("describes missing text-turn route as blocked in live send preflight", () => {
  const view = describeLiveSendPreflight({
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: true,
      descriptor: {
        schemaVersion: "napoleon/concierge/runtime-descriptor/v1",
        serviceId: "napoleon.chief_of_staff",
        runtimeAuthority: false,
        commandExecution: false,
        cachePolicy: "runtime_descriptor_live_response",
        blockedEffects: ["runtime_authority", "memory_write", "agent_dispatch", "external_send"],
        supportedHandoffs: ["evolution_proposal_review"],
      },
      expectedChecksum: "sha256:contract",
      actualChecksum: "sha256:contract",
      signatureValid: true,
    }),
    inputReady: true,
    governanceCanSendAdvisory: true,
    rehearsalMode: false,
    evidenceCaptureState: "passed",
    evidenceComparisonState: "passed",
    runtimeValidationSource: "real_runtime",
  });

  assert.equal(view.status, "blocked");
  assert.equal(view.canAttemptLiveSend, false);
  assert.ok(
    view.items.some(
      (item) =>
        item.label === "Text-turn route" &&
        item.status === "blocked" &&
        item.detail.includes("not advertised"),
    ),
  );
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
  assert.equal(blocked.nextStepSummary, "Next step: add the governed Napoleon endpoint in settings, then refresh descriptor discovery.");
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
  assert.equal(ready.nextStepSummary, "Next step: submit this proposal-only packet through the governed Napoleon bridge when ready.");
  assert.ok(ready.items.every((item: { status: string }) => item.status === "ready"));
});

test("describes governed handoff readiness as blocked when descriptor lacks required handoff route", () => {
  const view = describeGovernedHandoffReadiness({
    label: "Chief of Staff steering",
    descriptorConnection: buildDescriptorConnectionState({
      endpointConfigured: true,
      descriptor: {
        schemaVersion: "napoleon/concierge/runtime-descriptor/v1",
        serviceId: "napoleon.chief_of_staff",
        runtimeAuthority: false,
        commandExecution: false,
        cachePolicy: "runtime_descriptor_live_response",
        blockedEffects: ["runtime_authority", "memory_write", "agent_dispatch", "external_send"],
        supportedHandoffs: ["text_turn"],
      },
    }),
    draftReady: true,
    requiredHandoff: "evolution_proposal_review",
  });

  assert.equal(view.status, "blocked");
  assert.equal(view.canSubmit, false);
  assert.ok(
    view.items.some(
      (item: { label: string; status: string; detail: string }) =>
        item.label === "Governed handoff route" &&
        item.status === "blocked" &&
        item.detail.includes("not advertised"),
    ),
  );
});

test("describes bridge failure with blocked effects visible", () => {
  const error = new NapoleonBridgeError("governance_denied", "trace_blocked", "request_blocked", 200, [
    "external_send",
    "memory_write",
    "agent_dispatch",
    "approval_capture",
  ], {
    decisionId: "decision_blocked",
    auditId: "audit_blocked",
    governanceOutcome: "deny",
  });

  const message = describeBridgeFailure(error);

  assert.ok(message.includes("governance_denied"));
  assert.ok(message.includes("decision decision_blocked"));
  assert.ok(message.includes("audit audit_blocked"));
  assert.ok(message.includes("governance deny"));
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
  ], {
    profileMode: "child_protected_user",
  });

  const message = describeBridgeFailureTranscriptMessage(error);

  assert.ok(message.includes("bridge_timeout"));
  assert.ok(message.includes("Profile child_protected_user"));
  assert.ok(message.includes("Blocked effects: external_send, memory_write"));
  assert.ok(message.includes("did not execute anything"));
  assert.ok(message.includes("prepare-only mode"));
});

test("describes descriptor-specific bridge failure reasons", () => {
  const missingDescriptor = new NapoleonBridgeError(
    "descriptor_mismatch",
    "trace_missing_descriptor",
    "request_missing_descriptor",
    undefined,
    ["external_send"],
    {
      descriptorFailureReason: "no_descriptor",
    },
  );
  const checksumMismatch = new NapoleonBridgeError(
    "descriptor_mismatch",
    "trace_bad_descriptor",
    "request_bad_descriptor",
    undefined,
    ["external_send"],
    {
      descriptorFailureReason: "descriptor_signature_or_checksum_mismatch",
    },
  );

  const missingMessage = describeBridgeFailure(missingDescriptor);
  const checksumTranscript = describeBridgeFailureTranscriptMessage(checksumMismatch);

  assert.ok(missingMessage.includes("descriptor missing"));
  assert.ok(checksumTranscript.includes("descriptor signature/checksum mismatch"));
});

test("redacts unsafe returned provenance from bridge failure messages", () => {
  const error = new NapoleonBridgeError("governance_denied", "http://127.0.0.1:8787/trace", "Bearer local-secret-token", 200, [
    "memory_write",
    "http://127.0.0.1:8787/private",
    "Bearer local-secret-token",
  ], {
    decisionId: "http://127.0.0.1:8787/decision",
    auditId: "Bearer local-secret-token",
    governanceOutcome: "https://127.0.0.1/governance",
    profileMode: "Bearer local-secret-token",
  });

  const bridgeMessage = describeBridgeFailure(error);
  const transcriptMessage = describeBridgeFailureTranscriptMessage(error);
  const handoffMessage = describeGovernedHandoffFailure(error, "Chief of Staff steering handoff", "submit the draft");
  const visibleText = `${bridgeMessage}\n${transcriptMessage}\n${handoffMessage}`.toLocaleLowerCase();

  assert.equal(visibleText.includes("127.0.0.1"), false);
  assert.equal(visibleText.includes("local-secret-token"), false);
  assert.equal(visibleText.includes("bearer"), false);
  assert.ok(bridgeMessage.includes("Request redacted, trace redacted"));
  assert.ok(bridgeMessage.includes("decision redacted"));
  assert.ok(bridgeMessage.includes("audit redacted"));
  assert.ok(bridgeMessage.includes("profile redacted"));
  assert.ok(bridgeMessage.includes("governance redacted"));
  assert.ok(transcriptMessage.includes("Decision redacted"));
  assert.ok(transcriptMessage.includes("Audit redacted"));
  assert.ok(transcriptMessage.includes("Profile redacted"));
  assert.ok(transcriptMessage.includes("Governance redacted"));
  assert.ok(handoffMessage.includes("Request redacted, trace redacted"));
  assert.ok(handoffMessage.includes("decision redacted"));
  assert.ok(handoffMessage.includes("audit redacted"));
  assert.ok(handoffMessage.includes("profile redacted"));
  assert.ok(handoffMessage.includes("governance redacted"));
  assert.ok(bridgeMessage.includes("Blocked effects: memory_write, redacted, redacted"));
  assert.ok(transcriptMessage.includes("Blocked effects: memory_write, redacted, redacted"));
  assert.ok(handoffMessage.includes("Blocked effects: memory_write, redacted, redacted"));
  assert.ok(handoffMessage.includes("did not submit the draft"));
});

test("describes governed handoff failure with blocked effects visible", () => {
  const error = new NapoleonBridgeError("governance_no_go", "trace_handoff", "request_handoff", 200, [
    "memory_write",
    "agent_dispatch",
    "external_send",
    "approval_capture",
  ], {
    profileMode: "child_protected_user",
  });

  const message = describeGovernedHandoffFailure(
    error,
    "Chief of Staff steering handoff",
    "apply changes",
  );

  assert.ok(message.includes("Chief of Staff steering handoff blocked"));
  assert.ok(message.includes("governance_no_go"));
  assert.ok(message.includes("profile child_protected_user"));
  assert.ok(message.includes("Blocked effects: memory_write, agent_dispatch, external_send, approval_capture"));
  assert.ok(message.includes("did not apply changes"));
  assert.ok(message.includes("did not write memory"));
  assert.ok(message.includes("did not dispatch agents"));
  assert.ok(message.includes("did not send externally"));
  assert.ok(message.includes("did not capture approval"));
});

test("describes governed handoff failure with returned governance references", () => {
  const error = new NapoleonBridgeError("governance_denied", "trace_review_handoff", "request_review_handoff", 200, [
    "memory_write",
    "agent_dispatch",
    "external_send",
    "approval_capture",
  ], {
    decisionId: "decision_review_handoff",
    auditId: "audit_review_handoff",
    governanceOutcome: "deny",
    profileMode: "adult_owner",
  });

  const message = describeGovernedHandoffFailure(
    error,
    "Governance review handoff",
    "submit the review",
  );

  assert.ok(message.includes("decision decision_review_handoff"));
  assert.ok(message.includes("audit audit_review_handoff"));
  assert.ok(message.includes("governance deny"));
  assert.ok(message.includes("profile adult_owner"));
  assert.ok(message.includes("Blocked effects: memory_write, agent_dispatch, external_send, approval_capture"));
  assert.ok(message.includes("did not submit the review"));
});

test("redacts unsafe returned provenance from governed review responses", () => {
  const view = describeGovernedReviewResponse(
    {
      text: "Review stored at http://127.0.0.1:8787/private with Bearer local-secret-token",
      governanceDecision: {
        outcome: "requires_review",
        decision_id: "Bearer local-secret-token",
        authority_tier: "advisory_review",
        approval_requirement: "Napoleon Chief of Staff review",
        rationale: "See http://127.0.0.1:8787/private",
        blocked_effects: ["memory_write", "http://127.0.0.1:8787/private", "Bearer local-secret-token"],
      },
      traceEnvelope: {
        trace_id: "http://127.0.0.1:8787/trace",
      },
      auditEnvelope: {
        audit_id: "Bearer audit-secret",
      },
    },
    "not applied; no memory write; no approval captured; no agent dispatch; no external send.",
  );
  const visibleText = JSON.stringify(view).toLocaleLowerCase();

  assert.equal(visibleText.includes("127.0.0.1"), false);
  assert.equal(visibleText.includes("local-secret-token"), false);
  assert.equal(visibleText.includes("audit-secret"), false);
  assert.equal(visibleText.includes("bearer"), false);
  assert.deepEqual(view.rows, [
    { label: "Napoleon review response", value: "redacted" },
    { label: "Governance", value: "requires_review, decision redacted" },
    { label: "Authority tier", value: "advisory_review" },
    { label: "Approval requirement", value: "Napoleon Chief of Staff review" },
    { label: "Rationale", value: "redacted" },
    { label: "Trace", value: "redacted" },
    { label: "Audit", value: "redacted" },
    { label: "Blocked effects", value: "memory_write, redacted, redacted" },
    {
      label: "Local effects",
      value: "not applied; no memory write; no approval captured; no agent dispatch; no external send.",
    },
  ]);
});

test("describes descriptor-specific governed handoff failure reasons", () => {
  const error = new NapoleonBridgeError("descriptor_mismatch", "trace_descriptor_handoff", "request_descriptor_handoff", undefined, [
    "memory_write",
    "agent_dispatch",
    "external_send",
    "approval_capture",
  ], {
    descriptorFailureReason: "auth_failure",
    profileMode: "adult_owner",
  });

  const message = describeGovernedHandoffFailure(
    error,
    "Memory proposal handoff",
    "submit the proposal",
  );

  assert.ok(message.includes("Memory proposal handoff blocked"));
  assert.ok(message.includes("descriptor_mismatch"));
  assert.ok(message.includes("Descriptor: descriptor auth failure"));
  assert.ok(message.includes("profile adult_owner"));
  assert.ok(message.includes("Blocked effects: memory_write, agent_dispatch, external_send, approval_capture"));
  assert.ok(message.includes("did not submit the proposal"));
  assert.ok(message.includes("did not write memory"));
  assert.ok(message.includes("did not dispatch agents"));
  assert.ok(message.includes("did not send externally"));
  assert.ok(message.includes("did not capture approval"));
});
