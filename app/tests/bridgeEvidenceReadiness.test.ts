import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBridgeEvidenceReadinessState,
  exportBridgeReadinessProofJson,
  updateBridgeEvidenceReadinessState,
} from "../src/bridgeEvidenceReadiness.js";
import { buildDescriptorConnectionState, defaultChiefOfStaffDescriptor } from "../src/contractBridge.js";
import type { BridgeContractEvidence } from "../src/napoleonBridge.js";

const validEvidence: BridgeContractEvidence = {
  kind: "bridge_contract_evidence",
  operationId: "text_turn",
  requestKind: "text_turn",
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
  assert.equal(state.lastTargetPath, "/v1/concierge/turn");
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
    generatedAt: "2026-06-13T00:00:00.000Z",
  });
  const proof = JSON.parse(exported) as {
    kind: string;
    generatedAt: string;
    descriptor: { state: string; checksumState: string; signatureState: string; serviceId?: string };
    evidence: { captureState: string; comparisonState: string; lastFailureReason?: string; blockedEffects: string[] };
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
  assert.equal(proof.boundary.approvalCaptured, false);
  assert.equal(proof.boundary.memoryWritePerformed, false);
  assert.equal(proof.boundary.externalSendPerformed, false);
  for (const key of forbiddenKeys) {
    assert.equal(exported.includes(key), false);
  }
});
