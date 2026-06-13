export interface VoiceActivityFrame {
  offsetMs: number;
  durationMs: number;
  rms: number;
}

export interface VoiceActivitySegment {
  startMs: number;
  endMs: number;
  peakRms: number;
  frameCount: number;
}

export interface VoiceActivityOptions {
  thresholdRms?: number;
  hangoverMs?: number;
  minSpeechMs?: number;
}

const DEFAULT_THRESHOLD_RMS = 0.05;
const DEFAULT_HANGOVER_MS = 120;
const DEFAULT_MIN_SPEECH_MS = 120;

export function detectVoiceSegments(
  frames: VoiceActivityFrame[],
  options: VoiceActivityOptions = {},
): VoiceActivitySegment[] {
  const thresholdRms = options.thresholdRms ?? DEFAULT_THRESHOLD_RMS;
  const hangoverMs = options.hangoverMs ?? DEFAULT_HANGOVER_MS;
  const minSpeechMs = options.minSpeechMs ?? DEFAULT_MIN_SPEECH_MS;
  const segments: VoiceActivitySegment[] = [];
  let active: VoiceActivitySegment | null = null;
  let lastSpeechEndMs = 0;

  function finishActive() {
    if (!active) return;
    const candidate = { ...active, endMs: lastSpeechEndMs };
    if (candidate.endMs - candidate.startMs >= minSpeechMs) {
      segments.push(candidate);
    }
    active = null;
  }

  for (const frame of frames) {
    const frameEndMs = frame.offsetMs + frame.durationMs;
    if (frame.rms >= thresholdRms) {
      if (!active) {
        active = {
          startMs: frame.offsetMs,
          endMs: frameEndMs,
          peakRms: frame.rms,
          frameCount: 0,
        };
      }
      active.peakRms = Math.max(active.peakRms, frame.rms);
      active.frameCount += 1;
      lastSpeechEndMs = frameEndMs;
      continue;
    }

    if (active && frame.offsetMs - lastSpeechEndMs >= hangoverMs) {
      finishActive();
    }
  }

  finishActive();
  return segments;
}

export const localVadSampleFrames: VoiceActivityFrame[] = [
  { offsetMs: 0, durationMs: 40, rms: 0.01 },
  { offsetMs: 40, durationMs: 40, rms: 0.08 },
  { offsetMs: 80, durationMs: 40, rms: 0.09 },
  { offsetMs: 120, durationMs: 40, rms: 0.07 },
  { offsetMs: 160, durationMs: 40, rms: 0.01 },
  { offsetMs: 200, durationMs: 40, rms: 0.01 },
  { offsetMs: 240, durationMs: 40, rms: 0.01 },
  { offsetMs: 280, durationMs: 40, rms: 0.06 },
  { offsetMs: 320, durationMs: 40, rms: 0.07 },
  { offsetMs: 360, durationMs: 40, rms: 0.06 },
];
