import { useEffect, useRef, useState } from "react";
import {
  buildLocalNeutralAvatarState,
  localAvatarExpressionSample,
  localNeutralAvatarStateSample,
  mapLocalAvatarExpression,
  type AvatarProvenanceState,
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
import {
  answerCapabilityQuestion,
  exportCapabilityAnswerDrilldown,
  exportCapabilityReviewPacket,
  withCapabilityLatestTurnEvidence,
  type CapabilityLatestTurnEvidence,
  type CapabilityReviewPacketFocus,
  type ExportedCapabilityReviewPacket,
} from "./capabilityLedger.js";
import {
  RUNTIME_CONTRACT_ALIGNMENT_SUMMARY,
  getNapoleonReviewOperation,
  describeBridgeOperationSummary,
  describeNapoleonReviewOperationSummary,
  describeTaxonomyReviewBridgeSummary,
} from "./bridgeOperations.js";
import {
  buildBridgeEvidenceReadinessState,
  compareBridgeReadinessProofs,
  exportBridgeReadinessProofJson,
  importAcceptedBridgeReadinessProof,
  type AcceptedBridgeReadinessProofImport,
  type BridgeReadinessProofComparison,
  type NapoleonRequiredAction,
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
  submitCapabilityReviewPacket,
  type ChiefOfStaffSteeringSubmissionResult,
} from "./chiefOfStaffSteering.js";
import {
  discoverChiefOfStaffCapabilities,
  type ChiefOfStaffCapabilityDiscoveryResult,
} from "./chiefOfStaffCapabilities.js";
import {
  parseEvaluatorValidationArtifact,
  type EvaluatorValidationImport,
} from "./evaluatorValidationArtifact.js";
import { buildLearningSignalTelemetryAttributes } from "./learningSignal.js";
import {
  buildDescriptorConnectionState,
  buildGovernanceReviewState,
  buildMemoryProposalReviewState,
  buildRehearsalPreview,
  buildTextTurnContract,
  defaultChiefOfStaffDescriptor,
  descriptorSupportsGovernedHandoff,
  mapProfileToNapoleonMode,
  transitionMemoryProposalReviewState,
  type DescriptorConnectionInput,
  type DescriptorConnectionState,
  type GovernanceReviewState,
  type LocalProfile,
  type NapoleonProfileMode,
  type MemoryProposalReviewState,
} from "./contractBridge.js";
import {
  submitChiefOfStaffRequestPacket,
  submitGovernanceEvaluationPacket,
  type ChiefOfStaffRequestPacket,
  type ContractPacketSubmissionResult,
  type GovernanceEvaluationPacket,
} from "./contractPacketSubmission.js";
import { discoverNapoleonDescriptor } from "./descriptorDiscovery.js";
import {
  submitGovernanceReviewForNapoleonReview,
  type GovernanceReviewSubmissionResult,
} from "./governanceReviewSubmission.js";
import {
  submitMemoryProposalForReview,
  type MemoryProposalSubmissionResult,
} from "./memoryProposalSubmission.js";
import {
  buildObservabilityTraceHandoffPacket,
  submitObservabilityTraceHandoff,
  type ObservabilityTraceHandoffResult,
} from "./observabilityTraceHandoff.js";
import {
  buildNewAgentProposalReviewPacket,
  submitNewAgentProposalForNapoleonReview,
  type NewAgentProposalReviewPacket,
  type NewAgentProposalReviewSubmissionResult,
} from "./newAgentProposalReviewSubmission.js";
import {
  buildEvolutionProposalSubmissionPacket,
  submitEvolutionProposalToNapoleon,
  type EvolutionProposalSubmissionPacket,
  type EvolutionProposalSubmissionResult,
} from "./evolutionProposalSubmission.js";
import {
  buildDraftEvolutionProposalLifecycleRecord,
  exportEvolutionProposalLifecycleRecords,
  loadEvolutionProposalLifecycleRecords,
  persistEvolutionProposalLifecycleRecords,
  updateEvolutionProposalLifecycleAfterFailure,
  updateEvolutionProposalLifecycleAfterSubmission,
  updateEvolutionProposalLifecycleFromStatus,
  upsertEvolutionProposalLifecycleRecord,
  type EvolutionProposalLifecycleRecord,
} from "./evolutionProposalLifecycle.js";
import { refreshEvolutionProposalStatusFromNapoleon } from "./evolutionProposalStatus.js";
import {
  buildMediaSessionReadinessTelemetryAttributes,
  buildMediaSessionSummary,
  type LocalMediaPermissionStatus,
} from "./mediaSession.js";
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
  describeGovernedReviewResponse,
  describeGovernanceDecision,
  describeGovernanceReview,
  describeLastNapoleonTurnFailure,
  describeLastNapoleonTurnSummary,
  describeLiveBridgeReadiness,
  describeLiveVoiceReadiness,
  describeLiveSendPreflight,
  describeMemoryProposalReview,
  describeNapoleonTurnTimeline,
  describeNapoleonTranscriptMetadata,
  type LastNapoleonTurnFailureInput,
  type LiveSendPreflightView,
  sanitizeVisibleProvenanceValue,
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
  type VoiceResponseProvenanceState,
  type VoiceResponseShapeResult,
} from "./voiceResponseShaping.js";
import { detectVoiceSegments, localVadSampleFrames, type VoiceActivitySegment } from "./voiceActivity.js";
import {
  buildLocalWakeWordReadiness,
  runLocalWakeWordDetectionSample,
  type LocalWakeWordDetectionSampleResult,
} from "./wakeWordReadiness.js";

const conversationId = `conv_${Date.now().toString(16)}`;

function storedBoolean(key: string, fallback: boolean): boolean {
  if (typeof localStorage === "undefined") return fallback;
  const value = localStorage.getItem(key);
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

type RuntimeValidationSource = "real_runtime" | "local_harness" | "local_simulation";
type ChiefOfStaffSteeringDraft = ReturnType<typeof draftChiefOfStaffSteering>;
type SteeringRecommendationType = ChiefOfStaffSteeringDraft["recommendation"]["recommendationType"];

type SteeringSubmissionView = {
  result: ChiefOfStaffSteeringSubmissionResult;
  recommendationType: SteeringRecommendationType;
  displayType: string;
};

type CapabilityReviewPacketSubmissionView = {
  result: ChiefOfStaffSteeringSubmissionResult;
  reviewFocus: CapabilityReviewPacketFocus;
};

type TaxonomyReviewSubmissionView = {
  result: ChiefOfStaffTaxonomyReviewSubmissionResult;
  recommendationCount: number;
  reviewFocus: string;
};

function deriveRuntimeValidationSource(input: {
  endpoint: string;
  descriptorMode: "discovered" | "live" | "missing" | "checksum_mismatch" | "stale";
  evidenceCaptureState: "not_run" | "passed" | "failed";
  evidenceComparisonState: "not_run" | "passed" | "failed";
}): RuntimeValidationSource | undefined {
  if (isLocalHarnessEndpoint(input.endpoint)) return "local_harness";
  if (input.descriptorMode !== "live") return "local_simulation";
  if (input.evidenceCaptureState === "passed" && input.evidenceComparisonState === "passed") {
    return "real_runtime";
  }
  return undefined;
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

type GovernedReviewResponseView = {
  text: string;
  governanceDecision: {
    outcome: string;
    decision_id: string;
    authority_tier: string;
    approval_requirement: string;
    rationale: string;
    blocked_effects: string[];
  };
  traceEnvelope: {
    trace_id: string;
  };
  auditEnvelope: {
    audit_id: string;
  };
};

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
    decisionId: error.decisionId ? sanitizeVisibleProvenanceValue(error.decisionId) : undefined,
    auditId: error.auditId ? sanitizeVisibleProvenanceValue(error.auditId) : undefined,
    ...(error.descriptorFailureReason ? { descriptorFailureReason: error.descriptorFailureReason } : {}),
    blockedEffects: error.blockedEffects.map((effect) => sanitizeVisibleProvenanceValue(effect)),
  };
}

function formatCapabilityAnswer(
  answer: NonNullable<ReturnType<typeof answerCapabilityQuestion>>,
  profileMode: NapoleonProfileMode,
): string {
  const rows = answer.rows.length
    ? answer.rows
        .map((row) => {
          const status = row.status ? `, ${row.status}` : "";
          const area = row.architectureArea ? `, ${row.architectureArea}` : "";
          const confidence = row.confidence === undefined ? "" : `, confidence ${row.confidence}`;
          const score = row.score === undefined ? "" : `, score ${row.score}`;
          const nextStep = row.suggestedNextStep ? `, next ${row.suggestedNextStep}` : "";
          const scoreContext = row.scoreExplanation ? `, ${row.scoreExplanation}` : "";
          const details = row.details?.length ? `, details ${row.details.join("; ")}` : "";
          const recommendation = row.recommendation ? `, recommendation ${row.recommendation}` : "";
          return `${row.displayLabel ?? row.label}: ${row.count}${status}${area}${confidence}${score}${nextStep}${scoreContext}${details}${recommendation}`;
        })
        .join("\n")
    : "No local signals yet.";
  const latestTurnEvidence = answer.drilldown.latestTurnEvidence
    ? `\n\nLatest Napoleon turn evidence: ${answer.drilldown.latestTurnEvidence.summary} Attribution: ${
        answer.drilldown.latestTurnEvidence.attributionSource ?? "not returned"
      }. Proof alignment: ${answer.drilldown.latestTurnEvidence.proofAlignment ?? "not returned"}. Next: ${
        answer.drilldown.latestTurnEvidence.nextStep
      }.`
    : "";

  return `${answer.summary}\n\n${rows}${latestTurnEvidence}\n\nProfile scope: ${profileMode}. Evidence: ${answer.evidenceCount} local signals. ${answer.caveat} This is a local summary only and does not approve, implement, write memory, dispatch agents, or send externally.`;
}

function isNapoleonRequiredActionQuestion(content: string): boolean {
  const lower = content.toLocaleLowerCase();
  if (!lower.includes("napoleon")) return false;
  return (
    /\brequired actions?\b/.test(lower) ||
    /\bpromotion blockers?\b/.test(lower) ||
    /\bwhat\b.*\b(needs?|must|should)\b.*\b(fix|do|add|advertise|expose|implement)\b/.test(lower) ||
    /\bwhat\b.*\b(blocking|blocked|blocker)\b/.test(lower)
  );
}

function extractRequestedSelectedAgentName(content: string): string | null {
  const match = content.match(
    /\b[Ww]hat\s+(?:did|has|have)\s+(?:the\s+)?([A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][A-Za-z0-9]*){0,3})\s+(?:find|found|identify|identified|report|reported|surface|surfaced|confirm|confirmed|verify|verified|assess|assessed|conclude|concluded|recommend|recommended)\b/,
  );
  const name = normalizeRequestedSelectedAgentName(match?.[1]);
  if (!name || name.toLocaleLowerCase() === "napoleon") return null;
  return name;
}

function isNamedSelectedAgentContributionQuestion(content: string): boolean {
  return extractRequestedSelectedAgentName(content) !== null;
}

function extractRequestedSelectedAgentReasonName(content: string): string | null {
  const match =
    content.match(
      /\b[Ww]hy\s+(?:was|were)\s+(?:the\s+)?([A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][A-Za-z0-9]*){0,3})\s+selected\b/,
    ) ??
    content.match(
      /\b[Ww]hy\s+(?:has|have)\s+(?:the\s+)?([A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][A-Za-z0-9]*){0,3})\s+been\s+selected\b/,
    ) ??
    content.match(
      /\bwhy\s+did\s+(?:napoleon|the bridge|(?:the\s+)?chief of staff)\s+(?:select|choose|chose|pick|picked)\s+(?:the\s+)?([A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][A-Za-z0-9]*){0,3})\b/i,
    ) ??
    content.match(
      /\bwho\s+(?:selected|chose|picked)\s+(?:the\s+)?([A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][A-Za-z0-9]*){0,3})\b/i,
    );
  const name = normalizeRequestedSelectedAgentName(match?.[1]);
  if (!name || name.toLocaleLowerCase() === "napoleon") return null;
  return name;
}

function isNamedSelectedAgentReasonQuestion(content: string): boolean {
  return extractRequestedSelectedAgentReasonName(content) !== null;
}

function selectedAgentNameFromProofLine(proofLine: string): string {
  return proofLine.split(":")[0]?.trim() ?? "";
}

function normalizeRequestedSelectedAgentName(value: string | undefined): string | null {
  const name = value?.trim().replace(/\s+/g, " ");
  if (!name) return null;
  const words = name.split(" ");
  const hasTitleCaseWord = words.some((word) => /^[A-Z][A-Za-z0-9]*$/.test(word));
  const hasMultiWordNameShape = words.length >= 2 && words.every((word) => /^[A-Za-z][A-Za-z0-9]*$/.test(word));
  if (!hasTitleCaseWord && !hasMultiWordNameShape) return null;
  const blocked = new Set(["it", "that", "this", "answer", "response", "reply", "agent", "selected agent"]);
  if (blocked.has(name.toLocaleLowerCase())) return null;
  return name;
}

function isNapoleonDelegationQuestion(content: string): boolean {
  const lower = content.toLocaleLowerCase();
  const asksAboutNamedSelectedAgentContribution = isNamedSelectedAgentContributionQuestion(content);
  const asksAboutNamedSelectedAgentReason = isNamedSelectedAgentReasonQuestion(content);
  const asksAboutContextualSelectedAgentReason =
    /\bwhy\s+(?:this|that|the)\s+(?:selected\s+)?agent\b/.test(lower) ||
    /\bwhy\b.*\b(?:this|that|the)\s+(?:selected\s+)?agent\b.*\bselected\b/.test(lower) ||
    /\bwhy\s+(?:this|that)\s+one\b/.test(lower) ||
    /\bwhy\s+it\b/.test(lower);
  const asksAboutContextualSelectedAgentSource = /\bwho\s+(?:selected|chose|picked)\s+(?:it|that|this)\b/.test(lower);
  const asksAboutReturnedHandler =
    /\bwho\b.*\b(handled|answered)\b.*\b(that|this|it|answer|response|reply)\b/.test(lower) ||
    /\bwhich\b.*\bagents?\b.*\b(handled|answered)\b.*\b(that|this|it|answer|response|reply)\b/.test(lower) ||
    /\b(which|what)\b.*\bcapability\b.*\b(handled|answered)\b.*\b(that|this|it|answer|response|reply)\b/.test(
      lower,
    );
  const asksAboutReturnedEffects =
    /^(?:blocked|allowed|effects?|blocked\s+effects?|allowed\s+effects?)\??$/.test(lower.trim()) ||
    /\bwhat\b.*\b(blocked|allowed)\b/.test(lower) ||
    /\bwhat\b.*\bnapoleon\b.*\ballow(?:ed)?\b/.test(lower) ||
    /\bwhat\b.*\bnapoleon\b.*\bblock(?:ed)?\b/.test(lower) ||
    /\bwhat\b.*\beffects?\b.*\b(blocked|allowed)\b/.test(lower) ||
    /\bwhich\b.*\beffects?\b.*\b(blocked|allowed)\b/.test(lower) ||
    /\b(blocked|allowed)\b.*\beffects?\b/.test(lower);
  const asksAboutReturnedGovernance =
    /\bwhat\b.*\bgovernance\b.*\b(state|outcome|decision)\b/.test(lower) ||
    /\bwhich\b.*\bgovernance\b.*\b(state|outcome|decision)\b/.test(lower) ||
    /\bwhat\b.*\b(state|outcome|decision)\b.*\bgovernance\b/.test(lower) ||
    /\bgovernance\s+(state|outcome|decision)\b/.test(lower);
  const asksAboutReturnedDecision =
    /^(?:decision|decisions|decided)\??$/.test(lower.trim()) ||
    /\bwhat\b.*\bdecision\b.*\b(napoleon|returned|return)\b/.test(lower) ||
    /\bnapoleon\b.*\bdecision\b.*\b(returned|return)\b/.test(lower) ||
    /\b(returned|return)\b.*\bdecision\b/.test(lower) ||
    /\bwhat\b.*\bdid\b.*\bnapoleon\b.*\bdecide\b/.test(lower);
  const asksAboutReturnedAuthority =
    /^(?:authority|authority\s+tier|tier)\??$/.test(lower.trim()) ||
    /\bwhat\b.*\bauthority\s+tier\b.*\b(napoleon|returned|return)\b/.test(lower) ||
    /\bnapoleon\b.*\bauthority\s+tier\b.*\b(returned|return)\b/.test(lower) ||
    /\b(returned|return)\b.*\bauthority\s+tier\b/.test(lower);
  const asksAboutReturnedApprovalRequirement =
    /\bwhat\b.*\bapproval\s+requirement\b.*\b(napoleon|returned|return)\b/.test(lower) ||
    /\bnapoleon\b.*\bapproval\s+requirement\b.*\b(returned|return)\b/.test(lower) ||
    /\b(returned|return)\b.*\bapproval\s+requirement\b/.test(lower);
  const asksAboutReturnedRationale =
    /^(?:rationale|reason|reasoning)\??$/.test(lower.trim()) ||
    /\bwhat\b.*\brationale\b.*\b(napoleon|returned|return)\b/.test(lower) ||
    /\bnapoleon\b.*\brationale\b.*\b(returned|return)\b/.test(lower) ||
    /\b(returned|return)\b.*\brationale\b/.test(lower) ||
    /\bwhy\b.*\bdid\b.*\bnapoleon\b.*\b(decide|return)\b/.test(lower);
  const asksAboutReturnedProofReference =
    /^(?:trace|traces|audit|audits|trace\s+and\s+audit|audit\s+and\s+trace)\??$/.test(lower.trim()) ||
    /\b(what|which)\b.*\b(trace|audit)\b.*\b(napoleon|returned|return)\b/.test(lower) ||
    /\bnapoleon\b.*\b(trace|audit)\b.*\b(returned|return)\b/.test(lower) ||
    /\b(returned|return)\b.*\b(trace|audit)\b/.test(lower) ||
    /\bwhere\b.*\b(that|this|it|answer|response|reply)\b.*\b(come|came)\s+from\b/.test(lower) ||
    /\bwhere\s+(?:is|was)\s+(?:that|this|it|the\s+(?:answer|response|reply))\s+from\b/.test(lower) ||
    /\bwhat\b.*\b(proof|evidence)\b.*\b(supports?|supported)\b.*\b(that|this|it|answer|response|reply)\b/.test(
      lower,
    ) ||
    /\bwhich\b.*\b(source|sources|proof|evidence)\b.*\b(said|supports?|supported|returned)\b/.test(lower) ||
    /\bshow\b.*\b(proof|evidence|source|sources|provenance)\b/.test(lower) ||
    /\bwhere\b.*\b(proof|evidence|source|sources|provenance)\b.*\b(from|returned)\b/.test(lower) ||
    /^(?:proof|evidence|source|sources|provenance)\??$/.test(lower.trim());
  const asksAboutReturnedRecommendation =
    /^(?:recommendation|recommendations|recommended|recommend)\??$/.test(lower.trim()) ||
    /\bnapoleon\b.*\b(recommend|recommended|recommends|recommendation)\b/.test(lower) ||
    /\bwhat\b.*\bnapoleon\b.*\b(recommend|recommended|recommends|recommendation)\b/.test(lower) ||
    /\bwhat\b.*\b(that|this|it|answer|response|reply)\b.*\b(recommend|recommended|recommends|recommendation)\b/.test(
      lower,
    ) ||
    /\b(passive brain|selected agent|agent)\b.*\b(found|finding|findings|surfaced|reported|identified|confirmed|verified|assessed|concluded|recommend|recommended|recommends|recommendation)\b/.test(
      lower,
    ) ||
    /\b(what|which)\b.*\b(passive brain|selected agent|agent)\b.*\b(found|recommended|surfaced|reported)\b/.test(lower);
  const asksAboutReturnedContribution =
    /^(?:finding|findings|contribution|contributions|found|reported|surfaced)\??$/.test(lower.trim());
  const asksAboutReturnedSelectedAgents =
    /\b(which|what)\b.*\b(selected\s+)?agents?\b.*\b(selected|chosen|picked|returned|involved)\b/.test(lower) ||
    /\b(selected\s+agents?|chosen\s+agents?)\b/.test(lower) ||
    /\bwhich\b.*\bagents?\b.*\bselected\b/.test(lower);
  if (
    !lower.includes("napoleon") &&
    !asksAboutReturnedHandler &&
    !asksAboutReturnedEffects &&
    !asksAboutReturnedGovernance &&
    !asksAboutReturnedDecision &&
    !asksAboutReturnedAuthority &&
    !asksAboutReturnedApprovalRequirement &&
    !asksAboutReturnedRationale &&
    !asksAboutReturnedProofReference &&
    !asksAboutReturnedRecommendation &&
    !asksAboutReturnedContribution &&
    !asksAboutReturnedSelectedAgents &&
    !asksAboutNamedSelectedAgentContribution &&
    !asksAboutNamedSelectedAgentReason &&
    !asksAboutContextualSelectedAgentReason &&
    !asksAboutContextualSelectedAgentSource
  ) {
    return false;
  }
  return (
    asksAboutReturnedHandler ||
    asksAboutReturnedEffects ||
    asksAboutReturnedGovernance ||
    asksAboutReturnedDecision ||
    asksAboutReturnedAuthority ||
    asksAboutReturnedApprovalRequirement ||
    asksAboutReturnedRationale ||
    asksAboutReturnedProofReference ||
    asksAboutReturnedRecommendation ||
    asksAboutReturnedContribution ||
    asksAboutReturnedSelectedAgents ||
    asksAboutNamedSelectedAgentContribution ||
    asksAboutNamedSelectedAgentReason ||
    asksAboutContextualSelectedAgentReason ||
    asksAboutContextualSelectedAgentSource ||
    /\bwho\b.*\bhandled\b/.test(lower) ||
    /\bwho\b.*\banswered\b/.test(lower) ||
    /\bwhich\b.*\bagents?\b/.test(lower) ||
    /\bselected agents?\b/.test(lower) ||
    /\bdelegation\b/.test(lower) ||
    /\bwhat\b.*\beffects?\b.*\b(blocked|allowed)\b/.test(lower) ||
    /\bblocked effects?\b/.test(lower) ||
    /\ballowed effects?\b/.test(lower)
  );
}

function isNapoleonReviewRequirementQuestion(content: string): boolean {
  const lower = content.toLocaleLowerCase();
  const compact = lower.trim();
  const asksCompactApprovalBoundary =
    /^(?:approved|approval|authorized|reviewed|safe)\??$/.test(compact) ||
    /^(?:did\s+(?:it|that|this)\s+)?(?:get\s+)?(?:approved|authorized|reviewed)\??$/.test(compact) ||
    /^(?:did\s+(?:it|that|this)\s+)(?:get\s+)?allowed\??$/.test(compact) ||
    /^get\s+allowed\??$/.test(compact);
  const asksCompactSideEffectBoundary =
    /^(?:sent|send|sent\s+out|stored|saved|memory|remembered|dispatched|dispatch)\??$/.test(compact) ||
    /^(?:write|wrote|store|stored|save|saved)\s+memory\??$/.test(compact);
  const asksApprovalActorBoundary =
    /^who\s+(?:approved|reviewed|authorized)(?:\s+(?:it|that|this|answer|response|reply))?\??$/.test(compact) ||
    /^who\s+(?:signed\s+off|gave\s+approval)(?:\s+(?:on\s+)?(?:it|that|this|answer|response|reply))?\??$/.test(
      compact,
    );
  const asksApprovalReadinessBoundary =
    /^who\s+(?:can|may|should|must)\s+(?:approve|review|authorize)(?:\s+(?:it|that|this|answer|response|reply))?\??$/.test(
      compact,
    ) ||
    /^what\s+approval\s+(?:is\s+)?(?:missing|required|needed)\??$/.test(compact) ||
    /^(?:can|may|should)\s+i\s+(?:treat|consider|use)\s+(?:it|that|this|answer|response|reply)\s+as\s+(?:approved|authorized|reviewed|allowed)\??$/.test(
      compact,
    );
  const asksAboutReturnedAction =
    asksCompactApprovalBoundary ||
    asksCompactSideEffectBoundary ||
    asksApprovalActorBoundary ||
    asksApprovalReadinessBoundary ||
    /\b(can|may|should)\s+i\b.*\b(act|apply|proceed|use|send|do)\b.*\b(that|this|it|answer|response|reply)\b/.test(
      lower,
    ) ||
    /\b(did|does|has|was|is)\b.*\bnapoleon\b.*\b(approve|approved|review|reviewed|authorize|authorized)\b.*\b(that|this|it|answer|response|reply)\b/.test(
      lower,
    ) ||
    /\b(is|was)\b.*\b(that|this|it|answer|response|reply)\b.*\b(approved|reviewed|allowed|safe)\b/.test(lower) ||
    /\b(do|does)\b.*\b(that|this|it|answer|response|reply)\b.*\b(need|require)\b.*\breview\b/.test(lower);
  const asksAboutReturnedReviewReference =
    /\b(review|approval|governance)\b.*\b(reference|references|ref|refs|decision|audit|trace|id|identifier|cite|use)\b/.test(
      lower,
    ) ||
    /\b(what|which)\b.*\b(reference|references|ref|refs|decision|audit|trace)\b.*\b(use|cite|review)\b/.test(lower);
  const asksAboutLocalSideEffectBoundary =
    /\b(did|does|has|was|is)\b.*\bconcierge\b.*\b(approve|approved|authorize|authorized)\b.*\b(it|that|this|answer|response|reply)\b/.test(
      lower,
    ) ||
    /\b(did|does|has|was|is)\b.*\bconcierge\b.*\b(capture|captured)\b.*\bapproval\b/.test(lower) ||
    /\b(did|does|has|was|is)\b.*\bconcierge\b.*\bwrite\b.*\bmemory\b/.test(lower) ||
    /\b(did|does|has|was|is)\b.*\bconcierge\b.*\bdispatch\b.*\b(agents?|anyone|somebody|someone)\b/.test(lower) ||
    /\b(did|does|has|was|is)\b.*\bconcierge\b.*\bsend\b.*\b(externally|external|anything|something|somewhere|out|it|that|this|answer|response|reply)\b/.test(
      lower,
    );
  const asksAboutContextualSideEffectBoundary =
    /\b(did|does|has|was|is)\b.*\b(that|this|it|answer|response|reply)\b.*\b(approve|approved|authorize|authorized)\b.*\b(that|this|it|answer|response|reply)\b/.test(
      lower,
    ) ||
    /\b(did|does|has|was|is)\b.*\b(that|this|it|answer|response|reply)\b.*\b(capture|captured)\b.*\bapproval\b/.test(
      lower,
    ) ||
    /\b(did|does|has|was|is)\b.*\b(that|this|it|answer|response|reply)\b.*\bwrite\b.*\bmemory\b/.test(lower) ||
    /\b(did|does|has|was|is)\b.*\b(that|this|it|answer|response|reply)\b.*\bdispatch\b.*\b(agents?|anyone|somebody|someone)\b/.test(
      lower,
    ) ||
    /\b(did|does|has|was|is)\b.*\b(that|this|it|answer|response|reply)\b.*\bsend\b.*\b(externally|external|anything|something|somewhere|out|it|that|this|answer|response|reply)\b/.test(
      lower,
    );
  if (
    !lower.includes("napoleon") &&
    !asksAboutReturnedAction &&
    !asksAboutReturnedReviewReference &&
    !asksAboutLocalSideEffectBoundary &&
    !asksAboutContextualSideEffectBoundary
  )
    return false;
  const asksAboutReview =
    /\breview\b/.test(lower) ||
    /\brequires?_review\b/.test(lower) ||
    /\bapproval\b/.test(lower) ||
    /\bgovernance\b/.test(lower);
  const asksAboutActing =
    /\bact\b/.test(lower) ||
    /\bacting\b/.test(lower) ||
    /\baction\b/.test(lower) ||
    /\bbefore\b/.test(lower) ||
    /\bcan i\b/.test(lower) ||
    /\bmay i\b/.test(lower) ||
    /\bneed\b/.test(lower) ||
    /\brequire\b/.test(lower);
  return (
    asksAboutReturnedAction ||
    asksAboutReturnedReviewReference ||
    asksAboutLocalSideEffectBoundary ||
    asksAboutContextualSideEffectBoundary ||
    (asksAboutReview && asksAboutActing)
  );
}

function isNapoleonProofCurrentnessQuestion(content: string): boolean {
  const lower = content.toLocaleLowerCase();
  const compact = lower.trim();
  const asksCompactCurrentness =
    /^(?:current|status|still\s+valid|valid|live)\??$/.test(compact) ||
    /^(?:refresh|make\s+(?:it|this|that)\s+current)\??$/.test(compact) ||
    /^(?:is\s+)?(?:that|this|it)\s+(?:current|still\s+valid|valid|live)\??$/.test(compact) ||
    /^how\s+(?:do|can|should)\s+(?:i|we)\s+(?:refresh|make)\s+(?:it|this|that|the\s+proof)\s+(?:current|valid|live)\??$/.test(
      compact,
    );
  const asksAboutProof = /\bproof\b/.test(lower) || /\bevidence\b/.test(lower) || /\bprovenance\b/.test(lower);
  const asksAboutCurrentness =
    /\bcurrent\b/.test(lower) ||
    /\bstill\b/.test(lower) ||
    /\bstale\b/.test(lower) ||
    /\bcleared\b/.test(lower) ||
    /\brely\b/.test(lower) ||
    /\breuse\b/.test(lower) ||
    /\btrust\b/.test(lower);
  const asksAboutContextualReturnedProof =
    /\b(this|that|last|latest|returned|current)\b.*\b(proof|evidence|provenance)\b/.test(lower) ||
    /\b(proof|evidence|provenance)\b.*\b(this|that|last|latest|returned|current)\b/.test(lower);
  if (asksCompactCurrentness) return true;
  if (!lower.includes("napoleon") && !asksAboutContextualReturnedProof) return false;
  return asksAboutProof && asksAboutCurrentness;
}

function isNapoleonProofComparisonQuestion(content: string): boolean {
  const compact = content.toLocaleLowerCase().trim();
  return (
    /^(?:what\s+changed|what\s+is\s+different|what's\s+different|same\s+as\s+before|same\?|unchanged\?)\??$/.test(
      compact,
    ) ||
    /^(?:did|does)\s+(?:that|this|it|the\s+proof)\s+(?:change|stay\s+the\s+same)\??$/.test(compact)
  );
}

function isNapoleonBlockedAttemptQuestion(content: string): boolean {
  const lower = content.toLocaleLowerCase();
  const asksAboutBlockedAttempt =
    /\bwhy\b.*\b(that|this|it|attempt|turn|send|request|bridge)\b.*\b(blocked|failed|denied|stopped)\b/.test(
      lower,
    ) ||
    /\bwhy\b.*\b(blocked|failed|denied|stopped|fail-closed|fail closed)\b/.test(lower) ||
    /\bwhat\b.*\b(reason|cause|happened)\b.*\b(blocked|failed|denied|stopped|fail-closed|fail closed)\b/.test(
      lower,
    ) ||
    /\bwhat\b.*\b(blocked|failed|denied|stopped)\b.*\b(that|this|it|attempt|turn|send|request|bridge)\b/.test(
      lower,
    );
  const asksAboutNapoleonBlockedAttempt =
    lower.includes("napoleon") &&
    /\b(why|reason|cause|happened|attempt|turn|send|request|bridge|fail-closed|fail closed)\b/.test(lower) &&
    /\b(blocked|failed|denied|stopped|fail-closed|fail closed)\b/.test(lower);
  return asksAboutBlockedAttempt || asksAboutNapoleonBlockedAttempt;
}

function isNapoleonBlockedAttemptNextStepQuestion(content: string): boolean {
  const lower = content.toLocaleLowerCase();
  const compact = lower.trim();
  const asksCompactNextStep =
    /^(?:what\s+now|now\s+what|what\s+next|next|next\s+step|next\s+move|next\s+action)\??$/.test(compact);
  const asksForNextStep =
    asksCompactNextStep ||
    /\bwhat\b.*\b(should|can|may)\b.*\b(i|we)\b.*\b(do|try)\b.*\bnext\b/.test(lower) ||
    /\bwhat'?s\b.*\bnext\b/.test(lower) ||
    /\bnext\b.*\b(step|action|move)\b/.test(lower) ||
    /\bhow\b.*\b(do|can|should)\b.*\b(i|we)\b.*\b(fix|resolve|recover|proceed)\b/.test(lower);
  return asksForNextStep;
}

function isNapoleonBlockedAttemptRecoveryQuestion(content: string): boolean {
  const lower = content.toLocaleLowerCase();
  const compact = lower.trim();
  const asksCompactWhy = /^(?:why|why\s+not|why\s+(?:blocked|failed|denied|stopped))\??$/.test(compact);
  const asksWhatHappened =
    asksCompactWhy ||
    /\bwhat\b.*\bhappened\b/.test(lower) ||
    /\bwhat\b.*\bwent\b.*\bwrong\b/.test(lower) ||
    /\bwhy\b.*\bdid\b.*\bthat\b.*\bhappen\b/.test(lower);
  const asksWhatToFix =
    /\bwhat\b.*\b(needs?|has)\b.*\b(to be )?\b(fixed|repaired|resolved)\b/.test(lower) ||
    /\bwhat\b.*\bneeds?\b.*\bfixing\b/.test(lower) ||
    /\bwhat\b.*\bfix\b/.test(lower) ||
    /\bwhat\b.*\brepair\b/.test(lower);
  const asksOwner =
    /\bwho\b.*\b(owns?|should handle|fixes|repairs)\b/.test(lower) ||
    /\bwho\b.*\bshould\b.*\bfix\b/.test(lower) ||
    /\bwho\b.*\b(can|should|must|may)\b.*\b(unblock|clear|resolve)\b/.test(lower) ||
    /\bowner\b.*\b(fix|repair|blocker|failure|unblock)\b/.test(lower);
  const asksOverrideBoundary =
    /^(?:can|may|should)\s+(?:i|we|concierge|napoleon)\s+override\s+(?:it|that|this|the\s+(?:block|blocker|decision|failure|no-go|no\s+go))\??$/.test(
      compact,
    ) ||
    /\boverride\b.*\b(block|blocker|decision|failure|no-go|no go|denial|deny|denied)\b/.test(lower);
  const asksAppealOrReviewBoundary =
    /^(?:appeal|appeal\s+it|appeal\s+this|appeal\s+that)\??$/.test(compact) ||
    /\bappeal\b.*\b(it|that|this|block|blocker|decision|failure|no-go|no go|denial|deny|denied)\b/.test(lower) ||
    /\bwho\b.*\b(review|reviews|reviewed)\b.*\b(it|that|this|block|blocker|decision|failure|no-go|no go|denial|deny|denied)\b/.test(
      lower,
    );
  const asksReconsiderationBoundary =
    /^(?:reconsider|reconsider\s+it|reconsider\s+this|reconsider\s+that)\??$/.test(compact) ||
    /\bwho\b.*\b(can|may|should|must)\b.*\breconsider\b.*\b(it|that|this|block|blocker|decision|failure|no-go|no go|denial|deny|denied)?\b/.test(
      lower,
    ) || /\breconsider\b.*\b(it|that|this|block|blocker|decision|failure|no-go|no go|denial|deny|denied)\b/.test(lower);
  const asksAllowedCondition =
    /^(?:allowed\s+how|how\s+allowed|make\s+(?:it|this|that)\s+allowed|what\s+would\s+allow\s+(?:it|this|that))\??$/.test(
      compact,
    ) ||
    /\bwhat\b.*\b(would|could|can|may)\b.*\bmake\b.*\b(it|that|this|request|turn|send)\b.*\ballow(?:ed)?\b/.test(
      lower,
    ) || /\bhow\b.*\b(would|could|can|may)\b.*\b(it|that|this|request|turn|send)\b.*\bbe\b.*\ballow(?:ed)?\b/.test(lower);
  const asksPermanentBlock =
    /\b(is|was|will)\b.*\b(it|that|this|request|turn|send)\b.*\b(blocked|denied|stopped)\b.*\b(forever|permanent|always)\b/.test(
      lower,
    );
  return (
    asksWhatHappened ||
    asksWhatToFix ||
    asksOwner ||
    asksOverrideBoundary ||
    asksAppealOrReviewBoundary ||
    asksReconsiderationBoundary ||
    asksAllowedCondition ||
    asksPermanentBlock
  );
}

function isNapoleonLiveSendReadinessQuestion(content: string): boolean {
  const lower = content.toLocaleLowerCase();
  const compact = lower.trim();
  const asksCompactLiveReadiness =
    /^(?:ready|ready\s+now|live|why\s+not\s+live|why\s+not\s+send|send)\??$/.test(compact) ||
    /^(?:can|may|should)\s+(?:i|we)\s+(?:send|go\s+live|contact\s+napoleon)\s*(?:now)?\??$/.test(compact);
  const asksAboutSendButton =
    /\bsend button\b/.test(lower) ||
    /\blive send button\b/.test(lower) ||
    /\bsend control\b/.test(lower) ||
    /\bsend\b.*\b(disabled|blocked|unavailable|greyed|grayed)\b/.test(lower) ||
    /\b(disabled|blocked|unavailable|greyed|grayed)\b.*\bsend\b/.test(lower);
  if (asksCompactLiveReadiness) return true;
  if (!lower.includes("napoleon") && !asksAboutSendButton) return false;
  const asksAboutSending =
    asksAboutSendButton ||
    /\bsend\b/.test(lower) ||
    /\bforward\b/.test(lower) ||
    /\bcontact\b/.test(lower) ||
    /\bbridge\b/.test(lower) ||
    /\bendpoint\b/.test(lower);
  const asksAboutReadiness =
    asksAboutSendButton ||
    /\bready\b/.test(lower) ||
    /\breadiness\b/.test(lower) ||
    /\bcan i\b/.test(lower) ||
    /\bmay i\b/.test(lower) ||
    /\bblocked?\b/.test(lower) ||
    /\bblockers?\b/.test(lower) ||
    /\bpreflight\b/.test(lower) ||
    /\bwhy\b.*\bnot\b/.test(lower);
  return asksAboutSending && asksAboutReadiness;
}

function isNapoleonConnectionRepairQuestion(content: string): boolean {
  const lower = content.toLocaleLowerCase();
  if (!lower.includes("napoleon")) return false;
  const asksAboutConnection =
    /\bconnect\b/.test(lower) ||
    /\bconnection\b/.test(lower) ||
    /\blive send\b/.test(lower) ||
    /\bsend\b/.test(lower) ||
    /\bdescriptor\b/.test(lower) ||
    /\bendpoint\b/.test(lower);
  const asksAboutProblem =
    /\bwhy\b.*\b(can'?t|cannot|not|blocked|failed|missing)\b/.test(lower) ||
    /\bwhat\b.*\b(missing|blocked|failed|wrong|fix|repair)\b/.test(lower) ||
    /\bwhat\b.*\b(next|fix|repair)\b/.test(lower) ||
    /\bmissing\b.*\b(before|for)\b/.test(lower) ||
    /\bblocked\b/.test(lower) ||
    /\bfix\b/.test(lower) ||
    /\brepair\b/.test(lower);
  return asksAboutConnection && asksAboutProblem;
}

function isNapoleonDescriptorValidityQuestion(content: string): boolean {
  const lower = content.toLocaleLowerCase();
  const asksAboutNapoleonDescriptor =
    lower.includes("napoleon") &&
    (/\bdescriptor\b/.test(lower) ||
      /\bchecksum\b/.test(lower) ||
      /\bsignature\b/.test(lower) ||
      /\btext[- ]?turn\b/.test(lower));
  if (!asksAboutNapoleonDescriptor) return false;

  const asksAboutValidity =
    /\bvalid\b/.test(lower) ||
    /\bvalidity\b/.test(lower) ||
    /\bintegrity\b/.test(lower) ||
    /\bchecksum\b/.test(lower) ||
    /\bsignature\b/.test(lower) ||
    /\badvertised\b/.test(lower) ||
    /\broute\b/.test(lower) ||
    /\bready\b/.test(lower) ||
    /\busable\b/.test(lower) ||
    /\bblocking\b/.test(lower) ||
    /\bblocked\b/.test(lower) ||
    /\blive send\b/.test(lower);

  return asksAboutValidity;
}

function isNapoleonConnectionSetupQuestion(content: string): boolean {
  const lower = content.toLocaleLowerCase();
  if (!lower.includes("napoleon")) return false;
  const asksAboutConnection =
    /\bconnect\b/.test(lower) ||
    /\bconnection\b/.test(lower) ||
    /\bsetup\b/.test(lower) ||
    /\bset up\b/.test(lower) ||
    /\bfirst[- ]?run\b/.test(lower) ||
    /\bconfigure\b/.test(lower) ||
    /\bendpoint\b/.test(lower) ||
    /\bdescriptor\b/.test(lower);
  const asksForAction =
    /\bhow\b/.test(lower) ||
    /\bwhat\b.*\b(next|step|do|needed|missing)\b/.test(lower) ||
    /\bnext\b.*\b(step|action)\b/.test(lower) ||
    /\bwhy\b.*\b(can'?t|cannot|not)\b/.test(lower);
  return asksAboutConnection && asksForAction;
}

function normalizeConnectionRepairAction(summary: string): string {
  const lower = summary.toLocaleLowerCase();
  if (lower.includes("add the governed napoleon endpoint")) return "configure_endpoint";
  if (lower.includes("run descriptor discovery")) return "discover_descriptor";
  if (lower.includes("descriptor auth") || lower.includes("authentication") || lower.includes("bridge token")) {
    return "fix_descriptor_authentication";
  }
  if (lower.includes("descriptor timeout") || lower.includes("endpoint responds") || lower.includes("descriptor connectivity")) {
    return "retry_descriptor_discovery";
  }
  if (lower.includes("descriptor http") || lower.includes("endpoint url") || lower.includes("descriptor route")) {
    return "fix_descriptor_http";
  }
  if (lower.includes("fix descriptor checksum") || lower.includes("signature")) return "fix_descriptor_integrity";
  if (lower.includes("text-turn")) return "enable_text_turn_route";
  if (lower.includes("turn off rehearsal")) return "turn_off_rehearsal_mode";
  if (lower.includes("review local governance")) return "review_local_governance";
  if (lower.includes("provide text")) return "enter_text";
  return "review_preflight";
}

function normalizeConnectionRepairNextAction(summary: string): string {
  return summary.replace(/^Next step:\s*/i, "").replace(/\.$/, "");
}

function describeDescriptorValidityNextAction(input: {
  descriptorConnection: DescriptorConnectionState;
  textTurnRouteAdvertised: boolean;
  preflight: LiveSendPreflightView;
}): string {
  if (input.descriptorConnection.canAttemptLiveBridge && input.textTurnRouteAdvertised) {
    return "none";
  }
  switch (input.descriptorConnection.failClosedReason) {
    case "no_endpoint":
      return "add the governed Napoleon endpoint in settings, then run descriptor discovery";
    case "no_descriptor":
      return "run descriptor discovery from the configured Napoleon endpoint";
    case "descriptor_signature_or_checksum_mismatch":
      return "fix descriptor checksum/signature before live send";
    case "descriptor_invalid":
      return "rediscover a contract-only Napoleon Chief of Staff descriptor";
    case "descriptor_stale":
      return "rediscover the Napoleon descriptor before live send";
    case "auth_failure":
      return "check the local bridge token or Napoleon descriptor authentication";
    case "bridge_timeout":
      return "retry descriptor discovery when the Napoleon endpoint responds";
    case "http_failure":
      return "check the Napoleon endpoint URL and descriptor route";
    default:
      if (!input.textTurnRouteAdvertised) {
        return "advertise the governed text_turn handoff in Napoleon's descriptor";
      }
      return normalizeConnectionRepairNextAction(input.preflight.nextStepSummary);
  }
}

function formatNapoleonDescriptorValidityAnswer(input: {
  preflight: LiveSendPreflightView;
  descriptorConnection: DescriptorConnectionState;
  endpointConfigured: boolean;
  rehearsalMode: boolean;
}): {
  content: string;
  descriptorValidForLiveSend: boolean;
  endpointConfigured: boolean;
  descriptorState: DescriptorConnectionState["state"];
  checksumState: DescriptorConnectionState["checksumState"];
  signatureState: DescriptorConnectionState["signatureState"];
  textTurnRouteAdvertised: boolean;
  failClosedReason: string;
  rehearsalMode: boolean;
  nextAction: string;
  descriptorFreshnessState: DescriptorConnectionState["freshnessState"];
} {
  const textTurnRouteAdvertised = Boolean(
    input.descriptorConnection.canAttemptLiveBridge &&
      input.descriptorConnection.descriptorStatus?.supportedHandoffs.includes("text_turn"),
  );
  const descriptorValidForLiveSend = input.descriptorConnection.canAttemptLiveBridge && textTurnRouteAdvertised;
  const failClosedReason = input.descriptorConnection.failClosedReason ?? "none";
  const nextAction = describeDescriptorValidityNextAction({
    descriptorConnection: input.descriptorConnection,
    textTurnRouteAdvertised,
    preflight: input.preflight,
  });

  return {
    content: [
      "Napoleon descriptor validity from local connection state:",
      `Descriptor valid for live send: ${descriptorValidForLiveSend ? "yes" : "no"}.`,
      `Descriptor state: ${input.descriptorConnection.state}.`,
      `Checksum state: ${input.descriptorConnection.checksumState}.`,
      `Signature state: ${input.descriptorConnection.signatureState}.`,
      `Descriptor freshness: ${input.descriptorConnection.freshnessState}.`,
      `Text-turn route advertised: ${textTurnRouteAdvertised ? "yes" : "no"}.`,
      `Endpoint configured: ${input.endpointConfigured ? "yes" : "no"}.`,
      `Rehearsal Mode: ${input.rehearsalMode ? "on" : "off"}.`,
      `Fail-closed reason: ${failClosedReason}.`,
      `Next local action: ${nextAction}.`,
      "Authority boundary: local descriptor readiness only; not Napoleon approval.",
      "This local answer did not contact Napoleon, approve, write memory, dispatch agents, capture approval, or send externally.",
    ].join("\n\n"),
    descriptorValidForLiveSend,
    endpointConfigured: input.endpointConfigured,
    descriptorState: input.descriptorConnection.state,
    checksumState: input.descriptorConnection.checksumState,
    signatureState: input.descriptorConnection.signatureState,
    textTurnRouteAdvertised,
    failClosedReason,
    rehearsalMode: input.rehearsalMode,
    nextAction: normalizeConnectionRepairAction(`Next step: ${nextAction}.`),
    descriptorFreshnessState: input.descriptorConnection.freshnessState,
  };
}

function formatNapoleonConnectionRepairAnswer(input: {
  preflight: LiveSendPreflightView;
  descriptorConnection: DescriptorConnectionState;
  endpointConfigured: boolean;
  rehearsalMode: boolean;
}): {
  content: string;
  blockingReason: string;
  nextAction: string;
  liveSendReady: boolean;
  endpointConfigured: boolean;
  descriptorState: DescriptorConnectionState["state"];
  failClosedReason: string;
  rehearsalMode: boolean;
  descriptorFreshnessState: DescriptorConnectionState["freshnessState"];
} {
  const blockingReason = input.preflight.canAttemptLiveSend
    ? "none"
    : input.descriptorConnection.failClosedReason ?? input.preflight.status;
  const nextActionLabel = normalizeConnectionRepairNextAction(input.preflight.nextStepSummary);
  const nextAction = normalizeConnectionRepairAction(input.preflight.nextStepSummary);

  return {
    content: [
      "Napoleon connection repair from local readiness:",
      `Blocking reason: ${blockingReason}.`,
      `Next local action: ${nextActionLabel}.`,
      `Live send ready: ${input.preflight.canAttemptLiveSend ? "yes" : "no"}.`,
      `Descriptor state: ${input.descriptorConnection.state}.`,
      `Descriptor freshness: ${input.descriptorConnection.freshnessState}.`,
      `Rehearsal Mode: ${input.rehearsalMode ? "on" : "off"}.`,
      input.preflight.caveat,
      "Authority boundary: local readiness guidance only; not Napoleon approval.",
      "This local answer did not contact Napoleon, approve, write memory, dispatch agents, capture approval, or send externally.",
    ].join("\n\n"),
    blockingReason,
    nextAction,
    liveSendReady: input.preflight.canAttemptLiveSend,
    endpointConfigured: input.endpointConfigured,
    descriptorState: input.descriptorConnection.state,
    failClosedReason: input.descriptorConnection.failClosedReason ?? "none",
    rehearsalMode: input.rehearsalMode,
    descriptorFreshnessState: input.descriptorConnection.freshnessState,
  };
}

function formatNapoleonConnectionSetupAnswer(input: {
  currentStep: string;
  preflight: LiveSendPreflightView;
  descriptorConnection: DescriptorConnectionState;
  endpointConfigured: boolean;
  rehearsalMode: boolean;
}): {
  content: string;
  currentStep: string;
  liveSendReady: boolean;
  endpointConfigured: boolean;
  descriptorDiscovered: boolean;
  textTurnRouteAdvertised: boolean;
  rehearsalMode: boolean;
  descriptorState: DescriptorConnectionState["state"];
  failClosedReason: string;
  descriptorFreshnessState: DescriptorConnectionState["freshnessState"];
} {
  const descriptorDiscovered = input.descriptorConnection.state === "ready";
  const textTurnRouteAdvertised = Boolean(
    input.descriptorConnection.canAttemptLiveBridge &&
      input.descriptorConnection.descriptorStatus?.supportedHandoffs.includes("text_turn"),
  );
  const descriptorState = input.descriptorConnection.state;
  const failClosedReason = input.descriptorConnection.failClosedReason ?? "none";
  const setupRows = [
    `Endpoint configured: ${input.endpointConfigured ? "yes" : "no"}.`,
    `Descriptor discovered: ${descriptorDiscovered ? "yes" : "no"}.`,
    `Text-turn route advertised: ${textTurnRouteAdvertised ? "yes" : "no"}.`,
    `Rehearsal Mode: ${input.rehearsalMode ? "on" : "off"}.`,
    `Descriptor state: ${descriptorState}.`,
    `Descriptor freshness: ${input.descriptorConnection.freshnessState}.`,
    `Fail-closed reason: ${failClosedReason}.`,
  ];

  return {
    content: [
      "Napoleon connection setup from local readiness:",
      `Current step: ${input.currentStep}.`,
      `Live send ready: ${input.preflight.canAttemptLiveSend ? "yes" : "no"}.`,
      input.preflight.nextStepSummary,
      setupRows.join("\n"),
      "Authority boundary: local readiness only; not Napoleon approval.",
      "This local answer did not contact Napoleon, approve, write memory, dispatch agents, capture approval, or send externally.",
    ].join("\n\n"),
    currentStep: input.currentStep.replaceAll(" ", "_"),
    liveSendReady: input.preflight.canAttemptLiveSend,
    endpointConfigured: input.endpointConfigured,
    descriptorDiscovered,
    textTurnRouteAdvertised,
    rehearsalMode: input.rehearsalMode,
    descriptorState,
    failClosedReason,
    descriptorFreshnessState: input.descriptorConnection.freshnessState,
  };
}

function formatNapoleonLiveSendReadinessAnswer(input: {
  preflight: LiveSendPreflightView;
  descriptorConnection: DescriptorConnectionState;
  endpointConfigured: boolean;
  rehearsalMode: boolean;
}): {
  content: string;
  canAttemptLiveSend: boolean;
  status: LiveSendPreflightView["status"];
  descriptorState: DescriptorConnectionState["state"];
  failClosedReason: string;
  descriptorFreshnessState: DescriptorConnectionState["freshnessState"];
  endpointConfigured: boolean;
  rehearsalMode: boolean;
  blockedEffectCount: number;
} {
  const blockedEffects = input.descriptorConnection.descriptorStatus?.blockedEffects ?? [
    "runtime_authority",
    "agent_dispatch",
    "memory_write",
    "approval_capture",
    "external_send",
  ];
  const priorityLabels = [
    "Endpoint configured",
    "Descriptor discovered",
    "Descriptor integrity",
    "Text-turn route",
    "Governance send gate",
    "Allowed effects",
    "Text ready",
    "Rehearsal Mode",
  ];
  const prioritizedItems = priorityLabels
    .map((label) => input.preflight.items.find((item) => item.label === label))
    .filter((item): item is LiveSendPreflightView["items"][number] => Boolean(item));
  const rows = prioritizedItems.map((item) => `${item.label}: ${item.status}. ${item.detail}`).join("\n");
  const liveSendState = input.preflight.canAttemptLiveSend ? "ready" : "blocked";

  return {
    content: [
      "Napoleon live send readiness from local preflight:",
      `Live send: ${liveSendState}.`,
      input.preflight.summary,
      input.preflight.blockerSummary,
      input.preflight.nextStepSummary,
      `Descriptor freshness: ${input.descriptorConnection.freshnessState}.`,
      rows,
      input.preflight.caveat,
      "This local answer did not contact Napoleon, approve, write memory, dispatch agents, capture approval, or send externally.",
    ].join("\n\n"),
    canAttemptLiveSend: input.preflight.canAttemptLiveSend,
    status: input.preflight.status,
    descriptorState: input.descriptorConnection.state,
    failClosedReason: input.descriptorConnection.failClosedReason ?? "none",
    descriptorFreshnessState: input.descriptorConnection.freshnessState,
    endpointConfigured: input.endpointConfigured,
    rehearsalMode: input.rehearsalMode,
    blockedEffectCount: blockedEffects.length,
  };
}

function describeBlockedAttemptFixOwner(failure: LastNapoleonTurnFailureInput): string {
  const reason = failure.descriptorFailureReason ?? failure.reason;
  if (reason === "auth_failure") return "local bridge-token settings or Napoleon descriptor authentication owner";
  if (reason === "bridge_timeout") return "Napoleon service availability or descriptor endpoint owner";
  if (reason === "http_failure") return "Napoleon endpoint routing or service owner";
  if (
    reason === "contract_mismatch" ||
    reason === "descriptor_mismatch" ||
    reason === "descriptor_signature_or_checksum_mismatch" ||
    reason === "descriptor_invalid"
  ) {
    return "Napoleon bridge contract or descriptor publisher";
  }
  if (reason === "missing_descriptor" || reason === "no_descriptor") return "Napoleon descriptor publisher";
  if (reason === "no_endpoint") return "local Concierge connection settings owner";
  if (failure.governanceOutcome === "deny" || failure.governanceOutcome === "no_go") return "Napoleon governance review owner";
  return "Concierge/Napoleon bridge operator";
}

function formatNapoleonBlockedAttemptAnswer(failure: LastNapoleonTurnFailureInput | null): {
  content: string;
  failureReturned: boolean;
  blockedEffectCount: number;
  governanceReturned: boolean;
  traceReturned: boolean;
  auditReturned: boolean;
  descriptorFailureReturned: boolean;
} {
  if (!failure) {
    return {
      content: [
        "Latest blocked Napoleon attempt:",
        "Failure reason: not returned.",
        "Governance: not returned.",
        "Trace: not returned.",
        "Audit: not returned.",
        "Blocked effects: not returned.",
        "Next step: No fail-closed Napoleon bridge attempt has been recorded in this session.",
        "This is local display of blocked-attempt metadata only; Concierge did not contact Napoleon, approve, write memory, dispatch agents, or send externally.",
      ].join("\n\n"),
      failureReturned: false,
      blockedEffectCount: 0,
      governanceReturned: false,
      traceReturned: false,
      auditReturned: false,
      descriptorFailureReturned: false,
    };
  }

  const reason = sanitizeVisibleProvenanceValue(failure.reason);
  const governance = sanitizeVisibleProvenanceValue(failure.governanceOutcome);
  const trace = sanitizeVisibleProvenanceValue(failure.traceId);
  const audit = sanitizeVisibleProvenanceValue(failure.auditId);
  const descriptor = sanitizeVisibleProvenanceValue(failure.descriptorFailureReason);
  const blockedEffects = failure.blockedEffects?.length
    ? failure.blockedEffects.map((effect) => sanitizeVisibleProvenanceValue(effect)).join(", ")
    : "not returned";
  const nextStep = sanitizeVisibleProvenanceValue(failure.nextStep);
  const fixOwner = describeBlockedAttemptFixOwner(failure);

  return {
    content: [
      "Latest blocked Napoleon attempt:",
      `Failure reason: ${reason}.`,
      `Governance: ${governance}.`,
      `Trace: ${trace}.`,
      `Audit: ${audit}.`,
      `Descriptor: ${descriptor}.`,
      `Blocked effects: ${blockedEffects}.`,
      `Likely fix owner: ${fixOwner}.`,
      `Next step: ${nextStep}.`,
      "No Napoleon response was accepted; fail-closed local state only.",
      "This is local display of blocked-attempt metadata only; Concierge did not contact Napoleon, approve, write memory, dispatch agents, or send externally.",
    ].join("\n\n"),
    failureReturned: true,
    blockedEffectCount: failure.blockedEffects?.length ?? 0,
    governanceReturned: governance !== "not returned" && governance !== "unavailable",
    traceReturned: trace !== "not returned" && trace !== "unavailable",
    auditReturned: audit !== "not returned" && audit !== "unavailable",
    descriptorFailureReturned: descriptor !== "not returned" && descriptor !== "unavailable",
  };
}

function formatNapoleonDelegationAnswer(
  presentation: Parameters<typeof exportNapoleonResponseProofJson>[0],
  questionContent = "",
): {
  content: string;
  proofReturned: boolean;
  selectedAgentCount: number;
  allowedEffectCount: number;
  blockedEffectCount: number;
  targetCapabilityReturned: boolean;
  recommendationReturned: boolean;
  selectedAgentContributionCount: number;
  selectedAgentReasonCount: number;
  traceReturned: boolean;
  auditReturned: boolean;
} {
  if (!presentation.proof || !presentation.proofMetadata) {
    return {
      content:
        "No returned Napoleon delegation proof is available in this session. Concierge will not name a handler, capability, or selected agent from local inference; this local answer did not contact Napoleon, approve, write memory, dispatch agents, or send externally.",
      proofReturned: false,
      selectedAgentCount: 0,
      allowedEffectCount: 0,
      blockedEffectCount: 0,
      targetCapabilityReturned: false,
      recommendationReturned: false,
      selectedAgentContributionCount: 0,
      selectedAgentReasonCount: 0,
      traceReturned: false,
      auditReturned: false,
    };
  }

  const proof = presentation.proof;
  const metadata = presentation.proofMetadata;
  const requestedSelectedAgentName = extractRequestedSelectedAgentName(questionContent);
  const requestedSelectedAgentReasonName = extractRequestedSelectedAgentReasonName(questionContent);
  const trace = detailValue(proof.details, "Trace");
  const audit = detailValue(proof.details, "Audit");
  const decision = detailValue(proof.details, "Decision");
  const authorityTier = detailValue(proof.details, "Authority tier");
  const approvalRequirement = detailValue(proof.details, "Approval requirement");
  const rationale = detailValue(proof.details, "Rationale");
  const matchingSelectedAgentReasons = requestedSelectedAgentReasonName
    ? metadata.selectedAgentReasons.filter(
        (reason) =>
          selectedAgentNameFromProofLine(reason).toLocaleLowerCase() ===
          requestedSelectedAgentReasonName.toLocaleLowerCase(),
      )
    : metadata.selectedAgentReasons;
  const whySelected = matchingSelectedAgentReasons.length
    ? matchingSelectedAgentReasons.join("; ")
    : requestedSelectedAgentReasonName
      ? `not returned for ${requestedSelectedAgentReasonName}`
      : "No selected-agent reason was returned.";
  const allowedEffects = metadata.allowedEffects.length ? metadata.allowedEffects.join(", ") : "not returned";
  const blockedEffects = metadata.blockedEffects.length ? metadata.blockedEffects.join(", ") : "not returned";
  const targetCapability = metadata.targetCapability || "not returned";
  const selectedAgents = metadata.selectedAgents.length ? metadata.selectedAgents.join(", ") : "not returned";
  const recommendation =
    metadata.recommendation && metadata.recommendation !== "unavailable" ? metadata.recommendation : "not returned";
  const matchingSelectedAgentContributions = requestedSelectedAgentName
    ? metadata.selectedAgentContributions.filter(
        (contribution) =>
          selectedAgentNameFromProofLine(contribution).toLocaleLowerCase() ===
          requestedSelectedAgentName.toLocaleLowerCase(),
      )
    : metadata.selectedAgentContributions;
  const selectedAgentContributions = matchingSelectedAgentContributions.length
    ? matchingSelectedAgentContributions.join("; ")
    : requestedSelectedAgentName
      ? `not returned for ${requestedSelectedAgentName}`
      : "not returned";

  return {
    content: [
      "Latest Napoleon delegation from returned bridge proof:",
      `Handled by: ${metadata.handledBy}.`,
      `Target capability: ${targetCapability}.`,
      `Selected agents: ${selectedAgents}.`,
      `Napoleon recommendation: ${recommendation}.`,
      `Selected-agent contribution: ${selectedAgentContributions}.`,
      `Why selected: ${whySelected}.`,
      `Allowed effects: ${allowedEffects}.`,
      `Blocked effects: ${blockedEffects}.`,
      `Governance: ${detailValue(proof.details, "Governance")}.`,
      `Decision: ${decision}.`,
      `Authority tier: ${authorityTier}.`,
      `Approval requirement: ${approvalRequirement}.`,
      `Rationale: ${rationale}.`,
      `Trace: ${trace}. Audit: ${audit}.`,
      `Proof alignment: ${metadata.proofAlignment}.`,
      "This is local display of returned bridge provenance only; Concierge did not contact Napoleon, approve, write memory, dispatch agents, or send externally.",
    ].join("\n\n"),
    proofReturned: true,
    selectedAgentCount: metadata.selectedAgents.length,
    allowedEffectCount: metadata.allowedEffects.length,
    blockedEffectCount: metadata.blockedEffects.length,
    targetCapabilityReturned: targetCapability !== "not returned" && targetCapability !== "unavailable",
    recommendationReturned: recommendation !== "not returned" && recommendation !== "unavailable",
    selectedAgentContributionCount: matchingSelectedAgentContributions.length,
    selectedAgentReasonCount: matchingSelectedAgentReasons.length,
    traceReturned: trace !== "not returned" && trace !== "unavailable",
    auditReturned: audit !== "not returned" && audit !== "unavailable",
  };
}

type NapoleonProofClearReason =
  | "current_proof_available"
  | "none"
  | "endpoint_changed"
  | "auth_token_changed"
  | "descriptor_state_changed"
  | "descriptor_discovery_refreshed"
  | "profile_changed"
  | "rehearsal_mode_enabled"
  | "bridge_failure"
  | "local_state_changed";

function describeNapoleonProofClearReasonNextStep(reason: NapoleonProofClearReason): string {
  switch (reason) {
    case "current_proof_available":
      return "Current returned proof is still available for local display.";
    case "endpoint_changed":
      return "Rediscover the Napoleon descriptor and complete a new governed bridge turn for the new endpoint before relying on proof.";
    case "auth_token_changed":
      return "Rediscover the Napoleon descriptor with the current bridge token and complete a new governed bridge turn before relying on proof.";
    case "descriptor_state_changed":
      return "Resolve the descriptor state, rediscover a valid Napoleon descriptor, and complete a new governed bridge turn before relying on proof.";
    case "descriptor_discovery_refreshed":
      return "Use only proof from a governed bridge turn completed after the latest descriptor discovery refresh.";
    case "profile_changed":
      return "Complete a new governed bridge turn under the active profile before relying on proof.";
    case "rehearsal_mode_enabled":
      return "Turn Rehearsal Mode off and complete a new governed bridge turn before relying on live Napoleon proof.";
    case "bridge_failure":
      return "Resolve the latest bridge failure and complete a successful governed bridge turn before relying on proof.";
    case "local_state_changed":
      return "Complete a new governed bridge turn after the local state change before relying on proof.";
    case "none":
    default:
      return "No returned proof has been accepted in this local session.";
  }
}

function formatNapoleonProofCurrentnessAnswer(
  presentation: Parameters<typeof exportNapoleonResponseProofJson>[0],
  provenanceState: VoiceResponseProvenanceState,
  clearReason: NapoleonProofClearReason,
): {
  content: string;
  currentProofAvailable: boolean;
  selectedAgentCount: number;
  blockedEffectCount: number;
  traceReturned: boolean;
  auditReturned: boolean;
} {
  if (!presentation.proof || !presentation.proofMetadata) {
    return {
      content: [
        "Latest Napoleon proof currentness from local state:",
        "Current returned proof available: no.",
        `Proof state: ${provenanceState}.`,
        `Last clear reason: ${clearReason}.`,
        `Required refresh: ${describeNapoleonProofClearReasonNextStep(clearReason)}`,
        "Concierge will not reuse stale Napoleon proof after the connection, descriptor, profile, or rehearsal context changes.",
        "This is local display of proof state only; Concierge did not contact Napoleon, approve, write memory, dispatch agents, or send externally.",
      ].join("\n\n"),
      currentProofAvailable: false,
      selectedAgentCount: 0,
      blockedEffectCount: 0,
      traceReturned: false,
      auditReturned: false,
    };
  }

  const proof = presentation.proof;
  const metadata = presentation.proofMetadata;
  const trace = detailValue(proof.details, "Trace");
  const audit = detailValue(proof.details, "Audit");
  const blockedEffects = metadata.blockedEffects.length ? metadata.blockedEffects.join(", ") : "not returned";

  return {
    content: [
      "Latest Napoleon proof currentness from local state:",
      "Current returned proof available: yes.",
      `Proof state: ${provenanceState}.`,
      `Required refresh: ${describeNapoleonProofClearReasonNextStep(clearReason)}`,
      `Handled by: ${metadata.handledBy}.`,
      `Governance: ${detailValue(proof.details, "Governance")}.`,
      `Blocked effects: ${blockedEffects}.`,
      `Trace: ${trace}. Audit: ${audit}.`,
      "This is local display of the latest returned bridge proof only; Concierge did not contact Napoleon, approve, write memory, dispatch agents, or send externally.",
    ].join("\n\n"),
    currentProofAvailable: true,
    selectedAgentCount: metadata.selectedAgents.length,
    blockedEffectCount: metadata.blockedEffects.length,
    traceReturned: trace !== "not returned" && trace !== "unavailable",
    auditReturned: audit !== "not returned" && audit !== "unavailable",
  };
}

function formatNapoleonProofComparisonAnswer(comparison: NapoleonResponseProofComparison | null): {
  content: string;
  comparisonStatus: NapoleonResponseProofComparison["status"] | "not_available";
  changeCount: number;
  reviewSummaryReturned: boolean;
} {
  if (!comparison) {
    return {
      content: [
        "Latest Napoleon proof comparison from local state:",
        "Comparison status: not_available.",
        "Changed fields: 0.",
        "No Napoleon response proof comparison is available in this app session. Export the current Napoleon proof twice, or compare after the returned proof changes, before asking what changed.",
        "This is local display of sanitized proof comparison metadata only; Concierge did not contact Napoleon, approve, write memory, dispatch agents, or send externally.",
      ].join("\n\n"),
      comparisonStatus: "not_available",
      changeCount: 0,
      reviewSummaryReturned: false,
    };
  }

  const reviewSummary = comparison.reviewSummary
    ? [
        `Current handled by: ${comparison.reviewSummary.handledBy}.`,
        `Current governance: ${comparison.reviewSummary.governance}.`,
        `Current trace: ${comparison.reviewSummary.trace}.`,
        `Current blocked effects: ${comparison.reviewSummary.blockedEffects}.`,
        `Current boundary: ${comparison.reviewSummary.boundary}.`,
        `Current proof alignment: ${comparison.reviewSummary.proofAlignment}.`,
      ]
    : ["Current proof review summary: not returned."];
  const changedFields = comparison.changes.length
    ? comparison.changes.map((change) => change.label).join(", ")
    : "none.";

  return {
    content: [
      "Latest Napoleon proof comparison from local state:",
      `Comparison status: ${comparison.status}.`,
      `Summary: ${comparison.summary}`,
      `Changed fields: ${comparison.changes.length}.`,
      `Changed field names: ${changedFields}`,
      ...reviewSummary,
      "This is local display of sanitized proof comparison metadata only; Concierge did not contact Napoleon, approve, write memory, dispatch agents, or send externally.",
    ].join("\n\n"),
    comparisonStatus: comparison.status,
    changeCount: comparison.changes.length,
    reviewSummaryReturned: Boolean(comparison.reviewSummary),
  };
}

function formatNapoleonReviewRequirementAnswer(
  presentation: Parameters<typeof exportNapoleonResponseProofJson>[0],
): {
  content: string;
  proofReturned: boolean;
  reviewRequired: boolean;
  blockedEffectCount: number;
  governanceReturned: boolean;
  decisionReturned: boolean;
  authorityTierReturned: boolean;
  approvalRequirementReturned: boolean;
  rationaleReturned: boolean;
  traceReturned: boolean;
  auditReturned: boolean;
} {
  if (!presentation.proof || !presentation.proofMetadata) {
    return {
      content:
        "No returned Napoleon review proof is available in this session. Concierge will not infer whether action is reviewed, approved, or blocked from local state; this local answer did not contact Napoleon, approve, write memory, dispatch agents, or send externally.",
      proofReturned: false,
      reviewRequired: false,
      blockedEffectCount: 0,
      governanceReturned: false,
      decisionReturned: false,
      authorityTierReturned: false,
      approvalRequirementReturned: false,
      rationaleReturned: false,
      traceReturned: false,
      auditReturned: false,
    };
  }

  const proof = presentation.proof;
  const metadata = presentation.proofMetadata;
  const governance = detailValue(proof.details, "Governance");
  const decision = detailValue(proof.details, "Decision");
  const authorityTier = detailValue(proof.details, "Authority tier");
  const approvalRequirement = detailValue(proof.details, "Approval requirement");
  const rationale = detailValue(proof.details, "Rationale");
  const trace = detailValue(proof.details, "Trace");
  const audit = detailValue(proof.details, "Audit");
  const blockedEffects = metadata.blockedEffects.length ? metadata.blockedEffects.join(", ") : "not returned";
  const reviewRequired = governance === "requires_review" || governance === "deny" || governance === "no_go";
  const nextStep = reviewRequired
    ? "Review the returned Napoleon governance state and blocked effects before treating this as actionable."
    : "No returned review requirement is visible in the latest accepted proof, but this is still not local approval.";

  return {
    content: [
      "Latest Napoleon review requirement from returned bridge proof:",
      `Governance: ${governance}.`,
      `Review required: ${reviewRequired ? "yes" : "no returned review requirement"}.`,
      `Decision: ${decision}.`,
      `Authority tier: ${authorityTier}.`,
      `Approval requirement: ${approvalRequirement}.`,
      `Rationale: ${rationale}.`,
      `Trace: ${trace}. Audit: ${audit}.`,
      `Blocked effects: ${blockedEffects}.`,
      `Next step: ${nextStep}`,
      "This is local display of returned bridge proof only; Concierge did not contact Napoleon, approve, write memory, dispatch agents, or send externally.",
    ].join("\n\n"),
    proofReturned: true,
    reviewRequired,
    blockedEffectCount: metadata.blockedEffects.length,
    governanceReturned: governance !== "not returned" && governance !== "unavailable",
    decisionReturned: decision !== "not returned" && decision !== "unavailable",
    authorityTierReturned: authorityTier !== "not returned" && authorityTier !== "unavailable",
    approvalRequirementReturned: approvalRequirement !== "not returned" && approvalRequirement !== "unavailable",
    rationaleReturned: rationale !== "not returned" && rationale !== "unavailable",
    traceReturned: trace !== "not returned" && trace !== "unavailable",
    auditReturned: audit !== "not returned" && audit !== "unavailable",
  };
}

function formatNapoleonRequiredActionAnswer(
  evaluatorImport: EvaluatorValidationImport | null,
  profileMode: NapoleonProfileMode,
): { content: string; actionCount: number; status: string; runtimeValidationSource: string } {
  if (!evaluatorImport) {
    return {
      content:
        "No Napoleon required-action evidence is currently imported. Import a sanitized real-runtime evaluator validation summary first; this answer is local evidence only and does not contact Napoleon, approve anything, write memory, dispatch agents, or send externally.",
      actionCount: 0,
      status: "not_imported",
      runtimeValidationSource: "unavailable",
    };
  }

  const actions = evaluatorImport.validation.napoleonRequiredActions ?? [];
  const runtimeValidationSource = evaluatorImport.runtimeValidationSource ?? "unavailable";
  if (!actions.length && evaluatorImport.validation.descriptorHandoffRequiredAction) {
    return {
      content: [
        `Current Napoleon-side blocker from sanitized validation evidence: ${evaluatorImport.validation.descriptorHandoffRequiredAction}`,
        `Evaluator status: ${evaluatorImport.validation.status}. Runtime validation source: ${runtimeValidationSource}.`,
        `Profile scope: ${profileMode}. This is local review evidence only; Concierge did not approve, apply, write memory, dispatch agents, or send externally.`,
      ].join("\n\n"),
      actionCount: 0,
      status: evaluatorImport.validation.status,
      runtimeValidationSource,
    };
  }

  if (!actions.length) {
    return {
      content: [
        "No Napoleon required-action packet is currently present in the imported evaluator evidence.",
        `Evaluator status: ${evaluatorImport.validation.status}. Runtime validation source: ${runtimeValidationSource}.`,
        `Profile scope: ${profileMode}. This is local review evidence only; Concierge did not approve, apply, write memory, dispatch agents, or send externally.`,
      ].join("\n\n"),
      actionCount: 0,
      status: evaluatorImport.validation.status,
      runtimeValidationSource,
    };
  }

  const rows = actions
    .map((action) => {
      const target = action.targetPath ? ` Target: ${action.targetPath}.` : "";
      const requestKind = action.requestKind ? ` Request kind: ${action.requestKind}.` : "";
      const required = action.requiredAction ? ` Required change: ${action.requiredAction}` : "";
      return `- ${action.id}.${target}${requestKind}${required}`;
    })
    .join("\n");

  return {
    content: [
      `Current Napoleon required actions from sanitized validation evidence (${actions.length}):`,
      rows,
      `Evaluator status: ${evaluatorImport.validation.status}. Runtime validation source: ${runtimeValidationSource}.`,
      `Profile scope: ${profileMode}. This is local review evidence only; Concierge did not contact Napoleon for this answer, approve, apply, write memory, dispatch agents, or send externally.`,
    ].join("\n\n"),
    actionCount: actions.length,
    status: evaluatorImport.validation.status,
    runtimeValidationSource,
  };
}

function detailValue(details: Array<{ label: string; value: string }>, label: string): string {
  return details.find((detail) => detail.label === label)?.value ?? "not returned";
}

function describeSteeringRecommendationType(draft: ReturnType<typeof draftChiefOfStaffSteering>): string {
  return draft.recommendation.recommendationType === "guided_readiness_repair"
    ? "guided readiness repair"
    : "scored capability recommendation";
}

function describeSteeringRecommendationTypeValue(recommendationType: SteeringRecommendationType): string {
  return recommendationType === "guided_readiness_repair"
    ? "guided readiness repair"
    : "scored capability recommendation";
}

function describeSteeringRecommendationDisplayType(draft: ReturnType<typeof draftChiefOfStaffSteering>): string {
  if (
    draft.recommendation.recommendationType === "guided_readiness_repair" &&
    draft.recommendation.capabilityLabel === "descriptor_discovery"
  ) {
    return "Napoleon descriptor readiness repair";
  }
  if (
    draft.recommendation.recommendationType === "guided_readiness_repair" &&
    draft.recommendation.capabilityLabel.endsWith("media_session_readiness_summary")
  ) {
    return "Media Session readiness repair";
  }
  return describeSteeringRecommendationType(draft);
}

function describeTaxonomyReviewFocus(draft: ChiefOfStaffTaxonomyReviewDraft): string {
  const [firstRecommendation] = draft.recommendations;
  if (!firstRecommendation) return "0 taxonomy recommendation(s)";
  const target = firstRecommendation.targetLabel ? ` into ${firstRecommendation.targetLabel}` : "";
  return `${firstRecommendation.action} ${firstRecommendation.dimension} ${firstRecommendation.sourceLabel}${target}`;
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

interface AppProps {
  initialProfile?: LocalProfile;
}

export function App({ initialProfile = "adult_owner" }: AppProps = {}) {
  const mediaSessionReadinessInitialized = useRef(false);
  const [messages, setMessages] = useState<ConciergeMessage[]>([
    {
      role: "assistant",
      content: "Text Concierge is ready in prepare-only mode. Camera and microphone are off.",
    },
  ]);
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<LocalProfile>(initialProfile);
  const [rehearsalMode, setRehearsalMode] = useState(true);
  const [descriptorMode, setDescriptorMode] =
    useState<"discovered" | "live" | "missing" | "checksum_mismatch" | "stale">("discovered");
  const [liveDescriptorInput, setLiveDescriptorInput] = useState<DescriptorConnectionInput | null>(null);
  const [descriptorDiscoveryMessage, setDescriptorDiscoveryMessage] = useState<string | null>(null);
  const [chiefOfStaffCapabilities, setChiefOfStaffCapabilities] =
    useState<ChiefOfStaffCapabilityDiscoveryResult | null>(null);
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
  const [bridgeResponseProvenanceState, setBridgeResponseProvenanceState] =
    useState<VoiceResponseProvenanceState>("not_returned");
  const [lastNapoleonProofClearReason, setLastNapoleonProofClearReason] =
    useState<NapoleonProofClearReason>("none");
  const [napoleonProofExportJson, setNapoleonProofExportJson] = useState<string | null>(null);
  const [napoleonProofComparison, setNapoleonProofComparison] = useState<NapoleonResponseProofComparison | null>(null);
  const [lastBridgeFailure, setLastBridgeFailure] = useState<string | null>(null);
  const [lastNapoleonTurnFailure, setLastNapoleonTurnFailure] = useState<LastNapoleonTurnFailureInput | null>(null);
  const [bridgeEvidenceReadiness, setBridgeEvidenceReadiness] = useState(buildBridgeEvidenceReadinessState);
  const [bridgeReadinessProofJson, setBridgeReadinessProofJson] = useState<string | null>(null);
  const [bridgeReadinessProofComparison, setBridgeReadinessProofComparison] =
    useState<BridgeReadinessProofComparison | null>(null);
  const [napoleonRequiredActionsExportJson, setNapoleonRequiredActionsExportJson] = useState<string | null>(null);
  const [acceptedReadinessProofInput, setAcceptedReadinessProofInput] = useState("");
  const [acceptedReadinessProofImport, setAcceptedReadinessProofImport] =
    useState<AcceptedBridgeReadinessProofImport | null>(null);
  const [evaluatorValidationArtifactInput, setEvaluatorValidationArtifactInput] = useState("");
  const [evaluatorValidationImport, setEvaluatorValidationImport] = useState<EvaluatorValidationImport | null>(null);
  const [evaluatorValidationFileName, setEvaluatorValidationFileName] = useState<string | null>(null);
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
  const [capabilityAnswerDrilldownExportJson, setCapabilityAnswerDrilldownExportJson] = useState<string | null>(null);
  const [chiefOfStaffRequestPacket, setChiefOfStaffRequestPacket] = useState<ChiefOfStaffRequestPacket | null>(null);
  const [governanceEvaluationPacket, setGovernanceEvaluationPacket] = useState<GovernanceEvaluationPacket | null>(null);
  const [capabilityReviewPacketExportJson, setCapabilityReviewPacketExportJson] = useState<string | null>(null);
  const [capabilityReviewPacket, setCapabilityReviewPacket] = useState<ExportedCapabilityReviewPacket | null>(null);
  const [chiefOfStaffRequestPacketSubmission, setChiefOfStaffRequestPacketSubmission] =
    useState<ContractPacketSubmissionResult | null>(null);
  const [chiefOfStaffRequestPacketFailure, setChiefOfStaffRequestPacketFailure] = useState<string | null>(null);
  const [governanceEvaluationPacketSubmission, setGovernanceEvaluationPacketSubmission] =
    useState<ContractPacketSubmissionResult | null>(null);
  const [governanceEvaluationPacketFailure, setGovernanceEvaluationPacketFailure] = useState<string | null>(null);
  const [capabilityReviewPacketSubmission, setCapabilityReviewPacketSubmission] =
    useState<CapabilityReviewPacketSubmissionView | null>(null);
  const [capabilityReviewPacketFailure, setCapabilityReviewPacketFailure] = useState<string | null>(null);
  const [newAgentProposalPacket, setNewAgentProposalPacket] = useState<NewAgentProposalReviewPacket | null>(null);
  const [newAgentProposalPacketExportJson, setNewAgentProposalPacketExportJson] = useState<string | null>(null);
  const [newAgentProposalSubmission, setNewAgentProposalSubmission] =
    useState<NewAgentProposalReviewSubmissionResult | null>(null);
  const [newAgentProposalFailure, setNewAgentProposalFailure] = useState<string | null>(null);
  const [evolutionProposalSubmissionPacket, setEvolutionProposalSubmissionPacket] =
    useState<EvolutionProposalSubmissionPacket | null>(null);
  const [evolutionProposalSubmissionPacketExportJson, setEvolutionProposalSubmissionPacketExportJson] =
    useState<string | null>(null);
  const [evolutionProposalSubmission, setEvolutionProposalSubmission] =
    useState<EvolutionProposalSubmissionResult | null>(null);
  const [evolutionProposalSubmissionFailure, setEvolutionProposalSubmissionFailure] = useState<string | null>(null);
  const [evolutionProposalStatusFailure, setEvolutionProposalStatusFailure] = useState<string | null>(null);
  const [evolutionProposalLifecycleRecords, setEvolutionProposalLifecycleRecords] = useState(() =>
    loadEvolutionProposalLifecycleRecords(browserStorage()),
  );
  const [evolutionProposalLifecycleExportJson, setEvolutionProposalLifecycleExportJson] = useState<string | null>(null);
  const [steeringDraft, setSteeringDraft] = useState<ChiefOfStaffSteeringDraft | null>(null);
  const [steeringDraftExportJson, setSteeringDraftExportJson] = useState<string | null>(null);
  const [chiefOfStaffRequestPacketExportJson, setChiefOfStaffRequestPacketExportJson] = useState<string | null>(null);
  const [governanceEvaluationPacketExportJson, setGovernanceEvaluationPacketExportJson] = useState<string | null>(null);
  const [steeringSubmission, setSteeringSubmission] = useState<SteeringSubmissionView | null>(null);
  const [steeringFailure, setSteeringFailure] = useState<string | null>(null);
  const [capabilityTaxonomy, setCapabilityTaxonomy] = useState(() => loadCapabilityTaxonomyFromStorage(browserStorage()));
  const [selectedTaxonomyLabel, setSelectedTaxonomyLabel] = useState("");
  const [taxonomyRenameValue, setTaxonomyRenameValue] = useState("");
  const [taxonomyMergeTarget, setTaxonomyMergeTarget] = useState("");
  const [taxonomyReviewDraft, setTaxonomyReviewDraft] = useState<ChiefOfStaffTaxonomyReviewDraft | null>(null);
  const [taxonomyReviewSubmission, setTaxonomyReviewSubmission] =
    useState<TaxonomyReviewSubmissionView | null>(null);
  const [taxonomyReviewFailure, setTaxonomyReviewFailure] = useState<string | null>(null);
  const [observabilityTraceHandoffResult, setObservabilityTraceHandoffResult] =
    useState<ObservabilityTraceHandoffResult | null>(null);
  const [observabilityTraceHandoffFailure, setObservabilityTraceHandoffFailure] = useState<string | null>(null);

  function clearNapoleonPresentation(reason: NapoleonProofClearReason = "local_state_changed") {
    setBridgeResponseProvenanceState((current) =>
      lastNapoleonPresentation.proof || current === "returned_bridge" ? "stale_cleared" : current,
    );
    if (lastNapoleonPresentation.proof || bridgeResponseProvenanceState === "returned_bridge") {
      setLastNapoleonProofClearReason(reason);
    }
    setLastNapoleonPresentation(clearNapoleonResponsePresentation());
    setNapoleonProofExportJson(null);
    setNapoleonProofComparison(null);
  }

  function clearVisibleTurnBoundaryState() {
    setLastDecision(null);
    setLastBridgeFailure(null);
    setLastNapoleonTurnFailure(null);
  }

  function clearChiefOfStaffCapabilities() {
    setChiefOfStaffCapabilities(null);
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
    setChiefOfStaffRequestPacketSubmission(null);
    setChiefOfStaffRequestPacketFailure(null);
    setGovernanceEvaluationPacketSubmission(null);
    setGovernanceEvaluationPacketFailure(null);
    setCapabilityReviewPacketSubmission(null);
    setCapabilityReviewPacketFailure(null);
    setNewAgentProposalSubmission(null);
    setNewAgentProposalFailure(null);
    setEvolutionProposalSubmission(null);
    setEvolutionProposalSubmissionFailure(null);
    setEvolutionProposalStatusFailure(null);
    setObservabilityTraceHandoffResult(null);
    setObservabilityTraceHandoffFailure(null);
  }

  function clearProfileScopedCapabilityDrafts() {
    setSteeringDraft(null);
    setSteeringDraftExportJson(null);
    clearContractPacketExports();
    setSteeringSubmission(null);
    setSteeringFailure(null);
    setTaxonomyReviewDraft(null);
    setTaxonomyReviewSubmission(null);
    setTaxonomyReviewFailure(null);
    clearCapabilityReviewPacketState();
  }

  function clearTaxonomyReviewDraftState() {
    setTaxonomyReviewDraft(null);
    setTaxonomyReviewSubmission(null);
    setTaxonomyReviewFailure(null);
  }

  function clearContractPacketExports() {
    setChiefOfStaffRequestPacket(null);
    setGovernanceEvaluationPacket(null);
    setChiefOfStaffRequestPacketExportJson(null);
    setGovernanceEvaluationPacketExportJson(null);
    setChiefOfStaffRequestPacketSubmission(null);
    setChiefOfStaffRequestPacketFailure(null);
    setGovernanceEvaluationPacketSubmission(null);
    setGovernanceEvaluationPacketFailure(null);
  }

  function clearCapabilityReviewPacketState() {
    setCapabilityReviewPacketExportJson(null);
    setCapabilityReviewPacket(null);
    setCapabilityReviewPacketSubmission(null);
    setCapabilityReviewPacketFailure(null);
    setNewAgentProposalPacket(null);
    setNewAgentProposalPacketExportJson(null);
    setNewAgentProposalSubmission(null);
    setNewAgentProposalFailure(null);
    setEvolutionProposalSubmissionPacket(null);
    setEvolutionProposalSubmissionPacketExportJson(null);
    setEvolutionProposalSubmission(null);
    setEvolutionProposalSubmissionFailure(null);
    setEvolutionProposalStatusFailure(null);
    setEvolutionProposalLifecycleExportJson(null);
  }

  function setSuccessfulNapoleonPresentation(response: Parameters<typeof buildSuccessfulNapoleonResponsePresentation>[0]) {
    const capabilityLabelsById = Object.fromEntries(
      (chiefOfStaffCapabilities?.capabilities ?? []).map((capability) => [capability.id, capability.label]),
    );
    setLastNapoleonPresentation(buildSuccessfulNapoleonResponsePresentation(response, { capabilityLabelsById }));
    setBridgeResponseProvenanceState("returned_bridge");
    setLastNapoleonProofClearReason("current_proof_available");
    setNapoleonProofExportJson(null);
    setNapoleonProofComparison(null);
    setLastBridgeFailure(null);
    setLastNapoleonTurnFailure(null);
  }

  function currentDescriptorInput(): DescriptorConnectionInput {
    if (descriptorMode === "live" && liveDescriptorInput) {
      return {
        ...liveDescriptorInput,
        endpointConfigured: Boolean(endpoint.trim()),
      };
    }
    if (descriptorMode === "stale") {
      return {
        endpointConfigured: Boolean(endpoint.trim()),
        descriptor: defaultChiefOfStaffDescriptor,
        expectedChecksum: "sha256:local-static",
        actualChecksum: "sha256:local-static",
        signatureValid: true,
        discoveredAt: "2026-01-01T00:00:00.000Z",
        maxAgeSeconds: 60,
        now: "2026-01-01T00:02:00.000Z",
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

  function voiceAvatarBridgePreviewInput(): {
    responseText: string;
    speakerLabel: string;
    bridgeProvidedProvenance: boolean;
    provenanceState: VoiceResponseProvenanceState;
  } {
    if (bridgeResponseProvenanceState === "returned_bridge") {
      const recommendation = lastNapoleonPresentation.proofMetadata?.recommendation;
      const selectedAgent = lastNapoleonPresentation.proofMetadata?.selectedAgents[0] ?? "Passive Brain";
      return {
        responseText: `Napoleon recommends ${
          recommendation && recommendation !== "unavailable" ? recommendation : "using the latest governed bridge response"
        }. ${selectedAgent} found returned bridge context for this preview.`,
        speakerLabel: "Napoleon",
        bridgeProvidedProvenance: true,
        provenanceState: "returned_bridge",
      };
    }

    if (bridgeResponseProvenanceState === "stale_cleared") {
      return {
        responseText:
          "Napoleon recommends using previously returned bridge context. Passive Brain found stale context that must not be attributed after proof is cleared.",
        speakerLabel: "Napoleon",
        bridgeProvidedProvenance: true,
        provenanceState: "stale_cleared",
      };
    }

    return {
      responseText: localVoiceResponseShapeSample.responseText,
      speakerLabel: localVoiceResponseShapeSample.speakerLabel,
      bridgeProvidedProvenance: false,
      provenanceState: "not_returned",
    };
  }

  const descriptorConnection = buildDescriptorConnectionState(currentDescriptorInput());
  const descriptorStatus = descriptorConnection.descriptorStatus;
  const memoryHandoffReadiness = describeGovernedHandoffReadiness({
    label: "Memory proposal review",
    descriptorConnection,
    draftReady: Boolean(lastMemoryReviewState && lastMemoryReviewState.status !== "dismissed_locally"),
    rehearsalMode,
    requiredHandoff: "memory_proposal_review",
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
    requiredHandoff: "governance_review",
  });
  const steeringHandoffReadiness = describeGovernedHandoffReadiness({
    label: "Chief of Staff steering",
    descriptorConnection,
    draftReady: Boolean(steeringDraft),
    rehearsalMode,
    requiredHandoff: "evolution_proposal_review",
  });
  const taxonomyHandoffReadiness = describeGovernedHandoffReadiness({
    label: "Chief of Staff taxonomy review",
    descriptorConnection,
    draftReady: Boolean(taxonomyReviewDraft),
    rehearsalMode,
    requiredHandoff: "taxonomy_review",
  });
  const capabilityReviewPacketHandoffReadiness = describeGovernedHandoffReadiness({
    label: "Capability review packet",
    descriptorConnection,
    draftReady: Boolean(capabilityReviewPacket),
    rehearsalMode,
    requiredHandoff: "evolution_proposal_review",
  });
  const newAgentProposalHandoffReadiness = describeGovernedHandoffReadiness({
    label: "New-agent proposal review",
    descriptorConnection,
    draftReady: Boolean(newAgentProposalPacket),
    artifactLabel: "New-agent proposal",
    artifactReadyDetail: "A draft Napoleon-owned agent proposal is ready for review.",
    artifactBlockedDetail: "Draft a new-agent proposal from a capability review packet before attempting handoff.",
    readyNextStepSummary: "Next step: submit this proposal-only new-agent packet through the governed Napoleon bridge.",
    rehearsalMode,
    requiredHandoff: "new_agent_proposal_review",
  });
  const evolutionProposalSubmissionReadiness = describeGovernedHandoffReadiness({
    label: "Evolution proposal submission",
    descriptorConnection,
    draftReady: Boolean(evolutionProposalSubmissionPacket),
    artifactLabel: "Evolution proposal",
    artifactReadyDetail: "A proposal-only evolution packet is ready for Napoleon intake.",
    artifactBlockedDetail: "Draft an evolution proposal submission packet from a capability review packet before attempting handoff.",
    readyNextStepSummary: "Next step: submit this proposal-only evolution packet through the governed Napoleon bridge.",
    rehearsalMode,
    requiredHandoff: "evolution_proposal_submission",
  });
  const evolutionProposalStatusRefreshAvailable = Boolean(
    !rehearsalMode &&
      endpoint.trim() &&
      descriptorConnection.canAttemptLiveBridge &&
      descriptorSupportsGovernedHandoff(descriptorConnection, "evolution_proposal_status"),
  );
  const evolutionProposalStatusRefreshBlockedReason = rehearsalMode
    ? "Rehearsal Mode is active, so Concierge will not contact Napoleon."
    : !endpoint.trim()
      ? "No Napoleon endpoint is configured."
      : !descriptorConnection.canAttemptLiveBridge
        ? descriptorConnection.message
        : !descriptorSupportsGovernedHandoff(descriptorConnection, "evolution_proposal_status")
          ? "Descriptor does not advertise the read-only evolution proposal status handoff."
          : null;
  const latestInteractionTraceId = findLatestInteractionTraceId(browserStorage());
  const observabilityTraceHandoffReadiness = describeGovernedHandoffReadiness({
    label: "Observability trace handoff",
    descriptorConnection,
    draftReady: Boolean(latestInteractionTraceId),
    artifactLabel: "Trace evidence",
    artifactReadyDetail: "A sanitized latest interaction trace is available.",
    artifactBlockedDetail: "Create a latest interaction trace before attempting handoff.",
    readyNextStepSummary: "Next step: submit this evidence-only trace packet through the governed Napoleon bridge when ready.",
    rehearsalMode,
    requiredHandoff: "observability_trace",
  });

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
    setObservabilityTraceHandoffResult(null);
    setObservabilityTraceHandoffFailure(null);
    refreshTelemetryBufferStatus();
  }

  async function submitLatestInteractionTraceHandoff() {
    const latestTraceId = findLatestInteractionTraceId(browserStorage());
    if (!latestTraceId) return;
    const traceExportJson = exportInteractionTraceJson(browserStorage(), latestTraceId);
    setInteractionTraceExportJson(traceExportJson);
    const traceExport = JSON.parse(traceExportJson) as {
      trace_id: string;
      napoleon_references?: {
        request_id?: string;
        decision_id?: string;
        audit_id?: string;
        governance_outcome?: string;
        bridge_failure_reason?: string;
        blocked_effects?: string[];
      };
    };
    const packet = buildObservabilityTraceHandoffPacket(
      {
        traceId: traceExport.trace_id,
        requestId: traceExport.napoleon_references?.request_id,
        decisionId: traceExport.napoleon_references?.decision_id,
        auditId: traceExport.napoleon_references?.audit_id,
        governanceOutcome: traceExport.napoleon_references?.governance_outcome,
        failureReason: traceExport.napoleon_references?.bridge_failure_reason,
        blockedEffects: traceExport.napoleon_references?.blocked_effects,
        evidenceRefs: [`trace:${traceExport.trace_id}`],
      },
      profile,
    );
    try {
      const result = await submitObservabilityTraceHandoff(packet, {
        profile,
        rehearsalMode,
        descriptorConnection: currentDescriptorInput(),
        getEndpoint: () => endpoint.trim() || null,
        getAuthToken: () => authToken.trim() || null,
      });
      setObservabilityTraceHandoffResult(result);
      setObservabilityTraceHandoffFailure(null);
      refreshTelemetryBufferStatus();
      refreshCapabilityLedgerStatus();
    } catch (error) {
      setObservabilityTraceHandoffFailure(
        describeGovernedHandoffFailure(error, "Observability trace handoff", "append traces or create audit authority"),
      );
      setObservabilityTraceHandoffResult(null);
      refreshTelemetryBufferStatus();
      refreshCapabilityLedgerStatus();
    }
  }

  function clearLocalTelemetryBuffer() {
    clearTelemetryBuffer(browserStorage());
    setTelemetryBufferExportJson(null);
    setInteractionTraceExportJson(null);
    setObservabilityTraceHandoffResult(null);
    setObservabilityTraceHandoffFailure(null);
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
    setObservabilityTraceHandoffResult(null);
    setObservabilityTraceHandoffFailure(null);
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
    setSteeringDraft(null);
    setSteeringDraftExportJson(null);
    setSteeringSubmission(null);
    setSteeringFailure(null);
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

  function clearNapoleonRequiredActionsExport() {
    setNapoleonRequiredActionsExportJson(null);
  }

  function clearAcceptedReadinessProofContext() {
    setAcceptedReadinessProofInput("");
    setAcceptedReadinessProofImport(null);
    clearVoicePipelineProof();
  }

  function clearBridgeEvidenceReadiness() {
    setBridgeEvidenceReadiness(buildBridgeEvidenceReadinessState());
    setEvaluatorValidationArtifactInput("");
    setEvaluatorValidationImport(null);
    setEvaluatorValidationFileName(null);
    clearNapoleonRequiredActionsExport();
  }

  function clearVoicePipelineProof() {
    setVoicePipelineProofJson(null);
    setVoicePipelineProofComparison(null);
  }

  function clearLocalVoiceAndAvatarSampleResults() {
    setVadSampleSegments(null);
    setSttSampleResult(null);
    setTtsSampleResult(null);
    setVoiceTurnRehearsalResult(null);
    setBargeInRehearsalResult(null);
    setVoiceResponseShapeResult(null);
    setWakeWordDetectionSampleResult(null);
    setNeutralAvatarStateResult(null);
    setAvatarExpressionResult(null);
    setAvatarLipSyncResult(null);
    setAvatarGazeResult(null);
    setAvatarFacePoseResult(null);
    setAvatarAffectFusionResult(null);
    setAvatarModelResult(null);
    setAvatarRendererReadinessResult(null);
  }

  function updateEndpoint(value: string) {
    setEndpoint(value);
    setSteeringDraftExportJson(null);
    setLiveDescriptorInput(null);
    setDescriptorDiscoveryMessage(null);
    clearBridgeReadinessProof();
    clearAcceptedReadinessProofContext();
    clearBridgeEvidenceReadiness();
    clearNapoleonPresentation("endpoint_changed");
    clearVisibleTurnBoundaryState();
    clearChiefOfStaffCapabilities();
    clearLocalReviewDrafts();
    clearGovernedHandoffResults();
    clearTaxonomyReviewDraftState();
    clearCapabilityReviewPacketState();
    clearContractPacketExports();
    if (typeof localStorage === "undefined") return;
    if (value.trim()) {
      localStorage.setItem("napoleon_endpoint", value.trim());
    } else {
      localStorage.removeItem("napoleon_endpoint");
    }
  }

  function updateAuthToken(value: string) {
    const authTokenChanged = value !== authToken;
    setAuthToken(value);
    if (authTokenChanged) {
      setSteeringDraft(null);
    }
    setSteeringDraftExportJson(null);
    setLiveDescriptorInput(null);
    setDescriptorDiscoveryMessage(null);
    clearBridgeReadinessProof();
    clearAcceptedReadinessProofContext();
    clearBridgeEvidenceReadiness();
    clearNapoleonPresentation("auth_token_changed");
    clearVisibleTurnBoundaryState();
    clearChiefOfStaffCapabilities();
    clearLocalReviewDrafts();
    clearGovernedHandoffResults();
    clearTaxonomyReviewDraftState();
    clearCapabilityReviewPacketState();
    clearContractPacketExports();
    if (typeof localStorage === "undefined") return;
    if (value.trim()) {
      localStorage.setItem("napoleon_auth_token", value.trim());
    } else {
      localStorage.removeItem("napoleon_auth_token");
    }
  }

  function updateDescriptorMode(value: "discovered" | "live" | "missing" | "checksum_mismatch" | "stale") {
    setDescriptorMode(value);
    setSteeringDraftExportJson(null);
    clearBridgeReadinessProof();
    clearAcceptedReadinessProofContext();
    clearBridgeEvidenceReadiness();
    clearNapoleonPresentation("descriptor_state_changed");
    clearVisibleTurnBoundaryState();
    clearChiefOfStaffCapabilities();
    clearLocalReviewDrafts();
    clearGovernedHandoffResults();
    clearTaxonomyReviewDraftState();
    clearCapabilityReviewPacketState();
    clearContractPacketExports();
  }

  function updateRehearsalMode(enabled: boolean) {
    setRehearsalMode(enabled);
    setSteeringDraftExportJson(null);
    clearContractPacketExports();
    if (enabled) {
      setPendingRehearsal(null);
      clearBridgeReadinessProof();
      clearAcceptedReadinessProofContext();
      clearBridgeEvidenceReadiness();
      clearNapoleonPresentation("rehearsal_mode_enabled");
      clearVisibleTurnBoundaryState();
      clearChiefOfStaffCapabilities();
      clearLocalReviewDrafts();
      clearGovernedHandoffResults();
      clearTaxonomyReviewDraftState();
      clearCapabilityReviewPacketState();
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
    setCameraPermissionStatus("requested");
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
    setMicrophonePermissionStatus("requested");
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
      blockedEffects: result.blockedEffects,
    });
  }

  function runLocalSttSample() {
    const traceId = newTraceId();
    emitEvent("stt_started", {
      traceId,
      conversationId,
      model: localSttSample.model,
      localSampleOnly: true,
      captureStarted: false,
      rawAudioStored: false,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
    });
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
    const previewInput = voiceAvatarBridgePreviewInput();
    const result = shapeVoiceResponseForSpeech({
      ...localVoiceResponseShapeSample,
      responseText: previewInput.responseText,
      speakerLabel: previewInput.speakerLabel,
      bridgeProvidedProvenance: previewInput.bridgeProvidedProvenance,
      provenanceState: previewInput.provenanceState,
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
      bridgeProvidedProvenance: result.provenanceState === "returned_bridge",
      provenanceState: result.provenanceState,
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
    if (result.childProtected) {
      emitEvent("child_voice_policy_applied", {
        traceId,
        conversationId,
        profileMode: result.profileMode,
        childProtected: result.childProtected,
        maxSpokenCharsApplied: result.maxSpokenCharsApplied,
        pacing: result.pacing,
        requiresGuardianReviewReminder: result.requiresGuardianReviewReminder,
        localPreparationOnly: result.localPreparationOnly,
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
  }

  function runLocalNeutralAvatarState() {
    const traceId = newTraceId();
    const previewInput = voiceAvatarBridgePreviewInput();
    const result = buildLocalNeutralAvatarState({
      ...localNeutralAvatarStateSample,
      responseText: previewInput.responseText,
      bridgeProvidedProvenance: previewInput.bridgeProvidedProvenance,
      provenanceState: previewInput.provenanceState as AvatarProvenanceState,
      profileMode: profile,
    });
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
      bridgeProvidedProvenance: result.provenanceState === "returned_bridge",
      provenanceState: result.provenanceState,
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
    if (result.childProtected) {
      emitEvent("child_avatar_policy_applied", {
        traceId,
        conversationId,
        profileMode: result.profileMode,
        childProtected: result.childProtected,
        cameraPolicy: result.cameraPolicy,
        affectPolicy: result.affectPolicy,
        guardianApprovalCaptured: result.guardianApprovalCaptured,
        localDisplayOnly: result.localDisplayOnly,
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
  }

  function runLocalAvatarExpressionMapping() {
    const traceId = newTraceId();
    const previewInput = voiceAvatarBridgePreviewInput();
    const result = mapLocalAvatarExpression({
      ...localAvatarExpressionSample,
      bridgeProvidedProvenance: previewInput.bridgeProvidedProvenance,
      provenanceState: previewInput.provenanceState as AvatarProvenanceState,
      profileMode: profile,
    });
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
      provenanceState: result.provenanceState,
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
      setSteeringDraftExportJson(null);
      clearBridgeReadinessProof();
      clearAcceptedReadinessProofContext();
      clearBridgeEvidenceReadiness();
      clearNapoleonPresentation("descriptor_discovery_refreshed");
      clearVisibleTurnBoundaryState();
      clearChiefOfStaffCapabilities();
      clearLocalReviewDrafts();
      clearGovernedHandoffResults();
      clearTaxonomyReviewDraftState();
      clearCapabilityReviewPacketState();
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
        descriptorFreshnessState: result.connection.freshnessState,
        canAttemptLiveBridge: result.connection.canAttemptLiveBridge,
        failClosedReason: result.connection.failClosedReason ?? "none",
      });
    } catch (error) {
      const failedInput = { endpointConfigured: Boolean(selectedEndpoint), descriptor: null };
      const failedConnection = buildDescriptorConnectionState(failedInput);
      setLiveDescriptorInput(failedInput);
      setDescriptorMode("live");
      setDescriptorDiscoveryMessage("Descriptor discovery failed closed. Concierge will not attempt live bridge calls.");
      setSteeringDraftExportJson(null);
      clearBridgeReadinessProof();
      clearAcceptedReadinessProofContext();
      clearBridgeEvidenceReadiness();
      clearNapoleonPresentation("descriptor_discovery_refreshed");
      clearVisibleTurnBoundaryState();
      clearChiefOfStaffCapabilities();
      clearLocalReviewDrafts();
      clearGovernedHandoffResults();
      clearTaxonomyReviewDraftState();
      emitEvent("descriptor_discovery_failed", {
        traceId: newTraceId(),
        conversationId,
        state: failedConnection.state,
        checksumState: failedConnection.checksumState,
        signatureState: failedConnection.signatureState,
        descriptorFreshnessState: failedConnection.freshnessState,
        canAttemptLiveBridge: failedConnection.canAttemptLiveBridge,
        failClosedReason: failedConnection.failClosedReason ?? "none",
        error: String(error),
      });
    }
  }

  async function discoverCapabilities() {
    clearBridgeReadinessProof();
    const result = await discoverChiefOfStaffCapabilities({
      endpoint: endpoint.trim() || null,
      authToken: authToken.trim() || null,
      descriptorReady: descriptorConnection.canAttemptLiveBridge,
      profileId: mapProfileToNapoleonMode(profile),
    });
    setChiefOfStaffCapabilities(result);
    emitEvent(result.state === "ready" ? "chief_of_staff_capabilities_discovered" : "chief_of_staff_capabilities_blocked", {
      traceId: newTraceId(),
      conversationId,
      capabilityCount: result.capabilities.length,
      agentCount: result.agents.length,
      profileMetadataReturned: Boolean(result.profileMetadata),
      serviceId: result.serviceId ?? "not_returned",
      runtimeAuthority: result.runtimeAuthority,
      blockedEffects: result.blockedEffects,
      approvalCaptured: result.approvalCaptured,
      memoryWritePerformed: result.memoryWritePerformed,
      agentDispatchPerformed: result.agentDispatchPerformed,
      externalSendPerformed: result.externalSendPerformed,
      responseApprovalCaptured: result.responseApprovalCaptured,
      responseMemoryWritePerformed: result.responseMemoryWritePerformed,
      responseAgentDispatchPerformed: result.responseAgentDispatchPerformed,
      responseExternalSendPerformed: result.responseExternalSendPerformed,
    });
    refreshTelemetryBufferStatus();
  }

  function useLocalHarnessEndpoint() {
    const preset = buildLocalHarnessEndpointPreset();
    updateEndpoint(preset.endpoint);
    updateAuthToken("");
    setRehearsalMode(preset.rehearsalMode);
    setPendingRehearsal(null);
    setBridgeEvidenceReadiness(buildBridgeEvidenceReadinessState());
    clearBridgeReadinessProof();
    clearAcceptedReadinessProofContext();
    void discoverDescriptor(preset.endpoint);
  }

  function updateProfile(value: LocalProfile) {
    setProfile(value);
    setPendingRehearsal(null);
    setCapabilityExportJson(null);
    setCapabilityAnswerDrilldownExportJson(null);
    clearCapabilityReviewPacketState();
    setTelemetryBufferExportJson(null);
    setInteractionTraceExportJson(null);
    clearBridgeReadinessProof();
    clearAcceptedReadinessProofContext();
    clearBridgeEvidenceReadiness();
    clearVoicePipelineProof();
    clearLocalVoiceAndAvatarSampleResults();
    clearNapoleonPresentation("profile_changed");
    clearVisibleTurnBoundaryState();
    clearChiefOfStaffCapabilities();
    clearLocalReviewDrafts();
    clearGovernedHandoffResults();
    clearProfileScopedCapabilityDrafts();
  }

  function updateInput(value: string) {
    setInput(value);
    clearContractPacketExports();
  }

  function answerNapoleonConnectionRepairQuestion(
    content: string,
    traceId: string,
    turnId: string,
    activeProfileMode: NapoleonProfileMode,
  ) {
    if (!isNapoleonConnectionRepairQuestion(content)) return false;

    const answer = formatNapoleonConnectionRepairAnswer({
      preflight: liveSendPreflight,
      descriptorConnection,
      endpointConfigured: Boolean(endpoint.trim()),
      rehearsalMode,
    });
    emitEvent("napoleon_connection_repair_answered", {
      traceId,
      conversationId,
      turnId,
      profile,
      profileMode: activeProfileMode,
      localAnswerOnly: true,
      blockingReason: answer.blockingReason,
      nextAction: answer.nextAction,
      liveSendReady: answer.liveSendReady,
      endpointConfigured: answer.endpointConfigured,
      descriptorState: answer.descriptorState,
      descriptorFreshnessState: answer.descriptorFreshnessState,
      failClosedReason: answer.failClosedReason,
      rehearsalMode: answer.rehearsalMode,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      appliedLocally: false,
    });
    setMessages((m) => [
      ...m,
      { role: "user", content },
      {
        role: "assistant",
        content: answer.content,
      },
    ]);
    setInput("");
    setCapabilityAnswerDrilldownExportJson(null);
    clearCapabilityReviewPacketState();
    setPendingRehearsal(null);
    setLastDecision(null);
    return true;
  }

  function answerNapoleonDescriptorValidityQuestion(
    content: string,
    traceId: string,
    turnId: string,
    activeProfileMode: NapoleonProfileMode,
  ) {
    if (!isNapoleonDescriptorValidityQuestion(content)) return false;

    const answer = formatNapoleonDescriptorValidityAnswer({
      preflight: liveSendPreflight,
      descriptorConnection,
      endpointConfigured: Boolean(endpoint.trim()),
      rehearsalMode,
    });
    emitEvent("napoleon_descriptor_validity_answered", {
      traceId,
      conversationId,
      turnId,
      profile,
      profileMode: activeProfileMode,
      localAnswerOnly: true,
      descriptorValidForLiveSend: answer.descriptorValidForLiveSend,
      endpointConfigured: answer.endpointConfigured,
      descriptorState: answer.descriptorState,
      checksumState: answer.checksumState,
      signatureState: answer.signatureState,
      descriptorFreshnessState: answer.descriptorFreshnessState,
      textTurnRouteAdvertised: answer.textTurnRouteAdvertised,
      failClosedReason: answer.failClosedReason,
      rehearsalMode: answer.rehearsalMode,
      nextAction: answer.nextAction,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      appliedLocally: false,
    });
    setMessages((m) => [
      ...m,
      { role: "user", content },
      {
        role: "assistant",
        content: answer.content,
      },
    ]);
    setInput("");
    setCapabilityAnswerDrilldownExportJson(null);
    clearCapabilityReviewPacketState();
    setPendingRehearsal(null);
    setLastDecision(null);
    return true;
  }

  function answerNapoleonConnectionSetupQuestion(
    content: string,
    traceId: string,
    turnId: string,
    activeProfileMode: NapoleonProfileMode,
  ) {
    if (!isNapoleonConnectionSetupQuestion(content)) return false;

    const answer = formatNapoleonConnectionSetupAnswer({
      currentStep: connectionGuideStep,
      preflight: liveSendPreflight,
      descriptorConnection,
      endpointConfigured: Boolean(endpoint.trim()),
      rehearsalMode,
    });
    emitEvent("napoleon_connection_setup_answered", {
      traceId,
      conversationId,
      turnId,
      profile,
      profileMode: activeProfileMode,
      localAnswerOnly: true,
      currentStep: answer.currentStep,
      liveSendReady: answer.liveSendReady,
      endpointConfigured: answer.endpointConfigured,
      descriptorDiscovered: answer.descriptorDiscovered,
      descriptorFreshnessState: answer.descriptorFreshnessState,
      textTurnRouteAdvertised: answer.textTurnRouteAdvertised,
      rehearsalMode: answer.rehearsalMode,
      descriptorState: answer.descriptorState,
      failClosedReason: answer.failClosedReason,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      appliedLocally: false,
    });
    setMessages((m) => [
      ...m,
      { role: "user", content },
      {
        role: "assistant",
        content: answer.content,
      },
    ]);
    setInput("");
    setCapabilityAnswerDrilldownExportJson(null);
    clearCapabilityReviewPacketState();
    setPendingRehearsal(null);
    setLastDecision(null);
    return true;
  }

  function answerNapoleonLiveSendReadinessQuestion(
    content: string,
    traceId: string,
    turnId: string,
    activeProfileMode: NapoleonProfileMode,
  ) {
    if (!isNapoleonLiveSendReadinessQuestion(content)) return false;

    const answer = formatNapoleonLiveSendReadinessAnswer({
      preflight: liveSendPreflight,
      descriptorConnection,
      endpointConfigured: Boolean(endpoint.trim()),
      rehearsalMode,
    });
    emitEvent("napoleon_live_send_readiness_answered", {
      traceId,
      conversationId,
      turnId,
      profile,
      profileMode: activeProfileMode,
      localAnswerOnly: true,
      canAttemptLiveSend: answer.canAttemptLiveSend,
      status: answer.status,
      descriptorState: answer.descriptorState,
      descriptorFreshnessState: answer.descriptorFreshnessState,
      failClosedReason: answer.failClosedReason,
      endpointConfigured: answer.endpointConfigured,
      rehearsalMode: answer.rehearsalMode,
      blockedEffectCount: answer.blockedEffectCount,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      appliedLocally: false,
    });
    setMessages((m) => [
      ...m,
      { role: "user", content },
      {
        role: "assistant",
        content: answer.content,
      },
    ]);
    setInput("");
    setCapabilityAnswerDrilldownExportJson(null);
    clearCapabilityReviewPacketState();
    setPendingRehearsal(null);
    setLastDecision(null);
    return true;
  }

  function answerNapoleonDelegationQuestion(content: string, traceId: string, turnId: string, activeProfileMode: NapoleonProfileMode) {
    if (!isNapoleonDelegationQuestion(content)) return false;

    const answer = formatNapoleonDelegationAnswer(lastNapoleonPresentation, content);
    emitEvent("napoleon_delegation_answered", {
      traceId,
      conversationId,
      turnId,
      profile,
      profileMode: activeProfileMode,
      proofReturned: answer.proofReturned,
      selectedAgentCount: answer.selectedAgentCount,
      allowedEffectCount: answer.allowedEffectCount,
      blockedEffectCount: answer.blockedEffectCount,
      targetCapabilityReturned: answer.targetCapabilityReturned,
      recommendationReturned: answer.recommendationReturned,
      selectedAgentContributionCount: answer.selectedAgentContributionCount,
      selectedAgentReasonCount: answer.selectedAgentReasonCount,
      traceReturned: answer.traceReturned,
      auditReturned: answer.auditReturned,
      localAnswerOnly: true,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      appliedLocally: false,
    });
    setMessages((m) => [
      ...m,
      { role: "user", content },
      {
        role: "assistant",
        content: answer.content,
      },
    ]);
    setInput("");
    setCapabilityAnswerDrilldownExportJson(null);
    clearCapabilityReviewPacketState();
    setPendingRehearsal(null);
    setLastDecision(null);
    return true;
  }

  function answerNapoleonBlockedAttemptQuestion(
    content: string,
    traceId: string,
    turnId: string,
    activeProfileMode: NapoleonProfileMode,
  ) {
    const shouldAnswerFromBlockedAttempt =
      isNapoleonBlockedAttemptQuestion(content) ||
      (Boolean(lastNapoleonTurnFailure) && isNapoleonBlockedAttemptNextStepQuestion(content)) ||
      (Boolean(lastNapoleonTurnFailure) && isNapoleonBlockedAttemptRecoveryQuestion(content)) ||
      (!lastNapoleonPresentation.proof &&
        Boolean(lastNapoleonTurnFailure) &&
        isNapoleonReviewRequirementQuestion(content));
    if (!shouldAnswerFromBlockedAttempt) return false;

    const answer = formatNapoleonBlockedAttemptAnswer(lastNapoleonTurnFailure);
    emitEvent("napoleon_blocked_attempt_answered", {
      traceId,
      conversationId,
      turnId,
      profile,
      profileMode: activeProfileMode,
      failureReturned: answer.failureReturned,
      blockedEffectCount: answer.blockedEffectCount,
      governanceReturned: answer.governanceReturned,
      traceReturned: answer.traceReturned,
      auditReturned: answer.auditReturned,
      descriptorFailureReturned: answer.descriptorFailureReturned,
      localAnswerOnly: true,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      appliedLocally: false,
    });
    setMessages((m) => [
      ...m,
      { role: "user", content },
      {
        role: "assistant",
        content: answer.content,
      },
    ]);
    setInput("");
    setCapabilityAnswerDrilldownExportJson(null);
    clearCapabilityReviewPacketState();
    setPendingRehearsal(null);
    setLastDecision(null);
    return true;
  }

  function answerNapoleonReviewRequirementQuestion(
    content: string,
    traceId: string,
    turnId: string,
    activeProfileMode: NapoleonProfileMode,
  ) {
    if (!isNapoleonReviewRequirementQuestion(content)) return false;

    const answer = formatNapoleonReviewRequirementAnswer(lastNapoleonPresentation);
    emitEvent("napoleon_review_requirement_answered", {
      traceId,
      conversationId,
      turnId,
      profile,
      profileMode: activeProfileMode,
      proofReturned: answer.proofReturned,
      reviewRequired: answer.reviewRequired,
      blockedEffectCount: answer.blockedEffectCount,
      governanceReturned: answer.governanceReturned,
      decisionReturned: answer.decisionReturned,
      authorityTierReturned: answer.authorityTierReturned,
      approvalRequirementReturned: answer.approvalRequirementReturned,
      rationaleReturned: answer.rationaleReturned,
      traceReturned: answer.traceReturned,
      auditReturned: answer.auditReturned,
      localAnswerOnly: true,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      appliedLocally: false,
    });
    setMessages((m) => [
      ...m,
      { role: "user", content },
      {
        role: "assistant",
        content: answer.content,
      },
    ]);
    setInput("");
    setCapabilityAnswerDrilldownExportJson(null);
    clearCapabilityReviewPacketState();
    setPendingRehearsal(null);
    setLastDecision(null);
    return true;
  }

  function answerNapoleonProofCurrentnessQuestion(
    content: string,
    traceId: string,
    turnId: string,
    activeProfileMode: NapoleonProfileMode,
  ) {
    if (!isNapoleonProofCurrentnessQuestion(content)) return false;

    const answer = formatNapoleonProofCurrentnessAnswer(
      lastNapoleonPresentation,
      bridgeResponseProvenanceState,
      lastNapoleonProofClearReason,
    );
    emitEvent("napoleon_proof_currentness_answered", {
      traceId,
      conversationId,
      turnId,
      profile,
      profileMode: activeProfileMode,
      currentProofAvailable: answer.currentProofAvailable,
      proofReturned: answer.currentProofAvailable,
      provenanceState: bridgeResponseProvenanceState,
      clearReason: lastNapoleonProofClearReason,
      selectedAgentCount: answer.selectedAgentCount,
      blockedEffectCount: answer.blockedEffectCount,
      traceReturned: answer.traceReturned,
      auditReturned: answer.auditReturned,
      localAnswerOnly: true,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      appliedLocally: false,
    });
    setMessages((m) => [
      ...m,
      { role: "user", content },
      {
        role: "assistant",
        content: answer.content,
      },
    ]);
    setInput("");
    setCapabilityAnswerDrilldownExportJson(null);
    clearCapabilityReviewPacketState();
    setPendingRehearsal(null);
    setLastDecision(null);
    return true;
  }

  function answerNapoleonProofComparisonQuestion(
    content: string,
    traceId: string,
    turnId: string,
    activeProfileMode: NapoleonProfileMode,
  ) {
    if (!isNapoleonProofComparisonQuestion(content)) return false;

    const answer = formatNapoleonProofComparisonAnswer(napoleonProofComparison);
    emitEvent("napoleon_proof_comparison_answered", {
      traceId,
      conversationId,
      turnId,
      profile,
      profileMode: activeProfileMode,
      comparisonStatus: answer.comparisonStatus,
      changeCount: answer.changeCount,
      reviewSummaryReturned: answer.reviewSummaryReturned,
      localAnswerOnly: true,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      appliedLocally: false,
    });
    setMessages((m) => [
      ...m,
      { role: "user", content },
      {
        role: "assistant",
        content: answer.content,
      },
    ]);
    setInput("");
    setCapabilityAnswerDrilldownExportJson(null);
    clearCapabilityReviewPacketState();
    setPendingRehearsal(null);
    setLastDecision(null);
    return true;
  }

  function answerNapoleonRequiredActionQuestion(content: string, traceId: string, turnId: string, activeProfileMode: NapoleonProfileMode) {
    if (!isNapoleonRequiredActionQuestion(content)) return false;

    const answer = formatNapoleonRequiredActionAnswer(evaluatorValidationImport, activeProfileMode);
    emitEvent("napoleon_required_actions_answered", {
      traceId,
      conversationId,
      turnId,
      profile,
      profileMode: activeProfileMode,
      evaluatorStatus: answer.status,
      runtimeValidationSource: answer.runtimeValidationSource,
      requiredActionCount: answer.actionCount,
      localAnswerOnly: true,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      appliedLocally: false,
    });
    setMessages((m) => [
      ...m,
      { role: "user", content },
      {
        role: "assistant",
        content: answer.content,
      },
    ]);
    setInput("");
    setCapabilityAnswerDrilldownExportJson(null);
    clearCapabilityReviewPacketState();
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
    return true;
  }

  function rehearse() {
    const content = input.trim();
    if (!content) return;

    const traceId = newTraceId();
    const turnId = `turn_${Date.now().toString(16)}`;
    const activeProfileMode = mapProfileToNapoleonMode(profile);
    if (answerNapoleonDescriptorValidityQuestion(content, traceId, turnId, activeProfileMode)) return;
    if (answerNapoleonConnectionRepairQuestion(content, traceId, turnId, activeProfileMode)) return;
    if (answerNapoleonConnectionSetupQuestion(content, traceId, turnId, activeProfileMode)) return;
    if (answerNapoleonLiveSendReadinessQuestion(content, traceId, turnId, activeProfileMode)) return;
    if (answerNapoleonProofCurrentnessQuestion(content, traceId, turnId, activeProfileMode)) return;
    if (answerNapoleonProofComparisonQuestion(content, traceId, turnId, activeProfileMode)) return;
    if (answerNapoleonBlockedAttemptQuestion(content, traceId, turnId, activeProfileMode)) return;
    if (answerNapoleonReviewRequirementQuestion(content, traceId, turnId, activeProfileMode)) return;
    if (answerNapoleonDelegationQuestion(content, traceId, turnId, activeProfileMode)) return;
    if (answerNapoleonRequiredActionQuestion(content, traceId, turnId, activeProfileMode)) return;
    const capabilityAnswer = answerCapabilityQuestion(content, capabilityLedger, capabilityTaxonomy, {
      profileMode: activeProfileMode,
    });
    if (capabilityAnswer) {
      const capabilityAnswerWithTurnEvidence = withLatestNapoleonTurnEvidence(capabilityAnswer);
      emitEvent("capability_intelligence_answered", {
        traceId,
        conversationId,
        turnId,
        profile,
        profileMode: activeProfileMode,
        kind: capabilityAnswer.kind,
        evidenceCount: capabilityAnswer.evidenceCount,
        localAnswerOnly: true,
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        appliedLocally: false,
      });
      setMessages((m) => [
        ...m,
        { role: "user", content },
        {
          role: "assistant",
          content: formatCapabilityAnswer(capabilityAnswerWithTurnEvidence, activeProfileMode),
          metadata: {
            capabilityDrilldown: capabilityAnswerWithTurnEvidence.drilldown,
            capabilityAnswer: capabilityAnswerWithTurnEvidence,
          },
        },
      ]);
      setInput("");
      setCapabilityAnswerDrilldownExportJson(null);
      clearCapabilityReviewPacketState();
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
        profileMode: activeProfileMode,
        outcome: preview.governanceReview.outcome,
        decisionId: preview.governanceReview.decisionId,
      });
      refreshCapabilityLedgerStatus();
    }
    if (!preview.governanceReview.canSendAdvisory) {
      emitEvent("governance_review_blocked", {
        traceId,
        conversationId,
        turnId,
        profile,
        profileMode: activeProfileMode,
        outcome: preview.governanceReview.outcome,
        decisionId: preview.governanceReview.decisionId,
        blockedEffects: preview.governanceReview.blockedEffects,
      });
      refreshCapabilityLedgerStatus();
    }
    if (memoryReview) {
      emitEvent("memory_proposal_review_created", {
        traceId,
        conversationId,
        turnId,
        profile,
        profileMode: activeProfileMode,
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
      requestKind: "text_turn",
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
      const activeProfileMode = mapProfileToNapoleonMode(profile);
      if (answerNapoleonDescriptorValidityQuestion(content, traceId, turnId, activeProfileMode)) return;
      if (answerNapoleonConnectionRepairQuestion(content, traceId, turnId, activeProfileMode)) return;
      if (answerNapoleonConnectionSetupQuestion(content, traceId, turnId, activeProfileMode)) return;
      if (answerNapoleonLiveSendReadinessQuestion(content, traceId, turnId, activeProfileMode)) return;
      if (answerNapoleonProofCurrentnessQuestion(content, traceId, turnId, activeProfileMode)) return;
      if (answerNapoleonProofComparisonQuestion(content, traceId, turnId, activeProfileMode)) return;
      if (answerNapoleonBlockedAttemptQuestion(content, traceId, turnId, activeProfileMode)) return;
      if (answerNapoleonReviewRequirementQuestion(content, traceId, turnId, activeProfileMode)) return;
      if (answerNapoleonDelegationQuestion(content, traceId, turnId, activeProfileMode)) return;
      if (answerNapoleonRequiredActionQuestion(content, traceId, turnId, activeProfileMode)) return;
      const capabilityAnswer = answerCapabilityQuestion(content, capabilityLedger, capabilityTaxonomy, {
        profileMode: activeProfileMode,
      });
      if (capabilityAnswer) {
        const capabilityAnswerWithTurnEvidence = withLatestNapoleonTurnEvidence(capabilityAnswer);
        emitEvent("capability_intelligence_answered", {
          traceId,
          conversationId,
          turnId,
          profile,
          profileMode: activeProfileMode,
          kind: capabilityAnswer.kind,
          evidenceCount: capabilityAnswer.evidenceCount,
          localAnswerOnly: true,
          approvalCaptured: false,
          memoryWritePerformed: false,
          agentDispatchPerformed: false,
          externalSendPerformed: false,
          appliedLocally: false,
        });
        setMessages((m) => [
          ...m,
          { role: "user", content },
          {
            role: "assistant",
            content: formatCapabilityAnswer(capabilityAnswerWithTurnEvidence, activeProfileMode),
            metadata: {
              capabilityDrilldown: capabilityAnswerWithTurnEvidence.drilldown,
              capabilityAnswer: capabilityAnswerWithTurnEvidence,
            },
          },
        ]);
        setInput("");
        setCapabilityAnswerDrilldownExportJson(null);
        clearCapabilityReviewPacketState();
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
        profileMode: mapProfileToNapoleonMode(profile),
        outcome: rehearsal.preview.governanceReview.outcome,
        decisionId: rehearsal.preview.governanceReview.decisionId,
        blockedEffects: rehearsal.preview.governanceReview.blockedEffects,
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
        profile,
        profileMode: activeProfileMode,
        outcome: reviewState.outcome,
        decisionId: reviewState.decisionId,
        blockedEffects: reviewState.blockedEffects,
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
          profileMode: activeProfileMode,
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
          profile,
          profileMode: activeProfileMode,
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
          metadata: describeNapoleonTranscriptMetadata(response, {
            targetCapabilityLabel: response.targetAgent
              ? chiefOfStaffCapabilities?.capabilities.find((capability) => capability.id === response.targetAgent)?.label
              : undefined,
          }),
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
              bridgeRequestFailureAlreadyTracked: true,
            }
          : {}),
      });
      refreshCapabilityLedgerStatus();
      setLastBridgeFailure(describeBridgeFailure(error));
      setLastNapoleonTurnFailure(describeLastNapoleonTurnFailure(error));
      clearNapoleonPresentation("bridge_failure");
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
      profile,
      profileMode: mapProfileToNapoleonMode(profile),
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
        profile: acknowledgedReview.profile,
        profileMode: mapProfileToNapoleonMode(acknowledgedReview.profile),
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
        profile,
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
        profile,
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
    setSteeringDraftExportJson(null);
    setSteeringSubmission(null);
    setSteeringFailure(null);
    setTaxonomyReviewDraft(null);
    setTaxonomyReviewSubmission(null);
    setTaxonomyReviewFailure(null);
    clearCapabilityReviewPacketState();
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
    const derivedRuntimeValidationSource = deriveRuntimeValidationSource({
      endpoint,
      descriptorMode,
      evidenceCaptureState: bridgeEvidenceReadiness.captureState,
      evidenceComparisonState: bridgeEvidenceReadiness.comparisonState,
    });
    const runtimeValidationSource = derivedRuntimeValidationSource ?? evaluatorValidationImport?.runtimeValidationSource;
    const metadataBlockedEffects = chiefOfStaffCapabilities
      ? Array.from(
          new Set([
            "registry_update",
            ...chiefOfStaffCapabilities.blockedEffects,
            ...chiefOfStaffCapabilities.agents.flatMap((agent) => agent.blockedEffects),
            ...(chiefOfStaffCapabilities.profileMetadata?.blockedEffects ?? []),
          ]),
        )
      : [];
    const json = exportBridgeReadinessProofJson({
      descriptorConnection,
      readiness: bridgeEvidenceReadiness,
      connectionGuide: {
        currentStep: connectionGuideStep.replaceAll(" ", "_"),
        nextLocalAction: liveSendPreflight.nextStepSummary,
        liveSendReady: liveSendPreflight.canAttemptLiveSend,
        endpointConfigured: endpoint.trim().length > 0,
        descriptorDiscovered: descriptorConnection.state === "ready",
        descriptorIntegrityState: descriptorConnection.descriptorStatus
          ? `${descriptorConnection.checksumState}_${descriptorConnection.signatureState}`
          : "unavailable",
        descriptorFreshnessState: descriptorConnection.freshnessState,
        textTurnRouteAdvertised: Boolean(
          descriptorConnection.canAttemptLiveBridge &&
            descriptorConnection.descriptorStatus?.supportedHandoffs.includes("text_turn"),
        ),
        rehearsalMode,
        runtimeValidationSource: runtimeValidationSource ?? "unavailable",
        authorityBoundary: "local readiness only; not Napoleon approval",
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
      },
      runtimeValidationSource,
      evaluatorValidation: evaluatorValidationImport?.validation,
      advisoryCapabilities: chiefOfStaffCapabilities
        ? {
            state: chiefOfStaffCapabilities.state,
            serviceId: chiefOfStaffCapabilities.serviceId,
            capabilityCount: chiefOfStaffCapabilities.capabilities.length,
            capabilityIds: chiefOfStaffCapabilities.capabilities.map((capability) => capability.id),
            authorityTiers: Array.from(new Set(chiefOfStaffCapabilities.capabilities.map((capability) => capability.authorityTier))),
            runtimeAuthority: false,
            blockedEffects: chiefOfStaffCapabilities.blockedEffects,
            proposalOnly: true,
            responseApprovalCaptured: chiefOfStaffCapabilities.responseApprovalCaptured,
            responseMemoryWritePerformed: chiefOfStaffCapabilities.responseMemoryWritePerformed,
            responseAgentDispatchPerformed: chiefOfStaffCapabilities.responseAgentDispatchPerformed,
            responseExternalSendPerformed: chiefOfStaffCapabilities.responseExternalSendPerformed,
          }
        : {
            state: "not_fetched",
            serviceId: null,
            capabilityCount: 0,
            capabilityIds: [],
            authorityTiers: [],
            runtimeAuthority: false,
            blockedEffects: [],
            proposalOnly: true,
            responseApprovalCaptured: false,
            responseMemoryWritePerformed: false,
            responseAgentDispatchPerformed: false,
            responseExternalSendPerformed: false,
          },
      napoleonMetadata: chiefOfStaffCapabilities
        ? {
            state: chiefOfStaffCapabilities.state,
            agentCount: chiefOfStaffCapabilities.agents.length,
            agentIds: chiefOfStaffCapabilities.agents.map((agent) => agent.agentId),
            profileId: chiefOfStaffCapabilities.profileMetadata?.profileId ?? null,
            profileMetadataReturned: Boolean(chiefOfStaffCapabilities.profileMetadata),
            runtimeAuthority: false,
            blockedEffects: metadataBlockedEffects,
            registryUpdatePerformed: false,
            agentDispatchPerformed: false,
            memoryWritePerformed: false,
            approvalCaptured: false,
            externalSendPerformed: false,
          }
        : {
            state: "not_fetched",
            agentCount: 0,
            agentIds: [],
            profileId: null,
            profileMetadataReturned: false,
            runtimeAuthority: false,
            blockedEffects: [],
            registryUpdatePerformed: false,
            agentDispatchPerformed: false,
            memoryWritePerformed: false,
            approvalCaptured: false,
            externalSendPerformed: false,
          },
    });
    const bridgeReadinessProof = JSON.parse(json) as {
      runtimeValidation?: {
        promotionGate?: string;
        evaluator?: {
          status?: string;
          failureReason?: string;
          targetPath?: string;
          descriptorHandoffAdvertised?: boolean | null;
          descriptorHandoffSource?: string;
          descriptorHandoffFailureReason?: string;
          descriptorHandoffRequiredAction?: string;
          napoleonRequiredActions?: unknown[];
        };
      };
    };
    const comparison = compareBridgeReadinessProofs(bridgeReadinessProofJson, json);
    setBridgeReadinessProofJson(json);
    setBridgeReadinessProofComparison(comparison);
    emitEvent("bridge_readiness_proof_exported", {
      traceId,
      conversationId,
      descriptorState: descriptorConnection.state,
      checksumState: descriptorConnection.checksumState,
      signatureState: descriptorConnection.signatureState,
      descriptorFreshnessState: descriptorConnection.freshnessState,
      descriptorTextTurnRouteAdvertised: Boolean(
        descriptorConnection.canAttemptLiveBridge &&
          descriptorConnection.descriptorStatus?.supportedHandoffs.includes("text_turn"),
      ),
      evidenceCaptureState: bridgeEvidenceReadiness.captureState,
      evidenceComparisonState: bridgeEvidenceReadiness.comparisonState,
      runtimeValidationSource: runtimeValidationSource ?? "unavailable",
      promotionGate: bridgeReadinessProof.runtimeValidation?.promotionGate ?? "unavailable",
      evaluatorHttpStatus: bridgeReadinessProof.runtimeValidation?.evaluator?.status ?? "not_run",
      evaluatorFailureReason: bridgeReadinessProof.runtimeValidation?.evaluator?.failureReason ?? "none",
      evaluatorTargetPath: bridgeReadinessProof.runtimeValidation?.evaluator?.targetPath ?? "unavailable",
      evaluatorDescriptorHandoffAdvertised:
        bridgeReadinessProof.runtimeValidation?.evaluator?.descriptorHandoffAdvertised ?? "unavailable",
      evaluatorDescriptorHandoffSource:
        bridgeReadinessProof.runtimeValidation?.evaluator?.descriptorHandoffSource ?? "unavailable",
      evaluatorDescriptorHandoffFailureReason:
        bridgeReadinessProof.runtimeValidation?.evaluator?.descriptorHandoffFailureReason ?? "none",
      evaluatorDescriptorHandoffRequiredAction:
        bridgeReadinessProof.runtimeValidation?.evaluator?.descriptorHandoffRequiredAction ?? "none",
      evaluatorNapoleonRequiredActionCount:
        bridgeReadinessProof.runtimeValidation?.evaluator?.napoleonRequiredActions?.length ?? 0,
      evaluatorImportStatus: evaluatorValidationImport?.status ?? "not_imported",
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
    const proofJsonValue = (key: string) => {
      try {
        const parsed = JSON.parse(json) as { responseProof?: Record<string, unknown> };
        const value = parsed.responseProof?.[key];
        return typeof value === "string" ? value : "unavailable";
      } catch {
        return "unavailable";
      }
    };
    const proofArrayCount = (key: string) => {
      try {
        const parsed = JSON.parse(json) as { responseProof?: Record<string, unknown> };
        const value = parsed.responseProof?.[key];
        return Array.isArray(value) ? value.length : 0;
      } catch {
        return 0;
      }
    };
    const targetCapabilityProof = proofDetail("Target capability");
    const recommendationProof = proofDetail("Napoleon recommendation");
    emitEvent("napoleon_response_proof_exported", {
      traceId,
      conversationId,
      status: proof?.status ?? "not_available",
      handledBy: proofJsonValue("handledBy"),
      proofAlignment: proofJsonValue("proofAlignment"),
      attributionBoundary: proof ? "Returned bridge provenance only; not local authority." : "unavailable",
      governance: proofDetail("Governance"),
      profileMode: proofDetail("Profile mode"),
      responseTraceId: proofDetail("Trace"),
      responseAuditId: proofDetail("Audit"),
      selectedAgentCount: proofArrayCount("selectedAgents"),
      selectedAgentSelectionReasonCount: proofArrayCount("selectedAgentReasons"),
      allowedEffectCount: proofArrayCount("allowedEffects"),
      blockedEffectCount: proofArrayCount("blockedEffects"),
      targetCapabilityReturned: targetCapabilityProof !== "unavailable" && targetCapabilityProof !== "not returned",
      recommendationProvenanceReturned: recommendationProof !== "unavailable" && recommendationProof !== "not returned",
      proofComparisonStatus: comparison.status,
      proofComparisonChangeCount: comparison.changes.length,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
    });
  }

  function recordEvaluatorValidationImport(importResult: EvaluatorValidationImport, importSource: "paste" | "file") {
    const traceId = newTraceId();
    setEvaluatorValidationImport(importResult);
    clearNapoleonRequiredActionsExport();
    clearBridgeReadinessProof();
    emitEvent("evaluator_validation_artifact_imported", {
      traceId,
      conversationId,
      status: importResult.status,
      importSource,
      profile,
      profileMode: mapProfileToNapoleonMode(profile),
      descriptorState: descriptorConnection.state,
      evaluatorHttpStatus: importResult.validation.status,
      evaluatorFailureReason: importResult.validation.failureReason ?? "none",
      evaluatorTargetPath: importResult.validation.targetPath ?? "unavailable",
      evaluatorDescriptorHandoffAdvertised: importResult.validation.descriptorHandoffAdvertised ?? "unavailable",
      evaluatorDescriptorHandoffSource: importResult.validation.descriptorHandoffSource ?? "unavailable",
      evaluatorDescriptorHandoffFailureReason: importResult.validation.descriptorHandoffFailureReason ?? "none",
      evaluatorDescriptorHandoffRequiredAction: importResult.validation.descriptorHandoffRequiredAction ?? "none",
      evaluatorNapoleonRequiredActionCount: importResult.validation.napoleonRequiredActions?.length ?? 0,
      runtimeValidationSource: importResult.runtimeValidationSource ?? "unavailable",
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
    });
  }

  function exportNapoleonRequiredActions() {
    const actions = evaluatorValidationImport?.validation.napoleonRequiredActions ?? [];
    if (!actions.length) return;

    const traceId = newTraceId();
    const exportPayload = {
      kind: "concierge.napoleon-required-actions.export.v1",
      generatedAt: new Date().toISOString(),
      conversationId,
      source: "evaluator_validation_import",
      runtimeValidationSource: evaluatorValidationImport?.runtimeValidationSource ?? "unavailable",
      evaluator: {
        status: evaluatorValidationImport?.validation.status ?? "not_run",
        failureReason: evaluatorValidationImport?.validation.failureReason ?? "none",
        targetPath: evaluatorValidationImport?.validation.targetPath ?? "unavailable",
        requestKind: evaluatorValidationImport?.validation.requestKind ?? "unavailable",
        operationId: evaluatorValidationImport?.validation.operationId ?? "unavailable",
        descriptorHandoffAdvertised:
          evaluatorValidationImport?.validation.descriptorHandoffAdvertised ?? "unavailable",
        descriptorHandoffSource: evaluatorValidationImport?.validation.descriptorHandoffSource ?? "unavailable",
        descriptorHandoffFailureReason:
          evaluatorValidationImport?.validation.descriptorHandoffFailureReason ?? "none",
      },
      requiredActionCount: actions.length,
      napoleonRequiredActions: actions satisfies NapoleonRequiredAction[],
      boundary: {
        localExportOnly: true,
        proposalOnly: true,
        napoleonApprovalGranted: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        appliedLocally: false,
      },
    };
    const json = JSON.stringify(exportPayload, null, 2);
    setNapoleonRequiredActionsExportJson(json);
    emitEvent("napoleon_required_actions_exported", {
      traceId,
      conversationId,
      source: "evaluator_validation_import",
      requiredActionCount: actions.length,
      evaluatorHttpStatus: evaluatorValidationImport?.validation.status ?? "not_run",
      evaluatorFailureReason: evaluatorValidationImport?.validation.failureReason ?? "none",
      runtimeValidationSource: evaluatorValidationImport?.runtimeValidationSource ?? "unavailable",
      localExportOnly: true,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      appliedLocally: false,
    });
  }

  function parseEvaluatorValidationArtifactForCurrentEndpoint(artifactJson: string): EvaluatorValidationImport {
    return parseEvaluatorValidationArtifact(artifactJson, {
      expectedTargetPath: isLocalHarnessEndpoint(endpoint) ? "/v1/concierge/evaluate" : "/chief-of-staff/reviews/evaluation",
    });
  }

  function importEvaluatorValidationArtifact() {
    setEvaluatorValidationFileName(null);
    recordEvaluatorValidationImport(parseEvaluatorValidationArtifactForCurrentEndpoint(evaluatorValidationArtifactInput), "paste");
  }

  function importAcceptedReadinessProof() {
    const traceId = newTraceId();
    const importResult = importAcceptedBridgeReadinessProof(acceptedReadinessProofInput);
    clearVoicePipelineProof();
    clearBridgeReadinessProof();
    setAcceptedReadinessProofImport(importResult);
    emitEvent("accepted_readiness_proof_imported", {
      traceId,
      conversationId,
      status: importResult.status,
      lastEvidenceStatus: importResult.lastRealRuntimeProof?.status ?? "unavailable",
      lastOperationId: importResult.lastRealRuntimeProof?.operationId ?? "unavailable",
      lastTargetPath: importResult.lastRealRuntimeProof?.targetPath ?? "unavailable",
      promotionGate: importResult.lastRealRuntimeProof?.promotionGate ?? "unavailable",
      governedPacketProofStatus:
        importResult.lastRealRuntimeProof?.governedPacketEvidence?.status ?? "unavailable",
      governedPacketSubmissionCount:
        importResult.lastRealRuntimeProof?.governedPacketEvidence?.submissionCount ?? 0,
      governedChiefOfStaffRequestObserved:
        importResult.lastRealRuntimeProof?.governedPacketEvidence?.chiefOfStaffRequestObserved ?? false,
      governedGovernanceEvaluationObserved:
        importResult.lastRealRuntimeProof?.governedPacketEvidence?.governanceEvaluationObserved ?? false,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
    });
  }

  async function importEvaluatorValidationArtifactFile(file: File | undefined) {
    if (!file) return;
    setEvaluatorValidationFileName(file.name);
    try {
      const artifactJson = await file.text();
      setEvaluatorValidationArtifactInput(artifactJson);
      recordEvaluatorValidationImport(parseEvaluatorValidationArtifactForCurrentEndpoint(artifactJson), "file");
    } catch {
      recordEvaluatorValidationImport(
        {
          status: "rejected",
          summary: "Evaluator validation artifact file could not be read.",
          validation: {
            status: "failed",
            failureReason: "Evaluator validation artifact file could not be read.",
            targetPath: "unavailable",
            requestKind: "unavailable",
            operationId: "unavailable",
          },
        },
        "file",
      );
    }
  }

  function exportVoicePipelineProof() {
    const traceId = newTraceId();
    const json = exportGovernedVoicePipelineProofJson(governedVoicePipelinePlan, {
      conversationId,
      acceptedRealRuntimeProof: acceptedReadinessProofImport?.lastRealRuntimeProof,
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
      acceptedRealRuntimeProofImported: Boolean(acceptedReadinessProofImport?.lastRealRuntimeProof),
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

  function exportChiefOfStaffRequestPacket() {
    if (!currentContract) return;

    const operation = getNapoleonReviewOperation("chief_of_staff_request");
    const packet: ChiefOfStaffRequestPacket = {
      schemaVersion: "concierge/napoleon-contract-packet-export/v1",
      packetType: "chief_of_staff_request_handoff",
      generatedBy: "concierge.text",
      conversationId,
      profileMode: currentContract.profileMode,
      bridgeTarget: {
        operationId: "chief_of_staff_request",
        path: "/chief-of-staff/requests",
        requestKind: "chief_of_staff_request_handoff",
        transport: "HTTP POST",
      },
      request: currentContract.chiefOfStaffRequest,
      traceEnvelope: currentContract.traceEnvelope,
      auditEnvelope: currentContract.auditEnvelope,
      handoffReadiness: {
        status: chiefOfStaffRequestHandoffReadiness.status,
        summary: chiefOfStaffRequestHandoffReadiness.summary,
        nextStepSummary: chiefOfStaffRequestHandoffReadiness.nextStepSummary,
        blockedEffects: chiefOfStaffRequestHandoffReadiness.blockedEffects,
      },
      boundary: {
        localExportOnly: true,
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        routingPerformed: false,
        registryUpdatePerformed: false,
        traceAppendPerformed: false,
        appliedLocally: false,
      },
    };

    setChiefOfStaffRequestPacket(packet);
    setChiefOfStaffRequestPacketExportJson(JSON.stringify(packet, null, 2));
    setChiefOfStaffRequestPacketSubmission(null);
    setChiefOfStaffRequestPacketFailure(null);
    emitEvent("chief_of_staff_request_packet_exported", {
      traceId: currentContract.traceEnvelope.trace_id,
      conversationId,
      profileMode: currentContract.profileMode,
      requestKind: operation.requestKind,
      targetPath: operation.path,
      readinessStatus: chiefOfStaffRequestHandoffReadiness.status,
      localExportOnly: true,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      routingPerformed: false,
      registryUpdatePerformed: false,
      traceAppendPerformed: false,
      appliedLocally: false,
    });
  }

  function exportGovernanceEvaluationPacket() {
    if (!currentContract) return;

    const operation = getNapoleonReviewOperation("governance_evaluation");
    const packet: GovernanceEvaluationPacket = {
      schemaVersion: "concierge/napoleon-contract-packet-export/v1",
      packetType: "governance_evaluation_handoff",
      generatedBy: "concierge.text",
      conversationId,
      profileMode: currentContract.profileMode,
      bridgeTarget: {
        operationId: "governance_evaluation",
        path: "/governance/evaluate",
        requestKind: "governance_evaluation_handoff",
        transport: "HTTP POST",
      },
      request: currentContract.governanceRequest,
      localPreflightDecision: currentContract.governanceDecision,
      traceEnvelope: currentContract.traceEnvelope,
      auditEnvelope: currentContract.auditEnvelope,
      handoffReadiness: {
        status: governanceEvaluationHandoffReadiness.status,
        summary: governanceEvaluationHandoffReadiness.summary,
        nextStepSummary: governanceEvaluationHandoffReadiness.nextStepSummary,
        blockedEffects: governanceEvaluationHandoffReadiness.blockedEffects,
      },
      boundary: {
        localExportOnly: true,
        governanceOverrideApplied: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        routingPerformed: false,
        registryUpdatePerformed: false,
        traceAppendPerformed: false,
        appliedLocally: false,
      },
    };

    setGovernanceEvaluationPacket(packet);
    setGovernanceEvaluationPacketExportJson(JSON.stringify(packet, null, 2));
    setGovernanceEvaluationPacketSubmission(null);
    setGovernanceEvaluationPacketFailure(null);
    emitEvent("governance_evaluation_packet_exported", {
      traceId: currentContract.traceEnvelope.trace_id,
      conversationId,
      profileMode: currentContract.profileMode,
      requestKind: operation.requestKind,
      targetPath: operation.path,
      readinessStatus: governanceEvaluationHandoffReadiness.status,
      localExportOnly: true,
      governanceOverrideApplied: false,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      routingPerformed: false,
      registryUpdatePerformed: false,
      traceAppendPerformed: false,
      appliedLocally: false,
    });
  }

  async function submitChiefOfStaffRequestPacketExport() {
    if (!chiefOfStaffRequestPacket) return;
    try {
      const result = await submitChiefOfStaffRequestPacket(chiefOfStaffRequestPacket, {
        conversationId,
        profile,
        rehearsalMode,
        descriptorConnection: currentDescriptorInput(),
      });
      setChiefOfStaffRequestPacketSubmission(result);
      setChiefOfStaffRequestPacketFailure(null);
    } catch (error) {
      setChiefOfStaffRequestPacketFailure(
        describeGovernedHandoffFailure(error, "Chief of Staff request packet handoff", "route tasks or apply effects"),
      );
      setChiefOfStaffRequestPacketSubmission(null);
    }
  }

  async function submitGovernanceEvaluationPacketExport() {
    if (!governanceEvaluationPacket) return;
    try {
      const result = await submitGovernanceEvaluationPacket(governanceEvaluationPacket, {
        conversationId,
        profile,
        rehearsalMode,
        descriptorConnection: currentDescriptorInput(),
      });
      setGovernanceEvaluationPacketSubmission(result);
      setGovernanceEvaluationPacketFailure(null);
    } catch (error) {
      setGovernanceEvaluationPacketFailure(
        describeGovernedHandoffFailure(error, "Governance evaluation packet handoff", "override governance"),
      );
      setGovernanceEvaluationPacketSubmission(null);
    }
  }

  function createSteeringDraft() {
    const traceId = newTraceId();
    const steeringDraftHandoffReadiness = describeGovernedHandoffReadiness({
      label: "Chief of Staff steering",
      descriptorConnection,
      draftReady: true,
      rehearsalMode,
      requiredHandoff: "evolution_proposal_review",
    });
    const steeringDraftBlocker = steeringDraftHandoffReadiness.items.find((item) => item.status === "blocked");
    const draft = draftChiefOfStaffSteering(capabilityLedger, {
      conversationId,
      traceId,
      endpointConfigured: Boolean(endpoint.trim()),
      profileMode: mapProfileToNapoleonMode(profile),
      handoffContext: {
        status: steeringDraftHandoffReadiness.status,
        summary: steeringDraftHandoffReadiness.summary,
        nextStepSummary: steeringDraftHandoffReadiness.nextStepSummary,
        descriptorFreshnessState: descriptorConnection.freshnessState,
        blockerLabel: steeringDraftBlocker?.label,
        blockerDetail: steeringDraftBlocker?.detail,
        blockedEffects: steeringDraftHandoffReadiness.blockedEffects,
        proposalOnly: true,
      },
    });
    setSteeringDraft(draft);
    setSteeringDraftExportJson(null);
    setSteeringSubmission(null);
    setSteeringFailure(null);
    emitEvent("capability_recommendation_created", {
      traceId,
      conversationId,
      capability: draft.recommendation.capabilityLabel,
      architectureArea: draft.recommendation.architectureArea,
      evidenceCount: draft.recommendation.evidenceCount,
      descriptorFreshnessState: draft.handoffContext.descriptorFreshnessState,
      proposalOnly: draft.boundary.proposalOnly,
      approvalCaptured: draft.boundary.approvalCaptured,
      memoryWriteAllowed: draft.boundary.memoryWriteAllowed,
      agentDispatchAllowed: draft.boundary.agentDispatchAllowed,
      externalSendAllowed: draft.boundary.externalSendAllowed,
      canSendToNapoleon: draft.sendState.canSendToNapoleon,
      handoffStatus: draft.handoffContext.status,
      handoffBlocker: draft.handoffContext.blockerLabel ?? "none",
    });
    for (const learningSignal of draft.evolutionProposal.learning_signals) {
      const { eventName, ...attributes } = buildLearningSignalTelemetryAttributes(learningSignal);
      emitEvent(eventName, {
        traceId,
        conversationId,
        ...attributes,
      });
    }
    refreshCapabilityLedgerStatus();
  }

  function exportSteeringDraft() {
    if (!steeringDraft) return;
    const traceId = newTraceId();
    setSteeringDraftExportJson(
      JSON.stringify(
        {
          kind: "concierge_chief_of_staff_steering_draft",
          version: 1,
          exportedAt: new Date().toISOString(),
          caveat:
            "Local proposal packet only. It is not Napoleon approval and does not apply changes, write memory, dispatch agents, capture approval, or send externally.",
          displayType: describeSteeringRecommendationDisplayType(steeringDraft),
          recommendation: steeringDraft.recommendation,
          evaluatorCaseCandidate: steeringDraft.evaluatorCaseCandidate,
          evolutionProposal: steeringDraft.evolutionProposal,
          handoffContext: steeringDraft.handoffContext,
          learningSignalCount: steeringDraft.evolutionProposal.learning_signals.length,
          sendState: steeringDraft.sendState,
          boundary: steeringDraft.boundary,
        },
        null,
        2,
      ),
    );
    emitEvent("chief_of_staff_steering_draft_exported", {
      traceId,
      conversationId,
      capability: steeringDraft.recommendation.capabilityLabel,
      evaluatorCaseId: steeringDraft.evaluatorCaseCandidate.caseId,
      proposalId: steeringDraft.evolutionProposal.proposal_id,
      learningSignalCount: steeringDraft.evolutionProposal.learning_signals.length,
      descriptorFreshnessState: steeringDraft.handoffContext.descriptorFreshnessState,
      proposalOnly: steeringDraft.boundary.proposalOnly,
      approvalCaptured: steeringDraft.boundary.approvalCaptured,
      memoryWriteAllowed: steeringDraft.boundary.memoryWriteAllowed,
      agentDispatchAllowed: steeringDraft.boundary.agentDispatchAllowed,
      externalSendAllowed: steeringDraft.boundary.externalSendAllowed,
    });
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
      setSteeringSubmission({
        result,
        recommendationType: steeringDraft.recommendation.recommendationType,
        displayType: describeSteeringRecommendationDisplayType(steeringDraft),
      });
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
      setTaxonomyReviewSubmission({
        result,
        recommendationCount: taxonomyReviewDraft.recommendations.length,
        reviewFocus: describeTaxonomyReviewFocus(taxonomyReviewDraft),
      });
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

  async function submitCapabilityReviewPacketExport() {
    if (!capabilityReviewPacket) return;
    const traceId = newTraceId();
    try {
      const result = await submitCapabilityReviewPacket(capabilityReviewPacket, {
        conversationId,
        traceId,
        profile,
        rehearsalMode,
        descriptorConnection: currentDescriptorInput(),
      });
      setCapabilityReviewPacketSubmission({
        result,
        reviewFocus: capabilityReviewPacket.reviewFocus,
      });
      setCapabilityReviewPacketFailure(null);
      refreshCapabilityLedgerStatus();
    } catch (error) {
      setCapabilityReviewPacketFailure(
        describeGovernedHandoffFailure(error, "Capability review packet handoff", "apply changes"),
      );
      setCapabilityReviewPacketSubmission(null);
      refreshCapabilityLedgerStatus();
    }
  }

  function rememberEvolutionProposalLifecycle(record: EvolutionProposalLifecycleRecord) {
    setEvolutionProposalLifecycleRecords((current) => {
      const next = upsertEvolutionProposalLifecycleRecord(current, record);
      persistEvolutionProposalLifecycleRecords(browserStorage(), next);
      return next;
    });
    setEvolutionProposalLifecycleExportJson(null);
  }

  function exportEvolutionProposalLifecycle() {
    const exported = exportEvolutionProposalLifecycleRecords(evolutionProposalLifecycleRecords);
    setEvolutionProposalLifecycleExportJson(JSON.stringify(exported, null, 2));
    emitEvent("evolution_proposal_lifecycle_exported", {
      traceId: newTraceId(),
      conversationId,
      recordCount: evolutionProposalLifecycleRecords.length,
      proposalOnly: true,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      registryUpdatePerformed: false,
      evolutionApplied: false,
      appliedLocally: false,
    });
  }

  function draftNewAgentProposalReviewPacket() {
    if (!capabilityReviewPacket) return;
    const traceId = newTraceId();
    const packet = buildNewAgentProposalReviewPacket(capabilityReviewPacket, {
      profile,
      traceId,
    });
    setNewAgentProposalPacket(packet);
    setNewAgentProposalPacketExportJson(JSON.stringify(packet, null, 2));
    setNewAgentProposalSubmission(null);
    setNewAgentProposalFailure(null);
    emitEvent("new_agent_proposal_review_drafted", {
      traceId,
      conversationId,
      proposalId: packet.proposalId,
      proposedAgentId: packet.proposedAgent.agentId,
      capability: packet.proposedAgent.capability,
      profileMode: packet.profileMode,
      proposalOnly: packet.boundary.proposalOnly,
      activationRequested: packet.boundary.activationRequested,
      registryUpdateRequested: packet.boundary.registryUpdateRequested,
      approvalCaptured: packet.boundary.approvalCaptured,
      memoryWritePerformed: packet.boundary.memoryWritePerformed,
      agentDispatchPerformed: packet.boundary.agentDispatchPerformed,
      externalSendPerformed: packet.boundary.externalSendPerformed,
      appliedLocally: packet.boundary.appliedLocally,
    });
    refreshCapabilityLedgerStatus();
  }

  async function submitNewAgentProposalReviewPacket() {
    if (!newAgentProposalPacket) return;
    const traceId = newTraceId();
    try {
      const result = await submitNewAgentProposalForNapoleonReview(newAgentProposalPacket, {
        conversationId,
        traceId,
        profile,
        rehearsalMode,
        descriptorConnection: currentDescriptorInput(),
      });
      setNewAgentProposalSubmission(result);
      setNewAgentProposalFailure(null);
      refreshCapabilityLedgerStatus();
    } catch (error) {
      setNewAgentProposalFailure(
        describeGovernedHandoffFailure(error, "New-agent proposal review handoff", "activate agents or update registries"),
      );
      setNewAgentProposalSubmission(null);
      refreshCapabilityLedgerStatus();
    }
  }

  function draftEvolutionProposalSubmissionPacket() {
    if (!capabilityReviewPacket) return;
    const traceId = newTraceId();
    const packet = buildEvolutionProposalSubmissionPacket(capabilityReviewPacket, {
      profile,
      traceId,
    });
    setEvolutionProposalSubmissionPacket(packet);
    setEvolutionProposalSubmissionPacketExportJson(JSON.stringify(packet, null, 2));
    setEvolutionProposalSubmission(null);
    setEvolutionProposalSubmissionFailure(null);
    const lifecycleRecord = buildDraftEvolutionProposalLifecycleRecord(packet);
    rememberEvolutionProposalLifecycle(lifecycleRecord);
    emitEvent("evolution_proposal_submission_drafted", {
      traceId,
      conversationId,
      proposalId: packet.proposalId,
      capability: packet.evolutionProposal.change.capability,
      profileMode: packet.profileMode,
      proposalOnly: packet.boundary.proposalOnly,
      submittedForNapoleonReview: packet.boundary.submittedForNapoleonReview,
      approvalCaptured: packet.boundary.approvalCaptured,
      memoryWritePerformed: packet.boundary.memoryWritePerformed,
      agentDispatchPerformed: packet.boundary.agentDispatchPerformed,
      externalSendPerformed: packet.boundary.externalSendPerformed,
      registryUpdatePerformed: packet.boundary.registryUpdatePerformed,
      evolutionApplied: packet.boundary.evolutionApplied,
      appliedLocally: packet.boundary.appliedLocally,
    });
    emitEvent("evolution_proposal_lifecycle_recorded", {
      traceId,
      conversationId,
      proposalId: packet.proposalId,
      lifecycleState: lifecycleRecord.currentLifecycleState,
      latestKnownOutcome: lifecycleRecord.latestKnownOutcome,
      privacyClass: lifecycleRecord.privacyClass,
      proposalOnly: lifecycleRecord.boundary.proposalOnly,
      approvalCaptured: lifecycleRecord.boundary.approvalCaptured,
      memoryWritePerformed: lifecycleRecord.boundary.memoryWritePerformed,
      agentDispatchPerformed: lifecycleRecord.boundary.agentDispatchPerformed,
      externalSendPerformed: lifecycleRecord.boundary.externalSendPerformed,
      registryUpdatePerformed: lifecycleRecord.boundary.registryUpdatePerformed,
      evolutionApplied: lifecycleRecord.boundary.evolutionApplied,
      appliedLocally: lifecycleRecord.boundary.appliedLocally,
    });
    refreshCapabilityLedgerStatus();
  }

  async function submitEvolutionProposalSubmissionPacket() {
    if (!evolutionProposalSubmissionPacket) return;
    const traceId = newTraceId();
    try {
      const result = await submitEvolutionProposalToNapoleon(evolutionProposalSubmissionPacket, {
        conversationId,
        traceId,
        profile,
        rehearsalMode,
        descriptorConnection: currentDescriptorInput(),
      });
      setEvolutionProposalSubmission(result);
      setEvolutionProposalSubmissionFailure(null);
      const currentLifecycle =
        evolutionProposalLifecycleRecords.find((record) => record.proposalId === evolutionProposalSubmissionPacket.proposalId) ??
        buildDraftEvolutionProposalLifecycleRecord(evolutionProposalSubmissionPacket);
      const nextLifecycle = updateEvolutionProposalLifecycleAfterSubmission(currentLifecycle, result);
      rememberEvolutionProposalLifecycle(nextLifecycle);
      emitEvent("evolution_proposal_lifecycle_recorded", {
        traceId,
        conversationId,
        proposalId: nextLifecycle.proposalId,
        lifecycleState: nextLifecycle.currentLifecycleState,
        latestKnownOutcome: nextLifecycle.latestKnownOutcome,
        decisionId: nextLifecycle.intakeDecisionId,
        auditId: nextLifecycle.intakeAuditId,
        statusRefreshAvailable: nextLifecycle.statusRefresh.available,
        privacyClass: nextLifecycle.privacyClass,
        proposalOnly: nextLifecycle.boundary.proposalOnly,
        approvalCaptured: nextLifecycle.boundary.approvalCaptured,
        memoryWritePerformed: nextLifecycle.boundary.memoryWritePerformed,
        agentDispatchPerformed: nextLifecycle.boundary.agentDispatchPerformed,
        externalSendPerformed: nextLifecycle.boundary.externalSendPerformed,
        registryUpdatePerformed: nextLifecycle.boundary.registryUpdatePerformed,
        evolutionApplied: nextLifecycle.boundary.evolutionApplied,
        appliedLocally: nextLifecycle.boundary.appliedLocally,
      });
      refreshCapabilityLedgerStatus();
    } catch (error) {
      const failure = describeGovernedHandoffFailure(error, "Evolution proposal submission handoff", "apply evolution changes");
      setEvolutionProposalSubmissionFailure(failure);
      setEvolutionProposalSubmission(null);
      const currentLifecycle =
        evolutionProposalLifecycleRecords.find((record) => record.proposalId === evolutionProposalSubmissionPacket.proposalId) ??
        buildDraftEvolutionProposalLifecycleRecord(evolutionProposalSubmissionPacket);
      const nextLifecycle = updateEvolutionProposalLifecycleAfterFailure(currentLifecycle, failure);
      rememberEvolutionProposalLifecycle(nextLifecycle);
      emitEvent("evolution_proposal_lifecycle_recorded", {
        traceId,
        conversationId,
        proposalId: nextLifecycle.proposalId,
        lifecycleState: nextLifecycle.currentLifecycleState,
        latestKnownOutcome: nextLifecycle.latestKnownOutcome,
        statusRefreshAvailable: nextLifecycle.statusRefresh.available,
        privacyClass: nextLifecycle.privacyClass,
        proposalOnly: nextLifecycle.boundary.proposalOnly,
        approvalCaptured: nextLifecycle.boundary.approvalCaptured,
        memoryWritePerformed: nextLifecycle.boundary.memoryWritePerformed,
        agentDispatchPerformed: nextLifecycle.boundary.agentDispatchPerformed,
        externalSendPerformed: nextLifecycle.boundary.externalSendPerformed,
        registryUpdatePerformed: nextLifecycle.boundary.registryUpdatePerformed,
        evolutionApplied: nextLifecycle.boundary.evolutionApplied,
        appliedLocally: nextLifecycle.boundary.appliedLocally,
      });
      refreshCapabilityLedgerStatus();
    }
  }

  async function refreshEvolutionProposalLifecycleStatus(record: EvolutionProposalLifecycleRecord) {
    const traceId = newTraceId();
    try {
      const result = await refreshEvolutionProposalStatusFromNapoleon(record, {
        conversationId,
        traceId,
        profile,
        rehearsalMode,
        descriptorConnection: currentDescriptorInput(),
      });
      const nextLifecycle = updateEvolutionProposalLifecycleFromStatus(record, result);
      rememberEvolutionProposalLifecycle(nextLifecycle);
      setEvolutionProposalStatusFailure(null);
      emitEvent("evolution_proposal_lifecycle_recorded", {
        traceId,
        conversationId,
        proposalId: nextLifecycle.proposalId,
        lifecycleState: nextLifecycle.currentLifecycleState,
        latestKnownOutcome: nextLifecycle.latestKnownOutcome,
        decisionId: nextLifecycle.intakeDecisionId,
        auditId: nextLifecycle.intakeAuditId,
        statusRefreshAvailable: nextLifecycle.statusRefresh.available,
        privacyClass: nextLifecycle.privacyClass,
        proposalOnly: nextLifecycle.boundary.proposalOnly,
        approvalCaptured: nextLifecycle.boundary.approvalCaptured,
        memoryWritePerformed: nextLifecycle.boundary.memoryWritePerformed,
        agentDispatchPerformed: nextLifecycle.boundary.agentDispatchPerformed,
        externalSendPerformed: nextLifecycle.boundary.externalSendPerformed,
        registryUpdatePerformed: nextLifecycle.boundary.registryUpdatePerformed,
        evolutionApplied: nextLifecycle.boundary.evolutionApplied,
        appliedLocally: nextLifecycle.boundary.appliedLocally,
      });
      refreshCapabilityLedgerStatus();
    } catch (error) {
      setEvolutionProposalStatusFailure(
        describeGovernedHandoffFailure(error, "Evolution proposal status refresh", "apply evolution changes"),
      );
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
  const rehearsalSendBlockReason = pendingRehearsal
    ? rehearsalMode
      ? "Rehearsal Mode is still active. Turn it off before sending the preview through the governed bridge."
      : input.trim() !== pendingRehearsal.content
        ? "Preview no longer matches the current request. Create a new rehearsal preview before sending."
        : !pendingRehearsal.preview.governanceReview.canSendAdvisory
          ? "The rehearsed governance decision blocks this advisory request."
          : !descriptorConnection.canAttemptLiveBridge
            ? "Descriptor preflight is not ready for a governed bridge send."
            : null
    : null;
  const taxonomyCounts = getTaxonomyLabelCounts(capabilityLedger.listRecent(), capabilityTaxonomy);
  const taxonomyRows = (Object.keys(taxonomyCounts) as TaxonomyDimension[]).flatMap((dimension) =>
    taxonomyCounts[dimension].map((row) => ({ ...row, value: `${dimension}:${row.label}` })),
  );
  const selectedTaxonomyRow = taxonomyRows.find((row) => row.value === selectedTaxonomyLabel);
  const derivedRuntimeValidationSource = deriveRuntimeValidationSource({
    endpoint,
    descriptorMode,
    evidenceCaptureState: bridgeEvidenceReadiness.captureState,
    evidenceComparisonState: bridgeEvidenceReadiness.comparisonState,
  });
  const runtimeValidationSource = derivedRuntimeValidationSource ?? evaluatorValidationImport?.runtimeValidationSource;
  const liveBridgeReadiness = describeLiveBridgeReadiness({
    descriptorConnection,
    evidenceCaptureState: bridgeEvidenceReadiness.captureState,
    evidenceComparisonState: bridgeEvidenceReadiness.comparisonState,
    lastEvidenceStatus: bridgeEvidenceReadiness.lastEvidenceStatus,
    lastEvidenceOperationId: bridgeEvidenceReadiness.lastOperationId,
    lastEvidenceTargetPath: bridgeEvidenceReadiness.lastTargetPath,
    lastFailureReason: bridgeEvidenceReadiness.lastFailureReason,
    runtimeValidationSource,
    evaluatorValidationStatus: evaluatorValidationImport?.validation.status,
    evaluatorFailureReason: evaluatorValidationImport?.validation.failureReason,
    evaluatorTargetPath: evaluatorValidationImport?.validation.targetPath,
    evaluatorDescriptorHandoffAdvertised: evaluatorValidationImport?.validation.descriptorHandoffAdvertised,
    evaluatorDescriptorHandoffSource: evaluatorValidationImport?.validation.descriptorHandoffSource,
    evaluatorDescriptorHandoffFailureReason: evaluatorValidationImport?.validation.descriptorHandoffFailureReason,
    evaluatorDescriptorHandoffRequiredAction: evaluatorValidationImport?.validation.descriptorHandoffRequiredAction,
  });
  const liveBridgeReadinessDetail = (label: string) =>
    liveBridgeReadiness.details.find((detail) => detail.label === label)?.value ?? "unavailable";
  const liveBridgeReadinessGroups = [
    {
      label: "Napoleon bridge descriptor",
      value: `${liveBridgeReadinessDetail("Descriptor")}; checksum ${liveBridgeReadinessDetail(
        "Checksum",
      )}; signature ${liveBridgeReadinessDetail("Signature")}`,
    },
    { label: "Governed text-turn route", value: liveBridgeReadinessDetail("Text-turn route") },
    {
      label: "Evaluator HTTP validation",
      value: `${liveBridgeReadinessDetail("Evaluator HTTP")}; target ${liveBridgeReadinessDetail("Evaluator target")}`,
    },
    {
      label: "Last live evidence",
      value: `${liveBridgeReadinessDetail("Evidence capture")}; ${liveBridgeReadinessDetail(
        "Evidence comparison",
      )}; last send ${liveBridgeReadinessDetail("Last live send")}; real proof ${liveBridgeReadinessDetail(
        "Last real-runtime proof",
      )}`,
    },
    { label: "Promotion gate", value: `gate state: ${liveBridgeReadinessDetail("Promotion gate")}` },
    { label: "Authority boundary", value: `blocked effects: ${liveBridgeReadiness.blockedEffects.join(", ")}` },
  ];
  const liveVoiceReadiness = describeLiveVoiceReadiness({
    descriptorConnection,
    profileMode: mapProfileToNapoleonMode(profile),
    microphoneEnabled,
    microphonePermissionStatus,
    evidenceCaptureState: bridgeEvidenceReadiness.captureState,
    evidenceComparisonState: bridgeEvidenceReadiness.comparisonState,
    runtimeValidationSource,
    acceptedRealRuntimeProof: acceptedReadinessProofImport?.lastRealRuntimeProof,
    rehearsalMode,
  });
  const governedVoicePipelinePlan = buildGovernedVoicePipelinePlan({ profileMode: mapProfileToNapoleonMode(profile) });
  const currentInput = input.trim();
  const currentContract = currentInput
    ? buildTextTurnContract({ message: currentInput, profile, conversationId, turnId: "turn_preflight", traceId: "trace_preflight" })
    : null;
  const chiefOfStaffRequestHandoffReadiness = describeGovernedHandoffReadiness({
    label: "Chief of Staff request packet",
    descriptorConnection,
    draftReady: Boolean(currentContract),
    artifactLabel: "Request packet",
    artifactReadyDetail: "A local Chief of Staff request packet can be exported from the current text turn.",
    artifactBlockedDetail: "Enter a text request before exporting a Chief of Staff request packet.",
    readyNextStepSummary:
      "Next step: send only when the governed Napoleon request handoff is advertised and Rehearsal Mode is off.",
    rehearsalMode,
    requiredHandoff: "chief_of_staff_request",
  });
  const governanceEvaluationHandoffReadiness = describeGovernedHandoffReadiness({
    label: "Governance evaluation packet",
    descriptorConnection,
    draftReady: Boolean(currentContract),
    artifactLabel: "Governance packet",
    artifactReadyDetail: "A local governance evaluation packet can be exported from the current text turn.",
    artifactBlockedDetail: "Enter a text request before exporting a governance evaluation packet.",
    readyNextStepSummary:
      "Next step: send only when the governed Napoleon governance evaluation handoff is advertised and Rehearsal Mode is off.",
    rehearsalMode,
    requiredHandoff: "governance_evaluation",
  });
  const currentGovernanceReviewState = currentContract
    ? buildGovernanceReviewState(currentContract.governanceDecision, profile)
    : null;
  const localGovernanceBlocksDirectSend = Boolean(currentGovernanceReviewState && !currentGovernanceReviewState.canSendAdvisory);
  const liveSendPreflight = describeLiveSendPreflight({
    descriptorConnection,
    inputReady: Boolean(currentInput),
    governanceCanSendAdvisory: currentGovernanceReviewState ? currentGovernanceReviewState.canSendAdvisory : true,
    governanceOutcome: currentContract?.governanceDecision.outcome,
    rehearsalMode,
    evidenceCaptureState: bridgeEvidenceReadiness.captureState,
    evidenceComparisonState: bridgeEvidenceReadiness.comparisonState,
    runtimeValidationSource,
    evaluatorValidationStatus: evaluatorValidationImport?.validation.status,
    evaluatorFailureReason: evaluatorValidationImport?.validation.failureReason,
    evaluatorTargetPath: evaluatorValidationImport?.validation.targetPath,
    evaluatorDescriptorHandoffAdvertised: evaluatorValidationImport?.validation.descriptorHandoffAdvertised,
    evaluatorDescriptorHandoffSource: evaluatorValidationImport?.validation.descriptorHandoffSource,
    evaluatorDescriptorHandoffFailureReason: evaluatorValidationImport?.validation.descriptorHandoffFailureReason,
    evaluatorDescriptorHandoffRequiredAction: evaluatorValidationImport?.validation.descriptorHandoffRequiredAction,
    acceptedRealRuntimeProof: acceptedReadinessProofImport?.lastRealRuntimeProof,
  });
  const directSendPreflightBlocker = !rehearsalMode && !localGovernanceBlocksDirectSend
    ? liveSendPreflight.items.find((item) => item.status === "blocked")
    : undefined;
  const connectionGuideStep = !endpoint.trim()
    ? "configure endpoint"
    : !descriptorConnection.canAttemptLiveBridge
      ? "discover descriptor"
      : !descriptorStatus?.supportedHandoffs.includes("text_turn")
        ? "advertise text_turn"
        : rehearsalMode
          ? "preview locally"
          : liveSendPreflight.canAttemptLiveSend
            ? "ready for governed send"
            : "complete preflight";
  const governedOperationSummaries = [
    describeBridgeOperationSummary("chief_of_staff_descriptor"),
    describeBridgeOperationSummary("chief_of_staff_capabilities"),
    describeBridgeOperationSummary("text_turn"),
    describeBridgeOperationSummary("memory_proposal_review"),
    describeBridgeOperationSummary("chief_of_staff_steering"),
    describeTaxonomyReviewBridgeSummary(),
    describeNapoleonReviewOperationSummary("chief_of_staff_request"),
    describeNapoleonReviewOperationSummary("evaluation_review"),
    describeNapoleonReviewOperationSummary("evolution_proposal_review"),
    describeNapoleonReviewOperationSummary("evolution_proposal_submission"),
    describeNapoleonReviewOperationSummary("evolution_proposal_status"),
    describeNapoleonReviewOperationSummary("governance_evaluation"),
    describeNapoleonReviewOperationSummary("governance_review"),
    describeNapoleonReviewOperationSummary("new_agent_proposal_review"),
    describeNapoleonReviewOperationSummary("observability_trace"),
  ];
  const generatedNapoleonTargetCount = governedOperationSummaries.filter((operation) => operation.sourceSummary).length;
  const microphonePermissionLabel =
    microphonePermissionStatus === "not_requested"
      ? "Permission not requested"
      : microphonePermissionStatus === "requested"
        ? "Permission requested"
      : microphonePermissionStatus === "granted"
        ? "Permission granted"
        : microphonePermissionStatus === "unavailable"
          ? "Permission unavailable"
          : "Permission denied";
  const cameraPermissionLabel =
    cameraPermissionStatus === "not_requested"
      ? "Permission not requested"
      : cameraPermissionStatus === "requested"
        ? "Permission requested"
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
  const mediaSessionSummary = buildMediaSessionSummary({
    profileMode: profile,
    microphoneEnabled,
    microphonePermissionStatus,
    cameraEnabled,
    cameraPermissionStatus,
    mediaApiAvailable: true,
  });
  useEffect(() => {
    if (!mediaSessionReadinessInitialized.current) {
      mediaSessionReadinessInitialized.current = true;
      return;
    }
    emitEvent(
      "media_session_readiness_summarized",
      buildMediaSessionReadinessTelemetryAttributes(mediaSessionSummary, {
        traceId: newTraceId(),
        conversationId,
      }),
    );
    refreshTelemetryBufferStatus();
  }, [conversationId, profile, microphoneEnabled, microphonePermissionStatus, cameraEnabled, cameraPermissionStatus]);
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
  const napoleonDelegationView =
    lastNapoleonPresentation.delegation ??
    describeDelegation(undefined, undefined, { descriptorConnection, failure: lastNapoleonTurnFailure });
  const connectionTextTurnRouteStatus = !descriptorConnection.canAttemptLiveBridge
    ? "blocked until descriptor preflight passes"
    : descriptorStatus?.supportedHandoffs.includes("text_turn")
      ? "advertised"
      : "not advertised";
  const descriptorFreshnessSummary =
    descriptorConnection.freshnessState === "not_timestamped"
      ? "not timestamped"
      : `${descriptorConnection.freshnessState}; discovered ${
          descriptorConnection.discoveredAt ?? "unavailable"
        }; age ${descriptorConnection.ageSeconds ?? "unavailable"}s; max age ${
          descriptorConnection.maxAgeSeconds ?? "unavailable"
        }s`;
  const latestNapoleonTurnSummary = describeLastNapoleonTurnSummary(
    lastNapoleonPresentation.proof,
    lastNapoleonTurnFailure,
  );
  const napoleonTurnTimeline = describeNapoleonTurnTimeline(
    lastNapoleonPresentation.proof,
    lastNapoleonTurnFailure,
    liveSendPreflight,
  );

  function withLatestNapoleonTurnEvidence(
    answer: NonNullable<ReturnType<typeof answerCapabilityQuestion>>,
  ): NonNullable<ReturnType<typeof answerCapabilityQuestion>> {
    if (!lastNapoleonPresentation.proof && !lastNapoleonTurnFailure) return answer;

    const latestEntry = lastNapoleonTurnFailure
      ? napoleonTurnTimeline.entries.find((entry) => entry.label === "Latest blocked attempt")
      : napoleonTurnTimeline.entries.find((entry) => entry.label === "Latest successful response");
    if (!latestEntry || latestEntry.status === "not_available") return answer;

    const evidence: CapabilityLatestTurnEvidence = {
      status: lastNapoleonTurnFailure ? "blocked" : "accepted",
      summary: latestEntry.summary,
      attributionSource: lastNapoleonTurnFailure
        ? "fail-closed bridge metadata; no accepted delegation attribution"
        : "accepted Napoleon bridge response proof",
      proofAlignment: detailValue(latestEntry.details, "Proof alignment"),
      handledBy: detailValue(latestEntry.details, "Handled by"),
      targetCapability:
        lastNapoleonPresentation.proofMetadata?.targetCapability ?? detailValue(latestEntry.details, "Target capability"),
      governance: detailValue(latestEntry.details, "Governance"),
      trace: detailValue(latestEntry.details, "Trace"),
      failureReason: detailValue(latestEntry.details, "Failure reason"),
      blockedEffects: detailValue(latestEntry.details, "Blocked effects")
        .split(",")
        .map((effect) => effect.trim())
        .filter(Boolean),
      nextStep:
        detailValue(latestEntry.details, "Next step") !== "not returned"
          ? detailValue(latestEntry.details, "Next step")
          : napoleonTurnTimeline.comparison.find((row) => row.label === "Next step")?.value ?? "not returned",
      boundary: detailValue(latestEntry.details, "Boundary"),
      proposalOnly: true,
    };

    return withCapabilityLatestTurnEvidence(answer, evidence);
  }

  function renderGovernedReviewResponse(result: GovernedReviewResponseView, localEffects: string) {
    const responseView = describeGovernedReviewResponse(result, localEffects);

    return (
      <dl>
        {responseView.rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  function renderSteeringReviewResponse(submission: SteeringSubmissionView) {
    const responseView = describeGovernedReviewResponse(
      submission.result,
      "not applied; no memory write; no approval captured; no agent dispatch; no external send.",
    );

    return (
      <dl>
        <div>
          <dt>Reviewed recommendation type</dt>
          <dd>{describeSteeringRecommendationTypeValue(submission.recommendationType)}</dd>
        </div>
        <div>
          <dt>Reviewed repair focus</dt>
          <dd>{submission.displayType}</dd>
        </div>
        {responseView.rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  function renderCapabilityReviewPacketResponse(submission: CapabilityReviewPacketSubmissionView) {
    return (
      <dl>
        <div>
          <dt>Reviewed capability focus</dt>
          <dd>{submission.reviewFocus.capabilityLabel}</dd>
        </div>
        <div>
          <dt>Reviewed architecture area</dt>
          <dd>{submission.reviewFocus.architectureArea}</dd>
        </div>
        {describeGovernedReviewResponse(
          submission.result,
          "not applied; no memory write; no approval captured; no agent dispatch; no external send.",
        ).rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  function renderTaxonomyReviewResponse(submission: TaxonomyReviewSubmissionView) {
    return (
      <dl>
        <div>
          <dt>Reviewed taxonomy recommendations</dt>
          <dd>{submission.recommendationCount} taxonomy recommendation(s)</dd>
        </div>
        <div>
          <dt>Reviewed taxonomy focus</dt>
          <dd>{submission.reviewFocus}</dd>
        </div>
        {describeGovernedReviewResponse(
          submission.result,
          "not applied; no memory write; no approval captured; no agent dispatch; no external send.",
        ).rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  function renderContractPacketSubmissionResponse(
    result: ContractPacketSubmissionResult,
    localEffects: string,
  ) {
    return (
      <dl>
        {describeGovernedReviewResponse(result, localEffects).rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
        <div>
          <dt>Approval capture boundary</dt>
          <dd>Approval captured: no</dd>
        </div>
        <div>
          <dt>Memory write boundary</dt>
          <dd>Memory write performed: no</dd>
        </div>
        <div>
          <dt>Agent dispatch boundary</dt>
          <dd>Agent dispatch performed: no</dd>
        </div>
        <div>
          <dt>External send boundary</dt>
          <dd>External send performed: no</dd>
        </div>
        <div>
          <dt>Routing boundary</dt>
          <dd>Routing performed: no</dd>
        </div>
        <div>
          <dt>Registry update boundary</dt>
          <dd>Registry update performed: no</dd>
        </div>
        <div>
          <dt>Trace append boundary</dt>
          <dd>Trace append performed: no</dd>
        </div>
        <div>
          <dt>Local application boundary</dt>
          <dd>Applied locally: no</dd>
        </div>
      </dl>
    );
  }

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
            <option value="stale">Stale descriptor cache</option>
          </select>
        </label>
        <button className="secondary" onClick={() => void discoverDescriptor()}>
          Discover descriptor
        </button>
        <button className="secondary" disabled={!descriptorConnection.canAttemptLiveBridge} onClick={() => void discoverCapabilities()}>
          Discover advisory capabilities
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
        <div>
          <strong>Trace handoff readiness</strong>
          <span>Trace handoff: {observabilityTraceHandoffReadiness.summary}</span>
          {observabilityTraceHandoffReadiness.items.map((item) => (
            <span key={`trace-handoff-${item.label}`}>
              {item.label}: {item.status} - {item.detail}
            </span>
          ))}
          <span>{observabilityTraceHandoffReadiness.nextStepSummary}</span>
          <span>Trace handoff boundary: evidence-only; no trace append, audit authority, approval, memory, agents, routing, external send, or local application.</span>
        </div>
        <button className="secondary" onClick={exportLocalTelemetryBuffer}>
          Export telemetry buffer
        </button>
        <button className="secondary" disabled={!latestInteractionTraceId} onClick={exportLatestInteractionTrace}>
          Export latest trace
        </button>
        <button
          className="secondary"
          disabled={!observabilityTraceHandoffReadiness.canSubmit}
          onClick={() => void submitLatestInteractionTraceHandoff()}
        >
          Send trace evidence
        </button>
        <button className="secondary" onClick={clearLocalTelemetryBuffer}>
          Clear telemetry buffer
        </button>
        {observabilityTraceHandoffResult ? (
          <div>
            <strong>Trace handoff reviewed</strong>
            <span>Outcome: {observabilityTraceHandoffResult.governanceDecision.outcome}</span>
            <span>Decision: {observabilityTraceHandoffResult.governanceDecision.decision_id}</span>
            <span>Audit: {observabilityTraceHandoffResult.governanceDecision.audit_id}</span>
            <span>Trace append performed: {observabilityTraceHandoffResult.traceAppendPerformed ? "yes" : "no"}</span>
            <span>Audit authority created: {observabilityTraceHandoffResult.auditAuthorityCreated ? "yes" : "no"}</span>
            <span>Applied locally: {observabilityTraceHandoffResult.appliedLocally ? "yes" : "no"}</span>
            <span>External send performed: {observabilityTraceHandoffResult.externalSendPerformed ? "yes" : "no"}</span>
          </div>
        ) : null}
        {observabilityTraceHandoffFailure ? (
          <div>
            <strong>Trace handoff blocked</strong>
            <span>{observabilityTraceHandoffFailure}</span>
          </div>
        ) : null}
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

      <section className="contract-status" aria-label="Media session controller">
        <div>
          <strong>Media session controller</strong>
          <span>local preflight only</span>
        </div>
        <div>
          <strong>Microphone session</strong>
          <span>Microphone session: {mediaSessionSummary.microphone.status}</span>
          <span>Microphone permission: {mediaSessionSummary.microphone.permissionStatus}</span>
          <span>Microphone capture started: {mediaSessionSummary.microphone.microphoneCaptureStarted ? "yes" : "no"}</span>
        </div>
        <div>
          <strong>Camera session</strong>
          <span>Camera session: {mediaSessionSummary.camera.status}</span>
          <span>Camera permission: {mediaSessionSummary.camera.permissionStatus}</span>
          <span>Camera capture started: {mediaSessionSummary.camera.cameraCaptureStarted ? "yes" : "no"}</span>
        </div>
        <div>
          <strong>Playback session</strong>
          <span>Playback session: {mediaSessionSummary.playback.status}</span>
          <span>Audio playback started: {mediaSessionSummary.playback.audioPlaybackStarted ? "yes" : "no"}</span>
          <span>Raw audio stored: {mediaSessionSummary.playback.rawAudioStored ? "yes" : "no"}</span>
        </div>
        <div>
          <strong>Child boundary</strong>
          <span>Child protected: {mediaSessionSummary.childProtected ? "yes" : "no"}</span>
          <span>Guardian approval captured: {mediaSessionSummary.microphone.guardianApprovalCaptured ? "yes" : "no"}</span>
          <span>{mediaSessionSummary.microphone.guardianReviewReminder}</span>
        </div>
        <div>
          <strong>Authority boundary</strong>
          <span>Authority boundary: {mediaSessionSummary.authorityBoundary}</span>
        </div>
        <div>
          <strong>Blocked effects</strong>
          <span>Microphone blocked effects: {mediaSessionSummary.microphone.blockedEffects.join(", ")}</span>
          <span>Camera blocked effects: {mediaSessionSummary.camera.blockedEffects.join(", ")}</span>
          <span>Playback blocked effects: {mediaSessionSummary.playback.blockedEffects.join(", ")}</span>
        </div>
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
              <strong>Provenance state</strong>
              <span>Provenance state: {voiceResponseShapeResult.provenanceState}</span>
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
              <strong>Provenance state</strong>
              <span>Provenance state: {neutralAvatarStateResult.provenanceState}</span>
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
              <strong>Provenance state</strong>
              <span>Provenance state: {avatarExpressionResult.provenanceState}</span>
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
              <strong>Guardian approval</strong>
              <span>Guardian approval captured: {avatarGazeResult.guardianApprovalCaptured ? "yes" : "no"}</span>
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
              <strong>Guardian approval</strong>
              <span>Guardian approval captured: {avatarFacePoseResult.guardianApprovalCaptured ? "yes" : "no"}</span>
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
              <strong>Guardian approval</strong>
              <span>Guardian approval captured: {avatarAffectFusionResult.guardianApprovalCaptured ? "yes" : "no"}</span>
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

      <section className="contract-status" aria-label="Napoleon connection state">
        <div>
          <strong>Chief of Staff</strong>
          <span>{descriptorStatus?.serviceId ?? "not discovered"}</span>
        </div>
        <div>
          <strong>Connection state</strong>
          <span>{descriptorConnection.state}</span>
        </div>
        <div>
          <strong>Fail-closed reason</strong>
          <span>{descriptorConnection.failClosedReason ?? "none"}</span>
        </div>
        <div>
          <strong>Descriptor validation</strong>
          <span>{descriptorStatus?.ready ? "valid, contract-only" : descriptorConnection.message}</span>
        </div>
        <div>
          <strong>Text-turn route</strong>
          <span>{connectionTextTurnRouteStatus}</span>
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
          <strong>Descriptor freshness</strong>
          <span>{descriptorFreshnessSummary}</span>
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
        <div>
          <strong>Blocked effects</strong>
          <span>
            {(descriptorStatus?.blockedEffects ?? [
              "runtime_authority",
              "agent_dispatch",
              "memory_write",
              "approval_capture",
              "external_send",
            ]).join(", ")}
          </span>
        </div>
      </section>

      <section className={`contract-status ${liveSendPreflight.status}`} aria-label="Napoleon connection guide">
        <div>
          <strong>First-run path</strong>
          <span>{connectionGuideStep}</span>
        </div>
        <div>
          <strong>Next step</strong>
          <span>{liveSendPreflight.nextStepSummary}</span>
        </div>
        <div>
          <strong>Live send ready</strong>
          <span>Live send ready: {liveSendPreflight.canAttemptLiveSend ? "yes" : "no"}</span>
        </div>
        <div>
          <strong>Authority boundary</strong>
          <span>Authority boundary: local readiness only; not Napoleon approval.</span>
        </div>
      </section>

      <section className={`contract-status ${chiefOfStaffCapabilities?.state ?? "blocked"}`}>
        <div>
          <strong>Advisory capabilities</strong>
          <span>
            {chiefOfStaffCapabilities
              ? chiefOfStaffCapabilities.message
              : "Not fetched. Discover the descriptor first, then fetch advisory capabilities explicitly."}
          </span>
        </div>
        <div>
          <strong>Capability count</strong>
          <span>{chiefOfStaffCapabilities?.capabilities.length ?? 0}</span>
        </div>
        <div>
          <strong>Runtime authority</strong>
          <span>{chiefOfStaffCapabilities?.runtimeAuthority ? "enabled" : "blocked"}</span>
        </div>
        <div>
          <strong>Boundary</strong>
          <span>Advisory metadata only; not Napoleon approval.</span>
        </div>
        <div>
          <strong>Blocked effects</strong>
          <span>{(chiefOfStaffCapabilities?.blockedEffects ?? ["memory_write", "approval_capture", "agent_dispatch", "external_send"]).join(", ")}</span>
        </div>
        <div>
          <strong>Response side-effect claims</strong>
          <span>
            {chiefOfStaffCapabilities?.responseApprovalCaptured ||
            chiefOfStaffCapabilities?.responseMemoryWritePerformed ||
            chiefOfStaffCapabilities?.responseAgentDispatchPerformed ||
            chiefOfStaffCapabilities?.responseExternalSendPerformed
              ? [
                  chiefOfStaffCapabilities.responseApprovalCaptured ? "approval_capture" : null,
                  chiefOfStaffCapabilities.responseMemoryWritePerformed ? "memory_write" : null,
                  chiefOfStaffCapabilities.responseAgentDispatchPerformed ? "agent_dispatch" : null,
                  chiefOfStaffCapabilities.responseExternalSendPerformed ? "external_send" : null,
                ]
                  .filter(Boolean)
                  .join(", ")
              : "none"}
          </span>
        </div>
        {chiefOfStaffCapabilities?.capabilities.length ? (
          <dl>
            {chiefOfStaffCapabilities.capabilities.map((capability) => (
              <div key={capability.id}>
                <dt>{capability.label}</dt>
                <dd>
                  <span>{capability.id}</span>
                  <span>{capability.description}</span>
                  <span>Authority tier: {capability.authorityTier}</span>
                  <span>Proposal only: {capability.proposalOnly ? "yes" : "no"}</span>
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      <section className={`contract-status ${chiefOfStaffCapabilities?.state ?? "blocked"}`}>
        <div>
          <strong>Napoleon metadata discovery</strong>
          <span>
            {chiefOfStaffCapabilities?.state === "ready"
              ? "Agent and profile metadata discovered through named governed bridge targets."
              : "Not fetched. Metadata discovery is descriptor-gated and explicit."}
          </span>
        </div>
        <div>
          <strong>Agent manifests</strong>
          <span>{chiefOfStaffCapabilities?.agents.length ? chiefOfStaffCapabilities.agents.map((agent) => agent.displayName).join(", ") : "not returned"}</span>
        </div>
        <div>
          <strong>Profile metadata</strong>
          <span>{chiefOfStaffCapabilities?.profileMetadata?.profileId ?? "not returned"}</span>
        </div>
        <div>
          <strong>Boundary</strong>
          <span>metadata only; no agent dispatch, registry update, memory write, approval capture, or external send.</span>
        </div>
      </section>

      <section className="bridge-operations">
        <div>
          <strong>Governed Napoleon routes</strong>
          <span>These are the contract paths Concierge can use; endpoint hosts and tokens stay out of this view.</span>
          <span>
            Contract alignment: {RUNTIME_CONTRACT_ALIGNMENT_SUMMARY.summary} Status:{" "}
            {RUNTIME_CONTRACT_ALIGNMENT_SUMMARY.status}. Unmapped Napoleon runtime paths:{" "}
            {RUNTIME_CONTRACT_ALIGNMENT_SUMMARY.unmappedNapoleonRuntimePaths.length}.
          </span>
          <span>{RUNTIME_CONTRACT_ALIGNMENT_SUMMARY.detail}</span>
          <span>{RUNTIME_CONTRACT_ALIGNMENT_SUMMARY.boundary}</span>
        </div>
        <dl>
          {governedOperationSummaries.map((operation) => (
            <div key={operation.id}>
              <dt>{operation.label}</dt>
              <dd>
                <span>{operation.path}</span>
                <span>{operation.requestKind}</span>
                <span>Transport: {operation.transport}</span>
                <span>Token handling: {operation.tokenHandling}</span>
                <span>{operation.boundary}</span>
                {operation.sourceSummary ? <span>Source: {operation.sourceSummary}</span> : null}
                <span>Side effects: {operation.sideEffects}</span>
                <span>Required response fields: {operation.requiredResponseSummary}</span>
                {operation.acceptedEndpointForms ? (
                  <span>Accepted endpoint forms: {operation.acceptedEndpointForms.join(", ")}</span>
                ) : null}
                {operation.requiredProofSummary ? <span>Required proof: {operation.requiredProofSummary}</span> : null}
                {operation.acceptedEndpointSummary ? <span>{operation.acceptedEndpointSummary}</span> : null}
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
          {liveBridgeReadinessGroups.map((group) => (
            <div key={group.label}>
              <dt>{group.label}</dt>
              <dd>{group.value}</dd>
            </div>
          ))}
        </dl>
        <div className="proof-comparison warning">
          <strong>Promotion blockers</strong>
          {liveBridgeReadiness.promotionBlockers.length > 0 ? (
            <ul>
              {liveBridgeReadiness.promotionBlockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : (
            <span>No promotion blockers detected from current local evidence.</span>
          )}
          <span>Local summary only; not Napoleon approval.</span>
        </div>
        <div className="proof-comparison warning">
          <strong>Readiness proof source</strong>
          <span>
            Readiness proof exports include {generatedNapoleonTargetCount} named Napoleon review/evidence targets generated
            from api/napoleon_bridge.openapi.yaml review/evidence metadata.
          </span>
          <span>
            Local contract metadata only; no endpoint host, token, prompt, request body, response body, approval, memory
            write, agent dispatch, external send, or local application is included.
          </span>
        </div>
        <dl>
          {liveBridgeReadiness.details.map((detail) => (
            <div key={detail.label}>
              <dt>{detail.label === "Promotion gate" ? "Promotion gate detail" : detail.label}</dt>
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
        <div className="evaluator-import">
          <label>
            <span>Accepted readiness proof</span>
            <textarea
              aria-label="Accepted readiness proof"
              value={acceptedReadinessProofInput}
              onChange={(event) => setAcceptedReadinessProofInput(event.target.value)}
              placeholder="Paste a sanitized bridge readiness proof JSON accepted for local review"
            />
          </label>
          <button className="secondary" onClick={importAcceptedReadinessProof}>
            Import accepted readiness proof
          </button>
          {acceptedReadinessProofImport ? (
            <div className={`proof-comparison ${acceptedReadinessProofImport.status}`}>
              <strong>Accepted real-runtime proof</strong>
              <span>{acceptedReadinessProofImport.summary}</span>
              {acceptedReadinessProofImport.lastRealRuntimeProof ? (
                <span>
                  {acceptedReadinessProofImport.lastRealRuntimeProof.status}:{" "}
                  {acceptedReadinessProofImport.lastRealRuntimeProof.operationId} at{" "}
                  {acceptedReadinessProofImport.lastRealRuntimeProof.targetPath}
                </span>
              ) : null}
              {acceptedReadinessProofImport.lastRealRuntimeProof?.governedPacketEvidence ? (
                <span>
                  Governed packet proof:{" "}
                  {acceptedReadinessProofImport.lastRealRuntimeProof.governedPacketEvidence.status},{" "}
                  {acceptedReadinessProofImport.lastRealRuntimeProof.governedPacketEvidence.submissionCount} submissions,
                  Chief of Staff request and governance evaluation observed.
                </span>
              ) : null}
              <span>Sanitized local metadata only; not Napoleon approval.</span>
            </div>
          ) : null}
        </div>
        <div className="evaluator-import">
          <label>
            <span>Evaluator validation artifact file</span>
            <input
              aria-label="Evaluator validation artifact file"
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                void importEvaluatorValidationArtifactFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          {evaluatorValidationFileName ? <span>Selected file: {evaluatorValidationFileName}</span> : null}
          <label>
            <span>Evaluator validation artifact</span>
            <textarea
              aria-label="Evaluator validation artifact"
              value={evaluatorValidationArtifactInput}
              onChange={(event) => setEvaluatorValidationArtifactInput(event.target.value)}
              placeholder="Paste sanitized live-runtime validation summary JSON"
            />
          </label>
          <button className="secondary" onClick={importEvaluatorValidationArtifact}>
            Import evaluator validation
          </button>
          {evaluatorValidationImport ? (
            <div className={`proof-comparison ${evaluatorValidationImport.status}`}>
              <strong>Evaluator validation import</strong>
              <span>{evaluatorValidationImport.summary}</span>
              <span>
                Status: {evaluatorValidationImport.validation.status}; target:{" "}
                {evaluatorValidationImport.validation.targetPath ?? "unavailable"}
              </span>
              {evaluatorValidationImport.validation.descriptorHandoffRequiredAction ? (
                <span>{evaluatorValidationImport.validation.descriptorHandoffRequiredAction}</span>
              ) : null}
              {evaluatorValidationImport.validation.napoleonRequiredActions?.length ? (
                <span>
                  Napoleon required actions:{" "}
                  {evaluatorValidationImport.validation.napoleonRequiredActions.map((action) => action.id).join(", ")}
                </span>
              ) : null}
              <span>Sanitized local evidence only; not Napoleon approval.</span>
              {evaluatorValidationImport.validation.napoleonRequiredActions?.length ? (
                <button className="secondary" onClick={exportNapoleonRequiredActions}>
                  Export required action packet
                </button>
              ) : null}
            </div>
          ) : null}
          {napoleonRequiredActionsExportJson ? (
            <pre aria-label="Exported Napoleon required action packet">{napoleonRequiredActionsExportJson}</pre>
          ) : null}
        </div>
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
            <dt>Recommendation type</dt>
            <dd>{describeSteeringRecommendationType(steeringDraft)}</dd>
            <dt>Repair focus</dt>
            <dd>{describeSteeringRecommendationDisplayType(steeringDraft)}</dd>
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
            <dt>Learning signals</dt>
            <dd>
              {steeringDraft.evolutionProposal.learning_signals.length} metadata-only{" "}
              {steeringDraft.evolutionProposal.learning_signals[0]?.signal_type ?? "none"} signal
              {steeringDraft.evolutionProposal.learning_signals.length === 1 ? "" : "s"} from{" "}
              {steeringDraft.evolutionProposal.learning_signals[0]?.source ?? "none"}; raw user text:{" "}
              {steeringDraft.evolutionProposal.learning_signals.some(
                (signal) => signal.privacy.raw_user_text_stored,
              )
                ? "yes"
                : "no"}
              ; proposal only:{" "}
              {steeringDraft.evolutionProposal.learning_signals.every(
                (signal) => signal.governance_boundary.proposal_only,
              )
                ? "yes"
                : "no"}
            </dd>
            <dt>Handoff context</dt>
            <dd>
              {steeringDraft.handoffContext.status}: {steeringDraft.handoffContext.summary}{" "}
              Descriptor freshness: {steeringDraft.handoffContext.descriptorFreshnessState}.{" "}
              {steeringDraft.handoffContext.blockerLabel
                ? `${steeringDraft.handoffContext.blockerLabel}: ${steeringDraft.handoffContext.blockerDetail}. `
                : ""}
              {steeringDraft.handoffContext.nextStepSummary}
            </dd>
            <dt>Boundary</dt>
            <dd>
              proposal only; no approval captured; no memory write; no agent dispatch; no external send.
            </dd>
          </dl>
          <button className="secondary" onClick={exportSteeringDraft}>
            Export steering draft
          </button>
          {steeringDraftExportJson ? (
            <pre aria-label="Exported Chief of Staff steering draft">{steeringDraftExportJson}</pre>
          ) : null}
          <section className={`send-preflight ${steeringHandoffReadiness.status}`}>
            <div>
              <strong>{steeringHandoffReadiness.heading}</strong>
              <span>{steeringHandoffReadiness.summary}</span>
              <span>{steeringHandoffReadiness.nextStepSummary}</span>
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
          {steeringSubmission
            ? renderSteeringReviewResponse(steeringSubmission)
            : null}
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
              <span>{taxonomyHandoffReadiness.nextStepSummary}</span>
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
          {taxonomyReviewSubmission ? renderTaxonomyReviewResponse(taxonomyReviewSubmission) : null}
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
                {m.metadata.descriptorFailureReason ? (
                  <>
                    <dt>Descriptor failure</dt>
                    <dd>{m.metadata.descriptorFailureReason}</dd>
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
                {m.metadata.capabilityDrilldown ? (
                  <>
                    <dt>Capability evidence drilldown</dt>
                    <dd>
                      <span>Profile scope: {m.metadata.capabilityDrilldown.profileMode}</span>
                      {m.metadata.capabilityDrilldown.latestTurnEvidence ? (
                        <dl>
                          <dt>Latest Napoleon turn evidence</dt>
                          <dd>
                            {m.metadata.capabilityDrilldown.latestTurnEvidence.status}:{" "}
                            {m.metadata.capabilityDrilldown.latestTurnEvidence.summary} Next:{" "}
                            {m.metadata.capabilityDrilldown.latestTurnEvidence.nextStep}. Target capability:{" "}
                            {m.metadata.capabilityDrilldown.latestTurnEvidence.targetCapability ?? "not returned"}.
                            Governance: {m.metadata.capabilityDrilldown.latestTurnEvidence.governance ?? "not returned"}.
                            Failure reason:{" "}
                            {m.metadata.capabilityDrilldown.latestTurnEvidence.failureReason ?? "not returned"}. Blocked effects:{" "}
                            {m.metadata.capabilityDrilldown.latestTurnEvidence.blockedEffects.join(", ") || "none"}.
                            Attribution:{" "}
                            {m.metadata.capabilityDrilldown.latestTurnEvidence.attributionSource ?? "not returned"}.
                            Proof alignment:{" "}
                            {m.metadata.capabilityDrilldown.latestTurnEvidence.proofAlignment ?? "not returned"}.
                          </dd>
                        </dl>
                      ) : null}
                      <ol>
                        {m.metadata.capabilityDrilldown.rows.map((row) => (
                          <li key={`${row.label}:${row.status ?? "none"}:${row.architectureArea ?? "none"}`}>
                            <strong>{row.displayLabel ?? row.label}</strong>
                            <dl>
                              <dt>Count</dt>
                              <dd>{row.count}</dd>
                              {row.status ? (
                                <>
                                  <dt>Status</dt>
                                  <dd>{row.status}</dd>
                                </>
                              ) : null}
                              {row.architectureArea ? (
                                <>
                                  <dt>Area</dt>
                                  <dd>{row.architectureArea}</dd>
                                </>
                              ) : null}
                              {row.confidence !== undefined ? (
                                <>
                                  <dt>Confidence</dt>
                                  <dd>{row.confidence}</dd>
                                </>
                              ) : null}
                              {row.suggestedNextStep ? (
                                <>
                                  <dt>Next</dt>
                                  <dd>{row.suggestedNextStep}</dd>
                                </>
                              ) : null}
                              {row.score !== undefined ? (
                                <>
                                  <dt>Score</dt>
                                  <dd>{row.score}</dd>
                                </>
                              ) : null}
                              {row.scoreExplanation ? (
                                <>
                                  <dt>Why</dt>
                                  <dd>{row.scoreExplanation}</dd>
                                </>
                              ) : null}
                              {row.evidenceRefs.length ? (
                                <>
                                  <dt>Evidence</dt>
                                  <dd>{row.evidenceRefs.join(", ")}</dd>
                                </>
                              ) : null}
                            </dl>
                          </li>
                        ))}
                      </ol>
                      <span>proposal only; no approval captured; no memory write; no agent dispatch; no external send.</span>
                      <span>{m.metadata.capabilityDrilldown.privacyCaveat}</span>
                      <span>{m.metadata.capabilityDrilldown.authorityCaveat}</span>
                      {m.metadata.capabilityAnswer ? (
                        <>
                          <button
                            className="secondary"
                            onClick={() =>
                              setCapabilityAnswerDrilldownExportJson(
                                JSON.stringify(exportCapabilityAnswerDrilldown(m.metadata!.capabilityAnswer!), null, 2),
                              )
                            }
                          >
                            Export capability evidence drilldown
                          </button>
                          <button
                            className="secondary"
                            onClick={() => {
                              const packet = exportCapabilityReviewPacket(m.metadata!.capabilityAnswer!);
                              setCapabilityReviewPacket(packet);
                              setCapabilityReviewPacketExportJson(JSON.stringify(packet, null, 2));
                              setCapabilityReviewPacketSubmission(null);
                              setCapabilityReviewPacketFailure(null);
                              setNewAgentProposalPacket(null);
                              setNewAgentProposalPacketExportJson(null);
                              setNewAgentProposalSubmission(null);
                              setNewAgentProposalFailure(null);
                              setEvolutionProposalSubmissionPacket(null);
                              setEvolutionProposalSubmissionPacketExportJson(null);
                              setEvolutionProposalSubmission(null);
                              setEvolutionProposalSubmissionFailure(null);
                            }}
                          >
                            Export capability review packet
                          </button>
                        </>
                      ) : null}
                    </dd>
                  </>
                ) : null}
              </dl>
            ) : null}
          </article>
        ))}
      </section>

      {capabilityAnswerDrilldownExportJson ? (
        <pre aria-label="Exported capability evidence drilldown">{capabilityAnswerDrilldownExportJson}</pre>
      ) : null}

      {capabilityReviewPacketExportJson ? (
        <>
          <pre aria-label="Exported capability review packet">{capabilityReviewPacketExportJson}</pre>
          {capabilityReviewPacket ? (
            <section className="capability-review-packet-handoff">
              <section className={`send-preflight ${capabilityReviewPacketHandoffReadiness.status}`}>
                <div>
                  <strong>{capabilityReviewPacketHandoffReadiness.heading}</strong>
                  <span>{capabilityReviewPacketHandoffReadiness.summary}</span>
                  <span>{capabilityReviewPacketHandoffReadiness.nextStepSummary}</span>
                  <span>{capabilityReviewPacketHandoffReadiness.caveat}</span>
                </div>
                <dl>
                  {capabilityReviewPacketHandoffReadiness.items.map((item) => (
                    <div key={item.label}>
                      <dt>{item.label}</dt>
                      <dd>
                        {item.status}: {item.detail}
                      </dd>
                    </div>
                  ))}
                  <div>
                    <dt>Blocked effects</dt>
                    <dd>{capabilityReviewPacketHandoffReadiness.blockedEffects.join(", ")}</dd>
                  </div>
                </dl>
              </section>
              <button
                className="secondary"
                onClick={submitCapabilityReviewPacketExport}
                disabled={!capabilityReviewPacketHandoffReadiness.canSubmit}
              >
                Send capability review packet to Napoleon review
              </button>
              {capabilityReviewPacketFailure ? <p className="warning">{capabilityReviewPacketFailure}</p> : null}
              {capabilityReviewPacketSubmission
                ? renderCapabilityReviewPacketResponse(capabilityReviewPacketSubmission)
                : null}
              <button className="secondary" onClick={draftNewAgentProposalReviewPacket}>
                Draft new-agent proposal review packet
              </button>
              {newAgentProposalPacketExportJson ? (
                <>
                  <pre aria-label="Exported new-agent proposal review packet">{newAgentProposalPacketExportJson}</pre>
                  <section className="new-agent-proposal-handoff">
                    <section className={`send-preflight ${newAgentProposalHandoffReadiness.status}`}>
                      <div>
                        <strong>{newAgentProposalHandoffReadiness.heading}</strong>
                        <span>{newAgentProposalHandoffReadiness.summary}</span>
                        <span>{newAgentProposalHandoffReadiness.nextStepSummary}</span>
                        <span>{newAgentProposalHandoffReadiness.caveat}</span>
                      </div>
                      <dl>
                        {newAgentProposalHandoffReadiness.items.map((item) => (
                          <div key={item.label}>
                            <dt>{item.label}</dt>
                            <dd>
                              {item.status}: {item.detail}
                            </dd>
                          </div>
                        ))}
                        <div>
                          <dt>Blocked effects</dt>
                          <dd>{newAgentProposalHandoffReadiness.blockedEffects.join(", ")}</dd>
                        </div>
                      </dl>
                    </section>
                    <button
                      className="secondary"
                      onClick={submitNewAgentProposalReviewPacket}
                      disabled={!newAgentProposalHandoffReadiness.canSubmit}
                    >
                      Send new-agent proposal to Napoleon review
                    </button>
                    {newAgentProposalFailure ? <p className="warning">{newAgentProposalFailure}</p> : null}
                    {newAgentProposalSubmission
                      ? renderGovernedReviewResponse(
                          newAgentProposalSubmission,
                          "not activated; no registry update; no approval captured; no memory write; no agent dispatch; no external send.",
                        )
                      : null}
                  </section>
                </>
              ) : null}
              <button className="secondary" onClick={draftEvolutionProposalSubmissionPacket}>
                Draft evolution proposal submission packet
              </button>
              {evolutionProposalSubmissionPacketExportJson ? (
                <>
                  <pre aria-label="Exported evolution proposal submission packet">
                    {evolutionProposalSubmissionPacketExportJson}
                  </pre>
                  <section className="evolution-proposal-submission-handoff">
                    <section className={`send-preflight ${evolutionProposalSubmissionReadiness.status}`}>
                      <div>
                        <strong>{evolutionProposalSubmissionReadiness.heading}</strong>
                        <span>{evolutionProposalSubmissionReadiness.summary}</span>
                        <span>{evolutionProposalSubmissionReadiness.nextStepSummary}</span>
                        <span>{evolutionProposalSubmissionReadiness.caveat}</span>
                      </div>
                      <dl>
                        {evolutionProposalSubmissionReadiness.items.map((item) => (
                          <div key={item.label}>
                            <dt>{item.label}</dt>
                            <dd>
                              {item.status}: {item.detail}
                            </dd>
                          </div>
                        ))}
                        <div>
                          <dt>Blocked effects</dt>
                          <dd>{evolutionProposalSubmissionReadiness.blockedEffects.join(", ")}</dd>
                        </div>
                      </dl>
                    </section>
                    <button
                      className="secondary"
                      onClick={submitEvolutionProposalSubmissionPacket}
                      disabled={!evolutionProposalSubmissionReadiness.canSubmit}
                    >
                      Send evolution proposal to Napoleon intake
                    </button>
                    {evolutionProposalSubmissionFailure ? (
                      <p className="warning">{evolutionProposalSubmissionFailure}</p>
                    ) : null}
                    {evolutionProposalSubmission
                      ? renderGovernedReviewResponse(
                          evolutionProposalSubmission,
                          "not applied; no registry update; no approval captured; no memory write; no agent dispatch; no external send.",
                        )
                      : null}
                    {evolutionProposalLifecycleRecords.length ? (
                      <section className="evolution-proposal-lifecycle" aria-label="Evolution proposal lifecycle">
                        <div className="review-heading">
                          <strong>Evolution proposal lifecycle</strong>
                          <span>
                            Local metadata-only tracking; Napoleon remains the authority for approval, implementation,
                            rollout, and rollback.
                          </span>
                        </div>
                        <button className="secondary" onClick={exportEvolutionProposalLifecycle}>
                          Export evolution proposal lifecycle
                        </button>
                        {evolutionProposalStatusRefreshBlockedReason ? (
                          <p className="warning">{evolutionProposalStatusRefreshBlockedReason}</p>
                        ) : null}
                        {evolutionProposalStatusFailure ? (
                          <p className="warning">{evolutionProposalStatusFailure}</p>
                        ) : null}
                        <dl>
                          {evolutionProposalLifecycleRecords.slice(0, 3).map((record) => (
                            <div key={record.proposalId}>
                              <dt>{record.proposalId}</dt>
                              <dd>
                                {record.currentLifecycleState}: {record.latestKnownOutcome} Decision{" "}
                                {record.intakeDecisionId ?? "not returned"}; audit {record.intakeAuditId ?? "not returned"};
                                status refresh{" "}
                                {record.statusRefresh.available
                                  ? "available"
                                  : `unavailable (${record.statusRefresh.reason})`}
                                ; next step {record.nextRecommendedUserAction}; boundary proposal-only, no local
                                evolution, no registry update, no approval capture.
                                <button
                                  className="secondary"
                                  onClick={() => refreshEvolutionProposalLifecycleStatus(record)}
                                  disabled={!evolutionProposalStatusRefreshAvailable}
                                >
                                  Refresh status from Napoleon
                                </button>
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </section>
                    ) : null}
                    {evolutionProposalLifecycleExportJson ? (
                      <pre aria-label="Exported evolution proposal lifecycle">
                        {evolutionProposalLifecycleExportJson}
                      </pre>
                    ) : null}
                  </section>
                </>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}

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
              {napoleonProofComparison.reviewSummary ? (
                <dl>
                  <div>
                    <dt>Current handled by</dt>
                    <dd>{napoleonProofComparison.reviewSummary.handledBy}</dd>
                  </div>
                  <div>
                    <dt>Current governance</dt>
                    <dd>{napoleonProofComparison.reviewSummary.governance}</dd>
                  </div>
                  <div>
                    <dt>Current trace</dt>
                    <dd>{napoleonProofComparison.reviewSummary.trace}</dd>
                  </div>
                  <div>
                    <dt>Current blocked effects</dt>
                    <dd>{napoleonProofComparison.reviewSummary.blockedEffects}</dd>
                  </div>
                  <div>
                    <dt>Current boundary</dt>
                    <dd>{napoleonProofComparison.reviewSummary.boundary}</dd>
                  </div>
                  <div>
                    <dt>Current proof alignment</dt>
                    <dd>{napoleonProofComparison.reviewSummary.proofAlignment}</dd>
                  </div>
                </dl>
              ) : null}
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
              <span>{governanceReviewHandoffReadiness.nextStepSummary}</span>
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
          {governanceReviewSubmission
            ? renderGovernedReviewResponse(
                governanceReviewSubmission,
                "no approval captured; no memory write; no agent dispatch; no external send; no local application.",
              )
            : null}
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
              <span>{memoryHandoffReadiness.nextStepSummary}</span>
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
          {memorySubmission
            ? renderGovernedReviewResponse(
                memorySubmission,
                "no memory write; no approval captured; no agent dispatch; no external send.",
              )
            : null}
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
          </dl>
          <section className="review inline" aria-label="Rehearsal evaluator case candidate">
            <div className="review-heading">
              <strong>Draft evaluator case</strong>
              <span>
                {pendingRehearsal.preview.evaluatorCaseCandidate.scenarioType},{" "}
                {pendingRehearsal.preview.evaluatorCaseCandidate.sourceRequestId}
              </span>
            </div>
            <dl>
              <div>
                <dt>Intent summary</dt>
                <dd>{pendingRehearsal.preview.evaluatorCaseCandidate.intentSummary}</dd>
              </div>
              <div>
                <dt>Expected route</dt>
                <dd>{pendingRehearsal.preview.evaluatorCaseCandidate.expectedRoute.join(" -> ")}</dd>
              </div>
              <div>
                <dt>Expected governance</dt>
                <dd>{pendingRehearsal.preview.evaluatorCaseCandidate.expectedGovernanceOutcome}</dd>
              </div>
              <div>
                <dt>Profile mode</dt>
                <dd>{pendingRehearsal.preview.evaluatorCaseCandidate.profileMode}</dd>
              </div>
              <div>
                <dt>Allowed effects</dt>
                <dd>{pendingRehearsal.preview.evaluatorCaseCandidate.expectedAllowedEffects.join(", ")}</dd>
              </div>
              <div>
                <dt>Expected blocked effects</dt>
                <dd>{pendingRehearsal.preview.evaluatorCaseCandidate.expectedBlockedEffects.join(", ")}</dd>
              </div>
              <div>
                <dt>Evidence links</dt>
                <dd>{pendingRehearsal.preview.evaluatorCaseCandidate.evidenceLinks.join(", ")}</dd>
              </div>
              <div>
                <dt>Trace</dt>
                <dd>{pendingRehearsal.preview.evaluatorCaseCandidate.traceId}</dd>
              </div>
              <div>
                <dt>Boundary</dt>
                <dd>
                  {pendingRehearsal.preview.evaluatorCaseCandidate.draftOnly
                    ? "Draft only; not approved, dispatched, stored, or sent."
                    : "Unavailable"}
                </dd>
              </div>
            </dl>
          </section>
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
        <section className="contract-packet-exports" aria-label="Napoleon contract packet exports">
          <div>
            <strong>Napoleon contract packets</strong>
            <span>
              Prepare local-only packets for Napoleon request and governance targets. Exporting does not send,
              approve, route, dispatch, write memory, or apply anything.
            </span>
          </div>
          <dl>
            <div>
              <dt>{chiefOfStaffRequestHandoffReadiness.heading}</dt>
              <dd>
                {chiefOfStaffRequestHandoffReadiness.status}: {chiefOfStaffRequestHandoffReadiness.summary}{" "}
                {chiefOfStaffRequestHandoffReadiness.nextStepSummary}
              </dd>
            </div>
            <div>
              <dt>{governanceEvaluationHandoffReadiness.heading}</dt>
              <dd>
                {governanceEvaluationHandoffReadiness.status}: {governanceEvaluationHandoffReadiness.summary}{" "}
                {governanceEvaluationHandoffReadiness.nextStepSummary}
              </dd>
            </div>
            <div>
              <dt>Blocked effects</dt>
              <dd>
                {Array.from(
                  new Set([
                    ...chiefOfStaffRequestHandoffReadiness.blockedEffects,
                    ...governanceEvaluationHandoffReadiness.blockedEffects,
                  ]),
                ).join(", ")}
              </dd>
            </div>
          </dl>
          <div className="actions">
            <button className="secondary" onClick={exportChiefOfStaffRequestPacket} disabled={!currentContract}>
              Export Chief of Staff request packet
            </button>
            <button className="secondary" onClick={exportGovernanceEvaluationPacket} disabled={!currentContract}>
              Export governance evaluation packet
            </button>
            <button
              className="secondary"
              onClick={submitChiefOfStaffRequestPacketExport}
              disabled={!chiefOfStaffRequestPacket || !chiefOfStaffRequestHandoffReadiness.canSubmit}
            >
              Send Chief of Staff request packet to Napoleon
            </button>
            <button
              className="secondary"
              onClick={submitGovernanceEvaluationPacketExport}
              disabled={!governanceEvaluationPacket || !governanceEvaluationHandoffReadiness.canSubmit}
            >
              Send governance evaluation packet to Napoleon
            </button>
          </div>
          {chiefOfStaffRequestPacketExportJson ? (
            <pre aria-label="Exported Chief of Staff request packet">{chiefOfStaffRequestPacketExportJson}</pre>
          ) : null}
          {chiefOfStaffRequestPacketFailure ? <p className="warning">{chiefOfStaffRequestPacketFailure}</p> : null}
          {chiefOfStaffRequestPacketSubmission
            ? renderContractPacketSubmissionResponse(
                chiefOfStaffRequestPacketSubmission,
                "request handed off for Napoleon review only; no task routing, trace append, registry update, approval capture, memory write, agent dispatch, external send, or local application.",
              )
            : null}
          {governanceEvaluationPacketExportJson ? (
            <pre aria-label="Exported governance evaluation packet">{governanceEvaluationPacketExportJson}</pre>
          ) : null}
          {governanceEvaluationPacketFailure ? <p className="warning">{governanceEvaluationPacketFailure}</p> : null}
          {governanceEvaluationPacketSubmission
            ? renderContractPacketSubmissionResponse(
                governanceEvaluationPacketSubmission,
                "governance evaluation handed off as evidence only; no governance override, approval capture, memory write, agent dispatch, external send, registry update, trace append, routing, or local application.",
              )
            : null}
        </section>
        <section className={`latest-napoleon-turn ${latestNapoleonTurnSummary.status}`} aria-label="Latest Napoleon turn">
          <div>
            <strong>{latestNapoleonTurnSummary.heading}</strong>
            <span>{latestNapoleonTurnSummary.summary}</span>
            <span>{latestNapoleonTurnSummary.caveat}</span>
          </div>
          <dl>
            {latestNapoleonTurnSummary.details.map((detail) => (
              <div key={detail.label}>
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className={`napoleon-turn-timeline ${napoleonTurnTimeline.status}`} aria-label="Napoleon turn timeline">
          <div>
            <strong>{napoleonTurnTimeline.heading}</strong>
            <span>{napoleonTurnTimeline.summary}</span>
            <span>{napoleonTurnTimeline.caveat}</span>
          </div>
          <ol>
            {napoleonTurnTimeline.entries.map((entry) => (
              <li key={entry.label} className={entry.status}>
                <strong>{entry.label}</strong>
                <span>{entry.summary}</span>
                <dl>
                  {entry.details.map((detail) => (
                    <div key={detail.label}>
                      <dt>{detail.label}</dt>
                      <dd>{detail.value}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ol>
          <div className="turn-comparison">
            <strong>Turn comparison</strong>
            <dl>
              {napoleonTurnTimeline.comparison.map((detail) => (
                <div key={detail.label}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
        <div className={`send-preflight ${liveSendPreflight.status}`}>
          <div>
            <strong>{liveSendPreflight.heading}</strong>
            <span>{liveSendPreflight.summary}</span>
            <span>{liveSendPreflight.blockerSummary}</span>
            <span>{liveSendPreflight.nextStepSummary}</span>
            <span>{liveSendPreflight.caveat}</span>
          </div>
          <dl>
            {liveSendPreflight.items.map((item) => (
              <div key={item.label} className={item.status}>
                <dt>{item.label}</dt>
                <dd>
                  <span>{item.status}</span>
                  <span>: </span>
                  <span>{item.detail}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="composer-actions">
          <button disabled={!rehearsalMode && localGovernanceBlocksDirectSend} onClick={rehearsalMode ? rehearse : () => submit()}>
            {rehearsalMode ? "Rehearse" : "Send"}
          </button>
          {!rehearsalMode && directSendPreflightBlocker ? (
            <span className="warning">Direct send blocked by preflight: {directSendPreflightBlocker.detail}</span>
          ) : null}
          {pendingRehearsal ? (
            <>
              <button className="secondary" disabled={!canSendRehearsal} onClick={() => submit(pendingRehearsal)}>
                Send advisory request
              </button>
              {rehearsalSendBlockReason ? <span className="warning">{rehearsalSendBlockReason}</span> : null}
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
