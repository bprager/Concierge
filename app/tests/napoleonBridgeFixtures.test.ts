import assert from "node:assert/strict";
import test from "node:test";
import {
  createNapoleonBridgeFixtureFetch,
  napoleonBridgeFixtures,
} from "../src/napoleonBridgeFixtures.js";
import { NapoleonBridgeError, sendToNapoleon } from "../src/napoleonBridge.js";
import { defaultChiefOfStaffDescriptor } from "../src/contractBridge.js";

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
