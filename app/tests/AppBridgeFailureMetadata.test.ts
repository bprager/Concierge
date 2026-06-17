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
    "child_protected_user",
  );

  assert.deepEqual(metadata, {
    source: "Blocked Napoleon governed bridge attempt",
    attributionBoundary: "No Napoleon response was accepted; fail-closed local state only.",
    governanceOutcome: "deny",
    profileMode: "child_protected_user",
    decisionId: "decision_auth",
    auditId: "audit_auth",
    blockedEffects: ["runtime_authority", "command_execution", "task_routing"],
  });
});

test("builds descriptor-specific transcript metadata for descriptor bridge failures", () => {
  const metadata = buildBridgeFailureMessageMetadata(
    new NapoleonBridgeError(
      "descriptor_mismatch",
      "trace_descriptor",
      "request_descriptor",
      undefined,
      ["runtime_authority", "memory_write", "external_send"],
      {
        descriptorFailureReason: "descriptor_signature_or_checksum_mismatch",
      },
    ),
    "adult_owner",
  );

  assert.equal(metadata?.source, "Blocked Napoleon governed bridge attempt");
  assert.equal(metadata?.profileMode, "adult_owner");
  assert.equal(metadata?.descriptorFailureReason, "descriptor_signature_or_checksum_mismatch");
  assert.deepEqual(metadata?.blockedEffects, ["runtime_authority", "memory_write", "external_send"]);
});

test("builds generic fail-closed transcript metadata for unknown bridge failures", () => {
  const metadata = buildBridgeFailureMessageMetadata(new Error("network failed"));

  assert.deepEqual(metadata, {
    source: "Blocked Napoleon governed bridge attempt",
    attributionBoundary: "No Napoleon response was accepted; fail-closed local state only.",
  });
});
