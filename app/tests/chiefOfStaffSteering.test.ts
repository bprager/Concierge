import assert from "node:assert/strict";
import test from "node:test";
import {
  appendCapabilitySignal,
  buildCapabilitySignal,
  createCapabilityLedger,
} from "../src/capabilityLedger.js";
import {
  draftChiefOfStaffSteering,
  submitChiefOfStaffSteeringDraft,
} from "../src/chiefOfStaffSteering.js";
import { defaultChiefOfStaffDescriptor } from "../src/contractBridge.js";

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
  });

  assert.equal(draft.sendState.canSendToNapoleon, false);
  assert.equal(draft.boundary.proposalOnly, true);
  assert.equal(draft.boundary.approvalCaptured, false);
  assert.equal(draft.boundary.memoryWriteAllowed, false);
  assert.equal(draft.boundary.agentDispatchAllowed, false);
  assert.equal(draft.boundary.externalSendAllowed, false);
  assert.equal(draft.recommendation.capabilityLabel, "live_bridge_descriptor_discovery");
  assert.equal(draft.recommendation.architectureArea, "bridge");
  assert.ok(draft.evaluatorCaseCandidate.expectedBehavior.includes("fail closed"));
  assert.ok(draft.evolutionProposal.summary.includes("live_bridge_descriptor_discovery"));
  assert.ok(draft.evolutionProposal.evaluator_cases.includes(draft.evaluatorCaseCandidate.caseId));
  assert.ok(draft.evolutionProposal.evidence.includes("trace:trace_missing_bridge"));
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
  });

  assert.equal(draft.recommendation.capabilityLabel, "memory_review");
  assert.deepEqual(draft.evolutionProposal.evidence, ["trace:trace_missing_memory_review"]);
  assert.equal(draft.evolutionProposal.evidence.includes("trace:trace_blocked_memory_write"), false);
});

test("steering handoff fails closed without endpoint and does not fetch", async () => {
  const ledger = createCapabilityLedger();
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: false,
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
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("descriptor_mismatch"),
  );

  assert.equal(fetchCalled, false);
});

test("steering handoff fails closed before fetch when descriptor discovery has not completed", async () => {
  const ledger = createCapabilityLedger();
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: true,
  });
  let fetchCalled = false;

  await assert.rejects(
    () =>
      submitChiefOfStaffSteeringDraft(draft, {
        conversationId: "conv_steering",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge/evolution",
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("descriptor_mismatch") &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(steeringBlockedEffects),
  );

  assert.equal(fetchCalled, false);
});

test("steering handoff preserves descriptor discovery auth failure before fetch", async () => {
  const ledger = createCapabilityLedger();
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: true,
  });
  let fetchCalled = false;

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
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("auth_failure") &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(steeringBlockedEffects),
  );

  assert.equal(fetchCalled, false);
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
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, steeringBlockedEffects);
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

  const result = await submitChiefOfStaffSteeringDraft(draft, {
    conversationId: "conv_steering",
    traceId: "trace_submit",
    getEndpoint: () => "https://napoleon.example/concierge",
    descriptorConnection: readyDescriptorConnection,
    getAuthToken: () => "token_steering",
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
  assert.equal((posted?.evolutionProposal as { proposal_id: string }).proposal_id, draft.evolutionProposal.proposal_id);
  assert.equal(targetUrl, "https://napoleon.example/concierge/v1/concierge/chief-of-staff/steering");
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
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) ===
        JSON.stringify(["memory_write", "agent_dispatch", "external_send", "approval_capture"]),
  );

  assert.equal(events.at(-1)?.event, "capability_recommendation_send_failed");
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
