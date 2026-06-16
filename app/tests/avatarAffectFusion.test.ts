import assert from "node:assert/strict";
import test from "node:test";
import { buildLocalAvatarAffectFusion, localAvatarAffectFusionSample } from "../src/avatarAffectFusion.js";

test("builds uncertain local affect-fusion metadata without emotion facts or media capture", () => {
  const result = buildLocalAvatarAffectFusion(localAvatarAffectFusionSample);

  assert.equal(result.localMetadataOnly, true);
  assert.equal(result.profileMode, "adult_owner");
  assert.equal(result.childProtected, false);
  assert.equal(result.uncertaintyLabel, "possible_confusion");
  assert.equal(result.displayLabel, "Possible confusion");
  assert.equal(result.emotionClaimedAsFact, false);
  assert.equal(result.confidence, 0.56);
  assert.deepEqual(result.inputSignals, ["head_pose_shift", "voice_pause", "text_clarification"]);
  assert.deepEqual(result.rationale, [
    "Head pose changed in the local sample.",
    "Voice pause metadata suggests the user may need time.",
    "Text sample asks for clarification.",
  ]);
  assert.equal(result.cameraCaptureStarted, false);
  assert.equal(result.microphoneCaptureStarted, false);
  assert.equal(result.rawVideoStored, false);
  assert.equal(result.rawAudioStored, false);
  assert.equal(result.liveFaceDetectionStarted, false);
  assert.equal(result.liveAffectModelStarted, false);
  assert.equal(result.attentionInferred, false);
  assert.equal(result.avatarAnimationStarted, false);
  assert.equal(result.liveNapoleonContacted, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.agentDispatchPerformed, false);
  assert.equal(result.externalSendPerformed, false);
  assert.deepEqual(result.blockedEffects, [
    "camera_capture",
    "microphone_capture",
    "raw_video_storage",
    "raw_audio_storage",
    "live_face_detection",
    "live_affect_model",
    "emotion_fact_claim",
    "attention_inference",
    "avatar_animation",
    "live_napoleon_contact",
    "memory_write",
    "approval_capture",
    "external_send",
    "agent_dispatch",
  ]);
});

test("keeps child protected affect fusion stricter and non-authorizing", () => {
  const result = buildLocalAvatarAffectFusion({
    ...localAvatarAffectFusionSample,
    profileMode: "child_protected",
  });

  assert.equal(result.profileMode, "child_protected");
  assert.equal(result.childProtected, true);
  assert.equal(result.guardianReviewReminder, "Guardian review is required before child avatar affect, camera, microphone, or animation features.");
  assert.equal(result.guardianApprovalCaptured, false);
  assert.equal(result.emotionClaimedAsFact, false);
  assert.ok(result.blockedEffects.includes("guardian_approval_capture"));
});
