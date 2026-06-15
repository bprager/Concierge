import type { LocalProfile } from "./contractBridge.js";

export type LocalAffectSignal = "head_pose_shift" | "voice_pause" | "text_clarification";
export type LocalAffectUncertaintyLabel =
  | "possible_confusion"
  | "possible_frustration"
  | "low_confidence_no_signal";

export interface LocalAvatarAffectFusionInput {
  headPoseShift: boolean;
  voicePauseMs: number;
  textClarificationRequested: boolean;
  profileMode?: LocalProfile;
}

export interface LocalAvatarAffectFusionResult {
  localMetadataOnly: true;
  profileMode: LocalProfile;
  childProtected: boolean;
  guardianReviewRequired: boolean;
  cameraPolicy: "local_sample_only" | "disabled_until_guardian_review";
  microphonePolicy: "local_sample_only" | "disabled_until_guardian_review";
  storagePolicy: "disabled" | "disabled_until_guardian_review";
  affectPolicy: "local_uncertainty_only" | "disabled_until_guardian_review";
  emotionFactPolicy: "disabled";
  uncertaintyLabel: LocalAffectUncertaintyLabel;
  displayLabel: string;
  confidence: number;
  inputSignals: LocalAffectSignal[];
  rationale: string[];
  authorityBoundary: string;
  guardianReviewReminder: string;
  emotionClaimedAsFact: false;
  cameraCaptureStarted: false;
  microphoneCaptureStarted: false;
  rawVideoStored: false;
  rawAudioStored: false;
  liveFaceDetectionStarted: false;
  liveAffectModelStarted: false;
  attentionInferred: false;
  avatarAnimationStarted: false;
  liveNapoleonContacted: false;
  memoryWritePerformed: false;
  approvalCaptured: false;
  guardianApprovalCaptured: false;
  externalSendPerformed: false;
  blockedEffects: string[];
}

export const localAvatarAffectFusionSample: LocalAvatarAffectFusionInput = {
  headPoseShift: true,
  voicePauseMs: 1250,
  textClarificationRequested: true,
};

export function buildLocalAvatarAffectFusion(
  input: LocalAvatarAffectFusionInput,
): LocalAvatarAffectFusionResult {
  const profileMode = input.profileMode ?? "adult_owner";
  const childProtected = profileMode === "child_protected";
  const inputSignals = collectSignals(input);
  const uncertaintyLabel = chooseUncertaintyLabel(input, inputSignals);
  const blockedEffects = [
    "camera_capture",
    "microphone_capture",
    "raw_video_storage",
    "raw_audio_storage",
    "live_face_detection",
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
    blockedEffects.splice(12, 0, "guardian_approval_capture");
  }

  return {
    localMetadataOnly: true,
    profileMode,
    childProtected,
    guardianReviewRequired: childProtected,
    cameraPolicy: childProtected ? "disabled_until_guardian_review" : "local_sample_only",
    microphonePolicy: childProtected ? "disabled_until_guardian_review" : "local_sample_only",
    storagePolicy: childProtected ? "disabled_until_guardian_review" : "disabled",
    affectPolicy: childProtected ? "disabled_until_guardian_review" : "local_uncertainty_only",
    emotionFactPolicy: "disabled",
    uncertaintyLabel,
    displayLabel: displayLabelFor(uncertaintyLabel),
    confidence: confidenceFor(uncertaintyLabel),
    inputSignals,
    rationale: rationaleFor(input),
    authorityBoundary:
      "Affect fusion is local uncertainty metadata only; it is not an emotion fact, attention inference, approval, or agent action.",
    guardianReviewReminder: childProtected
      ? "Guardian review is required before child avatar affect, camera, microphone, or animation features."
      : "No guardian review reminder for this profile.",
    emotionClaimedAsFact: false,
    cameraCaptureStarted: false,
    microphoneCaptureStarted: false,
    rawVideoStored: false,
    rawAudioStored: false,
    liveFaceDetectionStarted: false,
    liveAffectModelStarted: false,
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

function collectSignals(input: LocalAvatarAffectFusionInput): LocalAffectSignal[] {
  const signals: LocalAffectSignal[] = [];
  if (input.headPoseShift) signals.push("head_pose_shift");
  if (input.voicePauseMs >= 1000) signals.push("voice_pause");
  if (input.textClarificationRequested) signals.push("text_clarification");
  return signals;
}

function chooseUncertaintyLabel(
  input: LocalAvatarAffectFusionInput,
  signals: LocalAffectSignal[],
): LocalAffectUncertaintyLabel {
  if (signals.includes("text_clarification")) return "possible_confusion";
  if (input.voicePauseMs >= 1800 && input.headPoseShift) return "possible_frustration";
  return "low_confidence_no_signal";
}

function confidenceFor(label: LocalAffectUncertaintyLabel): number {
  if (label === "possible_confusion") return 0.56;
  if (label === "possible_frustration") return 0.48;
  return 0.22;
}

function displayLabelFor(label: LocalAffectUncertaintyLabel): string {
  if (label === "possible_confusion") return "Possible confusion";
  if (label === "possible_frustration") return "Possible frustration";
  return "Low confidence / no signal";
}

function rationaleFor(input: LocalAvatarAffectFusionInput): string[] {
  const rationale: string[] = [];
  if (input.headPoseShift) rationale.push("Head pose changed in the local sample.");
  if (input.voicePauseMs >= 1000) rationale.push("Voice pause metadata suggests the user may need time.");
  if (input.textClarificationRequested) rationale.push("Text sample asks for clarification.");
  if (rationale.length === 0) rationale.push("No strong local sample signal is available.");
  return rationale;
}
