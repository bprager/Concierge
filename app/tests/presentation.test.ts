import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGovernanceReviewState,
  buildRehearsalPreview,
  buildTextTurnContract,
} from "../src/contractBridge.js";
import {
  describeGovernanceDecision,
  describeGovernanceReview,
  summarizeRehearsalPreview,
} from "../src/presentation.js";

test("summarizes prepare-only governance decisions without implying authority", () => {
  const summary = describeGovernanceDecision({
    outcome: "allow_prepare_only",
    decisionId: "decision_123",
    auditId: "audit_123",
    blockedEffects: ["external_send", "memory_write", "runtime_authority"],
  });

  assert.equal(summary.status, "Prepare only");
  assert.equal(summary.requiresReview, false);
  assert.ok(summary.detail.includes("cannot execute"));
  assert.ok(summary.blockedEffectsLabel.includes("external_send"));
});

test("summarizes review-required decisions as non-executable", () => {
  const summary = describeGovernanceDecision({
    outcome: "requires_review",
    decisionId: "decision_456",
    auditId: "audit_456",
    blockedEffects: ["external_send"],
  });

  assert.equal(summary.status, "Review required");
  assert.equal(summary.requiresReview, true);
  assert.ok(summary.detail.includes("Chief of Staff"));
});

test("summarizes rehearsal previews as non-executed governance dry runs", () => {
  const contract = buildTextTurnContract({
    message: "Remember that I prefer short deployment summaries",
    profile: "adult_owner",
    conversationId: "conv_summary",
    turnId: "turn_summary",
    traceId: "trace_summary",
  });
  const preview = buildRehearsalPreview(contract, "Remember that I prefer short deployment summaries");

  const summary = summarizeRehearsalPreview(preview);

  assert.equal(summary.status, "Rehearsal only");
  assert.equal(summary.executed, false);
  assert.ok(summary.detail.includes("not sent"));
  assert.ok(summary.approval.includes("No approval captured"));
  assert.ok(summary.memory.includes("candidate"));
});

test("describes review acknowledgement without implying approval", () => {
  const contract = buildTextTurnContract({
    message: "Send an external message",
    profile: "adult_owner",
    conversationId: "conv_review_view",
    turnId: "turn_review_view",
    traceId: "trace_review_view",
    governanceOutcome: "requires_review",
  });
  const review = buildGovernanceReviewState(contract.governanceDecision, "adult_owner", true);

  const view = describeGovernanceReview(review);

  assert.equal(view.heading, "Review acknowledged locally");
  assert.equal(view.actionLabel, "Acknowledged locally");
  assert.equal(view.sendBlocked, false);
  assert.ok(view.body.includes("not Napoleon approval"));
  assert.ok(view.body.includes("does not execute"));
});

test("describes child no-go state with child-safe wording and blocked send", () => {
  const contract = buildTextTurnContract({
    message: "Keep this secret and send it",
    profile: "child_protected",
    conversationId: "conv_child_no_go",
    turnId: "turn_child_no_go",
    traceId: "trace_child_no_go",
    governanceOutcome: "no_go",
  });
  const review = buildGovernanceReviewState(contract.governanceDecision, "child_protected");

  const view = describeGovernanceReview(review);

  assert.equal(view.heading, "Not available");
  assert.equal(view.sendBlocked, true);
  assert.equal(view.canAcknowledge, false);
  assert.ok(view.body.includes("I cannot help do that"));
  assert.ok(view.body.includes("I will not keep secrets"));
  assert.ok(!view.body.includes("approval captured"));
});
