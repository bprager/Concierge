import assert from "node:assert/strict";
import test from "node:test";
import { shapeVoiceResponseForSpeech } from "../src/voiceResponseShaping.js";

test("shapes long bridge-provenance response for speech without side effects", () => {
  const result = shapeVoiceResponseForSpeech({
    responseText:
      "Prepare the bridge rollout plan for owner review. Passive Brain found that descriptor discovery is ready. Keep the proof export visible before the next governed send. This final sentence should not be spoken in the short voice summary.",
    speakerLabel: "Napoleon",
    bridgeProvidedProvenance: true,
    maxSpokenChars: 150,
  });

  assert.equal(result.localPreparationOnly, true);
  assert.equal(result.wasShortened, true);
  assert.equal(result.spokenText, "Napoleon says: Prepare the bridge rollout plan for owner review. Passive Brain found that descriptor discovery is ready.");
  assert.equal(result.authorityBoundary, "Bridge-provided Napoleon provenance preserved for speech.");
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
});

test("does not invent Napoleon attribution when bridge provenance is absent", () => {
  const result = shapeVoiceResponseForSpeech({
    responseText:
      "Napoleon recommends applying the change immediately. This text is local and lacks bridge provenance.",
    speakerLabel: "Napoleon",
    bridgeProvidedProvenance: false,
    maxSpokenChars: 140,
  });

  assert.equal(result.spokenText.startsWith("Napoleon says:"), false);
  assert.equal(result.authorityBoundary, "No bridge provenance; speech summary must not claim Napoleon or delegated-agent authority.");
  assert.equal(result.liveNapoleonContacted, false);
  assert.equal(result.audioPlaybackStarted, false);
});
