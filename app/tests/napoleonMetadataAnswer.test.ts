import assert from "node:assert/strict";
import test from "node:test";
import {
  formatNapoleonCapabilityAnswer,
  formatNapoleonMetadataAnswer,
  isNapoleonCapabilityQuestion,
  isNapoleonMetadataQuestion,
} from "../src/napoleonMetadataAnswer.js";
import type { ChiefOfStaffCapabilityDiscoveryResult } from "../src/chiefOfStaffCapabilities.js";

const discoveredMetadata: ChiefOfStaffCapabilityDiscoveryResult = {
  state: "ready",
  message: "Advisory Chief of Staff capabilities discovered. This is not Napoleon approval.",
  serviceId: "napoleon.chief_of_staff",
  capabilities: [
    {
      id: "chief_of_staff_steering",
      label: "Chief of Staff steering",
      description: "Drafts proposal-only improvement recommendations from local evidence.",
      authorityTier: "advisory_review",
      proposalOnly: true,
    },
  ],
  agents: [
    {
      agentId: "passive_brain",
      displayName: "Passive Brain",
      description: "Surfaces relevant Napoleon context.",
      allowedEffects: ["prepare_advisory_response"],
      blockedEffects: ["memory_write", "agent_dispatch"],
      runtimeAuthority: false,
      agentDispatchPerformed: false,
    },
  ],
  profileMetadata: {
    profileId: "adult_owner",
    label: "Adult owner",
    retentionMode: "derived_signals_only",
    runtimeAuthority: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    blockedEffects: ["memory_write", "approval_capture"],
  },
  runtimeAuthority: false,
  blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "agent_dispatch", "external_send"],
  approvalCaptured: false,
  memoryWritePerformed: false,
  agentDispatchPerformed: false,
  externalSendPerformed: false,
  responseApprovalCaptured: false,
  responseMemoryWritePerformed: false,
  responseAgentDispatchPerformed: false,
  responseExternalSendPerformed: false,
};

test("recognizes Napoleon metadata discovery questions without matching last-turn delegation questions", () => {
  assert.equal(isNapoleonMetadataQuestion("Which Napoleon agents are currently available?"), true);
  assert.equal(isNapoleonMetadataQuestion("What profile metadata did Napoleon return?"), true);
  assert.equal(isNapoleonMetadataQuestion("Who handled the last answer?"), false);
});

test("formats discovered Napoleon metadata as local non-authorizing connection state", () => {
  const answer = formatNapoleonMetadataAnswer(discoveredMetadata);

  assert.equal(answer.metadataReturned, true);
  assert.equal(answer.agentCount, 1);
  assert.equal(answer.profileMetadataReturned, true);
  assert.equal(answer.responseSideEffectClaimCount, 0);
  assert.match(answer.content, /Agent manifests: Passive Brain \(passive_brain\)/);
  assert.match(answer.content, /Profile metadata: Adult owner \(adult_owner\), retention derived_signals_only/);
  assert.match(answer.content, /Blocked effects: runtime_authority, memory_write, approval_capture, agent_dispatch, external_send/);
  assert.match(answer.content, /metadata only; no agent dispatch, registry update, memory write, approval capture, external send, or local application/);
});

test("formats missing Napoleon metadata without inventing agents or profile authority", () => {
  const answer = formatNapoleonMetadataAnswer(null);

  assert.equal(answer.metadataReturned, false);
  assert.equal(answer.agentCount, 0);
  assert.equal(answer.profileMetadataReturned, false);
  assert.match(answer.content, /Napoleon metadata has not been discovered in this UI session/);
  assert.match(answer.content, /Discover the descriptor, then explicitly fetch advisory capabilities and metadata/);
  assert.match(answer.content, /No agent, profile, registry, memory, or approval authority is inferred locally/);
});

test("recognizes and formats Napoleon capability questions as local non-authorizing discovery state", () => {
  assert.equal(isNapoleonCapabilityQuestion("What can Napoleon do right now?"), true);
  assert.equal(isNapoleonCapabilityQuestion("Which Napoleon capabilities are available?"), true);
  assert.equal(isNapoleonCapabilityQuestion("What did Napoleon do last turn?"), false);

  const answer = formatNapoleonCapabilityAnswer(discoveredMetadata);

  assert.equal(answer.capabilitiesReturned, true);
  assert.equal(answer.capabilityCount, 1);
  assert.equal(answer.agentCount, 1);
  assert.equal(answer.responseSideEffectClaimCount, 0);
  assert.match(answer.content, /Napoleon capability discovery is available as local connection metadata/);
  assert.match(answer.content, /Capabilities: Chief of Staff steering \(chief_of_staff_steering\), tier advisory_review, proposal-only/);
  assert.match(answer.content, /Agent manifests: Passive Brain \(passive_brain\)/);
  assert.match(answer.content, /Boundary: local discovery only; no agent dispatch, routing, registry update, memory write, approval capture, external send, or local application/);
});
