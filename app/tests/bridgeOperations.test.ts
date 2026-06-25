import assert from "node:assert/strict";
import test from "node:test";
import {
  BRIDGE_OPERATIONS,
  GENERATED_BRIDGE_CONTRACT_SOURCE,
  GENERATED_NAPOLEON_DISCOVERY_OPERATIONS,
  GENERATED_NAPOLEON_REVIEW_OPERATIONS,
  NAPOLEON_DISCOVERY_OPERATIONS,
  NAPOLEON_REVIEW_OPERATIONS,
  RUNTIME_CONTRACT_ALIGNMENT_SUMMARY,
  buildAgentManifestBridgeTarget,
  buildAgentManifestListBridgeTarget,
  buildChiefOfStaffRequestBridgeTarget,
  buildEvolutionProposalSubmissionBridgeTarget,
  buildEvaluationReviewBridgeTarget,
  buildEvolutionProposalReviewBridgeTarget,
  buildGovernanceEvaluationBridgeTarget,
  buildGovernanceReviewBridgeTarget,
  buildNewAgentProposalReviewBridgeTarget,
  buildNapoleonBridgeUrl,
  buildNapoleonDiscoveryUrl,
  buildNapoleonReviewUrl,
  buildObservabilityTraceBridgeTarget,
  buildProfileBridgeTarget,
  describeBridgeOperationSummary,
  describeNapoleonReviewOperationSummary,
  describeTaxonomyReviewBridgeSummary,
  getBridgeOperation,
  getNapoleonDiscoveryOperation,
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

function bridgeOperationsSource(): string {
  return readFileSync("src/bridgeOperations.ts", "utf8");
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

test("bridge operation TypeScript IDs are derived from generated OpenAPI operations", () => {
  const source = bridgeOperationsSource();

  assert.match(source, /type\s+GeneratedBridgeOperation\s*=/);
  assert.match(source, /export\s+type\s+BridgeOperationId\s*=\s*GeneratedBridgeOperation\["id"\]/);
  assert.doesNotMatch(source, /export\s+type\s+BridgeOperationId\s*=\s*\|/);
});

test("named Napoleon review operations are generated from canonical contract metadata", () => {
  assert.deepEqual(
    GENERATED_NAPOLEON_REVIEW_OPERATIONS.map((operation) => [
      operation.id,
      operation.path,
      operation.requestKind,
    ]),
    NAPOLEON_REVIEW_OPERATIONS.map((operation) => [
      operation.id,
      operation.path,
      operation.requestKind,
    ]),
  );
});

test("named Napoleon discovery operations are generated from canonical contract metadata", () => {
  assert.deepEqual(
    GENERATED_NAPOLEON_DISCOVERY_OPERATIONS.map((operation) => [
      operation.id,
      operation.path,
      operation.requestKind,
    ]),
    NAPOLEON_DISCOVERY_OPERATIONS.map((operation) => [
      operation.id,
      operation.path,
      operation.requestKind,
    ]),
  );
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
  assert.equal(getNapoleonReviewOperation("chief_of_staff_request").requestKind, "chief_of_staff_request_handoff");
  assert.equal(getNapoleonReviewOperation("chief_of_staff_request").path, "/chief-of-staff/requests");
  assert.equal(getNapoleonReviewOperation("evaluation_review").requestKind, "evaluation_review_handoff");
  assert.equal(getNapoleonReviewOperation("evaluation_review").path, "/chief-of-staff/reviews/evaluation");
  assert.equal(
    getNapoleonReviewOperation("governance_evaluation").requestKind,
    "governance_evaluation_handoff",
  );
  assert.equal(getNapoleonReviewOperation("governance_evaluation").path, "/governance/evaluate");
  assert.equal(
    getNapoleonReviewOperation("evolution_proposal_review").requestKind,
    "evolution_proposal_review_handoff",
  );
  assert.equal(
    getNapoleonReviewOperation("evolution_proposal_review").path,
    "/chief-of-staff/reviews/evolution-proposals",
  );
  assert.equal(
    getNapoleonReviewOperation("evolution_proposal_submission").requestKind,
    "evolution_proposal_submission_handoff",
  );
  assert.equal(getNapoleonReviewOperation("evolution_proposal_submission").path, "/evolution/proposals");
  assert.equal(
    getNapoleonReviewOperation("evolution_proposal_status").requestKind,
    "evolution_proposal_status_handoff",
  );
  assert.equal(getNapoleonReviewOperation("evolution_proposal_status").path, "/evolution/proposals/{proposal_id}/status");
  assert.equal(getNapoleonReviewOperation("evolution_proposal_status").transport, "http_get");
  assert.equal(getNapoleonReviewOperation("governance_review").requestKind, "governance_review_handoff");
  assert.equal(getNapoleonReviewOperation("governance_review").path, "/chief-of-staff/reviews/governance");
  assert.equal(getNapoleonReviewOperation("observability_trace").requestKind, "observability_trace_handoff");
  assert.equal(getNapoleonReviewOperation("observability_trace").path, "/observability/traces");
  assert.equal(
    getNapoleonReviewOperation("new_agent_proposal_review").requestKind,
    "new_agent_proposal_review_handoff",
  );
  assert.equal(
    getNapoleonReviewOperation("new_agent_proposal_review").path,
    "/chief-of-staff/reviews/new-agent-proposals",
  );
  assert.deepEqual(
    NAPOLEON_REVIEW_OPERATIONS.map((operation) => operation.governedBridgeOnly),
    [true, true, true, true, true, true, true, true, true],
  );
});

test("Napoleon discovery operations declare metadata-only governed targets", () => {
  assert.deepEqual(
    NAPOLEON_DISCOVERY_OPERATIONS.map((operation) => operation.path),
    ["/agents", "/agents/{agent_id}", "/profiles/{profile_id}"],
  );
  assert.equal(getNapoleonDiscoveryOperation("agent_manifest_list").requestKind, "agent_manifest_discovery");
  assert.equal(getNapoleonDiscoveryOperation("agent_manifest").requestKind, "agent_manifest_discovery");
  assert.equal(getNapoleonDiscoveryOperation("profile").requestKind, "profile_metadata_discovery");
  assert.deepEqual(
    NAPOLEON_DISCOVERY_OPERATIONS.map((operation) => operation.governedBridgeOnly),
    [true, true, true],
  );
  assert.deepEqual(
    NAPOLEON_DISCOVERY_OPERATIONS.map((operation) => operation.tokenPlacement),
    ["authorization_header_only", "authorization_header_only", "authorization_header_only"],
  );
  assert.deepEqual(getNapoleonDiscoveryOperation("agent_manifest").responseRequired, [
    "agentId",
    "runtimeAuthority",
    "agentDispatchPerformed",
    "blockedEffects",
  ]);
  assert.deepEqual(getNapoleonDiscoveryOperation("profile").responseRequired, [
    "profileId",
    "runtimeAuthority",
    "memoryWritePerformed",
    "approvalCaptured",
    "blockedEffects",
  ]);
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
    buildNapoleonReviewUrl("https://napoleon.example", "chief_of_staff_request"),
    "https://napoleon.example/chief-of-staff/requests",
  );
  assert.equal(
    buildNapoleonReviewUrl("https://napoleon.example/chief-of-staff/requests?debug=1", "chief_of_staff_request"),
    "https://napoleon.example/chief-of-staff/requests",
  );
  assert.equal(
    buildNapoleonReviewUrl("https://napoleon.example", "governance_evaluation"),
    "https://napoleon.example/governance/evaluate",
  );
  assert.equal(
    buildNapoleonReviewUrl("https://napoleon.example/governance/evaluate?debug=1", "governance_evaluation"),
    "https://napoleon.example/governance/evaluate",
  );
  assert.equal(
    buildNapoleonReviewUrl("https://napoleon.example", "evaluation_review"),
    "https://napoleon.example/chief-of-staff/reviews/evaluation",
  );
  assert.equal(
    buildNapoleonReviewUrl("https://napoleon.example/chief-of-staff/reviews/evaluation?debug=1", "evaluation_review"),
    "https://napoleon.example/chief-of-staff/reviews/evaluation",
  );
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
    buildNapoleonReviewUrl("https://napoleon.example", "evolution_proposal_submission"),
    "https://napoleon.example/evolution/proposals",
  );
  assert.equal(
    buildNapoleonReviewUrl("https://napoleon.example/evolution/proposals?debug=1", "evolution_proposal_submission"),
    "https://napoleon.example/evolution/proposals",
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
  assert.equal(
    buildNapoleonReviewUrl("https://napoleon.example", "observability_trace"),
    "https://napoleon.example/observability/traces",
  );
  assert.equal(
    buildNapoleonReviewUrl("https://napoleon.example/observability/traces?debug=1", "observability_trace"),
    "https://napoleon.example/observability/traces",
  );
  assert.equal(
    buildNapoleonReviewUrl("https://napoleon.example", "new_agent_proposal_review"),
    "https://napoleon.example/chief-of-staff/reviews/new-agent-proposals",
  );
  assert.equal(
    buildNapoleonReviewUrl(
      "https://napoleon.example/chief-of-staff/reviews/new-agent-proposals?debug=1",
      "new_agent_proposal_review",
    ),
    "https://napoleon.example/chief-of-staff/reviews/new-agent-proposals",
  );
});

test("Napoleon discovery URL builder resolves explicit agent and profile metadata paths", () => {
  assert.equal(
    buildNapoleonDiscoveryUrl("https://napoleon.example", "agent_manifest_list"),
    "https://napoleon.example/agents",
  );
  assert.equal(
    buildNapoleonDiscoveryUrl("https://napoleon.example/agents?debug=1", "agent_manifest_list"),
    "https://napoleon.example/agents",
  );
  assert.equal(
    buildNapoleonDiscoveryUrl("https://napoleon.example", "agent_manifest", { agentId: "passive brain/one" }),
    "https://napoleon.example/agents/passive%20brain%2Fone",
  );
  assert.equal(
    buildNapoleonDiscoveryUrl("https://napoleon.example/agents/passive_brain?debug=1", "agent_manifest", {
      agentId: "chief_of_staff",
    }),
    "https://napoleon.example/agents/chief_of_staff",
  );
  assert.equal(
    buildNapoleonDiscoveryUrl("https://napoleon.example", "profile", { profileId: "child protected" }),
    "https://napoleon.example/profiles/child%20protected",
  );
  assert.equal(
    buildNapoleonDiscoveryUrl("https://napoleon.example/profiles/adult_owner?debug=1", "profile", {
      profileId: "child_protected",
    }),
    "https://napoleon.example/profiles/child_protected",
  );
});

test("Napoleon discovery bridge targets expose metadata-only side effect boundaries", () => {
  assert.deepEqual(buildAgentManifestListBridgeTarget("https://napoleon.example"), {
    url: "https://napoleon.example/agents",
    path: "/agents",
    requestKind: "agent_manifest_discovery",
    operationId: "agent_manifest_list",
  });
  assert.deepEqual(buildAgentManifestBridgeTarget("https://napoleon.example", "passive_brain"), {
    url: "https://napoleon.example/agents/passive_brain",
    path: "/agents/{agent_id}",
    requestKind: "agent_manifest_discovery",
    operationId: "agent_manifest",
  });
  assert.deepEqual(buildProfileBridgeTarget("https://napoleon.example", "adult_owner"), {
    url: "https://napoleon.example/profiles/adult_owner",
    path: "/profiles/{profile_id}",
    requestKind: "profile_metadata_discovery",
    operationId: "profile",
  });
});

test("governance evaluation target maps Napoleon endpoints to the explicit evaluation contract path", () => {
  assert.deepEqual(buildGovernanceEvaluationBridgeTarget("https://napoleon.example"), {
    url: "https://napoleon.example/governance/evaluate",
    path: "/governance/evaluate",
    requestKind: "governance_evaluation_handoff",
    operationId: "governance_evaluation",
  });
  assert.deepEqual(buildGovernanceEvaluationBridgeTarget("https://napoleon.example/governance/evaluate?debug=1"), {
    url: "https://napoleon.example/governance/evaluate",
    path: "/governance/evaluate",
    requestKind: "governance_evaluation_handoff",
    operationId: "governance_evaluation",
  });
});

test("Chief of Staff request target maps Napoleon endpoints to the explicit request contract path", () => {
  assert.deepEqual(buildChiefOfStaffRequestBridgeTarget("https://napoleon.example"), {
    url: "https://napoleon.example/chief-of-staff/requests",
    path: "/chief-of-staff/requests",
    requestKind: "chief_of_staff_request_handoff",
    operationId: "chief_of_staff_request",
  });
  assert.deepEqual(buildChiefOfStaffRequestBridgeTarget("https://napoleon.example/chief-of-staff/requests?debug=1"), {
    url: "https://napoleon.example/chief-of-staff/requests",
    path: "/chief-of-staff/requests",
    requestKind: "chief_of_staff_request_handoff",
    operationId: "chief_of_staff_request",
  });
});

test("evaluation review target keeps generated Concierge endpoints compatible", () => {
  assert.deepEqual(buildEvaluationReviewBridgeTarget("https://napoleon.example/concierge"), {
    url: "https://napoleon.example/concierge/v1/concierge/evaluate",
    path: "/v1/concierge/evaluate",
    requestKind: "evaluator_prompt",
    operationId: "evaluate",
  });
  assert.deepEqual(buildEvaluationReviewBridgeTarget("http://127.0.0.1:8787"), {
    url: "http://127.0.0.1:8787/v1/concierge/evaluate",
    path: "/v1/concierge/evaluate",
    requestKind: "evaluator_prompt",
    operationId: "evaluate",
  });
});

test("evaluation review target maps Napoleon root endpoints to the explicit review contract path", () => {
  assert.deepEqual(buildEvaluationReviewBridgeTarget("https://napoleon.example"), {
    url: "https://napoleon.example/chief-of-staff/reviews/evaluation",
    path: "/chief-of-staff/reviews/evaluation",
    requestKind: "evaluation_review_handoff",
    operationId: "evaluation_review",
  });
  assert.deepEqual(buildEvaluationReviewBridgeTarget("https://napoleon.example/chief-of-staff/reviews/evaluation"), {
    url: "https://napoleon.example/chief-of-staff/reviews/evaluation",
    path: "/chief-of-staff/reviews/evaluation",
    requestKind: "evaluation_review_handoff",
    operationId: "evaluation_review",
  });
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

test("evolution proposal submission target maps Napoleon endpoints to the explicit proposal contract path", () => {
  assert.deepEqual(buildEvolutionProposalSubmissionBridgeTarget("https://napoleon.example"), {
    url: "https://napoleon.example/evolution/proposals",
    path: "/evolution/proposals",
    requestKind: "evolution_proposal_submission_handoff",
    operationId: "evolution_proposal_submission",
  });
  assert.deepEqual(buildEvolutionProposalSubmissionBridgeTarget("https://napoleon.example/evolution/proposals?debug=1"), {
    url: "https://napoleon.example/evolution/proposals",
    path: "/evolution/proposals",
    requestKind: "evolution_proposal_submission_handoff",
    operationId: "evolution_proposal_submission",
  });
});

test("observability trace target maps Napoleon endpoints to the explicit trace evidence contract path", () => {
  assert.deepEqual(buildObservabilityTraceBridgeTarget("https://napoleon.example"), {
    url: "https://napoleon.example/observability/traces",
    path: "/observability/traces",
    requestKind: "observability_trace_handoff",
    operationId: "observability_trace",
  });
  assert.deepEqual(buildObservabilityTraceBridgeTarget("https://napoleon.example/observability/traces?debug=1"), {
    url: "https://napoleon.example/observability/traces",
    path: "/observability/traces",
    requestKind: "observability_trace_handoff",
    operationId: "observability_trace",
  });
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

test("new agent proposal review target maps Napoleon endpoints to the explicit review contract path", () => {
  assert.deepEqual(buildNewAgentProposalReviewBridgeTarget("https://napoleon.example"), {
    url: "https://napoleon.example/chief-of-staff/reviews/new-agent-proposals",
    path: "/chief-of-staff/reviews/new-agent-proposals",
    requestKind: "new_agent_proposal_review_handoff",
    operationId: "new_agent_proposal_review",
  });
  assert.deepEqual(
    buildNewAgentProposalReviewBridgeTarget(
      "https://napoleon.example/chief-of-staff/reviews/new-agent-proposals?debug=1",
    ),
    {
      url: "https://napoleon.example/chief-of-staff/reviews/new-agent-proposals",
      path: "/chief-of-staff/reviews/new-agent-proposals",
      requestKind: "new_agent_proposal_review_handoff",
      operationId: "new_agent_proposal_review",
    },
  );
});

test("describes governed bridge operation routes without endpoint hosts or secrets", () => {
  const summary = describeBridgeOperationSummary("text_turn");

  assert.equal(summary.label, "Text turn");
  assert.equal(summary.path, "/v1/concierge/turn");
  assert.equal(summary.requestKind, "text_turn");
  assert.equal(summary.transport, "HTTP POST");
  assert.equal(
    summary.boundary,
    "text-turn Napoleon bridge target; no local approval capture, memory write, agent dispatch, external send, registry update, trace append, task routing, or local application.",
  );
  assert.equal(
    summary.tokenHandling,
    "Bearer token is sent only in the Authorization header for generated routes or X-Napoleon-Auth for explicit /cos advisory routes",
  );
  assert.equal(
    summary.sideEffects,
    "No approval capture, memory write, agent dispatch, external send, registry update, trace append, task routing, or application is performed by Concierge",
  );
  assert.deepEqual(summary.requiredResponseFields, ["text", "governanceDecision", "traceEnvelope", "auditEnvelope"]);
  assert.equal(summary.requiredResponseSummary, "text, governanceDecision, traceEnvelope, auditEnvelope");
  assert.deepEqual(summary.acceptedEndpointForms, [
    "/cos",
    "/cos/descriptor",
    "/cos/capabilities",
    "/cos/text-turn",
  ]);
  assert.equal(
    summary.acceptedEndpointSummary,
    "Accepted explicit advisory forms: /cos, /cos/descriptor, /cos/capabilities, /cos/text-turn; live sends normalize to /cos/text-turn and require matching /cos/trace/{trace_id} proof.",
  );
  assert.equal(summary.requiredProofSummary, "/cos/trace/{trace_id}");
  assert.equal(JSON.stringify(summary).includes("https://napoleon.example"), false);
  assert.equal(JSON.stringify(summary).includes("secret-token"), false);

  const descriptorSummary = describeBridgeOperationSummary("chief_of_staff_descriptor");
  assert.equal(descriptorSummary.transport, "HTTP GET");
  assert.equal(
    descriptorSummary.boundary,
    "descriptor-discovery Napoleon bridge target; no local approval, runtime authority grant, registry update, memory write, agent dispatch, external send, trace append, routing, or local application.",
  );
  assert.equal(
    descriptorSummary.sideEffects,
    "No approval, runtime authority grant, registry update, memory write, agent dispatch, external send, trace append, routing, or application is performed by Concierge",
  );
  assert.equal(
    descriptorSummary.requiredResponseSummary,
    "serviceId, ready, runtimeAuthority, cachePolicy, blockedEffects",
  );
});

test("describes memory proposal review without local memory or approval authority", () => {
  const summary = describeBridgeOperationSummary("memory_proposal_review");

  assert.equal(summary.label, "Memory proposal review");
  assert.equal(summary.path, "/v1/concierge/memory-proposals");
  assert.equal(summary.requestKind, "memory_proposal_review_handoff");
  assert.equal(
    summary.boundary,
    "proposal-review Napoleon bridge target; no local memory write, approval capture, agent dispatch, external send, registry update, trace append, task routing, or local application.",
  );
  assert.equal(
    summary.sideEffects,
    "No memory write, approval capture, agent dispatch, external send, registry update, trace append, task routing, or application is performed by Concierge",
  );
  assert.equal(summary.requiredResponseSummary.includes("memoryWritePerformed"), true);
  assert.equal(JSON.stringify(summary).includes("https://napoleon.example"), false);
  assert.equal(JSON.stringify(summary).includes("secret-token"), false);
});

test("describes Chief of Staff steering without local evolution or routing authority", () => {
  const summary = describeBridgeOperationSummary("chief_of_staff_steering");

  assert.equal(summary.label, "Chief of Staff steering");
  assert.equal(summary.path, "/v1/concierge/chief-of-staff/steering");
  assert.equal(summary.requestKind, "chief_of_staff_steering_handoff");
  assert.equal(
    summary.boundary,
    "Chief of Staff steering Napoleon bridge target; no local evolution application, approval capture, registry update, memory write, agent dispatch, external send, trace append, routing, or local application.",
  );
  assert.equal(
    summary.sideEffects,
    "No evolution application, approval capture, registry update, memory write, agent dispatch, external send, trace append, routing, or application is performed by Concierge",
  );
  assert.equal(summary.requiredResponseSummary.includes("appliedLocally"), true);
  assert.equal(JSON.stringify(summary).includes("https://napoleon.example"), false);
  assert.equal(JSON.stringify(summary).includes("secret-token"), false);
});

test("describes runtime contract alignment without treating path drift as authority", () => {
  assert.equal(RUNTIME_CONTRACT_ALIGNMENT_SUMMARY.aligned, false);
  assert.equal(RUNTIME_CONTRACT_ALIGNMENT_SUMMARY.runtimeAligned, true);
  assert.equal(RUNTIME_CONTRACT_ALIGNMENT_SUMMARY.status, "runtime_mapped_with_local_contract_paths");
  assert.equal(RUNTIME_CONTRACT_ALIGNMENT_SUMMARY.unmappedNapoleonRuntimePaths.length, 0);
  assert.match(RUNTIME_CONTRACT_ALIGNMENT_SUMMARY.summary, /Runtime mapped/);
  assert.match(RUNTIME_CONTRACT_ALIGNMENT_SUMMARY.detail, /local \/v1\/concierge/);
  assert.match(RUNTIME_CONTRACT_ALIGNMENT_SUMMARY.boundary, /not Napoleon approval/);
  assert.equal(JSON.stringify(RUNTIME_CONTRACT_ALIGNMENT_SUMMARY).includes("https://napoleon.example"), false);
  assert.equal(JSON.stringify(RUNTIME_CONTRACT_ALIGNMENT_SUMMARY).includes("secret-token"), false);
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
  assert.equal(
    summaries.find((summary) => summary.id === "chief_of_staff_capabilities")?.boundary,
    "capability-discovery Napoleon bridge target; no local approval, runtime authority grant, registry update, memory write, agent dispatch, external send, trace append, routing, or local application.",
  );
  assert.equal(
    summaries.find((summary) => summary.id === "memory_proposal_review")?.sideEffects,
    "No memory write, approval capture, agent dispatch, external send, registry update, trace append, task routing, or application is performed by Concierge",
  );
  assert.equal(
    summaries.find((summary) => summary.id === "chief_of_staff_steering")?.boundary,
    "Chief of Staff steering Napoleon bridge target; no local evolution application, approval capture, registry update, memory write, agent dispatch, external send, trace append, routing, or local application.",
  );
  assert.equal(summaries.some((summary) => summary.boundary === "Governed Napoleon bridge only"), false);
});

test("describes named Napoleon review targets with generated metadata source", () => {
  const summary = describeNapoleonReviewOperationSummary("observability_trace");

  assert.equal(summary.label, "Observability trace handoff");
  assert.equal(summary.path, "/observability/traces");
  assert.equal(summary.requestKind, "observability_trace_handoff");
  assert.ok(summary.boundary.includes("trace-evidence Napoleon target"));
  assert.ok(summary.boundary.includes("trace append"));
  assert.ok(summary.boundary.includes("audit authority"));
  assert.ok(summary.sideEffects.includes("No trace append"));
  assert.ok(summary.sideEffects.includes("audit authority"));
  assert.ok(summary.sideEffects.includes("task routing"));
  assert.equal(summary.sourceSummary, "Generated from api/napoleon_bridge.openapi.yaml review/evidence metadata");
  assert.equal(summary.requiredResponseSummary.includes("traceEnvelope"), true);
  assert.equal(JSON.stringify(summary).includes("https://napoleon.example"), false);
  assert.equal(JSON.stringify(summary).includes("secret-token"), false);
});

test("describes evaluation review without evaluator or release approval authority", () => {
  const summary = describeNapoleonReviewOperationSummary("evaluation_review");

  assert.equal(summary.label, "Evaluation review handoff");
  assert.equal(summary.path, "/chief-of-staff/reviews/evaluation");
  assert.equal(summary.requestKind, "evaluation_review_handoff");
  assert.ok(summary.boundary.includes("evaluator-review Napoleon target"));
  assert.ok(summary.boundary.includes("evaluator approval"));
  assert.ok(summary.boundary.includes("release approval"));
  assert.ok(summary.sideEffects.includes("No evaluator approval"));
  assert.ok(summary.sideEffects.includes("release approval"));
  assert.ok(summary.sideEffects.includes("trace append"));
  assert.equal(JSON.stringify(summary).includes("https://napoleon.example"), false);
  assert.equal(JSON.stringify(summary).includes("secret-token"), false);
});

test("describes evolution proposal review without evolution application authority", () => {
  const summary = describeNapoleonReviewOperationSummary("evolution_proposal_review");

  assert.equal(summary.label, "Evolution proposal review");
  assert.equal(summary.path, "/chief-of-staff/reviews/evolution-proposals");
  assert.equal(summary.requestKind, "evolution_proposal_review_handoff");
  assert.ok(summary.boundary.includes("evolution-review Napoleon target"));
  assert.ok(summary.boundary.includes("evolution application"));
  assert.ok(summary.boundary.includes("approval capture"));
  assert.ok(summary.boundary.includes("registry update"));
  assert.ok(summary.sideEffects.includes("No evolution application"));
  assert.ok(summary.sideEffects.includes("approval capture"));
  assert.ok(summary.sideEffects.includes("registry update"));
  assert.equal(JSON.stringify(summary).includes("https://napoleon.example"), false);
  assert.equal(JSON.stringify(summary).includes("secret-token"), false);
});

test("describes new agent proposal review without agent activation authority", () => {
  const summary = describeNapoleonReviewOperationSummary("new_agent_proposal_review");

  assert.equal(summary.label, "New agent proposal review");
  assert.equal(summary.path, "/chief-of-staff/reviews/new-agent-proposals");
  assert.equal(summary.requestKind, "new_agent_proposal_review_handoff");
  assert.ok(summary.boundary.includes("no local approval"));
  assert.ok(summary.boundary.includes("agent activation"));
  assert.ok(summary.boundary.includes("registry update"));
  assert.ok(summary.sideEffects.includes("No agent activation"));
  assert.ok(summary.sideEffects.includes("registry update"));
  assert.equal(JSON.stringify(summary).includes("https://napoleon.example"), false);
  assert.equal(JSON.stringify(summary).includes("secret-token"), false);
});

test("describes evolution proposal submission without evolution application authority", () => {
  const summary = describeNapoleonReviewOperationSummary("evolution_proposal_submission");

  assert.equal(summary.label, "Evolution proposal submission");
  assert.equal(summary.path, "/evolution/proposals");
  assert.equal(summary.requestKind, "evolution_proposal_submission_handoff");
  assert.ok(summary.boundary.includes("proposal-submission Napoleon target"));
  assert.ok(summary.boundary.includes("evolution application"));
  assert.ok(summary.boundary.includes("registry update"));
  assert.ok(summary.boundary.includes("approval capture"));
  assert.ok(summary.sideEffects.includes("No evolution application"));
  assert.ok(summary.sideEffects.includes("registry update"));
  assert.ok(summary.sideEffects.includes("approval capture"));
  assert.equal(JSON.stringify(summary).includes("https://napoleon.example"), false);
  assert.equal(JSON.stringify(summary).includes("secret-token"), false);
});

test("describes governance evaluation without governance override authority", () => {
  const summary = describeNapoleonReviewOperationSummary("governance_evaluation");

  assert.equal(summary.label, "Governance evaluation handoff");
  assert.equal(summary.path, "/governance/evaluate");
  assert.equal(summary.requestKind, "governance_evaluation_handoff");
  assert.ok(summary.boundary.includes("governance-evaluation Napoleon target"));
  assert.ok(summary.boundary.includes("governance override"));
  assert.ok(summary.boundary.includes("approval capture"));
  assert.ok(summary.sideEffects.includes("No governance override"));
  assert.ok(summary.sideEffects.includes("approval capture"));
  assert.equal(JSON.stringify(summary).includes("https://napoleon.example"), false);
  assert.equal(JSON.stringify(summary).includes("secret-token"), false);
});

test("describes Chief of Staff request without task routing authority", () => {
  const summary = describeNapoleonReviewOperationSummary("chief_of_staff_request");

  assert.equal(summary.label, "Chief of Staff request handoff");
  assert.equal(summary.path, "/chief-of-staff/requests");
  assert.equal(summary.requestKind, "chief_of_staff_request_handoff");
  assert.ok(summary.boundary.includes("request-handoff Napoleon target"));
  assert.ok(summary.boundary.includes("task routing"));
  assert.ok(summary.boundary.includes("registry update"));
  assert.ok(summary.boundary.includes("trace append"));
  assert.ok(summary.sideEffects.includes("No task routing"));
  assert.ok(summary.sideEffects.includes("registry update"));
  assert.ok(summary.sideEffects.includes("trace append"));
  assert.equal(JSON.stringify(summary).includes("https://napoleon.example"), false);
  assert.equal(JSON.stringify(summary).includes("secret-token"), false);
});

test("describes governance review without approval capture authority", () => {
  const summary = describeNapoleonReviewOperationSummary("governance_review");

  assert.equal(summary.label, "Governance review handoff");
  assert.equal(summary.path, "/chief-of-staff/reviews/governance");
  assert.equal(summary.requestKind, "governance_review_handoff");
  assert.ok(summary.boundary.includes("governance-review Napoleon target"));
  assert.ok(summary.boundary.includes("approval capture"));
  assert.ok(summary.boundary.includes("governance override"));
  assert.ok(summary.sideEffects.includes("No approval capture"));
  assert.ok(summary.sideEffects.includes("governance override"));
  assert.equal(JSON.stringify(summary).includes("https://napoleon.example"), false);
  assert.equal(JSON.stringify(summary).includes("secret-token"), false);
});
