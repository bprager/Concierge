import assert from "node:assert/strict";
import test from "node:test";
import {
  createNapoleonBridgeFixtureFetch,
  napoleonBridgeFixtures,
} from "../src/napoleonBridgeFixtures.js";
import { NapoleonBridgeError, sendToNapoleon } from "../src/napoleonBridge.js";
import { defaultChiefOfStaffDescriptor } from "../src/contractBridge.js";
import type { BridgeContractEvidence } from "../src/napoleonBridge.js";

const request = {
  traceId: "trace_fixture",
  conversationId: "conv_fixture",
  turnId: "turn_fixture",
  profile: "adult_owner",
  channel: "text",
  message: "Ask Napoleon for the bridge rollout recommendation",
} as const;

const readyDescriptorConnection = {
  endpointConfigured: true,
  descriptor: defaultChiefOfStaffDescriptor,
  expectedChecksum: "sha256:local-static",
  actualChecksum: "sha256:local-static",
  signatureValid: true,
};

test("delegated success fixture exercises live bridge provenance contract", async () => {
  const response = await sendToNapoleon(request, {
    getEndpoint: () => "https://napoleon.example/v1/concierge/turn",
    descriptorConnection: readyDescriptorConnection,
    emit: () => undefined,
    fetch: createNapoleonBridgeFixtureFetch(napoleonBridgeFixtures.delegatedSuccess),
  });

  assert.equal(response.text, "Napoleon recommends preparing the bridge rollout plan for review.");
  assert.equal(response.governanceDecision.outcome, "requires_review");
  assert.equal(response.auditEnvelope.audit_id, "audit_fixture_delegate");
  assert.equal(response.delegation?.selectedAgents[0]?.displayName, "Passive Brain");
  assert.equal(response.delegation?.selectedAgents[0]?.contributionSummary, "Recovered the prior bridge rollout note.");
  assert.ok(response.delegation?.blockedEffects.includes("external_send"));
});

test("failure fixtures map to fail-closed bridge reasons", async () => {
  await assert.rejects(
    () =>
      sendToNapoleon(request, {
        getEndpoint: () => "https://napoleon.example/v1/concierge/turn",
        descriptorConnection: readyDescriptorConnection,
        emit: () => undefined,
        fetch: createNapoleonBridgeFixtureFetch(napoleonBridgeFixtures.authFailure),
      }),
    (error: unknown) =>
      error instanceof NapoleonBridgeError &&
      error.reason === "auth_failure" &&
      error.status === 401,
  );

  await assert.rejects(
    () =>
      sendToNapoleon(request, {
        getEndpoint: () => "https://napoleon.example/v1/concierge/turn",
        descriptorConnection: readyDescriptorConnection,
        emit: () => undefined,
        fetch: createNapoleonBridgeFixtureFetch(napoleonBridgeFixtures.contractMismatch),
      }),
    (error: unknown) => error instanceof NapoleonBridgeError && error.reason === "contract_mismatch",
  );

  await assert.rejects(
    () =>
      sendToNapoleon(request, {
        getEndpoint: () => "https://napoleon.example/v1/concierge/turn",
        descriptorConnection: readyDescriptorConnection,
        emit: () => undefined,
        fetch: createNapoleonBridgeFixtureFetch(napoleonBridgeFixtures.timeout),
      }),
    (error: unknown) => error instanceof NapoleonBridgeError && error.reason === "bridge_timeout",
  );
});

test("remote runtime review fixtures remain prepare-only and side-effect-free", async () => {
  const memoryEvidence: BridgeContractEvidence[] = [];
  const memoryResponse = await sendToNapoleon(request, {
    getEndpoint: () => "https://napoleon.example/v1/concierge/turn",
    descriptorConnection: readyDescriptorConnection,
    emit: () => undefined,
    captureEvidence: (record) => memoryEvidence.push(record),
    fetch: createNapoleonBridgeFixtureFetch(napoleonBridgeFixtures.memoryProposal),
  });

  assert.equal(memoryResponse.text, "Napoleon prepared a memory proposal for manual review only.");
  assert.equal(memoryResponse.governanceDecision.outcome, "requires_review");
  assert.equal(memoryResponse.requiresReview, true);
  assert.equal(memoryResponse.targetAgent, "napoleon.memory_review");
  assert.ok(memoryResponse.governanceDecision.blocked_effects.includes("memory_write"));
  assert.equal(memoryEvidence[0]?.status, "success");
  assert.equal(memoryEvidence[0]?.provenanceVerified, true);
  assert.ok(memoryEvidence[0]?.blockedEffects?.includes("memory_write"));
  assert.ok(memoryEvidence[0]?.blockedEffects?.includes("agent_dispatch"));

  const evolutionEvidence: BridgeContractEvidence[] = [];
  const evolutionResponse = await sendToNapoleon(request, {
    getEndpoint: () => "https://napoleon.example/v1/concierge/turn",
    descriptorConnection: readyDescriptorConnection,
    emit: () => undefined,
    captureEvidence: (record) => evolutionEvidence.push(record),
    fetch: createNapoleonBridgeFixtureFetch(napoleonBridgeFixtures.evolutionRecommendation),
  });

  assert.equal(evolutionResponse.text, "Napoleon prepared an evolution recommendation for manual review only.");
  assert.equal(evolutionResponse.governanceDecision.outcome, "requires_review");
  assert.equal(evolutionResponse.requiresReview, true);
  assert.equal(evolutionResponse.targetAgent, "napoleon.evolution_review");
  assert.ok(evolutionResponse.governanceDecision.blocked_effects.includes("runtime_authority"));
  assert.equal(evolutionEvidence[0]?.status, "success");
  assert.equal(evolutionEvidence[0]?.provenanceVerified, true);
  assert.ok(evolutionEvidence[0]?.blockedEffects?.includes("runtime_authority"));
  assert.ok(evolutionEvidence[0]?.blockedEffects?.includes("approval_capture"));
});

test("remote runtime denied fixtures fail closed with governance proof", async () => {
  const deniedEvidence: BridgeContractEvidence[] = [];
  await assert.rejects(
    () =>
      sendToNapoleon(request, {
        getEndpoint: () => "https://napoleon.example/v1/concierge/turn",
        descriptorConnection: readyDescriptorConnection,
        emit: () => undefined,
        captureEvidence: (record) => deniedEvidence.push(record),
        fetch: createNapoleonBridgeFixtureFetch(napoleonBridgeFixtures.deniedAction),
      }),
    (error: unknown) =>
      error instanceof NapoleonBridgeError &&
      error.reason === "governance_denied" &&
      error.governanceOutcome === "deny" &&
      error.decisionId === "decision_fixture_denied_action" &&
      error.auditId === "audit_fixture_denied_action" &&
      error.blockedEffects.includes("graph_write") &&
      error.blockedEffects.includes("agent_dispatch"),
  );
  assert.equal(deniedEvidence[0]?.status, "fail_closed");
  assert.equal(deniedEvidence[0]?.reason, "governance_denied");
  assert.equal(deniedEvidence[0]?.decisionId, "decision_fixture_denied_action");
  assert.equal(deniedEvidence[0]?.auditId, "audit_fixture_denied_action");

  const childEvidence: BridgeContractEvidence[] = [];
  await assert.rejects(
    () =>
      sendToNapoleon(
        {
          ...request,
          profile: "child_protected",
          message: "Ask Napoleon for a child protected bridge recommendation",
        },
        {
          getEndpoint: () => "https://napoleon.example/v1/concierge/turn",
          descriptorConnection: readyDescriptorConnection,
          emit: () => undefined,
          captureEvidence: (record) => childEvidence.push(record),
          fetch: createNapoleonBridgeFixtureFetch(napoleonBridgeFixtures.childProfile),
        },
      ),
    (error: unknown) =>
      error instanceof NapoleonBridgeError &&
      error.reason === "governance_denied" &&
      error.profileMode === "child_protected_user" &&
      error.governanceOutcome === "deny" &&
      error.decisionId === "decision_fixture_child_profile" &&
      error.auditId === "audit_fixture_child_profile" &&
      error.blockedEffects.includes("memory_write") &&
      error.blockedEffects.includes("external_send"),
  );
  assert.equal(childEvidence[0]?.status, "fail_closed");
  assert.equal(childEvidence[0]?.reason, "governance_denied");
  assert.equal(childEvidence[0]?.profileMode, "child_protected_user");
  assert.equal(childEvidence[0]?.decisionId, "decision_fixture_child_profile");
  assert.equal(childEvidence[0]?.auditId, "audit_fixture_child_profile");
});
