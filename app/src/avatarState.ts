export interface LocalNeutralAvatarStateInput {
  responseText: string;
  stance: string;
  bridgeProvidedProvenance: boolean;
}

export interface LocalNeutralAvatarStateResult {
  localDisplayOnly: true;
  avatarState: "neutral_listening";
  expression: "neutral";
  gazeTarget: "user_interface";
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

  return {
    localDisplayOnly: true,
    avatarState: "neutral_listening",
    expression: "neutral",
    gazeTarget: "user_interface",
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
    externalSendPerformed: false,
    blockedEffects: [
      "camera_capture",
      "face_detection",
      "affect_inference",
      "avatar_animation",
      "live_napoleon_contact",
      "memory_write",
      "approval_capture",
      "external_send",
      "agent_dispatch",
    ],
  };
}
