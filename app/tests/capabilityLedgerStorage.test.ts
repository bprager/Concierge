import assert from "node:assert/strict";
import test from "node:test";
import {
  appendCapabilitySignal,
  answerCapabilityQuestion,
  deriveCapabilitySignalFromEvent,
} from "../src/capabilityLedger.js";
import {
  CAPABILITY_LEDGER_STORAGE_KEY,
  clearPersistedCapabilityLedger,
  exportCapabilityLedgerJson,
  loadCapabilityLedgerFromStorage,
  persistCapabilityLedgerToStorage,
} from "../src/capabilityLedgerStorage.js";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

test("storage adapter persists metadata and restores queryable capability ledger", () => {
  const storage = new MemoryStorage();
  const ledger = loadCapabilityLedgerFromStorage(storage);
  appendCapabilitySignal(
    ledger,
    deriveCapabilitySignalFromEvent("response_failed", {
      traceId: "trace_storage_reload",
      conversationId: "conv_storage_reload",
      turnId: "turn_storage_reload",
      profile: "adult_owner",
      error: "raw storage error",
    }),
  );

  persistCapabilityLedgerToStorage(storage, ledger);
  const restored = loadCapabilityLedgerFromStorage(storage);
  const answer = answerCapabilityQuestion("What capabilities should be implemented next?", restored);

  assert.ok(storage.getItem(CAPABILITY_LEDGER_STORAGE_KEY));
  assert.equal(storage.getItem(CAPABILITY_LEDGER_STORAGE_KEY)?.includes("raw storage error"), false);
  assert.ok(answer);
  if (!answer) throw new Error("expected restored answer");
  assert.equal(answer.rows[0].label, "bridge_failure_handling");
});

test("storage adapter clears persisted and in-memory capability ledger", () => {
  const storage = new MemoryStorage();
  const ledger = loadCapabilityLedgerFromStorage(storage);
  appendCapabilitySignal(
    ledger,
    deriveCapabilitySignalFromEvent("rehearsal_preview_created", {
      traceId: "trace_storage_clear",
      conversationId: "conv_storage_clear",
      turnId: "turn_storage_clear",
      profile: "adult_owner",
    }),
  );
  persistCapabilityLedgerToStorage(storage, ledger);

  clearPersistedCapabilityLedger(storage, ledger);

  assert.equal(storage.getItem(CAPABILITY_LEDGER_STORAGE_KEY), null);
  assert.equal(ledger.listRecent().length, 0);
});

test("storage adapter exports versioned metadata-only JSON", () => {
  const storage = new MemoryStorage();
  const ledger = loadCapabilityLedgerFromStorage(storage);
  appendCapabilitySignal(
    ledger,
    deriveCapabilitySignalFromEvent("response_failed", {
      traceId: "trace_storage_export",
      conversationId: "conv_storage_export",
      turnId: "turn_storage_export",
      profile: "adult_owner",
      error: "raw export adapter error",
    }),
  );

  const json = exportCapabilityLedgerJson(ledger);
  const parsed = JSON.parse(json) as { schemaVersion: string; privacyCaveat: string; signals: unknown[] };

  assert.equal(parsed.schemaVersion, "concierge.capability-ledger.export.v1");
  assert.equal(parsed.privacyCaveat.includes("does not grant permission to share externally"), true);
  assert.equal(parsed.signals.length, 1);
  assert.equal(json.includes("raw export adapter error"), false);
});
