import assert from "node:assert/strict";
import test from "node:test";
import {
  BRIDGE_OPERATIONS,
  GENERATED_BRIDGE_CONTRACT_SOURCE,
  NAPOLEON_REVIEW_OPERATIONS,
  buildEvolutionProposalReviewBridgeTarget,
  buildGovernanceReviewBridgeTarget,
  buildNapoleonBridgeUrl,
  buildNapoleonReviewUrl,
  describeBridgeOperationSummary,
  describeTaxonomyReviewBridgeSummary,
  getBridgeOperation,
  getNapoleonReviewOperation,
} from "../src/bridgeOperations.js";

const { readFileSync } = await import("node:fs");

type OperationShape = {
  path: string;
  transport: string;
  governedBridgeOnly: boolean;
  tokenPlacement: string;
  responseRequired: readonly string[];
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

function openApiEnumAfter(anchor: string, enumKey: string, occurrence = 0): string[] {
  const yaml = readFileSync("../api/napoleon_bridge.openapi.yaml", "utf8");
  const starts = [...yaml.matchAll(new RegExp(anchor, "g"))].map((match) => match.index ?? -1);
  const start = starts[occurrence] ?? -1;
  assert.notEqual(start, -1, `missing OpenAPI anchor: ${anchor} occurrence ${occurrence}`);
  const afterAnchor = yaml.slice(start);
  const enumStart = afterAnchor.indexOf(enumKey);
  assert.notEqual(enumStart, -1, `missing enum key after ${anchor}: ${enumKey}`);
  const afterEnum = afterAnchor.slice(enumStart);
  const nextProperty = afterEnum.match(/\n\s{20}[a-zA-Z][A-Za-z0-9]+:\n/);
  const propertyBlock = nextProperty ? afterEnum.slice(0, nextProperty.index) : afterEnum;
  const inlineEnum = propertyBlock.match(/enum:\s*\[([^\]]+)\]/);
  if (inlineEnum) {
    return inlineEnum[1].split(",").map((value) => value.trim());
  }
  const lines = propertyBlock.split("\n");
  const enumLine = lines.findIndex((line) => line.trim() === "enum:");
  assert.notEqual(enumLine, -1, `missing enum block after ${anchor}: ${enumKey}`);
  const values: string[] = [];
  for (const line of lines.slice(enumLine + 1)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- ")) break;
    values.push(trimmed.slice(2));
  }
  return values;
}

test("bridge operation registry matches canonical OpenAPI concierge paths", () => {
  const registryPaths = (BRIDGE_OPERATIONS as OperationShape[]).map((operation) => operation.path).sort();

  assert.equal(GENERATED_BRIDGE_CONTRACT_SOURCE, "api/napoleon_bridge.openapi.yaml");
  assert.deepEqual(registryPaths, openApiPaths());
});

test("OpenAPI descriptor connection enums match runtime fail-closed states", () => {
  const expectedStates = [
    "no_endpoint",
    "missing_descriptor",
    "descriptor_mismatch",
    "auth_failure",
    "bridge_timeout",
    "http_failure",
    "ready",
  ];
  const expectedFailClosedReasons = [
    "no_endpoint",
    "no_descriptor",
    "descriptor_invalid",
    "descriptor_signature_or_checksum_mismatch",
    "descriptor_stale",
    "auth_failure",
    "bridge_timeout",
    "http_failure",
  ];

  for (const occurrence of [0, 1, 2]) {
    assert.deepEqual(openApiEnumAfter("descriptorConnection:", "state:", occurrence), expectedStates);
    assert.deepEqual(
      openApiEnumAfter("descriptorConnection:", "failClosedReason:", occurrence),
      expectedFailClosedReasons,
    );
  }
});

test("bridge operations declare governed transport and bearer-token policy", () => {
  const transports = openApiTransports();
  for (const operation of BRIDGE_OPERATIONS as OperationShape[]) {
    assert.equal(operation.transport, transports[operation.path]);
    assert.equal(operation.governedBridgeOnly, true);
    assert.equal(operation.tokenPlacement, "authorization_header_only");
  }

  assert.equal(getBridgeOperation("chief_of_staff_descriptor").transport, "http_get");
  assert.equal(getBridgeOperation("chief_of_staff_capabilities").requestKind, "chief_of_staff_capabilities");
  assert.equal(getBridgeOperation("text_turn").requestKind, "text_turn");
  assert.equal(getBridgeOperation("chief_of_staff_steering").requestKind, "chief_of_staff_steering_handoff");
  assert.equal(getBridgeOperation("memory_proposal_review").requestKind, "memory_proposal_review_handoff");
  assert.equal(
    getNapoleonReviewOperation("evolution_proposal_review").requestKind,
    "evolution_proposal_review_handoff",
  );
  assert.equal(
    getNapoleonReviewOperation("evolution_proposal_review").path,
    "/chief-of-staff/reviews/evolution-proposals",
  );
  assert.equal(getNapoleonReviewOperation("governance_review").requestKind, "governance_review_handoff");
  assert.equal(getNapoleonReviewOperation("governance_review").path, "/chief-of-staff/reviews/governance");
  assert.deepEqual(
    NAPOLEON_REVIEW_OPERATIONS.map((operation) => operation.governedBridgeOnly),
    [true, true],
  );
});

test("bridge operation registry exposes canonical required response fields", () => {
  assert.deepEqual(getBridgeOperation("text_turn").responseRequired, [
    "text",
    "governanceDecision",
    "traceEnvelope",
    "auditEnvelope",
  ]);
  assert.deepEqual(getBridgeOperation("chief_of_staff_descriptor").responseRequired, [
    "serviceId",
    "ready",
    "runtimeAuthority",
    "cachePolicy",
    "blockedEffects",
  ]);
  assert.deepEqual(getBridgeOperation("chief_of_staff_capabilities").responseRequired, [
    "serviceId",
    "capabilities",
    "runtimeAuthority",
    "blockedEffects",
  ]);
  assert.deepEqual(getBridgeOperation("chief_of_staff_steering").responseRequired, [
    "text",
    "governanceDecision",
    "traceEnvelope",
    "auditEnvelope",
    "appliedLocally",
    "memoryWritePerformed",
    "approvalCaptured",
    "agentDispatchPerformed",
    "externalSendPerformed",
  ]);
  assert.deepEqual(getBridgeOperation("memory_proposal_review").responseRequired, [
    "text",
    "governanceDecision",
    "traceEnvelope",
    "auditEnvelope",
    "memoryWritePerformed",
    "approvalCaptured",
    "agentDispatchPerformed",
    "externalSendPerformed",
  ]);
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

test("bridge URL builder normalizes known operation URLs before resolving another operation", () => {
  assert.equal(
    buildNapoleonBridgeUrl(
      "https://napoleon.example/concierge/v1/concierge/chief-of-staff/descriptor",
      "text_turn",
    ),
    "https://napoleon.example/concierge/v1/concierge/turn",
  );
  assert.equal(
    buildNapoleonBridgeUrl(
      "https://napoleon.example/concierge/v1/concierge/memory-proposals",
      "chief_of_staff_steering",
    ),
    "https://napoleon.example/concierge/v1/concierge/chief-of-staff/steering",
  );
  assert.equal(
    buildNapoleonBridgeUrl("https://napoleon.example/concierge/v1/concierge/evaluate", "memory_proposal_review"),
    "https://napoleon.example/concierge/v1/concierge/memory-proposals",
  );
});

test("bridge URL builder drops pasted operation query strings before resolving another operation", () => {
  assert.equal(
    buildNapoleonBridgeUrl(
      "https://napoleon.example/concierge/v1/concierge/chief-of-staff/descriptor?cache=skip#debug",
      "text_turn",
    ),
    "https://napoleon.example/concierge/v1/concierge/turn",
  );
});

test("Napoleon review URL builder resolves explicit governance review paths", () => {
  assert.equal(
    buildNapoleonReviewUrl("https://napoleon.example", "evolution_proposal_review"),
    "https://napoleon.example/chief-of-staff/reviews/evolution-proposals",
  );
  assert.equal(
    buildNapoleonReviewUrl(
      "https://napoleon.example/chief-of-staff/reviews/evolution-proposals?debug=1",
      "evolution_proposal_review",
    ),
    "https://napoleon.example/chief-of-staff/reviews/evolution-proposals",
  );
  assert.equal(
    buildNapoleonReviewUrl("https://napoleon.example", "governance_review"),
    "https://napoleon.example/chief-of-staff/reviews/governance",
  );
  assert.equal(
    buildNapoleonReviewUrl(
      "https://napoleon.example/chief-of-staff/reviews/governance?debug=1",
      "governance_review",
    ),
    "https://napoleon.example/chief-of-staff/reviews/governance",
  );
});

test("evolution proposal review target keeps generated Concierge endpoints compatible", () => {
  assert.deepEqual(buildEvolutionProposalReviewBridgeTarget("https://napoleon.example/concierge"), {
    url: "https://napoleon.example/concierge/v1/concierge/chief-of-staff/steering",
    path: "/v1/concierge/chief-of-staff/steering",
    requestKind: "chief_of_staff_steering_handoff",
    operationId: "chief_of_staff_steering",
  });
  assert.deepEqual(
    buildEvolutionProposalReviewBridgeTarget("https://napoleon.example/concierge/v1/concierge/chief-of-staff/steering"),
    {
      url: "https://napoleon.example/concierge/v1/concierge/chief-of-staff/steering",
      path: "/v1/concierge/chief-of-staff/steering",
      requestKind: "chief_of_staff_steering_handoff",
      operationId: "chief_of_staff_steering",
    },
  );
  assert.deepEqual(buildEvolutionProposalReviewBridgeTarget("http://127.0.0.1:8787"), {
    url: "http://127.0.0.1:8787/v1/concierge/chief-of-staff/steering",
    path: "/v1/concierge/chief-of-staff/steering",
    requestKind: "chief_of_staff_steering_handoff",
    operationId: "chief_of_staff_steering",
  });
});

test("evolution proposal review target maps Napoleon root endpoints to the explicit review contract path", () => {
  assert.deepEqual(buildEvolutionProposalReviewBridgeTarget("https://napoleon.example"), {
    url: "https://napoleon.example/chief-of-staff/reviews/evolution-proposals",
    path: "/chief-of-staff/reviews/evolution-proposals",
    requestKind: "evolution_proposal_review_handoff",
    operationId: "evolution_proposal_review",
  });
  assert.deepEqual(
    buildEvolutionProposalReviewBridgeTarget("https://napoleon.example/chief-of-staff/reviews/evolution-proposals"),
    {
      url: "https://napoleon.example/chief-of-staff/reviews/evolution-proposals",
      path: "/chief-of-staff/reviews/evolution-proposals",
      requestKind: "evolution_proposal_review_handoff",
      operationId: "evolution_proposal_review",
    },
  );
});

test("governance review target keeps generated Concierge endpoints compatible", () => {
  assert.deepEqual(buildGovernanceReviewBridgeTarget("https://napoleon.example/concierge"), {
    url: "https://napoleon.example/concierge/v1/concierge/chief-of-staff/steering",
    path: "/v1/concierge/chief-of-staff/steering",
    requestKind: "chief_of_staff_steering_handoff",
    operationId: "chief_of_staff_steering",
  });
  assert.deepEqual(
    buildGovernanceReviewBridgeTarget("https://napoleon.example/concierge/v1/concierge/chief-of-staff/steering"),
    {
      url: "https://napoleon.example/concierge/v1/concierge/chief-of-staff/steering",
      path: "/v1/concierge/chief-of-staff/steering",
      requestKind: "chief_of_staff_steering_handoff",
      operationId: "chief_of_staff_steering",
    },
  );
  assert.deepEqual(buildGovernanceReviewBridgeTarget("http://127.0.0.1:8787"), {
    url: "http://127.0.0.1:8787/v1/concierge/chief-of-staff/steering",
    path: "/v1/concierge/chief-of-staff/steering",
    requestKind: "chief_of_staff_steering_handoff",
    operationId: "chief_of_staff_steering",
  });
});

test("governance review target maps Napoleon root endpoints to the explicit review contract path", () => {
  assert.deepEqual(buildGovernanceReviewBridgeTarget("https://napoleon.example"), {
    url: "https://napoleon.example/chief-of-staff/reviews/governance",
    path: "/chief-of-staff/reviews/governance",
    requestKind: "governance_review_handoff",
    operationId: "governance_review",
  });
  assert.deepEqual(buildGovernanceReviewBridgeTarget("https://napoleon.example/chief-of-staff/reviews/governance"), {
    url: "https://napoleon.example/chief-of-staff/reviews/governance",
    path: "/chief-of-staff/reviews/governance",
    requestKind: "governance_review_handoff",
    operationId: "governance_review",
  });
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
  assert.deepEqual(summary.requiredResponseFields, ["text", "governanceDecision", "traceEnvelope", "auditEnvelope"]);
  assert.equal(summary.requiredResponseSummary, "text, governanceDecision, traceEnvelope, auditEnvelope");
  assert.equal(JSON.stringify(summary).includes("https://napoleon.example"), false);
  assert.equal(JSON.stringify(summary).includes("secret-token"), false);

  const descriptorSummary = describeBridgeOperationSummary("chief_of_staff_descriptor");
  assert.equal(descriptorSummary.transport, "HTTP GET");
  assert.equal(
    descriptorSummary.requiredResponseSummary,
    "serviceId, ready, runtimeAuthority, cachePolicy, blockedEffects",
  );
});

test("describes all core governed operation routes for the UI", () => {
  const summaries = [
    describeBridgeOperationSummary("chief_of_staff_descriptor"),
    describeBridgeOperationSummary("chief_of_staff_capabilities"),
    describeBridgeOperationSummary("text_turn"),
    describeBridgeOperationSummary("memory_proposal_review"),
    describeBridgeOperationSummary("chief_of_staff_steering"),
    describeTaxonomyReviewBridgeSummary(),
  ];

  assert.deepEqual(
    summaries.map((summary) => summary.label),
    [
      "Descriptor discovery",
      "Chief of Staff capabilities",
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
      "/v1/concierge/chief-of-staff/capabilities",
      "/v1/concierge/turn",
      "/v1/concierge/memory-proposals",
      "/v1/concierge/chief-of-staff/steering",
      "/v1/concierge/chief-of-staff/steering",
    ],
  );
  assert.equal(summaries.at(-1)?.operationId, "chief_of_staff_steering");
  assert.equal(summaries.at(-1)?.requestKind, "chief_of_staff_steering_handoff");
  assert.deepEqual(summaries.at(-1)?.requiredResponseFields, [
    "text",
    "governanceDecision",
    "traceEnvelope",
    "auditEnvelope",
    "appliedLocally",
    "memoryWritePerformed",
    "approvalCaptured",
    "agentDispatchPerformed",
    "externalSendPerformed",
  ]);
});
