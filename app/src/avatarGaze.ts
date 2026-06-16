import type { LocalProfile } from "./contractBridge.js";

export interface LocalAvatarGazeInput {
  userPositionX: number;
  userPositionY: number;
  windowFocused: boolean;
  profileMode?: LocalProfile;
}

export interface LocalAvatarGazeResult {
  localMetadataOnly: true;
  profileMode: LocalProfile;
  childProtected: boolean;
  guardianReviewRequired: boolean;
  cameraPolicy: "explicit_permission_required" | "disabled_until_guardian_review";
  animationPolicy: "disabled" | "disabled_until_guardian_review";
  attentionPolicy: "disabled";
  eyeTarget: "user_position" | "user_interface";
  horizontalOffset: number;
  verticalOffset: number;
  confidence: number;
  authorityBoundary: string;
  guardianReviewReminder: string;
  cameraCaptureStarted: false;
  faceDetectionStarted: false;
  gazeTrackingStarted: false;
  avatarAnimationStarted: false;
  affectInferred: false;
  liveNapoleonContacted: false;
  memoryWritePerformed: false;
  approvalCaptured: false;
  guardianApprovalCaptured: false;
  agentDispatchPerformed: false;
  externalSendPerformed: false;
  blockedEffects: string[];
}

export const localAvatarGazeSample: LocalAvatarGazeInput = {
  userPositionX: 0.25,
  userPositionY: -0.2,
  windowFocused: true,
};

export function buildLocalAvatarGazeSimulation(input: LocalAvatarGazeInput): LocalAvatarGazeResult {
  const profileMode = input.profileMode ?? "adult_owner";
  const childProtected = profileMode === "child_protected";
  const horizontalOffset = clampOffset(input.userPositionX);
  const verticalOffset = clampOffset(input.userPositionY);
  const eyeTarget = input.windowFocused ? "user_position" : "user_interface";
  const blockedEffects = [
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
  ];
  if (childProtected) {
    blockedEffects.splice(8, 0, "guardian_approval_capture");
  }

  return {
    localMetadataOnly: true,
    profileMode,
    childProtected,
    guardianReviewRequired: childProtected,
    cameraPolicy: childProtected ? "disabled_until_guardian_review" : "explicit_permission_required",
    animationPolicy: childProtected ? "disabled_until_guardian_review" : "disabled",
    attentionPolicy: "disabled",
    eyeTarget,
    horizontalOffset,
    verticalOffset,
    confidence: input.windowFocused ? 0.72 : 0.45,
    authorityBoundary:
      "Gaze simulation is local UI metadata only; it is not camera tracking, attention inference, approval, or agent action.",
    guardianReviewReminder: childProtected
      ? "Guardian review is required before child avatar gaze animation or camera tracking."
      : "No guardian review reminder for this profile.",
    cameraCaptureStarted: false,
    faceDetectionStarted: false,
    gazeTrackingStarted: false,
    avatarAnimationStarted: false,
    affectInferred: false,
    liveNapoleonContacted: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    guardianApprovalCaptured: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    blockedEffects,
  };
}

function clampOffset(value: number): number {
  return Math.max(-1, Math.min(1, Math.round(value * 100) / 100));
}
