import assert from "node:assert/strict";
import test from "node:test";
import { parseEvaluatorValidationArtifact } from "../src/evaluatorValidationArtifact.js";

test("accepts sanitized live runtime evaluator summary", () => {
  const result = parseEvaluatorValidationArtifact(
    JSON.stringify({
      runtimeValidation: {
        source: "real_runtime",
      },
      httpEvaluator: {
        status: "passed",
        failureReason: "none",
        targetPath: "/chief-of-staff/reviews/evaluation",
        targetRequestKind: "evaluation_review_handoff",
        targetOperationId: "evaluation_review",
        endpointHostRetained: false,
        tokenRetained: false,
        requestBodyRetained: false,
        responseBodyRetained: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
      },
    }),
  );

  assert.equal(result.status, "accepted");
  assert.deepEqual(result.validation, {
    status: "passed",
    failureReason: "none",
    targetPath: "/chief-of-staff/reviews/evaluation",
    requestKind: "evaluation_review_handoff",
    operationId: "evaluation_review",
  });
  assert.equal(result.runtimeValidationSource, "real_runtime");
});

test("accepts sanitized unadvertised evaluator handoff summary", () => {
  const result = parseEvaluatorValidationArtifact(
    JSON.stringify({
      runtimeValidation: {
        source: "real_runtime",
      },
      httpEvaluator: {
        status: "failed",
        failureReason: "http_evaluator_handoff_not_advertised",
        targetPath: "/chief-of-staff/reviews/evaluation",
        targetRequestKind: "evaluation_review_handoff",
        targetOperationId: "evaluation_review",
        descriptorHandoffAdvertised: false,
        descriptorHandoffSource: "not_advertised",
        descriptorHandoffFailureReason: "evaluation_handoff_not_advertised",
        descriptorHandoffRequiredAction:
          "Napoleon must advertise evaluation_review in supportedHandoffs, supported_handoffs, required_for, or descriptor endpoint metadata for /chief-of-staff/reviews/evaluation.",
        napoleonRequiredActions: [
          {
            id: "advertise_evaluation_review_handoff",
            owner: "napoleon",
            reason: "real_runtime_promotion_blocker",
            handoffName: "evaluation_review",
            targetPath: "/chief-of-staff/reviews/evaluation",
            requestKind: "evaluation_review_handoff",
            operationId: "evaluation_review",
            advertiseUsing: ["supportedHandoffs", "required_for"],
            requiredAction:
              "Napoleon must advertise evaluation_review in supportedHandoffs, supported_handoffs, required_for, or descriptor endpoint metadata for /chief-of-staff/reviews/evaluation.",
            sideEffectsPerformed: false,
            approvalCaptured: false,
            memoryWritePerformed: false,
            agentDispatchPerformed: false,
            externalSendPerformed: false,
            appliedLocally: false,
          },
        ],
        endpointHostRetained: false,
        tokenRetained: false,
        requestBodyRetained: false,
        responseBodyRetained: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
      },
    }),
  );

  assert.equal(result.status, "accepted");
  assert.equal(
    result.summary,
    "Evaluator HTTP validation failed because the Napoleon descriptor does not advertise evaluation review. Napoleon must advertise evaluation_review in supportedHandoffs, supported_handoffs, required_for, or descriptor endpoint metadata for /chief-of-staff/reviews/evaluation.",
  );
  assert.deepEqual(result.validation, {
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
    napoleonRequiredActions: [
      {
        id: "advertise_evaluation_review_handoff",
        owner: "napoleon",
        reason: "real_runtime_promotion_blocker",
        handoffName: "evaluation_review",
        targetPath: "/chief-of-staff/reviews/evaluation",
        requestKind: "evaluation_review_handoff",
        operationId: "evaluation_review",
        advertiseUsing: ["supportedHandoffs", "required_for"],
        requiredAction:
          "Napoleon must advertise evaluation_review in supportedHandoffs, supported_handoffs, required_for, or descriptor endpoint metadata for /chief-of-staff/reviews/evaluation.",
        sideEffectsPerformed: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        appliedLocally: false,
      },
    ],
  });
});

test("imports aggregate Napoleon required actions from live runtime summary", () => {
  const result = parseEvaluatorValidationArtifact(
    JSON.stringify({
      runtimeValidation: {
        source: "real_runtime",
      },
      napoleonRequiredActions: [
        {
          id: "advertise_chief_of_staff_request_handoff",
          owner: "napoleon",
          reason: "real_runtime_promotion_blocker",
          handoffName: "chief_of_staff_request",
          targetPath: "/chief-of-staff/requests",
          requestKind: "chief_of_staff_request_handoff",
          operationId: "chief_of_staff_request",
          advertiseUsing: ["supportedHandoffs", "required_for"],
          requiredAction:
            "Napoleon must advertise chief_of_staff_request in supportedHandoffs, supported_handoffs, required_for, or descriptor endpoint metadata for /chief-of-staff/requests.",
          sideEffectsPerformed: false,
          approvalCaptured: false,
          memoryWritePerformed: false,
          agentDispatchPerformed: false,
          externalSendPerformed: false,
          appliedLocally: false,
        },
        {
          id: "advertise_governance_evaluation_handoff",
          owner: "napoleon",
          reason: "real_runtime_promotion_blocker",
          handoffName: "governance_evaluation",
          targetPath: "/governance/evaluate",
          requestKind: "governance_evaluation_handoff",
          operationId: "governance_evaluation",
          advertiseUsing: ["supportedHandoffs", "required_for"],
          requiredAction:
            "Napoleon must advertise governance_evaluation in supportedHandoffs, supported_handoffs, required_for, or descriptor endpoint metadata for /governance/evaluate.",
          sideEffectsPerformed: false,
          approvalCaptured: false,
          memoryWritePerformed: false,
          agentDispatchPerformed: false,
          externalSendPerformed: false,
          appliedLocally: false,
        },
        {
          id: "advertise_evaluation_review_handoff",
          owner: "napoleon",
          reason: "real_runtime_promotion_blocker",
          handoffName: "evaluation_review",
          targetPath: "/chief-of-staff/reviews/evaluation",
          requestKind: "evaluation_review_handoff",
          operationId: "evaluation_review",
          advertiseUsing: ["supportedHandoffs", "required_for"],
          requiredAction:
            "Napoleon must advertise evaluation_review in supportedHandoffs, supported_handoffs, required_for, or descriptor endpoint metadata for /chief-of-staff/reviews/evaluation.",
          sideEffectsPerformed: false,
          approvalCaptured: false,
          memoryWritePerformed: false,
          agentDispatchPerformed: false,
          externalSendPerformed: false,
          appliedLocally: false,
        },
      ],
      contractPacketSubmissions: {
        status: "failed",
        failureReason: "contract_packet_handoff_not_advertised",
      },
      httpEvaluator: {
        status: "failed",
        failureReason: "http_evaluator_handoff_not_advertised",
        targetPath: "/chief-of-staff/reviews/evaluation",
        targetRequestKind: "evaluation_review_handoff",
        targetOperationId: "evaluation_review",
        descriptorHandoffAdvertised: false,
        descriptorHandoffSource: "not_advertised",
        descriptorHandoffFailureReason: "evaluation_handoff_not_advertised",
        descriptorHandoffRequiredAction:
          "Napoleon must advertise evaluation_review in supportedHandoffs, supported_handoffs, required_for, or descriptor endpoint metadata for /chief-of-staff/reviews/evaluation.",
        napoleonRequiredActions: [
          {
            id: "advertise_evaluation_review_handoff",
            owner: "napoleon",
            reason: "real_runtime_promotion_blocker",
            handoffName: "evaluation_review",
            targetPath: "/chief-of-staff/reviews/evaluation",
            requestKind: "evaluation_review_handoff",
            operationId: "evaluation_review",
            advertiseUsing: ["supportedHandoffs", "required_for"],
            requiredAction:
              "Napoleon must advertise evaluation_review in supportedHandoffs, supported_handoffs, required_for, or descriptor endpoint metadata for /chief-of-staff/reviews/evaluation.",
            sideEffectsPerformed: false,
            approvalCaptured: false,
            memoryWritePerformed: false,
            agentDispatchPerformed: false,
            externalSendPerformed: false,
            appliedLocally: false,
          },
        ],
        endpointHostRetained: false,
        tokenRetained: false,
        requestBodyRetained: false,
        responseBodyRetained: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
      },
    }),
  );

  assert.equal(result.status, "accepted");
  assert.deepEqual(
    result.validation.napoleonRequiredActions?.map((action) => action.id),
    [
      "advertise_chief_of_staff_request_handoff",
      "advertise_governance_evaluation_handoff",
      "advertise_evaluation_review_handoff",
    ],
  );
});

test("rejects evaluator required-action metadata that claims side effects", () => {
  const result = parseEvaluatorValidationArtifact(
    JSON.stringify({
      runtimeValidation: {
        source: "real_runtime",
      },
      httpEvaluator: {
        status: "failed",
        failureReason: "http_evaluator_handoff_not_advertised",
        targetPath: "/chief-of-staff/reviews/evaluation",
        targetRequestKind: "evaluation_review_handoff",
        targetOperationId: "evaluation_review",
        napoleonRequiredActions: [
          {
            id: "advertise_evaluation_review_handoff",
            owner: "napoleon",
            sideEffectsPerformed: true,
          },
        ],
        endpointHostRetained: false,
        tokenRetained: false,
        requestBodyRetained: false,
        responseBodyRetained: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
      },
    }),
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.validation.status, "failed");
  assert.ok(result.validation.failureReason?.includes("invalid Napoleon required-action metadata"));
});

test("rejects evaluator required-action metadata without explicit false side-effect boundaries", () => {
  const result = parseEvaluatorValidationArtifact(
    JSON.stringify({
      runtimeValidation: {
        source: "real_runtime",
      },
      httpEvaluator: {
        status: "failed",
        failureReason: "http_evaluator_handoff_not_advertised",
        targetPath: "/chief-of-staff/reviews/evaluation",
        targetRequestKind: "evaluation_review_handoff",
        targetOperationId: "evaluation_review",
        napoleonRequiredActions: [
          {
            id: "advertise_evaluation_review_handoff",
            owner: "napoleon",
            sideEffectsPerformed: false,
          },
        ],
        endpointHostRetained: false,
        tokenRetained: false,
        requestBodyRetained: false,
        responseBodyRetained: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
      },
    }),
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.validation.status, "failed");
  assert.ok(result.validation.failureReason?.includes("invalid Napoleon required-action metadata"));
});

test("rejects evaluator required-action metadata not owned by Napoleon", () => {
  const result = parseEvaluatorValidationArtifact(
    JSON.stringify({
      runtimeValidation: {
        source: "real_runtime",
      },
      httpEvaluator: {
        status: "failed",
        failureReason: "http_evaluator_handoff_not_advertised",
        targetPath: "/chief-of-staff/reviews/evaluation",
        targetRequestKind: "evaluation_review_handoff",
        targetOperationId: "evaluation_review",
        napoleonRequiredActions: [
          {
            id: "advertise_evaluation_review_handoff",
            owner: "concierge",
            sideEffectsPerformed: false,
            approvalCaptured: false,
            memoryWritePerformed: false,
            agentDispatchPerformed: false,
            externalSendPerformed: false,
            appliedLocally: false,
          },
        ],
        endpointHostRetained: false,
        tokenRetained: false,
        requestBodyRetained: false,
        responseBodyRetained: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
      },
    }),
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.validation.status, "failed");
  assert.ok(result.validation.failureReason?.includes("invalid Napoleon required-action metadata"));
});

test("rejects malformed evaluator validation artifact", () => {
  const result = parseEvaluatorValidationArtifact("{not json");

  assert.equal(result.status, "rejected");
  assert.equal(result.validation.status, "failed");
  assert.ok(result.validation.failureReason?.includes("valid JSON"));
});

test("rejects evaluator artifact that retains endpoint or payload data", () => {
  const result = parseEvaluatorValidationArtifact(
    JSON.stringify({
      runtimeValidation: {
        source: "real_runtime",
      },
      httpEvaluator: {
        status: "passed",
        targetPath: "/chief-of-staff/reviews/evaluation",
        targetRequestKind: "evaluation_review_handoff",
        targetOperationId: "evaluation_review",
        endpointHostRetained: true,
        tokenRetained: false,
        requestBodyRetained: false,
        responseBodyRetained: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
      },
    }),
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.validation.status, "failed");
  assert.ok(result.validation.failureReason?.includes("retained endpoint"));
});

test("marks mismatched evaluator target as stale", () => {
  const result = parseEvaluatorValidationArtifact(
    JSON.stringify({
      runtimeValidation: {
        source: "real_runtime",
      },
      httpEvaluator: {
        status: "passed",
        failureReason: "none",
        targetPath: "/v1/concierge/evaluate",
        targetRequestKind: "evaluator_prompt",
        targetOperationId: "evaluate",
        endpointHostRetained: false,
        tokenRetained: false,
        requestBodyRetained: false,
        responseBodyRetained: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
      },
    }),
    { expectedTargetPath: "/chief-of-staff/reviews/evaluation" },
  );

  assert.equal(result.status, "stale");
  assert.equal(result.validation.status, "failed");
  assert.ok(result.validation.failureReason?.includes("does not match"));
});
