import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTextTurnContract,
  defaultChiefOfStaffDescriptor,
  mapProfileToNapoleonMode,
  validateChiefOfStaffDescriptor,
} from "../src/contractBridge.js";

test("maps local child profile to Napoleon child protected user mode", () => {
  assert.equal(mapProfileToNapoleonMode("adult_owner"), "adult_owner");
  assert.equal(mapProfileToNapoleonMode("child_protected"), "child_protected_user");
  assert.equal(mapProfileToNapoleonMode("guest"), "guest");
});

test("validates Chief of Staff descriptor as contract-only and fail-closed", () => {
  const status = validateChiefOfStaffDescriptor(defaultChiefOfStaffDescriptor);

  assert.equal(status.serviceId, "napoleon.chief_of_staff");
  assert.equal(status.ready, true);
  assert.equal(status.runtimeAuthority, false);
  assert.equal(status.cachePolicy, "fail_closed_to_review_required");
  assert.ok(status.blockedEffects.includes("runtime_authority"));
  assert.ok(status.blockedEffects.includes("memory_write"));
});

test("builds a text turn contract with governance and observability identifiers", () => {
  const contract = buildTextTurnContract({
    message: "Draft a plan for a safe bridge update",
    profile: "child_protected",
    conversationId: "conv_test",
    turnId: "turn_test",
    traceId: "trace_test",
  });

  assert.equal(contract.profileMode, "child_protected_user");
  assert.equal(contract.chiefOfStaffRequest.request_type, "governance_review");
  assert.equal(contract.chiefOfStaffRequest.requested_authority_tier, "advisory_review");
  assert.equal(contract.governanceRequest.requested_authority_tier, "advisory_review");
  assert.equal(contract.traceEnvelope.trace_id, "trace_test");
  assert.equal(contract.traceEnvelope.request_id, contract.chiefOfStaffRequest.request_id);
  assert.equal(contract.governanceDecision.outcome, "allow_prepare_only");
  assert.equal(contract.governanceDecision.trace_id, "trace_test");
  assert.ok(contract.governanceDecision.audit_id.startsWith("audit_"));
  assert.ok(contract.governanceDecision.blocked_effects.includes("external_send"));
  assert.ok(contract.governanceDecision.blocked_effects.includes("memory_write"));
  assert.ok(contract.auditEnvelope.evidence_links.includes("local_text_turn"));
});
