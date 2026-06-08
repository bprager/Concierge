import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRehearsalPreview,
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

test("builds a rehearsal preview from the text turn contract without granting authority", () => {
  const contract = buildTextTurnContract({
    message: "Send the weekly deployment summary to the team",
    profile: "adult_owner",
    conversationId: "conv_rehearsal",
    turnId: "turn_rehearsal",
    traceId: "trace_rehearsal",
    timestamp: "2026-06-08T12:00:00.000Z",
  });

  const preview = buildRehearsalPreview(contract, "Send the weekly deployment summary to the team");

  assert.equal(preview.understoodRequest, "Send the weekly deployment summary to the team");
  assert.deepEqual(preview.proposedNapoleonPath, [
    "concierge.text",
    "napoleon.chief_of_staff",
    "napoleon.governance",
  ]);
  assert.equal(preview.chiefOfStaffReviewPacket.requestId, "cos_turn_rehearsal");
  assert.equal(preview.chiefOfStaffReviewPacket.profileMode, "adult_owner");
  assert.deepEqual(preview.allowedEffects, ["prepare_advisory_response"]);
  assert.ok(preview.blockedEffects.includes("external_send"));
  assert.equal(preview.approvalState, "No approval captured. External effects remain blocked.");
  assert.equal(preview.memoryProposal.status, "candidate_only");
  assert.equal(preview.traceAuditPreview.traceId, "trace_rehearsal");
  assert.equal(preview.evaluatorCaseCandidate.scenarioType, "rehearsal_mode_text_turn");
  assert.equal(preview.evaluatorCaseCandidate.sourceRequestId, "cos_turn_rehearsal");
});
