import { rehearseLocalVoiceTurnSample } from "./voiceTurnRehearsal.js";

export interface LocalBargeInRehearsalResult {
  localRehearsalOnly: true;
  bargeInDetected: true;
  interruptedOutput: string;
  interruptAtMs: number;
  nextTurnPrepared: true;
  audioPlaybackStarted: false;
  microphoneCaptureStarted: false;
  rawAudioStored: false;
  liveNapoleonContacted: false;
  memoryWritePerformed: false;
  approvalCaptured: false;
  externalSendPerformed: false;
  blockedEffects: string[];
}

export function rehearseLocalBargeInSample(): LocalBargeInRehearsalResult {
  const voiceTurn = rehearseLocalVoiceTurnSample();

  return {
    localRehearsalOnly: true,
    bargeInDetected: true,
    interruptedOutput: voiceTurn.tts.voiceId,
    interruptAtMs: 480,
    nextTurnPrepared: true,
    audioPlaybackStarted: false,
    microphoneCaptureStarted: false,
    rawAudioStored: false,
    liveNapoleonContacted: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    externalSendPerformed: false,
    blockedEffects: [
      "audio_playback",
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
