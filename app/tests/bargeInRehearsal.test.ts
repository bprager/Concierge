import assert from "node:assert/strict";
import test from "node:test";
import { rehearseLocalBargeInSample } from "../src/bargeInRehearsal.js";

test("rehearses local barge-in without playback capture or Napoleon contact", () => {
  const result = rehearseLocalBargeInSample();

  assert.equal(result.localRehearsalOnly, true);
  assert.equal(result.bargeInDetected, true);
  assert.equal(result.interruptedOutput, "local-sample-voice");
  assert.equal(result.interruptAtMs, 480);
  assert.equal(result.nextTurnPrepared, true);
  assert.equal(result.audioPlaybackStarted, false);
  assert.equal(result.microphoneCaptureStarted, false);
  assert.equal(result.rawAudioStored, false);
  assert.equal(result.liveNapoleonContacted, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.externalSendPerformed, false);
  assert.deepEqual(result.blockedEffects, [
    "audio_playback",
    "microphone_capture",
    "raw_audio_storage",
    "live_napoleon_contact",
    "memory_write",
    "approval_capture",
    "external_send",
    "agent_dispatch",
  ]);
  assert.equal(JSON.stringify(result).includes("audioData"), false);
});
