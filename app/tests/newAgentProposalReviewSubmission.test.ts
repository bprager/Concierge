import assert from "node:assert/strict";
import test from "node:test";
import type { ExportedCapabilityReviewPacket } from "../src/capabilityLedger.js";
import { defaultChiefOfStaffDescriptor } from "../src/contractBridge.js";
import {
  buildNewAgentProposalReviewPacket,
  submitNewAgentProposalForNapoleonReview,
} from "../src/newAgentProposalReviewSubmission.js";

type TestFetchInit = { method?: string; headers?: Record<string, string>; body?: string };

const readyDescriptorConnection = {
  endpointConfigured: true,
  descriptor: defaultChiefOfStaffDescriptor,
  expectedChecksum: "sha256:local-static",
  actualChecksum: "sha256:local-static",
  signatureValid: true,
};

const textTurnOnlyDescriptorConnection = {
  endpointConfigured: true,
  descriptor: {
    schemaVersion: "napoleon/concierge/runtime-descriptor/v1",
    serviceId: "napoleon.chief_of_staff" as const,
    runtimeAuthority: false as const,
    commandExecution: false as const,
    cachePolicy: "runtime_descriptor_live_response" as const,
    blockedEffects: ["runtime_authority", "memory_write", "agent_dispatch", "external_send"],
    supportedHandoffs: ["text_turn" as const],
  },
};

const blockedEffects = [
  "agent_activation",
  "registry_update",
  "agent_dispatch",
  "approval_capture",
  "memory_write",
  "external_send",
  "runtime_authority",
];

function buildCapabilityPacket(): ExportedCapabilityReviewPacket {
  return {
    schemaVersion: "concierge.capability-review-packet.export.v1",
    generatedAt: "2026-06-24T00:00:00.000Z",
    answerKind: "recommended_next_capabilities",
    questionClassification: "recommended_next_capabilities",
    profileMode: "adult_owner",
    evidenceCount: 2,
    reviewFocus: {
      capabilityLabel: "agent registry readiness review",
      status: "missing",
      architectureArea: "agent_registry",
      suggestedNextStep: "create_evolution_proposal",
      confidence: 0.82,
      evidenceCount: 2,
      score: 7,
      scoreExplanation: "high value but registry authority stays in Napoleon",
      evidenceRefs: ["trace:trace_agent_gap", "capability:agent_registry_readiness"],
    },
    rows: [],
    evaluatorCaseCandidate: {
      caseId: "capability_review_agent_registry_readiness",
      scenarioType: "capability_review",
      capabilityLabel: "agent registry readiness review",
      architectureArea: "agent_registry",
      expectedBehavior: "Concierge should draft only and never activate agents locally.",
    },
    evolutionProposalDraft: {
      proposalId: "evo_agent_registry_readiness",
      summary: "Review whether a Napoleon-owned agent should cover registry readiness.",
      change: {
        capability: "agent registry readiness review",
        architectureArea: "agent_registry",
        requestedAction: "create_evolution_proposal",
      },
      evidence: ["trace:trace_agent_gap"],
      approvalRequired: "Napoleon Chief of Staff and owner review before implementation or rollout.",
      rollbackPlan: "Keep current behavior.",
    },
    boundary: {
      proposalOnly: true,
      approvalCaptured: false,
      memoryWriteAllowed: false,
      agentDispatchAllowed: false,
      externalSendAllowed: false,
    },
    localOnlyBoundary: {
      localOnly: true,
      napoleonContacted: false,
      appliedLocally: false,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
    },
    privacyCaveat: "Local sanitized metadata only.",
    authorityCaveat: "Proposal-only evidence.",
  };
}

function buildResponse(traceId: string, requestId: string, overrides: Record<string, unknown> = {}) {
  return {
    text: "Napoleon accepted the new-agent proposal for governed review.",
    governanceDecision: {
      decision_id: `decision_${traceId}`,
      request_id: requestId,
      outcome: "allow_prepare_only",
      authority_tier: "advisory_review",
      approval_requirement: "Napoleon review before registry or activation changes.",
      rationale: "Proposal accepted for review only.",
      blocked_effects: blockedEffects,
      trace_id: traceId,
      audit_id: `audit_${traceId}`,
    },
    traceEnvelope: {
      trace_id: traceId,
      parent_trace_id: "conv_agent",
      actor_id: "napoleon.chief_of_staff",
      request_id: requestId,
      decision_id: `decision_${traceId}`,
      timestamp: "2026-06-24T00:00:00.000Z",
    },
    auditEnvelope: {
      audit_id: `audit_${traceId}`,
      trace_id: traceId,
      decision_id: `decision_${traceId}`,
      actor_id: "napoleon.chief_of_staff",
      authority_tier: "advisory_review",
      approval_requirement: "Napoleon review before registry or activation changes.",
      evidence_links: ["trace:trace_agent_gap"],
    },
    appliedLocally: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    ...overrides,
  };
}

test("new-agent proposal packet is proposal-only and does not request activation or registry update", () => {
  const packet = buildNewAgentProposalReviewPacket(buildCapabilityPacket(), {
    profile: "adult_owner",
    traceId: "trace_new_agent",
  });

  assert.equal(packet.requestKind, "new_agent_proposal_review_handoff");
  assert.equal(packet.profileMode, "adult_owner");
  assert.equal(packet.proposedAgent.activationRequested, false);
  assert.equal(packet.proposedAgent.registryUpdateRequested, false);
  assert.equal(packet.boundary.proposalOnly, true);
  assert.equal(packet.boundary.agentActivated, false);
  assert.equal(packet.boundary.registryUpdatePerformed, false);
  assert.deepEqual(packet.blockedEffects, blockedEffects);
  assert.ok(packet.sourceEvidence.includes("trace:trace_agent_gap"));
});

test("new-agent proposal review fails closed without endpoint and does not fetch", async () => {
  const packet = buildNewAgentProposalReviewPacket(buildCapabilityPacket(), {
    profile: "adult_owner",
    traceId: "trace_new_agent",
  });
  let fetchCalled = false;

  await assert.rejects(
    () =>
      submitNewAgentProposalForNapoleonReview(packet, {
        conversationId: "conv_agent",
        traceId: "trace_submit",
        getEndpoint: () => null,
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("no_endpoint") &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(blockedEffects),
  );

  assert.equal(fetchCalled, false);
});

test("new-agent proposal review fails closed while Rehearsal Mode is active", async () => {
  const packet = buildNewAgentProposalReviewPacket(buildCapabilityPacket(), {
    profile: "adult_owner",
    traceId: "trace_new_agent",
  });
  let fetchCalled = false;

  await assert.rejects(
    () =>
      submitNewAgentProposalForNapoleonReview(packet, {
        conversationId: "conv_agent",
        traceId: "trace_submit",
        rehearsalMode: true,
        getEndpoint: () => "https://napoleon.example",
        descriptorConnection: readyDescriptorConnection,
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error && error.name === "NapoleonBridgeError" && error.message.includes("governance_no_go"),
  );

  assert.equal(fetchCalled, false);
});

test("new-agent proposal review fails closed when descriptor does not advertise the review handoff", async () => {
  const packet = buildNewAgentProposalReviewPacket(buildCapabilityPacket(), {
    profile: "adult_owner",
    traceId: "trace_new_agent",
  });
  let fetchCalled = false;

  await assert.rejects(
    () =>
      submitNewAgentProposalForNapoleonReview(packet, {
        conversationId: "conv_agent",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example",
        descriptorConnection: textTurnOnlyDescriptorConnection,
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("descriptor_mismatch") &&
      (error as { descriptorFailureReason?: string }).descriptorFailureReason === "descriptor_invalid",
  );

  assert.equal(fetchCalled, false);
});

test("new-agent proposal review sends the governed packet to the explicit Napoleon review path", async () => {
  const packet = buildNewAgentProposalReviewPacket(buildCapabilityPacket(), {
    profile: "adult_owner",
    traceId: "trace_new_agent",
  });
  let requestedUrl = "";
  let requestedBody: Record<string, unknown> = {};

  const result = await submitNewAgentProposalForNapoleonReview(packet, {
    conversationId: "conv_agent",
    traceId: "trace_submit",
    getEndpoint: () => "https://napoleon.example",
    descriptorConnection: readyDescriptorConnection,
    fetch: async (url: string, init?: TestFetchInit) => {
      requestedUrl = url;
      requestedBody = JSON.parse(init?.body ?? "{}") as Record<string, unknown>;
      return {
        ok: true,
        status: 200,
        json: async () => buildResponse("trace_submit", "cos_trace_submit"),
      };
    },
  });

  assert.equal(requestedUrl, "https://napoleon.example/chief-of-staff/reviews/new-agent-proposals");
  assert.equal(requestedBody.requestKind, "new_agent_proposal_review_handoff");
  assert.equal(requestedBody.bridgeTargetOperation, "new_agent_proposal_review");
  assert.equal(requestedBody.bridgeTargetRequestKind, "new_agent_proposal_review_handoff");
  assert.equal((requestedBody.newAgentProposal as { boundary: { proposalOnly: boolean } }).boundary.proposalOnly, true);
  assert.equal(result.agentActivated, false);
  assert.equal(result.registryUpdatePerformed, false);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.agentDispatchPerformed, false);
});

test("new-agent proposal review rejects response-side activation or registry claims", async () => {
  const packet = buildNewAgentProposalReviewPacket(buildCapabilityPacket(), {
    profile: "adult_owner",
    traceId: "trace_new_agent",
  });

  await assert.rejects(
    () =>
      submitNewAgentProposalForNapoleonReview(packet, {
        conversationId: "conv_agent",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example",
        descriptorConnection: readyDescriptorConnection,
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () =>
            buildResponse("trace_submit", "cos_trace_submit", {
              registryUpdatePerformed: true,
              agentActivated: true,
            }),
        }),
      }),
    (error: unknown) =>
      error instanceof Error && error.name === "NapoleonBridgeError" && error.message.includes("contract_mismatch"),
  );
});
