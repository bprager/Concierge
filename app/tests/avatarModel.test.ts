import assert from "node:assert/strict";
import test from "node:test";
import { loadLocalAvatarModelReference } from "../src/avatarModel.js";

test("loads local avatar model reference without renderer camera or Napoleon contact", () => {
  const result = loadLocalAvatarModelReference({
    modelPath: "avatars/concierge-neutral.vrm",
    displayName: "Concierge Neutral",
    profileMode: "adult_owner",
  });

  assert.equal(result.localReferenceOnly, true);
  assert.equal(result.modelLoaded, true);
  assert.equal(result.modelFormat, "vrm");
  assert.equal(result.modelPath, "avatars/concierge-neutral.vrm");
  assert.equal(result.displayName, "Concierge Neutral");
  assert.equal(result.profileMode, "adult_owner");
  assert.equal(result.rendererStarted, false);
  assert.equal(result.cameraCaptureStarted, false);
  assert.equal(result.faceDetectionStarted, false);
  assert.equal(result.affectInferred, false);
  assert.equal(result.liveNapoleonContacted, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.externalSendPerformed, false);
  assert.deepEqual(result.blockedEffects, [
    "renderer_start",
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

test("rejects non-vrm avatar model references before loading metadata", () => {
  assert.throws(
    () =>
      loadLocalAvatarModelReference({
        modelPath: "avatars/concierge-neutral.glb",
        displayName: "Concierge Neutral",
        profileMode: "adult_owner",
      }),
    /avatar model must use a .vrm path/,
  );
});

test("applies child protected avatar model loading constraints", () => {
  const result = loadLocalAvatarModelReference({
    modelPath: "avatars/concierge-neutral.vrm",
    displayName: "Concierge Neutral",
    profileMode: "child_protected",
  });

  assert.equal(result.profileMode, "child_protected");
  assert.equal(result.childProtected, true);
  assert.equal(result.guardianReviewReminder, "Guardian review is required before child avatar rendering, camera, or affect features.");
  assert.equal(result.guardianApprovalCaptured, false);
  assert.ok(result.blockedEffects.includes("guardian_approval_capture"));
});
