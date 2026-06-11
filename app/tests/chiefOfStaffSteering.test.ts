import assert from "node:assert/strict";
import test from "node:test";
import {
  appendCapabilitySignal,
  buildCapabilitySignal,
  createCapabilityLedger,
} from "../src/capabilityLedger.js";
import { draftChiefOfStaffSteering } from "../src/chiefOfStaffSteering.js";

test("drafts proposal-only Chief of Staff steering from capability signals", () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_missing_bridge",
      conversationId: "conv_missing_bridge",
      turnId: "turn_missing_bridge",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "napoleon integration",
      intentLabel: "send_to_napoleon",
      capabilityLabel: "live_bridge_descriptor_discovery",
      capabilityStatus: "missing",
      outcomeSignal: "bridge_failed",
      confidence: 0.91,
      evidenceRefs: ["trace:trace_missing_bridge", "audit:audit_missing_bridge"],
      architectureArea: "bridge",
      privacyClass: "metadata_only",
      suggestedNextStep: "create_evolution_proposal",
    }),
  );

  const draft = draftChiefOfStaffSteering(ledger, {
    conversationId: "conv_steering",
    traceId: "trace_steering",
    endpointConfigured: false,
  });

  assert.equal(draft.sendState.canSendToNapoleon, false);
  assert.equal(draft.boundary.proposalOnly, true);
  assert.equal(draft.boundary.approvalCaptured, false);
  assert.equal(draft.boundary.memoryWriteAllowed, false);
  assert.equal(draft.boundary.agentDispatchAllowed, false);
  assert.equal(draft.boundary.externalSendAllowed, false);
  assert.equal(draft.recommendation.capabilityLabel, "live_bridge_descriptor_discovery");
  assert.equal(draft.recommendation.architectureArea, "bridge");
  assert.ok(draft.evaluatorCaseCandidate.expectedBehavior.includes("fail closed"));
  assert.ok(draft.evolutionProposal.summary.includes("live_bridge_descriptor_discovery"));
  assert.ok(draft.evolutionProposal.evaluator_cases.includes(draft.evaluatorCaseCandidate.caseId));
  assert.ok(draft.evolutionProposal.evidence.includes("trace:trace_missing_bridge"));
});
