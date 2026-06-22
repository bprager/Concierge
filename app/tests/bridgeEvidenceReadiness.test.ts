import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBridgeEvidenceReadinessState,
  compareBridgeReadinessProofs,
  exportBridgeReadinessProofJson,
  updateBridgeEvidenceReadinessState,
} from "../src/bridgeEvidenceReadiness.js";
import { buildDescriptorConnectionState, defaultChiefOfStaffDescriptor } from "../src/contractBridge.js";
import type { BridgeContractEvidence } from "../src/napoleonBridge.js";

const validEvidence: BridgeContractEvidence = {
  kind: "bridge_contract_evidence",
  operationId: "text_turn",
  requestKind: "text_turn",
  transport: "http_post",
  status: "success",
  httpStatus: 200,
  targetPath: "/v1/concierge/turn",
  traceId: "trace_evidence",
  requestId: "cos_trace_evidence",
  decisionId: "decision_evidence",
  auditId: "audit_evidence",
  governanceOutcome: "allow_prepare_only",
  descriptorStatus: "ready",
  profileMode: "adult_owner",
  selectedAgentIds: ["napoleon.passive_brain"],
  allowedEffects: ["prepare_advisory_response"],
  blockedEffects: ["memory_write", "external_send"],
  provenanceVerified: true,
};

test("starts bridge evidence readiness as not run", () => {
  const state = buildBridgeEvidenceReadinessState();

  assert.equal(state.captureState, "not_run");
  assert.equal(state.comparisonState, "not_run");
  assert.equal(state.lastEvidenceStatus, undefined);
});

test("marks sanitized bridge evidence as captured and compared", () => {
  const state = updateBridgeEvidenceReadinessState(buildBridgeEvidenceReadinessState(), validEvidence);

  assert.equal(state.captureState, "passed");
  assert.equal(state.comparisonState, "passed");
  assert.equal(state.lastEvidenceStatus, "success");
  assert.equal(state.lastOperationId, "text_turn");
  assert.equal(state.lastTransport, "http_post");
  assert.equal(state.lastTargetPath, "/v1/concierge/turn");
});

test("accepts explicit cos text-turn advisory evidence for text turn readiness", () => {
  const state = updateBridgeEvidenceReadinessState(buildBridgeEvidenceReadinessState(), {
    ...validEvidence,
    targetPath: "/cos/text-turn",
    traceEnvelopeObserved: true,
    traceEnvelopeMatched: true,
    traceTargetPath: "/cos/trace/{trace_id}",
  });

  assert.equal(state.captureState, "passed");
  assert.equal(state.comparisonState, "passed");
  assert.equal(state.lastOperationId, "text_turn");
  assert.equal(state.lastTargetPath, "/cos/text-turn");
  assert.equal(state.failureReason, undefined);
});

test("fails comparison for cos text-turn evidence without matching trace proof", () => {
  const state = updateBridgeEvidenceReadinessState(buildBridgeEvidenceReadinessState(), {
    ...validEvidence,
    targetPath: "/cos/text-turn",
    traceEnvelopeObserved: true,
    traceEnvelopeMatched: false,
    traceTargetPath: "/cos/trace/{trace_id}",
  });

  assert.equal(state.captureState, "passed");
  assert.equal(state.comparisonState, "failed");
  assert.ok(state.failureReason?.includes("matching observed trace envelope"));
});

test("fails comparison for evidence that does not match the bridge registry", () => {
  const state = updateBridgeEvidenceReadinessState(buildBridgeEvidenceReadinessState(), {
    ...validEvidence,
    targetPath: "/v1/concierge/freeform",
  });

  assert.equal(state.captureState, "passed");
  assert.equal(state.comparisonState, "failed");
  assert.ok(state.failureReason?.includes("target path"));
});

test("fails comparison for evidence transport that does not match the bridge registry", () => {
  const state = updateBridgeEvidenceReadinessState(buildBridgeEvidenceReadinessState(), {
    ...validEvidence,
    transport: "http_get",
  });

  assert.equal(state.captureState, "passed");
  assert.equal(state.comparisonState, "failed");
  assert.ok(state.failureReason?.includes("transport"));
});

test("fails comparison when evidence contains raw payload fields", () => {
  const evidenceWithRawPayload = {
    ...validEvidence,
    requestBody: { message: "raw user text must not be stored" },
  } as unknown as BridgeContractEvidence;

  const state = updateBridgeEvidenceReadinessState(buildBridgeEvidenceReadinessState(), evidenceWithRawPayload);

  assert.equal(state.captureState, "passed");
  assert.equal(state.comparisonState, "failed");
  assert.ok(state.failureReason?.includes("raw or secret"));
});

test("fails comparison when evidence contains snake_case raw payload aliases", () => {
  const evidenceWithRawPayloadAlias = {
    ...validEvidence,
    request_body: { response_text: "raw response text must not be stored" },
  } as unknown as BridgeContractEvidence;

  const state = updateBridgeEvidenceReadinessState(buildBridgeEvidenceReadinessState(), evidenceWithRawPayloadAlias);

  assert.equal(state.captureState, "passed");
  assert.equal(state.comparisonState, "failed");
  assert.ok(state.failureReason?.includes("raw or secret"));
});

test("exports sanitized bridge readiness proof without raw prompts endpoints or secrets", () => {
  const state = updateBridgeEvidenceReadinessState(buildBridgeEvidenceReadinessState(), {
    ...validEvidence,
    status: "fail_closed",
    reason: "contract_mismatch",
    blockedEffects: ["memory_write", "approval_capture", "external_send"],
  });
  const descriptorConnection = buildDescriptorConnectionState({
    endpointConfigured: true,
    descriptor: defaultChiefOfStaffDescriptor,
    expectedChecksum: "sha256:contract",
    actualChecksum: "sha256:contract",
    signatureValid: true,
  });

  const exported = exportBridgeReadinessProofJson({
    descriptorConnection,
    readiness: state,
    runtimeValidationSource: "local_harness",
    generatedAt: "2026-06-13T00:00:00.000Z",
  });
  const proof = JSON.parse(exported) as {
    kind: string;
    generatedAt: string;
    descriptor: { state: string; checksumState: string; signatureState: string; serviceId?: string };
    evidence: { captureState: string; comparisonState: string; lastFailureReason?: string; blockedEffects: string[] };
    runtimeValidation: { source: string; caveat: string; promotionGate: string };
    boundary: { approvalCaptured: boolean; memoryWritePerformed: boolean; externalSendPerformed: boolean };
  };
  const forbiddenKeys = ["endpoint", "host", "token", "message", "prompt", "requestBody", "responseBody", "responseText"];

  assert.equal(proof.kind, "concierge_bridge_readiness_proof");
  assert.equal(proof.generatedAt, "2026-06-13T00:00:00.000Z");
  assert.equal(proof.descriptor.state, "ready");
  assert.equal(proof.descriptor.checksumState, "matched");
  assert.equal(proof.descriptor.signatureState, "valid");
  assert.equal(proof.descriptor.serviceId, "napoleon.chief_of_staff");
  assert.equal(proof.evidence.captureState, "passed");
  assert.equal(proof.evidence.comparisonState, "passed");
  assert.equal(proof.evidence.lastFailureReason, "contract_mismatch");
  assert.deepEqual(proof.evidence.blockedEffects, ["memory_write", "approval_capture", "external_send"]);
  assert.equal(proof.runtimeValidation.source, "local_harness");
  assert.ok(proof.runtimeValidation.caveat.includes("not real Napoleon runtime validation"));
  assert.equal(proof.runtimeValidation.promotionGate, "blocked_until_real_runtime_evidence_passes");
  assert.equal(proof.boundary.approvalCaptured, false);
  assert.equal(proof.boundary.memoryWritePerformed, false);
  assert.equal(proof.boundary.externalSendPerformed, false);
  for (const key of forbiddenKeys) {
    assert.equal(exported.includes(key), false);
  }
});

test("exports missing runtime source as unproven bridge readiness proof", () => {
  const state = updateBridgeEvidenceReadinessState(buildBridgeEvidenceReadinessState(), {
    ...validEvidence,
    status: "success",
    provenanceVerified: true,
  });
  const descriptorConnection = buildDescriptorConnectionState({
    endpointConfigured: true,
    descriptor: defaultChiefOfStaffDescriptor,
    expectedChecksum: "sha256:contract",
    actualChecksum: "sha256:contract",
    signatureValid: true,
  });

  const exported = exportBridgeReadinessProofJson({
    descriptorConnection,
    readiness: state,
    generatedAt: "2026-06-13T00:00:00.000Z",
  });
  const proof = JSON.parse(exported) as {
    runtimeValidation: { source: string; caveat: string; promotionGate: string };
  };

  assert.equal(proof.runtimeValidation.source, "unavailable");
  assert.equal(proof.runtimeValidation.promotionGate, "blocked_until_real_runtime_evidence_passes");
  assert.ok(proof.runtimeValidation.caveat.includes("Real Napoleon runtime validation has not been proven"));
});

test("keeps readiness proof promotion blocked when descriptor lacks text-turn route", () => {
  const state = updateBridgeEvidenceReadinessState(buildBridgeEvidenceReadinessState(), {
    ...validEvidence,
    status: "success",
    provenanceVerified: true,
  });
  const descriptorConnection = buildDescriptorConnectionState({
    endpointConfigured: true,
    descriptor: {
      ...defaultChiefOfStaffDescriptor,
      supportedHandoffs: ["memory_proposal_review"],
    },
    expectedChecksum: "sha256:contract",
    actualChecksum: "sha256:contract",
    signatureValid: true,
  });

  const exported = exportBridgeReadinessProofJson({
    descriptorConnection,
    readiness: state,
    runtimeValidationSource: "real_runtime",
    generatedAt: "2026-06-13T00:00:00.000Z",
  });
  const proof = JSON.parse(exported) as {
    descriptor: { supportedHandoffs: string[] };
    runtimeValidation: { source: string; caveat: string; promotionGate: string };
  };

  assert.deepEqual(proof.descriptor.supportedHandoffs, ["memory_proposal_review"]);
  assert.equal(proof.runtimeValidation.source, "real_runtime");
  assert.equal(proof.runtimeValidation.promotionGate, "blocked_until_text_turn_route_advertised");
  assert.ok(proof.runtimeValidation.caveat.includes("text_turn"));
});

test("exports sanitized advisory capability discovery state in readiness proof", () => {
  const descriptorConnection = buildDescriptorConnectionState({
    endpointConfigured: true,
    descriptor: defaultChiefOfStaffDescriptor,
    expectedChecksum: "sha256:contract",
    actualChecksum: "sha256:contract",
    signatureValid: true,
  });

  const exported = exportBridgeReadinessProofJson({
    descriptorConnection,
    readiness: buildBridgeEvidenceReadinessState(),
    runtimeValidationSource: "local_harness",
    generatedAt: "2026-06-13T00:00:00.000Z",
    advisoryCapabilities: {
      state: "ready",
      serviceId: "napoleon.chief_of_staff",
      capabilityCount: 2,
      capabilityIds: ["napoleon.capability.answer", "napoleon.capability.steering"],
      authorityTiers: ["prepare_only", "proposal_only"],
      runtimeAuthority: false,
      blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "agent_dispatch", "external_send"],
      proposalOnly: true,
      responseApprovalCaptured: true,
      responseMemoryWritePerformed: true,
      responseAgentDispatchPerformed: false,
      responseExternalSendPerformed: true,
    },
  });
  const proof = JSON.parse(exported) as {
    advisoryCapabilities: {
      state: string;
      serviceId: string;
      capabilityCount: number;
      capabilityIds: string[];
      authorityTiers: string[];
      runtimeAuthority: boolean;
      blockedEffects: string[];
      proposalOnly: boolean;
      responseApprovalCaptured: boolean;
      responseMemoryWritePerformed: boolean;
      responseAgentDispatchPerformed: boolean;
      responseExternalSendPerformed: boolean;
    };
  };

  assert.equal(proof.advisoryCapabilities.state, "ready");
  assert.equal(proof.advisoryCapabilities.serviceId, "napoleon.chief_of_staff");
  assert.equal(proof.advisoryCapabilities.capabilityCount, 2);
  assert.deepEqual(proof.advisoryCapabilities.capabilityIds, [
    "napoleon.capability.answer",
    "napoleon.capability.steering",
  ]);
  assert.deepEqual(proof.advisoryCapabilities.authorityTiers, ["prepare_only", "proposal_only"]);
  assert.equal(proof.advisoryCapabilities.runtimeAuthority, false);
  assert.equal(proof.advisoryCapabilities.proposalOnly, true);
  assert.equal(proof.advisoryCapabilities.responseApprovalCaptured, true);
  assert.equal(proof.advisoryCapabilities.responseMemoryWritePerformed, true);
  assert.equal(proof.advisoryCapabilities.responseAgentDispatchPerformed, false);
  assert.equal(proof.advisoryCapabilities.responseExternalSendPerformed, true);
  assert.ok(proof.advisoryCapabilities.blockedEffects.includes("external_send"));
  assert.equal(exported.includes("127.0.0.1"), false);
  assert.equal(exported.includes("token"), false);
});

test("exports sanitized Napoleon metadata discovery state in readiness proof", () => {
  const descriptorConnection = buildDescriptorConnectionState({
    endpointConfigured: true,
    descriptor: defaultChiefOfStaffDescriptor,
    expectedChecksum: "sha256:contract",
    actualChecksum: "sha256:contract",
    signatureValid: true,
  });

  const exported = exportBridgeReadinessProofJson({
    descriptorConnection,
    readiness: buildBridgeEvidenceReadinessState(),
    runtimeValidationSource: "local_harness",
    generatedAt: "2026-06-22T00:00:00.000Z",
    napoleonMetadata: {
      state: "ready",
      agentCount: 2,
      agentIds: ["napoleon.passive_brain", "napoleon.scheduler"],
      profileId: "adult_owner",
      profileMetadataReturned: true,
      runtimeAuthority: false,
      blockedEffects: ["agent_dispatch", "registry_update", "memory_write", "approval_capture", "external_send"],
      registryUpdatePerformed: false,
      agentDispatchPerformed: false,
      memoryWritePerformed: false,
      approvalCaptured: false,
      externalSendPerformed: false,
    },
  });
  const proof = JSON.parse(exported) as {
    napoleonMetadata: {
      state: string;
      agentCount: number;
      agentIds: string[];
      profileId: string;
      profileMetadataReturned: boolean;
      runtimeAuthority: boolean;
      blockedEffects: string[];
      registryUpdatePerformed: boolean;
      agentDispatchPerformed: boolean;
      memoryWritePerformed: boolean;
      approvalCaptured: boolean;
      externalSendPerformed: boolean;
    };
  };

  assert.equal(proof.napoleonMetadata.state, "ready");
  assert.equal(proof.napoleonMetadata.agentCount, 2);
  assert.deepEqual(proof.napoleonMetadata.agentIds, ["napoleon.passive_brain", "napoleon.scheduler"]);
  assert.equal(proof.napoleonMetadata.profileId, "adult_owner");
  assert.equal(proof.napoleonMetadata.profileMetadataReturned, true);
  assert.equal(proof.napoleonMetadata.runtimeAuthority, false);
  assert.equal(proof.napoleonMetadata.registryUpdatePerformed, false);
  assert.equal(proof.napoleonMetadata.agentDispatchPerformed, false);
  assert.equal(proof.napoleonMetadata.memoryWritePerformed, false);
  assert.equal(proof.napoleonMetadata.approvalCaptured, false);
  assert.equal(proof.napoleonMetadata.externalSendPerformed, false);
  assert.ok(proof.napoleonMetadata.blockedEffects.includes("registry_update"));
  assert.equal(exported.includes("Surfaces relevant context"), false);
  assert.equal(exported.includes("https://"), false);
  assert.equal(exported.includes("token"), false);
});

test("exports descriptor-advertised governed handoff routes in readiness proof", () => {
  const descriptorConnection = buildDescriptorConnectionState({
    endpointConfigured: true,
    descriptor: {
      schemaVersion: "napoleon/concierge/runtime-descriptor/v1",
      serviceId: "napoleon.chief_of_staff",
      runtimeAuthority: false,
      commandExecution: false,
      cachePolicy: "runtime_descriptor_live_response",
      blockedEffects: ["runtime_authority", "memory_write", "agent_dispatch", "external_send"],
      supportedHandoffs: ["text_turn"],
    },
  });

  const exported = exportBridgeReadinessProofJson({
    descriptorConnection,
    readiness: buildBridgeEvidenceReadinessState(),
    runtimeValidationSource: "real_runtime",
    generatedAt: "2026-06-21T00:00:00.000Z",
  });
  const proof = JSON.parse(exported) as {
    descriptor: {
      supportedHandoffs: string[];
    };
  };

  assert.deepEqual(proof.descriptor.supportedHandoffs, ["text_turn"]);
  assert.equal(exported.includes("https://"), false);
  assert.equal(exported.includes("token"), false);
});

test("redacts unsafe bridge evidence values before exporting readiness proof", () => {
  const state = updateBridgeEvidenceReadinessState(buildBridgeEvidenceReadinessState(), {
    ...validEvidence,
    targetPath: "http://127.0.0.1:8787/v1/concierge/turn",
    blockedEffects: ["memory_write", "http://127.0.0.1:8787/private"],
  });
  const descriptorConnection = buildDescriptorConnectionState({
    endpointConfigured: true,
    descriptor: defaultChiefOfStaffDescriptor,
    expectedChecksum: "sha256:contract",
    actualChecksum: "sha256:contract",
    signatureValid: true,
  });

  const exported = exportBridgeReadinessProofJson({
    descriptorConnection,
    readiness: state,
    runtimeValidationSource: "local_harness",
    generatedAt: "2026-06-13T00:00:00.000Z",
  });
  const proof = JSON.parse(exported) as {
    evidence: {
      lastTargetPath?: string;
      blockedEffects: string[];
    };
  };

  assert.equal(exported.includes("127.0.0.1"), false);
  assert.equal(proof.evidence.lastTargetPath, "redacted");
  assert.deepEqual(proof.evidence.blockedEffects, ["memory_write", "redacted"]);
});

test("reports unavailable comparison for the first exported bridge readiness proof", () => {
  const descriptorConnection = buildDescriptorConnectionState({
    endpointConfigured: true,
    descriptor: defaultChiefOfStaffDescriptor,
    expectedChecksum: "sha256:contract",
    actualChecksum: "sha256:contract",
    signatureValid: true,
  });
  const currentProof = exportBridgeReadinessProofJson({
    descriptorConnection,
    readiness: buildBridgeEvidenceReadinessState(),
    generatedAt: "2026-06-13T00:00:00.000Z",
  });

  const comparison = compareBridgeReadinessProofs(null, currentProof);

  assert.equal(comparison.status, "not_available");
  assert.equal(comparison.changes.length, 0);
  assert.ok(comparison.summary.includes("No previous"));
});

test("compares sanitized bridge readiness proofs and reports meaningful changed fields", () => {
  const previousDescriptorConnection = buildDescriptorConnectionState({
    endpointConfigured: false,
    descriptor: defaultChiefOfStaffDescriptor,
    expectedChecksum: "sha256:contract",
    actualChecksum: "sha256:contract",
    signatureValid: true,
  });
  const currentDescriptorConnection = buildDescriptorConnectionState({
    endpointConfigured: true,
    descriptor: defaultChiefOfStaffDescriptor,
    expectedChecksum: "sha256:contract",
    actualChecksum: "sha256:contract",
    signatureValid: true,
  });
  const previousProof = exportBridgeReadinessProofJson({
    descriptorConnection: previousDescriptorConnection,
    readiness: buildBridgeEvidenceReadinessState(),
    runtimeValidationSource: "local_harness",
    generatedAt: "2026-06-13T00:00:00.000Z",
  });
  const currentProof = exportBridgeReadinessProofJson({
    descriptorConnection: currentDescriptorConnection,
    readiness: updateBridgeEvidenceReadinessState(buildBridgeEvidenceReadinessState(), {
      ...validEvidence,
      status: "fail_closed",
      reason: "auth_failure",
      blockedEffects: ["memory_write", "approval_capture", "external_send"],
    }),
    runtimeValidationSource: "real_runtime",
    generatedAt: "2026-06-13T00:05:00.000Z",
  });

  const comparison = compareBridgeReadinessProofs(previousProof, currentProof);

  assert.equal(comparison.status, "changed");
  assert.deepEqual(
    comparison.changes.map((change: { label: string }) => change.label),
    [
      "Descriptor state",
      "Can attempt live bridge",
      "Evidence capture",
      "Evidence comparison",
      "Last evidence status",
      "Last transport",
      "Last operation path",
      "Last failure reason",
      "Evidence blocked effects",
      "Runtime validation source",
      "Promotion gate",
    ],
  );
  assert.equal(JSON.stringify(comparison).includes("127.0.0.1"), false);
  assert.equal(JSON.stringify(comparison).includes("token"), false);
  assert.equal(JSON.stringify(comparison).includes("raw user text"), false);
});

test("rejects invalid previous bridge readiness proof for comparison", () => {
  const descriptorConnection = buildDescriptorConnectionState({
    endpointConfigured: true,
    descriptor: defaultChiefOfStaffDescriptor,
    expectedChecksum: "sha256:contract",
    actualChecksum: "sha256:contract",
    signatureValid: true,
  });
  const currentProof = exportBridgeReadinessProofJson({
    descriptorConnection,
    readiness: buildBridgeEvidenceReadinessState(),
    generatedAt: "2026-06-13T00:00:00.000Z",
  });

  const comparison = compareBridgeReadinessProofs("{not-json", currentProof);

  assert.equal(comparison.status, "invalid_previous");
  assert.equal(comparison.changes.length, 0);
});

test("rejects previous bridge readiness proof containing forbidden raw fields", () => {
  const descriptorConnection = buildDescriptorConnectionState({
    endpointConfigured: true,
    descriptor: defaultChiefOfStaffDescriptor,
    expectedChecksum: "sha256:contract",
    actualChecksum: "sha256:contract",
    signatureValid: true,
  });
  const currentProof = exportBridgeReadinessProofJson({
    descriptorConnection,
    readiness: buildBridgeEvidenceReadinessState(),
    generatedAt: "2026-06-13T00:00:00.000Z",
  });
  const previousProofWithRawField = JSON.stringify({
    kind: "concierge_bridge_readiness_proof",
    descriptor: { state: "ready" },
    evidence: { requestBody: { message: "raw user text" } },
  });

  const comparison = compareBridgeReadinessProofs(previousProofWithRawField, currentProof);

  assert.equal(comparison.status, "invalid_previous");
  assert.equal(JSON.stringify(comparison).includes("raw user text"), false);
});

test("rejects bridge readiness proof comparison input containing snake_case raw fields", () => {
  const descriptorConnection = buildDescriptorConnectionState({
    endpointConfigured: true,
    descriptor: defaultChiefOfStaffDescriptor,
    expectedChecksum: "sha256:contract",
    actualChecksum: "sha256:contract",
    signatureValid: true,
  });
  const currentProof = exportBridgeReadinessProofJson({
    descriptorConnection,
    readiness: buildBridgeEvidenceReadinessState(),
    generatedAt: "2026-06-13T00:00:00.000Z",
  });
  const previousProofWithRawFieldAlias = JSON.stringify({
    kind: "concierge_bridge_readiness_proof",
    descriptor: { state: "ready" },
    evidence: { request_body: { response_text: "raw user text" } },
  });

  const comparison = compareBridgeReadinessProofs(previousProofWithRawFieldAlias, currentProof);

  assert.equal(comparison.status, "invalid_previous");
  assert.equal(JSON.stringify(comparison).includes("raw user text"), false);
});

test("rejects bridge readiness proof comparison input containing endpoint or secret values", () => {
  const descriptorConnection = buildDescriptorConnectionState({
    endpointConfigured: true,
    descriptor: defaultChiefOfStaffDescriptor,
    expectedChecksum: "sha256:contract",
    actualChecksum: "sha256:contract",
    signatureValid: true,
  });
  const currentProof = exportBridgeReadinessProofJson({
    descriptorConnection,
    readiness: buildBridgeEvidenceReadinessState(),
    generatedAt: "2026-06-13T00:00:00.000Z",
  });
  const previousProofWithEndpointValue = JSON.stringify({
    kind: "concierge_bridge_readiness_proof",
    descriptor: { state: "ready" },
    evidence: { lastTargetPath: "http://127.0.0.1:8787/v1/concierge/turn" },
  });
  const currentProofWithSecretValue = JSON.stringify({
    kind: "concierge_bridge_readiness_proof",
    descriptor: { state: "ready" },
    evidence: { blockedEffects: ["Bearer local-secret-token"] },
  });

  const previousComparison = compareBridgeReadinessProofs(previousProofWithEndpointValue, currentProof);
  const currentComparison = compareBridgeReadinessProofs(currentProof, currentProofWithSecretValue);

  assert.equal(previousComparison.status, "invalid_previous");
  assert.equal(currentComparison.status, "invalid_current");
  assert.equal(JSON.stringify(previousComparison).includes("127.0.0.1"), false);
  assert.equal(JSON.stringify(currentComparison).includes("local-secret-token"), false);
});
