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
  assert.equal(result.summary, "Evaluator HTTP validation failed because the Napoleon descriptor does not advertise evaluation review.");
  assert.deepEqual(result.validation, {
    status: "failed",
    failureReason: "http_evaluator_handoff_not_advertised",
    targetPath: "/chief-of-staff/reviews/evaluation",
    requestKind: "evaluation_review_handoff",
    operationId: "evaluation_review",
    descriptorHandoffAdvertised: false,
    descriptorHandoffSource: "not_advertised",
    descriptorHandoffFailureReason: "evaluation_handoff_not_advertised",
  });
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
