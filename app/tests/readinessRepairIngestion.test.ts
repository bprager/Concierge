import assert from "node:assert/strict";
import test from "node:test";
import {
  ingestReadinessRepairProofs,
  type ReadinessRepairChecklist,
} from "../src/readinessRepairIngestion.js";

function validProof(generatedAt = "2026-06-28T20:00:00.000Z"): string {
  return JSON.stringify({
    kind: "concierge_bridge_readiness_proof",
    version: 1,
    generatedAt,
    descriptor: {
      state: "ready",
      checksumState: "matched",
      signatureState: "valid",
      serviceId: "napoleon.chief_of_staff",
    },
    runtimeValidation: {
      source: "real_runtime",
      promotionGate: "blocked_until_runtime_contract_actions_cleared",
      evaluator: {
        status: "passed",
        requiredActionSource: "evaluator_validation",
        napoleonRequiredActionCount: 2,
        blockingLivePromotion: true,
        highestPriorityAction: {
          id: "advertise_evaluation_review_handoff",
          owner: "napoleon_runtime",
          reason: "descriptor_missing_handoff",
          handoffName: "evaluation_review",
          targetPath: "/chief-of-staff/reviews/evaluation",
          requestKind: "evaluation_review_handoff",
          operationId: "evaluation_review",
          advertiseUsing: ["supportedHandoffs", "required_for"],
          blockingLivePromotion: true,
          sideEffectsPerformed: false,
          approvalCaptured: false,
          memoryWritePerformed: false,
          agentDispatchPerformed: false,
          externalSendPerformed: false,
          appliedLocally: false,
        },
        missingHandoffTarget: {
          id: "advertise_evaluation_review_handoff",
          owner: "napoleon_runtime",
          reason: "descriptor_missing_handoff",
          handoffName: "evaluation_review",
          targetPath: "/chief-of-staff/reviews/evaluation",
          requestKind: "evaluation_review_handoff",
          operationId: "evaluation_review",
          advertiseUsing: ["supportedHandoffs", "required_for"],
          blockingLivePromotion: true,
          sideEffectsPerformed: false,
          approvalCaptured: false,
          memoryWritePerformed: false,
          agentDispatchPerformed: false,
          externalSendPerformed: false,
          appliedLocally: false,
        },
        implementationNextStep:
          "Implementation next step: expose /chief-of-staff/reviews/evaluation for evaluation_review_handoff and advertise it via supportedHandoffs, required_for.",
        napoleonRequiredActions: [
          {
            id: "advertise_evaluation_review_handoff",
            owner: "napoleon_runtime",
            reason: "descriptor_missing_handoff",
            handoffName: "evaluation_review",
            targetPath: "/chief-of-staff/reviews/evaluation",
            requestKind: "evaluation_review_handoff",
            operationId: "evaluation_review",
            advertiseUsing: ["supportedHandoffs", "required_for"],
            blockingLivePromotion: true,
            requiredAction:
              "Napoleon must expose and advertise evaluation_review at /chief-of-staff/reviews/evaluation.",
            sideEffectsPerformed: false,
            approvalCaptured: false,
            memoryWritePerformed: false,
            agentDispatchPerformed: false,
            externalSendPerformed: false,
            appliedLocally: false,
          },
          {
            id: "expose_evolution_proposal_status_runtime_target",
            owner: "napoleon_runtime",
            reason: "missing_named_concierge_runtime_target",
            handoffName: "evolution_proposal_status",
            targetPath: "/evolution/proposals/{proposal_id}/status",
            requestKind: "evolution_proposal_status_handoff",
            operationId: "evolution_proposal_status",
            advertiseUsing: ["supportedHandoffs", "required_for"],
            blockingLivePromotion: true,
            requiredAction:
              "Napoleon must expose and advertise evolution_proposal_status at /evolution/proposals/{proposal_id}/status.",
            sideEffectsPerformed: false,
            approvalCaptured: false,
            memoryWritePerformed: false,
            agentDispatchPerformed: false,
            externalSendPerformed: false,
            appliedLocally: false,
          },
        ],
        connectionValueStored: false,
        credentialValueStored: false,
        requestPayloadStored: false,
        responsePayloadStored: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
      },
    },
    boundary: {
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      localApplicationPerformed: false,
      proposalOnly: true,
    },
  });
}

test("ingests sanitized readiness proof into proposal-only repair checklist", () => {
  const result = ingestReadinessRepairProofs([validProof()]);

  assert.equal(result.status, "accepted");
  assert.equal(result.rejectedProofCount, 0);
  assert.equal(result.checklist.length, 2);
  assert.deepEqual(result.boundary, {
    proposalOnly: true,
    approvalCaptured: false,
    memoryWritePerformed: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    localApplicationPerformed: false,
  });
  assert.deepEqual(result.checklist[0], {
    id: "advertise_evaluation_review_handoff",
    title: "Repair Napoleon handoff: evaluation_review",
    summary: "descriptor_missing_handoff",
    handoffName: "evaluation_review",
    targetPath: "/chief-of-staff/reviews/evaluation",
    requestKind: "evaluation_review_handoff",
    operationId: "evaluation_review",
    advertiseUsing: ["supportedHandoffs", "required_for"],
    blockingLivePromotion: true,
    implementationNextStep:
      "Implementation next step: expose /chief-of-staff/reviews/evaluation for evaluation_review_handoff and advertise it via supportedHandoffs, required_for.",
    source: {
      generatedAt: "2026-06-28T20:00:00.000Z",
      requiredActionSource: "evaluator_validation",
      runtimeValidationSource: "real_runtime",
      promotionGate: "blocked_until_runtime_contract_actions_cleared",
      descriptorState: "ready",
      descriptorChecksumState: "matched",
      descriptorSignatureState: "valid",
    },
  } satisfies ReadinessRepairChecklist);
});

test("rejects readiness repair proofs with unsafe fields or side-effect claims", () => {
  const unsafeProof = JSON.parse(validProof()) as Record<string, unknown>;
  unsafeProof.requestBody = { message: "raw user text" };
  const sideEffectProof = JSON.parse(validProof()) as {
    boundary: { memoryWritePerformed: boolean };
  };
  sideEffectProof.boundary.memoryWritePerformed = true;

  const result = ingestReadinessRepairProofs([JSON.stringify(unsafeProof), JSON.stringify(sideEffectProof)]);

  assert.equal(result.status, "rejected");
  assert.equal(result.checklist.length, 0);
  assert.equal(result.rejectedProofCount, 2);
  assert.equal(JSON.stringify(result).includes("raw user text"), false);
});

test("deduplicates required actions by id and keeps the freshest proof context", () => {
  const olderProof = JSON.parse(validProof("2026-06-28T20:00:00.000Z")) as {
    runtimeValidation: {
      evaluator: {
        napoleonRequiredActions: Array<{ id: string; reason: string }>;
      };
    };
  };
  olderProof.runtimeValidation.evaluator.napoleonRequiredActions = [
    {
      ...olderProof.runtimeValidation.evaluator.napoleonRequiredActions[0],
      reason: "older_descriptor_missing_handoff",
    },
  ];
  const newerProof = JSON.parse(validProof("2026-06-28T21:00:00.000Z")) as {
    runtimeValidation: {
      evaluator: {
        napoleonRequiredActions: Array<{ id: string; reason: string }>;
      };
    };
  };
  newerProof.runtimeValidation.evaluator.napoleonRequiredActions = [
    {
      ...newerProof.runtimeValidation.evaluator.napoleonRequiredActions[0],
      reason: "newer_descriptor_missing_handoff",
    },
  ];

  const result = ingestReadinessRepairProofs([JSON.stringify(olderProof), JSON.stringify(newerProof)]);

  assert.equal(result.status, "accepted");
  assert.equal(result.checklist.length, 1);
  assert.equal(result.checklist[0]?.summary, "newer_descriptor_missing_handoff");
  assert.equal(result.checklist[0]?.source.generatedAt, "2026-06-28T21:00:00.000Z");
});

test("rejects local-only proof that claims real runtime promotion readiness", () => {
  const proof = JSON.parse(validProof()) as {
    runtimeValidation: { source: string; promotionGate: string };
  };
  proof.runtimeValidation.source = "local_harness";
  proof.runtimeValidation.promotionGate = "real_runtime_evidence_available";

  const result = ingestReadinessRepairProofs([JSON.stringify(proof)]);

  assert.equal(result.status, "rejected");
  assert.equal(result.checklist.length, 0);
  assert.equal(result.rejectedProofCount, 1);
});
