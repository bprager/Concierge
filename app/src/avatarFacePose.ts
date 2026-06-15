import type { LocalProfile } from "./contractBridge.js";

export interface LocalAvatarFacePoseInput {
  facePresent: boolean;
  headYawDegrees: number;
  headPitchDegrees: number;
  headRollDegrees: number;
  profileMode?: LocalProfile;
}

export interface LocalAvatarFacePoseResult {
  localMetadataOnly: true;
  profileMode: LocalProfile;
  childProtected: boolean;
  facePresent: boolean;
  headYawDegrees: number;
  headPitchDegrees: number;
  headRollDegrees: number;
  confidence: number;
  authorityBoundary: string;
  guardianReviewReminder: string;
  cameraCaptureStarted: false;
  faceDetectionStarted: false;
  rawVideoStored: false;
  affectInferred: false;
  attentionInferred: false;
  avatarAnimationStarted: false;
  liveNapoleonContacted: false;
  memoryWritePerformed: false;
  approvalCaptured: false;
  guardianApprovalCaptured: false;
  externalSendPerformed: false;
  blockedEffects: string[];
}

export const localAvatarFacePoseSample: LocalAvatarFacePoseInput = {
  facePresent: true,
  headYawDegrees: 8,
  headPitchDegrees: -4,
  headRollDegrees: 2,
};

export function buildLocalAvatarFacePoseEstimate(input: LocalAvatarFacePoseInput): LocalAvatarFacePoseResult {
  const profileMode = input.profileMode ?? "adult_owner";
  const childProtected = profileMode === "child_protected";
  const blockedEffects = [
    "camera_capture",
    "raw_video_storage",
    "live_face_detection",
    "affect_inference",
    "attention_inference",
    "avatar_animation",
    "live_napoleon_contact",
    "memory_write",
    "approval_capture",
    "external_send",
    "agent_dispatch",
  ];
  if (childProtected) {
    blockedEffects.splice(9, 0, "guardian_approval_capture");
  }

  return {
    localMetadataOnly: true,
    profileMode,
    childProtected,
    facePresent: input.facePresent,
    headYawDegrees: clampDegrees(input.headYawDegrees),
    headPitchDegrees: clampDegrees(input.headPitchDegrees),
    headRollDegrees: clampDegrees(input.headRollDegrees),
    confidence: input.facePresent ? 0.7 : 0.35,
    authorityBoundary:
      "Face and head-pose estimation is local sample metadata only; it is not camera capture, attention inference, emotion inference, approval, or agent action.",
    guardianReviewReminder: childProtected
      ? "Guardian review is required before child avatar camera, face, head-pose, or affect features."
      : "No guardian review reminder for this profile.",
    cameraCaptureStarted: false,
    faceDetectionStarted: false,
    rawVideoStored: false,
    affectInferred: false,
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

function clampDegrees(value: number): number {
  return Math.max(-45, Math.min(45, Math.round(value)));
}
