import type { LocalProfile } from "./contractBridge.js";

export interface LocalAvatarModelReferenceInput {
  modelPath: string;
  displayName: string;
  profileMode?: LocalProfile;
}

export interface LocalAvatarModelReferenceResult {
  localReferenceOnly: true;
  modelLoaded: true;
  modelFormat: "vrm";
  modelPath: string;
  displayName: string;
  profileMode: LocalProfile;
  childProtected: boolean;
  guardianReviewReminder: string;
  rendererStarted: false;
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

export const localAvatarModelSample: LocalAvatarModelReferenceInput = {
  modelPath: "avatars/concierge-neutral.vrm",
  displayName: "Concierge Neutral",
  profileMode: "adult_owner",
};

export function loadLocalAvatarModelReference(
  input: LocalAvatarModelReferenceInput,
): LocalAvatarModelReferenceResult {
  const modelPath = input.modelPath.trim();
  const displayName = input.displayName.trim();
  if (!modelPath.toLowerCase().endsWith(".vrm")) {
    throw new Error("avatar model must use a .vrm path");
  }
  if (!displayName) {
    throw new Error("avatar model display name is empty");
  }

  const profileMode = input.profileMode ?? "adult_owner";
  const childProtected = profileMode === "child_protected";
  const blockedEffects = [
    "renderer_start",
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
    blockedEffects.splice(7, 0, "guardian_approval_capture");
  }

  return {
    localReferenceOnly: true,
    modelLoaded: true,
    modelFormat: "vrm",
    modelPath,
    displayName,
    profileMode,
    childProtected,
    guardianReviewReminder: childProtected
      ? "Guardian review is required before child avatar rendering, camera, or affect features."
      : "No guardian review reminder for this profile.",
    rendererStarted: false,
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
