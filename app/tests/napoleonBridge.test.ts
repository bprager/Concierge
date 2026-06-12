import assert from "node:assert/strict";
import test from "node:test";
import { sendToNapoleon } from "../src/napoleonBridge.js";
import { defaultChiefOfStaffDescriptor } from "../src/contractBridge.js";
import type { TelemetryPayload } from "../src/telemetry.js";

test("live bridge fails closed when no Napoleon endpoint is configured", async () => {
  const events: TelemetryPayload[] = [];

  await assert.rejects(
    () =>
      sendToNapoleon(
        {
          traceId: "trace_bridge",
          conversationId: "conv_bridge",
          turnId: "turn_bridge",
          profile: "child_protected",
          channel: "text",
          message: "Can you send this to someone?",
        },
        {
          getEndpoint: () => null,
          emit: (event) => events.push(event),
        },
      ),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("no_endpoint"),
  );

  assert.equal(events[0].event, "bridge_request_started");
  assert.equal(events.at(-1)?.event, "bridge_request_failed");
  assert.equal(events.at(-1)?.attributes.reason, "no_endpoint");
});

test("live bridge request sends contract-first payload to configured endpoint", async () => {
  let posted: Record<string, unknown> | undefined;
  let headers: Record<string, string> | undefined;
  let targetUrl: string | undefined;
  const evidence: unknown[] = [];

  const response = await sendToNapoleon(
    {
      traceId: "trace_live",
      conversationId: "conv_live",
      turnId: "turn_live",
      profile: "adult_owner",
      channel: "text",
      message: "Draft the bridge plan",
    },
    {
      getEndpoint: () => "https://napoleon.example/concierge",
      getAuthToken: () => "token_live",
      emit: () => undefined,
      captureEvidence: (record) => evidence.push(record),
      fetch: async (url, init) => {
        targetUrl = url;
        posted = JSON.parse(String(init?.body)) as Record<string, unknown>;
        headers = init?.headers;
        return {
          ok: true,
          json: async () => ({
            text: "Prepared through Napoleon.",
            governanceDecision: {
              decision_id: "decision_remote",
              request_id: "cos_turn_live",
              outcome: "requires_review",
              authority_tier: "prepare_only",
              approval_requirement: "explicit_owner_approval",
              rationale: "External effects require owner approval.",
              blocked_effects: ["external_send"],
              trace_id: "trace_live",
              audit_id: "audit_remote",
            },
            traceEnvelope: {
              trace_id: "trace_live",
              parent_trace_id: "conv_live",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_turn_live",
              decision_id: "decision_remote",
              timestamp: "2026-06-11T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_remote",
              trace_id: "trace_live",
              decision_id: "decision_remote",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "prepare_only",
              approval_requirement: "explicit_owner_approval",
              evidence_links: ["trace:trace_live"],
            },
            delegation: {
              selectedAgents: [
                {
                  agentId: "napoleon.passive_brain",
                  displayName: "Passive Brain",
                  selectionReason: "Relevant deployment history was found.",
                  contributionSummary: "Found the prior bridge rollout note.",
                },
              ],
              allowedEffects: ["prepare_advisory_response"],
              blockedEffects: ["external_send", "memory_write"],
              governanceState: "requires_review",
              traceId: "trace_live",
              auditId: "audit_remote",
            },
          }),
        };
      },
    },
  );

  assert.equal((posted?.chiefOfStaffRequest as { request_type: string }).request_type, "governance_review");
  assert.equal((posted?.governanceRequest as { requested_authority_tier: string }).requested_authority_tier, "advisory_review");
  assert.equal((posted?.traceEnvelope as { trace_id: string }).trace_id, "trace_live");
  assert.equal(targetUrl, "https://napoleon.example/concierge/v1/concierge/turn");
  assert.equal(headers?.Authorization, "Bearer token_live");
  assert.equal(JSON.stringify(posted).includes("token_live"), false);
  assert.equal(response.governanceDecision.outcome, "requires_review");
  assert.equal(response.requiresReview, true);
  assert.equal(response.delegation?.selectedAgents[0]?.displayName, "Passive Brain");
  assert.equal(response.delegation?.blockedEffects[0], "external_send");
  assert.equal(evidence.length, 1);
  assert.deepEqual(evidence[0], {
    kind: "bridge_contract_evidence",
    operationId: "text_turn",
    requestKind: "text_turn",
    status: "success",
    httpStatus: 200,
    targetPath: "/v1/concierge/turn",
    traceId: "trace_live",
    requestId: "cos_turn_live",
    decisionId: "decision_remote",
    auditId: "audit_remote",
    governanceOutcome: "requires_review",
    descriptorStatus: "ready",
    profileMode: "adult_owner",
    selectedAgentIds: ["napoleon.passive_brain"],
    allowedEffects: ["prepare_advisory_response"],
    blockedEffects: ["external_send", "memory_write"],
    provenanceVerified: true,
  });
  assert.equal(JSON.stringify(evidence).includes("token_live"), false);
  assert.equal(JSON.stringify(evidence).includes("Draft the bridge plan"), false);
  assert.equal(JSON.stringify(evidence).includes("Prepared through Napoleon."), false);
});

test("live bridge captures sanitized fail-closed evidence on auth failure", async () => {
  const evidence: unknown[] = [];

  await assert.rejects(
    () =>
      sendToNapoleon(
        {
          traceId: "trace_auth_evidence",
          conversationId: "conv_auth_evidence",
          turnId: "turn_auth_evidence",
          profile: "adult_owner",
          channel: "text",
          message: "Send a private deployment summary",
        },
        {
          getEndpoint: () => "https://napoleon.example/concierge",
          getAuthToken: () => "secret_token",
          emit: () => undefined,
          captureEvidence: (record) => evidence.push(record),
          fetch: async () => ({ ok: false, status: 401, json: async () => ({ text: "Unauthorized" }) }),
        },
      ),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("auth_failure"),
  );

  assert.deepEqual(evidence, [
    {
      kind: "bridge_contract_evidence",
      operationId: "text_turn",
      requestKind: "text_turn",
      status: "fail_closed",
      reason: "auth_failure",
      httpStatus: 401,
      targetPath: "/v1/concierge/turn",
      traceId: "trace_auth_evidence",
      requestId: "cos_turn_auth_evidence",
      descriptorStatus: "ready",
      profileMode: "adult_owner",
      provenanceVerified: false,
    },
  ]);
  assert.equal(JSON.stringify(evidence).includes("secret_token"), false);
  assert.equal(JSON.stringify(evidence).includes("Send a private deployment summary"), false);
  assert.equal(JSON.stringify(evidence).includes("Unauthorized"), false);
});

test("live bridge fails closed when Napoleon returns deny or no-go governance", async () => {
  for (const outcome of ["deny", "no_go"] as const) {
    const evidence: unknown[] = [];
    const events: TelemetryPayload[] = [];
    await assert.rejects(
      () =>
        sendToNapoleon(
          {
            traceId: `trace_remote_${outcome}`,
            conversationId: `conv_remote_${outcome}`,
            turnId: `turn_remote_${outcome}`,
            profile: "adult_owner",
            channel: "text",
            message: "Send a private update outside Concierge",
          },
          {
            getEndpoint: () => "https://napoleon.example/concierge",
            emit: (event) => events.push(event),
            captureEvidence: (record) => evidence.push(record),
            fetch: async () => ({
              ok: true,
              status: 200,
              json: async () => ({
                text: "Napoleon denied this request.",
                governanceDecision: {
                  decision_id: `decision_remote_${outcome}`,
                  request_id: `cos_turn_remote_${outcome}`,
                  outcome,
                  authority_tier: "prohibited",
                  approval_requirement: "not_available",
                  rationale: "The request is not allowed through this path.",
                  blocked_effects: ["external_send", "memory_write", "agent_dispatch", "approval_capture"],
                  trace_id: `trace_remote_${outcome}`,
                  audit_id: `audit_remote_${outcome}`,
                },
                traceEnvelope: {
                  trace_id: `trace_remote_${outcome}`,
                  parent_trace_id: `conv_remote_${outcome}`,
                  actor_id: "napoleon.chief_of_staff",
                  request_id: `cos_turn_remote_${outcome}`,
                  decision_id: `decision_remote_${outcome}`,
                  timestamp: "2026-06-12T00:00:00.000Z",
                },
                auditEnvelope: {
                  audit_id: `audit_remote_${outcome}`,
                  trace_id: `trace_remote_${outcome}`,
                  decision_id: `decision_remote_${outcome}`,
                  actor_id: "napoleon.chief_of_staff",
                  authority_tier: "prohibited",
                  approval_requirement: "not_available",
                  evidence_links: [`trace:trace_remote_${outcome}`],
                },
              }),
            }),
          },
        ),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "NapoleonBridgeError" &&
        error.message.includes(outcome === "deny" ? "governance_denied" : "governance_no_go"),
    );

    assert.equal(events.at(-1)?.event, "bridge_request_failed");
    assert.equal(
      events.at(-1)?.attributes.reason,
      outcome === "deny" ? "governance_denied" : "governance_no_go",
    );
    assert.deepEqual(evidence, [
      {
        kind: "bridge_contract_evidence",
        operationId: "text_turn",
        requestKind: "text_turn",
        status: "fail_closed",
        reason: outcome === "deny" ? "governance_denied" : "governance_no_go",
        httpStatus: 200,
        targetPath: "/v1/concierge/turn",
        traceId: `trace_remote_${outcome}`,
        requestId: `cos_turn_remote_${outcome}`,
        decisionId: `decision_remote_${outcome}`,
        auditId: `audit_remote_${outcome}`,
        governanceOutcome: outcome,
        descriptorStatus: "ready",
        profileMode: "adult_owner",
        blockedEffects: ["external_send", "memory_write", "agent_dispatch", "approval_capture"],
        provenanceVerified: false,
      },
    ]);
    assert.equal(JSON.stringify(evidence).includes("Send a private update outside Concierge"), false);
    assert.equal(JSON.stringify(evidence).includes("Napoleon denied this request."), false);
  }
});

test("live bridge fails closed when Napoleon response omits trace or audit provenance", async () => {
  await assert.rejects(
    () =>
      sendToNapoleon(
        {
          traceId: "trace_missing_provenance",
          conversationId: "conv_missing_provenance",
          turnId: "turn_missing_provenance",
          profile: "adult_owner",
          channel: "text",
          message: "Draft the bridge plan",
        },
        {
          getEndpoint: () => "https://napoleon.example/concierge",
          emit: () => undefined,
          fetch: async () => ({
            ok: true,
            json: async () => ({
              text: "Prepared through Napoleon.",
              governanceDecision: {
                decision_id: "decision_missing_provenance",
                request_id: "cos_turn_missing_provenance",
                outcome: "allow_prepare_only",
                authority_tier: "prepare_only",
                approval_requirement: "none",
                rationale: "Prepared locally.",
                blocked_effects: ["external_send"],
                trace_id: "trace_missing_provenance",
                audit_id: "audit_missing_provenance",
              },
            }),
          }),
        },
      ),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch"),
  );
});

test("live bridge fails closed when delegation provenance disagrees with trace or audit envelope", async () => {
  await assert.rejects(
    () =>
      sendToNapoleon(
        {
          traceId: "trace_bad_delegate",
          conversationId: "conv_bad_delegate",
          turnId: "turn_bad_delegate",
          profile: "adult_owner",
          channel: "text",
          message: "Draft the bridge plan",
        },
        {
          getEndpoint: () => "https://napoleon.example/concierge",
          emit: () => undefined,
          fetch: async () => ({
            ok: true,
            json: async () => ({
              text: "Passive Brain found the prior rollout note.",
              governanceDecision: {
                decision_id: "decision_bad_delegate",
                request_id: "cos_turn_bad_delegate",
                outcome: "requires_review",
                authority_tier: "prepare_only",
                approval_requirement: "explicit_owner_approval",
                rationale: "External effects require owner approval.",
                blocked_effects: ["external_send"],
                trace_id: "trace_bad_delegate",
                audit_id: "audit_bad_delegate",
              },
              traceEnvelope: {
                trace_id: "trace_bad_delegate",
                parent_trace_id: "conv_bad_delegate",
                actor_id: "napoleon.chief_of_staff",
                request_id: "cos_turn_bad_delegate",
                decision_id: "decision_bad_delegate",
                timestamp: "2026-06-11T00:00:00.000Z",
              },
              auditEnvelope: {
                audit_id: "audit_bad_delegate",
                trace_id: "trace_bad_delegate",
                decision_id: "decision_bad_delegate",
                actor_id: "napoleon.chief_of_staff",
                authority_tier: "prepare_only",
                approval_requirement: "explicit_owner_approval",
                evidence_links: ["trace:trace_bad_delegate"],
              },
              delegation: {
                selectedAgents: [
                  {
                    agentId: "napoleon.passive_brain",
                    displayName: "Passive Brain",
                    selectionReason: "Relevant deployment history was found.",
                    contributionSummary: "Found the prior bridge rollout note.",
                  },
                ],
                allowedEffects: ["prepare_advisory_response"],
                blockedEffects: ["external_send"],
                governanceState: "requires_review",
                traceId: "trace_other",
                auditId: "audit_bad_delegate",
              },
            }),
          }),
        },
      ),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch"),
  );
});

test("live bridge fails closed before fetch when discovered descriptor checksum mismatches", async () => {
  let fetchCalled = false;

  await assert.rejects(
    () =>
      sendToNapoleon(
        {
          traceId: "trace_descriptor_mismatch",
          conversationId: "conv_descriptor_mismatch",
          turnId: "turn_descriptor_mismatch",
          profile: "adult_owner",
          channel: "text",
          message: "Draft the bridge plan",
        },
        {
          getEndpoint: () => "https://napoleon.example/concierge",
          descriptorConnection: {
            endpointConfigured: true,
            descriptor: defaultChiefOfStaffDescriptor,
            expectedChecksum: "sha256:expected",
            actualChecksum: "sha256:actual",
          },
          emit: () => undefined,
          fetch: async () => {
            fetchCalled = true;
            return { ok: true, json: async () => ({}) };
          },
        },
      ),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("descriptor_mismatch"),
  );

  assert.equal(fetchCalled, false);
});
