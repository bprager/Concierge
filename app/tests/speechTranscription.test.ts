import assert from "node:assert/strict";
import test from "node:test";
import {
  localSttSample,
  transcribeLocalSpeechSample,
} from "../src/speechTranscription.js";

test("transcribes local sample speech metadata without raw audio", () => {
  const result = transcribeLocalSpeechSample(localSttSample);

  assert.equal(result.transcript, "Concierge voice sample detected.");
  assert.equal(result.model, "local-sample-stt");
  assert.equal(result.latencyMs, 0);
  assert.equal(result.localSampleOnly, true);
  assert.equal(result.rawAudioStored, false);
  assert.equal(JSON.stringify(result).includes("audioData"), false);
});

test("rejects empty local speech samples", () => {
  assert.throws(
    () => transcribeLocalSpeechSample({ ...localSttSample, phraseTokens: [] }),
    /sample contains no phrase tokens/,
  );
});
