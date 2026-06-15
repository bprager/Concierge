export interface VoiceResponseShapeInput {
  responseText: string;
  speakerLabel: string;
  bridgeProvidedProvenance: boolean;
  maxSpokenChars: number;
  profileMode?: "adult_owner" | "child_protected" | "guest" | "collaborator";
}

export interface VoiceResponseShapeResult {
  localPreparationOnly: true;
  profileMode: "adult_owner" | "child_protected" | "guest" | "collaborator";
  childProtected: boolean;
  wasShortened: boolean;
  originalChars: number;
  spokenChars: number;
  maxSpokenCharsApplied: number;
  pacing: "standard" | "slow";
  requiresGuardianReviewReminder: boolean;
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

function removeUnprovenAttributionClaims(text: string): string {
  return text
    .replace(/\bNapoleon recommends\s+/gi, "A local summary suggests ")
    .replace(/\bNapoleon says:?\s+/gi, "A local summary says ")
    .replace(/\bPassive Brain found\s+/gi, "A local summary notes ")
    .replace(/\s+/g, " ")
    .trim();
}

export function shapeVoiceResponseForSpeech(input: VoiceResponseShapeInput): VoiceResponseShapeResult {
  const trimmedText = (input.bridgeProvidedProvenance
    ? input.responseText.trim()
    : removeUnprovenAttributionClaims(input.responseText)
  );
  if (trimmedText.length === 0) {
    throw new Error("response text is empty");
  }
  if (input.maxSpokenChars < 24) {
    throw new Error("max spoken characters is too small");
  }

  const profileMode = input.profileMode ?? "adult_owner";
  const childProtected = profileMode === "child_protected";
  const maxSpokenCharsApplied = childProtected ? Math.min(input.maxSpokenChars, 120) : input.maxSpokenChars;
  const prefix = input.bridgeProvidedProvenance ? `${input.speakerLabel.trim() || "Napoleon"} says: ` : "";
  const guardianReminder = childProtected ? " Please check this with your guardian review." : "";
  const bodyMax = Math.max(1, maxSpokenCharsApplied - prefix.length - guardianReminder.length);
  const spokenBody = firstSpokenSentences(trimmedText, bodyMax);
  const spokenText = `${prefix}${spokenBody}${guardianReminder}`;

  return {
    localPreparationOnly: true,
    profileMode,
    childProtected,
    wasShortened: spokenText.length < trimmedText.length,
    originalChars: trimmedText.length,
    spokenChars: spokenText.length,
    maxSpokenCharsApplied,
    pacing: childProtected ? "slow" : "standard",
    requiresGuardianReviewReminder: childProtected,
    spokenText,
    authorityBoundary: childProtected
      ? "Child protected speech preview is shortened, slower, and still requires guardian/owner review; it is not Napoleon approval."
      : input.bridgeProvidedProvenance
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
