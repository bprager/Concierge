import assert from "node:assert/strict";
import test from "node:test";
import { buildLocalWakeWordReadiness } from "../src/wakeWordReadiness.js";

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
