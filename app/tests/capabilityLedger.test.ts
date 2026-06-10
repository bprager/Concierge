import assert from "node:assert/strict";
import test from "node:test";
import {
  appendCapabilitySignal,
  aggregateCapabilitySignals,
  buildCapabilitySignal,
  createCapabilityLedger,
  deriveCapabilitySignalFromEvent,
  type ConversationCapabilitySignal,
} from "../src/capabilityLedger.js";

test("builds valid capability signals without storing raw message text", () => {
  const signal = buildCapabilitySignal({
    traceId: "trace_signal",
    conversationId: "conv_signal",
    turnId: "turn_signal",
    profileMode: "adult_owner",
    channel: "text",
    topicLabel: "deployment",
    intentLabel: "summarize",
    capabilityLabel: "text_rehearsal",
    capabilityStatus: "working",
    outcomeSignal: "rehearsed",
    confidence: 0.82,
    evidenceRefs: ["trace:trace_signal", "event:rehearsal_preview_created"],
    architectureArea: "text_ui",
    privacyClass: "metadata_only",
    suggestedNextStep: "no_action",
    rawMessage: "Remember this raw text must never be stored",
  });

  assert.equal(signal.traceId, "trace_signal");
  assert.equal(signal.eventName, "conversation_capability_signal");
  assert.equal(signal.capabilityStatus, "working");
  assert.equal(signal.outcomeSignal, "rehearsed");
  assert.equal(signal.confidence, 0.82);
  assert.equal("rawMessage" in signal, false);
  assert.equal(JSON.stringify(signal).includes("raw text"), false);
});

test("ledger stores bounded recent signals and aggregates by required dimensions", () => {
  const ledger = createCapabilityLedger({ maxSignals: 2 });
  const first = buildCapabilitySignal({
    traceId: "trace_old",
    conversationId: "conv",
    turnId: "turn_old",
    profileMode: "adult_owner",
    channel: "text",
    topicLabel: "old",
    intentLabel: "summarize",
    capabilityLabel: "old_capability",
    capabilityStatus: "working",
    outcomeSignal: "answered",
    confidence: 0.9,
    evidenceRefs: ["trace:trace_old"],
    architectureArea: "text_ui",
    privacyClass: "metadata_only",
    suggestedNextStep: "no_action",
  });
  const second = { ...first, traceId: "trace_memory", turnId: "turn_memory", topicLabel: "memory", capabilityLabel: "memory_review", architectureArea: "memory_review" } satisfies ConversationCapabilitySignal;
  const third = { ...first, traceId: "trace_bridge", turnId: "turn_bridge", topicLabel: "bridge", capabilityLabel: "bridge_failure", capabilityStatus: "missing", outcomeSignal: "bridge_failed", architectureArea: "bridge", suggestedNextStep: "write_evaluator_case" } satisfies ConversationCapabilitySignal;

  appendCapabilitySignal(ledger, first);
  appendCapabilitySignal(ledger, second);
  appendCapabilitySignal(ledger, third);

  const recent = ledger.listRecent();
  assert.equal(recent.length, 2);
  assert.deepEqual(recent.map((signal) => signal.traceId), ["trace_memory", "trace_bridge"]);

  const aggregate = aggregateCapabilitySignals(recent);
  assert.equal(aggregate.byTopic.memory, 1);
  assert.equal(aggregate.byTopic.bridge, 1);
  assert.equal(aggregate.byCapability.memory_review, 1);
  assert.equal(aggregate.byStatus.missing, 1);
  assert.equal(aggregate.byArchitectureArea.bridge, 1);
});

test("child protected signals use stricter privacy class and no raw content", () => {
  const signal = buildCapabilitySignal({
    traceId: "trace_child",
    conversationId: "conv_child",
    turnId: "turn_child",
    profileMode: "child_protected_user",
    channel: "text",
    topicLabel: "school",
    intentLabel: "ask_help",
    capabilityLabel: "child_safe_response",
    capabilityStatus: "working",
    outcomeSignal: "answered",
    confidence: 0.7,
    evidenceRefs: ["trace:trace_child"],
    architectureArea: "text_ui",
    privacyClass: "metadata_only",
    suggestedNextStep: "no_action",
    rawMessage: "child raw content",
  });

  assert.equal(signal.privacyClass, "child_sensitive");
  assert.equal(JSON.stringify(signal).includes("child raw content"), false);
});

test("blocked governance outcomes are separate from failed safe requests", () => {
  const reviewRequired = deriveCapabilitySignalFromEvent("governance_review_required", {
    traceId: "trace_review_required",
    conversationId: "conv_review_required",
    turnId: "turn_review_required",
    profile: "adult_owner",
  });
  const blocked = deriveCapabilitySignalFromEvent("governance_review_blocked", {
    traceId: "trace_blocked",
    conversationId: "conv_blocked",
    turnId: "turn_blocked",
    profile: "adult_owner",
    outcome: "no_go",
  });
  const failed = deriveCapabilitySignalFromEvent("response_failed", {
    traceId: "trace_failed",
    conversationId: "conv_failed",
    turnId: "turn_failed",
    profile: "adult_owner",
  });

  assert.equal(reviewRequired.capabilityStatus, "degraded");
  assert.equal(reviewRequired.outcomeSignal, "review_required");
  assert.equal(reviewRequired.suggestedNextStep, "needs_human_review");
  assert.equal(blocked.capabilityStatus, "blocked");
  assert.equal(blocked.outcomeSignal, "blocked");
  assert.equal(blocked.suggestedNextStep, "no_action");
  assert.equal(failed.capabilityStatus, "missing");
  assert.equal(failed.outcomeSignal, "bridge_failed");
  assert.equal(failed.suggestedNextStep, "write_evaluator_case");
});

test("capability recommendations remain proposal-only and non-authoritative", () => {
  const signal = deriveCapabilitySignalFromEvent("memory_proposal_acknowledged_locally", {
    traceId: "trace_memory_ack",
    conversationId: "conv_memory_ack",
    turnId: "turn_memory_ack",
    profile: "adult_owner",
  });

  assert.equal(signal.suggestedNextStep, "create_evolution_proposal");
  assert.equal(signal.recommendationBoundary.proposalOnly, true);
  assert.equal(signal.recommendationBoundary.approvalCaptured, false);
  assert.equal(signal.recommendationBoundary.memoryWriteAllowed, false);
  assert.equal(signal.recommendationBoundary.agentDispatchAllowed, false);
  assert.equal(signal.recommendationBoundary.externalSendAllowed, false);
});
