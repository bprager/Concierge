import assert from "node:assert/strict";
import test from "node:test";
import { buildLocalAvatarLipSyncBaseline, localAvatarLipSyncSample } from "../src/avatarLipSync.js";

test("builds local lip sync metadata from generated audio amplitude without side effects", () => {
  const result = buildLocalAvatarLipSyncBaseline(localAvatarLipSyncSample);

  assert.equal(result.localMetadataOnly, true);
  assert.equal(result.profileMode, "adult_owner");
  assert.equal(result.childProtected, false);
  assert.equal(result.mouthCues.length, localAvatarLipSyncSample.amplitudeFrames.length);
  assert.equal(result.mouthCues[0].mouthOpen, 0);
  assert.ok(result.mouthCues[2].mouthOpen > result.mouthCues[1].mouthOpen);
  assert.ok(result.mouthCues[2].mouthOpen > result.mouthCues[4].mouthOpen);
  assert.equal(result.durationMs, 250);
  assert.equal(result.audioPlaybackStarted, false);
  assert.equal(result.microphoneCaptureStarted, false);
  assert.equal(result.rawAudioStored, false);
  assert.equal(result.avatarAnimationStarted, false);
  assert.equal(result.cameraCaptureStarted, false);
  assert.equal(result.faceDetectionStarted, false);
  assert.equal(result.affectInferred, false);
  assert.equal(result.liveNapoleonContacted, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.externalSendPerformed, false);
  assert.deepEqual(result.blockedEffects, [
    "avatar_animation",
    "audio_playback",
    "microphone_capture",
    "raw_audio_storage",
    "camera_capture",
    "face_detection",
    "affect_inference",
    "live_napoleon_contact",
    "memory_write",
    "approval_capture",
    "external_send",
    "agent_dispatch",
  ]);
});

test("keeps child protected lip sync metadata non-authorizing", () => {
  const result = buildLocalAvatarLipSyncBaseline({
    ...localAvatarLipSyncSample,
    profileMode: "child_protected",
  });

  assert.equal(result.profileMode, "child_protected");
  assert.equal(result.childProtected, true);
  assert.equal(result.guardianReviewReminder, "Guardian review is required before child avatar lip-sync animation.");
  assert.equal(result.guardianApprovalCaptured, false);
  assert.equal(result.avatarAnimationStarted, false);
  assert.ok(result.blockedEffects.includes("guardian_approval_capture"));
});

test("rejects empty lip sync amplitude frames", () => {
  assert.throws(
    () => buildLocalAvatarLipSyncBaseline({ ...localAvatarLipSyncSample, amplitudeFrames: [] }),
    /lip sync amplitude frames are empty/,
  );
});
