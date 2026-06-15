import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLocalAvatarAffectFusion,
  localAvatarAffectFusionSample,
} from "../src/avatarAffectFusion.js";
import {
  buildLocalAvatarFacePoseEstimate,
  localAvatarFacePoseSample,
} from "../src/avatarFacePose.js";
import {
  buildLocalAvatarGazeSimulation,
  localAvatarGazeSample,
} from "../src/avatarGaze.js";

test("child protected gaze exposes guardian-review-gated policy metadata", () => {
  const result = buildLocalAvatarGazeSimulation({
    ...localAvatarGazeSample,
    profileMode: "child_protected",
  }) as unknown as Record<string, unknown>;

  assert.equal(result.guardianReviewRequired, true);
  assert.equal(result.cameraPolicy, "disabled_until_guardian_review");
  assert.equal(result.animationPolicy, "disabled_until_guardian_review");
  assert.equal(result.attentionPolicy, "disabled");
  assert.equal(result.guardianApprovalCaptured, false);
});

test("child protected face pose exposes guardian-review-gated policy metadata", () => {
  const result = buildLocalAvatarFacePoseEstimate({
    ...localAvatarFacePoseSample,
    profileMode: "child_protected",
  }) as unknown as Record<string, unknown>;

  assert.equal(result.guardianReviewRequired, true);
  assert.equal(result.cameraPolicy, "disabled_until_guardian_review");
  assert.equal(result.facePosePolicy, "disabled_until_guardian_review");
  assert.equal(result.affectPolicy, "disabled");
  assert.equal(result.attentionPolicy, "disabled");
  assert.equal(result.guardianApprovalCaptured, false);
});

test("child protected affect fusion exposes guardian-review-gated policy metadata", () => {
  const result = buildLocalAvatarAffectFusion({
    ...localAvatarAffectFusionSample,
    profileMode: "child_protected",
  }) as unknown as Record<string, unknown>;

  assert.equal(result.guardianReviewRequired, true);
  assert.equal(result.cameraPolicy, "disabled_until_guardian_review");
  assert.equal(result.microphonePolicy, "disabled_until_guardian_review");
  assert.equal(result.storagePolicy, "disabled_until_guardian_review");
  assert.equal(result.affectPolicy, "disabled_until_guardian_review");
  assert.equal(result.emotionFactPolicy, "disabled");
  assert.equal(result.guardianApprovalCaptured, false);
});
