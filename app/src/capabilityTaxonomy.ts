import type { CapabilityArchitectureArea, ConversationCapabilitySignal, RecommendationBoundary } from "./capabilityLedger.js";

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
  boundary: RecommendationBoundary;
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

export function draftChiefOfStaffTaxonomyReview(
  signals: ConversationCapabilitySignal[],
  taxonomy: CapabilityTaxonomy = createCapabilityTaxonomy(),
  options: { conversationId: string; traceId: string },
): ChiefOfStaffTaxonomyReviewDraft {
  const dimensions: TaxonomyDimension[] = ["topic", "intent", "capability", "architecture"];
  const recommendations = [
    ...dimensions.flatMap((dimension) => mergeRecommendations(signals, dimension)),
    ...splitRecommendations(signals),
    ...deprecationRecommendations(signals, taxonomy),
  ].slice(0, 10);

  return {
    reviewType: "chief_of_staff_taxonomy_review",
    conversationId: options.conversationId,
    traceId: options.traceId,
    recommendations,
    evaluatorCaseCandidate: {
      caseId: "capability_taxonomy_review_001",
      expectedBehavior:
        "Concierge drafts taxonomy cleanup as proposal-only local metadata; it does not apply edits, capture approval, write memory, dispatch agents, send externally, or change Napoleon routing.",
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
