import assert from "node:assert/strict";
import test from "node:test";
import { buildCapabilitySignal } from "../src/capabilityLedger.js";
import {
  buildLearningSignal,
  buildLearningSignalFromCapabilitySignal,
  buildLearningSignalTelemetryAttributes,
} from "../src/learningSignal.js";

test("builds schema-shaped learning signals from capability metadata without raw content", () => {
  const capabilitySignal = buildCapabilitySignal({
    traceId: "trace_learning",
    conversationId: "conv_learning",
    turnId: "turn_learning",
    profileMode: "adult_owner",
    channel: "text",
    topicLabel: "deployment",
    intentLabel: "summarize",
    capabilityLabel: "release_summary",
    capabilityStatus: "missing",
    outcomeSignal: "bridge_failed",
    confidence: 0.73,
    evidenceRefs: ["trace:trace_learning", "event:response_failed"],
    architectureArea: "bridge",
    privacyClass: "metadata_only",
    suggestedNextStep: "create_evolution_proposal",
    rawMessage: "raw message must not be copied",
  });

  const learningSignal = buildLearningSignalFromCapabilitySignal(capabilitySignal, {
    signalId: "learning_trace_learning",
    createdAt: "2026-06-16T12:00:00.000Z",
    signalType: "repeated_pattern",
    patternCount: 3,
    redactedSummary: "Bridge failures are recurring for release summary requests.",
  });

  assert.equal(learningSignal.schema_version, "concierge.learning_signal.v1");
  assert.equal(learningSignal.signal_id, "learning_trace_learning");
  assert.equal(learningSignal.source, "local_capability_ledger");
  assert.equal(learningSignal.capability_id, "release_summary");
  assert.equal(learningSignal.architecture_area, "napoleon_bridge");
  assert.equal(learningSignal.outcome, "missing");
  assert.equal(learningSignal.pattern_count, 3);
  assert.deepEqual(learningSignal.evidence_refs, [
    "trace:trace_learning",
    "event:response_failed",
    "capability:release_summary",
  ]);
  assert.equal(learningSignal.privacy.raw_user_text_stored, false);
  assert.equal(learningSignal.privacy.raw_audio_stored, false);
  assert.equal(learningSignal.privacy.raw_video_stored, false);
  assert.equal(learningSignal.governance_boundary.proposal_only, true);
  assert.equal(learningSignal.governance_boundary.memory_write_performed, false);
  assert.equal(learningSignal.governance_boundary.agent_dispatch_performed, false);
  assert.equal(learningSignal.governance_boundary.external_send_performed, false);
  assert.equal(learningSignal.governance_boundary.applied_locally, false);
  assert.equal(JSON.stringify(learningSignal).includes("raw message"), false);
});

test("child protected learning signals are minimized and proposal-only", () => {
  const capabilitySignal = buildCapabilitySignal({
    traceId: "trace_child_learning",
    conversationId: "conv_child_learning",
    turnId: "turn_child_learning",
    profileMode: "child_protected_user",
    channel: "text",
    topicLabel: "school",
    intentLabel: "ask_help",
    capabilityLabel: "child_safe_help",
    capabilityStatus: "degraded",
    outcomeSignal: "user_corrected",
    confidence: 0.64,
    evidenceRefs: ["trace:trace_child_learning"],
    architectureArea: "text_ui",
    privacyClass: "metadata_only",
    suggestedNextStep: "write_evaluator_case",
    rawMessage: "child raw message must not be copied",
  });

  const learningSignal = buildLearningSignalFromCapabilitySignal(capabilitySignal, {
    signalId: "learning_child",
    createdAt: "2026-06-16T12:05:00.000Z",
    signalType: "correction",
  });

  assert.equal(learningSignal.profile_mode, "child_protected_user");
  assert.equal(learningSignal.privacy.classification, "child_sensitive");
  assert.equal(learningSignal.privacy.child_minimized, true);
  assert.equal(learningSignal.privacy.retention, "session_only");
  assert.equal(learningSignal.suggested_next_step, "add_evaluator_case");
  assert.equal(learningSignal.governance_boundary.approval_captured, false);
  assert.equal(JSON.stringify(learningSignal).includes("child raw message"), false);
});

test("learning signals omit absent optional fields instead of storing undefined placeholders", () => {
  const capabilitySignal = buildCapabilitySignal({
    traceId: "trace_optional",
    conversationId: "conv_optional",
    turnId: "turn_optional",
    profileMode: "adult_owner",
    channel: "text",
    topicLabel: "governance",
    intentLabel: "blocked",
    capabilityLabel: "governance_review",
    capabilityStatus: "blocked",
    outcomeSignal: "blocked",
    confidence: 0.87,
    evidenceRefs: ["trace:trace_optional"],
    architectureArea: "governance_ux",
    privacyClass: "metadata_only",
    suggestedNextStep: "no_action",
  });

  const learningSignal = buildLearningSignalFromCapabilitySignal(capabilitySignal, {
    signalId: "learning_optional",
    createdAt: "2026-06-16T12:07:00.000Z",
    signalType: "interruption",
  });

  assert.equal(Object.hasOwn(learningSignal, "user_rating"), false);
  assert.equal(Object.hasOwn(learningSignal, "pattern_count"), false);
  assert.equal(Object.hasOwn(learningSignal, "redacted_summary"), false);
  assert.equal(Object.hasOwn(learningSignal, "severity"), false);
});

test("learning signal telemetry attributes expose counts and boundaries without summaries", () => {
  const capabilitySignal = buildCapabilitySignal({
    traceId: "trace_rating",
    conversationId: "conv_rating",
    turnId: "turn_rating",
    profileMode: "adult_owner",
    channel: "text",
    topicLabel: "memory",
    intentLabel: "review",
    capabilityLabel: "memory_proposal_review",
    capabilityStatus: "working",
    outcomeSignal: "answered",
    confidence: 0.91,
    evidenceRefs: ["trace:trace_rating"],
    architectureArea: "memory_review",
    privacyClass: "metadata_only",
    suggestedNextStep: "no_action",
  });
  const learningSignal = buildLearningSignalFromCapabilitySignal(capabilitySignal, {
    signalId: "learning_rating",
    createdAt: "2026-06-16T12:10:00.000Z",
    signalType: "rating",
    userRating: 5,
    redactedSummary: "Should not appear in telemetry attributes.",
  });

  const attributes = buildLearningSignalTelemetryAttributes(learningSignal);

  assert.equal(attributes.eventName, "learning_signal_recorded");
  assert.equal(attributes.signalType, "rating");
  assert.equal(attributes.capabilityId, "memory_proposal_review");
  assert.equal(attributes.evidenceRefCount, 2);
  assert.equal(attributes.proposalOnly, true);
  assert.equal(attributes.memoryWritePerformed, false);
  assert.equal(attributes.agentDispatchPerformed, false);
  assert.equal(attributes.externalSendPerformed, false);
  assert.equal("redactedSummary" in attributes, false);
  assert.equal(JSON.stringify(attributes).includes("Should not appear"), false);
});

test("direct learning signal construction redacts raw-looking summaries and evidence references", () => {
  const learningSignal = buildLearningSignal({
    signalId: "learning_direct_sensitive",
    createdAt: "2026-06-16T12:15:00.000Z",
    conversationId: "conv_direct_sensitive",
    turnId: "turn_direct_sensitive",
    traceId: "trace_direct_sensitive",
    profileMode: "adult_owner",
    channel: "text",
    signalType: "repeated_pattern",
    source: "local_capability_ledger",
    capabilityId: "release_summary",
    architectureArea: "napoleon_bridge",
    outcome: "missing",
    confidence: 0.71,
    patternCount: 2,
    evidenceRefs: [
      "trace:trace_direct_sensitive",
      "event:response_failed",
      "audit:audit_direct_sensitive",
      "trace:user said email alice@example.com the launch secret",
      "https://private.example.test/roadmap",
    ],
    redactedSummary: "Email alice@example.com using bearer sk-live-secret-token about the launch secret.",
    suggestedNextStep: "draft_evolution_proposal",
    privacyClass: "metadata_only",
  });
  const combined = JSON.stringify(learningSignal);

  assert.equal(combined.includes("alice@example.com"), false);
  assert.equal(combined.includes("private.example.test"), false);
  assert.equal(combined.includes("sk-live-secret-token"), false);
  assert.equal(combined.includes("launch secret"), false);
  assert.deepEqual(learningSignal.evidence_refs, [
    "trace:trace_direct_sensitive",
    "event:response_failed",
    "audit:audit_direct_sensitive",
    "capability:release_summary",
  ]);
  assert.equal(Object.hasOwn(learningSignal, "redacted_summary"), false);
});
