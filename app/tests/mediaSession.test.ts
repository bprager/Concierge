import assert from "node:assert/strict";
import test from "node:test";
import { buildMediaSessionSurface, buildMediaSessionSummary } from "../src/mediaSession.js";

test("marks adult microphone as permission needed before OS permission is granted", () => {
  const surface = buildMediaSessionSurface({
    surface: "microphone",
    profileMode: "adult_owner",
    localPreferenceEnabled: true,
    permissionStatus: "not_requested",
    mediaApiAvailable: true,
  });

  assert.equal(surface.status, "permission_needed");
  assert.equal(surface.permissionStatus, "not_requested");
  assert.equal(surface.captureStarted, false);
  assert.equal(surface.rawAudioStored, false);
  assert.equal(surface.liveNapoleonContacted, false);
  assert.equal(surface.agentDispatchPerformed, false);
});

test("marks granted adult camera permission as stopped rather than active capture", () => {
  const surface = buildMediaSessionSurface({
    surface: "camera",
    profileMode: "adult_owner",
    localPreferenceEnabled: true,
    permissionStatus: "granted",
    mediaApiAvailable: true,
  });

  assert.equal(surface.status, "stopped");
  assert.equal(surface.captureStarted, false);
  assert.equal(surface.rawVideoStored, false);
  assert.ok(surface.blockedEffects.includes("camera_capture"));
});

test("keeps child protected microphone blocked even when local preference and permission are on", () => {
  const surface = buildMediaSessionSurface({
    surface: "microphone",
    profileMode: "child_protected",
    localPreferenceEnabled: true,
    permissionStatus: "granted",
    mediaApiAvailable: true,
  });

  assert.equal(surface.status, "blocked");
  assert.equal(surface.childProtected, true);
  assert.equal(surface.guardianApprovalCaptured, false);
  assert.ok(surface.guardianReviewReminder.includes("Guardian review"));
  assert.ok(surface.blockedEffects.includes("guardian_approval_capture"));
});

test("keeps audio playback represented as stopped local state without playback", () => {
  const surface = buildMediaSessionSurface({
    surface: "playback",
    profileMode: "adult_owner",
    localPreferenceEnabled: true,
    permissionStatus: "granted",
    mediaApiAvailable: true,
  });

  assert.equal(surface.status, "stopped");
  assert.equal(surface.audioPlaybackStarted, false);
  assert.equal(surface.rawAudioStored, false);
  assert.ok(surface.blockedEffects.includes("audio_playback"));
});

test("summarizes microphone camera and playback surfaces together", () => {
  const summary = buildMediaSessionSummary({
    profileMode: "adult_owner",
    microphoneEnabled: true,
    microphonePermissionStatus: "granted",
    cameraEnabled: false,
    cameraPermissionStatus: "not_requested",
    mediaApiAvailable: true,
  });

  assert.equal(summary.localSessionOnly, true);
  assert.equal(summary.microphone.status, "stopped");
  assert.equal(summary.camera.status, "blocked");
  assert.equal(summary.playback.status, "stopped");
  assert.equal(summary.authorityBoundary.includes("not Napoleon approval"), true);
});
