export interface LocalSpeechSample {
  sampleId: string;
  model: string;
  phraseTokens: string[];
}

export interface LocalSpeechTranscriptionResult {
  transcript: string;
  model: string;
  latencyMs: number;
  localSampleOnly: true;
  rawAudioStored: false;
}

export const localSttSample: LocalSpeechSample = {
  sampleId: "local_stt_sample_001",
  model: "local-sample-stt",
  phraseTokens: ["Concierge", "voice", "sample", "detected."],
};

export function transcribeLocalSpeechSample(sample: LocalSpeechSample): LocalSpeechTranscriptionResult {
  if (sample.phraseTokens.length === 0) {
    throw new Error("sample contains no phrase tokens");
  }

  return {
    transcript: sample.phraseTokens.join(" "),
    model: sample.model,
    latencyMs: 0,
    localSampleOnly: true,
    rawAudioStored: false,
  };
}
