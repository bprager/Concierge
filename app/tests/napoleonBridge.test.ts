import assert from "node:assert/strict";
import test from "node:test";
import { sendToNapoleon } from "../src/napoleonBridge.js";
import { defaultChiefOfStaffDescriptor } from "../src/contractBridge.js";
import type { TelemetryPayload } from "../src/telemetry.js";

const textTurnBlockedEffects = [
  "runtime_authority",
  "command_execution",
  "task_routing",
  "agent_dispatch",
  "registry_runtime_activation",
  "graph_write",
  "memory_write",
  "audit_append",
  "event_publication",
  "approval_capture",
  "external_send",
  "service_control",
  "remediation",
];

const readyDescriptorConnection = {
  endpointConfigured: true,
  descriptor: defaultChiefOfStaffDescriptor,
  expectedChecksum: "sha256:local-static",
  actualChecksum: "sha256:local-static",
  signatureValid: true,
};

test("live bridge fails closed when no Napoleon endpoint is configured", async () => {
  const events: TelemetryPayload[] = [];
  const evidence: unknown[] = [];

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
          captureEvidence: (record) => evidence.push(record),
        },
      ),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("no_endpoint") &&
      (error as { profileMode?: string }).profileMode === "child_protected_user" &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(textTurnBlockedEffects),
  );

  assert.equal(events[0].event, "bridge_request_started");
  assert.equal(events.at(-1)?.event, "bridge_request_failed");
  assert.equal(events.at(-1)?.attributes.reason, "no_endpoint");
  assert.equal(events.at(-1)?.attributes.profileMode, "child_protected_user");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, textTurnBlockedEffects);
  assert.deepEqual((evidence[0] as { blockedEffects?: string[] }).blockedEffects, textTurnBlockedEffects);
});

test("live bridge fails closed before fetch when descriptor discovery has not completed", async () => {
  let fetchCalled = false;
  const events: TelemetryPayload[] = [];
  const evidence: unknown[] = [];

  await assert.rejects(
    () =>
      sendToNapoleon(
        {
          traceId: "trace_missing_descriptor_discovery",
          conversationId: "conv_missing_descriptor_discovery",
          turnId: "turn_missing_descriptor_discovery",
          profile: "adult_owner",
          channel: "text",
          message: "Draft the bridge plan",
        },
        {
          getEndpoint: () => "https://napoleon.example/concierge",
          emit: (event) => events.push(event),
          captureEvidence: (record) => evidence.push(record),
          fetch: async () => {
            fetchCalled = true;
            return { ok: true, json: async () => ({}) };
          },
        },
      ),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("descriptor_mismatch") &&
      (error as { descriptorFailureReason?: string }).descriptorFailureReason === "no_descriptor" &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(textTurnBlockedEffects),
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.attributes.descriptorFailureReason, "no_descriptor");
  assert.equal((evidence[0] as { descriptorFailureReason?: string }).descriptorFailureReason, "no_descriptor");
});

test("live bridge preserves descriptor discovery auth failure before fetch", async () => {
  let fetchCalled = false;

  await assert.rejects(
    () =>
      sendToNapoleon(
        {
          traceId: "trace_descriptor_auth_failure",
          conversationId: "conv_descriptor_auth_failure",
          turnId: "turn_descriptor_auth_failure",
          profile: "adult_owner",
          channel: "text",
          message: "Draft the bridge plan",
        },
        {
          getEndpoint: () => "https://napoleon.example/concierge",
          descriptorConnection: {
            endpointConfigured: true,
            descriptor: null,
            failClosedReason: "auth_failure",
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
      error.message.includes("auth_failure") &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(textTurnBlockedEffects),
  );

  assert.equal(fetchCalled, false);
});

test("live bridge fails closed before fetch when descriptor discovery cache is stale", async () => {
  let fetchCalled = false;
  const events: TelemetryPayload[] = [];
  const evidence: unknown[] = [];

  await assert.rejects(
    () =>
      sendToNapoleon(
        {
          traceId: "trace_descriptor_stale",
          conversationId: "conv_descriptor_stale",
          turnId: "turn_descriptor_stale",
          profile: "adult_owner",
          channel: "text",
          message: "Draft the bridge plan",
        },
        {
          getEndpoint: () => "https://napoleon.example/concierge",
          descriptorConnection: {
            ...readyDescriptorConnection,
            discoveredAt: "2026-06-16T10:00:00.000Z",
            maxAgeSeconds: 300,
            now: "2026-06-16T10:06:00.000Z",
          },
          emit: (event) => events.push(event),
          captureEvidence: (record) => evidence.push(record),
          fetch: async () => {
            fetchCalled = true;
            return { ok: true, json: async () => ({}) };
          },
        },
      ),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("descriptor_mismatch") &&
      (error as { descriptorFailureReason?: string }).descriptorFailureReason === "descriptor_stale",
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.attributes.descriptorFailureReason, "descriptor_stale");
  assert.equal((evidence[0] as { descriptorFailureReason?: string }).descriptorFailureReason, "descriptor_stale");
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
      descriptorConnection: readyDescriptorConnection,
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
    transport: "http_post",
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

test("live bridge adapts Napoleon advisory harness text-turn responses without side effects", async () => {
  let posted: Record<string, unknown> | undefined;
  let headers: Record<string, string> | undefined;
  let targetUrl: string | undefined;
  const evidence: unknown[] = [];

  const response = await sendToNapoleon(
    {
      traceId: "trace_cos_runtime",
      conversationId: "conv_cos_runtime",
      turnId: "turn_cos_runtime",
      profile: "adult_owner",
      channel: "text",
      message: "Summarize the governed bridge status",
    },
    {
      getEndpoint: () => "https://napoleon.example/cos/text-turn",
      descriptorConnection: readyDescriptorConnection,
      getAuthToken: () => "token_cos_runtime",
      emit: () => undefined,
      captureEvidence: (record) => evidence.push(record),
      fetch: async (url, init) => {
        targetUrl = url;
        headers = init?.headers;
        posted = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return {
          ok: true,
          status: 202,
          json: async () => ({
            schema_version: "napoleon/concierge/text-turn-response/v1",
            status: "accepted_for_prepare_only",
            answer: "Napoleon prepared an advisory status summary.",
            trace_id: "trace_cos_runtime",
            audit_id: "audit_cos_runtime",
            governance_decision: {
              schema_version: "napoleon/concierge/governance-decision/v1",
              decision: "allow_prepare_only",
              reason: "Advisory preparation only; blocked effects remain unavailable.",
              authority_tier: "prepare_only",
              blocked_effects: ["memory_write", "approval_capture", "agent_dispatch", "external_send"],
            },
            delegation_plan: {
              schema_version: "napoleon/concierge/delegation-plan/v1",
              status: "candidate_agents_or_no_safe_delegation",
              requested_capability: "napoleon.chief_of_staff",
              candidate_agents: [
                {
                  agent_id: "napoleon.passive_brain",
                  display_name: "Passive Brain",
                  selection_reason: "Relevant status memory was available for review.",
                  contribution_summary: "Found the latest bridge alignment note.",
                  runtime_invoked: false,
                },
              ],
              blocked_effects: ["memory_write", "approval_capture", "agent_dispatch", "external_send"],
            },
            blocked_effects: ["memory_write", "approval_capture", "agent_dispatch", "external_send"],
          }),
        };
      },
    },
  );

  assert.equal(targetUrl, "https://napoleon.example/cos/text-turn");
  assert.equal(posted?.contract_version, "napoleon/concierge/runtime-bridge-schema/v1");
  assert.equal(posted?.requested_capability, "napoleon.chief_of_staff");
  assert.equal(posted?.user_text, "Summarize the governed bridge status");
  assert.equal(headers?.["X-Napoleon-Auth"], "token_cos_runtime");
  assert.equal(headers?.Authorization, undefined);
  assert.equal(JSON.stringify(posted).includes("token_cos_runtime"), false);
  assert.equal(response.text, "Napoleon prepared an advisory status summary.");
  assert.equal(response.governanceDecision.outcome, "allow_prepare_only");
  assert.equal(response.requiresReview, false);
  assert.equal(response.delegation?.selectedAgents[0]?.displayName, "Passive Brain");
  assert.equal(response.delegation?.selectedAgents[0]?.contributionSummary, "Found the latest bridge alignment note.");
  assert.equal(response.delegation?.selectedAgents[0]?.selectionReason, "Relevant status memory was available for review.");
  assert.equal(response.delegation?.blockedEffects.includes("external_send"), true);
  assert.deepEqual(evidence, [
    {
      kind: "bridge_contract_evidence",
      operationId: "text_turn",
      requestKind: "text_turn",
      transport: "http_post",
      status: "success",
      httpStatus: 202,
      targetPath: "/cos/text-turn",
      traceId: "trace_cos_runtime",
      requestId: "cos_turn_cos_runtime",
      decisionId: "decision_trace_cos_runtime",
      auditId: "audit_cos_runtime",
      governanceOutcome: "allow_prepare_only",
      descriptorStatus: "ready",
      profileMode: "adult_owner",
      selectedAgentIds: ["napoleon.passive_brain"],
      allowedEffects: ["prepare_advisory_response"],
      blockedEffects: ["memory_write", "approval_capture", "agent_dispatch", "external_send"],
      provenanceVerified: true,
    },
  ]);
  assert.equal(JSON.stringify(evidence).includes("token_cos_runtime"), false);
  assert.equal(JSON.stringify(evidence).includes("Summarize the governed bridge status"), false);
  assert.equal(JSON.stringify(evidence).includes("Napoleon prepared an advisory status summary."), false);
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
            descriptorConnection: readyDescriptorConnection,
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
      transport: "http_post",
      status: "fail_closed",
      reason: "auth_failure",
      httpStatus: 401,
      targetPath: "/v1/concierge/turn",
      traceId: "trace_auth_evidence",
      requestId: "cos_turn_auth_evidence",
      descriptorStatus: "ready",
      profileMode: "adult_owner",
      provenanceVerified: false,
      blockedEffects: textTurnBlockedEffects,
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
            descriptorConnection: readyDescriptorConnection,
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
    assert.equal(events.at(-1)?.attributes.decisionId, `decision_remote_${outcome}`);
    assert.equal(events.at(-1)?.attributes.auditId, `audit_remote_${outcome}`);
    assert.equal(events.at(-1)?.attributes.governanceOutcome, outcome);
    const failure = events.at(-1);
    assert.deepEqual(failure?.attributes.blockedEffects, [
      "external_send",
      "memory_write",
      "agent_dispatch",
      "approval_capture",
    ]);
    assert.deepEqual(evidence, [
      {
        kind: "bridge_contract_evidence",
        operationId: "text_turn",
        requestKind: "text_turn",
        transport: "http_post",
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

    await assert.rejects(
      () =>
        sendToNapoleon(
          {
            traceId: `trace_remote_${outcome}_error`,
            conversationId: `conv_remote_${outcome}_error`,
            turnId: `turn_remote_${outcome}_error`,
            profile: "adult_owner",
            channel: "text",
            message: "Send a private update outside Concierge",
          },
          {
            getEndpoint: () => "https://napoleon.example/concierge",
            descriptorConnection: readyDescriptorConnection,
            emit: () => undefined,
            fetch: async () => ({
              ok: true,
              status: 200,
              json: async () => ({
                text: "Napoleon denied this request.",
                governanceDecision: {
                  decision_id: `decision_remote_${outcome}_error`,
                  request_id: `cos_turn_remote_${outcome}_error`,
                  outcome,
                  authority_tier: "prohibited",
                  approval_requirement: "not_available",
                  rationale: "The request is not allowed through this path.",
                  blocked_effects: ["external_send", "memory_write", "agent_dispatch", "approval_capture"],
                  trace_id: `trace_remote_${outcome}_error`,
                  audit_id: `audit_remote_${outcome}_error`,
                },
                traceEnvelope: {
                  trace_id: `trace_remote_${outcome}_error`,
                  parent_trace_id: `conv_remote_${outcome}_error`,
                  actor_id: "napoleon.chief_of_staff",
                  request_id: `cos_turn_remote_${outcome}_error`,
                  decision_id: `decision_remote_${outcome}_error`,
                  timestamp: "2026-06-12T00:00:00.000Z",
                },
                auditEnvelope: {
                  audit_id: `audit_remote_${outcome}_error`,
                  trace_id: `trace_remote_${outcome}_error`,
                  decision_id: `decision_remote_${outcome}_error`,
                  actor_id: "napoleon.chief_of_staff",
                  authority_tier: "prohibited",
                  approval_requirement: "not_available",
                  evidence_links: [`trace:trace_remote_${outcome}_error`],
                },
              }),
            }),
          },
        ),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "NapoleonBridgeError" &&
        (error as { decisionId?: string }).decisionId === `decision_remote_${outcome}_error` &&
        (error as { auditId?: string }).auditId === `audit_remote_${outcome}_error` &&
        (error as { governanceOutcome?: string }).governanceOutcome === outcome &&
        "blockedEffects" in error &&
        JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) ===
          JSON.stringify(["external_send", "memory_write", "agent_dispatch", "approval_capture"]),
    );
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
          descriptorConnection: readyDescriptorConnection,
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

test("live bridge fails closed when Napoleon response body cannot be read", async () => {
  const events: TelemetryPayload[] = [];
  const evidence: unknown[] = [];

  await assert.rejects(
    () =>
      sendToNapoleon(
        {
          traceId: "trace_unreadable_body",
          conversationId: "conv_unreadable_body",
          turnId: "turn_unreadable_body",
          profile: "adult_owner",
          channel: "text",
          message: "Draft the bridge plan",
        },
        {
          getEndpoint: () => "https://napoleon.example/concierge",
          descriptorConnection: readyDescriptorConnection,
          emit: (event) => events.push(event),
          captureEvidence: (record) => evidence.push(record),
          fetch: async () => ({
            ok: true,
            status: 200,
            json: async () => {
              throw new Error("private malformed response body detail");
            },
          }),
        },
      ),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch") &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(textTurnBlockedEffects),
  );

  assert.equal(events.at(-1)?.event, "bridge_request_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, textTurnBlockedEffects);
  assert.equal(JSON.stringify(events).includes("private malformed response body detail"), false);
  assert.deepEqual((evidence.at(-1) as { blockedEffects?: string[] }).blockedEffects, textTurnBlockedEffects);
});

test("live bridge fails closed when Napoleon response omits canonical required text field", async () => {
  await assert.rejects(
    () =>
      sendToNapoleon(
        {
          traceId: "trace_missing_required_text",
          conversationId: "conv_missing_required_text",
          turnId: "turn_missing_required_text",
          profile: "adult_owner",
          channel: "text",
          message: "Draft the bridge plan",
        },
        {
          getEndpoint: () => "https://napoleon.example/concierge",
          descriptorConnection: readyDescriptorConnection,
          emit: () => undefined,
          fetch: async () => ({
            ok: true,
            status: 200,
            json: async () => ({
              governanceDecision: {
                decision_id: "decision_missing_required_text",
                request_id: "cos_turn_missing_required_text",
                outcome: "allow_prepare_only",
                authority_tier: "prepare_only",
                approval_requirement: "none",
                rationale: "Prepared locally.",
                blocked_effects: ["external_send"],
                trace_id: "trace_missing_required_text",
                audit_id: "audit_missing_required_text",
              },
              traceEnvelope: {
                trace_id: "trace_missing_required_text",
                parent_trace_id: "conv_missing_required_text",
                actor_id: "napoleon.chief_of_staff",
                request_id: "cos_turn_missing_required_text",
                decision_id: "decision_missing_required_text",
                timestamp: "2026-06-12T00:00:00.000Z",
              },
              auditEnvelope: {
                audit_id: "audit_missing_required_text",
                trace_id: "trace_missing_required_text",
                decision_id: "decision_missing_required_text",
                actor_id: "napoleon.chief_of_staff",
                authority_tier: "prepare_only",
                approval_requirement: "none",
                evidence_links: ["trace:trace_missing_required_text"],
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

test("live bridge fails closed when response text invents selected-agent attribution", async () => {
  await assert.rejects(
    () =>
      sendToNapoleon(
        {
          traceId: "trace_unproven_agent_text",
          conversationId: "conv_unproven_agent_text",
          turnId: "turn_unproven_agent_text",
          profile: "adult_owner",
          channel: "text",
          message: "Draft the bridge plan",
        },
        {
          getEndpoint: () => "https://napoleon.example/concierge",
          descriptorConnection: readyDescriptorConnection,
          emit: () => undefined,
          fetch: async () => ({
            ok: true,
            status: 200,
            json: async () => ({
              text: "Passive Brain found the prior rollout note.",
              governanceDecision: {
                decision_id: "decision_unproven_agent_text",
                request_id: "cos_turn_unproven_agent_text",
                outcome: "requires_review",
                authority_tier: "prepare_only",
                approval_requirement: "explicit_owner_approval",
                rationale: "External effects require owner approval.",
                blocked_effects: ["external_send"],
                trace_id: "trace_unproven_agent_text",
                audit_id: "audit_unproven_agent_text",
              },
              traceEnvelope: {
                trace_id: "trace_unproven_agent_text",
                parent_trace_id: "conv_unproven_agent_text",
                actor_id: "napoleon.chief_of_staff",
                request_id: "cos_turn_unproven_agent_text",
                decision_id: "decision_unproven_agent_text",
                timestamp: "2026-06-12T00:00:00.000Z",
              },
              auditEnvelope: {
                audit_id: "audit_unproven_agent_text",
                trace_id: "trace_unproven_agent_text",
                decision_id: "decision_unproven_agent_text",
                actor_id: "napoleon.chief_of_staff",
                authority_tier: "prepare_only",
                approval_requirement: "explicit_owner_approval",
                evidence_links: ["trace:trace_unproven_agent_text"],
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

test("live bridge fails closed when response text invents Napoleon recommendation attribution", async () => {
  await assert.rejects(
    () =>
      sendToNapoleon(
        {
          traceId: "trace_unproven_recommendation_text",
          conversationId: "conv_unproven_recommendation_text",
          turnId: "turn_unproven_recommendation_text",
          profile: "adult_owner",
          channel: "text",
          message: "Draft the bridge plan",
        },
        {
          getEndpoint: () => "https://napoleon.example/concierge",
          descriptorConnection: readyDescriptorConnection,
          emit: () => undefined,
          fetch: async () => ({
            ok: true,
            status: 200,
            json: async () => ({
              text: "Napoleon recommends preparing the bridge rollout plan for review.",
              governanceDecision: {
                decision_id: "decision_unproven_recommendation_text",
                request_id: "cos_turn_unproven_recommendation_text",
                outcome: "requires_review",
                authority_tier: "prepare_only",
                approval_requirement: "explicit_owner_approval",
                rationale: "External effects require owner approval.",
                blocked_effects: ["external_send"],
                trace_id: "trace_unproven_recommendation_text",
                audit_id: "audit_unproven_recommendation_text",
              },
              traceEnvelope: {
                trace_id: "trace_unproven_recommendation_text",
                parent_trace_id: "conv_unproven_recommendation_text",
                actor_id: "napoleon.chief_of_staff",
                request_id: "cos_turn_unproven_recommendation_text",
                decision_id: "decision_unproven_recommendation_text",
                timestamp: "2026-06-12T00:00:00.000Z",
              },
              auditEnvelope: {
                audit_id: "audit_unproven_recommendation_text",
                trace_id: "trace_unproven_recommendation_text",
                decision_id: "decision_unproven_recommendation_text",
                actor_id: "napoleon.chief_of_staff",
                authority_tier: "prepare_only",
                approval_requirement: "explicit_owner_approval",
                evidence_links: ["trace:trace_unproven_recommendation_text"],
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

test("live bridge fails closed when returned recommendation provenance mismatches response envelopes", async () => {
  await assert.rejects(
    () =>
      sendToNapoleon(
        {
          traceId: "trace_mismatched_recommendation_provenance",
          conversationId: "conv_mismatched_recommendation_provenance",
          turnId: "turn_mismatched_recommendation_provenance",
          profile: "adult_owner",
          channel: "text",
          message: "Draft the bridge plan",
        },
        {
          getEndpoint: () => "https://napoleon.example/concierge",
          descriptorConnection: readyDescriptorConnection,
          emit: () => undefined,
          fetch: async () => ({
            ok: true,
            status: 200,
            json: async () => ({
              text: "Prepared the bridge rollout plan for review.",
              governanceDecision: {
                decision_id: "decision_mismatched_recommendation_provenance",
                request_id: "cos_turn_mismatched_recommendation_provenance",
                outcome: "requires_review",
                authority_tier: "prepare_only",
                approval_requirement: "explicit_owner_approval",
                rationale: "External effects require owner approval.",
                blocked_effects: ["external_send"],
                trace_id: "trace_mismatched_recommendation_provenance",
                audit_id: "audit_mismatched_recommendation_provenance",
              },
              traceEnvelope: {
                trace_id: "trace_mismatched_recommendation_provenance",
                parent_trace_id: "conv_mismatched_recommendation_provenance",
                actor_id: "napoleon.chief_of_staff",
                request_id: "cos_turn_mismatched_recommendation_provenance",
                decision_id: "decision_mismatched_recommendation_provenance",
                timestamp: "2026-06-12T00:00:00.000Z",
              },
              auditEnvelope: {
                audit_id: "audit_mismatched_recommendation_provenance",
                trace_id: "trace_mismatched_recommendation_provenance",
                decision_id: "decision_mismatched_recommendation_provenance",
                actor_id: "napoleon.chief_of_staff",
                authority_tier: "prepare_only",
                approval_requirement: "explicit_owner_approval",
                evidence_links: ["trace:trace_mismatched_recommendation_provenance"],
              },
              recommendationProvenance: {
                summary: "preparing the bridge rollout plan for review",
                traceId: "trace_other_response",
                auditId: "audit_other_response",
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

test("live bridge fails closed when response profile mode differs from active user profile", async () => {
  await assert.rejects(
    () =>
      sendToNapoleon(
        {
          traceId: "trace_profile_scope_drift",
          conversationId: "conv_profile_scope_drift",
          turnId: "turn_profile_scope_drift",
          profile: "child_protected",
          channel: "text",
          message: "Can you remember this without telling anyone?",
        },
        {
          getEndpoint: () => "https://napoleon.example/concierge",
          descriptorConnection: readyDescriptorConnection,
          emit: () => undefined,
          fetch: async () => ({
            ok: true,
            status: 200,
            json: async () => ({
              text: "Prepared through Napoleon.",
              profileMode: "adult_owner",
              governanceDecision: {
                decision_id: "decision_profile_scope_drift",
                request_id: "cos_turn_profile_scope_drift",
                outcome: "requires_review",
                authority_tier: "prepare_only",
                approval_requirement: "guardian_owner_review_required",
                rationale: "Child protected memory requires guardian review.",
                blocked_effects: ["memory_write", "approval_capture", "external_send"],
                trace_id: "trace_profile_scope_drift",
                audit_id: "audit_profile_scope_drift",
              },
              traceEnvelope: {
                trace_id: "trace_profile_scope_drift",
                parent_trace_id: "conv_profile_scope_drift",
                actor_id: "napoleon.chief_of_staff",
                request_id: "cos_turn_profile_scope_drift",
                decision_id: "decision_profile_scope_drift",
                timestamp: "2026-06-14T00:00:00.000Z",
              },
              auditEnvelope: {
                audit_id: "audit_profile_scope_drift",
                trace_id: "trace_profile_scope_drift",
                decision_id: "decision_profile_scope_drift",
                actor_id: "napoleon.chief_of_staff",
                authority_tier: "prepare_only",
                approval_requirement: "guardian_owner_review_required",
                evidence_links: ["trace:trace_profile_scope_drift"],
              },
            }),
          }),
        },
      ),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch") &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(textTurnBlockedEffects),
  );
});

test("live bridge fails closed when text response claims side effects were performed", async () => {
  const events: TelemetryPayload[] = [];
  const evidence: unknown[] = [];

  await assert.rejects(
    () =>
      sendToNapoleon(
        {
          traceId: "trace_text_side_effect_claim",
          conversationId: "conv_text_side_effect_claim",
          turnId: "turn_text_side_effect_claim",
          profile: "adult_owner",
          channel: "text",
          message: "Prepare and send the bridge plan",
        },
        {
          getEndpoint: () => "https://napoleon.example/concierge",
          descriptorConnection: readyDescriptorConnection,
          emit: (event) => events.push(event),
          captureEvidence: (record) => evidence.push(record),
          fetch: async () => ({
            ok: true,
            status: 200,
            json: async () => ({
              text: "Napoleon prepared the bridge plan and sent it.",
              governanceDecision: {
                decision_id: "decision_text_side_effect_claim",
                request_id: "cos_turn_text_side_effect_claim",
                outcome: "requires_review",
                authority_tier: "prepare_only",
                approval_requirement: "explicit_owner_approval",
                rationale: "External effects require owner approval.",
                blocked_effects: ["external_send", "memory_write", "agent_dispatch", "approval_capture"],
                trace_id: "trace_text_side_effect_claim",
                audit_id: "audit_text_side_effect_claim",
              },
              traceEnvelope: {
                trace_id: "trace_text_side_effect_claim",
                parent_trace_id: "conv_text_side_effect_claim",
                actor_id: "napoleon.chief_of_staff",
                request_id: "cos_turn_text_side_effect_claim",
                decision_id: "decision_text_side_effect_claim",
                timestamp: "2026-06-13T00:00:00.000Z",
              },
              auditEnvelope: {
                audit_id: "audit_text_side_effect_claim",
                trace_id: "trace_text_side_effect_claim",
                decision_id: "decision_text_side_effect_claim",
                actor_id: "napoleon.chief_of_staff",
                authority_tier: "prepare_only",
                approval_requirement: "explicit_owner_approval",
                evidence_links: ["trace:trace_text_side_effect_claim"],
              },
              memoryWritePerformed: true,
              approvalCaptured: true,
              externalSendPerformed: true,
              agentDispatchPerformed: true,
              appliedLocally: true,
            }),
          }),
        },
      ),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch") &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(textTurnBlockedEffects),
  );

  assert.equal(events.at(-1)?.event, "bridge_request_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, textTurnBlockedEffects);
  assert.equal((evidence.at(-1) as { status?: string; reason?: string }).status, "fail_closed");
  assert.equal((evidence.at(-1) as { status?: string; reason?: string }).reason, "contract_mismatch");
});

test("live bridge accepts Napoleon recommendation text when provenance matches response envelopes", async () => {
  const response = await sendToNapoleon(
    {
      traceId: "trace_proven_recommendation_text",
      conversationId: "conv_proven_recommendation_text",
      turnId: "turn_proven_recommendation_text",
      profile: "adult_owner",
      channel: "text",
      message: "Draft the bridge plan",
    },
    {
      getEndpoint: () => "https://napoleon.example/concierge",
      descriptorConnection: readyDescriptorConnection,
      emit: () => undefined,
      fetch: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          text: "Napoleon recommends preparing the bridge rollout plan for review.",
          governanceDecision: {
            decision_id: "decision_proven_recommendation_text",
            request_id: "cos_turn_proven_recommendation_text",
            outcome: "requires_review",
            authority_tier: "prepare_only",
            approval_requirement: "explicit_owner_approval",
            rationale: "External effects require owner approval.",
            blocked_effects: ["external_send"],
            trace_id: "trace_proven_recommendation_text",
            audit_id: "audit_proven_recommendation_text",
          },
          traceEnvelope: {
            trace_id: "trace_proven_recommendation_text",
            parent_trace_id: "conv_proven_recommendation_text",
            actor_id: "napoleon.chief_of_staff",
            request_id: "cos_turn_proven_recommendation_text",
            decision_id: "decision_proven_recommendation_text",
            timestamp: "2026-06-12T00:00:00.000Z",
          },
          auditEnvelope: {
            audit_id: "audit_proven_recommendation_text",
            trace_id: "trace_proven_recommendation_text",
            decision_id: "decision_proven_recommendation_text",
            actor_id: "napoleon.chief_of_staff",
            authority_tier: "prepare_only",
            approval_requirement: "explicit_owner_approval",
            evidence_links: ["trace:trace_proven_recommendation_text"],
          },
          recommendationProvenance: {
            summary: "preparing the bridge rollout plan for review",
            traceId: "trace_proven_recommendation_text",
            auditId: "audit_proven_recommendation_text",
          },
        }),
      }),
    },
  );

  assert.equal(response.text, "Napoleon recommends preparing the bridge rollout plan for review.");
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
          descriptorConnection: readyDescriptorConnection,
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
  const events: TelemetryPayload[] = [];
  const evidence: unknown[] = [];

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
          emit: (event) => events.push(event),
          captureEvidence: (record) => evidence.push(record),
          fetch: async () => {
            fetchCalled = true;
            return { ok: true, json: async () => ({}) };
          },
        },
      ),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("descriptor_mismatch") &&
      (error as { descriptorFailureReason?: string }).descriptorFailureReason ===
        "descriptor_signature_or_checksum_mismatch",
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.attributes.descriptorFailureReason, "descriptor_signature_or_checksum_mismatch");
  assert.equal(
    (evidence[0] as { descriptorFailureReason?: string }).descriptorFailureReason,
    "descriptor_signature_or_checksum_mismatch",
  );
});
