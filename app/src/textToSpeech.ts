export interface LocalTextToSpeechSample {
  sampleId: string;
  voiceId: string;
  text: string;
  estimatedMsPerCharacter: number;
}

export interface LocalTextToSpeechResult {
  voiceId: string;
  chars: number;
  durationMs: number;
  latencyMs: number;
  localSampleOnly: true;
  audioPlaybackStarted: false;
  rawAudioStored: false;
  agentDispatchPerformed: false;
}

export const localTtsSample: LocalTextToSpeechSample = {
  sampleId: "local_tts_sample_001",
  voiceId: "local-sample-voice",
  text: "Concierge voice sample prepared.",
  estimatedMsPerCharacter: 40,
};

export function synthesizeLocalSpeechSample(sample: LocalTextToSpeechSample): LocalTextToSpeechResult {
  const trimmedText = sample.text.trim();
  if (trimmedText.length === 0) {
    throw new Error("sample text is empty");
  }

  return {
    voiceId: sample.voiceId,
    chars: trimmedText.length,
    durationMs: trimmedText.length * sample.estimatedMsPerCharacter,
    latencyMs: 0,
    localSampleOnly: true,
    audioPlaybackStarted: false,
    rawAudioStored: false,
    agentDispatchPerformed: false,
  };
}
