import assert from "node:assert/strict";
import test from "node:test";
import { emitCapabilitySignal } from "../src/telemetry.js";

test("telemetry emits capability signals for tracked text concierge events", () => {
  const signal = emitCapabilitySignal("response_generated", {
    traceId: "trace_response",
    conversationId: "conv_response",
    turnId: "turn_response",
    profile: "adult_owner",
  });

  assert.ok(signal);
  if (!signal) throw new Error("expected capability signal");
  assert.equal(signal.eventName, "conversation_capability_signal");
  assert.equal(signal.capabilityLabel, "text_response_generation");
  assert.equal(signal.capabilityStatus, "working");
  assert.equal(signal.outcomeSignal, "answered");
});

test("telemetry capability signals preserve child protected minimization", () => {
  const signal = emitCapabilitySignal("memory_proposal_review_created", {
    traceId: "trace_child_memory_signal",
    conversationId: "conv_child_memory_signal",
    turnId: "turn_child_memory_signal",
    profile: "child_protected",
    rawMessage: "do not store this child text",
  });

  assert.ok(signal);
  if (!signal) throw new Error("expected capability signal");
  assert.equal(signal.profileMode, "child_protected_user");
  assert.equal(signal.privacyClass, "child_sensitive");
  assert.equal(JSON.stringify(signal).includes("do not store this child text"), false);
});

test("untracked telemetry events do not create capability signals", () => {
  const signal = emitCapabilitySignal("settings_changed", {
    traceId: "trace_settings",
    conversationId: "conv_settings",
    turnId: "turn_settings",
  });

  assert.equal(signal, null);
});
