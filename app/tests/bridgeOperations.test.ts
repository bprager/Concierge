import assert from "node:assert/strict";
import test from "node:test";
import {
  BRIDGE_OPERATIONS,
  GENERATED_BRIDGE_CONTRACT_SOURCE,
  buildNapoleonBridgeUrl,
  getBridgeOperation,
} from "../src/bridgeOperations.js";

// @ts-expect-error The app test config omits Node fs typings, but the Node test runner provides this module.
const { readFileSync } = await import("node:fs");

type OperationShape = {
  path: string;
  transport: string;
  governedBridgeOnly: boolean;
  tokenPlacement: string;
};

function openApiPaths(): string[] {
  const yaml = readFileSync("../api/napoleon_bridge.openapi.yaml", "utf8");
  const matches = [...yaml.matchAll(/^  (\/v1\/concierge\/[^:]+):$/gm)];
  return matches.map((match) => match[1]).sort();
}

test("bridge operation registry matches canonical OpenAPI concierge paths", () => {
  const registryPaths = (BRIDGE_OPERATIONS as OperationShape[]).map((operation) => operation.path).sort();

  assert.equal(GENERATED_BRIDGE_CONTRACT_SOURCE, "api/napoleon_bridge.openapi.yaml");
  assert.deepEqual(registryPaths, openApiPaths());
});

test("bridge operations declare governed transport and bearer-token policy", () => {
  for (const operation of BRIDGE_OPERATIONS as OperationShape[]) {
    assert.equal(operation.transport, "http_post");
    assert.equal(operation.governedBridgeOnly, true);
    assert.equal(operation.tokenPlacement, "authorization_header_only");
  }

  assert.equal(getBridgeOperation("text_turn").requestKind, "text_turn");
  assert.equal(getBridgeOperation("chief_of_staff_steering").requestKind, "chief_of_staff_steering_handoff");
  assert.equal(getBridgeOperation("memory_proposal_review").requestKind, "memory_proposal_review_handoff");
});

test("bridge URL builder resolves base URLs and already-specific operation URLs", () => {
  assert.equal(
    buildNapoleonBridgeUrl("https://napoleon.example/concierge", "memory_proposal_review"),
    "https://napoleon.example/concierge/v1/concierge/memory-proposals",
  );
  assert.equal(
    buildNapoleonBridgeUrl(
      "https://napoleon.example/concierge/v1/concierge/chief-of-staff/steering",
      "chief_of_staff_steering",
    ),
    "https://napoleon.example/concierge/v1/concierge/chief-of-staff/steering",
  );
});
