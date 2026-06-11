import {
  clearCapabilityLedger,
  deserializeCapabilityLedger,
  exportCapabilityLedger,
  serializeCapabilityLedger,
  type CapabilityLedger,
} from "./capabilityLedger.js";

export const CAPABILITY_LEDGER_STORAGE_KEY = "concierge_capability_ledger_v1";
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

export function clearPersistedCapabilityLedger(
  storage: CapabilityLedgerStorage | undefined | null,
  ledger: CapabilityLedger,
) {
  clearCapabilityLedger(ledger);
  storage?.removeItem(CAPABILITY_LEDGER_STORAGE_KEY);
}

export function exportCapabilityLedgerJson(ledger: CapabilityLedger): string {
  return JSON.stringify(exportCapabilityLedger(ledger, { maxSignals: CAPABILITY_LEDGER_MAX_SIGNALS }), null, 2);
}
