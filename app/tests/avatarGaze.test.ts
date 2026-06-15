import assert from "node:assert/strict";
import test from "node:test";
import { buildLocalAvatarGazeSimulation, localAvatarGazeSample } from "../src/avatarGaze.js";

test("builds local gaze target metadata from user and window position without side effects", () => {
  const result = buildLocalAvatarGazeSimulation(localAvatarGazeSample);

  assert.equal(result.localMetadataOnly, true);
  assert.equal(result.profileMode, "adult_owner");
  assert.equal(result.childProtected, false);
  assert.equal(result.eyeTarget, "user_position");
  assert.equal(result.horizontalOffset, 0.25);
  assert.equal(result.verticalOffset, -0.2);
  assert.equal(result.confidence, 0.72);
  assert.equal(result.cameraCaptureStarted, false);
  assert.equal(result.faceDetectionStarted, false);
  assert.equal(result.gazeTrackingStarted, false);
  assert.equal(result.avatarAnimationStarted, false);
  assert.equal(result.affectInferred, false);
  assert.equal(result.liveNapoleonContacted, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.externalSendPerformed, false);
  assert.deepEqual(result.blockedEffects, [
    "gaze_tracking",
    "avatar_animation",
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

test("falls back to interface gaze when the window is inactive", () => {
  const result = buildLocalAvatarGazeSimulation({
    ...localAvatarGazeSample,
    windowFocused: false,
  });

  assert.equal(result.eyeTarget, "user_interface");
  assert.equal(result.confidence, 0.45);
  assert.equal(result.authorityBoundary, "Gaze simulation is local UI metadata only; it is not camera tracking, attention inference, approval, or agent action.");
});

test("keeps child protected gaze simulation non-authorizing", () => {
  const result = buildLocalAvatarGazeSimulation({
    ...localAvatarGazeSample,
    profileMode: "child_protected",
  });

  assert.equal(result.profileMode, "child_protected");
  assert.equal(result.childProtected, true);
  assert.equal(result.guardianReviewReminder, "Guardian review is required before child avatar gaze animation or camera tracking.");
  assert.equal(result.guardianApprovalCaptured, false);
  assert.equal(result.avatarAnimationStarted, false);
  assert.ok(result.blockedEffects.includes("guardian_approval_capture"));
});
