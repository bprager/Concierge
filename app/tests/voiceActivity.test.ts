import assert from "node:assert/strict";
import test from "node:test";
import { detectVoiceSegments } from "../src/voiceActivity.js";

test("detects speech segments from local amplitude frames", () => {
  const segments = detectVoiceSegments([
    { offsetMs: 0, durationMs: 40, rms: 0.01 },
    { offsetMs: 40, durationMs: 40, rms: 0.08 },
    { offsetMs: 80, durationMs: 40, rms: 0.09 },
    { offsetMs: 120, durationMs: 40, rms: 0.07 },
    { offsetMs: 160, durationMs: 40, rms: 0.01 },
    { offsetMs: 200, durationMs: 40, rms: 0.01 },
    { offsetMs: 240, durationMs: 40, rms: 0.01 },
    { offsetMs: 280, durationMs: 40, rms: 0.06 },
    { offsetMs: 320, durationMs: 40, rms: 0.07 },
    { offsetMs: 360, durationMs: 40, rms: 0.06 },
  ], {
    thresholdRms: 0.05,
    hangoverMs: 80,
    minSpeechMs: 80,
  });

  assert.deepEqual(segments, [
    { startMs: 40, endMs: 160, peakRms: 0.09, frameCount: 3 },
    { startMs: 280, endMs: 400, peakRms: 0.07, frameCount: 3 },
  ]);
});

test("ignores short noise bursts and does not return raw frame samples", () => {
  const segments = detectVoiceSegments([
    { offsetMs: 0, durationMs: 40, rms: 0.01 },
    { offsetMs: 40, durationMs: 40, rms: 0.12 },
    { offsetMs: 80, durationMs: 40, rms: 0.01 },
    { offsetMs: 120, durationMs: 40, rms: 0.01 },
  ], {
    thresholdRms: 0.05,
    hangoverMs: 40,
    minSpeechMs: 80,
  });

  assert.deepEqual(segments, []);
  assert.equal(JSON.stringify(segments).includes("rms"), false);
});
