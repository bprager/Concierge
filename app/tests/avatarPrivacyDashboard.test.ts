import assert from "node:assert/strict";
import test from "node:test";
import { buildAvatarPrivacyDashboard } from "../src/avatarPrivacyDashboard.js";

test("summarizes avatar privacy controls without granting capture storage or affect authority", () => {
  const dashboard = buildAvatarPrivacyDashboard({
    profileMode: "adult_owner",
    telemetryEnabled: true,
    cameraEnabled: false,
    microphoneEnabled: false,
    avatarAffectEnabled: false,
    rawMediaStorageEnabled: false,
  });

  assert.equal(dashboard.localDashboardOnly, true);
  assert.equal(dashboard.profileMode, "adult_owner");
  assert.equal(dashboard.childProtected, false);
  assert.equal(dashboard.cameraControl, "disabled");
  assert.equal(dashboard.affectControl, "disabled");
  assert.equal(dashboard.rawMediaStorageControl, "disabled");
  assert.equal(dashboard.telemetryControl, "enabled");
  assert.equal(dashboard.cameraCaptureStarted, false);
  assert.equal(dashboard.microphoneCaptureStarted, false);
  assert.equal(dashboard.rawVideoStored, false);
  assert.equal(dashboard.rawAudioStored, false);
  assert.equal(dashboard.liveAffectModelStarted, false);
  assert.equal(dashboard.emotionClaimedAsFact, false);
  assert.equal(dashboard.liveNapoleonContacted, false);
  assert.equal(dashboard.memoryWritePerformed, false);
  assert.equal(dashboard.approvalCaptured, false);
  assert.equal(dashboard.externalSendPerformed, false);
  assert.deepEqual(dashboard.blockedEffects, [
    "camera_capture",
    "microphone_capture",
    "raw_video_storage",
    "raw_audio_storage",
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

test("keeps child protected avatar privacy stricter even when local preferences are on", () => {
  const dashboard = buildAvatarPrivacyDashboard({
    profileMode: "child_protected",
    telemetryEnabled: true,
    cameraEnabled: true,
    microphoneEnabled: true,
    avatarAffectEnabled: true,
    rawMediaStorageEnabled: true,
  });

  assert.equal(dashboard.profileMode, "child_protected");
  assert.equal(dashboard.childProtected, true);
  assert.equal(dashboard.cameraControl, "guardian_review_required");
  assert.equal(dashboard.affectControl, "guardian_review_required");
  assert.equal(dashboard.rawMediaStorageControl, "guardian_review_required");
  assert.equal(dashboard.guardianReviewReminder, "Guardian review is required before child avatar camera, microphone, affect, storage, or animation features.");
  assert.equal(dashboard.guardianApprovalCaptured, false);
  assert.ok(dashboard.blockedEffects.includes("guardian_approval_capture"));
});
