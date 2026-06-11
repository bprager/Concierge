import type { CapabilityArchitectureArea, ConversationCapabilitySignal } from "./capabilityLedger.js";

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

const TAXONOMY_SCHEMA_VERSION = "concierge.capability-taxonomy.v1" as const;
const TAXONOMY_PRIVACY_CAVEAT =
  "Local metadata-only taxonomy edits. Renames, merges, deprecated markers, and split-candidate markers are local hints only and do not change Napoleon policy, routing, memory, approval, dispatch, or external sends.";

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
