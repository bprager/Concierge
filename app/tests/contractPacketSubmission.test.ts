import assert from "node:assert/strict";
import test from "node:test";
import { defaultChiefOfStaffDescriptor } from "../src/contractBridge.js";
import {
  submitChiefOfStaffRequestPacket,
  type ChiefOfStaffRequestPacket,
  type ContractPacketSubmissionResult,
} from "../src/contractPacketSubmission.js";
import { NapoleonBridgeError } from "../src/napoleonBridge.js";

const readyDescriptorConnection = {
  endpointConfigured: true,
  descriptor: defaultChiefOfStaffDescriptor,
  expectedChecksum: "sha256:local-static",
  actualChecksum: "sha256:local-static",
  signatureValid: true,
};

const chiefOfStaffBlockedEffects = [
  "task_routing",
  "registry_update",
  "trace_append",
  "approval_capture",
  "memory_write",
  "agent_dispatch",
  "external_send",
  "local_application",
];

function buildChiefOfStaffPacket(profileMode: "adult_owner" | "child_protected_user" = "adult_owner"): ChiefOfStaffRequestPacket {
  return {
    schemaVersion: "concierge/napoleon-contract-packet-export/v1",
    packetType: "chief_of_staff_request_handoff",
    generatedBy: "concierge.text",
    conversationId: "conv_contract_packet",
    profileMode,
    bridgeTarget: {
      operationId: "chief_of_staff_request",
      path: "/chief-of-staff/requests",
      requestKind: "chief_of_staff_request_handoff",
      transport: "HTTP POST",
    },
    request: {
      request_id: "cos_trace_contract_packet",
      requester: "concierge.text",
      request_type: "governance_review",
      profile_mode: profileMode,
      source_evidence: ["trace:trace_contract_packet"],
      requested_authority_tier: "advisory_review",
      trace_id: "trace_contract_packet",
      payload_schema: "schemas/concierge_text_turn.schema.json",
    },
    traceEnvelope: {
      trace_id: "trace_contract_packet",
      parent_trace_id: "conv_contract_packet",
      actor_id: "concierge.text",
      request_id: "cos_trace_contract_packet",
      decision_id: "decision_contract_packet_local",
      timestamp: "2026-06-28T00:00:00.000Z",
    },
    auditEnvelope: {
      audit_id: "audit_contract_packet_local",
      trace_id: "trace_contract_packet",
      decision_id: "decision_contract_packet_local",
      actor_id: "concierge.text",
      authority_tier: "advisory_review",
      approval_requirement: "Napoleon review required before side effects.",
      evidence_links: ["trace:trace_contract_packet"],
    },
    handoffReadiness: {
      status: "ready",
      summary: "Ready for governed Chief of Staff request handoff.",
      nextStepSummary: "Submit to Napoleon only through the governed bridge.",
      blockedEffects: chiefOfStaffBlockedEffects,
    },
    boundary: {
      localExportOnly: true,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      routingPerformed: false,
      registryUpdatePerformed: false,
      traceAppendPerformed: false,
      appliedLocally: false,
    },
  };
}

function buildAcceptedResponse(): ContractPacketSubmissionResult {
  return {
    text: "Napoleon accepted the Chief of Staff request packet for review.",
    governanceDecision: {
      decision_id: "decision_contract_packet_remote",
      request_id: "cos_trace_contract_packet",
      outcome: "requires_review",
      authority_tier: "advisory_review",
      approval_requirement: "Napoleon review required before side effects.",
      rationale: "Packet accepted for evidence-only review.",
      blocked_effects: chiefOfStaffBlockedEffects,
      trace_id: "trace_contract_packet",
      audit_id: "audit_contract_packet_remote",
    },
    traceEnvelope: {
      trace_id: "trace_contract_packet",
      parent_trace_id: "conv_contract_packet",
      actor_id: "napoleon.chief_of_staff",
      request_id: "cos_trace_contract_packet",
      decision_id: "decision_contract_packet_remote",
      timestamp: "2026-06-28T00:00:00.000Z",
    },
    auditEnvelope: {
      audit_id: "audit_contract_packet_remote",
      trace_id: "trace_contract_packet",
      decision_id: "decision_contract_packet_remote",
      actor_id: "napoleon.chief_of_staff",
      authority_tier: "advisory_review",
      approval_requirement: "Napoleon review required before side effects.",
      evidence_links: ["trace:trace_contract_packet"],
    },
    approvalCaptured: false,
    memoryWritePerformed: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    routingPerformed: false,
    registryUpdatePerformed: false,
    traceAppendPerformed: false,
    appliedLocally: false,
  };
}

test("contract packet submission fails closed before fetch when active profile differs from packet profile", async () => {
  const packet = buildChiefOfStaffPacket("adult_owner");
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];
  let fetchCalled = false;

  await assert.rejects(
    () =>
      submitChiefOfStaffRequestPacket(packet, {
        conversationId: "conv_contract_packet",
        profile: "child_protected",
        getEndpoint: () => "https://napoleon.example",
        descriptorConnection: readyDescriptorConnection,
        emit: (event) => events.push(event),
        fetch: async () => {
          fetchCalled = true;
          return {
            ok: true,
            status: 200,
            json: async () => buildAcceptedResponse(),
          };
        },
      }),
    (error: unknown) =>
      error instanceof NapoleonBridgeError &&
      error.reason === "governance_no_go" &&
      error.profileMode === "child_protected_user" &&
      chiefOfStaffBlockedEffects.every((effect) => error.blockedEffects.includes(effect)),
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.event, "chief_of_staff_request_packet_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "governance_no_go");
  assert.equal(events.at(-1)?.attributes.profileMode, "child_protected_user");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, chiefOfStaffBlockedEffects);
});
