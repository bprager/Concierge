import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMemoryProposalReviewState,
  buildTextTurnContract,
  defaultChiefOfStaffDescriptor,
} from "../src/contractBridge.js";
import { submitMemoryProposalForReview } from "../src/memoryProposalSubmission.js";

type TestFetchInit = { method?: string; headers?: Record<string, string>; body?: string };

const memoryProposalBlockedEffects = [
  "memory_write",
  "approval_capture",
  "external_send",
  "agent_dispatch",
  "runtime_authority",
];

const readyDescriptorConnection = {
  endpointConfigured: true,
  descriptor: defaultChiefOfStaffDescriptor,
  expectedChecksum: "sha256:local-static",
  actualChecksum: "sha256:local-static",
  signatureValid: true,
};

function buildReview() {
  const contract = buildTextTurnContract({
    message: "Remember that I prefer short deployment summaries",
    profile: "adult_owner",
    conversationId: "conv_memory",
    turnId: "turn_memory",
    traceId: "trace_memory",
  });
  return buildMemoryProposalReviewState(contract, "Remember that I prefer short deployment summaries");
}

test("memory proposal submission fails closed without endpoint and does not fetch", async () => {
  const review = buildReview();
  let fetchCalled = false;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitMemoryProposalForReview(review, {
        conversationId: "conv_memory",
        traceId: "trace_submit",
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
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) ===
        JSON.stringify(memoryProposalBlockedEffects),
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.event, "memory_proposal_send_failed");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, memoryProposalBlockedEffects);
});

test("memory proposal submission fails closed before fetch when descriptor is not ready", async () => {
  const review = buildReview();
  let fetchCalled = false;

  await assert.rejects(
    () =>
      submitMemoryProposalForReview(review, {
        conversationId: "conv_memory",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
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

test("memory proposal submission fails closed before fetch when descriptor discovery has not completed", async () => {
  const review = buildReview();
  let fetchCalled = false;

  await assert.rejects(
    () =>
      submitMemoryProposalForReview(review, {
        conversationId: "conv_memory",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
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
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) ===
        JSON.stringify(memoryProposalBlockedEffects),
  );

  assert.equal(fetchCalled, false);
});

test("memory proposal submission fails closed while Rehearsal Mode is active", async () => {
  const review = buildReview();
  let fetchCalled = false;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitMemoryProposalForReview(review, {
        conversationId: "conv_memory",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
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
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) ===
        JSON.stringify(memoryProposalBlockedEffects),
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.event, "memory_proposal_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "governance_no_go");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, memoryProposalBlockedEffects);
});

test("memory proposal submission posts review packet without writing memory or capturing approval", async () => {
  const review = buildReview();
  let posted: Record<string, unknown> | undefined;
  let headers: Record<string, string> | undefined;
  let targetUrl: string | undefined;

  const result = await submitMemoryProposalForReview(review, {
    conversationId: "conv_memory",
    traceId: "trace_submit",
    getEndpoint: () => "https://napoleon.example/concierge",
    descriptorConnection: readyDescriptorConnection,
    getAuthToken: () => "token_memory",
    fetch: async (url: string, init?: TestFetchInit) => {
      targetUrl = url;
      headers = init?.headers;
      posted = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return {
        ok: true,
        json: async () => ({
          text: "Napoleon accepted the memory proposal for governed review.",
          governanceDecision: {
            decision_id: "decision_memory",
            request_id: "cos_trace_submit",
            outcome: "requires_review",
            authority_tier: "advisory_review",
            approval_requirement: "chief_of_staff_and_owner_review",
            rationale: "Memory proposals require Napoleon review before any write.",
            blocked_effects: ["memory_write", "approval_capture", "external_send"],
            trace_id: "trace_submit",
            audit_id: "audit_memory",
          },
          traceEnvelope: {
            trace_id: "trace_submit",
            parent_trace_id: "conv_memory",
            actor_id: "napoleon.chief_of_staff",
            request_id: "cos_trace_submit",
            decision_id: "decision_memory",
            timestamp: "2026-06-11T00:00:00.000Z",
          },
          auditEnvelope: {
            audit_id: "audit_memory",
            trace_id: "trace_submit",
            decision_id: "decision_memory",
            actor_id: "napoleon.chief_of_staff",
            authority_tier: "advisory_review",
            approval_requirement: "chief_of_staff_and_owner_review",
            evidence_links: ["trace:trace_memory", "audit:audit_turn_memory"],
          },
          memoryWritePerformed: false,
          approvalCaptured: false,
          agentDispatchPerformed: false,
          externalSendPerformed: false,
        }),
      };
    },
  });

  assert.equal(targetUrl, "https://napoleon.example/concierge/v1/concierge/memory-proposals");
  assert.equal(headers?.Authorization, "Bearer token_memory");
  assert.equal(JSON.stringify(posted).includes("token_memory"), false);
  assert.equal((posted?.chiefOfStaffRequest as { request_type: string }).request_type, "governance_review");
  assert.equal((posted?.chiefOfStaffRequest as { requested_authority_tier: string }).requested_authority_tier, "advisory_review");
  assert.equal((posted?.memoryProposal as { proposalId: string }).proposalId, review.proposalId);
  assert.deepEqual(posted?.boundary, {
    proposalOnly: true,
    approvalCaptured: false,
    memoryWriteAllowed: false,
    agentDispatchAllowed: false,
    externalSendAllowed: false,
  });
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.agentDispatchPerformed, false);
  assert.equal(result.externalSendPerformed, false);
  assert.equal(result.governanceDecision.outcome, "requires_review");
});

test("memory proposal submission fails closed when Napoleon denies review", async () => {
  const review = buildReview();
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitMemoryProposalForReview(review, {
        conversationId: "conv_memory",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: readyDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            text: "Napoleon denied the memory proposal.",
            governanceDecision: {
              decision_id: "decision_memory_denied",
              request_id: "cos_trace_submit",
              outcome: "deny",
              authority_tier: "prohibited",
              approval_requirement: "not_available",
              rationale: "This memory proposal is not allowed.",
              blocked_effects: ["memory_write", "approval_capture", "external_send"],
              trace_id: "trace_submit",
              audit_id: "audit_memory_denied",
            },
            traceEnvelope: {
              trace_id: "trace_submit",
              parent_trace_id: "conv_memory",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_submit",
              decision_id: "decision_memory_denied",
              timestamp: "2026-06-12T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_memory_denied",
              trace_id: "trace_submit",
              decision_id: "decision_memory_denied",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "prohibited",
              approval_requirement: "not_available",
              evidence_links: ["trace:trace_submit"],
            },
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
      error.message.includes("governance_denied") &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) ===
        JSON.stringify(["memory_write", "approval_capture", "external_send"]),
  );

  assert.equal(events.at(-1)?.event, "memory_proposal_send_failed");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, [
    "memory_write",
    "approval_capture",
    "external_send",
  ]);
});

test("memory proposal submission rejects response claims that write memory or capture approval", async () => {
  const review = buildReview();
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitMemoryProposalForReview(review, {
        conversationId: "conv_memory",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: readyDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            text: "Napoleon reviewed and wrote the memory proposal.",
            governanceDecision: {
              decision_id: "decision_memory_side_effect",
              request_id: "cos_trace_submit",
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              rationale: "Memory review responses must not claim writes or approvals.",
              blocked_effects: ["memory_write", "approval_capture", "external_send"],
              trace_id: "trace_submit",
              audit_id: "audit_memory_side_effect",
            },
            traceEnvelope: {
              trace_id: "trace_submit",
              parent_trace_id: "conv_memory",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_submit",
              decision_id: "decision_memory_side_effect",
              timestamp: "2026-06-12T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_memory_side_effect",
              trace_id: "trace_submit",
              decision_id: "decision_memory_side_effect",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              evidence_links: ["trace:trace_submit"],
            },
            memoryWritePerformed: true,
            approvalCaptured: true,
            externalSendPerformed: true,
            agentDispatchPerformed: true,
            appliedLocally: true,
          }),
        }),
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch") &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) ===
        JSON.stringify(memoryProposalBlockedEffects),
  );

  assert.equal(events.at(-1)?.event, "memory_proposal_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, memoryProposalBlockedEffects);
});

test("memory proposal submission rejects review responses that omit explicit false side-effect boundaries", async () => {
  const review = buildReview();
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitMemoryProposalForReview(review, {
        conversationId: "conv_memory",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: readyDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            text: "Napoleon accepted the memory proposal for governed review.",
            governanceDecision: {
              decision_id: "decision_memory_omitted_boundaries",
              request_id: "cos_trace_submit",
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              rationale: "Review responses must carry explicit side-effect boundaries.",
              blocked_effects: ["memory_write", "approval_capture", "external_send", "agent_dispatch"],
              trace_id: "trace_submit",
              audit_id: "audit_memory_omitted_boundaries",
            },
            traceEnvelope: {
              trace_id: "trace_submit",
              parent_trace_id: "conv_memory",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_submit",
              decision_id: "decision_memory_omitted_boundaries",
              timestamp: "2026-06-12T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_memory_omitted_boundaries",
              trace_id: "trace_submit",
              decision_id: "decision_memory_omitted_boundaries",
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

  assert.equal(events.at(-1)?.event, "memory_proposal_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
});

test("memory proposal submission rejects malformed Napoleon response", async () => {
  const review = buildReview();

  await assert.rejects(
    () =>
      submitMemoryProposalForReview(review, {
        conversationId: "conv_memory",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: readyDescriptorConnection,
        fetch: async () => ({
          ok: true,
          json: async () => ({
            text: "Missing provenance",
          }),
        }),
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch"),
  );
});
