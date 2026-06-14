import type { LocalProfile } from "./contractBridge.js";

export interface LocalNeutralAvatarStateInput {
  responseText: string;
  stance: string;
  bridgeProvidedProvenance: boolean;
  profileMode?: LocalProfile;
}

export interface LocalNeutralAvatarStateResult {
  localDisplayOnly: true;
  avatarState: "neutral_listening";
  expression: "neutral";
  gazeTarget: "user_interface";
  profileMode: LocalProfile;
  childProtected: boolean;
  cameraPolicy: "explicit_permission_required" | "disabled_until_guardian_review";
  affectPolicy: "disabled";
  guardianReviewReminder: string;
  stance: string;
  provenanceLabel: string;
  authorityBoundary: string;
  cameraCaptureStarted: false;
  faceDetectionStarted: false;
  affectInferred: false;
  avatarAnimationStarted: false;
  liveNapoleonContacted: false;
  memoryWritePerformed: false;
  approvalCaptured: false;
  guardianApprovalCaptured: false;
  externalSendPerformed: false;
  blockedEffects: string[];
}

export const localNeutralAvatarStateSample: LocalNeutralAvatarStateInput = {
  responseText: "Napoleon recommends preparing the bridge rollout plan for owner review.",
  stance: "direct_strategic",
  bridgeProvidedProvenance: true,
};

export function buildLocalNeutralAvatarState(input: LocalNeutralAvatarStateInput): LocalNeutralAvatarStateResult {
  if (input.responseText.trim().length === 0) {
    throw new Error("avatar response text is empty");
  }

  const profileMode = input.profileMode ?? "adult_owner";
  const childProtected = profileMode === "child_protected";
  const blockedEffects = [
    "camera_capture",
    "face_detection",
    "affect_inference",
    "avatar_animation",
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
    localDisplayOnly: true,
    avatarState: "neutral_listening",
    expression: "neutral",
    gazeTarget: "user_interface",
    profileMode,
    childProtected,
    cameraPolicy: childProtected ? "disabled_until_guardian_review" : "explicit_permission_required",
    affectPolicy: "disabled",
    guardianReviewReminder: childProtected
      ? "Guardian review is required before child avatar camera or affect features."
      : "No guardian review reminder for this profile.",
    stance: input.stance.trim() || "neutral",
    provenanceLabel: input.bridgeProvidedProvenance
      ? "Bridge-provided Napoleon response"
      : "Local preview without Napoleon provenance",
    authorityBoundary: input.bridgeProvidedProvenance
      ? "Avatar reflects returned text provenance only; it is not Napoleon approval or an agent action."
      : "Avatar preview must not claim Napoleon or delegated-agent authority without bridge provenance.",
    cameraCaptureStarted: false,
    faceDetectionStarted: false,
    affectInferred: false,
    avatarAnimationStarted: false,
    liveNapoleonContacted: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    guardianApprovalCaptured: false,
    externalSendPerformed: false,
    blockedEffects,
  };
}
