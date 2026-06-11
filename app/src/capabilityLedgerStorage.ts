import {
  clearCapabilityLedger,
  deserializeCapabilityLedger,
  exportCapabilityLedger,
  serializeCapabilityLedger,
  type CapabilityLedger,
} from "./capabilityLedger.js";
import {
  createCapabilityTaxonomy,
  deserializeCapabilityTaxonomy,
  resetCapabilityTaxonomy,
  serializeCapabilityTaxonomy,
  type CapabilityTaxonomy,
} from "./capabilityTaxonomy.js";

export const CAPABILITY_LEDGER_STORAGE_KEY = "concierge_capability_ledger_v1";
export const CAPABILITY_TAXONOMY_STORAGE_KEY = "concierge_capability_taxonomy_v1";
export const CAPABILITY_LEDGER_MAX_SIGNALS = 250;

export interface CapabilityLedgerStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function loadCapabilityLedgerFromStorage(storage: CapabilityLedgerStorage | undefined | null): CapabilityLedger {
  if (!storage) return deserializeCapabilityLedger(null, { maxSignals: CAPABILITY_LEDGER_MAX_SIGNALS });
  const raw = storage.getItem(CAPABILITY_LEDGER_STORAGE_KEY);
  if (!raw) return deserializeCapabilityLedger(null, { maxSignals: CAPABILITY_LEDGER_MAX_SIGNALS });

  try {
    return deserializeCapabilityLedger(JSON.parse(raw), { maxSignals: CAPABILITY_LEDGER_MAX_SIGNALS });
  } catch {
    return deserializeCapabilityLedger(null, { maxSignals: CAPABILITY_LEDGER_MAX_SIGNALS });
  }
}

export function persistCapabilityLedgerToStorage(
  storage: CapabilityLedgerStorage | undefined | null,
  ledger: CapabilityLedger,
): boolean {
  if (!storage) return false;
  const snapshot = serializeCapabilityLedger(ledger, { maxSignals: CAPABILITY_LEDGER_MAX_SIGNALS });
  storage.setItem(CAPABILITY_LEDGER_STORAGE_KEY, JSON.stringify(snapshot));
  return true;
}

export function loadCapabilityTaxonomyFromStorage(
  storage: CapabilityLedgerStorage | undefined | null,
): CapabilityTaxonomy {
  if (!storage) return createCapabilityTaxonomy();
  const raw = storage.getItem(CAPABILITY_TAXONOMY_STORAGE_KEY);
  if (!raw) return createCapabilityTaxonomy();

  try {
    return deserializeCapabilityTaxonomy(JSON.parse(raw));
  } catch {
    return createCapabilityTaxonomy();
  }
}

export function persistCapabilityTaxonomyToStorage(
  storage: CapabilityLedgerStorage | undefined | null,
  taxonomy: CapabilityTaxonomy,
): boolean {
  if (!storage) return false;
  storage.setItem(CAPABILITY_TAXONOMY_STORAGE_KEY, JSON.stringify(serializeCapabilityTaxonomy(taxonomy)));
  return true;
}

export function clearPersistedCapabilityLedger(
  storage: CapabilityLedgerStorage | undefined | null,
  ledger: CapabilityLedger,
  taxonomy?: CapabilityTaxonomy,
) {
  clearCapabilityLedger(ledger);
  if (taxonomy) resetCapabilityTaxonomy(taxonomy);
  storage?.removeItem(CAPABILITY_LEDGER_STORAGE_KEY);
  storage?.removeItem(CAPABILITY_TAXONOMY_STORAGE_KEY);
}

export function exportCapabilityLedgerJson(ledger: CapabilityLedger, taxonomy?: CapabilityTaxonomy): string {
  return JSON.stringify(exportCapabilityLedger(ledger, { maxSignals: CAPABILITY_LEDGER_MAX_SIGNALS, taxonomy }), null, 2);
}
