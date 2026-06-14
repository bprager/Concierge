import { useState } from "react";
import {
  buildLocalNeutralAvatarState,
  localNeutralAvatarStateSample,
  type LocalNeutralAvatarStateResult,
} from "./avatarState.js";
import { rehearseLocalBargeInSample, type LocalBargeInRehearsalResult } from "./bargeInRehearsal.js";
import { answerCapabilityQuestion } from "./capabilityLedger.js";
import { describeBridgeOperationSummary } from "./bridgeOperations.js";
import {
  buildBridgeEvidenceReadinessState,
  compareBridgeReadinessProofs,
  exportBridgeReadinessProofJson,
  type BridgeReadinessProofComparison,
  updateBridgeEvidenceReadinessState,
} from "./bridgeEvidenceReadiness.js";
import {
  createCapabilityTaxonomy,
  draftChiefOfStaffTaxonomyReview,
  getTaxonomyLabelCounts,
  markTaxonomyLabel,
  mergeTaxonomyLabels,
  renameTaxonomyLabel,
  resetCapabilityTaxonomy,
  type ChiefOfStaffTaxonomyReviewDraft,
  submitChiefOfStaffTaxonomyReviewDraft,
  type ChiefOfStaffTaxonomyReviewSubmissionResult,
  type TaxonomyDimension,
} from "./capabilityTaxonomy.js";
import {
  draftChiefOfStaffSteering,
  submitChiefOfStaffSteeringDraft,
  type ChiefOfStaffSteeringSubmissionResult,
} from "./chiefOfStaffSteering.js";
import {
  buildDescriptorConnectionState,
  buildGovernanceReviewState,
  buildMemoryProposalReviewState,
  buildRehearsalPreview,
  buildTextTurnContract,
  defaultChiefOfStaffDescriptor,
  transitionMemoryProposalReviewState,
  type DescriptorConnectionInput,
  type LocalProfile,
  type MemoryProposalReviewState,
} from "./contractBridge.js";
import { discoverNapoleonDescriptor } from "./descriptorDiscovery.js";
import {
  submitMemoryProposalForReview,
  type MemoryProposalSubmissionResult,
} from "./memoryProposalSubmission.js";
import { sendToNapoleon } from "./napoleonBridge.js";
import {
  buildSuccessfulNapoleonResponsePresentation,
  clearNapoleonResponsePresentation,
  compareNapoleonResponseProofs,
  exportNapoleonResponseProofJson,
  type NapoleonResponseProofComparison,
} from "./napoleonResponsePresentation.js";
import {
  buildLocalHarnessEndpointPreset,
  isLocalHarnessEndpoint,
} from "./localHarnessEndpoint.js";
import {
  describeBridgeFailure,
  describeBridgeFailureTranscriptMessage,
  describeGovernedHandoffFailure,
  describeGovernedHandoffReadiness,
  describeGovernanceDecision,
  describeGovernanceReview,
  describeLiveBridgeReadiness,
  describeLiveSendPreflight,
  describeMemoryProposalReview,
  summarizeRehearsalPreview,
} from "./presentation.js";
import { emitEvent, newTraceId } from "./telemetry.js";
import { capabilityLedger } from "./telemetry.js";
import {
  CAPABILITY_LEDGER_MAX_AGE_DAYS,
  CAPABILITY_LEDGER_MAX_SIGNALS,
  clearPersistedCapabilityLedger,
  exportCapabilityLedgerJson,
  loadCapabilityTaxonomyFromStorage,
  persistCapabilityTaxonomyToStorage,
} from "./capabilityLedgerStorage.js";
import type { ConciergeMessage } from "./types.js";
import {
  localSttSample,
  transcribeLocalSpeechSample,
  type LocalSpeechTranscriptionResult,
} from "./speechTranscription.js";
import {
  localTtsSample,
  synthesizeLocalSpeechSample,
  type LocalTextToSpeechResult,
} from "./textToSpeech.js";
import { rehearseLocalVoiceTurnSample, type LocalVoiceTurnRehearsalResult } from "./voiceTurnRehearsal.js";
import {
  localVoiceResponseShapeSample,
  shapeVoiceResponseForSpeech,
  type VoiceResponseShapeResult,
} from "./voiceResponseShaping.js";
import { detectVoiceSegments, localVadSampleFrames, type VoiceActivitySegment } from "./voiceActivity.js";

const conversationId = `conv_${Date.now().toString(16)}`;

type LocalMediaPermissionStatus = "not_requested" | "granted" | "denied" | "unavailable";

function storedBoolean(key: string, fallback: boolean): boolean {
  if (typeof localStorage === "undefined") return fallback;
  const value = localStorage.getItem(key);
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

interface PendingRehearsal {
  content: string;
  traceId: string;
  turnId: string;
  preview: ReturnType<typeof buildRehearsalPreview>;
  summary: ReturnType<typeof summarizeRehearsalPreview>;
  review: ReturnType<typeof describeGovernanceReview>;
  memoryReviewState: MemoryProposalReviewState;
  memoryReview: ReturnType<typeof describeMemoryProposalReview> | null;
}

function formatCapabilityAnswer(answer: NonNullable<ReturnType<typeof answerCapabilityQuestion>>): string {
  const rows = answer.rows.length
    ? answer.rows
        .map((row) => {
          const status = row.status ? `, ${row.status}` : "";
          const area = row.architectureArea ? `, ${row.architectureArea}` : "";
          const confidence = row.confidence === undefined ? "" : `, confidence ${row.confidence}`;
          const score = row.score === undefined ? "" : `, score ${row.score}`;
          const nextStep = row.suggestedNextStep ? `, next ${row.suggestedNextStep}` : "";
          const scoreContext = row.scoreExplanation ? `, ${row.scoreExplanation}` : "";
          return `${row.label}: ${row.count}${status}${area}${confidence}${score}${nextStep}${scoreContext}`;
        })
        .join("\n")
    : "No local signals yet.";

  return `${answer.summary}\n\n${rows}\n\nEvidence: ${answer.evidenceCount} local signals. ${answer.caveat} This is a local summary only and does not approve, implement, write memory, dispatch agents, or send externally.`;
}

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function App() {
  const [messages, setMessages] = useState<ConciergeMessage[]>([
    {
      role: "assistant",
      content: "Text Concierge is ready in prepare-only mode. Camera and microphone are off.",
    },
  ]);
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<LocalProfile>("adult_owner");
  const [rehearsalMode, setRehearsalMode] = useState(true);
  const [descriptorMode, setDescriptorMode] = useState<"discovered" | "live" | "missing" | "checksum_mismatch">("discovered");
  const [liveDescriptorInput, setLiveDescriptorInput] = useState<DescriptorConnectionInput | null>(null);
  const [descriptorDiscoveryMessage, setDescriptorDiscoveryMessage] = useState<string | null>(null);
  const [pendingRehearsal, setPendingRehearsal] = useState<PendingRehearsal | null>(null);
  const [endpoint, setEndpoint] = useState(() =>
    typeof localStorage === "undefined" ? "" : localStorage.getItem("napoleon_endpoint") ?? "",
  );
  const [authToken, setAuthToken] = useState(() =>
    typeof localStorage === "undefined" ? "" : localStorage.getItem("napoleon_auth_token") ?? "",
  );
  const [telemetryEnabled, setTelemetryEnabled] = useState(() => storedBoolean("concierge_telemetry_enabled", true));
  const [cameraEnabled, setCameraEnabled] = useState(() => storedBoolean("concierge_camera_enabled", false));
  const [microphoneEnabled, setMicrophoneEnabled] = useState(() =>
    storedBoolean("concierge_microphone_enabled", false),
  );
  const [microphonePermissionStatus, setMicrophonePermissionStatus] =
    useState<LocalMediaPermissionStatus>("not_requested");
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<LocalMediaPermissionStatus>("not_requested");
  const [vadSampleSegments, setVadSampleSegments] = useState<VoiceActivitySegment[] | null>(null);
  const [sttSampleResult, setSttSampleResult] = useState<LocalSpeechTranscriptionResult | null>(null);
  const [ttsSampleResult, setTtsSampleResult] = useState<LocalTextToSpeechResult | null>(null);
  const [voiceTurnRehearsalResult, setVoiceTurnRehearsalResult] = useState<LocalVoiceTurnRehearsalResult | null>(null);
  const [bargeInRehearsalResult, setBargeInRehearsalResult] = useState<LocalBargeInRehearsalResult | null>(null);
  const [voiceResponseShapeResult, setVoiceResponseShapeResult] = useState<VoiceResponseShapeResult | null>(null);
  const [neutralAvatarStateResult, setNeutralAvatarStateResult] = useState<LocalNeutralAvatarStateResult | null>(null);
  const [lastDecision, setLastDecision] = useState<ReturnType<typeof describeGovernanceDecision> | null>(null);
  const [lastNapoleonPresentation, setLastNapoleonPresentation] = useState(clearNapoleonResponsePresentation);
  const [napoleonProofExportJson, setNapoleonProofExportJson] = useState<string | null>(null);
  const [napoleonProofComparison, setNapoleonProofComparison] = useState<NapoleonResponseProofComparison | null>(null);
  const [lastBridgeFailure, setLastBridgeFailure] = useState<string | null>(null);
  const [bridgeEvidenceReadiness, setBridgeEvidenceReadiness] = useState(buildBridgeEvidenceReadinessState);
  const [bridgeReadinessProofJson, setBridgeReadinessProofJson] = useState<string | null>(null);
  const [bridgeReadinessProofComparison, setBridgeReadinessProofComparison] =
    useState<BridgeReadinessProofComparison | null>(null);
  const [lastReview, setLastReview] = useState<ReturnType<typeof describeGovernanceReview> | null>(null);
  const [lastMemoryReviewState, setLastMemoryReviewState] = useState<MemoryProposalReviewState | null>(null);
  const [lastMemoryReview, setLastMemoryReview] = useState<ReturnType<typeof describeMemoryProposalReview> | null>(null);
  const [memorySubmission, setMemorySubmission] = useState<MemoryProposalSubmissionResult | null>(null);
  const [memorySubmissionFailure, setMemorySubmissionFailure] = useState<string | null>(null);
  const [capabilitySignalCount, setCapabilitySignalCount] = useState(() => capabilityLedger.listRecent().length);
  const [capabilityExportJson, setCapabilityExportJson] = useState<string | null>(null);
  const [steeringDraft, setSteeringDraft] = useState<ReturnType<typeof draftChiefOfStaffSteering> | null>(null);
  const [steeringSubmission, setSteeringSubmission] = useState<ChiefOfStaffSteeringSubmissionResult | null>(null);
  const [steeringFailure, setSteeringFailure] = useState<string | null>(null);
  const [capabilityTaxonomy, setCapabilityTaxonomy] = useState(() => loadCapabilityTaxonomyFromStorage(browserStorage()));
  const [selectedTaxonomyLabel, setSelectedTaxonomyLabel] = useState("");
  const [taxonomyRenameValue, setTaxonomyRenameValue] = useState("");
  const [taxonomyMergeTarget, setTaxonomyMergeTarget] = useState("");
  const [taxonomyReviewDraft, setTaxonomyReviewDraft] = useState<ChiefOfStaffTaxonomyReviewDraft | null>(null);
  const [taxonomyReviewSubmission, setTaxonomyReviewSubmission] =
    useState<ChiefOfStaffTaxonomyReviewSubmissionResult | null>(null);
  const [taxonomyReviewFailure, setTaxonomyReviewFailure] = useState<string | null>(null);

  function clearNapoleonPresentation() {
    setLastNapoleonPresentation(clearNapoleonResponsePresentation());
    setNapoleonProofExportJson(null);
    setNapoleonProofComparison(null);
  }

  function setSuccessfulNapoleonPresentation(response: Parameters<typeof buildSuccessfulNapoleonResponsePresentation>[0]) {
    setLastNapoleonPresentation(buildSuccessfulNapoleonResponsePresentation(response));
    setNapoleonProofExportJson(null);
    setNapoleonProofComparison(null);
  }

  function currentDescriptorInput(): DescriptorConnectionInput {
    if (descriptorMode === "live" && liveDescriptorInput) {
      return {
        ...liveDescriptorInput,
        endpointConfigured: Boolean(endpoint.trim()),
      };
    }
    return {
      endpointConfigured: Boolean(endpoint.trim()),
      descriptor: descriptorMode === "missing" ? null : defaultChiefOfStaffDescriptor,
      expectedChecksum: descriptorMode === "checksum_mismatch" ? "sha256:expected" : "sha256:local-static",
      actualChecksum: descriptorMode === "checksum_mismatch" ? "sha256:actual" : "sha256:local-static",
      signatureValid: descriptorMode === "checksum_mismatch" ? false : true,
    };
  }
  const descriptorConnection = buildDescriptorConnectionState(currentDescriptorInput());
  const descriptorStatus = descriptorConnection.descriptorStatus;
  const memoryHandoffReadiness = describeGovernedHandoffReadiness({
    label: "Memory proposal review",
    descriptorConnection,
    draftReady: Boolean(lastMemoryReviewState && lastMemoryReviewState.status !== "dismissed_locally"),
  });
  const steeringHandoffReadiness = describeGovernedHandoffReadiness({
    label: "Chief of Staff steering",
    descriptorConnection,
    draftReady: Boolean(steeringDraft?.sendState.canSendToNapoleon),
  });
  const taxonomyHandoffReadiness = describeGovernedHandoffReadiness({
    label: "Chief of Staff taxonomy review",
    descriptorConnection,
    draftReady: Boolean(taxonomyReviewDraft),
  });

  function refreshCapabilityLedgerStatus() {
    setCapabilitySignalCount(capabilityLedger.listRecent().length);
  }

  function taxonomySelection(value = selectedTaxonomyLabel): { dimension: TaxonomyDimension; label: string } | null {
    const [dimension, ...labelParts] = value.split(":");
    const label = labelParts.join(":");
    if (!["topic", "intent", "capability", "architecture"].includes(dimension) || !label) return null;
    return { dimension: dimension as TaxonomyDimension, label };
  }

  function updateCapabilityTaxonomy(
    mutate: (taxonomy: ReturnType<typeof createCapabilityTaxonomy>) => void,
    event: string,
    attributes: Record<string, unknown>,
  ) {
    const next = createCapabilityTaxonomy(capabilityTaxonomy.entries);
    mutate(next);
    setCapabilityTaxonomy(next);
    persistCapabilityTaxonomyToStorage(browserStorage(), next);
    emitEvent(event, {
      traceId: newTraceId(),
      conversationId,
      storage: "local_browser",
      approvalCaptured: false,
      memoryWritePerformed: false,
      externalSendPerformed: false,
      ...attributes,
    });
  }

  function clearBridgeReadinessProof() {
    setBridgeReadinessProofJson(null);
    setBridgeReadinessProofComparison(null);
  }

  function updateEndpoint(value: string) {
    setEndpoint(value);
    clearBridgeReadinessProof();
    if (typeof localStorage === "undefined") return;
    if (value.trim()) {
      localStorage.setItem("napoleon_endpoint", value.trim());
    } else {
      localStorage.removeItem("napoleon_endpoint");
    }
  }

  function updateAuthToken(value: string) {
    setAuthToken(value);
    clearBridgeReadinessProof();
    if (typeof localStorage === "undefined") return;
    if (value.trim()) {
      localStorage.setItem("napoleon_auth_token", value.trim());
    } else {
      localStorage.removeItem("napoleon_auth_token");
    }
  }

  function updatePrivacySetting(kind: "telemetry" | "camera" | "microphone", enabled: boolean) {
    const storageKey =
      kind === "telemetry"
        ? "concierge_telemetry_enabled"
        : kind === "camera"
          ? "concierge_camera_enabled"
          : "concierge_microphone_enabled";
    if (kind === "telemetry") setTelemetryEnabled(enabled);
    if (kind === "camera") setCameraEnabled(enabled);
    if (kind === "microphone") setMicrophoneEnabled(enabled);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(storageKey, String(enabled));
    }
    emitEvent("privacy_setting_changed", {
      traceId: newTraceId(),
      conversationId,
      setting: kind,
      enabled,
      localOnly: true,
      rawAudioStored: false,
      rawVideoStored: false,
      approvalCaptured: false,
      memoryWritePerformed: false,
      externalSendPerformed: false,
    });
  }

  async function requestCameraPermission() {
    const traceId = newTraceId();
    emitEvent("camera_permission_requested", {
      traceId,
      conversationId,
      cameraSettingEnabled: cameraEnabled,
      localOnly: true,
      captureStarted: false,
      rawVideoStored: false,
      approvalCaptured: false,
      memoryWritePerformed: false,
      externalSendPerformed: false,
    });

    if (!cameraEnabled) {
      setCameraPermissionStatus("denied");
      emitEvent("camera_permission_result", {
        traceId,
        conversationId,
        result: "blocked_camera_setting_off",
        captureStarted: false,
        rawVideoStored: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        externalSendPerformed: false,
      });
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraPermissionStatus("unavailable");
      emitEvent("camera_permission_result", {
        traceId,
        conversationId,
        result: "unavailable",
        captureStarted: false,
        rawVideoStored: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        externalSendPerformed: false,
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      for (const track of stream.getTracks()) {
        track.stop();
      }
      setCameraPermissionStatus("granted");
      emitEvent("camera_permission_result", {
        traceId,
        conversationId,
        result: "granted",
        captureStarted: false,
        rawVideoStored: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        externalSendPerformed: false,
      });
    } catch {
      setCameraPermissionStatus("denied");
      emitEvent("camera_permission_result", {
        traceId,
        conversationId,
        result: "denied",
        captureStarted: false,
        rawVideoStored: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        externalSendPerformed: false,
      });
    }
  }

  async function requestMicrophonePermission() {
    const traceId = newTraceId();
    emitEvent("mic_permission_requested", {
      traceId,
      conversationId,
      microphoneSettingEnabled: microphoneEnabled,
      localOnly: true,
      captureStarted: false,
      rawAudioStored: false,
      approvalCaptured: false,
      memoryWritePerformed: false,
      externalSendPerformed: false,
    });

    if (!microphoneEnabled) {
      setMicrophonePermissionStatus("denied");
      emitEvent("mic_permission_result", {
        traceId,
        conversationId,
        result: "blocked_microphone_setting_off",
        captureStarted: false,
        rawAudioStored: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        externalSendPerformed: false,
      });
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicrophonePermissionStatus("unavailable");
      emitEvent("mic_permission_result", {
        traceId,
        conversationId,
        result: "unavailable",
        captureStarted: false,
        rawAudioStored: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        externalSendPerformed: false,
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      for (const track of stream.getTracks()) {
        track.stop();
      }
      setMicrophonePermissionStatus("granted");
      emitEvent("mic_permission_result", {
        traceId,
        conversationId,
        result: "granted",
        captureStarted: false,
        rawAudioStored: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        externalSendPerformed: false,
      });
    } catch {
      setMicrophonePermissionStatus("denied");
      emitEvent("mic_permission_result", {
        traceId,
        conversationId,
        result: "denied",
        captureStarted: false,
        rawAudioStored: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        externalSendPerformed: false,
      });
    }
  }

  function runLocalVadSample() {
    const traceId = newTraceId();
    const segments = detectVoiceSegments(localVadSampleFrames, {
      thresholdRms: 0.05,
      hangoverMs: 80,
      minSpeechMs: 80,
    });
    setVadSampleSegments(segments);
    for (const segment of segments) {
      emitEvent("voice_segment_detected", {
        traceId,
        conversationId,
        startMs: segment.startMs,
        endMs: segment.endMs,
        peakRms: segment.peakRms,
        frameCount: segment.frameCount,
        localSampleOnly: true,
        captureStarted: false,
        rawAudioStored: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        externalSendPerformed: false,
      });
    }
  }

  function runLocalSttSample() {
    const traceId = newTraceId();
    const result = transcribeLocalSpeechSample(localSttSample);
    setSttSampleResult(result);
    emitEvent("stt_completed", {
      traceId,
      conversationId,
      model: result.model,
      latencyMs: result.latencyMs,
      localSampleOnly: result.localSampleOnly,
      captureStarted: false,
      rawAudioStored: result.rawAudioStored,
      approvalCaptured: false,
      memoryWritePerformed: false,
      externalSendPerformed: false,
    });
  }

  function runLocalTtsSample() {
    const traceId = newTraceId();
    const result = synthesizeLocalSpeechSample(localTtsSample);
    setTtsSampleResult(result);
    emitEvent("tts_started", {
      traceId,
      conversationId,
      voiceId: result.voiceId,
      chars: result.chars,
      localSampleOnly: result.localSampleOnly,
      audioPlaybackStarted: result.audioPlaybackStarted,
      rawAudioStored: result.rawAudioStored,
      approvalCaptured: false,
      memoryWritePerformed: false,
      externalSendPerformed: false,
    });
    emitEvent("tts_completed", {
      traceId,
      conversationId,
      latencyMs: result.latencyMs,
      durationMs: result.durationMs,
      localSampleOnly: result.localSampleOnly,
      audioPlaybackStarted: result.audioPlaybackStarted,
      rawAudioStored: result.rawAudioStored,
      approvalCaptured: false,
      memoryWritePerformed: false,
      externalSendPerformed: false,
    });
  }

  function runLocalVoiceTurnRehearsal() {
    const traceId = newTraceId();
    const result = rehearseLocalVoiceTurnSample();
    setVoiceTurnRehearsalResult(result);
    emitEvent("voice_turn_rehearsed", {
      traceId,
      conversationId,
      localRehearsalOnly: result.localRehearsalOnly,
      vadSegmentCount: result.vad.segments.length,
      sttModel: result.stt.model,
      ttsVoiceId: result.tts.voiceId,
      liveNapoleonContacted: result.liveNapoleonContacted,
      microphoneCaptureStarted: result.microphoneCaptureStarted,
      audioPlaybackStarted: result.audioPlaybackStarted,
      rawAudioStored: result.rawAudioStored,
      memoryWritePerformed: result.memoryWritePerformed,
      approvalCaptured: result.approvalCaptured,
      externalSendPerformed: result.externalSendPerformed,
      blockedEffects: result.blockedEffects,
    });
  }

  function runLocalBargeInRehearsal() {
    const traceId = newTraceId();
    const result = rehearseLocalBargeInSample();
    setBargeInRehearsalResult(result);
    emitEvent("barge_in_rehearsed", {
      traceId,
      conversationId,
      localRehearsalOnly: result.localRehearsalOnly,
      bargeInDetected: result.bargeInDetected,
      interruptedOutput: result.interruptedOutput,
      interruptAtMs: result.interruptAtMs,
      nextTurnPrepared: result.nextTurnPrepared,
      audioPlaybackStarted: result.audioPlaybackStarted,
      microphoneCaptureStarted: result.microphoneCaptureStarted,
      rawAudioStored: result.rawAudioStored,
      liveNapoleonContacted: result.liveNapoleonContacted,
      memoryWritePerformed: result.memoryWritePerformed,
      approvalCaptured: result.approvalCaptured,
      externalSendPerformed: result.externalSendPerformed,
      blockedEffects: result.blockedEffects,
    });
  }

  function runLocalVoiceResponseShaping() {
    const traceId = newTraceId();
    const result = shapeVoiceResponseForSpeech({
      ...localVoiceResponseShapeSample,
      profileMode: profile,
    });
    setVoiceResponseShapeResult(result);
    emitEvent("voice_response_shaped", {
      traceId,
      conversationId,
      localPreparationOnly: result.localPreparationOnly,
      wasShortened: result.wasShortened,
      originalChars: result.originalChars,
      spokenChars: result.spokenChars,
      maxSpokenCharsApplied: result.maxSpokenCharsApplied,
      profileMode: result.profileMode,
      childProtected: result.childProtected,
      pacing: result.pacing,
      requiresGuardianReviewReminder: result.requiresGuardianReviewReminder,
      bridgeProvidedProvenance: localVoiceResponseShapeSample.bridgeProvidedProvenance,
      audioPlaybackStarted: result.audioPlaybackStarted,
      microphoneCaptureStarted: result.microphoneCaptureStarted,
      rawAudioStored: result.rawAudioStored,
      liveNapoleonContacted: result.liveNapoleonContacted,
      memoryWritePerformed: result.memoryWritePerformed,
      approvalCaptured: result.approvalCaptured,
      externalSendPerformed: result.externalSendPerformed,
      blockedEffects: result.blockedEffects,
    });
  }

  function runLocalNeutralAvatarState() {
    const traceId = newTraceId();
    const result = buildLocalNeutralAvatarState(localNeutralAvatarStateSample);
    setNeutralAvatarStateResult(result);
    emitEvent("avatar_state_changed", {
      traceId,
      conversationId,
      localDisplayOnly: result.localDisplayOnly,
      avatarState: result.avatarState,
      expression: result.expression,
      gazeTarget: result.gazeTarget,
      stance: result.stance,
      bridgeProvidedProvenance: localNeutralAvatarStateSample.bridgeProvidedProvenance,
      cameraCaptureStarted: result.cameraCaptureStarted,
      faceDetectionStarted: result.faceDetectionStarted,
      affectInferred: result.affectInferred,
      avatarAnimationStarted: result.avatarAnimationStarted,
      liveNapoleonContacted: result.liveNapoleonContacted,
      memoryWritePerformed: result.memoryWritePerformed,
      approvalCaptured: result.approvalCaptured,
      externalSendPerformed: result.externalSendPerformed,
      blockedEffects: result.blockedEffects,
    });
  }

  async function discoverDescriptor(endpointOverride?: string) {
    const selectedEndpoint = endpointOverride?.trim() || endpoint.trim();
    try {
      const result = await discoverNapoleonDescriptor({
        getEndpoint: () => selectedEndpoint || null,
        getAuthToken: () => authToken.trim() || null,
      });
      setLiveDescriptorInput(result.input);
      setDescriptorMode("live");
      setDescriptorDiscoveryMessage(result.connection.message);
      emitEvent("descriptor_discovery_completed", {
        traceId: newTraceId(),
        conversationId,
        state: result.connection.state,
        checksumState: result.connection.checksumState,
        signatureState: result.connection.signatureState,
        canAttemptLiveBridge: result.connection.canAttemptLiveBridge,
      });
    } catch (error) {
      const failedInput = { endpointConfigured: Boolean(selectedEndpoint), descriptor: null };
      const failedConnection = buildDescriptorConnectionState(failedInput);
      setLiveDescriptorInput(failedInput);
      setDescriptorMode("live");
      setDescriptorDiscoveryMessage("Descriptor discovery failed closed. Concierge will not attempt live bridge calls.");
      emitEvent("descriptor_discovery_failed", {
        traceId: newTraceId(),
        conversationId,
        state: failedConnection.state,
        error: String(error),
      });
    }
  }

  function useLocalHarnessEndpoint() {
    const preset = buildLocalHarnessEndpointPreset();
    updateEndpoint(preset.endpoint);
    updateAuthToken("");
    setRehearsalMode(preset.rehearsalMode);
    setPendingRehearsal(null);
    setBridgeEvidenceReadiness(buildBridgeEvidenceReadinessState());
    clearBridgeReadinessProof();
    void discoverDescriptor(preset.endpoint);
  }

  function updateProfile(value: LocalProfile) {
    setProfile(value);
    setPendingRehearsal(null);
    clearBridgeReadinessProof();
  }

  function updateInput(value: string) {
    setInput(value);
    setPendingRehearsal(null);
  }

  function rehearse() {
    const content = input.trim();
    if (!content) return;

    const traceId = newTraceId();
    const turnId = `turn_${Date.now().toString(16)}`;
    const capabilityAnswer = answerCapabilityQuestion(content, capabilityLedger, capabilityTaxonomy);
    if (capabilityAnswer) {
      emitEvent("capability_intelligence_answered", {
        traceId,
        conversationId,
        turnId,
        profile,
        kind: capabilityAnswer.kind,
        evidenceCount: capabilityAnswer.evidenceCount,
      });
      setMessages((m) => [
        ...m,
        { role: "user", content },
        { role: "assistant", content: formatCapabilityAnswer(capabilityAnswer) },
      ]);
      setInput("");
      setPendingRehearsal(null);
      setLastDecision(null);
      clearNapoleonPresentation();
      setLastBridgeFailure(null);
      setLastReview(null);
      setLastMemoryReviewState(null);
      setLastMemoryReview(null);
      setMemorySubmission(null);
      setMemorySubmissionFailure(null);
      return;
    }
    const contract = buildTextTurnContract({
      message: content,
      profile,
      conversationId,
      turnId,
      traceId,
    });
    const preview = buildRehearsalPreview(contract, content);
    const summary = summarizeRehearsalPreview(preview);
    const review = describeGovernanceReview(preview.governanceReview);
    const memoryReviewState = preview.memoryProposal;
    const memoryReview = memoryReviewState.status === "none" ? null : describeMemoryProposalReview(memoryReviewState);

    emitEvent("rehearsal_preview_created", {
      traceId,
      conversationId,
      turnId,
      profile,
      requestId: preview.chiefOfStaffReviewPacket.requestId,
    });
    refreshCapabilityLedgerStatus();
    if (preview.governanceReview.status === "review_needed") {
      emitEvent("governance_review_required", {
        traceId,
        conversationId,
        turnId,
        profile,
        outcome: preview.governanceReview.outcome,
        decisionId: preview.governanceReview.decisionId,
      });
      refreshCapabilityLedgerStatus();
    }
    if (memoryReview) {
      emitEvent("memory_proposal_review_created", {
        traceId,
        conversationId,
        turnId,
        proposalId: memoryReviewState.proposalId,
        memoryWritePerformed: memoryReviewState.memoryWritePerformed,
        approvalCaptured: memoryReviewState.approvalCaptured,
      });
      refreshCapabilityLedgerStatus();
    }
    setPendingRehearsal({ content, traceId, turnId, preview, summary, review, memoryReviewState, memoryReview });
    setLastDecision(null);
    clearNapoleonPresentation();
    setLastBridgeFailure(null);
    setLastReview(null);
    setLastMemoryReviewState(null);
    setLastMemoryReview(null);
    setMemorySubmission(null);
    setMemorySubmissionFailure(null);
  }

  async function submit(rehearsal: PendingRehearsal | null = null) {
    const content = rehearsal?.content ?? input.trim();
    if (!content) return;

    if (!rehearsal) {
      const traceId = newTraceId();
      const turnId = `turn_${Date.now().toString(16)}`;
      const capabilityAnswer = answerCapabilityQuestion(content, capabilityLedger, capabilityTaxonomy);
      if (capabilityAnswer) {
        emitEvent("capability_intelligence_answered", {
          traceId,
          conversationId,
          turnId,
          profile,
          kind: capabilityAnswer.kind,
          evidenceCount: capabilityAnswer.evidenceCount,
        });
        setMessages((m) => [
          ...m,
          { role: "user", content },
          { role: "assistant", content: formatCapabilityAnswer(capabilityAnswer) },
        ]);
        setInput("");
        setPendingRehearsal(null);
        setLastDecision(null);
        clearNapoleonPresentation();
        setLastBridgeFailure(null);
        setLastReview(null);
        setLastMemoryReviewState(null);
        setLastMemoryReview(null);
        setMemorySubmission(null);
        setMemorySubmissionFailure(null);
        return;
      }
    }

    if (rehearsal && !rehearsal.preview.governanceReview.canSendAdvisory) {
      emitEvent("governance_review_blocked", {
        traceId: rehearsal.traceId,
        conversationId,
        turnId: rehearsal.turnId,
        profile,
        outcome: rehearsal.preview.governanceReview.outcome,
        decisionId: rehearsal.preview.governanceReview.decisionId,
      });
      refreshCapabilityLedgerStatus();
      setLastReview(rehearsal.review);
      clearNapoleonPresentation();
      setLastBridgeFailure(null);
      setMemorySubmission(null);
      setMemorySubmissionFailure(null);
      return;
    }

    const traceId = rehearsal?.traceId ?? newTraceId();
    const turnId = rehearsal?.turnId ?? `turn_${Date.now().toString(16)}`;
    if (!rehearsal) {
      const preflight = buildTextTurnContract({ message: content, profile, conversationId, turnId, traceId });
      const reviewState = buildGovernanceReviewState(preflight.governanceDecision, profile);
      if (!reviewState.canSendAdvisory) {
        const reviewView = describeGovernanceReview(reviewState);
        emitEvent("governance_review_blocked", {
          traceId,
          conversationId,
          turnId,
          outcome: reviewState.outcome,
          decisionId: reviewState.decisionId,
        });
        refreshCapabilityLedgerStatus();
        setLastReview(reviewView);
        clearNapoleonPresentation();
        setLastBridgeFailure(null);
        setLastDecision(
          describeGovernanceDecision({
            outcome: reviewState.outcome,
            decisionId: reviewState.decisionId,
            auditId: reviewState.auditId,
            blockedEffects: reviewState.blockedEffects,
          }),
        );
        return;
      }
    }

    emitEvent("user_message_received", { traceId, conversationId, turnId, channel: "text", profile });

    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");
    setPendingRehearsal(null);

    try {
      const response = await sendToNapoleon({
        traceId,
        conversationId,
        turnId,
        profile,
        channel: "text",
        message: content,
      }, {
        descriptorConnection: currentDescriptorInput(),
        captureEvidence: (record) => {
          setBridgeEvidenceReadiness((current) => updateBridgeEvidenceReadinessState(current, record));
        },
      });

      const decisionView = describeGovernanceDecision({
        outcome: response.governanceDecision.outcome,
        decisionId: response.governanceDecision.decision_id,
        auditId: response.auditEnvelope.audit_id,
        blockedEffects: response.governanceDecision.blocked_effects,
      });
      const memoryContract = buildTextTurnContract({
        message: content,
        profile,
        conversationId,
        turnId,
        traceId,
        governanceOutcome: response.governanceDecision.outcome,
      });
      const memoryReviewState = buildMemoryProposalReviewState(memoryContract, content);

      emitEvent("response_generated", {
        traceId,
        conversationId,
        turnId,
        responseType: "text",
        governanceOutcome: response.governanceDecision.outcome,
        auditId: response.auditEnvelope.audit_id,
      });
      refreshCapabilityLedgerStatus();
      setLastDecision(decisionView);
      setSuccessfulNapoleonPresentation(response);
      setLastBridgeFailure(null);
      const responseReviewState = buildGovernanceReviewState(response.governanceDecision, profile);
      setLastReview(describeGovernanceReview(responseReviewState));
      if (responseReviewState.status === "review_needed") {
        emitEvent("governance_review_required", {
          traceId,
          conversationId,
          turnId,
          profile,
          outcome: responseReviewState.outcome,
          decisionId: responseReviewState.decisionId,
        });
        refreshCapabilityLedgerStatus();
      }
      if (memoryReviewState.status === "none") {
        setLastMemoryReviewState(null);
        setLastMemoryReview(null);
        setMemorySubmission(null);
        setMemorySubmissionFailure(null);
      } else {
        setLastMemoryReviewState(memoryReviewState);
        setLastMemoryReview(describeMemoryProposalReview(memoryReviewState));
        setMemorySubmission(null);
        setMemorySubmissionFailure(null);
        emitEvent("memory_proposal_review_created", {
          traceId,
          conversationId,
          turnId,
          proposalId: memoryReviewState.proposalId,
          memoryWritePerformed: memoryReviewState.memoryWritePerformed,
          approvalCaptured: memoryReviewState.approvalCaptured,
        });
        refreshCapabilityLedgerStatus();
      }
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: response.text,
          metadata: {
            governanceOutcome: response.governanceDecision.outcome,
            decisionId: response.governanceDecision.decision_id,
            auditId: response.auditEnvelope.audit_id,
            profileMode: response.profileMode,
            blockedEffects: response.governanceDecision.blocked_effects,
          },
        },
      ]);
    } catch (error) {
      emitEvent("response_failed", { traceId, conversationId, turnId, error: String(error) });
      refreshCapabilityLedgerStatus();
      setLastBridgeFailure(describeBridgeFailure(error));
      clearNapoleonPresentation();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: describeBridgeFailureTranscriptMessage(error),
        },
      ]);
    }
  }

  function acknowledgePendingReview() {
    if (!pendingRehearsal || !pendingRehearsal.preview.governanceReview.canAcknowledge) return;
    const acknowledgedReview = buildGovernanceReviewState(
      {
        decision_id: pendingRehearsal.preview.traceAuditPreview.decisionId,
        request_id: pendingRehearsal.preview.traceAuditPreview.requestId,
        outcome: pendingRehearsal.preview.governanceReview.outcome,
        authority_tier: pendingRehearsal.preview.governanceReview.authorityTier,
        approval_requirement: pendingRehearsal.preview.governanceReview.approvalRequirement,
        rationale: pendingRehearsal.preview.governanceReview.rationale,
        blocked_effects: pendingRehearsal.preview.governanceReview.blockedEffects,
        trace_id: pendingRehearsal.preview.governanceReview.traceId,
        audit_id: pendingRehearsal.preview.traceAuditPreview.auditId,
      },
      profile,
      true,
    );
    const review = describeGovernanceReview(acknowledgedReview);
    setPendingRehearsal({ ...pendingRehearsal, review });
    emitEvent("governance_review_acknowledged_locally", {
      traceId: pendingRehearsal.traceId,
      conversationId,
      turnId: pendingRehearsal.turnId,
      decisionId: acknowledgedReview.decisionId,
      approvalCaptured: acknowledgedReview.approvalCaptured,
    });
    refreshCapabilityLedgerStatus();
  }

  function updatePendingMemoryReview(status: "acknowledged_locally" | "dismissed_locally") {
    if (!pendingRehearsal) return;
    const updated = transitionMemoryProposalReviewState(pendingRehearsal.memoryReviewState, status);
    const memoryReview = describeMemoryProposalReview(updated);
    setPendingRehearsal({ ...pendingRehearsal, memoryReviewState: updated, memoryReview });
    emitEvent(status === "acknowledged_locally" ? "memory_proposal_acknowledged_locally" : "memory_proposal_dismissed_locally", {
      traceId: pendingRehearsal.traceId,
      conversationId,
      turnId: pendingRehearsal.turnId,
      proposalId: updated.proposalId,
      memoryWritePerformed: updated.memoryWritePerformed,
      approvalCaptured: updated.approvalCaptured,
      localReview: updated.localReview,
    });
    refreshCapabilityLedgerStatus();
  }

  function acknowledgeLastReview() {
    if (!lastReview || !lastReview.canAcknowledge) return;
    setLastReview({
      ...lastReview,
      heading: "Review acknowledged locally",
      body:
        "This local acknowledgement is not Napoleon approval. It does not execute side effects, write memory, send externally, or dispatch agents.",
      actionLabel: "Acknowledged locally",
      canAcknowledge: false,
    });
  }

  function updateLastMemoryReview(status: "acknowledged_locally" | "dismissed_locally") {
    if (!lastMemoryReviewState) return;
    const updated = transitionMemoryProposalReviewState(lastMemoryReviewState, status);
    setLastMemoryReviewState(updated);
    setLastMemoryReview(describeMemoryProposalReview(updated));
    setMemorySubmission(null);
    setMemorySubmissionFailure(null);
    emitEvent(status === "acknowledged_locally" ? "memory_proposal_acknowledged_locally" : "memory_proposal_dismissed_locally", {
      traceId: updated.traceId,
      conversationId,
      proposalId: updated.proposalId,
      memoryWritePerformed: updated.memoryWritePerformed,
      approvalCaptured: updated.approvalCaptured,
      localReview: updated.localReview,
    });
    refreshCapabilityLedgerStatus();
  }

  async function submitLastMemoryProposal() {
    if (!lastMemoryReviewState) return;
    const traceId = newTraceId();
    try {
      const result = await submitMemoryProposalForReview(lastMemoryReviewState, {
        conversationId,
        traceId,
        descriptorConnection: currentDescriptorInput(),
      });
      setMemorySubmission(result);
      setMemorySubmissionFailure(null);
      refreshCapabilityLedgerStatus();
    } catch (error) {
      setMemorySubmissionFailure(describeGovernedHandoffFailure(error, "Memory proposal review handoff", "write memory"));
      setMemorySubmission(null);
      refreshCapabilityLedgerStatus();
    }
  }

  function clearCapabilityHistory() {
    const traceId = newTraceId();
    clearPersistedCapabilityLedger(browserStorage(), capabilityLedger, capabilityTaxonomy);
    setCapabilityExportJson(null);
    setCapabilityTaxonomy(createCapabilityTaxonomy());
    setSelectedTaxonomyLabel("");
    setTaxonomyRenameValue("");
    setTaxonomyMergeTarget("");
    refreshCapabilityLedgerStatus();
    emitEvent("capability_ledger_cleared", {
      traceId,
      conversationId,
      evidenceCount: 0,
      storage: "local_browser",
      approvalCaptured: false,
      memoryWritePerformed: false,
      externalSendPerformed: false,
    });
  }

  function exportCapabilityHistory() {
    const traceId = newTraceId();
    const json = exportCapabilityLedgerJson(capabilityLedger, capabilityTaxonomy);
    setCapabilityExportJson(json);
    emitEvent("capability_ledger_exported", {
      traceId,
      conversationId,
      evidenceCount: capabilityLedger.listRecent().length,
      storage: "local_browser",
      approvalCaptured: false,
      memoryWritePerformed: false,
      externalSendPerformed: false,
    });
  }

  function exportBridgeReadinessProof() {
    const traceId = newTraceId();
    const json = exportBridgeReadinessProofJson({
      descriptorConnection,
      readiness: bridgeEvidenceReadiness,
    });
    const comparison = compareBridgeReadinessProofs(bridgeReadinessProofJson, json);
    setBridgeReadinessProofJson(json);
    setBridgeReadinessProofComparison(comparison);
    emitEvent("bridge_readiness_proof_exported", {
      traceId,
      conversationId,
      descriptorState: descriptorConnection.state,
      checksumState: descriptorConnection.checksumState,
      signatureState: descriptorConnection.signatureState,
      evidenceCaptureState: bridgeEvidenceReadiness.captureState,
      evidenceComparisonState: bridgeEvidenceReadiness.comparisonState,
      proofComparisonStatus: comparison.status,
      proofComparisonChangeCount: comparison.changes.length,
      lastEvidenceStatus: bridgeEvidenceReadiness.lastEvidenceStatus ?? "not_run",
      lastFailureReason: bridgeEvidenceReadiness.lastFailureReason ?? "none",
      approvalCaptured: false,
      memoryWritePerformed: false,
      externalSendPerformed: false,
    });
  }

  function exportNapoleonProof() {
    const traceId = newTraceId();
    const json = exportNapoleonResponseProofJson(lastNapoleonPresentation, {
      conversationId,
    });
    const comparison = compareNapoleonResponseProofs(napoleonProofExportJson, json);
    setNapoleonProofExportJson(json);
    setNapoleonProofComparison(comparison);
    const proof = lastNapoleonPresentation.proof;
    emitEvent("napoleon_response_proof_exported", {
      traceId,
      conversationId,
      status: proof?.status ?? "not_available",
      governance: proof?.details.find((detail) => detail.label === "Governance")?.value ?? "unavailable",
      responseTraceId: proof?.details.find((detail) => detail.label === "Trace")?.value ?? "unavailable",
      responseAuditId: proof?.details.find((detail) => detail.label === "Audit")?.value ?? "unavailable",
      proofComparisonStatus: comparison.status,
      proofComparisonChangeCount: comparison.changes.length,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
    });
  }

  function createSteeringDraft() {
    const traceId = newTraceId();
    const draft = draftChiefOfStaffSteering(capabilityLedger, {
      conversationId,
      traceId,
      endpointConfigured: Boolean(endpoint.trim()),
    });
    setSteeringDraft(draft);
    setSteeringSubmission(null);
    setSteeringFailure(null);
    emitEvent("capability_recommendation_created", {
      traceId,
      conversationId,
      capability: draft.recommendation.capabilityLabel,
      architectureArea: draft.recommendation.architectureArea,
      evidenceCount: draft.recommendation.evidenceCount,
      proposalOnly: draft.boundary.proposalOnly,
      approvalCaptured: draft.boundary.approvalCaptured,
      memoryWriteAllowed: draft.boundary.memoryWriteAllowed,
      agentDispatchAllowed: draft.boundary.agentDispatchAllowed,
      externalSendAllowed: draft.boundary.externalSendAllowed,
      canSendToNapoleon: draft.sendState.canSendToNapoleon,
    });
    refreshCapabilityLedgerStatus();
  }

  async function submitSteeringDraft() {
    if (!steeringDraft) return;
    const traceId = newTraceId();
    try {
      const result = await submitChiefOfStaffSteeringDraft(steeringDraft, {
        conversationId,
        traceId,
        profile,
        descriptorConnection: currentDescriptorInput(),
      });
      setSteeringSubmission(result);
      setSteeringFailure(null);
      refreshCapabilityLedgerStatus();
    } catch (error) {
      setSteeringFailure(describeGovernedHandoffFailure(error, "Chief of Staff steering handoff", "apply changes"));
      setSteeringSubmission(null);
      refreshCapabilityLedgerStatus();
    }
  }

  function renameSelectedTaxonomyLabel() {
    const selected = taxonomySelection();
    if (!selected || !taxonomyRenameValue.trim()) return;
    updateCapabilityTaxonomy(
      (taxonomy) => renameTaxonomyLabel(taxonomy, selected.dimension, selected.label, taxonomyRenameValue),
      "capability_taxonomy_label_renamed",
      { dimension: selected.dimension, sourceLabel: selected.label, displayLabel: taxonomyRenameValue.trim() },
    );
    setTaxonomyRenameValue("");
  }

  function mergeSelectedTaxonomyLabel() {
    const selected = taxonomySelection();
    const target = taxonomySelection(taxonomyMergeTarget);
    if (!selected || !target || selected.dimension !== target.dimension || selected.label === target.label) return;
    updateCapabilityTaxonomy(
      (taxonomy) => mergeTaxonomyLabels(taxonomy, selected.dimension, selected.label, target.label),
      "capability_taxonomy_labels_merged",
      { dimension: selected.dimension, sourceLabel: selected.label, targetLabel: target.label },
    );
  }

  function markSelectedTaxonomyLabel(marker: "deprecated" | "splitCandidate", value: boolean) {
    const selected = taxonomySelection();
    if (!selected) return;
    updateCapabilityTaxonomy(
      (taxonomy) => markTaxonomyLabel(taxonomy, selected.dimension, selected.label, marker, value),
      "capability_taxonomy_label_marked",
      { dimension: selected.dimension, sourceLabel: selected.label, marker, value },
    );
  }

  function resetTaxonomyEdits() {
    updateCapabilityTaxonomy(
      (taxonomy) => resetCapabilityTaxonomy(taxonomy),
      "capability_taxonomy_reset",
      { reset: true },
    );
    setSelectedTaxonomyLabel("");
    setTaxonomyRenameValue("");
    setTaxonomyMergeTarget("");
  }

  function createTaxonomyReviewDraft() {
    const traceId = newTraceId();
    const draft = draftChiefOfStaffTaxonomyReview(capabilityLedger.listRecent(), capabilityTaxonomy, {
      conversationId,
      traceId,
    });
    setTaxonomyReviewDraft(draft);
    setTaxonomyReviewSubmission(null);
    setTaxonomyReviewFailure(null);
    emitEvent("capability_taxonomy_review_drafted", {
      traceId,
      conversationId,
      recommendationCount: draft.recommendations.length,
      evaluatorCaseId: draft.evaluatorCaseCandidate.caseId,
      proposalId: draft.evolutionProposal.proposal_id,
      proposalOnly: draft.boundary.proposalOnly,
      approvalCaptured: draft.boundary.approvalCaptured,
      memoryWriteAllowed: draft.boundary.memoryWriteAllowed,
      agentDispatchAllowed: draft.boundary.agentDispatchAllowed,
      externalSendAllowed: draft.boundary.externalSendAllowed,
    });
  }

  async function submitTaxonomyReviewDraft() {
    if (!taxonomyReviewDraft) return;
    const traceId = newTraceId();
    try {
      const result = await submitChiefOfStaffTaxonomyReviewDraft(taxonomyReviewDraft, {
        conversationId,
        traceId,
        profile,
        descriptorConnection: currentDescriptorInput(),
      });
      setTaxonomyReviewSubmission(result);
      setTaxonomyReviewFailure(null);
      refreshCapabilityLedgerStatus();
    } catch (error) {
      setTaxonomyReviewFailure(
        describeGovernedHandoffFailure(error, "Chief of Staff taxonomy review handoff", "apply taxonomy edits"),
      );
      setTaxonomyReviewSubmission(null);
      refreshCapabilityLedgerStatus();
    }
  }

  const canSendRehearsal = Boolean(
    pendingRehearsal &&
      input.trim() === pendingRehearsal.content &&
      pendingRehearsal.preview.governanceReview.canSendAdvisory,
  );
  const taxonomyCounts = getTaxonomyLabelCounts(capabilityLedger.listRecent(), capabilityTaxonomy);
  const taxonomyRows = (Object.keys(taxonomyCounts) as TaxonomyDimension[]).flatMap((dimension) =>
    taxonomyCounts[dimension].map((row) => ({ ...row, value: `${dimension}:${row.label}` })),
  );
  const selectedTaxonomyRow = taxonomyRows.find((row) => row.value === selectedTaxonomyLabel);
  const liveBridgeReadiness = describeLiveBridgeReadiness({
    descriptorConnection,
    evidenceCaptureState: bridgeEvidenceReadiness.captureState,
    evidenceComparisonState: bridgeEvidenceReadiness.comparisonState,
    lastEvidenceStatus: bridgeEvidenceReadiness.lastEvidenceStatus,
    lastFailureReason: bridgeEvidenceReadiness.lastFailureReason,
  });
  const currentInput = input.trim();
  const currentContract = currentInput
    ? buildTextTurnContract({ message: currentInput, profile, conversationId, turnId: "turn_preflight", traceId: "trace_preflight" })
    : null;
  const liveSendPreflight = describeLiveSendPreflight({
    descriptorConnection,
    inputReady: Boolean(currentInput),
    governanceCanSendAdvisory: currentContract
      ? buildGovernanceReviewState(currentContract.governanceDecision, profile).canSendAdvisory
      : true,
    rehearsalMode,
  });
  const governedOperationSummaries = [
    describeBridgeOperationSummary("chief_of_staff_descriptor"),
    describeBridgeOperationSummary("text_turn"),
    describeBridgeOperationSummary("memory_proposal_review"),
    describeBridgeOperationSummary("chief_of_staff_steering"),
  ];
  const microphonePermissionLabel =
    microphonePermissionStatus === "not_requested"
      ? "Permission not requested"
      : microphonePermissionStatus === "granted"
        ? "Permission granted"
        : microphonePermissionStatus === "unavailable"
          ? "Permission unavailable"
          : "Permission denied";
  const cameraPermissionLabel =
    cameraPermissionStatus === "not_requested"
      ? "Permission not requested"
      : cameraPermissionStatus === "granted"
        ? "Permission granted"
        : cameraPermissionStatus === "unavailable"
          ? "Permission unavailable"
          : "Permission denied";
  const voiceCaptureSummary = !microphoneEnabled
    ? "Voice capture blocked: microphone setting is off and OS permission is not granted."
    : microphonePermissionStatus !== "granted"
      ? "Voice capture blocked: OS microphone permission is not granted."
      : "Voice capture ready but stopped; voice mode is not active.";
  const vadSampleSummary =
    vadSampleSegments === null
      ? "VAD sample not run"
      : `Detected ${vadSampleSegments.length} local sample voice segments.`;
  const sttSampleSummary = sttSampleResult === null ? "STT sample not run" : sttSampleResult.transcript;
  const ttsSampleSummary =
    ttsSampleResult === null
      ? "TTS sample not run"
      : `Prepared ${ttsSampleResult.chars} characters for local sample speech.`;
  const voiceTurnRehearsalSummary =
    voiceTurnRehearsalResult === null
      ? "Voice rehearsal not run"
      : `VAD: ${voiceTurnRehearsalResult.vad.segments.length} segments`;
  const bargeInRehearsalSummary =
    bargeInRehearsalResult === null
      ? "Barge-in rehearsal not run"
      : `Barge-in detected: ${bargeInRehearsalResult.bargeInDetected ? "yes" : "no"}`;
  const voiceResponseShapeSummary =
    voiceResponseShapeResult === null
      ? "Voice response not shaped"
      : `Shortened for speech: ${voiceResponseShapeResult.wasShortened ? "yes" : "no"}`;
  const neutralAvatarStateSummary =
    neutralAvatarStateResult === null
      ? "Avatar state not prepared"
      : `Avatar state: ${neutralAvatarStateResult.avatarState}`;
  const cameraCaptureSummary = !cameraEnabled
    ? "Camera capture blocked: camera setting is off and OS permission is not granted."
    : cameraPermissionStatus !== "granted"
      ? "Camera capture blocked: OS camera permission is not granted."
      : "Camera capture ready but stopped; avatar/camera mode is not active.";

  return (
    <main className="shell">
      <header>
        <h1>Concierge</h1>
        <p>Text mode. Chief of Staff contracts are enforced as prepare-only boundaries.</p>
      </header>

      <section className="settings">
        <label>
          User profile
          <select value={profile} onChange={(e) => updateProfile(e.target.value as LocalProfile)}>
            <option value="adult_owner">Adult owner</option>
            <option value="child_protected">Child protected</option>
            <option value="guest">Guest</option>
            <option value="collaborator">Collaborator</option>
          </select>
        </label>
        <label>
          Napoleon endpoint
          <input
            value={endpoint}
            onChange={(e) => updateEndpoint(e.target.value)}
            placeholder="Optional live endpoint"
          />
        </label>
        <label>
          Bridge token
          <input
            type="password"
            value={authToken}
            onChange={(e) => updateAuthToken(e.target.value)}
            placeholder="Optional bearer token"
          />
        </label>
        <label>
          Descriptor
          <select
            value={descriptorMode}
            onChange={(e) => {
              setDescriptorMode(e.target.value as typeof descriptorMode);
              clearBridgeReadinessProof();
            }}
          >
            <option value="discovered">Discovered local descriptor</option>
            <option value="live">Live discovered descriptor</option>
            <option value="missing">Missing descriptor</option>
            <option value="checksum_mismatch">Checksum/signature mismatch</option>
          </select>
        </label>
        <button className="secondary" onClick={() => void discoverDescriptor()}>
          Discover descriptor
        </button>
        <button className="secondary" onClick={useLocalHarnessEndpoint}>
          Use local harness
        </button>
        <label>
          Rehearsal Mode
          <input
            type="checkbox"
            checked={rehearsalMode}
            onChange={(e) => {
              setRehearsalMode(e.target.checked);
              setPendingRehearsal(null);
            }}
          />
        </label>
        <label>
          Local telemetry
          <input
            type="checkbox"
            checked={telemetryEnabled}
            onChange={(e) => updatePrivacySetting("telemetry", e.target.checked)}
          />
        </label>
        <label>
          Camera
          <input
            type="checkbox"
            checked={cameraEnabled}
            onChange={(e) => updatePrivacySetting("camera", e.target.checked)}
          />
        </label>
        <label>
          Microphone
          <input
            type="checkbox"
            checked={microphoneEnabled}
            onChange={(e) => updatePrivacySetting("microphone", e.target.checked)}
          />
        </label>
        <span className="capture">
          Local telemetry {telemetryEnabled ? "on" : "off"}, camera {cameraEnabled ? "on" : "off"},
          microphone {microphoneEnabled ? "on" : "off"}
        </span>
      </section>

      <section className="contract-status" aria-label="Voice readiness">
        <div>
          <strong>Voice readiness</strong>
          <span>local preflight only</span>
        </div>
        <div>
          <strong>Microphone setting</strong>
          <span>{microphoneEnabled ? "Microphone setting on" : "Microphone setting off"}</span>
        </div>
        <div>
          <strong>OS permission</strong>
          <span>{microphonePermissionLabel}</span>
        </div>
        <div>
          <strong>Capture state</strong>
          <span>{voiceCaptureSummary}</span>
        </div>
        <button className="secondary" onClick={() => void requestMicrophonePermission()}>
          Request microphone permission
        </button>
      </section>

      <section className="contract-status" aria-label="Voice activity detection">
        <div>
          <strong>Voice activity detection</strong>
          <span>local sample only</span>
        </div>
        <div>
          <strong>Sample state</strong>
          <span>{vadSampleSummary}</span>
        </div>
        <div>
          <strong>Capture state</strong>
          <span>Microphone capture stopped; local sample only.</span>
        </div>
        {vadSampleSegments?.map((segment) => (
          <div key={`${segment.startMs}-${segment.endMs}`}>
            <strong>Segment</strong>
            <span>
              {segment.startMs}-{segment.endMs} ms, peak {segment.peakRms.toFixed(2)}
            </span>
          </div>
        ))}
        <div>
          <strong>Storage</strong>
          <span>Raw audio stored: no</span>
        </div>
        <button className="secondary" onClick={runLocalVadSample}>
          Run local VAD sample
        </button>
      </section>

      <section className="contract-status" aria-label="Speech transcription">
        <div>
          <strong>Speech transcription</strong>
          <span>local sample only</span>
        </div>
        <div>
          <strong>Sample state</strong>
          <span>{sttSampleSummary}</span>
        </div>
        <div>
          <strong>Capture state</strong>
          <span>Microphone capture stopped; local sample only.</span>
        </div>
        {sttSampleResult ? (
          <div>
            <strong>Model</strong>
            <span>Model: {sttSampleResult.model}</span>
          </div>
        ) : null}
        <div>
          <strong>Storage</strong>
          <span>Raw audio stored: no</span>
        </div>
        <button className="secondary" onClick={runLocalSttSample}>
          Run local STT sample
        </button>
      </section>

      <section className="contract-status" aria-label="Text to speech">
        <div>
          <strong>Text to speech</strong>
          <span>local sample only</span>
        </div>
        <div>
          <strong>Sample state</strong>
          <span>{ttsSampleSummary}</span>
        </div>
        <div>
          <strong>Playback state</strong>
          <span>Audio playback stopped; local sample only.</span>
        </div>
        {ttsSampleResult ? (
          <>
            <div>
              <strong>Voice</strong>
              <span>Voice: {ttsSampleResult.voiceId}</span>
            </div>
            <div>
              <strong>Playback</strong>
              <span>Audio playback started: no</span>
            </div>
          </>
        ) : null}
        <div>
          <strong>Storage</strong>
          <span>Raw audio stored: no</span>
        </div>
        <button className="secondary" onClick={runLocalTtsSample}>
          Run local TTS sample
        </button>
      </section>

      <section className="contract-status" aria-label="Voice turn rehearsal">
        <div>
          <strong>Voice turn rehearsal</strong>
          <span>local dry run only</span>
        </div>
        <div>
          <strong>Sample state</strong>
          <span>{voiceTurnRehearsalSummary}</span>
        </div>
        <div>
          <strong>Napoleon contact</strong>
          <span>Napoleon contact: no</span>
        </div>
        {voiceTurnRehearsalResult ? (
          <>
            <div>
              <strong>Transcript</strong>
              <span>STT: {voiceTurnRehearsalResult.stt.transcript}</span>
            </div>
            <div>
              <strong>Text boundary</strong>
              <span>Text boundary: {voiceTurnRehearsalResult.textBoundary.authorityBoundary}</span>
            </div>
            <div>
              <strong>Speech output</strong>
              <span>TTS: {voiceTurnRehearsalResult.tts.voiceId} prepared without playback.</span>
            </div>
            <div>
              <strong>Blocked effects</strong>
              <span>Blocked effects: {voiceTurnRehearsalResult.blockedEffects.join(", ")}</span>
            </div>
          </>
        ) : null}
        <button className="secondary" onClick={runLocalVoiceTurnRehearsal}>
          Run local voice rehearsal
        </button>
      </section>

      <section className="contract-status" aria-label="Barge-in rehearsal">
        <div>
          <strong>Barge-in rehearsal</strong>
          <span>local dry run only</span>
        </div>
        <div>
          <strong>Sample state</strong>
          <span>{bargeInRehearsalSummary}</span>
        </div>
        <div>
          <strong>Playback state</strong>
          <span>Playback state: stopped</span>
        </div>
        {bargeInRehearsalResult ? (
          <>
            <div>
              <strong>Interrupted output</strong>
              <span>
                Interrupted output: {bargeInRehearsalResult.interruptedOutput} at{" "}
                {bargeInRehearsalResult.interruptAtMs} ms
              </span>
            </div>
            <div>
              <strong>Next turn</strong>
              <span>Next turn prepared: {bargeInRehearsalResult.nextTurnPrepared ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Napoleon contact</strong>
              <span>Napoleon contact: no</span>
            </div>
            <div>
              <strong>Blocked effects</strong>
              <span>Blocked effects: {bargeInRehearsalResult.blockedEffects.join(", ")}</span>
            </div>
          </>
        ) : null}
        <button className="secondary" onClick={runLocalBargeInRehearsal}>
          Run local barge-in rehearsal
        </button>
      </section>

      <section className="contract-status" aria-label="Voice response shaping">
        <div>
          <strong>Voice response shaping</strong>
          <span>local preparation only</span>
        </div>
        <div>
          <strong>Sample state</strong>
          <span>{voiceResponseShapeSummary}</span>
        </div>
        <div>
          <strong>Playback state</strong>
          <span>Audio playback state: stopped</span>
        </div>
        {voiceResponseShapeResult ? (
          <>
            <div>
              <strong>Profile</strong>
              <span>Profile: {voiceResponseShapeResult.childProtected ? "child protected" : voiceResponseShapeResult.profileMode}</span>
            </div>
            <div>
              <strong>Pacing</strong>
              <span>Pacing: {voiceResponseShapeResult.pacing}</span>
            </div>
            <div>
              <strong>Guardian review</strong>
              <span>Guardian review reminder: {voiceResponseShapeResult.requiresGuardianReviewReminder ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Spoken summary</strong>
              <span>Spoken summary: {voiceResponseShapeResult.spokenText}</span>
            </div>
            <div>
              <strong>Authority boundary</strong>
              <span>Authority boundary: {voiceResponseShapeResult.authorityBoundary}</span>
            </div>
            <div>
              <strong>Playback</strong>
              <span>Audio playback started: no</span>
            </div>
            <div>
              <strong>Blocked effects</strong>
              <span>Blocked effects: {voiceResponseShapeResult.blockedEffects.join(", ")}</span>
            </div>
          </>
        ) : null}
        <button className="secondary" onClick={runLocalVoiceResponseShaping}>
          Shape sample response for voice
        </button>
      </section>

      <section className="contract-status" aria-label="Avatar state">
        <div>
          <strong>Avatar state</strong>
          <span>local display only</span>
        </div>
        <div>
          <strong>Sample state</strong>
          <span>{neutralAvatarStateSummary}</span>
        </div>
        <div>
          <strong>Camera capture</strong>
          <span>Camera capture: stopped</span>
        </div>
        {neutralAvatarStateResult ? (
          <>
            <div>
              <strong>Expression</strong>
              <span>Expression: {neutralAvatarStateResult.expression}</span>
            </div>
            <div>
              <strong>Stance</strong>
              <span>Stance: {neutralAvatarStateResult.stance}</span>
            </div>
            <div>
              <strong>Provenance</strong>
              <span>Provenance: {neutralAvatarStateResult.provenanceLabel}</span>
            </div>
            <div>
              <strong>Authority boundary</strong>
              <span>Authority boundary: {neutralAvatarStateResult.authorityBoundary}</span>
            </div>
            <div>
              <strong>Face detection</strong>
              <span>Face detection started: no</span>
            </div>
            <div>
              <strong>Affect</strong>
              <span>Affect inferred: no</span>
            </div>
            <div>
              <strong>Blocked effects</strong>
              <span>Blocked effects: {neutralAvatarStateResult.blockedEffects.join(", ")}</span>
            </div>
          </>
        ) : null}
        <button className="secondary" onClick={runLocalNeutralAvatarState}>
          Prepare neutral avatar state
        </button>
      </section>

      <section className="contract-status" aria-label="Camera readiness">
        <div>
          <strong>Camera readiness</strong>
          <span>local preflight only</span>
        </div>
        <div>
          <strong>Camera setting</strong>
          <span>{cameraEnabled ? "Camera setting on" : "Camera setting off"}</span>
        </div>
        <div>
          <strong>OS permission</strong>
          <span>{cameraPermissionLabel}</span>
        </div>
        <div>
          <strong>Capture state</strong>
          <span>{cameraCaptureSummary}</span>
        </div>
        <button className="secondary" onClick={() => void requestCameraPermission()}>
          Request camera permission
        </button>
      </section>

      <section className="contract-status">
        <div>
          <strong>Chief of Staff</strong>
          <span>{descriptorStatus?.serviceId ?? "not discovered"}</span>
        </div>
        <div>
          <strong>Connection state</strong>
          <span>{descriptorConnection.state}</span>
        </div>
        <div>
          <strong>Descriptor validation</strong>
          <span>{descriptorStatus?.ready ? "valid, contract-only" : descriptorConnection.message}</span>
        </div>
        <div>
          <strong>Discovery source</strong>
          <span>
            {isLocalHarnessEndpoint(endpoint)
              ? descriptorMode === "live"
                ? descriptorDiscoveryMessage ?? "local harness selected"
                : "local harness preset"
              : descriptorMode === "live"
                ? descriptorDiscoveryMessage ?? "live descriptor selected"
                : "local simulation"}
          </span>
        </div>
        <div>
          <strong>Checksum</strong>
          <span>{descriptorConnection.checksumState}</span>
        </div>
        <div>
          <strong>Signature</strong>
          <span>{descriptorConnection.signatureState}</span>
        </div>
        <div>
          <strong>Runtime authority</strong>
          <span>{descriptorStatus?.runtimeAuthority ? "enabled" : "blocked"}</span>
        </div>
        <div>
          <strong>Cache policy</strong>
          <span>{descriptorStatus?.cachePolicy ?? "unavailable"}</span>
        </div>
      </section>

      <section className="bridge-operations">
        <div>
          <strong>Governed Napoleon routes</strong>
          <span>These are the contract paths Concierge can use; endpoint hosts and tokens stay out of this view.</span>
        </div>
        <dl>
          {governedOperationSummaries.map((operation) => (
            <div key={operation.id}>
              <dt>{operation.label}</dt>
              <dd>
                <span>{operation.path}</span>
                <span>{operation.requestKind}</span>
                <span>{operation.boundary}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={`bridge-readiness ${liveBridgeReadiness.status}`}>
        <div>
          <strong>{liveBridgeReadiness.heading}</strong>
          <span>{liveBridgeReadiness.summary}</span>
          <span>{liveBridgeReadiness.caveat}</span>
        </div>
        <dl>
          {liveBridgeReadiness.details.map((detail) => (
            <div key={detail.label}>
              <dt>{detail.label}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
          <div>
            <dt>Blocked effects</dt>
            <dd>{liveBridgeReadiness.blockedEffects.join(", ")}</dd>
          </div>
          {bridgeEvidenceReadiness.failureReason ? (
            <div>
              <dt>Evidence issue</dt>
              <dd>{bridgeEvidenceReadiness.failureReason}</dd>
            </div>
          ) : null}
        </dl>
        <button className="secondary" onClick={exportBridgeReadinessProof}>
          Export readiness proof
        </button>
        {bridgeReadinessProofComparison ? (
          <div className={`proof-comparison ${bridgeReadinessProofComparison.status}`}>
            <strong>Readiness proof comparison</strong>
            <span>{bridgeReadinessProofComparison.summary}</span>
            <span>Comparison uses local sanitized proof metadata only and is not Napoleon approval.</span>
            {bridgeReadinessProofComparison.changes.length > 0 ? (
              <dl>
                {bridgeReadinessProofComparison.changes.map((change) => (
                  <div key={change.label}>
                    <dt>{change.label}</dt>
                    <dd>
                      {change.previous} {"->"} {change.current}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        ) : null}
        {bridgeReadinessProofJson ? (
          <pre aria-label="Exported bridge readiness proof">{bridgeReadinessProofJson}</pre>
        ) : null}
      </section>

      <section className="capability-ledger-controls">
        <div>
          <strong>Capability ledger</strong>
          <span>
            {capabilitySignalCount} local metadata signals retained in this browser, max {CAPABILITY_LEDGER_MAX_SIGNALS},
            max age {CAPABILITY_LEDGER_MAX_AGE_DAYS} days.
          </span>
          <span>Export is local JSON only and does not grant permission to share externally.</span>
        </div>
        <div className="ledger-actions">
          <button className="secondary" onClick={exportCapabilityHistory}>
            Export local capability metadata
          </button>
          <button className="secondary" onClick={clearCapabilityHistory}>
            Clear local capability ledger
          </button>
          <button className="secondary" onClick={createSteeringDraft}>
            Draft Chief of Staff steering proposal
          </button>
        </div>
        {capabilityExportJson ? (
          <pre aria-label="Exported local capability metadata">{capabilityExportJson}</pre>
        ) : null}
      </section>

      {steeringDraft ? (
        <section className="steering-draft">
          <div>
            <strong>Chief of Staff steering draft</strong>
            <span>{steeringDraft.sendState.reason}</span>
          </div>
          <dl>
            <dt>Recommendation</dt>
            <dd>
              {steeringDraft.recommendation.capabilityLabel}, {steeringDraft.recommendation.architectureArea},{" "}
              confidence {steeringDraft.recommendation.confidence}
            </dd>
            <dt>Rationale</dt>
            <dd>{steeringDraft.recommendation.rationale}</dd>
            <dt>Evaluator case</dt>
            <dd>
              {steeringDraft.evaluatorCaseCandidate.caseId}: {steeringDraft.evaluatorCaseCandidate.expectedBehavior}
            </dd>
            <dt>Evolution proposal</dt>
            <dd>
              {steeringDraft.evolutionProposal.proposal_id}, risk {steeringDraft.evolutionProposal.risk_level},{" "}
              approval required: {steeringDraft.evolutionProposal.approval_required}
            </dd>
            <dt>Boundary</dt>
            <dd>
              proposal only; no approval captured; no memory write; no agent dispatch; no external send.
            </dd>
          </dl>
          <section className={`send-preflight ${steeringHandoffReadiness.status}`}>
            <div>
              <strong>{steeringHandoffReadiness.heading}</strong>
              <span>{steeringHandoffReadiness.summary}</span>
              <span>{steeringHandoffReadiness.caveat}</span>
            </div>
            <dl>
              {steeringHandoffReadiness.items.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>
                    {item.status}: {item.detail}
                  </dd>
                </div>
              ))}
              <div>
                <dt>Blocked effects</dt>
                <dd>{steeringHandoffReadiness.blockedEffects.join(", ")}</dd>
              </div>
            </dl>
          </section>
          <button
            className="secondary"
            onClick={submitSteeringDraft}
            disabled={!steeringDraft.sendState.canSendToNapoleon || !steeringHandoffReadiness.canSubmit}
          >
            Send steering draft to Napoleon review
          </button>
          {steeringFailure ? <p className="warning">{steeringFailure}</p> : null}
          {steeringSubmission ? (
            <dl>
              <dt>Napoleon review response</dt>
              <dd>{steeringSubmission.text}</dd>
              <dt>Governance</dt>
              <dd>
                {steeringSubmission.governanceDecision.outcome}, decision{" "}
                {steeringSubmission.governanceDecision.decision_id}
              </dd>
              <dt>Trace</dt>
              <dd>{steeringSubmission.traceEnvelope.trace_id}</dd>
              <dt>Audit</dt>
              <dd>{steeringSubmission.auditEnvelope.audit_id}</dd>
              <dt>Local effects</dt>
              <dd>not applied; no memory write; no approval captured; no external send.</dd>
            </dl>
          ) : null}
        </section>
      ) : null}

      <section className="taxonomy-controls">
        <div>
          <strong>Capability taxonomy</strong>
          <span>Local label edits affect Concierge summaries only. They do not change Napoleon policy or routing.</span>
        </div>
        <label>
          Label
          <select value={selectedTaxonomyLabel} onChange={(e) => setSelectedTaxonomyLabel(e.target.value)}>
            <option value="">Select a local label</option>
            {taxonomyRows.map((row) => (
              <option key={row.value} value={row.value}>
                {row.dimension}: {row.label} ({row.count})
                {row.deprecated ? " deprecated" : ""}
                {row.splitCandidate ? " split" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="taxonomy-actions">
          <input
            value={taxonomyRenameValue}
            onChange={(e) => setTaxonomyRenameValue(e.target.value)}
            placeholder="New local label"
          />
          <button className="secondary" disabled={!selectedTaxonomyLabel || !taxonomyRenameValue.trim()} onClick={renameSelectedTaxonomyLabel}>
            Rename label
          </button>
        </div>
        <div className="taxonomy-actions">
          <select value={taxonomyMergeTarget} onChange={(e) => setTaxonomyMergeTarget(e.target.value)}>
            <option value="">Merge into...</option>
            {taxonomyRows
              .filter((row) => !selectedTaxonomyRow || row.dimension === selectedTaxonomyRow.dimension)
              .map((row) => (
                <option key={`merge-${row.value}`} value={row.value}>
                  {row.dimension}: {row.label} ({row.count})
                </option>
              ))}
          </select>
          <button className="secondary" disabled={!selectedTaxonomyLabel || !taxonomyMergeTarget} onClick={mergeSelectedTaxonomyLabel}>
            Merge label
          </button>
        </div>
        <div className="taxonomy-actions">
          <button className="secondary" disabled={!selectedTaxonomyLabel} onClick={() => markSelectedTaxonomyLabel("deprecated", true)}>
            Mark deprecated
          </button>
          <button className="secondary" disabled={!selectedTaxonomyLabel} onClick={() => markSelectedTaxonomyLabel("deprecated", false)}>
            Unmark deprecated
          </button>
          <button className="secondary" disabled={!selectedTaxonomyLabel} onClick={() => markSelectedTaxonomyLabel("splitCandidate", true)}>
            Mark split candidate
          </button>
          <button className="secondary" disabled={!selectedTaxonomyLabel} onClick={() => markSelectedTaxonomyLabel("splitCandidate", false)}>
            Unmark split candidate
          </button>
          <button className="secondary" onClick={resetTaxonomyEdits}>
            Reset taxonomy edits
          </button>
          <button className="secondary" onClick={createTaxonomyReviewDraft}>
            Draft taxonomy review
          </button>
        </div>
      </section>

      {taxonomyReviewDraft ? (
        <section className="taxonomy-review-draft">
          <div>
            <strong>Chief of Staff taxonomy review draft</strong>
            <span>Local proposal only. It reviews labels without changing Napoleon policy or routing.</span>
          </div>
          <dl>
            <dt>Recommendations</dt>
            <dd>{taxonomyReviewDraft.recommendations.length}</dd>
            <dt>Evaluator case</dt>
            <dd>
              {taxonomyReviewDraft.evaluatorCaseCandidate.caseId}:{" "}
              {taxonomyReviewDraft.evaluatorCaseCandidate.expectedBehavior}
            </dd>
            <dt>Evolution proposal</dt>
            <dd>
              {taxonomyReviewDraft.evolutionProposal.proposal_id}, risk{" "}
              {taxonomyReviewDraft.evolutionProposal.risk_level}, approval required:{" "}
              {taxonomyReviewDraft.evolutionProposal.approval_required}
            </dd>
            <dt>Boundary</dt>
            <dd>proposal only; no approval captured; no memory write; no agent dispatch; no external send.</dd>
          </dl>
          {taxonomyReviewDraft.recommendations.length ? (
            <ol>
              {taxonomyReviewDraft.recommendations.map((recommendation) => (
                <li
                  key={`${recommendation.action}:${recommendation.dimension}:${recommendation.sourceLabel}:${recommendation.targetLabel ?? ""}`}
                >
                  <strong>
                    {recommendation.action} {recommendation.dimension} {recommendation.sourceLabel}
                    {recommendation.targetLabel ? ` into ${recommendation.targetLabel}` : ""}
                  </strong>
                  <span>
                    {recommendation.reason} Evidence: {recommendation.evidenceCount}.
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p>No local taxonomy review recommendations yet.</p>
          )}
          <section className={`send-preflight ${taxonomyHandoffReadiness.status}`}>
            <div>
              <strong>{taxonomyHandoffReadiness.heading}</strong>
              <span>{taxonomyHandoffReadiness.summary}</span>
              <span>{taxonomyHandoffReadiness.caveat}</span>
            </div>
            <dl>
              {taxonomyHandoffReadiness.items.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>
                    {item.status}: {item.detail}
                  </dd>
                </div>
              ))}
              <div>
                <dt>Blocked effects</dt>
                <dd>{taxonomyHandoffReadiness.blockedEffects.join(", ")}</dd>
              </div>
            </dl>
          </section>
          <button
            className="secondary"
            onClick={submitTaxonomyReviewDraft}
            disabled={!taxonomyHandoffReadiness.canSubmit}
          >
            Send taxonomy review to Napoleon review
          </button>
          {taxonomyReviewFailure ? <p className="warning">{taxonomyReviewFailure}</p> : null}
          {taxonomyReviewSubmission ? (
            <dl>
              <dt>Napoleon review response</dt>
              <dd>{taxonomyReviewSubmission.text}</dd>
              <dt>Governance</dt>
              <dd>
                {taxonomyReviewSubmission.governanceDecision.outcome}, decision{" "}
                {taxonomyReviewSubmission.governanceDecision.decision_id}
              </dd>
              <dt>Trace</dt>
              <dd>{taxonomyReviewSubmission.traceEnvelope.trace_id}</dd>
              <dt>Audit</dt>
              <dd>{taxonomyReviewSubmission.auditEnvelope.audit_id}</dd>
              <dt>Local effects</dt>
              <dd>not applied; no memory write; no approval captured; no external send.</dd>
            </dl>
          ) : null}
        </section>
      ) : null}

      <section className="messages">
        {messages.map((m, i) => (
          <article key={i} className={m.role}>
            <strong>{m.role}</strong>
            <p>{m.content}</p>
            {m.metadata ? (
              <dl>
                <dt>Governance</dt>
                <dd>{m.metadata.governanceOutcome}</dd>
                <dt>Profile mode</dt>
                <dd>{m.metadata.profileMode}</dd>
                <dt>Decision</dt>
                <dd>{m.metadata.decisionId}</dd>
                <dt>Audit</dt>
                <dd>{m.metadata.auditId}</dd>
              </dl>
            ) : null}
          </article>
        ))}
      </section>

      {lastDecision ? (
        <section className="governance">
          <strong>{lastDecision.status}</strong>
          <p>{lastDecision.detail}</p>
          <span>Blocked effects: {lastDecision.blockedEffectsLabel}</span>
        </section>
      ) : null}

      {lastBridgeFailure ? (
        <section className="bridge-failure">
          <strong>Bridge blocked</strong>
          <p>{lastBridgeFailure}</p>
        </section>
      ) : null}

      {lastNapoleonPresentation.proof ? (
        <section className={`napoleon-proof ${lastNapoleonPresentation.proof.status}`}>
          <div className="review-heading">
            <strong>{lastNapoleonPresentation.proof.heading}</strong>
            <span>{lastNapoleonPresentation.proof.summary}</span>
            <span>{lastNapoleonPresentation.proof.caveat}</span>
          </div>
          <dl>
            {lastNapoleonPresentation.proof.details.map((detail) => (
              <div key={detail.label}>
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
          <button className="secondary" onClick={exportNapoleonProof}>
            Export Napoleon proof
          </button>
          {napoleonProofComparison ? (
            <div className={`proof-comparison ${napoleonProofComparison.status}`}>
              <strong>Napoleon proof comparison</strong>
              <span>{napoleonProofComparison.summary}</span>
              <span>Comparison uses local sanitized proof metadata only and is not Napoleon approval.</span>
              {napoleonProofComparison.changes.length > 0 ? (
                <dl>
                  {napoleonProofComparison.changes.map((change) => (
                    <div key={change.label}>
                      <dt>{change.label}</dt>
                      <dd>
                        {change.previous} {"->"} {change.current}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          ) : null}
          {napoleonProofExportJson ? (
            <pre aria-label="Exported Napoleon response proof">{napoleonProofExportJson}</pre>
          ) : null}
        </section>
      ) : null}

      {lastNapoleonPresentation.delegation ? (
        <section className="delegation">
          <div className="review-heading">
            <strong>{lastNapoleonPresentation.delegation.heading}</strong>
            <span>{lastNapoleonPresentation.delegation.body}</span>
          </div>
          {lastNapoleonPresentation.delegation.details.length ? (
            <dl>
              {lastNapoleonPresentation.delegation.details.map((detail) => (
                <div key={detail.label}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      ) : null}

      {lastReview ? (
        <section className={`review ${lastReview.sendBlocked ? "blocked" : ""}`}>
          <div className="review-heading">
            <strong>{lastReview.heading}</strong>
            <span>{lastReview.body}</span>
          </div>
          <dl>
            {lastReview.details.map((detail) => (
              <div key={detail.label}>
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
          <button className="secondary" disabled={!lastReview.canAcknowledge} onClick={acknowledgeLastReview}>
            {lastReview.actionLabel}
          </button>
        </section>
      ) : null}

      {lastMemoryReview ? (
        <section className="memory-review">
          <div className="review-heading">
            <strong>{lastMemoryReview.heading}</strong>
            <span>{lastMemoryReview.body}</span>
          </div>
          <dl>
            {lastMemoryReview.details.map((detail) => (
              <div key={detail.label}>
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
          <section className={`send-preflight ${memoryHandoffReadiness.status}`}>
            <div>
              <strong>{memoryHandoffReadiness.heading}</strong>
              <span>{memoryHandoffReadiness.summary}</span>
              <span>{memoryHandoffReadiness.caveat}</span>
            </div>
            <dl>
              {memoryHandoffReadiness.items.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>
                    {item.status}: {item.detail}
                  </dd>
                </div>
              ))}
              <div>
                <dt>Blocked effects</dt>
                <dd>{memoryHandoffReadiness.blockedEffects.join(", ")}</dd>
              </div>
            </dl>
          </section>
          <div className="review-actions">
            <button
              className="secondary"
              disabled={!lastMemoryReview.canAcknowledge}
              onClick={() => updateLastMemoryReview("acknowledged_locally")}
            >
              {lastMemoryReview.actionLabel}
            </button>
            <button
              className="secondary"
              disabled={!lastMemoryReview.canDismiss}
              onClick={() => updateLastMemoryReview("dismissed_locally")}
            >
              {lastMemoryReview.dismissLabel}
            </button>
            <button
              className="secondary"
              disabled={
                !lastMemoryReviewState ||
                lastMemoryReviewState.status === "dismissed_locally" ||
                !memoryHandoffReadiness.canSubmit
              }
              onClick={submitLastMemoryProposal}
            >
              Send memory proposal to Napoleon review
            </button>
          </div>
          {memorySubmissionFailure ? <p className="warning">{memorySubmissionFailure}</p> : null}
          {memorySubmission ? (
            <dl>
              <dt>Napoleon review response</dt>
              <dd>{memorySubmission.text}</dd>
              <dt>Governance</dt>
              <dd>
                {memorySubmission.governanceDecision.outcome}, decision{" "}
                {memorySubmission.governanceDecision.decision_id}
              </dd>
              <dt>Trace</dt>
              <dd>{memorySubmission.traceEnvelope.trace_id}</dd>
              <dt>Audit</dt>
              <dd>{memorySubmission.auditEnvelope.audit_id}</dd>
              <dt>Local effects</dt>
              <dd>no memory write; no approval captured; no external send.</dd>
            </dl>
          ) : null}
        </section>
      ) : null}

      {pendingRehearsal ? (
        <section className="rehearsal">
          <div className="rehearsal-heading">
            <strong>{pendingRehearsal.summary.status}</strong>
            <span>{pendingRehearsal.summary.detail}</span>
          </div>
          <dl>
            <dt>Understood request</dt>
            <dd>{pendingRehearsal.preview.understoodRequest}</dd>
            <dt>Proposed path</dt>
            <dd>{pendingRehearsal.preview.proposedNapoleonPath.join(" -> ")}</dd>
            <dt>Chief of Staff packet</dt>
            <dd>
              {pendingRehearsal.preview.chiefOfStaffReviewPacket.requestId},{" "}
              {pendingRehearsal.preview.chiefOfStaffReviewPacket.profileMode},{" "}
              {pendingRehearsal.preview.chiefOfStaffReviewPacket.authorityTier}
            </dd>
            <dt>Allowed</dt>
            <dd>{pendingRehearsal.preview.allowedEffects.join(", ")}</dd>
            <dt>Blocked</dt>
            <dd>{pendingRehearsal.preview.blockedEffects.join(", ")}</dd>
            <dt>Approval</dt>
            <dd>{pendingRehearsal.summary.approval}</dd>
            <dt>Memory proposal</dt>
            <dd>{pendingRehearsal.summary.memory}</dd>
            <dt>Trace and audit</dt>
            <dd>
              {pendingRehearsal.preview.traceAuditPreview.traceId},{" "}
              {pendingRehearsal.preview.traceAuditPreview.auditId}
            </dd>
            <dt>Evaluator case</dt>
            <dd>
              {pendingRehearsal.preview.evaluatorCaseCandidate.scenarioType},{" "}
              {pendingRehearsal.preview.evaluatorCaseCandidate.sourceRequestId}
            </dd>
          </dl>
          <section className={`review inline ${pendingRehearsal.review.sendBlocked ? "blocked" : ""}`}>
            <div className="review-heading">
              <strong>{pendingRehearsal.review.heading}</strong>
              <span>{pendingRehearsal.review.body}</span>
            </div>
            <dl>
              {pendingRehearsal.review.details.map((detail) => (
                <div key={detail.label}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
            <button className="secondary" disabled={!pendingRehearsal.review.canAcknowledge} onClick={acknowledgePendingReview}>
              {pendingRehearsal.review.actionLabel}
            </button>
          </section>
          {pendingRehearsal.memoryReview ? (
            <section className="memory-review inline">
              <div className="review-heading">
                <strong>{pendingRehearsal.memoryReview.heading}</strong>
                <span>{pendingRehearsal.memoryReview.body}</span>
              </div>
              <dl>
                {pendingRehearsal.memoryReview.details.map((detail) => (
                  <div key={detail.label}>
                    <dt>{detail.label}</dt>
                    <dd>{detail.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="review-actions">
                <button
                  className="secondary"
                  disabled={!pendingRehearsal.memoryReview.canAcknowledge}
                  onClick={() => updatePendingMemoryReview("acknowledged_locally")}
                >
                  {pendingRehearsal.memoryReview.actionLabel}
                </button>
                <button
                  className="secondary"
                  disabled={!pendingRehearsal.memoryReview.canDismiss}
                  onClick={() => updatePendingMemoryReview("dismissed_locally")}
                >
                  {pendingRehearsal.memoryReview.dismissLabel}
                </button>
              </div>
            </section>
          ) : null}
        </section>
      ) : null}

      <section className="composer">
        <textarea
          value={input}
          onChange={(e) => updateInput(e.target.value)}
          placeholder="Ask Napoleon through Concierge..."
        />
        <div className={`send-preflight ${liveSendPreflight.status}`}>
          <div>
            <strong>{liveSendPreflight.heading}</strong>
            <span>{liveSendPreflight.summary}</span>
            <span>{liveSendPreflight.caveat}</span>
          </div>
          <dl>
            {liveSendPreflight.items.map((item) => (
              <div key={item.label} className={item.status}>
                <dt>{item.label}</dt>
                <dd>{item.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="composer-actions">
          <button onClick={rehearsalMode ? rehearse : () => submit()}>
            {rehearsalMode ? "Rehearse" : "Send"}
          </button>
          {rehearsalMode ? (
            <button className="secondary" disabled={!canSendRehearsal} onClick={() => submit(pendingRehearsal)}>
              Send advisory request
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
