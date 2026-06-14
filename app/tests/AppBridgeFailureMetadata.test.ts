import assert from "node:assert/strict";
import test from "node:test";
import { buildBridgeFailureMessageMetadata } from "../src/App.js";
import { NapoleonBridgeError } from "../src/napoleonBridge.js";

test("builds fail-closed transcript metadata for Napoleon bridge errors", () => {
  const metadata = buildBridgeFailureMessageMetadata(
    new NapoleonBridgeError(
      "auth_failure",
      "trace_auth",
      "request_auth",
      401,
      ["runtime_authority", "command_execution", "task_routing"],
      {
        decisionId: "decision_auth",
        auditId: "audit_auth",
        governanceOutcome: "deny",
      },
    ),
  );

  assert.deepEqual(metadata, {
    source: "Blocked Napoleon governed bridge attempt",
    attributionBoundary: "No Napoleon response was accepted; fail-closed local state only.",
    governanceOutcome: "deny",
    decisionId: "decision_auth",
    auditId: "audit_auth",
    blockedEffects: ["runtime_authority", "command_execution", "task_routing"],
  });
});

test("builds generic fail-closed transcript metadata for unknown bridge failures", () => {
  const metadata = buildBridgeFailureMessageMetadata(new Error("network failed"));

  assert.deepEqual(metadata, {
    source: "Blocked Napoleon governed bridge attempt",
    attributionBoundary: "No Napoleon response was accepted; fail-closed local state only.",
  });
});
