import assert from "node:assert/strict";
import test from "node:test";
import { localTtsSample, synthesizeLocalSpeechSample } from "../src/textToSpeech.js";

test("synthesizes local speech metadata without audio playback or raw audio", () => {
  const result = synthesizeLocalSpeechSample(localTtsSample);

  assert.equal(result.voiceId, "local-sample-voice");
  assert.equal(result.chars, 32);
  assert.equal(result.durationMs, 1280);
  assert.equal(result.latencyMs, 0);
  assert.equal(result.localSampleOnly, true);
  assert.equal(result.audioPlaybackStarted, false);
  assert.equal(result.rawAudioStored, false);
  assert.equal(JSON.stringify(result).includes("audioData"), false);
});

test("rejects empty local text-to-speech samples", () => {
  assert.throws(
    () => synthesizeLocalSpeechSample({ ...localTtsSample, text: "   " }),
    /sample text is empty/,
  );
});
