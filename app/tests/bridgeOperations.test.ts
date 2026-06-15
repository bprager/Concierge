import assert from "node:assert/strict";
import test from "node:test";
import {
  BRIDGE_OPERATIONS,
  GENERATED_BRIDGE_CONTRACT_SOURCE,
  buildNapoleonBridgeUrl,
  describeBridgeOperationSummary,
  describeTaxonomyReviewBridgeSummary,
  getBridgeOperation,
} from "../src/bridgeOperations.js";

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

function openApiTransports(): Record<string, string> {
  const yaml = readFileSync("../api/napoleon_bridge.openapi.yaml", "utf8");
  const transports: Record<string, string> = {};
  const blocks = [...yaml.matchAll(/^  (\/v1\/concierge\/[^:]+):\n((?:    .*\n)+)/gm)];
  for (const block of blocks) {
    const path = block[1];
    const body = block[2] ?? "";
    if (/^    get:/m.test(body)) transports[path] = "http_get";
    if (/^    post:/m.test(body)) transports[path] = "http_post";
  }
  return transports;
}

test("bridge operation registry matches canonical OpenAPI concierge paths", () => {
  const registryPaths = (BRIDGE_OPERATIONS as OperationShape[]).map((operation) => operation.path).sort();

  assert.equal(GENERATED_BRIDGE_CONTRACT_SOURCE, "api/napoleon_bridge.openapi.yaml");
  assert.deepEqual(registryPaths, openApiPaths());
});

test("bridge operations declare governed transport and bearer-token policy", () => {
  const transports = openApiTransports();
  for (const operation of BRIDGE_OPERATIONS as OperationShape[]) {
    assert.equal(operation.transport, transports[operation.path]);
    assert.equal(operation.governedBridgeOnly, true);
    assert.equal(operation.tokenPlacement, "authorization_header_only");
  }

  assert.equal(getBridgeOperation("chief_of_staff_descriptor").transport, "http_get");
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

test("describes governed bridge operation routes without endpoint hosts or secrets", () => {
  const summary = describeBridgeOperationSummary("text_turn");

  assert.equal(summary.label, "Text turn");
  assert.equal(summary.path, "/v1/concierge/turn");
  assert.equal(summary.requestKind, "text_turn");
  assert.equal(summary.transport, "HTTP POST");
  assert.equal(summary.boundary, "Governed Napoleon bridge only");
  assert.equal(summary.tokenHandling, "Bearer token is sent only in the Authorization header");
  assert.equal(summary.sideEffects, "No memory write, approval capture, agent dispatch, or external send is performed by Concierge");
  assert.equal(JSON.stringify(summary).includes("https://napoleon.example"), false);
  assert.equal(JSON.stringify(summary).includes("secret-token"), false);

  const descriptorSummary = describeBridgeOperationSummary("chief_of_staff_descriptor");
  assert.equal(descriptorSummary.transport, "HTTP GET");
});

test("describes all core governed operation routes for the UI", () => {
  const summaries = [
    describeBridgeOperationSummary("chief_of_staff_descriptor"),
    describeBridgeOperationSummary("text_turn"),
    describeBridgeOperationSummary("memory_proposal_review"),
    describeBridgeOperationSummary("chief_of_staff_steering"),
    describeTaxonomyReviewBridgeSummary(),
  ];

  assert.deepEqual(
    summaries.map((summary) => summary.label),
    [
      "Descriptor discovery",
      "Text turn",
      "Memory proposal review",
      "Chief of Staff steering",
      "Chief of Staff taxonomy review",
    ],
  );
  assert.deepEqual(
    summaries.map((summary) => summary.path),
    [
      "/v1/concierge/chief-of-staff/descriptor",
      "/v1/concierge/turn",
      "/v1/concierge/memory-proposals",
      "/v1/concierge/chief-of-staff/steering",
      "/v1/concierge/chief-of-staff/steering",
    ],
  );
  assert.equal(summaries.at(-1)?.operationId, "chief_of_staff_steering");
  assert.equal(summaries.at(-1)?.requestKind, "chief_of_staff_steering_handoff");
});
