export interface VoiceResponseShapeInput {
  responseText: string;
  speakerLabel: string;
  bridgeProvidedProvenance: boolean;
  maxSpokenChars: number;
}

export interface VoiceResponseShapeResult {
  localPreparationOnly: true;
  wasShortened: boolean;
  originalChars: number;
  spokenChars: number;
  spokenText: string;
  authorityBoundary: string;
  audioPlaybackStarted: false;
  microphoneCaptureStarted: false;
  rawAudioStored: false;
  liveNapoleonContacted: false;
  memoryWritePerformed: false;
  approvalCaptured: false;
  externalSendPerformed: false;
  blockedEffects: string[];
}

export const localVoiceResponseShapeSample: VoiceResponseShapeInput = {
  responseText:
    "Prepare the bridge rollout plan for owner review. Passive Brain found that descriptor discovery is ready. Keep the proof export visible before the next governed send. This final sentence should not be spoken in the short voice summary.",
  speakerLabel: "Napoleon",
  bridgeProvidedProvenance: true,
  maxSpokenChars: 150,
};

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function firstSpokenSentences(text: string, maxChars: number): string {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    throw new Error("response text is empty");
  }

  let spoken = "";
  for (const sentence of sentences) {
    const next = spoken ? `${spoken} ${sentence}` : sentence;
    if (next.length > maxChars && spoken) break;
    if (next.length > maxChars) return `${sentence.slice(0, Math.max(0, maxChars - 1)).trimEnd()}.`;
    spoken = next;
  }
  return spoken;
}

export function shapeVoiceResponseForSpeech(input: VoiceResponseShapeInput): VoiceResponseShapeResult {
  const trimmedText = input.responseText.trim();
  if (trimmedText.length === 0) {
    throw new Error("response text is empty");
  }
  if (input.maxSpokenChars < 24) {
    throw new Error("max spoken characters is too small");
  }

  const prefix = input.bridgeProvidedProvenance ? `${input.speakerLabel.trim() || "Napoleon"} says: ` : "";
  const bodyMax = Math.max(1, input.maxSpokenChars - prefix.length);
  const spokenBody = firstSpokenSentences(trimmedText, bodyMax);
  const spokenText = `${prefix}${spokenBody}`;

  return {
    localPreparationOnly: true,
    wasShortened: spokenText.length < trimmedText.length,
    originalChars: trimmedText.length,
    spokenChars: spokenText.length,
    spokenText,
    authorityBoundary: input.bridgeProvidedProvenance
      ? "Bridge-provided Napoleon provenance preserved for speech."
      : "No bridge provenance; speech summary must not claim Napoleon or delegated-agent authority.",
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
