import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBridgeEvidenceReadinessState,
  compareBridgeReadinessProofs,
  exportBridgeReadinessProofJson,
  importAcceptedBridgeReadinessProof,
  updateBridgeEvidenceReadinessState,
} from "../src/bridgeEvidenceReadiness.js";
import { RUNTIME_CONTRACT_ALIGNMENT_SUMMARY } from "../src/bridgeOperations.js";
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
  const forbiddenContent = [
    "http://",
    "https://",
    "localhost",
    "127.0.0.1",
    "bearer",
    "authorization",
    "token",
    "rawPrompt",
    "requestBody",
    "responseBody",
    "responseText",
  ];

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
  for (const content of forbiddenContent) {
    assert.equal(exported.toLocaleLowerCase().includes(content.toLocaleLowerCase()), false);
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

test("exports sanitized connection guide proof metadata without granting authority", () => {
  const descriptorConnection = buildDescriptorConnectionState({
    endpointConfigured: false,
  });

  const exported = exportBridgeReadinessProofJson({
    descriptorConnection,
    readiness: buildBridgeEvidenceReadinessState(),
    connectionGuide: {
      currentStep: "configure_endpoint",
      nextLocalAction: "add the governed Napoleon endpoint in settings, then run descriptor discovery",
      liveSendReady: false,
      endpointConfigured: false,
      descriptorDiscovered: false,
      descriptorIntegrityState: "unavailable",
      descriptorFreshnessState: "not_timestamped",
      textTurnRouteAdvertised: false,
      rehearsalMode: false,
      runtimeValidationSource: "unavailable",
      promotionGate: "blocked_until_real_runtime_evidence_passes",
      authorityBoundary: "local readiness only; not Napoleon approval",
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
    },
    generatedAt: "2026-06-25T00:00:00.000Z",
  });
  const proof = JSON.parse(exported) as {
    connectionGuide: {
      currentStep: string;
      nextLocalAction: string;
      liveSendReady: boolean;
      endpointConfigured: boolean;
      descriptorDiscovered: boolean;
      descriptorIntegrityState: string;
      descriptorFreshnessState: string;
      textTurnRouteAdvertised: boolean;
      rehearsalMode: boolean;
      runtimeValidationSource: string;
      promotionGate: string;
      authorityBoundary: string;
      approvalCaptured: boolean;
      memoryWritePerformed: boolean;
      agentDispatchPerformed: boolean;
      externalSendPerformed: boolean;
    };
  };

  assert.equal(proof.connectionGuide.currentStep, "configure_endpoint");
  assert.equal(
    proof.connectionGuide.nextLocalAction,
    "add the governed Napoleon endpoint in settings, then run descriptor discovery",
  );
  assert.equal(proof.connectionGuide.liveSendReady, false);
  assert.equal(proof.connectionGuide.endpointConfigured, false);
  assert.equal(proof.connectionGuide.descriptorDiscovered, false);
  assert.equal(proof.connectionGuide.descriptorIntegrityState, "unavailable");
  assert.equal(proof.connectionGuide.descriptorFreshnessState, "not_timestamped");
  assert.equal(proof.connectionGuide.textTurnRouteAdvertised, false);
  assert.equal(proof.connectionGuide.rehearsalMode, false);
  assert.equal(proof.connectionGuide.runtimeValidationSource, "unavailable");
  assert.equal(proof.connectionGuide.promotionGate, "blocked_until_real_runtime_evidence_passes");
  assert.equal(proof.connectionGuide.authorityBoundary, "local readiness only; not Napoleon approval");
  assert.equal(proof.connectionGuide.approvalCaptured, false);
  assert.equal(proof.connectionGuide.memoryWritePerformed, false);
  assert.equal(proof.connectionGuide.agentDispatchPerformed, false);
  assert.equal(proof.connectionGuide.externalSendPerformed, false);
  assert.equal(exported.includes("http://"), false);
  assert.equal(exported.includes("token"), false);
  assert.equal(exported.includes("prompt"), false);
});

test("exports descriptor freshness metadata in readiness proof", () => {
  const descriptorConnection = buildDescriptorConnectionState({
    endpointConfigured: true,
    descriptor: defaultChiefOfStaffDescriptor,
    expectedChecksum: "sha256:descriptor-ok",
    actualChecksum: "sha256:descriptor-ok",
    signatureValid: true,
    discoveredAt: "2026-06-25T10:00:00.000Z",
    maxAgeSeconds: 300,
    now: "2026-06-25T10:02:00.000Z",
  });

  const exported = exportBridgeReadinessProofJson({
    descriptorConnection,
    readiness: buildBridgeEvidenceReadinessState(),
    generatedAt: "2026-06-25T10:02:00.000Z",
  });
  const proof = JSON.parse(exported) as {
    descriptor: {
      freshnessState?: string;
      discoveredAt?: string | null;
      maxAgeSeconds?: number | null;
      ageSeconds?: number | null;
    };
  };

  assert.equal(proof.descriptor.freshnessState, "fresh");
  assert.equal(proof.descriptor.discoveredAt, "2026-06-25T10:00:00.000Z");
  assert.equal(proof.descriptor.maxAgeSeconds, 300);
  assert.equal(proof.descriptor.ageSeconds, 120);
});

test("exports sanitized missing evaluator route as a promotion blocker", () => {
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
    runtimeValidationSource: "real_runtime",
    evaluatorValidation: {
      status: "failed",
      failureReason: "http_evaluator_route_not_found",
      targetPath: "/chief-of-staff/reviews/evaluation",
      requestKind: "evaluation_review_handoff",
      operationId: "evaluation_review",
    },
    generatedAt: "2026-06-13T00:00:00.000Z",
  });
  const proof = JSON.parse(exported) as {
    runtimeValidation: {
      promotionGate: string;
      evaluator: {
        status: string;
        failureReason: string;
        targetPath: string;
        requestKind: string;
        operationId: string;
        connectionValueStored: boolean;
        credentialValueStored: boolean;
        requestPayloadStored: boolean;
        responsePayloadStored: boolean;
      };
    };
  };

  assert.equal(proof.runtimeValidation.promotionGate, "blocked_until_evaluator_http_passes");
  assert.equal(proof.runtimeValidation.evaluator.status, "failed");
  assert.equal(proof.runtimeValidation.evaluator.failureReason, "http_evaluator_route_not_found");
  assert.equal(proof.runtimeValidation.evaluator.targetPath, "/chief-of-staff/reviews/evaluation");
  assert.equal(proof.runtimeValidation.evaluator.requestKind, "evaluation_review_handoff");
  assert.equal(proof.runtimeValidation.evaluator.operationId, "evaluation_review");
  assert.equal(proof.runtimeValidation.evaluator.connectionValueStored, false);
  assert.equal(proof.runtimeValidation.evaluator.credentialValueStored, false);
  assert.equal(proof.runtimeValidation.evaluator.requestPayloadStored, false);
  assert.equal(proof.runtimeValidation.evaluator.responsePayloadStored, false);
  assert.equal(exported.includes("127.0.0.1"), false);
  assert.equal(exported.includes("token"), false);
});

test("exports sanitized unadvertised evaluator handoff as a promotion blocker", () => {
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
    runtimeValidationSource: "real_runtime",
    evaluatorValidation: {
      status: "failed",
      failureReason: "http_evaluator_handoff_not_advertised",
      targetPath: "/chief-of-staff/reviews/evaluation",
      requestKind: "evaluation_review_handoff",
      operationId: "evaluation_review",
      descriptorHandoffAdvertised: false,
      descriptorHandoffSource: "not_advertised",
      descriptorHandoffFailureReason: "evaluation_handoff_not_advertised",
      descriptorHandoffRequiredAction:
        "Napoleon must advertise evaluation_review in supportedHandoffs, supported_handoffs, required_for, or descriptor endpoint metadata for /chief-of-staff/reviews/evaluation.",
    },
    generatedAt: "2026-06-13T00:00:00.000Z",
  });
  const proof = JSON.parse(exported) as {
    runtimeValidation: {
      promotionGate: string;
      evaluator: {
        failureReason: string;
        descriptorHandoffAdvertised: boolean;
        descriptorHandoffSource: string;
        descriptorHandoffFailureReason: string;
        descriptorHandoffRequiredAction: string;
      };
    };
  };

  assert.equal(proof.runtimeValidation.promotionGate, "blocked_until_evaluator_http_passes");
  assert.equal(proof.runtimeValidation.evaluator.failureReason, "http_evaluator_handoff_not_advertised");
  assert.equal(proof.runtimeValidation.evaluator.descriptorHandoffAdvertised, false);
  assert.equal(proof.runtimeValidation.evaluator.descriptorHandoffSource, "not_advertised");
  assert.equal(proof.runtimeValidation.evaluator.descriptorHandoffFailureReason, "evaluation_handoff_not_advertised");
  assert.equal(
    proof.runtimeValidation.evaluator.descriptorHandoffRequiredAction,
    "Napoleon must advertise evaluation_review in supportedHandoffs, supported_handoffs, required_for, or descriptor endpoint metadata for /chief-of-staff/reviews/evaluation.",
  );
  assert.equal(exported.includes("127.0.0.1"), false);
});

test("keeps readiness proof promotion blocked until evaluator HTTP passes", () => {
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
    runtimeValidationSource: "real_runtime",
    generatedAt: "2026-06-13T00:00:00.000Z",
  });
  const proof = JSON.parse(exported) as {
    runtimeValidation: {
      promotionGate: string;
      evaluator: { status: string };
    };
  };

  assert.equal(proof.runtimeValidation.evaluator.status, "not_run");
  assert.equal(proof.runtimeValidation.promotionGate, "blocked_until_evaluator_http_passes");
});

test("exports built-in runtime contract required actions in readiness proof", () => {
  const requiredAction = RUNTIME_CONTRACT_ALIGNMENT_SUMMARY.napoleonRequiredActions[0];
  assert.ok(requiredAction);
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
    runtimeValidationSource: "real_runtime",
    evaluatorValidation: {
      status: "passed",
      failureReason: "none",
      targetPath: "/chief-of-staff/reviews/evaluation",
      requestKind: "evaluation_review_handoff",
      operationId: "evaluation_review",
    },
    generatedAt: "2026-06-13T00:00:00.000Z",
  });
  const proof = JSON.parse(exported) as {
    runtimeValidation: {
      source: string;
      promotionGate: string;
      evaluator: {
        status: string;
        napoleonRequiredActionCount?: number;
        blockingLivePromotion?: boolean;
        requiredActionSource?: string;
        highestPriorityAction?: {
          id: string;
          targetPath: string;
          requestKind: string;
          operationId: string;
          advertiseUsing?: string[];
          approvalCaptured: boolean;
          memoryWritePerformed: boolean;
          agentDispatchPerformed: boolean;
          externalSendPerformed: boolean;
          appliedLocally: boolean;
        };
        missingHandoffTarget?: {
          id: string;
          targetPath: string;
          requestKind: string;
          operationId: string;
          advertiseUsing?: string[];
          approvalCaptured: boolean;
          memoryWritePerformed: boolean;
          agentDispatchPerformed: boolean;
          externalSendPerformed: boolean;
          appliedLocally: boolean;
        };
        implementationNextStep?: string;
        napoleonRequiredActions: Array<{
          id: string;
          owner: string;
          targetPath: string;
          requestKind: string;
          operationId: string;
          advertiseUsing?: string[];
          approvalCaptured: boolean;
          memoryWritePerformed: boolean;
          agentDispatchPerformed: boolean;
          externalSendPerformed: boolean;
          appliedLocally: boolean;
        }>;
      };
    };
  };

  assert.equal(proof.runtimeValidation.source, "real_runtime");
  assert.equal(proof.runtimeValidation.evaluator.status, "passed");
  assert.equal(proof.runtimeValidation.promotionGate, "blocked_until_runtime_contract_actions_cleared");
  assert.equal(proof.runtimeValidation.evaluator.napoleonRequiredActionCount, 1);
  assert.equal(proof.runtimeValidation.evaluator.blockingLivePromotion, true);
  assert.equal(proof.runtimeValidation.evaluator.requiredActionSource, "contract_alignment");
  assert.equal(proof.runtimeValidation.evaluator.highestPriorityAction?.id, requiredAction.id);
  assert.equal(proof.runtimeValidation.evaluator.highestPriorityAction?.targetPath, requiredAction.path);
  assert.equal(proof.runtimeValidation.evaluator.highestPriorityAction?.requestKind, requiredAction.requestKind);
  assert.equal(proof.runtimeValidation.evaluator.highestPriorityAction?.operationId, requiredAction.operationId);
  assert.deepEqual(proof.runtimeValidation.evaluator.highestPriorityAction?.advertiseUsing, [
    "supportedHandoffs",
    "required_for",
  ]);
  assert.equal(proof.runtimeValidation.evaluator.highestPriorityAction?.approvalCaptured, false);
  assert.equal(proof.runtimeValidation.evaluator.highestPriorityAction?.memoryWritePerformed, false);
  assert.equal(proof.runtimeValidation.evaluator.highestPriorityAction?.agentDispatchPerformed, false);
  assert.equal(proof.runtimeValidation.evaluator.highestPriorityAction?.externalSendPerformed, false);
  assert.equal(proof.runtimeValidation.evaluator.highestPriorityAction?.appliedLocally, false);
  assert.equal(proof.runtimeValidation.evaluator.missingHandoffTarget?.id, requiredAction.id);
  assert.equal(proof.runtimeValidation.evaluator.missingHandoffTarget?.targetPath, requiredAction.path);
  assert.equal(proof.runtimeValidation.evaluator.missingHandoffTarget?.requestKind, requiredAction.requestKind);
  assert.equal(proof.runtimeValidation.evaluator.missingHandoffTarget?.operationId, requiredAction.operationId);
  assert.deepEqual(proof.runtimeValidation.evaluator.missingHandoffTarget?.advertiseUsing, [
    "supportedHandoffs",
    "required_for",
  ]);
  assert.equal(proof.runtimeValidation.evaluator.missingHandoffTarget?.approvalCaptured, false);
  assert.equal(proof.runtimeValidation.evaluator.missingHandoffTarget?.memoryWritePerformed, false);
  assert.equal(proof.runtimeValidation.evaluator.missingHandoffTarget?.agentDispatchPerformed, false);
  assert.equal(proof.runtimeValidation.evaluator.missingHandoffTarget?.externalSendPerformed, false);
  assert.equal(proof.runtimeValidation.evaluator.missingHandoffTarget?.appliedLocally, false);
  assert.equal(
    proof.runtimeValidation.evaluator.implementationNextStep,
    "Implementation next step: expose /evolution/proposals/{proposal_id}/status for evolution_proposal_status_handoff and advertise it via supportedHandoffs, required_for.",
  );
  assert.equal(proof.runtimeValidation.evaluator.napoleonRequiredActions[0]?.id, requiredAction.id);
  assert.equal(proof.runtimeValidation.evaluator.napoleonRequiredActions[0]?.owner, "napoleon_runtime");
  assert.equal(proof.runtimeValidation.evaluator.napoleonRequiredActions[0]?.targetPath, requiredAction.path);
  assert.equal(proof.runtimeValidation.evaluator.napoleonRequiredActions[0]?.requestKind, requiredAction.requestKind);
  assert.equal(proof.runtimeValidation.evaluator.napoleonRequiredActions[0]?.operationId, requiredAction.operationId);
  assert.deepEqual(
    proof.runtimeValidation.evaluator.napoleonRequiredActions[0]?.advertiseUsing,
    ["supportedHandoffs", "required_for"],
  );
  assert.equal(proof.runtimeValidation.evaluator.napoleonRequiredActions[0]?.approvalCaptured, false);
  assert.equal(proof.runtimeValidation.evaluator.napoleonRequiredActions[0]?.memoryWritePerformed, false);
  assert.equal(proof.runtimeValidation.evaluator.napoleonRequiredActions[0]?.agentDispatchPerformed, false);
  assert.equal(proof.runtimeValidation.evaluator.napoleonRequiredActions[0]?.externalSendPerformed, false);
  assert.equal(proof.runtimeValidation.evaluator.napoleonRequiredActions[0]?.appliedLocally, false);
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

test("exports descriptor-advertised evaluator review handoff in readiness proof", () => {
  const descriptorConnection = buildDescriptorConnectionState({
    endpointConfigured: true,
    descriptor: {
      schemaVersion: "napoleon/concierge/runtime-descriptor/v1",
      serviceId: "napoleon.chief_of_staff",
      runtimeAuthority: false,
      commandExecution: false,
      cachePolicy: "runtime_descriptor_live_response",
      blockedEffects: ["runtime_authority", "memory_write", "agent_dispatch", "external_send"],
      supportedHandoffs: ["text_turn", "evaluation_review"],
    },
  });

  const exported = exportBridgeReadinessProofJson({
    descriptorConnection,
    readiness: buildBridgeEvidenceReadinessState(),
    runtimeValidationSource: "real_runtime",
    generatedAt: "2026-06-23T00:00:00.000Z",
  });
  const proof = JSON.parse(exported) as {
    descriptor: {
      supportedHandoffs: string[];
    };
  };

  assert.deepEqual(proof.descriptor.supportedHandoffs, ["text_turn", "evaluation_review"]);
  assert.equal(exported.includes("https://"), false);
  assert.equal(exported.includes("token"), false);
});

test("exports generated Napoleon review target source metadata in readiness proof", () => {
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
  });
  const proof = JSON.parse(exported) as {
    governedNapoleonTargets: {
      source: string;
      targets: Array<{
        operationId: string;
        path: string;
        requestKind: string;
        transport: string;
        source: string;
        localSideEffectsPerformed: boolean;
      }>;
    };
  };

  assert.equal(proof.governedNapoleonTargets.source, "api/napoleon_bridge.openapi.yaml#x-concierge-napoleon-review-operations");
  assert.ok(proof.governedNapoleonTargets.targets.length >= 8);
  assert.ok(
    proof.governedNapoleonTargets.targets.some(
      (target) =>
        target.operationId === "observability_trace" &&
        target.path === "/observability/traces" &&
        target.requestKind === "observability_trace_handoff" &&
        target.transport === "http_post" &&
        target.source === "api/napoleon_bridge.openapi.yaml#x-concierge-napoleon-review-operations" &&
        target.localSideEffectsPerformed === false,
    ),
  );
  assert.equal(exported.includes("https://"), false);
  assert.equal(exported.includes("127.0.0.1"), false);
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

test("imports only accepted real-runtime readiness proof metadata", () => {
  const accepted = importAcceptedBridgeReadinessProof(
    JSON.stringify({
      kind: "concierge_bridge_readiness_proof",
      version: 1,
      evidence: {
        captureState: "passed",
        comparisonState: "passed",
        lastEvidenceStatus: "success",
        lastOperationId: "text_turn",
        lastTargetPath: "/v1/concierge/turn",
      },
      descriptor: {
        state: "ready",
        checksumState: "matched",
        signatureState: "valid",
        canAttemptLiveBridge: true,
        supportedHandoffs: ["text_turn"],
      },
      runtimeValidation: {
        source: "real_runtime",
        promotionGate: "real_runtime_evidence_available",
      },
      boundary: {
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        localApplicationPerformed: false,
      },
    }),
  );

  assert.equal(accepted.status, "accepted");
  assert.equal(accepted.summary, "Accepted real-runtime readiness proof imported.");
  assert.deepEqual(accepted.lastRealRuntimeProof, {
    operationId: "text_turn",
    targetPath: "/v1/concierge/turn",
    status: "success",
    promotionGate: "real_runtime_evidence_available",
  });
});

test("rejects accepted readiness proof when successful bridge evidence is not a text turn", () => {
  const accepted = importAcceptedBridgeReadinessProof(
    JSON.stringify({
      kind: "concierge_bridge_readiness_proof",
      version: 1,
      evidence: {
        captureState: "passed",
        comparisonState: "passed",
        lastEvidenceStatus: "success",
        lastOperationId: "memory_proposal_review",
        lastTargetPath: "/v1/concierge/memory/proposals/review",
      },
      runtimeValidation: {
        source: "real_runtime",
        promotionGate: "real_runtime_evidence_available",
      },
      boundary: {
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        localApplicationPerformed: false,
      },
    }),
  );

  assert.equal(accepted.status, "rejected");
  assert.equal(
    accepted.summary,
    "Accepted readiness proof import rejected because it is not successful text-turn runtime evidence.",
  );
  assert.equal(accepted.lastRealRuntimeProof, undefined);
});

test("rejects accepted readiness proof when descriptor text-turn readiness is missing", () => {
  const accepted = importAcceptedBridgeReadinessProof(
    JSON.stringify({
      kind: "concierge_bridge_readiness_proof",
      version: 1,
      evidence: {
        captureState: "passed",
        comparisonState: "passed",
        lastEvidenceStatus: "success",
        lastOperationId: "text_turn",
        lastTargetPath: "/v1/concierge/turn",
      },
      runtimeValidation: {
        source: "real_runtime",
        promotionGate: "real_runtime_evidence_available",
      },
      boundary: {
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        localApplicationPerformed: false,
      },
    }),
  );

  assert.equal(accepted.status, "rejected");
  assert.equal(
    accepted.summary,
    "Accepted readiness proof import rejected because descriptor text-turn readiness was not proven.",
  );
  assert.equal(accepted.lastRealRuntimeProof, undefined);
});

test("imports successful live-runtime summary as accepted readiness proof metadata", () => {
  const accepted = importAcceptedBridgeReadinessProof(
    JSON.stringify({
      runtimeValidation: {
        source: "real_runtime",
      },
      bridgeEvidence: {
        status: "passed",
        lastEvidenceStatus: "success",
        lastOperationId: "text_turn",
        lastTargetPath: "/cos/text-turn",
        captureState: "passed",
        comparisonState: "passed",
      },
      httpEvaluator: {
        status: "passed",
        targetPath: "/chief-of-staff/reviews/evaluation",
      },
      contractPacketSubmissions: {
        status: "passed",
        submissionCount: 2,
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        routingPerformed: false,
        registryUpdatePerformed: false,
        traceAppendPerformed: false,
        appliedLocally: false,
        submissions: [
          {
            status: "passed",
            targetPath: "/chief-of-staff/requests",
            requestKind: "chief_of_staff_request_handoff",
            operationId: "chief_of_staff_request",
            governanceDecisionObserved: true,
            traceEnvelopeObserved: true,
            auditEnvelopeObserved: true,
            approvalCaptured: false,
            memoryWritePerformed: false,
            agentDispatchPerformed: false,
            externalSendPerformed: false,
            routingPerformed: false,
            registryUpdatePerformed: false,
            traceAppendPerformed: false,
            appliedLocally: false,
          },
          {
            status: "passed",
            targetPath: "/governance/evaluate",
            requestKind: "governance_evaluation_handoff",
            operationId: "governance_evaluation",
            governanceDecisionObserved: true,
            traceEnvelopeObserved: true,
            auditEnvelopeObserved: true,
            approvalCaptured: false,
            memoryWritePerformed: false,
            agentDispatchPerformed: false,
            externalSendPerformed: false,
            routingPerformed: false,
            registryUpdatePerformed: false,
            traceAppendPerformed: false,
            appliedLocally: false,
          },
        ],
      },
      artifactPrivacy: {
        status: "passed",
      },
      promotionReadiness: {
        gate: "ready_for_human_review",
        locallySafeToConsider: true,
      },
      promotionBoundary: {
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        appliedLocally: false,
      },
    }),
  );

  assert.equal(accepted.status, "accepted");
  assert.equal(accepted.summary, "Accepted live-runtime validation summary imported.");
  assert.deepEqual(accepted.lastRealRuntimeProof, {
    operationId: "text_turn",
    targetPath: "/cos/text-turn",
    status: "success",
    promotionGate: "ready_for_human_review",
    governedPacketEvidence: {
      status: "passed",
      submissionCount: 2,
      chiefOfStaffRequestObserved: true,
      governanceEvaluationObserved: true,
    },
  });
});

test("rejects live-runtime summary when successful bridge evidence is not a text turn", () => {
  const accepted = importAcceptedBridgeReadinessProof(
    JSON.stringify({
      runtimeValidation: {
        source: "real_runtime",
      },
      bridgeEvidence: {
        status: "passed",
        lastEvidenceStatus: "success",
        lastOperationId: "memory_proposal_review",
        lastTargetPath: "/v1/concierge/memory/proposals/review",
        captureState: "passed",
        comparisonState: "passed",
      },
      httpEvaluator: {
        status: "passed",
        targetPath: "/chief-of-staff/reviews/evaluation",
      },
      contractPacketSubmissions: {
        status: "passed",
        submissionCount: 2,
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        routingPerformed: false,
        registryUpdatePerformed: false,
        traceAppendPerformed: false,
        appliedLocally: false,
        submissions: [
          {
            status: "passed",
            targetPath: "/chief-of-staff/requests",
            requestKind: "chief_of_staff_request_handoff",
            operationId: "chief_of_staff_request",
            governanceDecisionObserved: true,
            traceEnvelopeObserved: true,
            auditEnvelopeObserved: true,
            approvalCaptured: false,
            memoryWritePerformed: false,
            agentDispatchPerformed: false,
            externalSendPerformed: false,
            routingPerformed: false,
            registryUpdatePerformed: false,
            traceAppendPerformed: false,
            appliedLocally: false,
          },
          {
            status: "passed",
            targetPath: "/governance/evaluate",
            requestKind: "governance_evaluation_handoff",
            operationId: "governance_evaluation",
            governanceDecisionObserved: true,
            traceEnvelopeObserved: true,
            auditEnvelopeObserved: true,
            approvalCaptured: false,
            memoryWritePerformed: false,
            agentDispatchPerformed: false,
            externalSendPerformed: false,
            routingPerformed: false,
            registryUpdatePerformed: false,
            traceAppendPerformed: false,
            appliedLocally: false,
          },
        ],
      },
      artifactPrivacy: {
        status: "passed",
      },
      promotionReadiness: {
        gate: "ready_for_human_review",
        locallySafeToConsider: true,
      },
      promotionBoundary: {
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        appliedLocally: false,
      },
    }),
  );

  assert.equal(accepted.status, "rejected");
  assert.equal(
    accepted.summary,
    "Accepted readiness proof import rejected because it is not successful text-turn runtime evidence.",
  );
  assert.equal(accepted.lastRealRuntimeProof, undefined);
});

test("rejects live-runtime summary when governed packet evidence is missing or failed", () => {
  const missingPackets = importAcceptedBridgeReadinessProof(
    JSON.stringify({
      runtimeValidation: { source: "real_runtime" },
      bridgeEvidence: {
        status: "passed",
        lastEvidenceStatus: "success",
        lastOperationId: "text_turn",
        lastTargetPath: "/cos/text-turn",
        captureState: "passed",
        comparisonState: "passed",
      },
      httpEvaluator: { status: "passed" },
      artifactPrivacy: { status: "passed" },
      promotionReadiness: { gate: "ready_for_human_review", locallySafeToConsider: true },
      promotionBoundary: {
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        appliedLocally: false,
      },
    }),
  );
  const failedPackets = importAcceptedBridgeReadinessProof(
    JSON.stringify({
      runtimeValidation: { source: "real_runtime" },
      bridgeEvidence: {
        status: "passed",
        lastEvidenceStatus: "success",
        lastOperationId: "text_turn",
        lastTargetPath: "/cos/text-turn",
        captureState: "passed",
        comparisonState: "passed",
      },
      httpEvaluator: { status: "passed" },
      contractPacketSubmissions: {
        status: "failed",
        failureReason: "contract_packet_handoff_not_advertised",
        submissionCount: 0,
        submissions: [],
      },
      artifactPrivacy: { status: "passed" },
      promotionReadiness: { gate: "ready_for_human_review", locallySafeToConsider: true },
      promotionBoundary: {
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        appliedLocally: false,
      },
    }),
  );

  assert.equal(missingPackets.status, "rejected");
  assert.ok(missingPackets.summary.includes("not a successful real-runtime proof"));
  assert.equal(failedPackets.status, "rejected");
  assert.ok(failedPackets.summary.includes("not a successful real-runtime proof"));
});

test("rejects live-runtime summary when governed packet evidence claims side effects", () => {
  const imported = importAcceptedBridgeReadinessProof(
    JSON.stringify({
      runtimeValidation: { source: "real_runtime" },
      bridgeEvidence: {
        status: "passed",
        lastEvidenceStatus: "success",
        lastOperationId: "text_turn",
        lastTargetPath: "/cos/text-turn",
        captureState: "passed",
        comparisonState: "passed",
      },
      httpEvaluator: { status: "passed" },
      contractPacketSubmissions: {
        status: "passed",
        submissionCount: 2,
        submissions: [
          {
            status: "passed",
            targetPath: "/chief-of-staff/requests",
            governanceDecisionObserved: true,
            traceEnvelopeObserved: true,
            auditEnvelopeObserved: true,
            routingPerformed: true,
          },
          {
            status: "passed",
            targetPath: "/governance/evaluate",
            governanceDecisionObserved: true,
            traceEnvelopeObserved: true,
            auditEnvelopeObserved: true,
          },
        ],
      },
      artifactPrivacy: { status: "passed" },
      promotionReadiness: { gate: "ready_for_human_review", locallySafeToConsider: true },
      promotionBoundary: {
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        appliedLocally: false,
      },
    }),
  );

  assert.equal(imported.status, "rejected");
  assert.ok(imported.summary.includes("forbidden side effect"));
});

test("rejects unsafe or non-real-runtime accepted readiness proof imports", () => {
  const localHarness = importAcceptedBridgeReadinessProof(
    JSON.stringify({
      kind: "concierge_bridge_readiness_proof",
      evidence: {
        captureState: "passed",
        comparisonState: "passed",
        lastEvidenceStatus: "success",
        lastOperationId: "text_turn",
        lastTargetPath: "/v1/concierge/turn",
      },
      runtimeValidation: {
        source: "local_harness",
        promotionGate: "blocked_until_real_runtime_evidence_passes",
      },
      boundary: {
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        localApplicationPerformed: false,
      },
    }),
  );
  const unsafe = importAcceptedBridgeReadinessProof(
    JSON.stringify({
      kind: "concierge_bridge_readiness_proof",
      evidence: {
        captureState: "passed",
        comparisonState: "passed",
        lastEvidenceStatus: "success",
        lastOperationId: "text_turn",
        lastTargetPath: "http://127.0.0.1:8787/v1/concierge/turn",
      },
      runtimeValidation: {
        source: "real_runtime",
        promotionGate: "real_runtime_evidence_available",
      },
      boundary: {
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        localApplicationPerformed: false,
      },
    }),
  );

  assert.equal(localHarness.status, "rejected");
  assert.ok(localHarness.summary.includes("not a successful real-runtime proof"));
  assert.equal(unsafe.status, "rejected");
  assert.ok(unsafe.summary.includes("invalid or contains unsafe raw data"));
});
