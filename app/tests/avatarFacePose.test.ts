import assert from "node:assert/strict";
import test from "node:test";
import { buildLocalAvatarFacePoseEstimate, localAvatarFacePoseSample } from "../src/avatarFacePose.js";

test("builds local face and head pose metadata without camera capture or affect inference", () => {
  const result = buildLocalAvatarFacePoseEstimate(localAvatarFacePoseSample);

  assert.equal(result.localMetadataOnly, true);
  assert.equal(result.profileMode, "adult_owner");
  assert.equal(result.childProtected, false);
  assert.equal(result.facePresent, true);
  assert.equal(result.headYawDegrees, 8);
  assert.equal(result.headPitchDegrees, -4);
  assert.equal(result.headRollDegrees, 2);
  assert.equal(result.confidence, 0.7);
  assert.equal(result.cameraCaptureStarted, false);
  assert.equal(result.faceDetectionStarted, false);
  assert.equal(result.rawVideoStored, false);
  assert.equal(result.affectInferred, false);
  assert.equal(result.liveNapoleonContacted, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.agentDispatchPerformed, false);
  assert.equal(result.externalSendPerformed, false);
  assert.deepEqual(result.blockedEffects, [
    "camera_capture",
    "raw_video_storage",
    "live_face_detection",
    "affect_inference",
    "attention_inference",
    "avatar_animation",
    "live_napoleon_contact",
    "memory_write",
    "approval_capture",
    "external_send",
    "agent_dispatch",
  ]);
});

test("keeps child protected face and head pose metadata non-authorizing", () => {
  const result = buildLocalAvatarFacePoseEstimate({
    ...localAvatarFacePoseSample,
    profileMode: "child_protected",
  });

  assert.equal(result.profileMode, "child_protected");
  assert.equal(result.childProtected, true);
  assert.equal(result.guardianReviewReminder, "Guardian review is required before child avatar camera, face, head-pose, or affect features.");
  assert.equal(result.guardianApprovalCaptured, false);
  assert.equal(result.cameraCaptureStarted, false);
  assert.ok(result.blockedEffects.includes("guardian_approval_capture"));
});
