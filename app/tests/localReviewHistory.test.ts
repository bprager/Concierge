import assert from "node:assert/strict";
import test from "node:test";
import {
  answerLocalReviewHistoryQuestion,
  buildLocalReviewHistoryEntries,
} from "../src/localReviewHistory.js";

test("answers local review history questions from sanitized metadata only", () => {
  const entries = buildLocalReviewHistoryEntries({
    governedReviews: [
      {
        entryType: "governance_review",
        title: "Governance review",
        subjectId: "governance-review:latest",
        status: "requires_review",
        latestKnownOutcome: "Napoleon returned governed review metadata.",
        profileMode: "adult_owner",
        decisionId: "decision_review_history",
        auditId: "audit_review_history",
        traceId: "trace_review_history",
        privacyClass: "metadata_only",
      },
      {
        entryType: "memory_proposal",
        title: "Memory proposal",
        subjectId: "https://private.example/review",
        status: "accepted_for_review",
        latestKnownOutcome: "Do not retain token secret",
        profileMode: "child_protected_user",
        decisionId: "decision_child_review",
        auditId: "audit_child_review",
        traceId: "trace_child_review",
        privacyClass: "child_sensitive",
      },
    ],
  });

  const answer = answerLocalReviewHistoryQuestion("What reviews are waiting on Napoleon?", entries, "adult_owner");

  assert.ok(answer);
  if (!answer) throw new Error("expected review history answer");
  assert.equal(answer.kind, "local_review_history");
  assert.equal(answer.evidenceCount, 1);
  assert.ok(answer.summary.includes("Local review history"));
  assert.ok(answer.summary.includes("Governance review"));
  assert.ok(answer.summary.includes("requires_review"));
  assert.equal(answer.rows[0].title, "Governance review");
  assert.equal(answer.rows[0].decisionId, "decision_review_history");
  assert.equal(answer.boundary.localReviewOnly, true);
  assert.equal(answer.boundary.approvalCaptured, false);
  assert.equal(answer.boundary.memoryWritePerformed, false);
  assert.equal(answer.boundary.agentDispatchPerformed, false);
  assert.equal(answer.boundary.externalSendPerformed, false);
  assert.equal(answer.boundary.registryUpdatePerformed, false);
  assert.equal(answer.boundary.agentActivated, false);
  assert.equal(answer.boundary.evolutionApplied, false);
  assert.equal(answer.boundary.appliedLocally, false);
  assert.equal(JSON.stringify(answer).includes("private.example"), false);
  assert.equal(JSON.stringify(answer).includes("token secret"), false);
});

test("answers direct evolution proposal status questions from local lifecycle metadata", () => {
  const entries = buildLocalReviewHistoryEntries({
    evolutionProposalLifecycleRecords: [
      {
        schemaVersion: "concierge.evolution-proposal-lifecycle.v1",
        proposalId: "evolution-proposal-status-question",
        sourceCapabilityReviewId: "capability-review-status-question",
        profileMode: "adult_owner",
        capability: "Proposal status question answering",
        architectureArea: "observability",
        draftedAt: "2026-06-25T00:03:00.000Z",
        submittedAt: "2026-06-25T00:04:00.000Z",
        updatedAt: "2026-06-25T00:04:00.000Z",
        currentLifecycleState: "accepted_for_review",
        latestKnownOutcome: "Napoleon accepted the proposal for governed intake review.",
        intakeDecisionId: "decision_evolution_status_question",
        intakeAuditId: "audit_evolution_status_question",
        intakeTraceId: "trace_evolution_status_question",
        statusRefresh: {
          available: false,
          reason: "descriptor_status_route_not_advertised",
          nextStep: "Keep local intake result as evidence until Napoleon advertises status.",
        },
        nextRecommendedUserAction: "Wait for Napoleon-governed review evidence.",
        privacyClass: "metadata_only",
        boundary: {
          proposalOnly: true,
          approvalCaptured: false,
          memoryWritePerformed: false,
          agentDispatchPerformed: false,
          externalSendPerformed: false,
          registryUpdatePerformed: false,
          evolutionApplied: false,
          appliedLocally: false,
        },
      },
    ],
  });

  const answer = answerLocalReviewHistoryQuestion("What is the status of my evolution proposal?", entries, "adult_owner");

  assert.ok(answer);
  if (!answer) throw new Error("expected evolution proposal status answer");
  assert.equal(answer.kind, "local_review_history");
  assert.equal(answer.evidenceCount, 1);
  assert.ok(answer.summary.includes("Evolution proposal"));
  assert.ok(answer.summary.includes("accepted_for_review"));
  assert.equal(answer.rows[0].entryType, "evolution_proposal");
  assert.equal(answer.rows[0].subjectId, "evolution-proposal-status-question");
  assert.equal(answer.rows[0].latestKnownOutcome, "Napoleon accepted the proposal for governed intake review.");
  assert.equal(answer.boundary.proposalOnly, true);
  assert.equal(answer.boundary.evolutionApplied, false);
  assert.equal(answer.boundary.appliedLocally, false);
});
