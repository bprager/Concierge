import type { LocalProfile } from "./contractBridge.js";

export interface LocalAvatarLipSyncInput {
  amplitudeFrames: number[];
  frameDurationMs: number;
  profileMode?: LocalProfile;
}

export interface LocalAvatarLipSyncCue {
  atMs: number;
  mouthOpen: number;
}

export interface LocalAvatarLipSyncResult {
  localMetadataOnly: true;
  profileMode: LocalProfile;
  childProtected: boolean;
  mouthCues: LocalAvatarLipSyncCue[];
  durationMs: number;
  peakMouthOpen: number;
  authorityBoundary: string;
  guardianReviewReminder: string;
  audioPlaybackStarted: false;
  microphoneCaptureStarted: false;
  rawAudioStored: false;
  avatarAnimationStarted: false;
  cameraCaptureStarted: false;
  faceDetectionStarted: false;
  affectInferred: false;
  liveNapoleonContacted: false;
  memoryWritePerformed: false;
  approvalCaptured: false;
  guardianApprovalCaptured: false;
  externalSendPerformed: false;
  blockedEffects: string[];
}

export const localAvatarLipSyncSample: LocalAvatarLipSyncInput = {
  amplitudeFrames: [0, 0.25, 0.9, 0.5, 0.1],
  frameDurationMs: 50,
};

export function buildLocalAvatarLipSyncBaseline(input: LocalAvatarLipSyncInput): LocalAvatarLipSyncResult {
  if (input.amplitudeFrames.length === 0) {
    throw new Error("lip sync amplitude frames are empty");
  }
  if (input.frameDurationMs <= 0) {
    throw new Error("lip sync frame duration must be positive");
  }

  const profileMode = input.profileMode ?? "adult_owner";
  const childProtected = profileMode === "child_protected";
  const peakAmplitude = Math.max(...input.amplitudeFrames.map((frame) => Math.max(0, frame)));
  const mouthCues = input.amplitudeFrames.map((frame, index) => ({
    atMs: index * input.frameDurationMs,
    mouthOpen: peakAmplitude === 0 ? 0 : roundMouthOpen(Math.max(0, frame) / peakAmplitude),
  }));
  const blockedEffects = [
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
  ];
  if (childProtected) {
    blockedEffects.splice(10, 0, "guardian_approval_capture");
  }

  return {
    localMetadataOnly: true,
    profileMode,
    childProtected,
    mouthCues,
    durationMs: input.amplitudeFrames.length * input.frameDurationMs,
    peakMouthOpen: mouthCues.reduce((peak, cue) => Math.max(peak, cue.mouthOpen), 0),
    authorityBoundary:
      "Lip sync is local amplitude metadata only; it is not speech playback, avatar animation, approval, or agent action.",
    guardianReviewReminder: childProtected
      ? "Guardian review is required before child avatar lip-sync animation."
      : "No guardian review reminder for this profile.",
    audioPlaybackStarted: false,
    microphoneCaptureStarted: false,
    rawAudioStored: false,
    avatarAnimationStarted: false,
    cameraCaptureStarted: false,
    faceDetectionStarted: false,
    affectInferred: false,
    liveNapoleonContacted: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    guardianApprovalCaptured: false,
    externalSendPerformed: false,
    blockedEffects,
  };
}

function roundMouthOpen(value: number): number {
  return Math.round(value * 100) / 100;
}
