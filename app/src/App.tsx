import { useState } from "react";
import { answerCapabilityQuestion } from "./capabilityLedger";
import {
  createCapabilityTaxonomy,
  getTaxonomyLabelCounts,
  markTaxonomyLabel,
  mergeTaxonomyLabels,
  renameTaxonomyLabel,
  resetCapabilityTaxonomy,
  type TaxonomyDimension,
} from "./capabilityTaxonomy";
import {
  draftChiefOfStaffSteering,
  submitChiefOfStaffSteeringDraft,
  type ChiefOfStaffSteeringSubmissionResult,
} from "./chiefOfStaffSteering";
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
} from "./contractBridge";
import { discoverNapoleonDescriptor } from "./descriptorDiscovery";
import { NapoleonBridgeError, sendToNapoleon } from "./napoleonBridge";
import {
  describeDelegation,
  describeGovernanceDecision,
  describeGovernanceReview,
  describeMemoryProposalReview,
  summarizeRehearsalPreview,
} from "./presentation";
import { emitEvent, newTraceId } from "./telemetry";
import { capabilityLedger } from "./telemetry";
import {
  CAPABILITY_LEDGER_MAX_AGE_DAYS,
  CAPABILITY_LEDGER_MAX_SIGNALS,
  clearPersistedCapabilityLedger,
  exportCapabilityLedgerJson,
  loadCapabilityTaxonomyFromStorage,
  persistCapabilityTaxonomyToStorage,
} from "./capabilityLedgerStorage";
import type { ConciergeMessage } from "./types";

const conversationId = `conv_${Date.now().toString(16)}`;

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
  const [lastDecision, setLastDecision] = useState<ReturnType<typeof describeGovernanceDecision> | null>(null);
  const [lastDelegation, setLastDelegation] = useState<ReturnType<typeof describeDelegation> | null>(null);
  const [lastBridgeFailure, setLastBridgeFailure] = useState<string | null>(null);
  const [lastReview, setLastReview] = useState<ReturnType<typeof describeGovernanceReview> | null>(null);
  const [lastMemoryReviewState, setLastMemoryReviewState] = useState<MemoryProposalReviewState | null>(null);
  const [lastMemoryReview, setLastMemoryReview] = useState<ReturnType<typeof describeMemoryProposalReview> | null>(null);
  const [capabilitySignalCount, setCapabilitySignalCount] = useState(() => capabilityLedger.listRecent().length);
  const [capabilityExportJson, setCapabilityExportJson] = useState<string | null>(null);
  const [steeringDraft, setSteeringDraft] = useState<ReturnType<typeof draftChiefOfStaffSteering> | null>(null);
  const [steeringSubmission, setSteeringSubmission] = useState<ChiefOfStaffSteeringSubmissionResult | null>(null);
  const [steeringFailure, setSteeringFailure] = useState<string | null>(null);
  const [capabilityTaxonomy, setCapabilityTaxonomy] = useState(() => loadCapabilityTaxonomyFromStorage(browserStorage()));
  const [selectedTaxonomyLabel, setSelectedTaxonomyLabel] = useState("");
  const [taxonomyRenameValue, setTaxonomyRenameValue] = useState("");
  const [taxonomyMergeTarget, setTaxonomyMergeTarget] = useState("");
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

  function updateEndpoint(value: string) {
    setEndpoint(value);
    if (typeof localStorage === "undefined") return;
    if (value.trim()) {
      localStorage.setItem("napoleon_endpoint", value.trim());
    } else {
      localStorage.removeItem("napoleon_endpoint");
    }
  }

  function updateAuthToken(value: string) {
    setAuthToken(value);
    if (typeof localStorage === "undefined") return;
    if (value.trim()) {
      localStorage.setItem("napoleon_auth_token", value.trim());
    } else {
      localStorage.removeItem("napoleon_auth_token");
    }
  }

  async function discoverDescriptor() {
    try {
      const result = await discoverNapoleonDescriptor({
        getEndpoint: () => endpoint.trim() || null,
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
      const failedInput = { endpointConfigured: Boolean(endpoint.trim()), descriptor: null };
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

  function updateProfile(value: LocalProfile) {
    setProfile(value);
    setPendingRehearsal(null);
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
      setLastDelegation(null);
      setLastBridgeFailure(null);
      setLastReview(null);
      setLastMemoryReviewState(null);
      setLastMemoryReview(null);
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
    setLastDelegation(null);
    setLastBridgeFailure(null);
    setLastReview(null);
    setLastMemoryReviewState(null);
    setLastMemoryReview(null);
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
        setLastDelegation(null);
        setLastBridgeFailure(null);
        setLastReview(null);
        setLastMemoryReviewState(null);
        setLastMemoryReview(null);
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
      setLastDelegation(null);
      setLastBridgeFailure(null);
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
        setLastDelegation(null);
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
      setLastDelegation(describeDelegation(response.delegation));
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
      } else {
        setLastMemoryReviewState(memoryReviewState);
        setLastMemoryReview(describeMemoryProposalReview(memoryReviewState));
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
      const failure = error instanceof NapoleonBridgeError
        ? `Live Napoleon bridge blocked: ${error.reason}. Request ${error.requestId}, trace ${error.traceId}. Concierge did not send externally, write memory, dispatch agents, or capture approval.`
        : "Napoleon bridge failed closed. Concierge did not send externally, write memory, dispatch agents, or capture approval.";
      setLastBridgeFailure(failure);
      setLastDelegation(null);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Napoleon bridge failed. Concierge did not execute anything and remains in prepare-only mode.",
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
      const message =
        error instanceof NapoleonBridgeError
          ? `Chief of Staff steering handoff blocked: ${error.reason}. Request ${error.requestId}, trace ${error.traceId}. Concierge did not apply changes, write memory, dispatch agents, send externally, or capture approval.`
          : "Chief of Staff steering handoff failed closed. Concierge did not apply changes, write memory, dispatch agents, send externally, or capture approval.";
      setSteeringFailure(message);
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
          <select value={descriptorMode} onChange={(e) => setDescriptorMode(e.target.value as typeof descriptorMode)}>
            <option value="discovered">Discovered local descriptor</option>
            <option value="live">Live discovered descriptor</option>
            <option value="missing">Missing descriptor</option>
            <option value="checksum_mismatch">Checksum/signature mismatch</option>
          </select>
        </label>
        <button className="secondary" onClick={discoverDescriptor}>
          Discover descriptor
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
        <span className="capture">Camera off, microphone off</span>
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
          <span>{descriptorMode === "live" ? descriptorDiscoveryMessage ?? "live descriptor selected" : "local simulation"}</span>
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
          <button
            className="secondary"
            onClick={submitSteeringDraft}
            disabled={!steeringDraft.sendState.canSendToNapoleon || !descriptorConnection.canAttemptLiveBridge}
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
        </div>
      </section>

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

      {lastDelegation ? (
        <section className="delegation">
          <div className="review-heading">
            <strong>{lastDelegation.heading}</strong>
            <span>{lastDelegation.body}</span>
          </div>
          {lastDelegation.details.length ? (
            <dl>
              {lastDelegation.details.map((detail) => (
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
          </div>
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
