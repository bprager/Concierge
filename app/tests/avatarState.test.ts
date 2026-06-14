import assert from "node:assert/strict";
import test from "node:test";
import { buildLocalNeutralAvatarState } from "../src/avatarState.js";

test("builds local neutral avatar state from bridge provenance without camera or emotion inference", () => {
  const result = buildLocalNeutralAvatarState({
    responseText: "Napoleon recommends preparing the bridge rollout plan for owner review.",
    stance: "direct_strategic",
    bridgeProvidedProvenance: true,
  });

  assert.equal(result.localDisplayOnly, true);
  assert.equal(result.avatarState, "neutral_listening");
  assert.equal(result.expression, "neutral");
  assert.equal(result.gazeTarget, "user_interface");
  assert.equal(result.stance, "direct_strategic");
  assert.equal(result.provenanceLabel, "Bridge-provided Napoleon response");
  assert.equal(result.authorityBoundary, "Avatar reflects returned text provenance only; it is not Napoleon approval or an agent action.");
  assert.equal(result.cameraCaptureStarted, false);
  assert.equal(result.faceDetectionStarted, false);
  assert.equal(result.affectInferred, false);
  assert.equal(result.avatarAnimationStarted, false);
  assert.equal(result.liveNapoleonContacted, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.externalSendPerformed, false);
  assert.deepEqual(result.blockedEffects, [
    "camera_capture",
    "face_detection",
    "affect_inference",
    "avatar_animation",
    "live_napoleon_contact",
    "memory_write",
    "approval_capture",
    "external_send",
    "agent_dispatch",
  ]);
});

test("does not claim Napoleon provenance when avatar input lacks bridge proof", () => {
  const result = buildLocalNeutralAvatarState({
    responseText: "Local preview text.",
    stance: "warm",
    bridgeProvidedProvenance: false,
  });

  assert.equal(result.provenanceLabel, "Local preview without Napoleon provenance");
  assert.equal(result.authorityBoundary, "Avatar preview must not claim Napoleon or delegated-agent authority without bridge provenance.");
  assert.equal(result.expression, "neutral");
  assert.equal(result.affectInferred, false);
});

test("applies child protected avatar constraints without treating state as guardian approval", () => {
  const result = buildLocalNeutralAvatarState({
    responseText: "Napoleon recommends preparing the bridge rollout plan for guardian review.",
    stance: "direct_strategic",
    bridgeProvidedProvenance: true,
    profileMode: "child_protected",
  });

  assert.equal(result.profileMode, "child_protected");
  assert.equal(result.childProtected, true);
  assert.equal(result.cameraPolicy, "disabled_until_guardian_review");
  assert.equal(result.affectPolicy, "disabled");
  assert.equal(result.guardianReviewReminder, "Guardian review is required before child avatar camera or affect features.");
  assert.equal(result.guardianApprovalCaptured, false);
  assert.equal(result.cameraCaptureStarted, false);
  assert.equal(result.faceDetectionStarted, false);
  assert.equal(result.affectInferred, false);
  assert.ok(result.blockedEffects.includes("guardian_approval_capture"));
});
