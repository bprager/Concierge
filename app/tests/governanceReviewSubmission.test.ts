import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGovernanceReviewState,
  buildTextTurnContract,
  defaultChiefOfStaffDescriptor,
} from "../src/contractBridge.js";
import { submitGovernanceReviewForNapoleonReview } from "../src/governanceReviewSubmission.js";

type TestFetchInit = { method?: string; headers?: Record<string, string>; body?: string };

const governanceReviewBlockedEffects = [
  "approval_capture",
  "memory_write",
  "agent_dispatch",
  "external_send",
  "runtime_authority",
  "audit_append",
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

function buildReview(profile: "adult_owner" | "child_protected" = "adult_owner") {
  const contract = buildTextTurnContract({
    message: "Please prepare this for review before sending it outside this chat",
    profile,
    conversationId: "conv_governance",
    turnId: "turn_governance",
    traceId: "trace_governance",
    governanceOutcome: "requires_review",
  });
  return buildGovernanceReviewState(contract.governanceDecision, profile);
}

test("governance review submission fails closed without endpoint and does not fetch", async () => {
  const review = buildReview("child_protected");
  let fetchCalled = false;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitGovernanceReviewForNapoleonReview(review, {
        conversationId: "conv_governance",
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
      (error as { profileMode?: string }).profileMode === "child_protected_user" &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) ===
        JSON.stringify(governanceReviewBlockedEffects),
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.event, "governance_review_send_failed");
  assert.equal(events.at(-1)?.attributes.profileMode, "child_protected_user");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, governanceReviewBlockedEffects);
});

test("governance review submission fails closed while Rehearsal Mode is active", async () => {
  const review = buildReview();
  let fetchCalled = false;

  await assert.rejects(
    () =>
      submitGovernanceReviewForNapoleonReview(review, {
        conversationId: "conv_governance",
        traceId: "trace_submit",
        rehearsalMode: true,
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: readyDescriptorConnection,
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error && error.name === "NapoleonBridgeError" && error.message.includes("governance_no_go"),
  );

  assert.equal(fetchCalled, false);
});

test("governance review submission preserves descriptor discovery auth failure before fetch", async () => {
  const review = buildReview();
  let fetchCalled = false;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitGovernanceReviewForNapoleonReview(review, {
        conversationId: "conv_governance",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
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
      (error as { descriptorFailureReason?: string }).descriptorFailureReason === "auth_failure",
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.attributes.descriptorFailureReason, "auth_failure");
});

test("governance review submission fails closed before fetch when descriptor lacks governance review route", async () => {
  const review = buildReview();
  let fetchCalled = false;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitGovernanceReviewForNapoleonReview(review, {
        conversationId: "conv_governance",
        traceId: "trace_submit_missing_governance_route",
        getEndpoint: () => "https://napoleon.example/concierge",
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
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) ===
        JSON.stringify(governanceReviewBlockedEffects),
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.event, "governance_review_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "descriptor_mismatch");
  assert.equal(events.at(-1)?.attributes.descriptorFailureReason, "descriptor_invalid");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, governanceReviewBlockedEffects);
});

test("governance review submission rejects an adult review when child protected is active before fetch", async () => {
  const review = buildReview("adult_owner");
  let fetchCalled = false;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitGovernanceReviewForNapoleonReview(review, {
        conversationId: "conv_governance",
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
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) ===
        JSON.stringify(governanceReviewBlockedEffects),
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.event, "governance_review_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "governance_no_go");
  assert.equal(events.at(-1)?.attributes.profileMode, "child_protected_user");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, governanceReviewBlockedEffects);
});

test("governance review submission rejects a child review when adult owner is active before fetch", async () => {
  const review = buildReview("child_protected");
  let fetchCalled = false;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitGovernanceReviewForNapoleonReview(review, {
        conversationId: "conv_governance",
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
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) ===
        JSON.stringify(governanceReviewBlockedEffects),
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.event, "governance_review_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "governance_no_go");
  assert.equal(events.at(-1)?.attributes.profileMode, "adult_owner");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, governanceReviewBlockedEffects);
});

test("governance review submission posts packet without capturing approval or applying effects", async () => {
  const review = buildReview("child_protected");
  let posted: Record<string, unknown> | undefined;
  let headers: Record<string, string> | undefined;
  let targetUrl: string | undefined;

  const result = await submitGovernanceReviewForNapoleonReview(review, {
    conversationId: "conv_governance",
    traceId: "trace_submit",
    getEndpoint: () => "https://napoleon.example/concierge",
    getAuthToken: () => "token_governance",
    descriptorConnection: readyDescriptorConnection,
    fetch: async (url: string, init?: TestFetchInit) => {
      targetUrl = url;
      headers = init?.headers;
      posted = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return {
        ok: true,
        json: async () => ({
          text: "Napoleon accepted the governance review packet.",
          governanceDecision: {
            decision_id: "decision_governance_remote",
            request_id: "cos_trace_submit",
            outcome: "requires_review",
            authority_tier: "advisory_review",
            approval_requirement: "guardian_and_owner_review",
            rationale: "Governance review requires Napoleon proof before action.",
            blocked_effects: ["approval_capture", "memory_write", "external_send"],
            trace_id: "trace_submit",
            audit_id: "audit_governance_remote",
          },
          traceEnvelope: {
            trace_id: "trace_submit",
            parent_trace_id: "conv_governance",
            actor_id: "napoleon.chief_of_staff",
            request_id: "cos_trace_submit",
            decision_id: "decision_governance_remote",
            timestamp: "2026-06-15T00:00:00.000Z",
          },
          auditEnvelope: {
            audit_id: "audit_governance_remote",
            trace_id: "trace_submit",
            decision_id: "decision_governance_remote",
            actor_id: "napoleon.chief_of_staff",
            authority_tier: "advisory_review",
            approval_requirement: "guardian_and_owner_review",
            evidence_links: ["trace:trace_governance"],
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

  assert.equal(targetUrl, "https://napoleon.example/concierge/v1/concierge/chief-of-staff/steering");
  assert.equal(headers?.Authorization, "Bearer token_governance");
  assert.equal(JSON.stringify(posted).includes("token_governance"), false);
  assert.equal(posted?.requestKind, "chief_of_staff_steering_handoff");
  assert.equal(posted?.handoffKind, "governance_review_handoff");
  assert.equal(posted?.bridgeTargetPath, "/v1/concierge/chief-of-staff/steering");
  assert.equal(posted?.bridgeTargetOperation, "chief_of_staff_steering");
  assert.equal((posted?.chiefOfStaffRequest as { request_type: string }).request_type, "governance_review");
  assert.equal((posted?.chiefOfStaffRequest as { requested_authority_tier: string }).requested_authority_tier, "advisory_review");
  assert.equal(posted?.profileMode, "child_protected_user");
  assert.equal((posted?.auditEnvelope as { approval_requirement: string }).approval_requirement, "guardian_and_owner_review_before_external_or_durable_effects");
  assert.deepEqual(posted?.boundary, {
    proposalOnly: true,
    approvalCaptured: false,
    memoryWriteAllowed: false,
    agentDispatchAllowed: false,
    externalSendAllowed: false,
    localApplicationAllowed: false,
  });
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.agentDispatchPerformed, false);
  assert.equal(result.externalSendPerformed, false);
  assert.equal(result.appliedLocally, false);
  assert.equal(result.governanceDecision.outcome, "requires_review");
});

test("governance review submission maps Napoleon root endpoint to explicit governance review path", async () => {
  const review = buildReview();
  let posted: Record<string, unknown> | undefined;
  let targetUrl: string | undefined;

  await submitGovernanceReviewForNapoleonReview(review, {
    conversationId: "conv_governance",
    traceId: "trace_submit",
    getEndpoint: () => "https://napoleon.example",
    descriptorConnection: readyDescriptorConnection,
    fetch: async (url: string, init?: TestFetchInit) => {
      targetUrl = url;
      posted = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return {
        ok: true,
        status: 202,
        json: async () => ({
          text: "Napoleon accepted the governance review packet.",
          governanceDecision: {
            decision_id: "decision_governance_remote",
            request_id: "cos_trace_submit",
            outcome: "requires_review",
            authority_tier: "advisory_review",
            approval_requirement: "owner_review",
            rationale: "Governance review requires Napoleon proof before action.",
            blocked_effects: ["approval_capture", "memory_write", "external_send"],
            trace_id: "trace_submit",
            audit_id: "audit_governance_remote",
          },
          traceEnvelope: {
            trace_id: "trace_submit",
            parent_trace_id: "conv_governance",
            actor_id: "napoleon.governance",
            request_id: "cos_trace_submit",
            decision_id: "decision_governance_remote",
            timestamp: "2026-06-15T00:00:00.000Z",
          },
          auditEnvelope: {
            audit_id: "audit_governance_remote",
            trace_id: "trace_submit",
            decision_id: "decision_governance_remote",
            actor_id: "napoleon.governance",
            authority_tier: "advisory_review",
            approval_requirement: "owner_review",
            evidence_links: ["trace:trace_governance"],
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

  assert.equal(targetUrl, "https://napoleon.example/chief-of-staff/reviews/governance");
  assert.equal(posted?.requestKind, "governance_review_handoff");
  assert.equal(posted?.handoffKind, "governance_review_handoff");
  assert.equal(posted?.bridgeTargetPath, "/chief-of-staff/reviews/governance");
  assert.equal(posted?.bridgeTargetOperation, "governance_review");
  assert.equal((posted?.chiefOfStaffRequest as { request_type: string }).request_type, "governance_review");
  assert.equal((posted?.governanceRequest as { target: string }).target, "napoleon.governance");
  assert.equal((posted?.boundary as { approvalCaptured: boolean }).approvalCaptured, false);
});

test("governance review submission fails closed when Napoleon denies review", async () => {
  const review = buildReview();
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitGovernanceReviewForNapoleonReview(review, {
        conversationId: "conv_governance",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: readyDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            text: "Napoleon denied the review.",
            governanceDecision: {
              decision_id: "decision_governance_denied",
              request_id: "cos_trace_submit",
              outcome: "deny",
              authority_tier: "prohibited",
              approval_requirement: "not_available",
              rationale: "This governance review cannot proceed.",
              blocked_effects: ["approval_capture", "external_send"],
              trace_id: "trace_submit",
              audit_id: "audit_governance_denied",
            },
            traceEnvelope: {
              trace_id: "trace_submit",
              parent_trace_id: "conv_governance",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_submit",
              decision_id: "decision_governance_denied",
              timestamp: "2026-06-15T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_governance_denied",
              trace_id: "trace_submit",
              decision_id: "decision_governance_denied",
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
      error instanceof Error && error.name === "NapoleonBridgeError" && error.message.includes("governance_denied"),
  );

  assert.equal(events.at(-1)?.event, "governance_review_send_failed");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, ["approval_capture", "external_send"]);
  assert.equal(events.at(-1)?.attributes.governanceOutcome, "deny");
});

test("governance review submission rejects response claims that capture approval or apply effects", async () => {
  const review = buildReview();
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitGovernanceReviewForNapoleonReview(review, {
        conversationId: "conv_governance",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: readyDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            text: "Approved and applied.",
            governanceDecision: {
              decision_id: "decision_governance_side_effect",
              request_id: "cos_trace_submit",
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "owner_review",
              rationale: "Review responses must not claim local effects.",
              blocked_effects: ["approval_capture", "memory_write"],
              trace_id: "trace_submit",
              audit_id: "audit_governance_side_effect",
            },
            traceEnvelope: {
              trace_id: "trace_submit",
              parent_trace_id: "conv_governance",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_submit",
              decision_id: "decision_governance_side_effect",
              timestamp: "2026-06-15T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_governance_side_effect",
              trace_id: "trace_submit",
              decision_id: "decision_governance_side_effect",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "advisory_review",
              approval_requirement: "owner_review",
              evidence_links: ["trace:trace_submit"],
            },
            appliedLocally: true,
            memoryWritePerformed: true,
            approvalCaptured: true,
            agentDispatchPerformed: true,
            externalSendPerformed: true,
          }),
        }),
      }),
    (error: unknown) =>
      error instanceof Error && error.name === "NapoleonBridgeError" && error.message.includes("contract_mismatch"),
  );

  assert.equal(events.at(-1)?.event, "governance_review_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, governanceReviewBlockedEffects);
});

test("governance review submission rejects response text that claims local application", async () => {
  const review = buildReview();
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitGovernanceReviewForNapoleonReview(review, {
        conversationId: "conv_governance",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: readyDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            text: "Napoleon accepted the review and applied the proposal locally.",
            governanceDecision: {
              decision_id: "decision_governance_text_side_effect",
              request_id: "cos_trace_submit",
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "owner_review",
              rationale: "Governance review responses must not claim local application in text.",
              blocked_effects: ["approval_capture", "memory_write", "agent_dispatch", "external_send"],
              trace_id: "trace_submit",
              audit_id: "audit_governance_text_side_effect",
            },
            traceEnvelope: {
              trace_id: "trace_submit",
              parent_trace_id: "conv_governance",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_submit",
              decision_id: "decision_governance_text_side_effect",
              timestamp: "2026-06-15T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_governance_text_side_effect",
              trace_id: "trace_submit",
              decision_id: "decision_governance_text_side_effect",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "advisory_review",
              approval_requirement: "owner_review",
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
      error.message.includes("contract_mismatch"),
  );

  assert.equal(events.at(-1)?.event, "governance_review_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
});

test("governance review submission rejects review responses that omit canonical required text", async () => {
  const review = buildReview();
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitGovernanceReviewForNapoleonReview(review, {
        conversationId: "conv_governance",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: readyDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            governanceDecision: {
              decision_id: "decision_governance_missing_text",
              request_id: "cos_trace_submit",
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "owner_review",
              rationale: "Review responses must carry generated contract fields.",
              blocked_effects: ["approval_capture", "memory_write"],
              trace_id: "trace_submit",
              audit_id: "audit_governance_missing_text",
            },
            traceEnvelope: {
              trace_id: "trace_submit",
              parent_trace_id: "conv_governance",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_submit",
              decision_id: "decision_governance_missing_text",
              timestamp: "2026-06-15T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_governance_missing_text",
              trace_id: "trace_submit",
              decision_id: "decision_governance_missing_text",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "advisory_review",
              approval_requirement: "owner_review",
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
      error instanceof Error && error.name === "NapoleonBridgeError" && error.message.includes("contract_mismatch"),
  );

  assert.equal(events.at(-1)?.event, "governance_review_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
});

test("governance review submission rejects unreadable review response bodies", async () => {
  const review = buildReview();
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitGovernanceReviewForNapoleonReview(review, {
        conversationId: "conv_governance",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: readyDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error("private governance response detail");
          },
        }),
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch") &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) ===
        JSON.stringify(governanceReviewBlockedEffects),
  );

  assert.equal(events.at(-1)?.event, "governance_review_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, governanceReviewBlockedEffects);
  assert.equal(JSON.stringify(events).includes("private governance response detail"), false);
});
