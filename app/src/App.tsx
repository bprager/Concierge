import { useState } from "react";
import {
  buildLocalNeutralAvatarState,
  localAvatarExpressionSample,
  localNeutralAvatarStateSample,
  mapLocalAvatarExpression,
  type LocalAvatarExpressionResult,
  type LocalNeutralAvatarStateResult,
} from "./avatarState.js";
import {
  buildLocalAvatarRendererReadiness,
  loadLocalAvatarModelReference,
  localAvatarModelSample,
  type LocalAvatarRendererReadinessResult,
  type LocalAvatarModelReferenceResult,
} from "./avatarModel.js";
import {
  buildLocalAvatarLipSyncBaseline,
  localAvatarLipSyncSample,
  type LocalAvatarLipSyncResult,
} from "./avatarLipSync.js";
import {
  buildLocalAvatarGazeSimulation,
  localAvatarGazeSample,
  type LocalAvatarGazeResult,
} from "./avatarGaze.js";
import {
  buildLocalAvatarFacePoseEstimate,
  localAvatarFacePoseSample,
  type LocalAvatarFacePoseResult,
} from "./avatarFacePose.js";
import {
  buildLocalAvatarAffectFusion,
  localAvatarAffectFusionSample,
  type LocalAvatarAffectFusionResult,
} from "./avatarAffectFusion.js";
import { buildAvatarPrivacyDashboard } from "./avatarPrivacyDashboard.js";
import { rehearseLocalBargeInSample, type LocalBargeInRehearsalResult } from "./bargeInRehearsal.js";
import { answerCapabilityQuestion } from "./capabilityLedger.js";
import { describeBridgeOperationSummary, describeTaxonomyReviewBridgeSummary } from "./bridgeOperations.js";
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
  mapProfileToNapoleonMode,
  transitionMemoryProposalReviewState,
  type DescriptorConnectionInput,
  type GovernanceReviewState,
  type LocalProfile,
  type NapoleonProfileMode,
  type MemoryProposalReviewState,
} from "./contractBridge.js";
import { discoverNapoleonDescriptor } from "./descriptorDiscovery.js";
import {
  submitGovernanceReviewForNapoleonReview,
  type GovernanceReviewSubmissionResult,
} from "./governanceReviewSubmission.js";
import {
  submitMemoryProposalForReview,
  type MemoryProposalSubmissionResult,
} from "./memoryProposalSubmission.js";
import { NapoleonBridgeError, sendToNapoleon } from "./napoleonBridge.js";
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
  describeDelegation,
  describeGovernedHandoffFailure,
  describeGovernedHandoffReadiness,
  describeGovernanceDecision,
  describeGovernanceReview,
  describeLiveBridgeReadiness,
  describeLiveVoiceReadiness,
  describeLiveSendPreflight,
  describeMemoryProposalReview,
  describeNapoleonTranscriptMetadata,
  summarizeRehearsalPreview,
} from "./presentation.js";
import {
  clearTelemetryBuffer,
  emitEvent,
  exportInteractionTraceJson,
  exportTelemetryBufferJson,
  findLatestInteractionTraceId,
  loadTelemetryBufferRetentionLimit,
  loadTelemetryBufferFromStorage,
  newTraceId,
  setTelemetryBufferRetentionLimit,
  TELEMETRY_BUFFER_RETENTION_OPTIONS,
} from "./telemetry.js";
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
  buildGovernedVoicePipelinePlan,
  compareGovernedVoicePipelineProofs,
  exportGovernedVoicePipelineProofJson,
  type GovernedVoicePipelineProofComparison,
} from "./voicePipelinePlan.js";
import {
  localVoiceResponseShapeSample,
  shapeVoiceResponseForSpeech,
  type VoiceResponseShapeResult,
} from "./voiceResponseShaping.js";
import { detectVoiceSegments, localVadSampleFrames, type VoiceActivitySegment } from "./voiceActivity.js";
import {
  buildLocalWakeWordReadiness,
  runLocalWakeWordDetectionSample,
  type LocalWakeWordDetectionSampleResult,
} from "./wakeWordReadiness.js";

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

export function buildBridgeFailureMessageMetadata(
  error: unknown,
  activeProfileMode?: NapoleonProfileMode,
): ConciergeMessage["metadata"] {
  if (!(error instanceof NapoleonBridgeError)) {
    return {
      source: "Blocked Napoleon governed bridge attempt",
      attributionBoundary: "No Napoleon response was accepted; fail-closed local state only.",
      ...(activeProfileMode ? { profileMode: activeProfileMode } : {}),
    };
  }

  return {
    source: "Blocked Napoleon governed bridge attempt",
    attributionBoundary: "No Napoleon response was accepted; fail-closed local state only.",
    governanceOutcome: error.governanceOutcome,
    ...(activeProfileMode ? { profileMode: activeProfileMode } : {}),
    decisionId: error.decisionId,
    auditId: error.auditId,
    blockedEffects: error.blockedEffects,
  };
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

function stanceForProfile(profile: LocalProfile): { stance: string; reason: string; confidence: number } {
  if (profile === "child_protected") {
    return {
      stance: "protected_prepare_only",
      reason: "child_protected_profile_requires_conservative_governance",
      confidence: 0.9,
    };
  }
  if (profile === "guest") {
    return {
      stance: "scoped_prepare_only",
      reason: "guest_profile_limits_authority_and_memory_scope",
      confidence: 0.86,
    };
  }
  if (profile === "collaborator") {
    return {
      stance: "collaborative_prepare_only",
      reason: "collaborator_profile_keeps_actions_advisory",
      confidence: 0.84,
    };
  }
  return {
    stance: "owner_prepare_only",
    reason: "adult_owner_profile_allows_advisory_text_preparation_only",
    confidence: 0.88,
  };
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
  const [telemetryBufferCount, setTelemetryBufferCount] = useState(() => {
    const buffer = loadTelemetryBufferFromStorage(browserStorage());
    return buffer.events.length;
  });
  const [telemetryBufferLastEvent, setTelemetryBufferLastEvent] = useState(() => {
    const buffer = loadTelemetryBufferFromStorage(browserStorage());
    return buffer.events.at(-1)?.event ?? "none";
  });
  const [telemetryBufferRetentionLimit, setTelemetryBufferRetentionLimitState] = useState(() =>
    loadTelemetryBufferRetentionLimit(browserStorage()),
  );
  const [telemetryBufferExportJson, setTelemetryBufferExportJson] = useState<string | null>(null);
  const [interactionTraceExportJson, setInteractionTraceExportJson] = useState<string | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(() => storedBoolean("concierge_camera_enabled", false));
  const [microphoneEnabled, setMicrophoneEnabled] = useState(() =>
    storedBoolean("concierge_microphone_enabled", false),
  );
  const [wakeWordEnabled, setWakeWordEnabled] = useState(() => storedBoolean("concierge_wake_word_enabled", false));
  const [avatarAffectEnabled, setAvatarAffectEnabled] = useState(() =>
    storedBoolean("concierge_avatar_affect_enabled", false),
  );
  const [rawMediaStorageEnabled, setRawMediaStorageEnabled] = useState(() =>
    storedBoolean("concierge_raw_media_storage_enabled", false),
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
  const [wakeWordDetectionSampleResult, setWakeWordDetectionSampleResult] =
    useState<LocalWakeWordDetectionSampleResult | null>(null);
  const [neutralAvatarStateResult, setNeutralAvatarStateResult] = useState<LocalNeutralAvatarStateResult | null>(null);
  const [avatarExpressionResult, setAvatarExpressionResult] = useState<LocalAvatarExpressionResult | null>(null);
  const [avatarLipSyncResult, setAvatarLipSyncResult] = useState<LocalAvatarLipSyncResult | null>(null);
  const [avatarGazeResult, setAvatarGazeResult] = useState<LocalAvatarGazeResult | null>(null);
  const [avatarFacePoseResult, setAvatarFacePoseResult] = useState<LocalAvatarFacePoseResult | null>(null);
  const [avatarAffectFusionResult, setAvatarAffectFusionResult] =
    useState<LocalAvatarAffectFusionResult | null>(null);
  const [avatarModelResult, setAvatarModelResult] = useState<LocalAvatarModelReferenceResult | null>(null);
  const [avatarRendererReadinessResult, setAvatarRendererReadinessResult] =
    useState<LocalAvatarRendererReadinessResult | null>(null);
  const [lastDecision, setLastDecision] = useState<ReturnType<typeof describeGovernanceDecision> | null>(null);
  const [lastNapoleonPresentation, setLastNapoleonPresentation] = useState(clearNapoleonResponsePresentation);
  const [napoleonProofExportJson, setNapoleonProofExportJson] = useState<string | null>(null);
  const [napoleonProofComparison, setNapoleonProofComparison] = useState<NapoleonResponseProofComparison | null>(null);
  const [lastBridgeFailure, setLastBridgeFailure] = useState<string | null>(null);
  const [bridgeEvidenceReadiness, setBridgeEvidenceReadiness] = useState(buildBridgeEvidenceReadinessState);
  const [bridgeReadinessProofJson, setBridgeReadinessProofJson] = useState<string | null>(null);
  const [bridgeReadinessProofComparison, setBridgeReadinessProofComparison] =
    useState<BridgeReadinessProofComparison | null>(null);
  const [voicePipelineProofJson, setVoicePipelineProofJson] = useState<string | null>(null);
  const [voicePipelineProofComparison, setVoicePipelineProofComparison] =
    useState<GovernedVoicePipelineProofComparison | null>(null);
  const [lastGovernanceReviewState, setLastGovernanceReviewState] = useState<GovernanceReviewState | null>(null);
  const [lastReview, setLastReview] = useState<ReturnType<typeof describeGovernanceReview> | null>(null);
  const [governanceReviewSubmission, setGovernanceReviewSubmission] =
    useState<GovernanceReviewSubmissionResult | null>(null);
  const [governanceReviewSubmissionFailure, setGovernanceReviewSubmissionFailure] = useState<string | null>(null);
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

  function clearGovernanceReviewHandoff() {
    setLastGovernanceReviewState(null);
    setGovernanceReviewSubmission(null);
    setGovernanceReviewSubmissionFailure(null);
  }

  function clearLocalReviewDrafts() {
    setLastGovernanceReviewState(null);
    setLastReview(null);
    setLastMemoryReviewState(null);
    setLastMemoryReview(null);
    setMemorySubmission(null);
    setMemorySubmissionFailure(null);
  }

  function clearGovernedHandoffResults() {
    setGovernanceReviewSubmission(null);
    setGovernanceReviewSubmissionFailure(null);
    setMemorySubmission(null);
    setMemorySubmissionFailure(null);
    setSteeringSubmission(null);
    setSteeringFailure(null);
    setTaxonomyReviewSubmission(null);
    setTaxonomyReviewFailure(null);
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
    if (endpoint.trim() && descriptorMode !== "checksum_mismatch") {
      return {
        endpointConfigured: true,
        descriptor: null,
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
    rehearsalMode,
  });
  const governanceReviewHandoffReadiness = describeGovernedHandoffReadiness({
    label: "Governance review",
    descriptorConnection,
    draftReady: Boolean(
      lastGovernanceReviewState &&
        lastGovernanceReviewState.canSendAdvisory &&
        lastGovernanceReviewState.status !== "not_required",
    ),
    rehearsalMode,
  });
  const steeringHandoffReadiness = describeGovernedHandoffReadiness({
    label: "Chief of Staff steering",
    descriptorConnection,
    draftReady: Boolean(steeringDraft),
    rehearsalMode,
  });
  const taxonomyHandoffReadiness = describeGovernedHandoffReadiness({
    label: "Chief of Staff taxonomy review",
    descriptorConnection,
    draftReady: Boolean(taxonomyReviewDraft),
    rehearsalMode,
  });
  const latestInteractionTraceId = findLatestInteractionTraceId(browserStorage());

  function refreshCapabilityLedgerStatus() {
    setCapabilitySignalCount(capabilityLedger.listRecent().length);
  }

  function refreshTelemetryBufferStatus() {
    const buffer = loadTelemetryBufferFromStorage(browserStorage());
    setTelemetryBufferCount(buffer.events.length);
    setTelemetryBufferLastEvent(buffer.events.at(-1)?.event ?? "none");
    setTelemetryBufferRetentionLimitState(buffer.maxEvents);
  }

  function exportLocalTelemetryBuffer() {
    setTelemetryBufferExportJson(exportTelemetryBufferJson(browserStorage()));
    refreshTelemetryBufferStatus();
  }

  function exportLatestInteractionTrace() {
    const latestTraceId = findLatestInteractionTraceId(browserStorage());
    if (!latestTraceId) return;
    setInteractionTraceExportJson(exportInteractionTraceJson(browserStorage(), latestTraceId));
    refreshTelemetryBufferStatus();
  }

  function clearLocalTelemetryBuffer() {
    clearTelemetryBuffer(browserStorage());
    setTelemetryBufferExportJson(null);
    setInteractionTraceExportJson(null);
    setTelemetryBufferCount(0);
    setTelemetryBufferLastEvent("none");
  }

  function updateTelemetryBufferRetentionLimit(value: number) {
    const buffer = setTelemetryBufferRetentionLimit(browserStorage(), value);
    setTelemetryBufferCount(buffer.events.length);
    setTelemetryBufferLastEvent(buffer.events.at(-1)?.event ?? "none");
    setTelemetryBufferRetentionLimitState(buffer.maxEvents);
    setTelemetryBufferExportJson(null);
    setInteractionTraceExportJson(null);
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
    setTaxonomyReviewDraft(null);
    setTaxonomyReviewSubmission(null);
    setTaxonomyReviewFailure(null);
    emitEvent(event, {
      traceId: newTraceId(),
      conversationId,
      storage: "local_browser",
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
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
    setLiveDescriptorInput(null);
    setDescriptorDiscoveryMessage(null);
    clearBridgeReadinessProof();
    clearNapoleonPresentation();
    clearGovernedHandoffResults();
    if (typeof localStorage === "undefined") return;
    if (value.trim()) {
      localStorage.setItem("napoleon_endpoint", value.trim());
    } else {
      localStorage.removeItem("napoleon_endpoint");
    }
  }

  function updateAuthToken(value: string) {
    setAuthToken(value);
    setLiveDescriptorInput(null);
    setDescriptorDiscoveryMessage(null);
    clearBridgeReadinessProof();
    clearNapoleonPresentation();
    clearGovernedHandoffResults();
    if (typeof localStorage === "undefined") return;
    if (value.trim()) {
      localStorage.setItem("napoleon_auth_token", value.trim());
    } else {
      localStorage.removeItem("napoleon_auth_token");
    }
  }

  function updateDescriptorMode(value: "discovered" | "live" | "missing" | "checksum_mismatch") {
    setDescriptorMode(value);
    clearBridgeReadinessProof();
    clearNapoleonPresentation();
    clearGovernedHandoffResults();
  }

  function updateRehearsalMode(enabled: boolean) {
    setRehearsalMode(enabled);
    if (enabled) {
      setPendingRehearsal(null);
      clearNapoleonPresentation();
      clearGovernedHandoffResults();
    }
  }

  function updatePrivacySetting(
    kind: "telemetry" | "camera" | "microphone" | "wake_word" | "avatar_affect" | "raw_media_storage",
    enabled: boolean,
  ) {
    const storageKey =
      kind === "telemetry"
        ? "concierge_telemetry_enabled"
        : kind === "camera"
          ? "concierge_camera_enabled"
          : kind === "microphone"
            ? "concierge_microphone_enabled"
            : kind === "wake_word"
              ? "concierge_wake_word_enabled"
              : kind === "avatar_affect"
                ? "concierge_avatar_affect_enabled"
                : "concierge_raw_media_storage_enabled";
    if (kind === "telemetry") setTelemetryEnabled(enabled);
    if (kind === "camera") setCameraEnabled(enabled);
    if (kind === "microphone") setMicrophoneEnabled(enabled);
    if (kind === "wake_word") setWakeWordEnabled(enabled);
    if (kind === "avatar_affect") setAvatarAffectEnabled(enabled);
    if (kind === "raw_media_storage") setRawMediaStorageEnabled(enabled);
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
      agentDispatchPerformed: false,
      externalSendPerformed: false,
    });
    refreshTelemetryBufferStatus();
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
      agentDispatchPerformed: false,
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
        agentDispatchPerformed: false,
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
        agentDispatchPerformed: false,
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
        agentDispatchPerformed: false,
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
        agentDispatchPerformed: false,
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
      agentDispatchPerformed: false,
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
        agentDispatchPerformed: false,
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
        agentDispatchPerformed: false,
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
        agentDispatchPerformed: false,
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
        agentDispatchPerformed: false,
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
        agentDispatchPerformed: false,
        externalSendPerformed: false,
      });
    }
  }

  function runLocalWakeWordSample() {
    const traceId = newTraceId();
    const result = runLocalWakeWordDetectionSample({
      enabled: wakeWordEnabled,
      profileMode: profile,
    });
    setWakeWordDetectionSampleResult(result);
    emitEvent("wake_word_sample_detected", {
      traceId,
      conversationId,
      localSampleOnly: result.localSampleOnly,
      enabled: result.enabled,
      detected: result.detected,
      detectedAtMs: result.detectedAtMs,
      confidence: result.confidence,
      profileMode: result.profileMode,
      childProtected: result.childProtected,
      guardianReviewReminder: result.guardianReviewReminder,
      listeningStarted: result.listeningStarted,
      microphoneCaptureStarted: result.microphoneCaptureStarted,
      rawAudioStored: result.rawAudioStored,
      liveNapoleonContacted: result.liveNapoleonContacted,
      approvalCaptured: result.approvalCaptured,
      memoryWritePerformed: result.memoryWritePerformed,
      externalSendPerformed: result.externalSendPerformed,
      agentDispatchPerformed: result.agentDispatchPerformed,
    });
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
      agentDispatchPerformed: result.agentDispatchPerformed,
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
      agentDispatchPerformed: result.agentDispatchPerformed,
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
      agentDispatchPerformed: result.agentDispatchPerformed,
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
      vadLatencyMs: result.latency.vadMs,
      sttLatencyMs: result.latency.sttMs,
      napoleonLatencyMs: result.latency.napoleonMs,
      ttsLatencyMs: result.latency.ttsMs,
      totalLatencyMs: result.latency.totalMs,
      liveNapoleonContacted: result.liveNapoleonContacted,
      microphoneCaptureStarted: result.microphoneCaptureStarted,
      audioPlaybackStarted: result.audioPlaybackStarted,
      rawAudioStored: result.rawAudioStored,
      memoryWritePerformed: result.memoryWritePerformed,
      approvalCaptured: result.approvalCaptured,
      agentDispatchPerformed: result.agentDispatchPerformed,
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
      agentDispatchPerformed: result.agentDispatchPerformed,
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
      agentDispatchPerformed: result.agentDispatchPerformed,
      externalSendPerformed: result.externalSendPerformed,
      blockedEffects: result.blockedEffects,
    });
  }

  function runLocalNeutralAvatarState() {
    const traceId = newTraceId();
    const result = buildLocalNeutralAvatarState({ ...localNeutralAvatarStateSample, profileMode: profile });
    setNeutralAvatarStateResult(result);
    emitEvent("avatar_state_changed", {
      traceId,
      conversationId,
      localDisplayOnly: result.localDisplayOnly,
      avatarState: result.avatarState,
      expression: result.expression,
      gazeTarget: result.gazeTarget,
      profileMode: result.profileMode,
      childProtected: result.childProtected,
      cameraPolicy: result.cameraPolicy,
      affectPolicy: result.affectPolicy,
      guardianApprovalCaptured: result.guardianApprovalCaptured,
      stance: result.stance,
      bridgeProvidedProvenance: localNeutralAvatarStateSample.bridgeProvidedProvenance,
      cameraCaptureStarted: result.cameraCaptureStarted,
      faceDetectionStarted: result.faceDetectionStarted,
      affectInferred: result.affectInferred,
      avatarAnimationStarted: result.avatarAnimationStarted,
      liveNapoleonContacted: result.liveNapoleonContacted,
      memoryWritePerformed: result.memoryWritePerformed,
      approvalCaptured: result.approvalCaptured,
      agentDispatchPerformed: result.agentDispatchPerformed,
      externalSendPerformed: result.externalSendPerformed,
      blockedEffects: result.blockedEffects,
    });
  }

  function runLocalAvatarExpressionMapping() {
    const traceId = newTraceId();
    const result = mapLocalAvatarExpression({ ...localAvatarExpressionSample, profileMode: profile });
    setAvatarExpressionResult(result);
    emitEvent("avatar_expression_set", {
      traceId,
      conversationId,
      localMetadataOnly: result.localMetadataOnly,
      stance: result.stance,
      expression: result.expression,
      profileMode: result.profileMode,
      childProtected: result.childProtected,
      bridgeProvidedProvenance: result.bridgeProvidedProvenance,
      avatarAnimationStarted: result.avatarAnimationStarted,
      affectInferred: result.affectInferred,
      cameraCaptureStarted: result.cameraCaptureStarted,
      faceDetectionStarted: result.faceDetectionStarted,
      liveNapoleonContacted: result.liveNapoleonContacted,
      memoryWritePerformed: result.memoryWritePerformed,
      approvalCaptured: result.approvalCaptured,
      guardianApprovalCaptured: result.guardianApprovalCaptured,
      agentDispatchPerformed: result.agentDispatchPerformed,
      externalSendPerformed: result.externalSendPerformed,
      blockedEffects: result.blockedEffects,
    });
  }

  function runLocalAvatarLipSyncBaseline() {
    const traceId = newTraceId();
    emitEvent("lip_sync_started", {
      traceId,
      conversationId,
      localMetadataOnly: true,
      profileMode: profile,
      audioPlaybackStarted: false,
      avatarAnimationStarted: false,
      liveNapoleonContacted: false,
      memoryWritePerformed: false,
      approvalCaptured: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
    });
    const result = buildLocalAvatarLipSyncBaseline({ ...localAvatarLipSyncSample, profileMode: profile });
    setAvatarLipSyncResult(result);
    emitEvent("lip_sync_completed", {
      traceId,
      conversationId,
      localMetadataOnly: result.localMetadataOnly,
      profileMode: result.profileMode,
      childProtected: result.childProtected,
      cueCount: result.mouthCues.length,
      durationMs: result.durationMs,
      peakMouthOpen: result.peakMouthOpen,
      audioPlaybackStarted: result.audioPlaybackStarted,
      microphoneCaptureStarted: result.microphoneCaptureStarted,
      rawAudioStored: result.rawAudioStored,
      avatarAnimationStarted: result.avatarAnimationStarted,
      cameraCaptureStarted: result.cameraCaptureStarted,
      faceDetectionStarted: result.faceDetectionStarted,
      affectInferred: result.affectInferred,
      liveNapoleonContacted: result.liveNapoleonContacted,
      memoryWritePerformed: result.memoryWritePerformed,
      approvalCaptured: result.approvalCaptured,
      guardianApprovalCaptured: result.guardianApprovalCaptured,
      agentDispatchPerformed: result.agentDispatchPerformed,
      externalSendPerformed: result.externalSendPerformed,
      blockedEffects: result.blockedEffects,
    });
  }

  function runLocalAvatarGazeSimulation() {
    const traceId = newTraceId();
    const result = buildLocalAvatarGazeSimulation({ ...localAvatarGazeSample, profileMode: profile });
    setAvatarGazeResult(result);
    emitEvent("gaze_target_updated", {
      traceId,
      conversationId,
      localMetadataOnly: result.localMetadataOnly,
      profileMode: result.profileMode,
      childProtected: result.childProtected,
      guardianReviewRequired: result.guardianReviewRequired,
      cameraPolicy: result.cameraPolicy,
      animationPolicy: result.animationPolicy,
      attentionPolicy: result.attentionPolicy,
      eyeTarget: result.eyeTarget,
      horizontalOffset: result.horizontalOffset,
      verticalOffset: result.verticalOffset,
      confidence: result.confidence,
      cameraCaptureStarted: result.cameraCaptureStarted,
      faceDetectionStarted: result.faceDetectionStarted,
      gazeTrackingStarted: result.gazeTrackingStarted,
      avatarAnimationStarted: result.avatarAnimationStarted,
      affectInferred: result.affectInferred,
      liveNapoleonContacted: result.liveNapoleonContacted,
      memoryWritePerformed: result.memoryWritePerformed,
      approvalCaptured: result.approvalCaptured,
      guardianApprovalCaptured: result.guardianApprovalCaptured,
      agentDispatchPerformed: result.agentDispatchPerformed,
      externalSendPerformed: result.externalSendPerformed,
      blockedEffects: result.blockedEffects,
    });
  }

  function runLocalAvatarFacePoseEstimate() {
    const traceId = newTraceId();
    const result = buildLocalAvatarFacePoseEstimate({ ...localAvatarFacePoseSample, profileMode: profile });
    setAvatarFacePoseResult(result);
    emitEvent("camera_state_estimated", {
      traceId,
      conversationId,
      localMetadataOnly: result.localMetadataOnly,
      profileMode: result.profileMode,
      childProtected: result.childProtected,
      guardianReviewRequired: result.guardianReviewRequired,
      cameraPolicy: result.cameraPolicy,
      facePosePolicy: result.facePosePolicy,
      affectPolicy: result.affectPolicy,
      attentionPolicy: result.attentionPolicy,
      facePresent: result.facePresent,
      headYawDegrees: result.headYawDegrees,
      headPitchDegrees: result.headPitchDegrees,
      headRollDegrees: result.headRollDegrees,
      confidence: result.confidence,
      cameraCaptureStarted: result.cameraCaptureStarted,
      faceDetectionStarted: result.faceDetectionStarted,
      rawVideoStored: result.rawVideoStored,
      affectInferred: result.affectInferred,
      attentionInferred: result.attentionInferred,
      avatarAnimationStarted: result.avatarAnimationStarted,
      liveNapoleonContacted: result.liveNapoleonContacted,
      memoryWritePerformed: result.memoryWritePerformed,
      approvalCaptured: result.approvalCaptured,
      guardianApprovalCaptured: result.guardianApprovalCaptured,
      agentDispatchPerformed: result.agentDispatchPerformed,
      externalSendPerformed: result.externalSendPerformed,
      blockedEffects: result.blockedEffects,
    });
  }

  function runLocalAvatarAffectFusion() {
    const traceId = newTraceId();
    const result = buildLocalAvatarAffectFusion({ ...localAvatarAffectFusionSample, profileMode: profile });
    setAvatarAffectFusionResult(result);
    emitEvent("affect_signal_fused", {
      traceId,
      conversationId,
      localMetadataOnly: result.localMetadataOnly,
      profileMode: result.profileMode,
      childProtected: result.childProtected,
      guardianReviewRequired: result.guardianReviewRequired,
      cameraPolicy: result.cameraPolicy,
      microphonePolicy: result.microphonePolicy,
      storagePolicy: result.storagePolicy,
      affectPolicy: result.affectPolicy,
      emotionFactPolicy: result.emotionFactPolicy,
      uncertaintyLabel: result.uncertaintyLabel,
      displayLabel: result.displayLabel,
      confidence: result.confidence,
      inputSignals: result.inputSignals,
      emotionClaimedAsFact: result.emotionClaimedAsFact,
      cameraCaptureStarted: result.cameraCaptureStarted,
      microphoneCaptureStarted: result.microphoneCaptureStarted,
      rawVideoStored: result.rawVideoStored,
      rawAudioStored: result.rawAudioStored,
      liveFaceDetectionStarted: result.liveFaceDetectionStarted,
      liveAffectModelStarted: result.liveAffectModelStarted,
      attentionInferred: result.attentionInferred,
      avatarAnimationStarted: result.avatarAnimationStarted,
      liveNapoleonContacted: result.liveNapoleonContacted,
      memoryWritePerformed: result.memoryWritePerformed,
      approvalCaptured: result.approvalCaptured,
      guardianApprovalCaptured: result.guardianApprovalCaptured,
      agentDispatchPerformed: result.agentDispatchPerformed,
      externalSendPerformed: result.externalSendPerformed,
      blockedEffects: result.blockedEffects,
    });
  }

  function runLocalAvatarModelLoad() {
    const traceId = newTraceId();
    const result = loadLocalAvatarModelReference({ ...localAvatarModelSample, profileMode: profile });
    setAvatarModelResult(result);
    emitEvent("avatar_model_loaded", {
      traceId,
      conversationId,
      localReferenceOnly: result.localReferenceOnly,
      modelLoaded: result.modelLoaded,
      modelFormat: result.modelFormat,
      modelPath: result.modelPath,
      displayName: result.displayName,
      profileMode: result.profileMode,
      childProtected: result.childProtected,
      rendererStarted: result.rendererStarted,
      cameraCaptureStarted: result.cameraCaptureStarted,
      faceDetectionStarted: result.faceDetectionStarted,
      affectInferred: result.affectInferred,
      liveNapoleonContacted: result.liveNapoleonContacted,
      memoryWritePerformed: result.memoryWritePerformed,
      approvalCaptured: result.approvalCaptured,
      guardianApprovalCaptured: result.guardianApprovalCaptured,
      agentDispatchPerformed: result.agentDispatchPerformed,
      externalSendPerformed: result.externalSendPerformed,
      blockedEffects: result.blockedEffects,
    });
  }

  function runLocalAvatarRendererReadiness() {
    const traceId = newTraceId();
    const model = avatarModelResult ?? loadLocalAvatarModelReference({ ...localAvatarModelSample, profileMode: profile });
    if (avatarModelResult === null) {
      setAvatarModelResult(model);
    }
    const result = buildLocalAvatarRendererReadiness({ model });
    setAvatarRendererReadinessResult(result);
    emitEvent("avatar_renderer_readiness_prepared", {
      traceId,
      conversationId,
      localReadinessOnly: result.localReadinessOnly,
      rendererReady: result.rendererReady,
      rendererStarted: result.rendererStarted,
      renderLoopStarted: result.renderLoopStarted,
      canvasAllocated: result.canvasAllocated,
      modelDisplayName: result.modelDisplayName,
      modelFormat: result.modelFormat,
      profileMode: result.profileMode,
      childProtected: result.childProtected,
      cameraCaptureStarted: result.cameraCaptureStarted,
      faceDetectionStarted: result.faceDetectionStarted,
      affectInferred: result.affectInferred,
      liveNapoleonContacted: result.liveNapoleonContacted,
      memoryWritePerformed: result.memoryWritePerformed,
      approvalCaptured: result.approvalCaptured,
      guardianApprovalCaptured: result.guardianApprovalCaptured,
      agentDispatchPerformed: result.agentDispatchPerformed,
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
      clearBridgeReadinessProof();
      clearNapoleonPresentation();
      clearGovernedHandoffResults();
      const discoveryFailed =
        result.connection.failClosedReason === "auth_failure" ||
        result.connection.failClosedReason === "bridge_timeout" ||
        result.connection.failClosedReason === "http_failure";
      emitEvent(discoveryFailed ? "descriptor_discovery_failed" : "descriptor_discovery_completed", {
        traceId: newTraceId(),
        conversationId,
        state: result.connection.state,
        checksumState: result.connection.checksumState,
        signatureState: result.connection.signatureState,
        canAttemptLiveBridge: result.connection.canAttemptLiveBridge,
        failClosedReason: result.connection.failClosedReason ?? "none",
      });
    } catch (error) {
      const failedInput = { endpointConfigured: Boolean(selectedEndpoint), descriptor: null };
      const failedConnection = buildDescriptorConnectionState(failedInput);
      setLiveDescriptorInput(failedInput);
      setDescriptorMode("live");
      setDescriptorDiscoveryMessage("Descriptor discovery failed closed. Concierge will not attempt live bridge calls.");
      clearBridgeReadinessProof();
      clearNapoleonPresentation();
      clearGovernedHandoffResults();
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
    clearNapoleonPresentation();
    clearLocalReviewDrafts();
    clearGovernedHandoffResults();
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
      clearGovernanceReviewHandoff();
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
    clearGovernanceReviewHandoff();
    setLastMemoryReviewState(null);
    setLastMemoryReview(null);
    setMemorySubmission(null);
    setMemorySubmissionFailure(null);
  }

  function emitGovernedTextTurnTraceEvents(input: {
    traceId: string;
    turnId: string;
    profileMode: NapoleonProfileMode;
    reviewState: GovernanceReviewState;
  }) {
    const base = {
      traceId: input.traceId,
      conversationId,
      turnId: input.turnId,
      profile,
      channel: "text",
    };
    const stance = stanceForProfile(profile);
    emitEvent("identity_resolved", {
      ...base,
      profileMode: input.profileMode,
      userProfile: profile,
      source: "local_profile_selector",
      confidence: 1,
    });
    emitEvent("intent_detected", {
      ...base,
      intent: "governed_text_turn",
      target: "napoleon.chief_of_staff",
      source: "local_text_ui",
      confidence: 0.72,
    });
    emitEvent("stance_selected", {
      ...base,
      stance: stance.stance,
      reason: stance.reason,
      confidence: stance.confidence,
    });
    if (profile === "child_protected") {
      emitEvent("child_policy_applied", {
        ...base,
        profileMode: input.profileMode,
        guardianReviewRequired: true,
        secretKeepingAllowed: false,
        memoryWriteAllowed: false,
        approvalCaptureAllowed: false,
        externalSendAllowed: false,
        agentDispatchAllowed: false,
        childSafetyBoundary: "child_protected_text_turn_requires_guardian_owner_review_for_external_or_memory_effects",
      });
    }
    emitEvent("governance_decision", {
      ...base,
      actionType: "prepare_text_response",
      decision: input.reviewState.outcome,
      reason: input.reviewState.rationale,
      outcome: input.reviewState.outcome,
      governanceOutcome: input.reviewState.outcome,
      decisionId: input.reviewState.decisionId,
      auditId: input.reviewState.auditId,
      authorityTier: input.reviewState.authorityTier,
      approvalRequirement: input.reviewState.approvalRequirement,
      blockedEffects: input.reviewState.blockedEffects,
      approvalCaptured: input.reviewState.approvalCaptured,
      source: "local_preflight_before_governed_bridge",
    });
    emitEvent("context_requested", {
      ...base,
      contextType: "napoleon_bridge_contract",
      purpose: "prepare_governed_text_turn",
      source: "governed_descriptor_preflight",
    });
    emitEvent("delegation_requested", {
      ...base,
      targetAgent: "napoleon.chief_of_staff",
      reason: "governed_bridge_text_turn",
      requestKind: "concierge_text_turn",
      agentDispatchPerformed: false,
      externalSendPerformed: false,
    });
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
        clearGovernanceReviewHandoff();
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
      setLastGovernanceReviewState(rehearsal.preview.governanceReview);
      setGovernanceReviewSubmission(null);
      setGovernanceReviewSubmissionFailure(null);
      clearNapoleonPresentation();
      setLastBridgeFailure(null);
      setMemorySubmission(null);
      setMemorySubmissionFailure(null);
      return;
    }

    const traceId = rehearsal?.traceId ?? newTraceId();
    const turnId = rehearsal?.turnId ?? `turn_${Date.now().toString(16)}`;
    const preflight = buildTextTurnContract({ message: content, profile, conversationId, turnId, traceId });
    const reviewState = rehearsal?.preview.governanceReview ?? buildGovernanceReviewState(preflight.governanceDecision, profile);
    const activeProfileMode = mapProfileToNapoleonMode(profile);
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
      setLastGovernanceReviewState(reviewState);
      setGovernanceReviewSubmission(null);
      setGovernanceReviewSubmissionFailure(null);
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

    emitEvent("user_message_received", { traceId, conversationId, turnId, channel: "text", profile });
    emitGovernedTextTurnTraceEvents({ traceId, turnId, profileMode: activeProfileMode, reviewState });

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
        profile,
        profileMode: activeProfileMode,
        responseType: "text",
        governanceOutcome: response.governanceDecision.outcome,
        decisionId: response.governanceDecision.decision_id,
        auditId: response.auditEnvelope.audit_id,
      });
      refreshCapabilityLedgerStatus();
      setLastDecision(decisionView);
      setSuccessfulNapoleonPresentation(response);
      setLastBridgeFailure(null);
      const responseReviewState = buildGovernanceReviewState(response.governanceDecision, profile);
      setLastGovernanceReviewState(responseReviewState);
      setLastReview(describeGovernanceReview(responseReviewState));
      setGovernanceReviewSubmission(null);
      setGovernanceReviewSubmissionFailure(null);
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
          metadata: describeNapoleonTranscriptMetadata(response),
        },
      ]);
    } catch (error) {
      const bridgeError = error instanceof NapoleonBridgeError ? error : null;
      emitEvent("response_failed", {
        traceId,
        conversationId,
        turnId,
        profile,
        profileMode: activeProfileMode,
        error: String(error),
        ...(bridgeError
          ? {
              bridgeFailureReason: bridgeError.reason,
              status: bridgeError.status,
              blockedEffects: bridgeError.blockedEffects,
              decisionId: bridgeError.decisionId,
              auditId: bridgeError.auditId,
              governanceOutcome: bridgeError.governanceOutcome,
            }
          : {}),
      });
      refreshCapabilityLedgerStatus();
      setLastBridgeFailure(describeBridgeFailure(error));
      clearNapoleonPresentation();
      clearGovernanceReviewHandoff();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: describeBridgeFailureTranscriptMessage(error),
          metadata: buildBridgeFailureMessageMetadata(error, activeProfileMode),
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
    if (lastGovernanceReviewState) {
      const acknowledgedReview = buildGovernanceReviewState(
        {
          decision_id: lastGovernanceReviewState.decisionId,
          request_id: `cos_${lastGovernanceReviewState.traceId}`,
          outcome: lastGovernanceReviewState.outcome,
          authority_tier: lastGovernanceReviewState.authorityTier,
          approval_requirement: lastGovernanceReviewState.approvalRequirement,
          rationale: lastGovernanceReviewState.rationale,
          blocked_effects: lastGovernanceReviewState.blockedEffects,
          trace_id: lastGovernanceReviewState.traceId,
          audit_id: lastGovernanceReviewState.auditId,
        },
        lastGovernanceReviewState.profile,
        true,
      );
      setLastGovernanceReviewState(acknowledgedReview);
      setLastReview(describeGovernanceReview(acknowledgedReview));
      emitEvent("governance_review_acknowledged_locally", {
        traceId: acknowledgedReview.traceId,
        conversationId,
        decisionId: acknowledgedReview.decisionId,
        approvalCaptured: acknowledgedReview.approvalCaptured,
      });
      refreshCapabilityLedgerStatus();
    } else {
      setLastReview({
        ...lastReview,
        heading: "Review acknowledged locally",
        body:
          "This local acknowledgement is not Napoleon approval. It does not execute side effects, write memory, send externally, or dispatch agents.",
        actionLabel: "Acknowledged locally",
        canAcknowledge: false,
      });
    }
    setGovernanceReviewSubmission(null);
    setGovernanceReviewSubmissionFailure(null);
  }

  async function submitLastGovernanceReview() {
    if (!lastGovernanceReviewState) return;
    const traceId = newTraceId();
    try {
      const result = await submitGovernanceReviewForNapoleonReview(lastGovernanceReviewState, {
        conversationId,
        traceId,
        rehearsalMode,
        descriptorConnection: currentDescriptorInput(),
      });
      setGovernanceReviewSubmission(result);
      setGovernanceReviewSubmissionFailure(null);
      refreshCapabilityLedgerStatus();
    } catch (error) {
      setGovernanceReviewSubmissionFailure(
        describeGovernedHandoffFailure(error, "Governance review handoff", "capture approval or execute effects"),
      );
      setGovernanceReviewSubmission(null);
      refreshCapabilityLedgerStatus();
    }
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
        rehearsalMode,
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
    setSteeringDraft(null);
    setSteeringSubmission(null);
    setSteeringFailure(null);
    setTaxonomyReviewDraft(null);
    setTaxonomyReviewSubmission(null);
    setTaxonomyReviewFailure(null);
    refreshCapabilityLedgerStatus();
    emitEvent("capability_ledger_cleared", {
      traceId,
      conversationId,
      evidenceCount: 0,
      storage: "local_browser",
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
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
      agentDispatchPerformed: false,
      externalSendPerformed: false,
    });
  }

  function exportBridgeReadinessProof() {
    const traceId = newTraceId();
    const runtimeValidationSource = isLocalHarnessEndpoint(endpoint)
      ? "local_harness"
      : descriptorMode === "live"
        ? "real_runtime"
        : "local_simulation";
    const json = exportBridgeReadinessProofJson({
      descriptorConnection,
      readiness: bridgeEvidenceReadiness,
      runtimeValidationSource,
    });
    const bridgeReadinessProof = JSON.parse(json) as { runtimeValidation?: { promotionGate?: string } };
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
      runtimeValidationSource,
      promotionGate: bridgeReadinessProof.runtimeValidation?.promotionGate ?? "unavailable",
      proofComparisonStatus: comparison.status,
      proofComparisonChangeCount: comparison.changes.length,
      lastEvidenceStatus: bridgeEvidenceReadiness.lastEvidenceStatus ?? "not_run",
      lastFailureReason: bridgeEvidenceReadiness.lastFailureReason ?? "none",
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
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
    const proofDetail = (label: string) => proof?.details.find((detail) => detail.label === label)?.value ?? "unavailable";
    const countReturnedList = (value: string, separator: string) =>
      value === "unavailable" || value === "not returned"
        ? 0
        : value
            .split(separator)
            .map((item) => item.trim())
            .filter(Boolean).length;
    emitEvent("napoleon_response_proof_exported", {
      traceId,
      conversationId,
      status: proof?.status ?? "not_available",
      handledBy: proofDetail("Capability or agents"),
      attributionBoundary: proof ? "Returned bridge provenance only; not local authority." : "unavailable",
      governance: proofDetail("Governance"),
      profileMode: proofDetail("Profile mode"),
      responseTraceId: proofDetail("Trace"),
      responseAuditId: proofDetail("Audit"),
      selectedAgentCount: countReturnedList(proofDetail("Selected agents"), ","),
      selectedAgentSelectionReasonCount: countReturnedList(proofDetail("Why selected"), ";"),
      proofComparisonStatus: comparison.status,
      proofComparisonChangeCount: comparison.changes.length,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
    });
  }

  function exportVoicePipelineProof() {
    const traceId = newTraceId();
    const json = exportGovernedVoicePipelineProofJson(governedVoicePipelinePlan, {
      conversationId,
    });
    const comparison = compareGovernedVoicePipelineProofs(voicePipelineProofJson, json);
    setVoicePipelineProofJson(json);
    setVoicePipelineProofComparison(comparison);
    emitEvent("voice_pipeline_proof_exported", {
      traceId,
      conversationId,
      profileMode: governedVoicePipelinePlan.profileMode,
      proposalOnly: governedVoicePipelinePlan.proposalOnly,
      canStartLiveVoice: governedVoicePipelinePlan.canStartLiveVoice,
      stageCount: governedVoicePipelinePlan.stages.length,
      blockedEffects: governedVoicePipelinePlan.blockedEffects,
      proofComparisonStatus: comparison.status,
      proofComparisonChangeCount: comparison.changes.length,
      microphoneCaptureStarted: governedVoicePipelinePlan.microphoneCaptureStarted,
      audioPlaybackStarted: governedVoicePipelinePlan.audioPlaybackStarted,
      rawAudioStored: governedVoicePipelinePlan.rawAudioStored,
      liveNapoleonContacted: governedVoicePipelinePlan.liveNapoleonContacted,
      approvalCaptured: governedVoicePipelinePlan.approvalCaptured,
      memoryWritePerformed: governedVoicePipelinePlan.memoryWritePerformed,
      agentDispatchPerformed: governedVoicePipelinePlan.agentDispatchPerformed,
      externalSendPerformed: governedVoicePipelinePlan.externalSendPerformed,
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
        rehearsalMode,
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
      profile,
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
        rehearsalMode,
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
      !rehearsalMode &&
      input.trim() === pendingRehearsal.content &&
      pendingRehearsal.preview.governanceReview.canSendAdvisory &&
      descriptorConnection.canAttemptLiveBridge,
  );
  const taxonomyCounts = getTaxonomyLabelCounts(capabilityLedger.listRecent(), capabilityTaxonomy);
  const taxonomyRows = (Object.keys(taxonomyCounts) as TaxonomyDimension[]).flatMap((dimension) =>
    taxonomyCounts[dimension].map((row) => ({ ...row, value: `${dimension}:${row.label}` })),
  );
  const selectedTaxonomyRow = taxonomyRows.find((row) => row.value === selectedTaxonomyLabel);
  const runtimeValidationSource = isLocalHarnessEndpoint(endpoint)
    ? "local_harness"
    : descriptorMode === "live"
      ? "real_runtime"
      : "local_simulation";
  const liveBridgeReadiness = describeLiveBridgeReadiness({
    descriptorConnection,
    evidenceCaptureState: bridgeEvidenceReadiness.captureState,
    evidenceComparisonState: bridgeEvidenceReadiness.comparisonState,
    lastEvidenceStatus: bridgeEvidenceReadiness.lastEvidenceStatus,
    lastFailureReason: bridgeEvidenceReadiness.lastFailureReason,
    runtimeValidationSource,
  });
  const liveVoiceReadiness = describeLiveVoiceReadiness({
    descriptorConnection,
    microphoneEnabled,
    microphonePermissionStatus,
    evidenceCaptureState: bridgeEvidenceReadiness.captureState,
    evidenceComparisonState: bridgeEvidenceReadiness.comparisonState,
    runtimeValidationSource,
    rehearsalMode,
  });
  const governedVoicePipelinePlan = buildGovernedVoicePipelinePlan({ profileMode: mapProfileToNapoleonMode(profile) });
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
    describeTaxonomyReviewBridgeSummary(),
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
  const wakeWordReadiness = buildLocalWakeWordReadiness({
    enabled: wakeWordEnabled,
    profileMode: profile,
  });
  const wakeWordSummary = wakeWordReadiness.enabled
    ? "Wake word option enabled; capture stopped."
    : "Wake word disabled";
  const wakeWordSampleSummary =
    wakeWordDetectionSampleResult === null
      ? "Wake word sample not run"
      : wakeWordDetectionSampleResult.detected
        ? `Sample detection: detected at ${wakeWordDetectionSampleResult.detectedAtMs} ms, confidence ${wakeWordDetectionSampleResult.confidence}`
        : "Sample detection: not detected";
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
  const avatarExpressionSummary =
    avatarExpressionResult === null
      ? "Expression not mapped"
      : `Expression: ${avatarExpressionResult.expression}`;
  const avatarLipSyncSummary =
    avatarLipSyncResult === null
      ? "Lip sync not prepared"
      : `Mouth cues: ${avatarLipSyncResult.mouthCues.length}`;
  const avatarGazeSummary =
    avatarGazeResult === null
      ? "Gaze target not simulated"
      : `Eye target: ${avatarGazeResult.eyeTarget}`;
  const avatarFacePoseSummary =
    avatarFacePoseResult === null
      ? "Face pose not estimated"
      : `Face present: ${avatarFacePoseResult.facePresent ? "yes" : "no"}`;
  const avatarAffectFusionSummary =
    avatarAffectFusionResult === null
      ? "Affect signal not fused"
      : `Uncertainty label: ${avatarAffectFusionResult.displayLabel}`;
  const avatarModelSummary =
    avatarModelResult === null
      ? "Avatar model not loaded"
      : `Model loaded: ${avatarModelResult.displayName}`;
  const avatarRendererReadinessSummary =
    avatarRendererReadinessResult === null
      ? "Renderer readiness not prepared"
      : `Renderer ready: ${avatarRendererReadinessResult.rendererReady ? "yes" : "no"}`;
  const cameraCaptureSummary = !cameraEnabled
    ? "Camera capture blocked: camera setting is off and OS permission is not granted."
    : cameraPermissionStatus !== "granted"
      ? "Camera capture blocked: OS camera permission is not granted."
      : "Camera capture ready but stopped; avatar/camera mode is not active.";
  const avatarPrivacyDashboard = buildAvatarPrivacyDashboard({
    profileMode: profile,
    telemetryEnabled,
    cameraEnabled,
    microphoneEnabled,
    avatarAffectEnabled,
    rawMediaStorageEnabled,
  });
  const napoleonDelegationView = lastNapoleonPresentation.delegation ?? describeDelegation(undefined);

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
            onChange={(e) => updateDescriptorMode(e.target.value as typeof descriptorMode)}
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
            onChange={(e) => updateRehearsalMode(e.target.checked)}
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
        <label>
          Wake word
          <input
            type="checkbox"
            checked={wakeWordEnabled}
            onChange={(e) => updatePrivacySetting("wake_word", e.target.checked)}
          />
        </label>
        <span className="capture">
          Local telemetry {telemetryEnabled ? "on" : "off"}, camera {cameraEnabled ? "on" : "off"},
          microphone {microphoneEnabled ? "on" : "off"}
        </span>
        <span className="capture">Wake word {wakeWordEnabled ? "on" : "off"}</span>
      </section>

      <section className="contract-status" aria-label="Local telemetry buffer">
        <div>
          <strong>Local telemetry buffer</strong>
          <span>browser-local redacted metadata only</span>
        </div>
        <div>
          <strong>Buffered events</strong>
          <span>Buffered events: {telemetryBufferCount} of {telemetryBufferRetentionLimit}</span>
        </div>
        <div>
          <strong>Last event</strong>
          <span>Last event: {telemetryBufferLastEvent}</span>
        </div>
        <div>
          <strong>Latest interaction trace</strong>
          <span>Latest trace: {latestInteractionTraceId ?? "unavailable"}</span>
        </div>
        <label>
          Telemetry buffer retention
          <select
            value={telemetryBufferRetentionLimit}
            onChange={(event) => updateTelemetryBufferRetentionLimit(Number(event.target.value))}
          >
            {TELEMETRY_BUFFER_RETENTION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                Latest {option}
              </option>
            ))}
          </select>
        </label>
        <div>
          <strong>Export boundary</strong>
          <span>Export boundary: local metadata only; not Napoleon approval.</span>
        </div>
        <button className="secondary" onClick={exportLocalTelemetryBuffer}>
          Export telemetry buffer
        </button>
        <button className="secondary" disabled={!latestInteractionTraceId} onClick={exportLatestInteractionTrace}>
          Export latest trace
        </button>
        <button className="secondary" onClick={clearLocalTelemetryBuffer}>
          Clear telemetry buffer
        </button>
        {telemetryBufferExportJson ? (
          <textarea
            className="proof-export"
            aria-label="Telemetry buffer export"
            readOnly
            value={telemetryBufferExportJson}
          />
        ) : null}
        {interactionTraceExportJson ? (
          <textarea
            className="proof-export"
            aria-label="Latest interaction trace export"
            readOnly
            value={interactionTraceExportJson}
          />
        ) : null}
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
        <div>
          <strong>{liveVoiceReadiness.heading}</strong>
          <span>{liveVoiceReadiness.summary}</span>
          <span>{liveVoiceReadiness.caveat}</span>
        </div>
        {liveVoiceReadiness.items.map((item) => (
          <div key={item.label}>
            <strong>{item.label}</strong>
            <span>{item.label}: {item.status}</span>
            <span>{item.detail}</span>
          </div>
        ))}
        <div>
          <strong>Live voice blocked effects</strong>
          <span>Blocked effects: {liveVoiceReadiness.blockedEffects.join(", ")}</span>
        </div>
        <div>
          <strong>Governed voice pipeline plan</strong>
          <span>Proposal only: {governedVoicePipelinePlan.proposalOnly ? "yes" : "no"}</span>
          <span>Live voice can start: {governedVoicePipelinePlan.canStartLiveVoice ? "yes" : "no"}</span>
          <span>{governedVoicePipelinePlan.authorityBoundary}</span>
        </div>
        {governedVoicePipelinePlan.stages.map((stage) => (
          <div key={stage.id}>
            <strong>{stage.label}</strong>
            <span>{stage.label}: {stage.status}</span>
            <span>Required proof: {stage.requiredProof}</span>
            <span>{stage.authorityBoundary}</span>
          </div>
        ))}
        <button className="secondary" onClick={exportVoicePipelineProof}>
          Export voice pipeline proof
        </button>
        {voicePipelineProofComparison ? (
          <div className={`proof-comparison ${voicePipelineProofComparison.status}`}>
            <strong>Voice pipeline proof comparison</strong>
            <span>{voicePipelineProofComparison.summary}</span>
            <span>Comparison uses local sanitized voice pipeline proof metadata only and is not Napoleon approval.</span>
            {voicePipelineProofComparison.changes.length > 0 ? (
              <dl>
                {voicePipelineProofComparison.changes.map((change) => (
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
        {voicePipelineProofJson ? (
          <pre aria-label="Exported voice pipeline proof">{voicePipelineProofJson}</pre>
        ) : null}
        <button className="secondary" onClick={() => void requestMicrophonePermission()}>
          Request microphone permission
        </button>
      </section>

      <section className="contract-status" aria-label="Wake word readiness">
        <div>
          <strong>Wake word readiness</strong>
          <span>local option only</span>
        </div>
        <div>
          <strong>Option state</strong>
          <span>{wakeWordSummary}</span>
        </div>
        <div>
          <strong>Phrase</strong>
          <span>Phrase: {wakeWordReadiness.phrase}</span>
        </div>
        <div>
          <strong>Listening</strong>
          <span>Listening started: no</span>
        </div>
        <div>
          <strong>Capture</strong>
          <span>Microphone capture started: no</span>
        </div>
        <div>
          <strong>Storage</strong>
          <span>Raw audio stored: no</span>
        </div>
        <div>
          <strong>Napoleon contact</strong>
          <span>Live Napoleon contacted: {wakeWordReadiness.liveNapoleonContacted ? "yes" : "no"}</span>
        </div>
        <div>
          <strong>Agent dispatch</strong>
          <span>Agent dispatch: {wakeWordReadiness.agentDispatchPerformed ? "yes" : "no"}</span>
        </div>
        <div>
          <strong>Sample state</strong>
          <span>{wakeWordSampleSummary}</span>
        </div>
        {wakeWordDetectionSampleResult ? (
          <>
            <div>
              <strong>Local sample</strong>
              <span>Local sample only: {wakeWordDetectionSampleResult.localSampleOnly ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Sample boundary</strong>
              <span>Authority boundary: {wakeWordDetectionSampleResult.authorityBoundary}</span>
            </div>
          </>
        ) : null}
        <div>
          <strong>Authority boundary</strong>
          <span>Authority boundary: {wakeWordReadiness.authorityBoundary}</span>
        </div>
        {wakeWordReadiness.childProtected ? (
          <div>
            <strong>Guardian review</strong>
            <span>Guardian review reminder: yes</span>
          </div>
        ) : null}
        <div>
          <strong>Blocked effects</strong>
          <span>Blocked effects: {wakeWordReadiness.blockedEffects.join(", ")}</span>
        </div>
        <button className="secondary" onClick={runLocalWakeWordSample}>
          Run local wake word sample
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
              <strong>Latency</strong>
              <span>Latency: {voiceTurnRehearsalResult.latency.totalMs}ms local sample total</span>
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
              <strong>Agent dispatch</strong>
              <span>Agent dispatch: {bargeInRehearsalResult.agentDispatchPerformed ? "yes" : "no"}</span>
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
        <div>
          <strong>Napoleon contact</strong>
          <span>Napoleon contact: no</span>
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
              <strong>Agent dispatch</strong>
              <span>Agent dispatch: {voiceResponseShapeResult.agentDispatchPerformed ? "yes" : "no"}</span>
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
              <strong>Profile</strong>
              <span>Profile: {neutralAvatarStateResult.profileMode}</span>
            </div>
            <div>
              <strong>Child protected</strong>
              <span>Child protected: {neutralAvatarStateResult.childProtected ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Camera policy</strong>
              <span>Camera policy: {neutralAvatarStateResult.cameraPolicy}</span>
            </div>
            <div>
              <strong>Affect policy</strong>
              <span>Affect policy: {neutralAvatarStateResult.affectPolicy}</span>
            </div>
            <div>
              <strong>Guardian reminder</strong>
              <span>Guardian reminder: {neutralAvatarStateResult.guardianReviewReminder}</span>
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
              <strong>Napoleon contact</strong>
              <span>Live Napoleon contacted: {neutralAvatarStateResult.liveNapoleonContacted ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Guardian approval</strong>
              <span>Guardian approval captured: no</span>
            </div>
            <div>
              <strong>Agent dispatch</strong>
              <span>Agent dispatch: {neutralAvatarStateResult.agentDispatchPerformed ? "yes" : "no"}</span>
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

      <section className="contract-status" aria-label="Avatar expression">
        <div>
          <strong>Avatar expression</strong>
          <span>local stance metadata only</span>
        </div>
        <div>
          <strong>Expression state</strong>
          <span>{avatarExpressionSummary}</span>
        </div>
        <div>
          <strong>Animation</strong>
          <span>Avatar animation started: no</span>
        </div>
        {avatarExpressionResult ? (
          <>
            <div>
              <strong>Stance</strong>
              <span>Stance: {avatarExpressionResult.stance}</span>
            </div>
            <div>
              <strong>Profile</strong>
              <span>Profile: {avatarExpressionResult.profileMode}</span>
            </div>
            <div>
              <strong>Child protected</strong>
              <span>Child protected: {avatarExpressionResult.childProtected ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Affect</strong>
              <span>Affect inferred: no</span>
            </div>
            <div>
              <strong>Napoleon contact</strong>
              <span>Live Napoleon contacted: {avatarExpressionResult.liveNapoleonContacted ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Authority boundary</strong>
              <span>Authority boundary: {avatarExpressionResult.authorityBoundary}</span>
            </div>
            <div>
              <strong>Guardian reminder</strong>
              <span>Guardian reminder: {avatarExpressionResult.guardianReviewReminder}</span>
            </div>
            <div>
              <strong>Agent dispatch</strong>
              <span>Agent dispatch: {avatarExpressionResult.agentDispatchPerformed ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Blocked effects</strong>
              <span>Blocked effects: {avatarExpressionResult.blockedEffects.join(", ")}</span>
            </div>
          </>
        ) : null}
        <button className="secondary" onClick={runLocalAvatarExpressionMapping}>
          Map sample stance to expression
        </button>
      </section>

      <section className="contract-status" aria-label="Avatar lip sync">
        <div>
          <strong>Avatar lip sync</strong>
          <span>local amplitude metadata only</span>
        </div>
        <div>
          <strong>Lip sync state</strong>
          <span>{avatarLipSyncSummary}</span>
        </div>
        <div>
          <strong>Animation</strong>
          <span>Avatar animation started: no</span>
        </div>
        {avatarLipSyncResult ? (
          <>
            <div>
              <strong>Peak mouth open</strong>
              <span>Peak mouth open: {avatarLipSyncResult.peakMouthOpen}</span>
            </div>
            <div>
              <strong>Duration</strong>
              <span>Duration: {avatarLipSyncResult.durationMs}ms</span>
            </div>
            <div>
              <strong>Profile</strong>
              <span>Profile: {avatarLipSyncResult.profileMode}</span>
            </div>
            <div>
              <strong>Child protected</strong>
              <span>Child protected: {avatarLipSyncResult.childProtected ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Audio playback</strong>
              <span>Audio playback started: no</span>
            </div>
            <div>
              <strong>Camera capture</strong>
              <span>Camera capture started: no</span>
            </div>
            <div>
              <strong>Napoleon contact</strong>
              <span>Live Napoleon contacted: no</span>
            </div>
            <div>
              <strong>Authority boundary</strong>
              <span>Authority boundary: {avatarLipSyncResult.authorityBoundary}</span>
            </div>
            <div>
              <strong>Guardian reminder</strong>
              <span>Guardian reminder: {avatarLipSyncResult.guardianReviewReminder}</span>
            </div>
            <div>
              <strong>Agent dispatch</strong>
              <span>Agent dispatch: {avatarLipSyncResult.agentDispatchPerformed ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Blocked effects</strong>
              <span>Blocked effects: {avatarLipSyncResult.blockedEffects.join(", ")}</span>
            </div>
          </>
        ) : null}
        <button className="secondary" onClick={runLocalAvatarLipSyncBaseline}>
          Prepare local lip sync
        </button>
      </section>

      <section className="contract-status" aria-label="Avatar gaze">
        <div>
          <strong>Avatar gaze</strong>
          <span>local UI metadata only</span>
        </div>
        <div>
          <strong>Gaze state</strong>
          <span>{avatarGazeSummary}</span>
        </div>
        <div>
          <strong>Camera capture</strong>
          <span>Camera capture started: no</span>
        </div>
        {avatarGazeResult ? (
          <>
            <div>
              <strong>Horizontal offset</strong>
              <span>Horizontal offset: {avatarGazeResult.horizontalOffset}</span>
            </div>
            <div>
              <strong>Vertical offset</strong>
              <span>Vertical offset: {avatarGazeResult.verticalOffset}</span>
            </div>
            <div>
              <strong>Confidence</strong>
              <span>Confidence: {avatarGazeResult.confidence}</span>
            </div>
            <div>
              <strong>Profile</strong>
              <span>Profile: {avatarGazeResult.profileMode}</span>
            </div>
            <div>
              <strong>Child protected</strong>
              <span>Child protected: {avatarGazeResult.childProtected ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Guardian review</strong>
              <span>Guardian review required: {avatarGazeResult.guardianReviewRequired ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Camera policy</strong>
              <span>Camera policy: {avatarGazeResult.cameraPolicy}</span>
            </div>
            <div>
              <strong>Animation policy</strong>
              <span>Animation policy: {avatarGazeResult.animationPolicy}</span>
            </div>
            <div>
              <strong>Attention policy</strong>
              <span>Attention policy: {avatarGazeResult.attentionPolicy}</span>
            </div>
            <div>
              <strong>Gaze tracking</strong>
              <span>Gaze tracking started: no</span>
            </div>
            <div>
              <strong>Animation</strong>
              <span>Avatar animation started: no</span>
            </div>
            <div>
              <strong>Napoleon contact</strong>
              <span>Live Napoleon contacted: no</span>
            </div>
            <div>
              <strong>Authority boundary</strong>
              <span>Authority boundary: {avatarGazeResult.authorityBoundary}</span>
            </div>
            <div>
              <strong>Guardian reminder</strong>
              <span>Guardian reminder: {avatarGazeResult.guardianReviewReminder}</span>
            </div>
            <div>
              <strong>Agent dispatch</strong>
              <span>Agent dispatch: {avatarGazeResult.agentDispatchPerformed ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Blocked effects</strong>
              <span>Blocked effects: {avatarGazeResult.blockedEffects.join(", ")}</span>
            </div>
          </>
        ) : null}
        <button className="secondary" onClick={runLocalAvatarGazeSimulation}>
          Simulate local gaze
        </button>
      </section>

      <section className="contract-status" aria-label="Avatar face pose">
        <div>
          <strong>Avatar face pose</strong>
          <span>local sample metadata only</span>
        </div>
        <div>
          <strong>Face pose state</strong>
          <span>{avatarFacePoseSummary}</span>
        </div>
        <div>
          <strong>Camera capture</strong>
          <span>Camera capture started: no</span>
        </div>
        <div>
          <strong>Napoleon contact</strong>
          <span>Live Napoleon contacted: no</span>
        </div>
        {avatarFacePoseResult ? (
          <>
            <div>
              <strong>Head yaw</strong>
              <span>Head yaw: {avatarFacePoseResult.headYawDegrees}deg</span>
            </div>
            <div>
              <strong>Head pitch</strong>
              <span>Head pitch: {avatarFacePoseResult.headPitchDegrees}deg</span>
            </div>
            <div>
              <strong>Head roll</strong>
              <span>Head roll: {avatarFacePoseResult.headRollDegrees}deg</span>
            </div>
            <div>
              <strong>Confidence</strong>
              <span>Confidence: {avatarFacePoseResult.confidence}</span>
            </div>
            <div>
              <strong>Profile</strong>
              <span>Profile: {avatarFacePoseResult.profileMode}</span>
            </div>
            <div>
              <strong>Child protected</strong>
              <span>Child protected: {avatarFacePoseResult.childProtected ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Guardian review</strong>
              <span>Guardian review required: {avatarFacePoseResult.guardianReviewRequired ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Camera policy</strong>
              <span>Camera policy: {avatarFacePoseResult.cameraPolicy}</span>
            </div>
            <div>
              <strong>Face pose policy</strong>
              <span>Face pose policy: {avatarFacePoseResult.facePosePolicy}</span>
            </div>
            <div>
              <strong>Affect policy</strong>
              <span>Affect policy: {avatarFacePoseResult.affectPolicy}</span>
            </div>
            <div>
              <strong>Attention policy</strong>
              <span>Attention policy: {avatarFacePoseResult.attentionPolicy}</span>
            </div>
            <div>
              <strong>Raw video</strong>
              <span>Raw video stored: no</span>
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
              <strong>Attention</strong>
              <span>Attention inferred: no</span>
            </div>
            <div>
              <strong>Agent dispatch</strong>
              <span>Agent dispatch: {avatarFacePoseResult.agentDispatchPerformed ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Authority boundary</strong>
              <span>Authority boundary: {avatarFacePoseResult.authorityBoundary}</span>
            </div>
            <div>
              <strong>Guardian reminder</strong>
              <span>Guardian reminder: {avatarFacePoseResult.guardianReviewReminder}</span>
            </div>
            <div>
              <strong>Blocked effects</strong>
              <span>Blocked effects: {avatarFacePoseResult.blockedEffects.join(", ")}</span>
            </div>
          </>
        ) : null}
        <button className="secondary" onClick={runLocalAvatarFacePoseEstimate}>
          Estimate local face pose
        </button>
      </section>

      <section className="contract-status" aria-label="Avatar affect fusion">
        <div>
          <strong>Avatar affect fusion</strong>
          <span>local uncertainty metadata only</span>
        </div>
        <div>
          <strong>Affect state</strong>
          <span>{avatarAffectFusionSummary}</span>
        </div>
        <div>
          <strong>Emotion fact</strong>
          <span>Emotion claimed as fact: no</span>
        </div>
        <div>
          <strong>Napoleon contact</strong>
          <span>Live Napoleon contacted: no</span>
        </div>
        {avatarAffectFusionResult ? (
          <>
            <div>
              <strong>Confidence</strong>
              <span>Confidence: {avatarAffectFusionResult.confidence}</span>
            </div>
            <div>
              <strong>Input signals</strong>
              <span>Input signals: {avatarAffectFusionResult.inputSignals.join(", ")}</span>
            </div>
            <div>
              <strong>Rationale</strong>
              <span>Rationale: {avatarAffectFusionResult.rationale.join(" ")}</span>
            </div>
            <div>
              <strong>Profile</strong>
              <span>Profile: {avatarAffectFusionResult.profileMode}</span>
            </div>
            <div>
              <strong>Child protected</strong>
              <span>Child protected: {avatarAffectFusionResult.childProtected ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Guardian review</strong>
              <span>Guardian review required: {avatarAffectFusionResult.guardianReviewRequired ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Camera policy</strong>
              <span>Camera policy: {avatarAffectFusionResult.cameraPolicy}</span>
            </div>
            <div>
              <strong>Microphone policy</strong>
              <span>Microphone policy: {avatarAffectFusionResult.microphonePolicy}</span>
            </div>
            <div>
              <strong>Storage policy</strong>
              <span>Storage policy: {avatarAffectFusionResult.storagePolicy}</span>
            </div>
            <div>
              <strong>Affect policy</strong>
              <span>Affect policy: {avatarAffectFusionResult.affectPolicy}</span>
            </div>
            <div>
              <strong>Emotion fact policy</strong>
              <span>Emotion fact policy: {avatarAffectFusionResult.emotionFactPolicy}</span>
            </div>
            <div>
              <strong>Camera capture</strong>
              <span>Camera capture started: no</span>
            </div>
            <div>
              <strong>Microphone capture</strong>
              <span>Microphone capture started: no</span>
            </div>
            <div>
              <strong>Raw video</strong>
              <span>Raw video stored: no</span>
            </div>
            <div>
              <strong>Raw audio</strong>
              <span>Raw audio stored: no</span>
            </div>
            <div>
              <strong>Face detection</strong>
              <span>Live face detection started: no</span>
            </div>
            <div>
              <strong>Affect model</strong>
              <span>Live affect model started: no</span>
            </div>
            <div>
              <strong>Attention</strong>
              <span>Attention inferred: no</span>
            </div>
            <div>
              <strong>Agent dispatch</strong>
              <span>Agent dispatch: {avatarAffectFusionResult.agentDispatchPerformed ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Authority boundary</strong>
              <span>Authority boundary: {avatarAffectFusionResult.authorityBoundary}</span>
            </div>
            <div>
              <strong>Guardian reminder</strong>
              <span>Guardian reminder: {avatarAffectFusionResult.guardianReviewReminder}</span>
            </div>
            <div>
              <strong>Blocked effects</strong>
              <span>Blocked effects: {avatarAffectFusionResult.blockedEffects.join(", ")}</span>
            </div>
          </>
        ) : null}
        <button className="secondary" onClick={runLocalAvatarAffectFusion}>
          Fuse local affect signal
        </button>
      </section>

      <section className="contract-status" aria-label="Avatar model">
        <div>
          <strong>Avatar model</strong>
          <span>local model reference only</span>
        </div>
        <div>
          <strong>Model state</strong>
          <span>{avatarModelSummary}</span>
        </div>
        <div>
          <strong>Renderer</strong>
          <span>Renderer started: no</span>
        </div>
        {avatarModelResult ? (
          <>
            <div>
              <strong>Model format</strong>
              <span>Model format: {avatarModelResult.modelFormat}</span>
            </div>
            <div>
              <strong>Model path</strong>
              <span>Model path: {avatarModelResult.modelPath}</span>
            </div>
            <div>
              <strong>Profile</strong>
              <span>Profile: {avatarModelResult.profileMode}</span>
            </div>
            <div>
              <strong>Child protected</strong>
              <span>Child protected: {avatarModelResult.childProtected ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Guardian reminder</strong>
              <span>Guardian reminder: {avatarModelResult.guardianReviewReminder}</span>
            </div>
            <div>
              <strong>Camera capture</strong>
              <span>Camera capture started: no</span>
            </div>
            <div>
              <strong>Affect</strong>
              <span>Affect inferred: no</span>
            </div>
            <div>
              <strong>Napoleon contact</strong>
              <span>Live Napoleon contacted: no</span>
            </div>
            <div>
              <strong>Agent dispatch</strong>
              <span>Agent dispatch: {avatarModelResult.agentDispatchPerformed ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Blocked effects</strong>
              <span>Blocked effects: {avatarModelResult.blockedEffects.join(", ")}</span>
            </div>
          </>
        ) : null}
        <button className="secondary" onClick={runLocalAvatarModelLoad}>
          Load local avatar model
        </button>
      </section>

      <section className="contract-status" aria-label="Avatar renderer">
        <div>
          <strong>Avatar renderer</strong>
          <span>local readiness only</span>
        </div>
        <div>
          <strong>Renderer state</strong>
          <span>{avatarRendererReadinessSummary}</span>
        </div>
        <div>
          <strong>Renderer started</strong>
          <span>Renderer started: no</span>
        </div>
        {avatarRendererReadinessResult ? (
          <>
            <div>
              <strong>Model</strong>
              <span>Model: {avatarRendererReadinessResult.modelDisplayName}</span>
            </div>
            <div>
              <strong>Render loop</strong>
              <span>Render loop started: no</span>
            </div>
            <div>
              <strong>Canvas</strong>
              <span>Canvas allocated: no</span>
            </div>
            <div>
              <strong>Profile</strong>
              <span>Profile: {avatarRendererReadinessResult.profileMode}</span>
            </div>
            <div>
              <strong>Child protected</strong>
              <span>Child protected: {avatarRendererReadinessResult.childProtected ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Guardian reminder</strong>
              <span>Guardian reminder: {avatarRendererReadinessResult.guardianReviewReminder}</span>
            </div>
            <div>
              <strong>Camera capture</strong>
              <span>Camera capture started: no</span>
            </div>
            <div>
              <strong>Napoleon contact</strong>
              <span>Live Napoleon contacted: no</span>
            </div>
            <div>
              <strong>Agent dispatch</strong>
              <span>Agent dispatch: {avatarRendererReadinessResult.agentDispatchPerformed ? "yes" : "no"}</span>
            </div>
            <div>
              <strong>Blocked effects</strong>
              <span>Blocked effects: {avatarRendererReadinessResult.blockedEffects.join(", ")}</span>
            </div>
          </>
        ) : null}
        <button className="secondary" onClick={runLocalAvatarRendererReadiness}>
          Prepare renderer readiness
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

      <section className="contract-status" aria-label="Avatar privacy dashboard">
        <div>
          <strong>Avatar privacy dashboard</strong>
          <span>local controls only</span>
        </div>
        <label>
          Avatar affect
          <input
            type="checkbox"
            checked={avatarAffectEnabled}
            onChange={(e) => updatePrivacySetting("avatar_affect", e.target.checked)}
          />
        </label>
        <label>
          Raw media storage
          <input
            type="checkbox"
            checked={rawMediaStorageEnabled}
            onChange={(e) => updatePrivacySetting("raw_media_storage", e.target.checked)}
          />
        </label>
        <div>
          <strong>Camera control</strong>
          <span>Camera control: {avatarPrivacyDashboard.cameraControl}</span>
        </div>
        <div>
          <strong>Microphone control</strong>
          <span>Microphone control: {avatarPrivacyDashboard.microphoneControl}</span>
        </div>
        <div>
          <strong>Affect control</strong>
          <span>Affect control: {avatarPrivacyDashboard.affectControl}</span>
        </div>
        <div>
          <strong>Raw media storage</strong>
          <span>Raw media storage: {avatarPrivacyDashboard.rawMediaStorageControl}</span>
        </div>
        <div>
          <strong>Telemetry control</strong>
          <span>Telemetry control: {avatarPrivacyDashboard.telemetryControl}</span>
        </div>
        <div>
          <strong>Camera capture</strong>
          <span>Camera capture started: no</span>
        </div>
        <div>
          <strong>Microphone capture</strong>
          <span>Microphone capture started: no</span>
        </div>
        <div>
          <strong>Raw video</strong>
          <span>Raw video stored: no</span>
        </div>
        <div>
          <strong>Raw audio</strong>
          <span>Raw audio stored: no</span>
        </div>
        <div>
          <strong>Affect model</strong>
          <span>Live affect model started: no</span>
        </div>
        <div>
          <strong>Emotion fact</strong>
          <span>Emotion claimed as fact: no</span>
        </div>
        <div>
          <strong>Napoleon contact</strong>
          <span>Live Napoleon contacted: no</span>
        </div>
        <div>
          <strong>Agent dispatch</strong>
          <span>Agent dispatch: {avatarPrivacyDashboard.agentDispatchPerformed ? "yes" : "no"}</span>
        </div>
        <div>
          <strong>Authority boundary</strong>
          <span>Authority boundary: {avatarPrivacyDashboard.authorityBoundary}</span>
        </div>
        <div>
          <strong>Guardian reminder</strong>
          <span>Guardian reminder: {avatarPrivacyDashboard.guardianReviewReminder}</span>
        </div>
        <div>
          <strong>Blocked effects</strong>
          <span>Blocked effects: {avatarPrivacyDashboard.blockedEffects.join(", ")}</span>
        </div>
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
                {operation.id !== operation.operationId ? <span>Canonical operation: {operation.operationId}</span> : null}
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
            <span>{steeringHandoffReadiness.summary}</span>
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
            disabled={!steeringHandoffReadiness.canSubmit}
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
              <dt>Blocked effects</dt>
              <dd>{steeringSubmission.governanceDecision.blocked_effects.join(", ")}</dd>
              <dt>Local effects</dt>
              <dd>not applied; no memory write; no approval captured; no agent dispatch; no external send.</dd>
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
              <dt>Blocked effects</dt>
              <dd>{taxonomyReviewSubmission.governanceDecision.blocked_effects.join(", ")}</dd>
              <dt>Local effects</dt>
              <dd>not applied; no memory write; no approval captured; no agent dispatch; no external send.</dd>
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
                {m.metadata.source ? (
                  <>
                    <dt>Source</dt>
                    <dd>{m.metadata.source}</dd>
                  </>
                ) : null}
                {m.metadata.attributionBoundary ? (
                  <>
                    <dt>Attribution</dt>
                    <dd>{m.metadata.attributionBoundary}</dd>
                  </>
                ) : null}
                {m.metadata.targetCapability ? (
                  <>
                    <dt>Capability</dt>
                    <dd>{m.metadata.targetCapability}</dd>
                  </>
                ) : null}
                {m.metadata.governanceOutcome ? (
                  <>
                    <dt>Governance</dt>
                    <dd>{m.metadata.governanceOutcome}</dd>
                  </>
                ) : null}
                {m.metadata.profileMode ? (
                  <>
                    <dt>Profile mode</dt>
                    <dd>{m.metadata.profileMode}</dd>
                  </>
                ) : null}
                {m.metadata.decisionId ? (
                  <>
                    <dt>Decision</dt>
                    <dd>{m.metadata.decisionId}</dd>
                  </>
                ) : null}
                {m.metadata.auditId ? (
                  <>
                    <dt>Audit</dt>
                    <dd>{m.metadata.auditId}</dd>
                  </>
                ) : null}
                {m.metadata.blockedEffects ? (
                  <>
                    <dt>Blocked effects</dt>
                    <dd>{m.metadata.blockedEffects.join(", ")}</dd>
                  </>
                ) : null}
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

      <section className="delegation" aria-label="Napoleon delegation">
        <div className="review-heading">
          <strong>{napoleonDelegationView.heading}</strong>
          <span>{napoleonDelegationView.body}</span>
        </div>
        <dl>
          {napoleonDelegationView.details.map((detail) => (
            <div key={detail.label}>
              <dt>{detail.label}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>
      </section>

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
          <section className={`send-preflight ${governanceReviewHandoffReadiness.status}`}>
            <div>
              <strong>{governanceReviewHandoffReadiness.heading}</strong>
              <span>{governanceReviewHandoffReadiness.summary}</span>
              <span>{governanceReviewHandoffReadiness.caveat}</span>
            </div>
            <dl>
              {governanceReviewHandoffReadiness.items.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>
                    {item.status}: {item.detail}
                  </dd>
                </div>
              ))}
              <div>
                <dt>Blocked effects</dt>
                <dd>{governanceReviewHandoffReadiness.blockedEffects.join(", ")}</dd>
              </div>
            </dl>
          </section>
          <div className="review-actions">
            <button className="secondary" disabled={!lastReview.canAcknowledge} onClick={acknowledgeLastReview}>
              {lastReview.actionLabel}
            </button>
            <button
              className="secondary"
              disabled={!lastGovernanceReviewState || !governanceReviewHandoffReadiness.canSubmit}
              onClick={submitLastGovernanceReview}
            >
              Send governance review to Napoleon
            </button>
          </div>
          {governanceReviewSubmissionFailure ? <p className="warning">{governanceReviewSubmissionFailure}</p> : null}
          {governanceReviewSubmission ? (
            <dl>
              <dt>Napoleon review response</dt>
              <dd>{governanceReviewSubmission.text}</dd>
              <dt>Governance</dt>
              <dd>
                {governanceReviewSubmission.governanceDecision.outcome}, decision{" "}
                {governanceReviewSubmission.governanceDecision.decision_id}
              </dd>
              <dt>Trace</dt>
              <dd>{governanceReviewSubmission.traceEnvelope.trace_id}</dd>
              <dt>Audit</dt>
              <dd>{governanceReviewSubmission.auditEnvelope.audit_id}</dd>
              <dt>Local effects</dt>
              <dd>no approval captured; no memory write; no agent dispatch; no external send; no local application.</dd>
            </dl>
          ) : null}
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
              <dd>no memory write; no approval captured; no agent dispatch; no external send.</dd>
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
          {pendingRehearsal ? (
            <button className="secondary" disabled={!canSendRehearsal} onClick={() => submit(pendingRehearsal)}>
              Send advisory request
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
