import assert from "node:assert/strict";
import test from "node:test";
import { buildLocalAvatarRendererReadiness, loadLocalAvatarModelReference } from "../src/avatarModel.js";

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
  assert.equal(result.agentDispatchPerformed, false);
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

test("prepares renderer readiness without starting rendering or side effects", () => {
  const model = loadLocalAvatarModelReference({
    modelPath: "avatars/concierge-neutral.vrm",
    displayName: "Concierge Neutral",
    profileMode: "adult_owner",
  });
  const readiness = buildLocalAvatarRendererReadiness({ model });

  assert.equal(readiness.localReadinessOnly, true);
  assert.equal(readiness.rendererReady, true);
  assert.equal(readiness.rendererStarted, false);
  assert.equal(readiness.renderLoopStarted, false);
  assert.equal(readiness.canvasAllocated, false);
  assert.equal(readiness.modelDisplayName, "Concierge Neutral");
  assert.equal(readiness.modelFormat, "vrm");
  assert.equal(readiness.profileMode, "adult_owner");
  assert.equal(readiness.cameraCaptureStarted, false);
  assert.equal(readiness.faceDetectionStarted, false);
  assert.equal(readiness.affectInferred, false);
  assert.equal(readiness.liveNapoleonContacted, false);
  assert.equal(readiness.memoryWritePerformed, false);
  assert.equal(readiness.approvalCaptured, false);
  assert.equal(readiness.agentDispatchPerformed, false);
  assert.equal(readiness.externalSendPerformed, false);
  assert.deepEqual(readiness.blockedEffects, [
    "renderer_start",
    "render_loop",
    "canvas_allocation",
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

test("keeps child protected renderer readiness non-authorizing", () => {
  const model = loadLocalAvatarModelReference({
    modelPath: "avatars/concierge-neutral.vrm",
    displayName: "Concierge Neutral",
    profileMode: "child_protected",
  });
  const readiness = buildLocalAvatarRendererReadiness({ model });

  assert.equal(readiness.profileMode, "child_protected");
  assert.equal(readiness.childProtected, true);
  assert.equal(readiness.guardianReviewReminder, "Guardian review is required before child avatar rendering can start.");
  assert.equal(readiness.guardianApprovalCaptured, false);
  assert.ok(readiness.blockedEffects.includes("guardian_approval_capture"));
});
