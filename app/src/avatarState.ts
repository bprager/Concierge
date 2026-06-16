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
  agentDispatchPerformed: false;
  externalSendPerformed: false;
  blockedEffects: string[];
}

export interface LocalAvatarExpressionInput {
  stance: string;
  profileMode?: LocalProfile;
  bridgeProvidedProvenance: boolean;
}

export interface LocalAvatarExpressionResult {
  localMetadataOnly: true;
  stance: string;
  expression: "focused_neutral" | "soft_neutral" | "concerned_neutral" | "light_neutral" | "low_neutral" | "neutral";
  profileMode: LocalProfile;
  childProtected: boolean;
  bridgeProvidedProvenance: boolean;
  authorityBoundary: string;
  guardianReviewReminder: string;
  avatarAnimationStarted: false;
  affectInferred: false;
  cameraCaptureStarted: false;
  faceDetectionStarted: false;
  liveNapoleonContacted: false;
  memoryWritePerformed: false;
  approvalCaptured: false;
  guardianApprovalCaptured: false;
  agentDispatchPerformed: false;
  externalSendPerformed: false;
  blockedEffects: string[];
}

export const localNeutralAvatarStateSample: LocalNeutralAvatarStateInput = {
  responseText: "Local avatar preview for preparing the bridge rollout plan for owner review.",
  stance: "direct_strategic",
  bridgeProvidedProvenance: false,
};

export const localAvatarExpressionSample: LocalAvatarExpressionInput = {
  stance: "direct",
  profileMode: "adult_owner",
  bridgeProvidedProvenance: false,
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
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    blockedEffects,
  };
}

export function mapLocalAvatarExpression(input: LocalAvatarExpressionInput): LocalAvatarExpressionResult {
  const profileMode = input.profileMode ?? "adult_owner";
  const childProtected = profileMode === "child_protected";
  const stance = input.stance.trim() || "neutral";
  const expression = expressionForStance(stance, childProtected);
  const blockedEffects = [
    "avatar_animation",
    "affect_inference",
    "camera_capture",
    "face_detection",
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
    localMetadataOnly: true,
    stance,
    expression,
    profileMode,
    childProtected,
    bridgeProvidedProvenance: input.bridgeProvidedProvenance,
    authorityBoundary:
      "Expression reflects local stance metadata only; it is not emotion inference, approval, or agent action.",
    guardianReviewReminder: childProtected
      ? "Guardian review is required before child avatar expression animation."
      : "No guardian review reminder for this profile.",
    avatarAnimationStarted: false,
    affectInferred: false,
    cameraCaptureStarted: false,
    faceDetectionStarted: false,
    liveNapoleonContacted: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    guardianApprovalCaptured: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    blockedEffects,
  };
}

function expressionForStance(
  stance: string,
  childProtected: boolean,
): LocalAvatarExpressionResult["expression"] {
  const normalized = stance.toLowerCase();
  if (childProtected && normalized === "playful") return "soft_neutral";
  if (normalized.includes("direct")) return "focused_neutral";
  if (normalized.includes("warm")) return "soft_neutral";
  if (normalized.includes("concerned")) return "concerned_neutral";
  if (normalized.includes("playful")) return "light_neutral";
  if (normalized.includes("somber")) return "low_neutral";
  return "neutral";
}
