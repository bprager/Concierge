import assert from "node:assert/strict";
import test from "node:test";
import { rehearseLocalVoiceTurnSample } from "../src/voiceTurnRehearsal.js";

test("rehearses a local voice turn without capture playback or Napoleon contact", () => {
  const result = rehearseLocalVoiceTurnSample();

  assert.equal(result.localRehearsalOnly, true);
  assert.equal(result.liveNapoleonContacted, false);
  assert.equal(result.microphoneCaptureStarted, false);
  assert.equal(result.audioPlaybackStarted, false);
  assert.equal(result.rawAudioStored, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.externalSendPerformed, false);
  assert.equal(result.vad.segments.length, 2);
  assert.deepEqual(result.latency, {
    localSampleOnly: true,
    vadMs: 400,
    sttMs: 0,
    napoleonMs: 0,
    ttsMs: 0,
    totalMs: 400,
    liveNapoleonContacted: false,
  });
  assert.equal(result.stt.transcript, "Concierge voice sample detected.");
  assert.equal(result.textBoundary.responseBoundary, "local_rehearsal_placeholder");
  assert.equal(result.textBoundary.authorityBoundary, "Napoleon not contacted; no delegated agent response.");
  assert.equal(result.tts.voiceId, "local-sample-voice");
  assert.deepEqual(result.blockedEffects, [
    "microphone_capture",
    "audio_playback",
    "raw_audio_storage",
    "live_napoleon_contact",
    "memory_write",
    "approval_capture",
    "external_send",
    "agent_dispatch",
  ]);
  assert.equal(JSON.stringify(result).includes("audioData"), false);
});
