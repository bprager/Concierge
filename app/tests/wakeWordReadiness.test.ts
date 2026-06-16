import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLocalWakeWordReadiness,
  runLocalWakeWordDetectionSample,
} from "../src/wakeWordReadiness.js";

test("prepares wake word readiness without listening capture or Napoleon contact", () => {
  const disabled = buildLocalWakeWordReadiness({ enabled: false, profileMode: "adult_owner" });
  const enabled = buildLocalWakeWordReadiness({ enabled: true, profileMode: "child_protected" });

  assert.equal(disabled.localOptionOnly, true);
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.listeningStarted, false);
  assert.equal(disabled.microphoneCaptureStarted, false);
  assert.equal(disabled.rawAudioStored, false);
  assert.equal(disabled.liveNapoleonContacted, false);
  assert.equal(disabled.memoryWritePerformed, false);
  assert.equal(disabled.approvalCaptured, false);
  assert.equal(disabled.externalSendPerformed, false);
  assert.equal(disabled.agentDispatchPerformed, false);
  assert.equal(disabled.detectionState, "disabled");
  assert.equal(disabled.authorityBoundary, "Wake word is a local option only; no always-on listening has started.");

  assert.equal(enabled.enabled, true);
  assert.equal(enabled.childProtected, true);
  assert.equal(enabled.guardianReviewReminder, true);
  assert.equal(enabled.detectionState, "option_enabled_capture_stopped");
  assert.equal(enabled.microphoneCaptureStarted, false);
  assert.equal(enabled.listeningStarted, false);
  assert.deepEqual(enabled.blockedEffects, [
    "always_on_listening",
    "microphone_capture",
    "raw_audio_storage",
    "live_napoleon_contact",
    "memory_write",
    "approval_capture",
    "external_send",
    "agent_dispatch",
  ]);
});

test("runs a local wake word detection sample without capture storage or Napoleon contact", () => {
  const result = runLocalWakeWordDetectionSample({ enabled: true, profileMode: "child_protected" });

  assert.equal(result.localSampleOnly, true);
  assert.equal(result.detected, true);
  assert.equal(result.phrase, "Hey Concierge");
  assert.equal(result.detectedAtMs, 320);
  assert.equal(result.confidence, 0.91);
  assert.equal(result.profileMode, "child_protected");
  assert.equal(result.childProtected, true);
  assert.equal(result.guardianReviewReminder, true);
  assert.equal(result.listeningStarted, false);
  assert.equal(result.microphoneCaptureStarted, false);
  assert.equal(result.rawAudioStored, false);
  assert.equal(result.liveNapoleonContacted, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.externalSendPerformed, false);
  assert.equal(result.agentDispatchPerformed, false);
  assert.equal(result.authorityBoundary, "Local sample detection only; no always-on listening or live wake-word service is active.");
  assert.equal(JSON.stringify(result).includes("audioData"), false);
});
