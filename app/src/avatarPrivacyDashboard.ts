import type { LocalProfile } from "./contractBridge.js";

export type AvatarPrivacyControlState = "enabled" | "disabled" | "guardian_review_required";

export interface AvatarPrivacyDashboardInput {
  profileMode: LocalProfile;
  telemetryEnabled: boolean;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  avatarAffectEnabled: boolean;
  rawMediaStorageEnabled: boolean;
}

export interface AvatarPrivacyDashboardState {
  localDashboardOnly: true;
  profileMode: LocalProfile;
  childProtected: boolean;
  telemetryControl: AvatarPrivacyControlState;
  cameraControl: AvatarPrivacyControlState;
  microphoneControl: AvatarPrivacyControlState;
  affectControl: AvatarPrivacyControlState;
  rawMediaStorageControl: AvatarPrivacyControlState;
  authorityBoundary: string;
  guardianReviewReminder: string;
  cameraCaptureStarted: false;
  microphoneCaptureStarted: false;
  rawVideoStored: false;
  rawAudioStored: false;
  liveAffectModelStarted: false;
  emotionClaimedAsFact: false;
  attentionInferred: false;
  avatarAnimationStarted: false;
  liveNapoleonContacted: false;
  memoryWritePerformed: false;
  approvalCaptured: false;
  guardianApprovalCaptured: false;
  externalSendPerformed: false;
  blockedEffects: string[];
}

export function buildAvatarPrivacyDashboard(input: AvatarPrivacyDashboardInput): AvatarPrivacyDashboardState {
  const childProtected = input.profileMode === "child_protected";
  const blockedEffects = [
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
  ];
  if (childProtected) {
    blockedEffects.splice(11, 0, "guardian_approval_capture");
  }

  return {
    localDashboardOnly: true,
    profileMode: input.profileMode,
    childProtected,
    telemetryControl: input.telemetryEnabled ? "enabled" : "disabled",
    cameraControl: controlState(input.cameraEnabled, childProtected),
    microphoneControl: controlState(input.microphoneEnabled, childProtected),
    affectControl: controlState(input.avatarAffectEnabled, childProtected),
    rawMediaStorageControl: controlState(input.rawMediaStorageEnabled, childProtected),
    authorityBoundary:
      "Avatar privacy dashboard controls local preferences only; it is not camera capture, microphone capture, raw media storage, affect detection, approval, or Napoleon authority.",
    guardianReviewReminder: childProtected
      ? "Guardian review is required before child avatar camera, microphone, affect, storage, or animation features."
      : "No guardian review reminder for this profile.",
    cameraCaptureStarted: false,
    microphoneCaptureStarted: false,
    rawVideoStored: false,
    rawAudioStored: false,
    liveAffectModelStarted: false,
    emotionClaimedAsFact: false,
    attentionInferred: false,
    avatarAnimationStarted: false,
    liveNapoleonContacted: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    guardianApprovalCaptured: false,
    externalSendPerformed: false,
    blockedEffects,
  };
}

function controlState(enabled: boolean, childProtected: boolean): AvatarPrivacyControlState {
  if (childProtected) return "guardian_review_required";
  return enabled ? "enabled" : "disabled";
}
