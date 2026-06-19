import { resolveNapoleonBridgeOperation } from "./bridgeEndpoint.js";
import { hasRequiredBridgeResponseFields } from "./bridgeResponseRequirements.js";
import { hasForbiddenSideEffectTextClaim } from "./bridgeSideEffectClaims.js";
import type { CapabilityArchitectureArea, ConversationCapabilitySignal, RecommendationBoundary } from "./capabilityLedger.js";
import { readConfiguredAuthTokenFromStorage, readConfiguredEndpointFromStorage } from "./connectionStorage.js";
import {
  buildDescriptorConnectionState,
  mapProfileToNapoleonMode,
  type AuditEnvelope,
  type ChiefOfStaffRequest,
  type DescriptorConnectionInput,
  type DescriptorFailClosedReason,
  type GovernanceDecision,
  type GovernanceEvaluationRequest,
  type LocalProfile,
  type TraceEnvelope,
} from "./contractBridge.js";
import { NapoleonBridgeError, descriptorFailClosedReasonToBridgeFailure } from "./napoleonBridge.js";
import { emitEvent, makeTelemetryPayload, type TelemetryPayload } from "./telemetry.js";

export type TaxonomyDimension = "topic" | "intent" | "capability" | "architecture";
export type TaxonomyMarker = "deprecated" | "splitCandidate";

export interface TaxonomyEntry {
  dimension: TaxonomyDimension;
  sourceLabel: string;
  displayLabel?: string;
  mergedInto?: string;
  deprecated?: boolean;
  splitCandidate?: boolean;
}

export interface CapabilityTaxonomy {
  entries: TaxonomyEntry[];
}

export interface SerializedCapabilityTaxonomy {
  schemaVersion: "concierge.capability-taxonomy.v1";
  generatedAt: string;
  privacyCaveat: string;
  entries: TaxonomyEntry[];
}

export interface TaxonomyLabelCount {
  dimension: TaxonomyDimension;
  label: string;
  count: number;
  deprecated: boolean;
  splitCandidate: boolean;
}

export type TaxonomyReviewAction = "merge" | "split" | "deprecate";

export interface ChiefOfStaffTaxonomyRecommendation {
  action: TaxonomyReviewAction;
  dimension: TaxonomyDimension;
  sourceLabel: string;
  targetLabel?: string;
  evidenceCount: number;
  evidenceRefs: string[];
  reason: string;
}

export interface ChiefOfStaffTaxonomyReviewDraft {
  reviewType: "chief_of_staff_taxonomy_review";
  conversationId: string;
  traceId: string;
  recommendations: ChiefOfStaffTaxonomyRecommendation[];
  evaluatorCaseCandidate: {
    caseId: string;
    expectedBehavior: string;
  };
  evolutionProposal: {
    proposal_id: string;
    summary: string;
    risk_level: "low" | "medium" | "high";
    evidence: string[];
    change: {
      capability: "capability_taxonomy_review";
      architecture_area: "observability";
      requested_action: "review_taxonomy_cleanup";
      recommendation_count: number;
    };
    affected_profiles: string[];
    affected_channels: string[];
    evaluator_cases: string[];
    approval_required: string;
    rollback_plan: string;
  };
  boundary: RecommendationBoundary;
}

type TaxonomyReviewFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}>;

export interface TaxonomyReviewSubmissionDependencies {
  conversationId: string;
  traceId: string;
  profile?: LocalProfile;
  rehearsalMode?: boolean;
  getEndpoint?: () => string | null;
  getAuthToken?: () => string | null;
  descriptorConnection?: DescriptorConnectionInput;
  emit?: (payload: TelemetryPayload) => void;
  fetch?: TaxonomyReviewFetch;
}

export interface ChiefOfStaffTaxonomyReviewSubmissionResult {
  text: string;
  governanceDecision: GovernanceDecision;
  traceEnvelope: TraceEnvelope;
  auditEnvelope: AuditEnvelope;
  appliedLocally: false;
  memoryWritePerformed: false;
  approvalCaptured: false;
  agentDispatchPerformed: false;
  externalSendPerformed: false;
}

const TAXONOMY_SCHEMA_VERSION = "concierge.capability-taxonomy.v1" as const;
const TAXONOMY_PRIVACY_CAVEAT =
  "Local metadata-only taxonomy edits. Renames, merges, deprecated markers, and split-candidate markers are local hints only and do not change Napoleon policy, routing, memory, approval, dispatch, or external sends.";
const TAXONOMY_REVIEW_BOUNDARY: RecommendationBoundary = {
  proposalOnly: true,
  approvalCaptured: false,
  memoryWriteAllowed: false,
  agentDispatchAllowed: false,
  externalSendAllowed: false,
};
const TAXONOMY_REVIEW_BLOCKED_EFFECTS = [
  "memory_write",
  "agent_dispatch",
  "external_send",
  "approval_capture",
  "runtime_authority",
];

export function createCapabilityTaxonomy(entries: TaxonomyEntry[] = []): CapabilityTaxonomy {
  return { entries: entries.map((entry) => ({ ...entry })) };
}

function cleanLabel(label: string): string {
  return label.trim().replace(/\s+/g, "_");
}

function findEntry(taxonomy: CapabilityTaxonomy, dimension: TaxonomyDimension, sourceLabel: string): TaxonomyEntry | undefined {
  return taxonomy.entries.find((entry) => entry.dimension === dimension && entry.sourceLabel === sourceLabel);
}

function ensureEntry(taxonomy: CapabilityTaxonomy, dimension: TaxonomyDimension, sourceLabel: string): TaxonomyEntry {
  const cleaned = cleanLabel(sourceLabel);
  const existing = findEntry(taxonomy, dimension, cleaned);
  if (existing) return existing;
  const entry: TaxonomyEntry = { dimension, sourceLabel: cleaned };
  taxonomy.entries.push(entry);
  return entry;
}

export function renameTaxonomyLabel(
  taxonomy: CapabilityTaxonomy,
  dimension: TaxonomyDimension,
  sourceLabel: string,
  displayLabel: string,
) {
  ensureEntry(taxonomy, dimension, sourceLabel).displayLabel = cleanLabel(displayLabel);
}

export function mergeTaxonomyLabels(
  taxonomy: CapabilityTaxonomy,
  dimension: TaxonomyDimension,
  sourceLabel: string,
  targetLabel: string,
) {
  ensureEntry(taxonomy, dimension, sourceLabel).mergedInto = cleanLabel(targetLabel);
}

export function markTaxonomyLabel(
  taxonomy: CapabilityTaxonomy,
  dimension: TaxonomyDimension,
  sourceLabel: string,
  marker: TaxonomyMarker,
  value: boolean,
) {
  ensureEntry(taxonomy, dimension, sourceLabel)[marker] = value;
}

export function resetCapabilityTaxonomy(taxonomy: CapabilityTaxonomy) {
  taxonomy.entries.length = 0;
}

function resolveSourceLabel(
  taxonomy: CapabilityTaxonomy,
  dimension: TaxonomyDimension,
  sourceLabel: string,
  seen = new Set<string>(),
): string {
  const cleaned = cleanLabel(sourceLabel);
  if (seen.has(cleaned)) return cleaned;
  seen.add(cleaned);
  const entry = findEntry(taxonomy, dimension, cleaned);
  if (!entry?.mergedInto) return cleaned;
  return resolveSourceLabel(taxonomy, dimension, entry.mergedInto, seen);
}

export function resolveTaxonomyLabel(
  taxonomy: CapabilityTaxonomy,
  dimension: TaxonomyDimension,
  sourceLabel: string,
): string {
  const resolvedSource = resolveSourceLabel(taxonomy, dimension, sourceLabel);
  const entry = findEntry(taxonomy, dimension, resolvedSource);
  return entry?.displayLabel ?? resolvedSource;
}

export function taxonomyMarkersForLabel(
  taxonomy: CapabilityTaxonomy,
  dimension: TaxonomyDimension,
  sourceLabel: string,
): { deprecated: boolean; splitCandidate: boolean } {
  const resolvedSource = resolveSourceLabel(taxonomy, dimension, sourceLabel);
  const entries = taxonomy.entries.filter(
    (entry) =>
      entry.dimension === dimension &&
      (entry.sourceLabel === sourceLabel || entry.sourceLabel === resolvedSource || entry.mergedInto === resolvedSource),
  );
  return {
    deprecated: entries.some((entry) => entry.deprecated === true),
    splitCandidate: entries.some((entry) => entry.splitCandidate === true),
  };
}

export function applyTaxonomyToSignal(
  signal: ConversationCapabilitySignal,
  taxonomy: CapabilityTaxonomy,
): ConversationCapabilitySignal {
  return {
    ...signal,
    topicLabel: resolveTaxonomyLabel(taxonomy, "topic", signal.topicLabel),
    intentLabel: resolveTaxonomyLabel(taxonomy, "intent", signal.intentLabel),
    capabilityLabel: resolveTaxonomyLabel(taxonomy, "capability", signal.capabilityLabel),
    architectureArea: resolveTaxonomyLabel(
      taxonomy,
      "architecture",
      signal.architectureArea,
    ) as CapabilityArchitectureArea,
  };
}

export function applyTaxonomyToSignals(
  signals: ConversationCapabilitySignal[],
  taxonomy?: CapabilityTaxonomy,
): ConversationCapabilitySignal[] {
  if (!taxonomy) return signals;
  return signals.map((signal) => applyTaxonomyToSignal(signal, taxonomy));
}

export function getTaxonomyLabelCounts(
  signals: ConversationCapabilitySignal[],
  taxonomy: CapabilityTaxonomy = createCapabilityTaxonomy(),
): Record<TaxonomyDimension, TaxonomyLabelCount[]> {
  const buckets: Record<TaxonomyDimension, Record<string, TaxonomyLabelCount>> = {
    topic: {},
    intent: {},
    capability: {},
    architecture: {},
  };

  for (const signal of signals) {
    const values: Record<TaxonomyDimension, string> = {
      topic: signal.topicLabel,
      intent: signal.intentLabel,
      capability: signal.capabilityLabel,
      architecture: signal.architectureArea,
    };
    for (const dimension of Object.keys(values) as TaxonomyDimension[]) {
      const label = resolveTaxonomyLabel(taxonomy, dimension, values[dimension]);
      const markers = taxonomyMarkersForLabel(taxonomy, dimension, values[dimension]);
      const row = buckets[dimension][label] ?? {
        dimension,
        label,
        count: 0,
        deprecated: false,
        splitCandidate: false,
      };
      row.count += 1;
      row.deprecated = row.deprecated || markers.deprecated;
      row.splitCandidate = row.splitCandidate || markers.splitCandidate;
      buckets[dimension][label] = row;
    }
  }

  return {
    topic: sortedCounts(buckets.topic),
    intent: sortedCounts(buckets.intent),
    capability: sortedCounts(buckets.capability),
    architecture: sortedCounts(buckets.architecture),
  };
}

function sortedCounts(bucket: Record<string, TaxonomyLabelCount>): TaxonomyLabelCount[] {
  return Object.values(bucket).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function valuesForDimension(signal: ConversationCapabilitySignal, dimension: TaxonomyDimension): string {
  if (dimension === "topic") return signal.topicLabel;
  if (dimension === "intent") return signal.intentLabel;
  if (dimension === "capability") return signal.capabilityLabel;
  return signal.architectureArea;
}

function taxonomyStem(label: string): string {
  return cleanLabel(label)
    .toLowerCase()
    .replace(/_+/g, "")
    .replace(/(ation|ment|ing|ed|s)$/g, "");
}

function evidenceRefsForLabel(
  signals: ConversationCapabilitySignal[],
  dimension: TaxonomyDimension,
  label: string,
): string[] {
  return signals
    .filter((signal) => valuesForDimension(signal, dimension) === label)
    .flatMap((signal) => signal.evidenceRefs)
    .slice(0, 8);
}

function groupedRawLabels(
  signals: ConversationCapabilitySignal[],
  dimension: TaxonomyDimension,
): Record<string, TaxonomyLabelCount> {
  const grouped: Record<string, TaxonomyLabelCount> = {};
  for (const signal of signals) {
    const label = valuesForDimension(signal, dimension);
    const row = grouped[label] ?? {
      dimension,
      label,
      count: 0,
      deprecated: false,
      splitCandidate: false,
    };
    row.count += 1;
    grouped[label] = row;
  }
  return grouped;
}

function preferredMergeTarget(labels: TaxonomyLabelCount[]): TaxonomyLabelCount {
  return [...labels].sort((a, b) => b.label.length - a.label.length || b.count - a.count || a.label.localeCompare(b.label))[0];
}

function mergeRecommendations(
  signals: ConversationCapabilitySignal[],
  dimension: TaxonomyDimension,
): ChiefOfStaffTaxonomyRecommendation[] {
  const byStem: Record<string, TaxonomyLabelCount[]> = {};
  for (const row of Object.values(groupedRawLabels(signals, dimension))) {
    const stem = taxonomyStem(row.label);
    if (stem.length < 4) continue;
    byStem[stem] = [...(byStem[stem] ?? []), row];
  }

  return Object.values(byStem).flatMap((labels) => {
    if (labels.length < 2) return [];
    const target = preferredMergeTarget(labels);
    return labels
      .filter((label) => label.label !== target.label)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .map((label) => ({
        action: "merge" as const,
        dimension,
        sourceLabel: label.label,
        targetLabel: target.label,
        evidenceCount: label.count + target.count,
        evidenceRefs: [...evidenceRefsForLabel(signals, dimension, label.label), ...evidenceRefsForLabel(signals, dimension, target.label)]
          .slice(0, 8),
        reason: `Labels "${label.label}" and "${target.label}" look like variants and should be reviewed before any local merge.`,
      }));
  });
}

function splitRecommendations(signals: ConversationCapabilitySignal[]): ChiefOfStaffTaxonomyRecommendation[] {
  const topicCapabilities: Record<string, Set<string>> = {};
  const topicCounts = groupedRawLabels(signals, "topic");
  for (const signal of signals) {
    topicCapabilities[signal.topicLabel] = topicCapabilities[signal.topicLabel] ?? new Set<string>();
    topicCapabilities[signal.topicLabel].add(signal.capabilityLabel);
  }

  return Object.entries(topicCapabilities)
    .filter(([, capabilities]) => capabilities.size > 1)
    .map(([label, capabilities]) => ({
      action: "split" as const,
      dimension: "topic" as const,
      sourceLabel: label,
      evidenceCount: topicCounts[label]?.count ?? 0,
      evidenceRefs: evidenceRefsForLabel(signals, "topic", label),
      reason: `Topic "${label}" spans ${capabilities.size} capability labels and may need split review.`,
    }))
    .sort((a, b) => b.evidenceCount - a.evidenceCount || a.sourceLabel.localeCompare(b.sourceLabel));
}

function deprecationRecommendations(
  signals: ConversationCapabilitySignal[],
  taxonomy: CapabilityTaxonomy,
): ChiefOfStaffTaxonomyRecommendation[] {
  return taxonomy.entries
    .filter((entry) => entry.deprecated === true)
    .map((entry) => ({
      action: "deprecate" as const,
      dimension: entry.dimension,
      sourceLabel: entry.sourceLabel,
      evidenceCount: signals.filter((signal) => valuesForDimension(signal, entry.dimension) === entry.sourceLabel).length,
      evidenceRefs: evidenceRefsForLabel(signals, entry.dimension, entry.sourceLabel),
      reason: `Label "${entry.sourceLabel}" is locally marked deprecated; Chief of Staff review can decide whether to keep, rename, or merge it.`,
    }))
    .sort((a, b) => b.evidenceCount - a.evidenceCount || a.sourceLabel.localeCompare(b.sourceLabel));
}

function uniqueEvidenceRefs(recommendations: ChiefOfStaffTaxonomyRecommendation[]): string[] {
  return Array.from(new Set(recommendations.flatMap((recommendation) => recommendation.evidenceRefs))).slice(0, 12);
}

export function draftChiefOfStaffTaxonomyReview(
  signals: ConversationCapabilitySignal[],
  taxonomy: CapabilityTaxonomy = createCapabilityTaxonomy(),
  options: { conversationId: string; traceId: string; profile?: LocalProfile },
): ChiefOfStaffTaxonomyReviewDraft {
  const profileMode = mapProfileToNapoleonMode(options.profile ?? "adult_owner");
  const isChildProtected = profileMode === "child_protected_user";
  const approvalRequired = isChildProtected
    ? "guardian_and_owner_review_required_before_child_protected_taxonomy_change"
    : "Napoleon Chief of Staff and owner review before taxonomy cleanup is applied or rolled into policy.";
  const dimensions: TaxonomyDimension[] = ["topic", "intent", "capability", "architecture"];
  const recommendations = [
    ...dimensions.flatMap((dimension) => mergeRecommendations(signals, dimension)),
    ...splitRecommendations(signals),
    ...deprecationRecommendations(signals, taxonomy),
  ].slice(0, 10);
  const evaluatorCaseCandidate = {
    caseId: "capability_taxonomy_review_001",
    expectedBehavior:
      "Concierge drafts taxonomy cleanup as proposal-only local metadata; it does not apply edits, capture approval, write memory, dispatch agents, send externally, or change Napoleon routing.",
  };

  return {
    reviewType: "chief_of_staff_taxonomy_review",
    conversationId: options.conversationId,
    traceId: options.traceId,
    recommendations,
    evaluatorCaseCandidate,
    evolutionProposal: {
      proposal_id: `evo_capability_taxonomy_review_${options.traceId}`,
      summary: `Review ${recommendations.length} local capability taxonomy cleanup recommendation(s) without applying edits.`,
      risk_level: "low",
      evidence: uniqueEvidenceRefs(recommendations),
      change: {
        capability: "capability_taxonomy_review",
        architecture_area: "observability",
        requested_action: "review_taxonomy_cleanup",
        recommendation_count: recommendations.length,
      },
      affected_profiles: isChildProtected ? ["child_protected_user"] : ["adult_owner"],
      affected_channels: ["text"],
      evaluator_cases: [evaluatorCaseCandidate.caseId],
      approval_required: approvalRequired,
      rollback_plan: "Keep current local taxonomy labels and discard the proposed cleanup recommendations.",
    },
    boundary: TAXONOMY_REVIEW_BOUNDARY,
  };
}

export function serializeCapabilityTaxonomy(
  taxonomy: CapabilityTaxonomy,
  options: { generatedAt?: string } = {},
): SerializedCapabilityTaxonomy {
  return {
    schemaVersion: TAXONOMY_SCHEMA_VERSION,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    privacyCaveat: TAXONOMY_PRIVACY_CAVEAT,
    entries: taxonomy.entries.map((entry) => ({ ...entry })),
  };
}

function sanitizeEntry(value: unknown): TaxonomyEntry | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (!["topic", "intent", "capability", "architecture"].includes(String(candidate.dimension))) return null;
  if (typeof candidate.sourceLabel !== "string" || !candidate.sourceLabel.trim()) return null;
  const entry: TaxonomyEntry = {
    dimension: candidate.dimension as TaxonomyDimension,
    sourceLabel: cleanLabel(candidate.sourceLabel),
  };
  if (typeof candidate.displayLabel === "string" && candidate.displayLabel.trim()) {
    entry.displayLabel = cleanLabel(candidate.displayLabel);
  }
  if (typeof candidate.mergedInto === "string" && candidate.mergedInto.trim()) {
    entry.mergedInto = cleanLabel(candidate.mergedInto);
  }
  if (typeof candidate.deprecated === "boolean") entry.deprecated = candidate.deprecated;
  if (typeof candidate.splitCandidate === "boolean") entry.splitCandidate = candidate.splitCandidate;
  return entry;
}

export function deserializeCapabilityTaxonomy(snapshot: unknown): CapabilityTaxonomy {
  if (!snapshot || typeof snapshot !== "object") return createCapabilityTaxonomy();
  const candidate = snapshot as Record<string, unknown>;
  if (candidate.schemaVersion !== TAXONOMY_SCHEMA_VERSION || !Array.isArray(candidate.entries)) {
    return createCapabilityTaxonomy();
  }
  return createCapabilityTaxonomy(candidate.entries.map(sanitizeEntry).filter((entry) => entry !== null));
}

function emitTaxonomyReviewEvent(
  dependencies: TaxonomyReviewSubmissionDependencies,
  event: string,
  attributes: Record<string, unknown>,
) {
  if (dependencies.emit) {
    dependencies.emit(makeTelemetryPayload(event, attributes));
    return;
  }
  emitEvent(event, attributes);
}

function getConfiguredEndpoint(dependencies: TaxonomyReviewSubmissionDependencies): string | null {
  if (dependencies.getEndpoint) return dependencies.getEndpoint();
  return readConfiguredEndpointFromStorage();
}

function getConfiguredAuthToken(dependencies: TaxonomyReviewSubmissionDependencies): string | null {
  if (dependencies.getAuthToken) return dependencies.getAuthToken();
  if (dependencies.getEndpoint) return null;
  return readConfiguredAuthTokenFromStorage();
}

function buildTaxonomyReviewHeaders(authToken: string | null): Record<string, string> {
  return authToken
    ? { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }
    : { "Content-Type": "application/json" };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isGovernanceDecision(value: unknown): value is GovernanceDecision {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GovernanceDecision>;
  return Boolean(
    typeof candidate.decision_id === "string" &&
      typeof candidate.request_id === "string" &&
      typeof candidate.outcome === "string" &&
      typeof candidate.authority_tier === "string" &&
      typeof candidate.approval_requirement === "string" &&
      typeof candidate.rationale === "string" &&
      isStringArray(candidate.blocked_effects) &&
      typeof candidate.trace_id === "string" &&
      typeof candidate.audit_id === "string",
  );
}

function isTraceEnvelope(value: unknown): value is TraceEnvelope {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<TraceEnvelope>;
  return Boolean(
    typeof candidate.trace_id === "string" &&
      typeof candidate.parent_trace_id === "string" &&
      typeof candidate.actor_id === "string" &&
      typeof candidate.request_id === "string" &&
      typeof candidate.decision_id === "string" &&
      typeof candidate.timestamp === "string",
  );
}

function isAuditEnvelope(value: unknown): value is AuditEnvelope {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AuditEnvelope>;
  return Boolean(
    typeof candidate.audit_id === "string" &&
      typeof candidate.trace_id === "string" &&
      typeof candidate.decision_id === "string" &&
      typeof candidate.actor_id === "string" &&
      typeof candidate.authority_tier === "string" &&
      typeof candidate.approval_requirement === "string" &&
      isStringArray(candidate.evidence_links),
  );
}

function envelopesMatchDecision(
  decision: GovernanceDecision,
  traceEnvelope: TraceEnvelope,
  auditEnvelope: AuditEnvelope,
): boolean {
  return (
    traceEnvelope.trace_id === decision.trace_id &&
    traceEnvelope.request_id === decision.request_id &&
    traceEnvelope.decision_id === decision.decision_id &&
    auditEnvelope.audit_id === decision.audit_id &&
    auditEnvelope.trace_id === decision.trace_id &&
    auditEnvelope.decision_id === decision.decision_id &&
    auditEnvelope.authority_tier === decision.authority_tier &&
    auditEnvelope.approval_requirement === decision.approval_requirement
  );
}

function hasForbiddenTaxonomyReviewSideEffectClaim(
  payload: Partial<ChiefOfStaffTaxonomyReviewSubmissionResult> & Record<string, unknown>,
): boolean {
  const requiredFalseFields = [
    "appliedLocally",
    "memoryWritePerformed",
    "approvalCaptured",
    "externalSendPerformed",
    "agentDispatchPerformed",
  ];
  return requiredFalseFields.some((field) => payload[field] !== false) || hasForbiddenSideEffectTextClaim(payload.text);
}

function failTaxonomyReviewClosed(
  dependencies: TaxonomyReviewSubmissionDependencies,
  reason: ConstructorParameters<typeof NapoleonBridgeError>[0],
  requestId: string,
  profileMode?: string,
  status?: number,
  blockedEffects: string[] = TAXONOMY_REVIEW_BLOCKED_EFFECTS,
  descriptorFailureReason?: DescriptorFailClosedReason,
  governanceReferences?: { decisionId?: string; auditId?: string; governanceOutcome?: string },
): never {
  const attributes: Record<string, unknown> = {
    traceId: dependencies.traceId,
    conversationId: dependencies.conversationId,
    requestId,
    profileMode,
    reason,
    status,
    blockedEffects,
  };
  if (descriptorFailureReason) attributes.descriptorFailureReason = descriptorFailureReason;
  if (governanceReferences?.decisionId) attributes.decisionId = governanceReferences.decisionId;
  if (governanceReferences?.auditId) attributes.auditId = governanceReferences.auditId;
  if (governanceReferences?.governanceOutcome) attributes.governanceOutcome = governanceReferences.governanceOutcome;
  emitTaxonomyReviewEvent(dependencies, "capability_taxonomy_review_send_failed", attributes);
  throw new NapoleonBridgeError(reason, dependencies.traceId, requestId, status, blockedEffects, {
    profileMode,
    descriptorFailureReason,
    decisionId: governanceReferences?.decisionId,
    auditId: governanceReferences?.auditId,
    governanceOutcome: governanceReferences?.governanceOutcome,
  });
}

export async function submitChiefOfStaffTaxonomyReviewDraft(
  draft: ChiefOfStaffTaxonomyReviewDraft,
  dependencies: TaxonomyReviewSubmissionDependencies,
): Promise<ChiefOfStaffTaxonomyReviewSubmissionResult> {
  const profileMode = mapProfileToNapoleonMode(dependencies.profile ?? "adult_owner");
  const draftProfileModes = new Set(draft.evolutionProposal.affected_profiles);
  const isChildProtected = profileMode === "child_protected_user";
  const approvalRequirement = isChildProtected
    ? "guardian_and_owner_review_required_before_child_protected_taxonomy_change"
    : draft.evolutionProposal.approval_required;
  const evolutionProposal = isChildProtected
    ? {
        ...draft.evolutionProposal,
        affected_profiles: ["child_protected_user"],
        approval_required: approvalRequirement,
      }
    : draft.evolutionProposal;
  const taxonomyReview = isChildProtected
    ? {
        ...draft,
        evolutionProposal,
      }
    : draft;
  const recommendation = {
    capability: "capability_taxonomy_review",
    summary: evolutionProposal.summary,
    evidenceCount: evolutionProposal.evidence.length,
    confidence: draft.recommendations.length > 0 ? 0.8 : 0.4,
    proposalOnly: true,
    ...(isChildProtected ? { childSafetyCaution: true as const } : {}),
  };
  const requestId = `cos_${dependencies.traceId}`;
  const localDecisionId = `local_taxonomy_review_${dependencies.traceId}`;
  const localAuditId = `local_audit_${dependencies.traceId}`;
  const endpoint = getConfiguredEndpoint(dependencies);
  const authToken = getConfiguredAuthToken(dependencies);
  const descriptorConnection = buildDescriptorConnectionState(
    dependencies.descriptorConnection ?? {
      endpointConfigured: Boolean(endpoint),
      descriptor: null,
    },
  );

  if (!draftProfileModes.has(profileMode)) {
    failTaxonomyReviewClosed(dependencies, "governance_no_go", requestId, profileMode);
  }
  if (dependencies.rehearsalMode) {
    failTaxonomyReviewClosed(dependencies, "governance_no_go", requestId, profileMode);
  }
  if (!endpoint) {
    failTaxonomyReviewClosed(dependencies, "no_endpoint", requestId, profileMode);
  }
  if (!descriptorConnection.canAttemptLiveBridge) {
    failTaxonomyReviewClosed(
      dependencies,
      descriptorFailClosedReasonToBridgeFailure(descriptorConnection.failClosedReason),
      requestId,
      profileMode,
      undefined,
      TAXONOMY_REVIEW_BLOCKED_EFFECTS,
      descriptorConnection.failClosedReason,
    );
  }

  const chiefOfStaffRequest: ChiefOfStaffRequest = {
    request_id: requestId,
    requester: "concierge.capability_intelligence",
    request_type: "evolution_proposal_review",
    profile_mode: profileMode,
    source_evidence: evolutionProposal.evidence,
    requested_authority_tier: "advisory_review",
    trace_id: dependencies.traceId,
    payload_schema: "schemas/evolution_proposal.schema.json",
  };
  const governanceRequest: GovernanceEvaluationRequest = {
    request_id: `gov_${dependencies.traceId}`,
    actor_id: "concierge.capability_intelligence",
    action: isChildProtected ? "submit_child_taxonomy_review_for_review" : "submit_taxonomy_review_for_review",
    target: "napoleon.chief_of_staff",
    requested_authority_tier: "advisory_review",
    evidence_links: evolutionProposal.evidence,
    trace_id: dependencies.traceId,
  };
  const traceEnvelope: TraceEnvelope = {
    trace_id: dependencies.traceId,
    parent_trace_id: dependencies.conversationId,
    actor_id: "concierge.capability_intelligence",
    request_id: requestId,
    decision_id: localDecisionId,
    timestamp: new Date().toISOString(),
  };
  const auditEnvelope: AuditEnvelope = {
    audit_id: localAuditId,
    trace_id: dependencies.traceId,
    decision_id: localDecisionId,
    actor_id: "concierge.capability_intelligence",
    authority_tier: "advisory_review",
    approval_requirement: approvalRequirement,
    evidence_links: evolutionProposal.evidence,
  };

  emitTaxonomyReviewEvent(dependencies, "capability_taxonomy_review_send_started", {
    traceId: dependencies.traceId,
    conversationId: dependencies.conversationId,
    requestId,
    proposalId: evolutionProposal.proposal_id,
    recommendationCount: draft.recommendations.length,
    profileMode,
  });

  const fetcher = dependencies.fetch ?? globalThis.fetch.bind(globalThis);
  let response: Awaited<ReturnType<TaxonomyReviewFetch>>;
  try {
    response = await fetcher(resolveNapoleonBridgeOperation(endpoint, "chief_of_staff_steering"), {
      method: "POST",
      headers: buildTaxonomyReviewHeaders(authToken),
      body: JSON.stringify({
        requestKind: "chief_of_staff_steering_handoff",
        profileMode,
        descriptorStatus: descriptorConnection.descriptorStatus,
        descriptorConnection,
        chiefOfStaffRequest,
        governanceRequest,
        traceEnvelope,
        auditEnvelope,
        recommendation,
        taxonomyReview,
        evaluatorCaseCandidate: draft.evaluatorCaseCandidate,
        evolutionProposal,
        boundary: draft.boundary,
        blockedEffects: TAXONOMY_REVIEW_BLOCKED_EFFECTS,
      }),
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError" ? "bridge_timeout" : "http_failure";
    failTaxonomyReviewClosed(dependencies, reason, requestId, profileMode);
  }

  if (!response.ok) {
    const reason = response.status === 401 || response.status === 403 ? "auth_failure" : "http_failure";
    failTaxonomyReviewClosed(dependencies, reason, requestId, profileMode, response.status);
  }

  let payload: Partial<ChiefOfStaffTaxonomyReviewSubmissionResult>;
  try {
    payload = (await response.json()) as Partial<ChiefOfStaffTaxonomyReviewSubmissionResult>;
  } catch {
    failTaxonomyReviewClosed(dependencies, "contract_mismatch", requestId, profileMode);
  }
  if (
    !hasRequiredBridgeResponseFields(payload, "chief_of_staff_steering") ||
    !isGovernanceDecision(payload.governanceDecision) ||
    !isTraceEnvelope(payload.traceEnvelope) ||
    !isAuditEnvelope(payload.auditEnvelope) ||
    !envelopesMatchDecision(payload.governanceDecision, payload.traceEnvelope, payload.auditEnvelope) ||
    hasForbiddenTaxonomyReviewSideEffectClaim(payload as Partial<ChiefOfStaffTaxonomyReviewSubmissionResult> & Record<string, unknown>)
  ) {
    failTaxonomyReviewClosed(dependencies, "contract_mismatch", requestId, profileMode);
  }

  if (payload.governanceDecision.outcome === "deny" || payload.governanceDecision.outcome === "no_go") {
    failTaxonomyReviewClosed(
      dependencies,
      payload.governanceDecision.outcome === "deny" ? "governance_denied" : "governance_no_go",
      payload.governanceDecision.request_id,
      profileMode,
      response.status,
      payload.governanceDecision.blocked_effects,
      undefined,
      {
        decisionId: payload.governanceDecision.decision_id,
        auditId: payload.auditEnvelope.audit_id,
        governanceOutcome: payload.governanceDecision.outcome,
      },
    );
  }

  emitTaxonomyReviewEvent(dependencies, "capability_taxonomy_review_send_completed", {
    traceId: dependencies.traceId,
    conversationId: dependencies.conversationId,
    requestId,
    proposalId: evolutionProposal.proposal_id,
    decisionId: payload.governanceDecision.decision_id,
    auditId: payload.auditEnvelope.audit_id,
    outcome: payload.governanceDecision.outcome,
    appliedLocally: false,
    approvalCaptured: false,
    memoryWritePerformed: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
  });

  return {
    text: payload.text ?? "Napoleon accepted the taxonomy review packet for governed review.",
    governanceDecision: payload.governanceDecision,
    traceEnvelope: payload.traceEnvelope,
    auditEnvelope: payload.auditEnvelope,
    appliedLocally: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
  };
}
