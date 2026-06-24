import assert from "node:assert/strict";
import test from "node:test";
import type { ExportedCapabilityReviewPacket } from "../src/capabilityLedger.js";
import { defaultChiefOfStaffDescriptor } from "../src/contractBridge.js";
import {
  buildEvolutionProposalSubmissionPacket,
  submitEvolutionProposalToNapoleon,
  type EvolutionProposalSubmissionResult,
} from "../src/evolutionProposalSubmission.js";
import {
  buildDraftEvolutionProposalLifecycleRecord,
  exportEvolutionProposalLifecycleRecords,
  loadEvolutionProposalLifecycleRecords,
  persistEvolutionProposalLifecycleRecords,
  updateEvolutionProposalLifecycleAfterFailure,
  updateEvolutionProposalLifecycleAfterSubmission,
  upsertEvolutionProposalLifecycleRecord,
} from "../src/evolutionProposalLifecycle.js";

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
  "evolution_application",
  "registry_update",
  "approval_capture",
  "memory_write",
  "agent_dispatch",
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
      capabilityLabel: "capability_intelligence_review",
      status: "missing",
      architectureArea: "observability",
      suggestedNextStep: "create_evolution_proposal",
      confidence: 0.82,
      evidenceCount: 2,
      score: 7,
      scoreExplanation: "high value but evolution authority stays in Napoleon",
      evidenceRefs: ["trace:trace_capability_gap", "capability:capability_intelligence_review"],
    },
    rows: [],
    evaluatorCaseCandidate: {
      caseId: "capability_review_capability_intelligence_review",
      scenarioType: "capability_review",
      capabilityLabel: "capability_intelligence_review",
      architectureArea: "observability",
      expectedBehavior: "Concierge should draft only and never apply evolution locally.",
    },
    evolutionProposalDraft: {
      proposalId: "evo_capability_intelligence_review",
      summary: "Review whether Napoleon should evolve capability intelligence review coverage.",
      change: {
        capability: "capability_intelligence_review",
        architectureArea: "observability",
        requestedAction: "create_evolution_proposal",
      },
      evidence: ["trace:trace_capability_gap"],
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
    text: "Napoleon accepted the evolution proposal for governed intake.",
    governanceDecision: {
      decision_id: `decision_${traceId}`,
      request_id: requestId,
      outcome: "allow_prepare_only",
      authority_tier: "advisory_review",
      approval_requirement: "Napoleon review before evolution changes.",
      rationale: "Proposal accepted for intake only.",
      blocked_effects: blockedEffects,
      trace_id: traceId,
      audit_id: `audit_${traceId}`,
    },
    traceEnvelope: {
      trace_id: traceId,
      parent_trace_id: "conv_evolution",
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
      approval_requirement: "Napoleon review before evolution changes.",
      evidence_links: ["trace:trace_capability_gap"],
    },
    appliedLocally: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    registryUpdatePerformed: false,
    evolutionApplied: false,
    ...overrides,
  };
}

test("evolution proposal submission packet is proposal-only and blocks local evolution", () => {
  const packet = buildEvolutionProposalSubmissionPacket(buildCapabilityPacket(), {
    profile: "adult_owner",
    traceId: "trace_evolution",
  });

  assert.equal(packet.requestKind, "evolution_proposal_submission_handoff");
  assert.equal(packet.profileMode, "adult_owner");
  assert.equal(packet.boundary.proposalOnly, true);
  assert.equal(packet.boundary.submittedForNapoleonReview, true);
  assert.equal(packet.boundary.evolutionApplied, false);
  assert.equal(packet.boundary.registryUpdatePerformed, false);
  assert.equal(packet.boundary.approvalCaptured, false);
  assert.equal(packet.boundary.memoryWritePerformed, false);
  assert.deepEqual(packet.blockedEffects, blockedEffects);
  assert.ok(packet.evolutionProposal.evidence.includes("trace:trace_capability_gap"));
});

test("evolution proposal submission fails closed without endpoint and does not fetch", async () => {
  const packet = buildEvolutionProposalSubmissionPacket(buildCapabilityPacket(), {
    profile: "adult_owner",
    traceId: "trace_evolution",
  });
  let fetchCalled = false;

  await assert.rejects(
    () =>
      submitEvolutionProposalToNapoleon(packet, {
        conversationId: "conv_evolution",
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

test("evolution proposal submission fails closed while Rehearsal Mode is active", async () => {
  const packet = buildEvolutionProposalSubmissionPacket(buildCapabilityPacket(), {
    profile: "adult_owner",
    traceId: "trace_evolution",
  });
  let fetchCalled = false;

  await assert.rejects(
    () =>
      submitEvolutionProposalToNapoleon(packet, {
        conversationId: "conv_evolution",
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

test("evolution proposal submission fails closed when descriptor does not advertise the handoff", async () => {
  const packet = buildEvolutionProposalSubmissionPacket(buildCapabilityPacket(), {
    profile: "adult_owner",
    traceId: "trace_evolution",
  });
  let fetchCalled = false;

  await assert.rejects(
    () =>
      submitEvolutionProposalToNapoleon(packet, {
        conversationId: "conv_evolution",
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

test("evolution proposal submission sends the packet to the explicit Napoleon intake path", async () => {
  const packet = buildEvolutionProposalSubmissionPacket(buildCapabilityPacket(), {
    profile: "adult_owner",
    traceId: "trace_evolution",
  });
  let requestedUrl = "";
  let requestedBody: Record<string, unknown> = {};

  const result = await submitEvolutionProposalToNapoleon(packet, {
    conversationId: "conv_evolution",
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

  assert.equal(requestedUrl, "https://napoleon.example/evolution/proposals");
  assert.equal(requestedBody.requestKind, "evolution_proposal_submission_handoff");
  assert.equal(requestedBody.bridgeTargetOperation, "evolution_proposal_submission");
  assert.equal((requestedBody.chiefOfStaffRequest as { request_type: string }).request_type, "evolution_proposal_submission");
  assert.equal((requestedBody.boundary as { proposalOnly: boolean }).proposalOnly, true);
  assert.equal(result.evolutionApplied, false);
  assert.equal(result.registryUpdatePerformed, false);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.agentDispatchPerformed, false);
});

test("evolution proposal submission rejects response-side application or registry claims", async () => {
  const packet = buildEvolutionProposalSubmissionPacket(buildCapabilityPacket(), {
    profile: "adult_owner",
    traceId: "trace_evolution",
  });

  await assert.rejects(
    () =>
      submitEvolutionProposalToNapoleon(packet, {
        conversationId: "conv_evolution",
        traceId: "trace_submit",
        getEndpoint: () => "https://napoleon.example",
        descriptorConnection: readyDescriptorConnection,
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () =>
            buildResponse("trace_submit", "cos_trace_submit", {
              registryUpdatePerformed: true,
              evolutionApplied: true,
            }),
        }),
      }),
    (error: unknown) =>
      error instanceof Error && error.name === "NapoleonBridgeError" && error.message.includes("contract_mismatch"),
  );
});

test("evolution proposal lifecycle records stay metadata-only and proposal-only", async () => {
  const packet = buildEvolutionProposalSubmissionPacket(buildCapabilityPacket(), {
    profile: "adult_owner",
    traceId: "trace_evolution",
  });
  const draftRecord = buildDraftEvolutionProposalLifecycleRecord(packet, {
    draftedAt: "2026-06-24T00:00:00.000Z",
  });
  const submittedRecord = updateEvolutionProposalLifecycleAfterSubmission(
    draftRecord,
    buildResponse("trace_submit", "cos_trace_submit") as EvolutionProposalSubmissionResult,
    {
      submittedAt: "2026-06-24T00:01:00.000Z",
    },
  );
  const blockedRecord = updateEvolutionProposalLifecycleAfterFailure(draftRecord, "Descriptor handoff unavailable.", {
    updatedAt: "2026-06-24T00:02:00.000Z",
  });
  const records = upsertEvolutionProposalLifecycleRecord(
    upsertEvolutionProposalLifecycleRecord([], draftRecord),
    submittedRecord,
  );
  const storage = new Map<string, string>();

  assert.equal(submittedRecord.currentLifecycleState, "accepted_for_review");
  assert.equal(submittedRecord.intakeDecisionId, "decision_trace_submit");
  assert.equal(submittedRecord.intakeAuditId, "audit_trace_submit");
  assert.equal(submittedRecord.statusRefresh.available, false);
  assert.equal(submittedRecord.statusRefresh.reason, "descriptor_status_route_not_advertised");
  assert.equal(submittedRecord.boundary.proposalOnly, true);
  assert.equal(submittedRecord.boundary.evolutionApplied, false);
  assert.equal(submittedRecord.boundary.registryUpdatePerformed, false);
  assert.equal(submittedRecord.boundary.approvalCaptured, false);
  assert.equal(blockedRecord.currentLifecycleState, "blocked");
  assert.equal(records.length, 1);

  persistEvolutionProposalLifecycleRecords(
    {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    records,
  );
  const loaded = loadEvolutionProposalLifecycleRecords({
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  });
  const exported = exportEvolutionProposalLifecycleRecords(loaded, {
    generatedAt: "2026-06-24T00:03:00.000Z",
  });
  const exportedJson = JSON.stringify(exported);

  assert.equal(loaded.length, 1);
  assert.equal(exported.records[0]?.proposalId, packet.proposalId);
  assert.equal(exported.records[0]?.boundary.appliedLocally, false);
  assert.equal(exportedJson.includes("private.example"), false);
  assert.equal(exportedJson.includes("token"), false);
});
