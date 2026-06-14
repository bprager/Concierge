import { localSttSample, transcribeLocalSpeechSample, type LocalSpeechTranscriptionResult } from "./speechTranscription.js";
import { localTtsSample, synthesizeLocalSpeechSample, type LocalTextToSpeechResult } from "./textToSpeech.js";
import { detectVoiceSegments, localVadSampleFrames, type VoiceActivitySegment } from "./voiceActivity.js";

export interface LocalVoiceTurnTextBoundary {
  responseBoundary: "local_rehearsal_placeholder";
  authorityBoundary: string;
}

export interface LocalVoiceTurnRehearsalResult {
  localRehearsalOnly: true;
  liveNapoleonContacted: false;
  microphoneCaptureStarted: false;
  audioPlaybackStarted: false;
  rawAudioStored: false;
  memoryWritePerformed: false;
  approvalCaptured: false;
  externalSendPerformed: false;
  vad: {
    segments: VoiceActivitySegment[];
  };
  stt: LocalSpeechTranscriptionResult;
  textBoundary: LocalVoiceTurnTextBoundary;
  tts: LocalTextToSpeechResult;
  blockedEffects: string[];
}

export function rehearseLocalVoiceTurnSample(): LocalVoiceTurnRehearsalResult {
  const segments = detectVoiceSegments(localVadSampleFrames, {
    thresholdRms: 0.05,
    hangoverMs: 80,
    minSpeechMs: 80,
  });
  const stt = transcribeLocalSpeechSample(localSttSample);
  const tts = synthesizeLocalSpeechSample(localTtsSample);

  return {
    localRehearsalOnly: true,
    liveNapoleonContacted: false,
    microphoneCaptureStarted: false,
    audioPlaybackStarted: false,
    rawAudioStored: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    externalSendPerformed: false,
    vad: {
      segments,
    },
    stt,
    textBoundary: {
      responseBoundary: "local_rehearsal_placeholder",
      authorityBoundary: "Napoleon not contacted; no delegated agent response.",
    },
    tts,
    blockedEffects: [
      "microphone_capture",
      "audio_playback",
      "raw_audio_storage",
      "live_napoleon_contact",
      "memory_write",
      "approval_capture",
      "external_send",
      "agent_dispatch",
    ],
  };
}
