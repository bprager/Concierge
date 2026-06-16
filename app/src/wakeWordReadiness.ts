import type { LocalProfile } from "./contractBridge.js";

export interface LocalWakeWordReadinessInput {
  enabled: boolean;
  profileMode: LocalProfile;
  phrase?: string;
}

export interface LocalWakeWordReadinessResult {
  localOptionOnly: true;
  enabled: boolean;
  phrase: string;
  profileMode: LocalProfile;
  childProtected: boolean;
  guardianReviewReminder: boolean;
  detectionState: "disabled" | "option_enabled_capture_stopped";
  authorityBoundary: string;
  listeningStarted: false;
  microphoneCaptureStarted: false;
  rawAudioStored: false;
  liveNapoleonContacted: false;
  memoryWritePerformed: false;
  approvalCaptured: false;
  externalSendPerformed: false;
  agentDispatchPerformed: false;
  blockedEffects: string[];
}

export function buildLocalWakeWordReadiness(input: LocalWakeWordReadinessInput): LocalWakeWordReadinessResult {
  const childProtected = input.profileMode === "child_protected";

  return {
    localOptionOnly: true,
    enabled: input.enabled,
    phrase: input.phrase ?? "Hey Concierge",
    profileMode: input.profileMode,
    childProtected,
    guardianReviewReminder: childProtected,
    detectionState: input.enabled ? "option_enabled_capture_stopped" : "disabled",
    authorityBoundary: "Wake word is a local option only; no always-on listening has started.",
    listeningStarted: false,
    microphoneCaptureStarted: false,
    rawAudioStored: false,
    liveNapoleonContacted: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    externalSendPerformed: false,
    agentDispatchPerformed: false,
    blockedEffects: [
      "always_on_listening",
      "microphone_capture",
      "raw_audio_storage",
      "live_napoleon_contact",
      "memory_write",
      "approval_capture",
      "external_send",
      "agent_dispatch",
    ],
  };
}
