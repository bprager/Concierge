import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBridgeEvidenceReadinessState,
  updateBridgeEvidenceReadinessState,
} from "../src/bridgeEvidenceReadiness.js";
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
