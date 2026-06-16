import type { NapoleonProfileMode } from "./contractBridge.js";

export type GovernedVoicePipelineStageId =
  | "consent"
  | "capture"
  | "vad"
  | "stt"
  | "governed_bridge"
  | "response_shaping"
  | "tts"
  | "playback";

export interface GovernedVoicePipelineStage {
  id: GovernedVoicePipelineStageId;
  label: string;
  status: "blocked";
  requiredProof: string;
  authorityBoundary: string;
}

export interface GovernedVoicePipelinePlan {
  proposalOnly: true;
  profileMode: NapoleonProfileMode;
  childProtected: boolean;
  guardianReviewRequired: boolean;
  canStartLiveVoice: false;
  authorityBoundary: string;
  stages: GovernedVoicePipelineStage[];
  blockedEffects: string[];
  microphoneCaptureStarted: false;
  audioPlaybackStarted: false;
  rawAudioStored: false;
  liveNapoleonContacted: false;
  approvalCaptured: false;
  memoryWritePerformed: false;
  agentDispatchPerformed: false;
  externalSendPerformed: false;
}

export interface GovernedVoicePipelinePlanInput {
  profileMode: NapoleonProfileMode;
}

export interface GovernedVoicePipelineProofInput {
  generatedAt?: string;
  conversationId: string;
}

const blockedEffects = [
  "microphone_capture",
  "audio_playback",
  "raw_audio_storage",
  "live_napoleon_contact",
  "memory_write",
  "approval_capture",
  "agent_dispatch",
  "external_send",
];

export function buildGovernedVoicePipelinePlan(input: GovernedVoicePipelinePlanInput): GovernedVoicePipelinePlan {
  const childProtected = input.profileMode === "child_protected_user";
  const consentProof = childProtected
    ? "guardian review, owner consent, microphone consent, and visible recording state"
    : "owner consent, microphone consent, and visible recording state";

  return {
    proposalOnly: true,
    profileMode: input.profileMode,
    childProtected,
    guardianReviewRequired: childProtected,
    canStartLiveVoice: false,
    authorityBoundary: childProtected
      ? "Proposal only; guardian and owner review are required before any live voice path can be considered."
      : "Proposal only; Napoleon remains the authority for governed bridge decisions before any live voice path can be considered.",
    stages: [
      {
        id: "consent",
        label: "Consent and visible recording state",
        status: "blocked",
        requiredProof: consentProof,
        authorityBoundary: "Local consent surface only; not Napoleon approval.",
      },
      {
        id: "capture",
        label: "Microphone capture",
        status: "blocked",
        requiredProof: "explicit start control, granted OS permission, and visible capture indicator",
        authorityBoundary: "Local capture would be opt-in and visible; it is not memory or approval authority.",
      },
      {
        id: "vad",
        label: "Voice activity gate",
        status: "blocked",
        requiredProof: "local VAD runtime evidence without raw audio storage",
        authorityBoundary: "Local derived signal only; it does not infer intent or grant authority.",
      },
      {
        id: "stt",
        label: "Speech transcription gate",
        status: "blocked",
        requiredProof: "local STT evidence with raw audio minimization",
        authorityBoundary: "Transcript candidate only; no memory write or external send.",
      },
      {
        id: "governed_bridge",
        label: "Governed Napoleon bridge turn",
        status: "blocked",
        requiredProof: "descriptor, real-runtime bridge proof, governance decision, trace, and audit references",
        authorityBoundary: "Only Napoleon may handle the governed bridge turn through the governed bridge.",
      },
      {
        id: "response_shaping",
        label: "Speech-safe response shaping",
        status: "blocked",
        requiredProof: "bridge-provided provenance and attribution-safe speech summary",
        authorityBoundary: "Speech summary must preserve returned Napoleon and delegated-agent provenance only.",
      },
      {
        id: "tts",
        label: "Speech preparation",
        status: "blocked",
        requiredProof: "local TTS evidence without raw audio storage or playback",
        authorityBoundary: "Prepared audio metadata only; not permission to speak externally.",
      },
      {
        id: "playback",
        label: "Audio playback",
        status: "blocked",
        requiredProof: "explicit playback consent and visible speaking state",
        authorityBoundary: "Playback would require explicit local consent; it is not Napoleon approval.",
      },
    ],
    blockedEffects,
    microphoneCaptureStarted: false,
    audioPlaybackStarted: false,
    rawAudioStored: false,
    liveNapoleonContacted: false,
    approvalCaptured: false,
    memoryWritePerformed: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
  };
}

export function exportGovernedVoicePipelineProofJson(
  plan: GovernedVoicePipelinePlan,
  input: GovernedVoicePipelineProofInput,
): string {
  return JSON.stringify(
    {
      kind: "concierge_governed_voice_pipeline_proof",
      generatedAt: input.generatedAt ?? new Date().toISOString(),
      conversationId: input.conversationId,
      voicePipeline: {
        proposalOnly: plan.proposalOnly,
        profileMode: plan.profileMode,
        childProtected: plan.childProtected,
        guardianReviewRequired: plan.guardianReviewRequired,
        canStartLiveVoice: plan.canStartLiveVoice,
        authorityBoundary: plan.authorityBoundary,
        stages: plan.stages.map((stage) => ({
          id: stage.id,
          label: stage.label,
          status: stage.status,
          requiredProof: stage.requiredProof,
          authorityBoundary: stage.authorityBoundary,
        })),
        blockedEffects: plan.blockedEffects,
      },
      boundary: {
        microphoneCaptureStarted: plan.microphoneCaptureStarted,
        audioPlaybackStarted: plan.audioPlaybackStarted,
        rawAudioStored: plan.rawAudioStored,
        liveNapoleonContacted: plan.liveNapoleonContacted,
        approvalCaptured: plan.approvalCaptured,
        memoryWritePerformed: plan.memoryWritePerformed,
        agentDispatchPerformed: plan.agentDispatchPerformed,
        externalSendPerformed: plan.externalSendPerformed,
      },
    },
    null,
    2,
  );
}
