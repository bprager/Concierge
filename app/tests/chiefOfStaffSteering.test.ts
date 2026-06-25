import assert from "node:assert/strict";
import test from "node:test";
import {
  answerCapabilityQuestion,
  appendCapabilitySignal,
  buildCapabilitySignal,
  createCapabilityLedger,
  deriveCapabilitySignalFromEvent,
  exportCapabilityReviewPacket,
} from "../src/capabilityLedger.js";
import {
  draftChiefOfStaffSteering,
  submitCapabilityReviewPacket,
  submitChiefOfStaffSteeringDraft,
} from "../src/chiefOfStaffSteering.js";
import { defaultChiefOfStaffDescriptor } from "../src/contractBridge.js";
import type { TelemetryPayload } from "../src/telemetry.js";

const steeringBlockedEffects = [
  "memory_write",
  "agent_dispatch",
  "external_send",
  "approval_capture",
  "runtime_authority",
];

const readyDescriptorConnection = {
  endpointConfigured: true,
  descriptor: defaultChiefOfStaffDescriptor,
  expectedChecksum: "sha256:local-static",
  actualChecksum: "sha256:local-static",
  signatureValid: true,
};

const textTurnOnlyRuntimeDescriptorConnection = {
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

test("drafts proposal-only Chief of Staff steering from capability signals", () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_missing_bridge",
      conversationId: "conv_missing_bridge",
      turnId: "turn_missing_bridge",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "napoleon integration",
      intentLabel: "send_to_napoleon",
      capabilityLabel: "live_bridge_descriptor_discovery",
      capabilityStatus: "missing",
      outcomeSignal: "bridge_failed",
      confidence: 0.91,
      evidenceRefs: ["trace:trace_missing_bridge", "audit:audit_missing_bridge"],
      architectureArea: "bridge",
      privacyClass: "metadata_only",
      suggestedNextStep: "create_evolution_proposal",
    }),
  );

  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: false,
    profileMode: "adult_owner",
  });

  assert.equal(draft.sendState.canSendToNapoleon, false);
  assert.equal(draft.boundary.proposalOnly, true);
  assert.equal(draft.boundary.approvalCaptured, false);
  assert.equal(draft.boundary.memoryWriteAllowed, false);
  assert.equal(draft.boundary.agentDispatchAllowed, false);
  assert.equal(draft.boundary.externalSendAllowed, false);
  assert.equal(draft.handoffContext.status, "blocked");
  assert.equal(draft.handoffContext.proposalOnly, true);
  assert.equal(draft.handoffContext.blockerLabel, "Endpoint configured");
  assert.equal(draft.handoffContext.blockerDetail, "No Napoleon endpoint is configured.");
  assert.equal(
    draft.handoffContext.nextStepSummary,
    "Next step: add the governed Napoleon endpoint in settings, then refresh descriptor discovery.",
  );
  assert.ok(draft.handoffContext.blockedEffects.includes("external_send"));
  assert.equal(draft.recommendation.recommendationType, "scored_capability_recommendation");
  assert.equal(draft.recommendation.capabilityLabel, "live_bridge_descriptor_discovery");
  assert.equal(draft.recommendation.architectureArea, "bridge");
  assert.ok(draft.evaluatorCaseCandidate.expectedBehavior.includes("fail closed"));
  assert.ok(draft.evolutionProposal.summary.includes("live_bridge_descriptor_discovery"));
  assert.ok(draft.evolutionProposal.evaluator_cases.includes(draft.evaluatorCaseCandidate.caseId));
  assert.ok(draft.evolutionProposal.evidence.includes("trace:trace_missing_bridge"));
  assert.equal(draft.evolutionProposal.learning_signals.length, 1);
  assert.equal(draft.evolutionProposal.learning_signals[0].schema_version, "concierge.learning_signal.v1");
  assert.equal(draft.evolutionProposal.learning_signals[0].signal_type, "repeated_pattern");
  assert.equal(draft.evolutionProposal.learning_signals[0].capability_id, "live_bridge_descriptor_discovery");
  assert.equal(draft.evolutionProposal.learning_signals[0].architecture_area, "napoleon_bridge");
  assert.equal(draft.evolutionProposal.learning_signals[0].pattern_count, 1);
  assert.equal(draft.evolutionProposal.learning_signals[0].privacy.raw_user_text_stored, false);
  assert.equal(draft.evolutionProposal.learning_signals[0].governance_boundary.proposal_only, true);
  assert.equal(draft.evolutionProposal.learning_signals[0].governance_boundary.memory_write_performed, false);
});

test("steering draft evidence excludes correctly blocked unsafe signals with the same capability label", () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_missing_memory_review",
      conversationId: "conv_missing_memory_review",
      turnId: "turn_missing_memory_review",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "memory",
      intentLabel: "review_memory",
      capabilityLabel: "memory_review",
      capabilityStatus: "missing",
      outcomeSignal: "bridge_failed",
      confidence: 0.9,
      evidenceRefs: ["trace:trace_missing_memory_review"],
      architectureArea: "memory_review",
      privacyClass: "metadata_only",
      suggestedNextStep: "create_evolution_proposal",
    }),
  );
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_blocked_memory_write",
      conversationId: "conv_blocked_memory_write",
      turnId: "turn_blocked_memory_write",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "memory",
      intentLabel: "unsafe_memory_write",
      capabilityLabel: "memory_review",
      capabilityStatus: "blocked",
      outcomeSignal: "blocked",
      confidence: 0.95,
      evidenceRefs: ["trace:trace_blocked_memory_write"],
      architectureArea: "governance_ux",
      privacyClass: "metadata_only",
      suggestedNextStep: "no_action",
    }),
  );

  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: false,
    profileMode: "adult_owner",
  });

  assert.equal(draft.recommendation.capabilityLabel, "memory_review");
  assert.deepEqual(draft.evolutionProposal.evidence, ["trace:trace_missing_memory_review"]);
  assert.equal(draft.evolutionProposal.evidence.includes("trace:trace_blocked_memory_write"), false);
});

test("steering draft carries media session repair recommendation into proposal rationale", () => {
  const ledger = createCapabilityLedger({ now: () => new Date("2026-06-11T12:00:00.000Z") });
  appendCapabilitySignal(
    ledger,
    deriveCapabilitySignalFromEvent("media_session_readiness_summarized", {
      traceId: "trace_media_steering_repair",
      conversationId: "conv_media_steering_repair",
      turnId: "turn_media_steering_repair",
      profile: "adult_owner",
      microphoneStatus: "permission_needed",
      cameraStatus: "blocked",
      playbackStatus: "stopped",
      rawVideo: "must not be retained",
      endpoint: "https://private.example.test",
    }),
  );

  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_media_steering",
    endpointConfigured: false,
    profileMode: "adult_owner",
  });

  assert.equal(draft.recommendation.capabilityLabel, "media_session_readiness_summary");
  assert.equal(draft.recommendation.recommendationType, "guided_readiness_repair");
  assert.equal(draft.recommendation.suggestedNextStep, "needs_human_review");
  assert.ok(draft.recommendation.rationale.includes("guided Media Session readiness repair"));
  assert.ok(draft.recommendation.rationale.includes("microphone permission needed"));
  assert.ok(draft.recommendation.rationale.includes("camera blocked"));
  assert.ok(draft.evolutionProposal.summary.includes("guided Media Session readiness repair"));
  assert.equal(draft.evolutionProposal.change.requested_action, draft.recommendation.rationale);
  assert.deepEqual(draft.evolutionProposal.evidence, [
    "trace:trace_media_steering_repair",
    "event:media_session_readiness_summarized",
  ]);
  assert.equal(JSON.stringify(draft).includes("private.example.test"), false);
  assert.equal(JSON.stringify(draft).includes("must not be retained"), false);
  assert.equal(draft.boundary.proposalOnly, true);
  assert.equal(draft.boundary.memoryWriteAllowed, false);
  assert.equal(draft.boundary.agentDispatchAllowed, false);
  assert.equal(draft.boundary.externalSendAllowed, false);
});

test("steering draft carries descriptor readiness repair recommendation with evidence", () => {
  const ledger = createCapabilityLedger({ now: () => new Date("2026-06-11T12:00:00.000Z") });
  appendCapabilitySignal(
    ledger,
    deriveCapabilitySignalFromEvent("descriptor_discovery_failed", {
      traceId: "trace_stale_descriptor_steering",
      conversationId: "conv_stale_descriptor_steering",
      turnId: "turn_stale_descriptor_steering",
      profile: "adult_owner",
      state: "stale_descriptor",
      checksumState: "valid",
      signatureState: "valid",
      descriptorFreshnessState: "stale",
      canAttemptLiveBridge: false,
      failClosedReason: "stale_descriptor",
      endpoint: "https://napoleon.example.test/v1/concierge",
      bearerToken: "secret-token",
    }),
  );
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_runtime_gap_descriptor_steering",
      conversationId: "conv_runtime_gap_descriptor_steering",
      turnId: "turn_runtime_gap_descriptor_steering",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "delegation",
      intentLabel: "delegate_task",
      capabilityLabel: "napoleon_delegation",
      capabilityStatus: "missing",
      outcomeSignal: "bridge_failed",
      confidence: 0.75,
      evidenceRefs: ["trace:trace_runtime_gap_descriptor_steering"],
      architectureArea: "napoleon_runtime",
      privacyClass: "metadata_only",
      suggestedNextStep: "create_evolution_proposal",
    }),
  );

  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_descriptor_steering",
    endpointConfigured: false,
    profileMode: "adult_owner",
  });

  assert.equal(draft.recommendation.capabilityLabel, "descriptor_discovery");
  assert.equal(draft.recommendation.recommendationType, "guided_readiness_repair");
  assert.ok(draft.recommendation.rationale.includes("Refresh Napoleon descriptor discovery"));
  assert.ok(draft.recommendation.rationale.includes("descriptor freshness stale"));
  assert.ok(draft.evolutionProposal.summary.includes("Refresh Napoleon descriptor discovery"));
  assert.equal(draft.evolutionProposal.change.requested_action, draft.recommendation.rationale);
  assert.deepEqual(draft.evolutionProposal.evidence, [
    "trace:trace_stale_descriptor_steering",
    "event:descriptor_discovery_failed",
  ]);
  assert.equal(draft.evolutionProposal.learning_signals.length, 1);
  assert.equal(draft.evolutionProposal.learning_signals[0].capability_id, "descriptor_discovery");
  assert.equal(JSON.stringify(draft).includes("napoleon.example.test"), false);
  assert.equal(JSON.stringify(draft).includes("secret-token"), false);
  assert.equal(draft.boundary.proposalOnly, true);
  assert.equal(draft.boundary.approvalCaptured, false);
  assert.equal(draft.boundary.memoryWriteAllowed, false);
  assert.equal(draft.boundary.agentDispatchAllowed, false);
  assert.equal(draft.boundary.externalSendAllowed, false);
});

test("steering draft uses only the active profile capability evidence", () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_adult_bridge_gap",
      conversationId: "conv_profile_steering",
      turnId: "turn_adult_bridge_gap",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "bridge",
      intentLabel: "send_to_napoleon",
      capabilityLabel: "adult_bridge_gap",
      capabilityStatus: "missing",
      outcomeSignal: "bridge_failed",
      confidence: 0.88,
      evidenceRefs: ["trace:trace_adult_bridge_gap"],
      architectureArea: "bridge",
      privacyClass: "metadata_only",
      suggestedNextStep: "write_evaluator_case",
    }),
  );
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_child_help_gap",
      conversationId: "conv_profile_steering",
      turnId: "turn_child_help_gap",
      profileMode: "child_protected_user",
      channel: "text",
      topicLabel: "school",
      intentLabel: "ask_help",
      capabilityLabel: "child_safe_help_gap",
      capabilityStatus: "missing",
      outcomeSignal: "bridge_failed",
      confidence: 0.92,
      evidenceRefs: ["trace:trace_child_help_gap"],
      architectureArea: "text_ui",
      privacyClass: "metadata_only",
      suggestedNextStep: "write_evaluator_case",
    }),
  );

  const childDraft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_child_steering",
    endpointConfigured: false,
    profileMode: "child_protected_user",
  });

  assert.equal(childDraft.recommendation.capabilityLabel, "child_safe_help_gap");
  assert.deepEqual(childDraft.evolutionProposal.evidence, ["trace:trace_child_help_gap"]);
  assert.equal(childDraft.evolutionProposal.evidence.includes("trace:trace_adult_bridge_gap"), false);
});

test("steering draft redacts unsafe proposal evidence references from existing ledger entries", () => {
  const ledger = createCapabilityLedger();
  const sanitizedSignal = buildCapabilitySignal({
    traceId: "trace_raw_evidence_gap",
    conversationId: "conv_raw_evidence_gap",
    turnId: "turn_raw_evidence_gap",
    profileMode: "adult_owner",
    channel: "text",
    topicLabel: "bridge",
    intentLabel: "send_to_napoleon",
    capabilityLabel: "bridge_contract_gap",
    capabilityStatus: "missing",
    outcomeSignal: "bridge_failed",
    confidence: 0.9,
    evidenceRefs: ["trace:trace_raw_evidence_gap"],
    architectureArea: "bridge",
    privacyClass: "metadata_only",
    suggestedNextStep: "create_evolution_proposal",
  });
  appendCapabilitySignal(ledger, {
    ...sanitizedSignal,
    evidenceRefs: [
      "trace:trace_raw_evidence_gap",
      "https://127.0.0.1:8787/private",
      "Bearer local-secret-token",
    ],
  });

  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: false,
    profileMode: "adult_owner",
  });

  assert.deepEqual(draft.evolutionProposal.evidence, [
    "trace:trace_raw_evidence_gap",
    "redacted_ref",
    "redacted_ref",
  ]);
  assert.equal(JSON.stringify(draft.evolutionProposal).includes("127.0.0.1"), false);
  assert.equal(JSON.stringify(draft.evolutionProposal).includes("local-secret-token"), false);
});

test("steering handoff rejects a draft scoped to a different active profile before fetch", async () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_adult_only_gap",
      conversationId: "conv_profile_mismatch",
      turnId: "turn_adult_only_gap",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "bridge",
      intentLabel: "send_to_napoleon",
      capabilityLabel: "adult_only_bridge_gap",
      capabilityStatus: "missing",
      outcomeSignal: "bridge_failed",
      confidence: 0.89,
      evidenceRefs: ["trace:trace_adult_only_gap"],
      architectureArea: "bridge",
      privacyClass: "metadata_only",
      suggestedNextStep: "write_evaluator_case",
    }),
  );
  const adultDraft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_adult_draft",
    endpointConfigured: true,
    profileMode: "adult_owner",
  });
  let fetchCalled = false;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffSteeringDraft(adultDraft, {
        conversationId: "conv_steering",
        traceId: "trace_child_submit_mismatch",
        profile: "child_protected",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: readyDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("governance_no_go") &&
      (error as { profileMode?: string }).profileMode === "child_protected_user" &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(steeringBlockedEffects),
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.event, "capability_recommendation_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "governance_no_go");
  assert.equal(events.at(-1)?.attributes.profileMode, "child_protected_user");
});

test("steering handoff rejects child-scoped drafts when adult owner is active before fetch", async () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_child_only_gap",
      conversationId: "conv_child_profile_mismatch",
      turnId: "turn_child_only_gap",
      profileMode: "child_protected_user",
      channel: "text",
      topicLabel: "school",
      intentLabel: "ask_help",
      capabilityLabel: "child_only_help_gap",
      capabilityStatus: "missing",
      outcomeSignal: "bridge_failed",
      confidence: 0.9,
      evidenceRefs: ["trace:trace_child_only_gap"],
      architectureArea: "text_ui",
      privacyClass: "child_sensitive",
      suggestedNextStep: "write_evaluator_case",
    }),
  );
  const childDraft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_child_draft",
    endpointConfigured: true,
    profileMode: "child_protected_user",
  });
  let fetchCalled = false;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffSteeringDraft(childDraft, {
        conversationId: "conv_steering",
        traceId: "trace_adult_submit_mismatch",
        profile: "adult_owner",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: readyDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("governance_no_go") &&
      (error as { profileMode?: string }).profileMode === "adult_owner" &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(steeringBlockedEffects),
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.event, "capability_recommendation_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "governance_no_go");
  assert.equal(events.at(-1)?.attributes.profileMode, "adult_owner");
});

test("steering handoff fails closed without endpoint and does not fetch", async () => {
  const ledger = createCapabilityLedger();
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: false,
    profileMode: "child_protected_user",
  });
  let fetchCalled = false;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffSteeringDraft(draft, {
        conversationId: "conv_steering",
        traceId: "trace_submit",
        profile: "child_protected",
        getEndpoint: () => null,
        emit: (event) => events.push(event),
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("no_endpoint") &&
      (error as { profileMode?: string }).profileMode === "child_protected_user" &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(steeringBlockedEffects),
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.event, "capability_recommendation_send_failed");
  assert.equal(events.at(-1)?.attributes.profileMode, "child_protected_user");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, steeringBlockedEffects);
});

test("steering handoff fails closed before fetch when descriptor is not ready", async () => {
  const ledger = createCapabilityLedger();
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: true,
  });
  let fetchCalled = false;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffSteeringDraft(draft, {
        conversationId: "conv_steering",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge/evolution",
        descriptorConnection: {
          endpointConfigured: true,
          descriptor: defaultChiefOfStaffDescriptor,
          expectedChecksum: "sha256:expected",
          actualChecksum: "sha256:actual",
        },
        emit: (event) => events.push(event),
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("descriptor_mismatch") &&
      (error as { descriptorFailureReason?: string }).descriptorFailureReason ===
        "descriptor_signature_or_checksum_mismatch",
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.attributes.descriptorFailureReason, "descriptor_signature_or_checksum_mismatch");
});

test("steering handoff fails closed before fetch when descriptor discovery has not completed", async () => {
  const ledger = createCapabilityLedger();
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: true,
  });
  let fetchCalled = false;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffSteeringDraft(draft, {
        conversationId: "conv_steering",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge/evolution",
        emit: (event) => events.push(event),
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("missing_descriptor") &&
      (error as { descriptorFailureReason?: string }).descriptorFailureReason === "no_descriptor" &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(steeringBlockedEffects),
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.attributes.reason, "missing_descriptor");
  assert.equal(events.at(-1)?.attributes.descriptorFailureReason, "no_descriptor");
});

test("steering handoff fails closed before fetch when descriptor lacks evolution review route", async () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_missing_steering_route",
      conversationId: "conv_missing_steering_route",
      turnId: "turn_missing_steering_route",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "napoleon integration",
      intentLabel: "submit_evolution_proposal",
      capabilityLabel: "evolution_review_handoff",
      capabilityStatus: "missing",
      outcomeSignal: "bridge_failed",
      confidence: 0.89,
      evidenceRefs: ["trace:trace_missing_steering_route"],
      architectureArea: "bridge",
      privacyClass: "metadata_only",
      suggestedNextStep: "create_evolution_proposal",
    }),
  );
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: true,
  });
  let fetchCalled = false;
  const events: TelemetryPayload[] = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffSteeringDraft(draft, {
        conversationId: "conv_steering",
        traceId: "trace_submit_no_steering_route",
        getEndpoint: () => "http://127.0.0.1:8765",
        descriptorConnection: textTurnOnlyRuntimeDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("descriptor_mismatch") &&
      (error as { descriptorFailureReason?: string }).descriptorFailureReason === "descriptor_invalid" &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(steeringBlockedEffects),
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.attributes.reason, "descriptor_mismatch");
  assert.equal(events.at(-1)?.attributes.descriptorFailureReason, "descriptor_invalid");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, steeringBlockedEffects);
});

test("steering handoff preserves descriptor discovery auth failure before fetch", async () => {
  const ledger = createCapabilityLedger();
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: true,
  });
  let fetchCalled = false;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffSteeringDraft(draft, {
        conversationId: "conv_steering",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge/evolution",
        descriptorConnection: {
          endpointConfigured: true,
          descriptor: null,
          failClosedReason: "auth_failure",
        },
        emit: (event) => events.push(event),
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("auth_failure") &&
      (error as { descriptorFailureReason?: string }).descriptorFailureReason === "auth_failure" &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(steeringBlockedEffects),
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.attributes.descriptorFailureReason, "auth_failure");
});

test("steering handoff fails closed while Rehearsal Mode is active", async () => {
  const ledger = createCapabilityLedger();
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: true,
  });
  let fetchCalled = false;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffSteeringDraft(draft, {
        conversationId: "conv_steering",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge/evolution",
        descriptorConnection: readyDescriptorConnection,
        rehearsalMode: true,
        emit: (event) => events.push(event),
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("governance_no_go") &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(steeringBlockedEffects),
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.event, "capability_recommendation_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "governance_no_go");
  assert.equal(events.at(-1)?.attributes.recommendationType, "scored_capability_recommendation");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, steeringBlockedEffects);
});

test("capability review packet handoff posts sanitized proposal evidence without side effects", async () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_capability_packet",
      conversationId: "conv_capability_packet",
      turnId: "turn_capability_packet",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "private https://private.example.test token",
      intentLabel: "send_to_napoleon",
      capabilityLabel: "bridge_failure_handling",
      capabilityStatus: "missing",
      outcomeSignal: "bridge_failed",
      confidence: 0.9,
      evidenceRefs: ["trace:trace_capability_packet", "event:response_failed", "https://private.example.test"],
      architectureArea: "bridge",
      privacyClass: "metadata_only",
      suggestedNextStep: "write_evaluator_case",
      rawMessage: "raw packet text token must not be retained",
    }),
  );
  const answer = answerCapabilityQuestion(
    "What capabilities should be implemented next for https://private.example.test with token?",
    ledger,
    undefined,
    { profileMode: "adult_owner" },
  );
  assert.ok(answer);
  if (!answer) throw new Error("expected capability answer");
  const packet = exportCapabilityReviewPacket(answer, { generatedAt: "2026-06-23T00:00:00.000Z" });
  let posted: Record<string, unknown> | undefined;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  const result = await submitCapabilityReviewPacket(packet, {
    conversationId: "conv_capability_packet",
    traceId: "trace_submit_capability_packet",
    profile: "adult_owner",
    getEndpoint: () => "https://napoleon.example/concierge",
    descriptorConnection: readyDescriptorConnection,
    emit: (event: TelemetryPayload) => events.push(event),
    fetch: async (
      _url: string,
      init?: { method?: string; headers?: Record<string, string>; body?: string },
    ) => {
      posted = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          text: "Napoleon accepted the capability review packet for governed review.",
          governanceDecision: {
            decision_id: "decision_capability_packet",
            request_id: "cos_trace_submit_capability_packet",
            outcome: "requires_review",
            authority_tier: "advisory_review",
            approval_requirement: "chief_of_staff_and_owner_review",
            rationale: "Capability review packets require governed review before implementation.",
            blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
            trace_id: "trace_submit_capability_packet",
            audit_id: "audit_capability_packet",
          },
          traceEnvelope: {
            trace_id: "trace_submit_capability_packet",
            parent_trace_id: "conv_capability_packet",
            actor_id: "napoleon.chief_of_staff",
            request_id: "cos_trace_submit_capability_packet",
            decision_id: "decision_capability_packet",
            timestamp: "2026-06-23T00:00:00.000Z",
          },
          auditEnvelope: {
            audit_id: "audit_capability_packet",
            trace_id: "trace_submit_capability_packet",
            decision_id: "decision_capability_packet",
            actor_id: "napoleon.chief_of_staff",
            authority_tier: "advisory_review",
            approval_requirement: "chief_of_staff_and_owner_review",
            evidence_links: ["trace:trace_submit_capability_packet"],
          },
          appliedLocally: false,
          memoryWritePerformed: false,
          approvalCaptured: false,
          agentDispatchPerformed: false,
          externalSendPerformed: false,
        }),
      };
    },
  });

  assert.equal(posted?.requestKind, "chief_of_staff_steering_handoff");
  assert.equal(posted?.handoffKind, "capability_review_packet_handoff");
  assert.equal((posted?.chiefOfStaffRequest as { request_type: string }).request_type, "evolution_proposal_review");
  assert.equal((posted?.governanceRequest as { action: string }).action, "submit_capability_review_packet_for_review");
  assert.equal((posted?.capabilityReviewPacket as { schemaVersion: string }).schemaVersion, "concierge.capability-review-packet.export.v1");
  assert.equal(
    (posted?.capabilityReviewPacket as { questionClassification: string }).questionClassification,
    "recommended_next_capabilities",
  );
  assert.equal(
    (posted?.evaluatorCaseCandidate as { caseId: string }).caseId,
    "capability_review_bridge_failure_handling",
  );
  assert.equal(
    (posted?.evolutionProposal as { change: { capability: string } }).change.capability,
    "bridge_failure_handling",
  );
  assert.equal((posted?.boundary as { proposalOnly: boolean }).proposalOnly, true);
  assert.equal(result.appliedLocally, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.agentDispatchPerformed, false);
  assert.equal(result.externalSendPerformed, false);
  assert.equal(JSON.stringify(posted).includes("private.example"), false);
  assert.equal(JSON.stringify(posted).includes("raw packet text"), false);
  assert.equal(JSON.stringify(posted).includes("token"), false);
  assert.equal(events.find((event) => event.event === "capability_review_packet_send_started")?.attributes.profileMode, "adult_owner");
  assert.equal(
    events.find((event) => event.event === "capability_review_packet_send_completed")?.attributes.decisionId,
    "decision_capability_packet",
  );
});

test("capability review packet handoff fails closed when returned proof identifiers are unsafe metadata", async () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_capability_packet_unsafe_proof",
      conversationId: "conv_capability_packet_unsafe_proof",
      turnId: "turn_capability_packet_unsafe_proof",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "napoleon integration",
      intentLabel: "send_to_napoleon",
      capabilityLabel: "bridge_failure_handling",
      capabilityStatus: "missing",
      outcomeSignal: "bridge_failed",
      confidence: 0.9,
      evidenceRefs: ["trace:trace_capability_packet_unsafe_proof"],
      architectureArea: "bridge",
      privacyClass: "metadata_only",
      suggestedNextStep: "write_evaluator_case",
    }),
  );
  const answer = answerCapabilityQuestion("What capabilities should be implemented next?", ledger, undefined, {
    profileMode: "adult_owner",
  });
  assert.ok(answer);
  if (!answer) throw new Error("expected capability answer");
  const packet = exportCapabilityReviewPacket(answer, { generatedAt: "2026-06-23T00:00:00.000Z" });
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];
  const unsafeTraceId = "https://napoleon.example/traces/capability?token=secret";
  const unsafeDecisionId = "https://napoleon.example/decisions/capability?token=secret";
  const unsafeAuditId = "https://napoleon.example/audits/capability?token=secret";

  await assert.rejects(
    () =>
      submitCapabilityReviewPacket(packet, {
        conversationId: "conv_capability_packet",
        traceId: "trace_submit_capability_packet_unsafe_proof",
        profile: "adult_owner",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: readyDescriptorConnection,
        emit: (event: TelemetryPayload) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            text: "Napoleon accepted the capability review packet for governed review.",
            governanceDecision: {
              decision_id: unsafeDecisionId,
              request_id: "cos_trace_submit_capability_packet_unsafe_proof",
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              rationale: "Capability review packets require governed review before implementation.",
              blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
              trace_id: unsafeTraceId,
              audit_id: unsafeAuditId,
            },
            traceEnvelope: {
              trace_id: unsafeTraceId,
              parent_trace_id: "conv_capability_packet",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_submit_capability_packet_unsafe_proof",
              decision_id: unsafeDecisionId,
              timestamp: "2026-06-23T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: unsafeAuditId,
              trace_id: unsafeTraceId,
              decision_id: unsafeDecisionId,
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              evidence_links: [`trace:${unsafeTraceId}`],
            },
            appliedLocally: false,
            memoryWritePerformed: false,
            approvalCaptured: false,
            agentDispatchPerformed: false,
            externalSendPerformed: false,
          }),
        }),
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch"),
  );

  assert.equal(events.at(-1)?.event, "capability_review_packet_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
  assert.equal(JSON.stringify(events).includes("napoleon.example"), false);
  assert.equal(JSON.stringify(events).includes("token=secret"), false);
});

test("steering handoff posts evolution review packet without applying proposal locally", async () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_missing_bridge",
      conversationId: "conv_missing_bridge",
      turnId: "turn_missing_bridge",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "napoleon integration",
      intentLabel: "send_to_napoleon",
      capabilityLabel: "live_bridge_descriptor_discovery",
      capabilityStatus: "missing",
      outcomeSignal: "bridge_failed",
      confidence: 0.91,
      evidenceRefs: ["trace:trace_missing_bridge", "audit:audit_missing_bridge"],
      architectureArea: "bridge",
      privacyClass: "metadata_only",
      suggestedNextStep: "create_evolution_proposal",
    }),
  );
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: true,
  });
  let posted: Record<string, unknown> | undefined;
  let headers: Record<string, string> | undefined;
  let targetUrl: string | undefined;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  const result = await submitChiefOfStaffSteeringDraft(draft, {
    conversationId: "conv_steering",
    traceId: "trace_submit",
    getEndpoint: () => "https://napoleon.example/concierge",
    descriptorConnection: readyDescriptorConnection,
    getAuthToken: () => "token_steering",
    emit: (event) => events.push(event),
    fetch: async (url, init) => {
      targetUrl = url;
      posted = JSON.parse(String(init?.body)) as Record<string, unknown>;
      headers = init?.headers;
      return {
        ok: true,
        json: async () => ({
          text: "Napoleon accepted the evolution proposal for review.",
          governanceDecision: {
            decision_id: "decision_steering",
            request_id: "cos_trace_submit",
            outcome: "requires_review",
            authority_tier: "advisory_review",
            approval_requirement: "chief_of_staff_and_owner_review",
            rationale: "Evolution proposals require review before implementation.",
            blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
            trace_id: "trace_submit",
            audit_id: "audit_steering",
          },
          traceEnvelope: {
            trace_id: "trace_submit",
            parent_trace_id: "conv_steering",
            actor_id: "napoleon.chief_of_staff",
            request_id: "cos_trace_submit",
            decision_id: "decision_steering",
            timestamp: "2026-06-11T00:00:00.000Z",
          },
          auditEnvelope: {
            audit_id: "audit_steering",
            trace_id: "trace_submit",
            decision_id: "decision_steering",
            actor_id: "napoleon.chief_of_staff",
            authority_tier: "advisory_review",
            approval_requirement: "chief_of_staff_and_owner_review",
            evidence_links: ["trace:trace_submit"],
          },
          appliedLocally: false,
          memoryWritePerformed: false,
          approvalCaptured: false,
          agentDispatchPerformed: false,
          externalSendPerformed: false,
        }),
      };
    },
  });

  assert.equal((posted?.chiefOfStaffRequest as { request_type: string }).request_type, "evolution_proposal_review");
  assert.equal((posted?.chiefOfStaffRequest as { requested_authority_tier: string }).requested_authority_tier, "advisory_review");
  assert.equal((posted?.recommendation as { recommendationType: string }).recommendationType, "scored_capability_recommendation");
  assert.equal((posted?.evolutionProposal as { proposal_id: string }).proposal_id, draft.evolutionProposal.proposal_id);
  const postedLearningSignals = (posted?.evolutionProposal as {
    learning_signals: Array<{
      signal_type: string;
      source: string;
      capability_id: string;
      governance_boundary: { applied_locally: boolean; external_send_performed: boolean };
      privacy: { raw_user_text_stored: boolean };
    }>;
  }).learning_signals;
  assert.equal(postedLearningSignals.length, 1);
  assert.equal(postedLearningSignals[0].signal_type, "repeated_pattern");
  assert.equal(postedLearningSignals[0].source, "local_capability_ledger");
  assert.equal(postedLearningSignals[0].capability_id, "live_bridge_descriptor_discovery");
  assert.equal(postedLearningSignals[0].privacy.raw_user_text_stored, false);
  assert.equal(postedLearningSignals[0].governance_boundary.applied_locally, false);
  assert.equal(postedLearningSignals[0].governance_boundary.external_send_performed, false);
  assert.equal(targetUrl, "https://napoleon.example/concierge/v1/concierge/chief-of-staff/steering");
  const startedEvent = events.find((event) => event.event === "capability_recommendation_send_started");
  const completedEvent = events.find((event) => event.event === "capability_recommendation_send_completed");
  assert.equal(startedEvent?.attributes.recommendationType, "scored_capability_recommendation");
  assert.equal(completedEvent?.attributes.recommendationType, "scored_capability_recommendation");
  assert.equal(startedEvent?.attributes.descriptorFreshnessState, "not_timestamped");
  assert.equal(completedEvent?.attributes.descriptorFreshnessState, "not_timestamped");
  assert.equal(JSON.stringify(events).includes("Evolution proposals require review"), false);
  assert.equal(JSON.stringify(events).includes("trace_missing_bridge"), false);
  assert.equal(JSON.stringify(events).includes("token_steering"), false);
  assert.equal(posted?.requestKind, "chief_of_staff_steering_handoff");
  assert.equal(posted?.bridgeTargetPath, "/v1/concierge/chief-of-staff/steering");
  assert.equal(posted?.bridgeTargetOperation, "chief_of_staff_steering");
  assert.equal(headers?.Authorization, "Bearer token_steering");
  assert.equal(JSON.stringify(posted).includes("token_steering"), false);
  assert.deepEqual((posted?.boundary as {
    proposalOnly: boolean;
    approvalCaptured: boolean;
    memoryWriteAllowed: boolean;
    agentDispatchAllowed: boolean;
    externalSendAllowed: boolean;
  }), {
    proposalOnly: true,
    approvalCaptured: false,
    memoryWriteAllowed: false,
    agentDispatchAllowed: false,
    externalSendAllowed: false,
  });
  assert.equal(result.appliedLocally, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.externalSendPerformed, false);
  assert.equal(result.governanceDecision.outcome, "requires_review");
});

test("steering handoff fails closed when returned proof identifiers are unsafe metadata", async () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_missing_bridge_unsafe_proof",
      conversationId: "conv_missing_bridge_unsafe_proof",
      turnId: "turn_missing_bridge_unsafe_proof",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "napoleon integration",
      intentLabel: "send_to_napoleon",
      capabilityLabel: "live_bridge_descriptor_discovery",
      capabilityStatus: "missing",
      outcomeSignal: "bridge_failed",
      confidence: 0.91,
      evidenceRefs: ["trace:trace_missing_bridge_unsafe_proof"],
      architectureArea: "bridge",
      privacyClass: "metadata_only",
      suggestedNextStep: "create_evolution_proposal",
    }),
  );
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: true,
  });
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];
  const unsafeTraceId = "https://napoleon.example/traces/steering?token=secret";
  const unsafeDecisionId = "https://napoleon.example/decisions/steering?token=secret";
  const unsafeAuditId = "https://napoleon.example/audits/steering?token=secret";

  await assert.rejects(
    () =>
      submitChiefOfStaffSteeringDraft(draft, {
        conversationId: "conv_steering",
        traceId: "trace_submit_unsafe_steering_proof",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: readyDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            text: "Napoleon accepted the evolution proposal for review.",
            governanceDecision: {
              decision_id: unsafeDecisionId,
              request_id: "cos_trace_submit_unsafe_steering_proof",
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              rationale: "Evolution proposals require review before implementation.",
              blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
              trace_id: unsafeTraceId,
              audit_id: unsafeAuditId,
            },
            traceEnvelope: {
              trace_id: unsafeTraceId,
              parent_trace_id: "conv_steering",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_submit_unsafe_steering_proof",
              decision_id: unsafeDecisionId,
              timestamp: "2026-06-11T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: unsafeAuditId,
              trace_id: unsafeTraceId,
              decision_id: unsafeDecisionId,
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              evidence_links: [`trace:${unsafeTraceId}`],
            },
            appliedLocally: false,
            memoryWritePerformed: false,
            approvalCaptured: false,
            agentDispatchPerformed: false,
            externalSendPerformed: false,
          }),
        }),
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch"),
  );

  assert.equal(events.at(-1)?.event, "capability_recommendation_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
  assert.equal(JSON.stringify(events).includes("napoleon.example"), false);
  assert.equal(JSON.stringify(events).includes("token=secret"), false);
});

test("steering handoff maps Napoleon root endpoints to explicit evolution proposal review path", async () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_missing_evolution_path",
      conversationId: "conv_missing_evolution_path",
      turnId: "turn_missing_evolution_path",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "napoleon integration",
      intentLabel: "submit_evolution_proposal",
      capabilityLabel: "evolution_review_handoff",
      capabilityStatus: "missing",
      outcomeSignal: "bridge_failed",
      confidence: 0.89,
      evidenceRefs: ["trace:trace_missing_evolution_path"],
      architectureArea: "bridge",
      privacyClass: "metadata_only",
      suggestedNextStep: "create_evolution_proposal",
    }),
  );
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering_root",
    endpointConfigured: true,
  });
  let posted: Record<string, unknown> | undefined;
  let targetUrl: string | undefined;

  await submitChiefOfStaffSteeringDraft(draft, {
    conversationId: "conv_steering",
    traceId: "trace_submit_root",
    getEndpoint: () => "https://napoleon.example",
    descriptorConnection: readyDescriptorConnection,
    fetch: async (url, init) => {
      targetUrl = url;
      posted = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return {
        ok: true,
        json: async () => ({
          text: "Napoleon accepted the explicit evolution proposal review packet.",
          governanceDecision: {
            decision_id: "decision_steering_root",
            request_id: "cos_trace_submit_root",
            outcome: "requires_review",
            authority_tier: "advisory_review",
            approval_requirement: "chief_of_staff_and_owner_review",
            rationale: "Evolution proposals require review before implementation.",
            blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
            trace_id: "trace_submit_root",
            audit_id: "audit_steering_root",
          },
          traceEnvelope: {
            trace_id: "trace_submit_root",
            parent_trace_id: "conv_steering",
            actor_id: "napoleon.chief_of_staff",
            request_id: "cos_trace_submit_root",
            decision_id: "decision_steering_root",
            timestamp: "2026-06-19T00:00:00.000Z",
          },
          auditEnvelope: {
            audit_id: "audit_steering_root",
            trace_id: "trace_submit_root",
            decision_id: "decision_steering_root",
            actor_id: "napoleon.chief_of_staff",
            authority_tier: "advisory_review",
            approval_requirement: "chief_of_staff_and_owner_review",
            evidence_links: ["trace:trace_submit_root"],
          },
          appliedLocally: false,
          memoryWritePerformed: false,
          approvalCaptured: false,
          agentDispatchPerformed: false,
          externalSendPerformed: false,
        }),
      };
    },
  });

  assert.equal(targetUrl, "https://napoleon.example/chief-of-staff/reviews/evolution-proposals");
  assert.equal(posted?.requestKind, "evolution_proposal_review_handoff");
  assert.equal(posted?.bridgeTargetPath, "/chief-of-staff/reviews/evolution-proposals");
  assert.equal(posted?.bridgeTargetOperation, "evolution_proposal_review");
  assert.equal((posted?.chiefOfStaffRequest as { request_type: string }).request_type, "evolution_proposal_review");
  assert.equal((posted?.boundary as { proposalOnly: boolean }).proposalOnly, true);
});

test("child protected steering handoff includes child safety caution and child profile scope", async () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_child_steering_gap",
      conversationId: "conv_child_steering_gap",
      turnId: "turn_child_steering_gap",
      profileMode: "child_protected_user",
      channel: "text",
      topicLabel: "homework help",
      intentLabel: "explain_homework",
      capabilityLabel: "child_safe_homework_steps",
      capabilityStatus: "missing",
      outcomeSignal: "user_retried",
      confidence: 0.88,
      evidenceRefs: ["trace:trace_child_steering_gap"],
      architectureArea: "governance_ux",
      privacyClass: "child_sensitive",
      suggestedNextStep: "create_evolution_proposal",
    }),
  );
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_child_steering",
    traceId: "trace_child_steering",
    endpointConfigured: true,
    profileMode: "child_protected_user",
  });
  let posted: Record<string, unknown> | undefined;

  await submitChiefOfStaffSteeringDraft(draft, {
    conversationId: "conv_child_steering",
    traceId: "trace_child_submit",
    profile: "child_protected",
    getEndpoint: () => "https://napoleon.example/concierge",
    descriptorConnection: readyDescriptorConnection,
    fetch: async (_url, init) => {
      posted = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return {
        ok: true,
        json: async () => ({
          text: "Napoleon accepted the child-protected evolution proposal for review.",
          governanceDecision: {
            decision_id: "decision_child_steering",
            request_id: "cos_trace_child_submit",
            outcome: "requires_review",
            authority_tier: "advisory_review",
            approval_requirement: "guardian_and_owner_review",
            rationale: "Child-protected capability changes require extra review.",
            blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
            trace_id: "trace_child_submit",
            audit_id: "audit_child_steering",
          },
          traceEnvelope: {
            trace_id: "trace_child_submit",
            parent_trace_id: "conv_child_steering",
            actor_id: "napoleon.chief_of_staff",
            request_id: "cos_trace_child_submit",
            decision_id: "decision_child_steering",
            timestamp: "2026-06-12T00:00:00.000Z",
          },
          auditEnvelope: {
            audit_id: "audit_child_steering",
            trace_id: "trace_child_submit",
            decision_id: "decision_child_steering",
            actor_id: "napoleon.chief_of_staff",
            authority_tier: "advisory_review",
            approval_requirement: "guardian_and_owner_review",
            evidence_links: ["trace:trace_child_submit"],
          },
          appliedLocally: false,
          memoryWritePerformed: false,
          approvalCaptured: false,
          agentDispatchPerformed: false,
          externalSendPerformed: false,
        }),
      };
    },
  });

  assert.equal(posted?.profileMode, "child_protected_user");
  assert.equal((posted?.chiefOfStaffRequest as { profile_mode: string }).profile_mode, "child_protected_user");
  assert.equal((posted?.recommendation as { childSafetyCaution?: boolean }).childSafetyCaution, true);
  assert.deepEqual((posted?.evolutionProposal as { affected_profiles: string[] }).affected_profiles, [
    "child_protected_user",
  ]);
  assert.equal(
    (posted?.auditEnvelope as { approval_requirement: string }).approval_requirement,
    "guardian_and_owner_review_required_before_child_protected_capability_change",
  );
});

test("steering handoff fails closed when Napoleon returns no-go", async () => {
  const ledger = createCapabilityLedger();
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: true,
  });
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffSteeringDraft(draft, {
        conversationId: "conv_steering",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: readyDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            text: "Napoleon marked the evolution proposal no-go.",
            governanceDecision: {
              decision_id: "decision_steering_no_go",
              request_id: "cos_trace_submit",
              outcome: "no_go",
              authority_tier: "prohibited",
              approval_requirement: "not_available",
              rationale: "The proposal is not executable through this path.",
              blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
              trace_id: "trace_submit",
              audit_id: "audit_steering_no_go",
            },
            traceEnvelope: {
              trace_id: "trace_submit",
              parent_trace_id: "conv_steering",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_submit",
              decision_id: "decision_steering_no_go",
              timestamp: "2026-06-12T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_steering_no_go",
              trace_id: "trace_submit",
              decision_id: "decision_steering_no_go",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "prohibited",
              approval_requirement: "not_available",
              evidence_links: ["trace:trace_submit"],
            },
            appliedLocally: false,
            memoryWritePerformed: false,
            approvalCaptured: false,
            agentDispatchPerformed: false,
            externalSendPerformed: false,
          }),
        }),
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("governance_no_go") &&
      (error as { decisionId?: string }).decisionId === "decision_steering_no_go" &&
      (error as { auditId?: string }).auditId === "audit_steering_no_go" &&
      (error as { governanceOutcome?: string }).governanceOutcome === "no_go" &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) ===
        JSON.stringify(["memory_write", "agent_dispatch", "external_send", "approval_capture"]),
  );

  assert.equal(events.at(-1)?.event, "capability_recommendation_send_failed");
  assert.equal(events.at(-1)?.attributes.decisionId, "decision_steering_no_go");
  assert.equal(events.at(-1)?.attributes.auditId, "audit_steering_no_go");
  assert.equal(events.at(-1)?.attributes.governanceOutcome, "no_go");
  assert.equal(events.at(-1)?.attributes.bridgeTargetPath, "/v1/concierge/chief-of-staff/steering");
  assert.equal(events.at(-1)?.attributes.bridgeTargetOperation, "chief_of_staff_steering");
  assert.equal(events.at(-1)?.attributes.bridgeTargetRequestKind, "chief_of_staff_steering_handoff");
  assert.equal(JSON.stringify(events.at(-1)?.attributes).includes("napoleon.example"), false);
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, [
    "memory_write",
    "agent_dispatch",
    "external_send",
    "approval_capture",
  ]);
});

test("steering handoff rejects response claims that apply proposal or side effects", async () => {
  const ledger = createCapabilityLedger();
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: true,
  });
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffSteeringDraft(draft, {
        conversationId: "conv_steering",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: readyDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            text: "Napoleon reviewed and applied the evolution proposal.",
            governanceDecision: {
              decision_id: "decision_steering_side_effect",
              request_id: "cos_trace_submit",
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              rationale: "Review response must not claim local side effects.",
              blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
              trace_id: "trace_submit",
              audit_id: "audit_steering_side_effect",
            },
            traceEnvelope: {
              trace_id: "trace_submit",
              parent_trace_id: "conv_steering",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_submit",
              decision_id: "decision_steering_side_effect",
              timestamp: "2026-06-12T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_steering_side_effect",
              trace_id: "trace_submit",
              decision_id: "decision_steering_side_effect",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              evidence_links: ["trace:trace_submit"],
            },
            appliedLocally: true,
            memoryWritePerformed: true,
            approvalCaptured: true,
            externalSendPerformed: true,
            agentDispatchPerformed: true,
          }),
        }),
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch") &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(steeringBlockedEffects),
  );

  assert.equal(events.at(-1)?.event, "capability_recommendation_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, steeringBlockedEffects);
});

test("steering handoff rejects response text that claims proposal application", async () => {
  const ledger = createCapabilityLedger();
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: true,
  });
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffSteeringDraft(draft, {
        conversationId: "conv_steering",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge/evolution",
        descriptorConnection: readyDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            text: "Napoleon reviewed and applied the proposal locally.",
            governanceDecision: {
              decision_id: "decision_steering_text_side_effect",
              request_id: "cos_trace_submit",
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              rationale: "Review response text must not claim proposal application.",
              blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
              trace_id: "trace_submit",
              audit_id: "audit_steering_text_side_effect",
            },
            traceEnvelope: {
              trace_id: "trace_submit",
              parent_trace_id: "conv_steering",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_submit",
              decision_id: "decision_steering_text_side_effect",
              timestamp: "2026-06-12T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_steering_text_side_effect",
              trace_id: "trace_submit",
              decision_id: "decision_steering_text_side_effect",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              evidence_links: ["trace:trace_submit"],
            },
            appliedLocally: false,
            memoryWritePerformed: false,
            approvalCaptured: false,
            externalSendPerformed: false,
            agentDispatchPerformed: false,
          }),
        }),
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch"),
  );

  assert.equal(events.at(-1)?.event, "capability_recommendation_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
});

test("steering handoff rejects review responses that omit explicit false side-effect boundaries", async () => {
  const ledger = createCapabilityLedger();
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: true,
  });
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffSteeringDraft(draft, {
        conversationId: "conv_steering",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge/evolution",
        descriptorConnection: readyDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            text: "Napoleon accepted the capability recommendation for review.",
            governanceDecision: {
              decision_id: "decision_steering_omitted_boundaries",
              request_id: "cos_trace_submit",
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              rationale: "Review responses must carry explicit side-effect boundaries.",
              blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
              trace_id: "trace_submit",
              audit_id: "audit_steering_omitted_boundaries",
            },
            traceEnvelope: {
              trace_id: "trace_submit",
              parent_trace_id: "conv_steering",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_submit",
              decision_id: "decision_steering_omitted_boundaries",
              timestamp: "2026-06-12T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_steering_omitted_boundaries",
              trace_id: "trace_submit",
              decision_id: "decision_steering_omitted_boundaries",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              evidence_links: ["trace:trace_submit"],
            },
          }),
        }),
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch"),
  );

  assert.equal(events.at(-1)?.event, "capability_recommendation_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
});

test("steering handoff rejects review responses that omit canonical required text", async () => {
  const ledger = createCapabilityLedger();
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: true,
  });
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffSteeringDraft(draft, {
        conversationId: "conv_steering",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge/evolution",
        descriptorConnection: readyDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            governanceDecision: {
              decision_id: "decision_steering_missing_text",
              request_id: "cos_trace_submit",
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              rationale: "Review responses must carry generated contract fields.",
              blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
              trace_id: "trace_submit",
              audit_id: "audit_steering_missing_text",
            },
            traceEnvelope: {
              trace_id: "trace_submit",
              parent_trace_id: "conv_steering",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_submit",
              decision_id: "decision_steering_missing_text",
              timestamp: "2026-06-12T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_steering_missing_text",
              trace_id: "trace_submit",
              decision_id: "decision_steering_missing_text",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              evidence_links: ["trace:trace_submit"],
            },
            appliedLocally: false,
            memoryWritePerformed: false,
            approvalCaptured: false,
            externalSendPerformed: false,
            agentDispatchPerformed: false,
          }),
        }),
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch"),
  );

  assert.equal(events.at(-1)?.event, "capability_recommendation_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
});

test("steering handoff rejects unreadable review response bodies", async () => {
  const ledger = createCapabilityLedger();
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: true,
  });
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffSteeringDraft(draft, {
        conversationId: "conv_steering",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge/evolution",
        descriptorConnection: readyDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error("private steering response detail");
          },
        }),
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch") &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(steeringBlockedEffects),
  );

  assert.equal(events.at(-1)?.event, "capability_recommendation_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, steeringBlockedEffects);
  assert.equal(JSON.stringify(events).includes("private steering response detail"), false);
});
