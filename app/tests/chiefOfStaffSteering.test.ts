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

test("steering handoff fails closed without endpoint and does not fetch", async () => {
  const ledger = createCapabilityLedger();
  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: false,
  });
  let fetchCalled = false;

  await assert.rejects(
    () =>
      submitChiefOfStaffSteeringDraft(draft, {
        conversationId: "conv_steering",
        traceId: "trace_submit",
        getEndpoint: () => null,
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("no_endpoint"),
  );

  assert.equal(fetchCalled, false);
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

  const result = await submitChiefOfStaffSteeringDraft(draft, {
    conversationId: "conv_steering",
    traceId: "trace_submit",
    getEndpoint: () => "https://napoleon.example/concierge/evolution",
    getAuthToken: () => "token_steering",
    fetch: async (_url, init) => {
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
        }),
      };
    },
  });

  assert.equal((posted?.chiefOfStaffRequest as { request_type: string }).request_type, "evolution_proposal_review");
  assert.equal((posted?.chiefOfStaffRequest as { requested_authority_tier: string }).requested_authority_tier, "advisory_review");
  assert.equal((posted?.evolutionProposal as { proposal_id: string }).proposal_id, draft.evolutionProposal.proposal_id);
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
