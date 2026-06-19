import assert from "node:assert/strict";
import test from "node:test";
import {
  appendCapabilitySignal,
  answerCapabilityQuestion,
  buildCapabilitySignal,
  createCapabilityLedger,
  exportCapabilityLedger,
} from "../src/capabilityLedger.js";
import {
  applyTaxonomyToSignal,
  createCapabilityTaxonomy,
  draftChiefOfStaffTaxonomyReview,
  getTaxonomyLabelCounts,
  markTaxonomyLabel,
  mergeTaxonomyLabels,
  renameTaxonomyLabel,
  resetCapabilityTaxonomy,
  serializeCapabilityTaxonomy,
  submitChiefOfStaffTaxonomyReviewDraft,
} from "../src/capabilityTaxonomy.js";
import { defaultChiefOfStaffDescriptor } from "../src/contractBridge.js";

function addWorkingSignal(
  ledger: ReturnType<typeof createCapabilityLedger>,
  options: { traceId: string; topic: string; intent?: string; capability: string; architecture?: "text_ui" | "memory_review" },
) {
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: options.traceId,
      conversationId: "conv_taxonomy",
      turnId: `turn_${options.traceId}`,
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: options.topic,
      intentLabel: options.intent ?? "preview",
      capabilityLabel: options.capability,
      capabilityStatus: "working",
      outcomeSignal: "rehearsed",
      confidence: 0.8,
      evidenceRefs: [`trace:${options.traceId}`],
      architectureArea: options.architecture ?? "text_ui",
      privacyClass: "metadata_only",
      suggestedNextStep: "no_action",
      rawMessage: "raw taxonomy text",
    }),
  );
}

test("renamed taxonomy labels appear in capability query answers without mutating source signals", () => {
  const ledger = createCapabilityLedger();
  addWorkingSignal(ledger, { traceId: "trace_rename", topic: "deployment", capability: "rehearsal_mode" });
  const taxonomy = createCapabilityTaxonomy();

  renameTaxonomyLabel(taxonomy, "topic", "deployment", "release_operations");

  const answer = answerCapabilityQuestion("What conversations are most common?", ledger, taxonomy);
  const [source] = ledger.listRecent();

  assert.ok(answer);
  if (!answer) throw new Error("expected taxonomy-aware answer");
  assert.equal(answer.rows[0].label, "release_operations");
  assert.equal(source.topicLabel, "deployment");
  assert.equal(JSON.stringify(taxonomy).includes("raw taxonomy text"), false);
});

test("merged taxonomy labels aggregate counts deterministically", () => {
  const ledger = createCapabilityLedger();
  addWorkingSignal(ledger, { traceId: "trace_merge_1", topic: "deploy", capability: "rehearsal_mode" });
  addWorkingSignal(ledger, { traceId: "trace_merge_2", topic: "deployment", capability: "rehearsal_mode" });
  const taxonomy = createCapabilityTaxonomy();

  mergeTaxonomyLabels(taxonomy, "topic", "deploy", "deployment");
  renameTaxonomyLabel(taxonomy, "topic", "deployment", "release_operations");

  const answer = answerCapabilityQuestion("What conversations are most common?", ledger, taxonomy);

  assert.ok(answer);
  if (!answer) throw new Error("expected taxonomy-aware answer");
  assert.equal(answer.rows[0].label, "release_operations");
  assert.equal(answer.rows[0].count, 2);
});

test("taxonomy markers are serialized and exported as local hints only", () => {
  const ledger = createCapabilityLedger();
  addWorkingSignal(ledger, { traceId: "trace_mark", topic: "memory", capability: "memory_proposal_review", architecture: "memory_review" });
  const taxonomy = createCapabilityTaxonomy();

  markTaxonomyLabel(taxonomy, "capability", "memory_proposal_review", "deprecated", true);
  markTaxonomyLabel(taxonomy, "capability", "memory_proposal_review", "splitCandidate", true);

  const serialized = serializeCapabilityTaxonomy(taxonomy);
  const exported = exportCapabilityLedger(ledger, { taxonomy });

  assert.equal(serialized.schemaVersion, "concierge.capability-taxonomy.v1");
  assert.equal(serialized.entries[0].deprecated, true);
  assert.equal(serialized.entries[0].splitCandidate, true);
  assert.ok(exported.taxonomy);
  if (!exported.taxonomy) throw new Error("expected exported taxonomy");
  assert.equal(exported.taxonomy.entries[0].dimension, "capability");
  assert.equal(exported.taxonomy.privacyCaveat.includes("local hints only"), true);
  assert.equal(exported.signals[0].recommendationBoundary.approvalCaptured, false);
  assert.equal(exported.signals[0].recommendationBoundary.memoryWriteAllowed, false);
  assert.equal(exported.signals[0].recommendationBoundary.agentDispatchAllowed, false);
  assert.equal(exported.signals[0].recommendationBoundary.externalSendAllowed, false);
});

test("taxonomy reset restores derived labels", () => {
  const ledger = createCapabilityLedger();
  addWorkingSignal(ledger, { traceId: "trace_reset", topic: "deployment", capability: "rehearsal_mode" });
  const taxonomy = createCapabilityTaxonomy();
  renameTaxonomyLabel(taxonomy, "topic", "deployment", "release_operations");

  resetCapabilityTaxonomy(taxonomy);
  const answer = answerCapabilityQuestion("What conversations are most common?", ledger, taxonomy);

  assert.ok(answer);
  if (!answer) throw new Error("expected reset answer");
  assert.equal(answer.rows[0].label, "deployment");
});

test("taxonomy label counts include edited labels across dimensions", () => {
  const ledger = createCapabilityLedger();
  addWorkingSignal(ledger, { traceId: "trace_counts_1", topic: "deployment", capability: "rehearsal_mode" });
  addWorkingSignal(ledger, { traceId: "trace_counts_2", topic: "memory", capability: "memory_proposal_review", architecture: "memory_review" });
  const taxonomy = createCapabilityTaxonomy();
  renameTaxonomyLabel(taxonomy, "capability", "rehearsal_mode", "governed_rehearsal");

  const counts = getTaxonomyLabelCounts(ledger.listRecent(), taxonomy);

  assert.equal(counts.topic.some((row) => row.label === "deployment" && row.count === 1), true);
  assert.equal(counts.capability.some((row) => row.label === "governed_rehearsal" && row.count === 1), true);
  assert.equal(counts.architecture.some((row) => row.label === "memory_review" && row.count === 1), true);
});

test("applying taxonomy preserves child protected minimization", () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_child_taxonomy",
      conversationId: "conv_child_taxonomy",
      turnId: "turn_child_taxonomy",
      profileMode: "child_protected_user",
      channel: "text",
      topicLabel: "school",
      intentLabel: "ask_help",
      capabilityLabel: "child_safe_response",
      capabilityStatus: "working",
      outcomeSignal: "answered",
      confidence: 0.7,
      evidenceRefs: ["trace:trace_child_taxonomy"],
      architectureArea: "text_ui",
      privacyClass: "metadata_only",
      suggestedNextStep: "no_action",
      rawMessage: "child raw taxonomy text",
    }),
  );
  const taxonomy = createCapabilityTaxonomy();
  renameTaxonomyLabel(taxonomy, "topic", "school", "learning_support");

  const edited = applyTaxonomyToSignal(ledger.listRecent()[0], taxonomy);

  assert.equal(edited.topicLabel, "learning_support");
  assert.equal(edited.profileMode, "child_protected_user");
  assert.equal(edited.privacyClass, "child_sensitive");
  assert.equal(JSON.stringify(edited).includes("child raw taxonomy text"), false);
});

test("drafts Chief of Staff taxonomy review without applying local edits", () => {
  const ledger = createCapabilityLedger();
  addWorkingSignal(ledger, { traceId: "trace_deploy_1", topic: "deploy", capability: "release_summary" });
  addWorkingSignal(ledger, { traceId: "trace_deploy_2", topic: "deploy", capability: "release_summary" });
  addWorkingSignal(ledger, { traceId: "trace_deployment_1", topic: "deployment", capability: "release_summary" });
  addWorkingSignal(ledger, { traceId: "trace_support_child", topic: "support", capability: "child_safe_response" });
  addWorkingSignal(ledger, { traceId: "trace_support_memory", topic: "support", capability: "memory_proposal_review", architecture: "memory_review" });
  const taxonomy = createCapabilityTaxonomy();
  markTaxonomyLabel(taxonomy, "capability", "memory_proposal_review", "deprecated", true);

  const draft = draftChiefOfStaffTaxonomyReview(ledger.listRecent(), taxonomy, {
    conversationId: "conv_taxonomy_review",
    traceId: "trace_taxonomy_review",
  });

  assert.equal(draft.reviewType, "chief_of_staff_taxonomy_review");
  assert.equal(draft.boundary.proposalOnly, true);
  assert.equal(draft.boundary.approvalCaptured, false);
  assert.equal(draft.boundary.memoryWriteAllowed, false);
  assert.equal(draft.boundary.agentDispatchAllowed, false);
  assert.equal(draft.boundary.externalSendAllowed, false);
  assert.equal(draft.recommendations.some((item) => item.action === "merge" && item.sourceLabel === "deploy" && item.targetLabel === "deployment"), true);
  assert.equal(draft.recommendations.some((item) => item.action === "split" && item.sourceLabel === "support"), true);
  assert.equal(draft.recommendations.some((item) => item.action === "deprecate" && item.sourceLabel === "memory_proposal_review"), true);
  assert.ok(draft.evaluatorCaseCandidate.expectedBehavior.includes("proposal-only"));
  assert.equal(draft.evolutionProposal.proposal_id, "evo_capability_taxonomy_review_trace_taxonomy_review");
  assert.equal(draft.evolutionProposal.change.requested_action, "review_taxonomy_cleanup");
  assert.equal(draft.evolutionProposal.evaluator_cases.includes(draft.evaluatorCaseCandidate.caseId), true);
  assert.equal(draft.evolutionProposal.evidence.includes("trace:trace_deploy_1"), true);
  assert.ok(draft.evolutionProposal.approval_required.includes("Napoleon Chief of Staff"));
  assert.ok(draft.evolutionProposal.rollback_plan.includes("Keep current local taxonomy labels"));
  assert.equal(taxonomy.entries.some((entry) => entry.sourceLabel === "deploy" && entry.mergedInto === "deployment"), false);
  assert.equal(JSON.stringify(draft).includes("raw taxonomy text"), false);
});

test("submits taxonomy review draft through governed bridge without applying local edits", async () => {
  const ledger = createCapabilityLedger();
  addWorkingSignal(ledger, { traceId: "trace_deploy_1", topic: "deploy", capability: "release_summary" });
  addWorkingSignal(ledger, { traceId: "trace_deployment_1", topic: "deployment", capability: "release_summary" });
  const taxonomy = createCapabilityTaxonomy();
  const draft = draftChiefOfStaffTaxonomyReview(ledger.listRecent(), taxonomy, {
    conversationId: "conv_taxonomy_review",
    traceId: "trace_taxonomy_review",
  });
  let posted: Record<string, unknown> | undefined;
  let targetUrl: string | undefined;
  let headers: Record<string, string> | undefined;

  const result = await submitChiefOfStaffTaxonomyReviewDraft(draft, {
    conversationId: "conv_taxonomy_review",
    traceId: "trace_taxonomy_submit",
    getEndpoint: () => "https://napoleon.example/concierge",
    getAuthToken: () => "taxonomy_token",
    descriptorConnection: {
      endpointConfigured: true,
      descriptor: defaultChiefOfStaffDescriptor,
      expectedChecksum: "sha256:local-static",
      actualChecksum: "sha256:local-static",
      signatureValid: true,
    },
    fetch: async (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
      targetUrl = url;
      headers = init?.headers;
      posted = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return {
        ok: true,
        json: async () => ({
          text: "Napoleon accepted the taxonomy review packet for review.",
          governanceDecision: {
            decision_id: "decision_taxonomy_review",
            request_id: "cos_trace_taxonomy_submit",
            outcome: "requires_review",
            authority_tier: "advisory_review",
            approval_requirement: "chief_of_staff_and_owner_review",
            rationale: "Taxonomy cleanup requires review before applying labels.",
            blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
            trace_id: "trace_taxonomy_submit",
            audit_id: "audit_taxonomy_review",
          },
          traceEnvelope: {
            trace_id: "trace_taxonomy_submit",
            parent_trace_id: "conv_taxonomy_review",
            actor_id: "napoleon.chief_of_staff",
            request_id: "cos_trace_taxonomy_submit",
            decision_id: "decision_taxonomy_review",
            timestamp: "2026-06-13T00:00:00.000Z",
          },
          auditEnvelope: {
            audit_id: "audit_taxonomy_review",
            trace_id: "trace_taxonomy_submit",
            decision_id: "decision_taxonomy_review",
            actor_id: "napoleon.chief_of_staff",
            authority_tier: "advisory_review",
            approval_requirement: "chief_of_staff_and_owner_review",
            evidence_links: ["trace:trace_taxonomy_submit"],
          },
          appliedLocally: false,
          memoryWritePerformed: false,
          approvalCaptured: false,
          agentDispatchPerformed: false,
          externalSendPerformed: false,
        }),
      };
    },
  });

  assert.equal(targetUrl, "https://napoleon.example/concierge/v1/concierge/chief-of-staff/steering");
  assert.equal(headers?.Authorization, "Bearer taxonomy_token");
  assert.equal(JSON.stringify(posted).includes("taxonomy_token"), false);
  assert.equal(posted?.requestKind, "chief_of_staff_steering_handoff");
  assert.equal((posted?.chiefOfStaffRequest as { request_type: string }).request_type, "evolution_proposal_review");
  assert.equal((posted?.recommendation as { capability: string }).capability, "capability_taxonomy_review");
  assert.equal((posted?.recommendation as { proposalOnly: boolean }).proposalOnly, true);
  assert.equal((posted?.taxonomyReview as { reviewType: string }).reviewType, "chief_of_staff_taxonomy_review");
  assert.equal((posted?.evolutionProposal as { proposal_id: string }).proposal_id, draft.evolutionProposal.proposal_id);
  assert.deepEqual(posted?.boundary, {
    proposalOnly: true,
    approvalCaptured: false,
    memoryWriteAllowed: false,
    agentDispatchAllowed: false,
    externalSendAllowed: false,
  });
  assert.equal(result.appliedLocally, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.agentDispatchPerformed, false);
  assert.equal(result.externalSendPerformed, false);
});

test("child protected taxonomy review handoff keeps child scope and guardian review", async () => {
  const ledger = createCapabilityLedger();
  addWorkingSignal(ledger, { traceId: "trace_child_taxonomy_1", topic: "support", capability: "child_safe_response" });
  addWorkingSignal(ledger, { traceId: "trace_child_taxonomy_2", topic: "support", capability: "homework_help" });
  const draft = draftChiefOfStaffTaxonomyReview(ledger.listRecent(), createCapabilityTaxonomy(), {
    conversationId: "conv_child_taxonomy_review",
    traceId: "trace_child_taxonomy_review",
    profile: "child_protected",
  });
  let posted: Record<string, unknown> | undefined;

  await submitChiefOfStaffTaxonomyReviewDraft(draft, {
    conversationId: "conv_child_taxonomy_review",
    traceId: "trace_child_taxonomy_submit",
    profile: "child_protected",
    getEndpoint: () => "https://napoleon.example/concierge",
    descriptorConnection: {
      endpointConfigured: true,
      descriptor: defaultChiefOfStaffDescriptor,
      expectedChecksum: "sha256:local-static",
      actualChecksum: "sha256:local-static",
      signatureValid: true,
    },
    fetch: async (_url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
      posted = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return {
        ok: true,
        json: async () => ({
          text: "Napoleon accepted the child taxonomy review packet for review.",
          governanceDecision: {
            decision_id: "decision_child_taxonomy_review",
            request_id: "cos_trace_child_taxonomy_submit",
            outcome: "requires_review",
            authority_tier: "advisory_review",
            approval_requirement: "guardian_and_owner_review",
            rationale: "Child-protected taxonomy review requires guardian and owner review.",
            blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
            trace_id: "trace_child_taxonomy_submit",
            audit_id: "audit_child_taxonomy_review",
          },
          traceEnvelope: {
            trace_id: "trace_child_taxonomy_submit",
            parent_trace_id: "conv_child_taxonomy_review",
            actor_id: "napoleon.chief_of_staff",
            request_id: "cos_trace_child_taxonomy_submit",
            decision_id: "decision_child_taxonomy_review",
            timestamp: "2026-06-15T00:00:00.000Z",
          },
          auditEnvelope: {
            audit_id: "audit_child_taxonomy_review",
            trace_id: "trace_child_taxonomy_submit",
            decision_id: "decision_child_taxonomy_review",
            actor_id: "napoleon.chief_of_staff",
            authority_tier: "advisory_review",
            approval_requirement: "guardian_and_owner_review",
            evidence_links: ["trace:trace_child_taxonomy_submit"],
          },
          appliedLocally: false,
          memoryWritePerformed: false,
          approvalCaptured: false,
          agentDispatchPerformed: false,
          externalSendPerformed: false,
        }),
      };
    },
  });

  assert.equal(posted?.profileMode, "child_protected_user");
  assert.equal((posted?.chiefOfStaffRequest as { profile_mode: string }).profile_mode, "child_protected_user");
  assert.equal(
    (posted?.governanceRequest as { action: string }).action,
    "submit_child_taxonomy_review_for_review",
  );
  assert.deepEqual((posted?.evolutionProposal as { affected_profiles: string[] }).affected_profiles, [
    "child_protected_user",
  ]);
  assert.equal(
    (posted?.evolutionProposal as { approval_required: string }).approval_required,
    "guardian_and_owner_review_required_before_child_protected_taxonomy_change",
  );
  assert.equal(
    (posted?.auditEnvelope as { approval_requirement: string }).approval_requirement,
    "guardian_and_owner_review_required_before_child_protected_taxonomy_change",
  );
});

test("taxonomy review handoff rejects an adult draft when child protected is active before fetch", async () => {
  const ledger = createCapabilityLedger();
  addWorkingSignal(ledger, { traceId: "trace_adult_taxonomy_1", topic: "deploy", capability: "release_summary" });
  addWorkingSignal(ledger, { traceId: "trace_adult_taxonomy_2", topic: "deployment", capability: "release_summary" });
  const draft = draftChiefOfStaffTaxonomyReview(ledger.listRecent(), createCapabilityTaxonomy(), {
    conversationId: "conv_taxonomy_profile_mismatch",
    traceId: "trace_taxonomy_adult_draft",
    profile: "adult_owner",
  });
  let fetchCalled = false;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffTaxonomyReviewDraft(draft, {
        conversationId: "conv_taxonomy_profile_mismatch",
        traceId: "trace_taxonomy_child_active",
        profile: "child_protected",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: {
          endpointConfigured: true,
          descriptor: defaultChiefOfStaffDescriptor,
          expectedChecksum: "sha256:local-static",
          actualChecksum: "sha256:local-static",
          signatureValid: true,
        },
        emit: (event) => events.push(event),
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("governance_no_go") &&
      (error as { profileMode?: string }).profileMode === "child_protected_user" &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) ===
        JSON.stringify([
          "memory_write",
          "agent_dispatch",
          "external_send",
          "approval_capture",
          "runtime_authority",
        ]),
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.event, "capability_taxonomy_review_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "governance_no_go");
  assert.equal(events.at(-1)?.attributes.profileMode, "child_protected_user");
});

test("taxonomy review handoff rejects a child draft when adult owner is active before fetch", async () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_child_taxonomy_mismatch",
      conversationId: "conv_child_taxonomy_mismatch",
      turnId: "turn_child_taxonomy_mismatch",
      profileMode: "child_protected_user",
      channel: "text",
      topicLabel: "support",
      intentLabel: "ask_help",
      capabilityLabel: "child_safe_response",
      capabilityStatus: "working",
      outcomeSignal: "answered",
      confidence: 0.7,
      evidenceRefs: ["trace:trace_child_taxonomy_mismatch"],
      architectureArea: "text_ui",
      privacyClass: "child_sensitive",
      suggestedNextStep: "no_action",
    }),
  );
  const draft = draftChiefOfStaffTaxonomyReview(ledger.listRecent(), createCapabilityTaxonomy(), {
    conversationId: "conv_taxonomy_profile_mismatch",
    traceId: "trace_taxonomy_child_draft",
    profile: "child_protected",
  });
  let fetchCalled = false;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffTaxonomyReviewDraft(draft, {
        conversationId: "conv_taxonomy_profile_mismatch",
        traceId: "trace_taxonomy_adult_active",
        profile: "adult_owner",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: {
          endpointConfigured: true,
          descriptor: defaultChiefOfStaffDescriptor,
          expectedChecksum: "sha256:local-static",
          actualChecksum: "sha256:local-static",
          signatureValid: true,
        },
        emit: (event) => events.push(event),
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("governance_no_go") &&
      (error as { profileMode?: string }).profileMode === "adult_owner" &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) ===
        JSON.stringify([
          "memory_write",
          "agent_dispatch",
          "external_send",
          "approval_capture",
          "runtime_authority",
        ]),
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.event, "capability_taxonomy_review_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "governance_no_go");
  assert.equal(events.at(-1)?.attributes.profileMode, "adult_owner");
});

test("taxonomy review handoff fails closed while Rehearsal Mode is active", async () => {
  const ledger = createCapabilityLedger();
  addWorkingSignal(ledger, { traceId: "trace_deploy_1", topic: "deploy", capability: "release_summary" });
  addWorkingSignal(ledger, { traceId: "trace_deployment_1", topic: "deployment", capability: "release_summary" });
  const draft = draftChiefOfStaffTaxonomyReview(ledger.listRecent(), createCapabilityTaxonomy(), {
    conversationId: "conv_taxonomy_review",
    traceId: "trace_taxonomy_review",
  });
  let fetchCalled = false;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffTaxonomyReviewDraft(draft, {
        conversationId: "conv_taxonomy_review",
        traceId: "trace_taxonomy_submit",
        profile: "child_protected",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: {
          endpointConfigured: true,
          descriptor: defaultChiefOfStaffDescriptor,
          expectedChecksum: "sha256:local-static",
          actualChecksum: "sha256:local-static",
          signatureValid: true,
        },
        rehearsalMode: true,
        emit: (event) => events.push(event),
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("governance_no_go") &&
      (error as { profileMode?: string }).profileMode === "child_protected_user" &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) ===
        JSON.stringify([
          "memory_write",
          "agent_dispatch",
          "external_send",
          "approval_capture",
          "runtime_authority",
        ]),
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.event, "capability_taxonomy_review_send_failed");
  assert.equal(events.at(-1)?.attributes.profileMode, "child_protected_user");
  assert.equal(events.at(-1)?.attributes.reason, "governance_no_go");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, [
    "memory_write",
    "agent_dispatch",
    "external_send",
    "approval_capture",
    "runtime_authority",
  ]);
});

test("taxonomy review handoff preserves descriptor checksum failure before fetch", async () => {
  const ledger = createCapabilityLedger();
  addWorkingSignal(ledger, { traceId: "trace_deploy_1", topic: "deploy", capability: "release_summary" });
  addWorkingSignal(ledger, { traceId: "trace_deployment_1", topic: "deployment", capability: "release_summary" });
  const draft = draftChiefOfStaffTaxonomyReview(ledger.listRecent(), createCapabilityTaxonomy(), {
    conversationId: "conv_taxonomy_review",
    traceId: "trace_taxonomy_review",
  });
  let fetchCalled = false;
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffTaxonomyReviewDraft(draft, {
        conversationId: "conv_taxonomy_review",
        traceId: "trace_taxonomy_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: {
          endpointConfigured: true,
          descriptor: defaultChiefOfStaffDescriptor,
          expectedChecksum: "sha256:expected",
          actualChecksum: "sha256:actual",
        },
        emit: (event) => events.push(event),
        fetch: async () => {
          fetchCalled = true;
          return { ok: true, json: async () => ({}) };
        },
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("descriptor_mismatch") &&
      (error as { descriptorFailureReason?: string }).descriptorFailureReason ===
        "descriptor_signature_or_checksum_mismatch",
  );

  assert.equal(fetchCalled, false);
  assert.equal(events.at(-1)?.event, "capability_taxonomy_review_send_failed");
  assert.equal(events.at(-1)?.attributes.descriptorFailureReason, "descriptor_signature_or_checksum_mismatch");
});

test("taxonomy review handoff fails closed when Napoleon returns no-go", async () => {
  const ledger = createCapabilityLedger();
  addWorkingSignal(ledger, { traceId: "trace_deploy_1", topic: "deploy", capability: "release_summary" });
  addWorkingSignal(ledger, { traceId: "trace_deployment_1", topic: "deployment", capability: "release_summary" });
  const draft = draftChiefOfStaffTaxonomyReview(ledger.listRecent(), createCapabilityTaxonomy(), {
    conversationId: "conv_taxonomy_review",
    traceId: "trace_taxonomy_review",
  });
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];
  const blockedEffects = ["memory_write", "agent_dispatch", "external_send", "approval_capture"];

  await assert.rejects(
    () =>
      submitChiefOfStaffTaxonomyReviewDraft(draft, {
        conversationId: "conv_taxonomy_review",
        traceId: "trace_taxonomy_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: {
          endpointConfigured: true,
          descriptor: defaultChiefOfStaffDescriptor,
          expectedChecksum: "sha256:local-static",
          actualChecksum: "sha256:local-static",
          signatureValid: true,
        },
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            text: "Napoleon blocked the taxonomy review packet.",
            governanceDecision: {
              decision_id: "decision_taxonomy_no_go",
              request_id: "cos_trace_taxonomy_submit",
              outcome: "no_go",
              authority_tier: "prohibited",
              approval_requirement: "not_available",
              rationale: "Taxonomy review is not executable for this request.",
              blocked_effects: blockedEffects,
              trace_id: "trace_taxonomy_submit",
              audit_id: "audit_taxonomy_no_go",
            },
            traceEnvelope: {
              trace_id: "trace_taxonomy_submit",
              parent_trace_id: "conv_taxonomy_review",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_taxonomy_submit",
              decision_id: "decision_taxonomy_no_go",
              timestamp: "2026-06-15T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_taxonomy_no_go",
              trace_id: "trace_taxonomy_submit",
              decision_id: "decision_taxonomy_no_go",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "prohibited",
              approval_requirement: "not_available",
              evidence_links: ["trace:trace_taxonomy_submit"],
            },
            appliedLocally: false,
            memoryWritePerformed: false,
            approvalCaptured: false,
            agentDispatchPerformed: false,
            externalSendPerformed: false,
          }),
        }),
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("governance_no_go") &&
      (error as { decisionId?: string }).decisionId === "decision_taxonomy_no_go" &&
      (error as { auditId?: string }).auditId === "audit_taxonomy_no_go" &&
      (error as { governanceOutcome?: string }).governanceOutcome === "no_go" &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(blockedEffects),
  );

  assert.equal(events.at(-1)?.event, "capability_taxonomy_review_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "governance_no_go");
  assert.equal(events.at(-1)?.attributes.decisionId, "decision_taxonomy_no_go");
  assert.equal(events.at(-1)?.attributes.auditId, "audit_taxonomy_no_go");
  assert.equal(events.at(-1)?.attributes.governanceOutcome, "no_go");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, blockedEffects);
});

test("taxonomy review handoff rejects response claims that apply taxonomy or side effects", async () => {
  const ledger = createCapabilityLedger();
  addWorkingSignal(ledger, { traceId: "trace_deploy_1", topic: "deploy", capability: "release_summary" });
  addWorkingSignal(ledger, { traceId: "trace_deployment_1", topic: "deployment", capability: "release_summary" });
  const draft = draftChiefOfStaffTaxonomyReview(ledger.listRecent(), createCapabilityTaxonomy(), {
    conversationId: "conv_taxonomy_review",
    traceId: "trace_taxonomy_review",
  });
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffTaxonomyReviewDraft(draft, {
        conversationId: "conv_taxonomy_review",
        traceId: "trace_taxonomy_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: {
          endpointConfigured: true,
          descriptor: defaultChiefOfStaffDescriptor,
          expectedChecksum: "sha256:local-static",
          actualChecksum: "sha256:local-static",
          signatureValid: true,
        },
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          json: async () => ({
            text: "Napoleon reviewed and applied the taxonomy cleanup.",
            governanceDecision: {
              decision_id: "decision_taxonomy_side_effect",
              request_id: "cos_trace_taxonomy_submit",
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              rationale: "Review responses must not apply local taxonomy changes.",
              blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
              trace_id: "trace_taxonomy_submit",
              audit_id: "audit_taxonomy_side_effect",
            },
            traceEnvelope: {
              trace_id: "trace_taxonomy_submit",
              parent_trace_id: "conv_taxonomy_review",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_taxonomy_submit",
              decision_id: "decision_taxonomy_side_effect",
              timestamp: "2026-06-13T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_taxonomy_side_effect",
              trace_id: "trace_taxonomy_submit",
              decision_id: "decision_taxonomy_side_effect",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              evidence_links: ["trace:trace_taxonomy_submit"],
            },
            appliedLocally: true,
            memoryWritePerformed: true,
            approvalCaptured: true,
            externalSendPerformed: true,
            agentDispatchPerformed: true,
          }),
        }),
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch"),
  );

  assert.equal(events.at(-1)?.event, "capability_taxonomy_review_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, [
    "memory_write",
    "agent_dispatch",
    "external_send",
    "approval_capture",
    "runtime_authority",
  ]);
});

test("taxonomy review handoff rejects response text that claims taxonomy application", async () => {
  const ledger = createCapabilityLedger();
  addWorkingSignal(ledger, { traceId: "trace_deploy_1", topic: "deploy", capability: "release_summary" });
  addWorkingSignal(ledger, { traceId: "trace_deployment_1", topic: "deployment", capability: "release_summary" });
  const draft = draftChiefOfStaffTaxonomyReview(ledger.listRecent(), createCapabilityTaxonomy(), {
    conversationId: "conv_taxonomy_review",
    traceId: "trace_taxonomy_review",
  });
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffTaxonomyReviewDraft(draft, {
        conversationId: "conv_taxonomy_review",
        traceId: "trace_taxonomy_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: {
          endpointConfigured: true,
          descriptor: defaultChiefOfStaffDescriptor,
          expectedChecksum: "sha256:local-static",
          actualChecksum: "sha256:local-static",
          signatureValid: true,
        },
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            text: "Napoleon reviewed the taxonomy and applied the proposal locally.",
            governanceDecision: {
              decision_id: "decision_taxonomy_text_side_effect",
              request_id: "cos_trace_taxonomy_submit",
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              rationale: "Review response text must not claim taxonomy application.",
              blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
              trace_id: "trace_taxonomy_submit",
              audit_id: "audit_taxonomy_text_side_effect",
            },
            traceEnvelope: {
              trace_id: "trace_taxonomy_submit",
              parent_trace_id: "conv_taxonomy_review",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_taxonomy_submit",
              decision_id: "decision_taxonomy_text_side_effect",
              timestamp: "2026-06-13T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_taxonomy_text_side_effect",
              trace_id: "trace_taxonomy_submit",
              decision_id: "decision_taxonomy_text_side_effect",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              evidence_links: ["trace:trace_taxonomy_submit"],
            },
            appliedLocally: false,
            memoryWritePerformed: false,
            approvalCaptured: false,
            externalSendPerformed: false,
            agentDispatchPerformed: false,
          }),
        }),
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch"),
  );

  assert.equal(events.at(-1)?.event, "capability_taxonomy_review_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
});

test("taxonomy review handoff rejects review responses that omit explicit false side-effect boundaries", async () => {
  const ledger = createCapabilityLedger();
  addWorkingSignal(ledger, { traceId: "trace_deploy_1", topic: "deploy", capability: "release_summary" });
  addWorkingSignal(ledger, { traceId: "trace_deployment_1", topic: "deployment", capability: "release_summary" });
  const draft = draftChiefOfStaffTaxonomyReview(ledger.listRecent(), createCapabilityTaxonomy(), {
    conversationId: "conv_taxonomy_review",
    traceId: "trace_taxonomy_review",
  });
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffTaxonomyReviewDraft(draft, {
        conversationId: "conv_taxonomy_review",
        traceId: "trace_taxonomy_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: {
          endpointConfigured: true,
          descriptor: defaultChiefOfStaffDescriptor,
          expectedChecksum: "sha256:local-static",
          actualChecksum: "sha256:local-static",
          signatureValid: true,
        },
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            text: "Napoleon accepted the taxonomy review packet for review.",
            governanceDecision: {
              decision_id: "decision_taxonomy_omitted_boundaries",
              request_id: "cos_trace_taxonomy_submit",
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              rationale: "Review responses must carry explicit side-effect boundaries.",
              blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
              trace_id: "trace_taxonomy_submit",
              audit_id: "audit_taxonomy_omitted_boundaries",
            },
            traceEnvelope: {
              trace_id: "trace_taxonomy_submit",
              parent_trace_id: "conv_taxonomy_review",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_taxonomy_submit",
              decision_id: "decision_taxonomy_omitted_boundaries",
              timestamp: "2026-06-13T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_taxonomy_omitted_boundaries",
              trace_id: "trace_taxonomy_submit",
              decision_id: "decision_taxonomy_omitted_boundaries",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              evidence_links: ["trace:trace_taxonomy_submit"],
            },
          }),
        }),
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch"),
  );

  assert.equal(events.at(-1)?.event, "capability_taxonomy_review_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
});

test("taxonomy review handoff rejects review responses that omit canonical required text", async () => {
  const ledger = createCapabilityLedger();
  addWorkingSignal(ledger, { traceId: "trace_deploy_1", topic: "deploy", capability: "release_summary" });
  addWorkingSignal(ledger, { traceId: "trace_deployment_1", topic: "deployment", capability: "release_summary" });
  const draft = draftChiefOfStaffTaxonomyReview(ledger.listRecent(), createCapabilityTaxonomy(), {
    conversationId: "conv_taxonomy_review",
    traceId: "trace_taxonomy_review",
  });
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];

  await assert.rejects(
    () =>
      submitChiefOfStaffTaxonomyReviewDraft(draft, {
        conversationId: "conv_taxonomy_review",
        traceId: "trace_taxonomy_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: {
          endpointConfigured: true,
          descriptor: defaultChiefOfStaffDescriptor,
          expectedChecksum: "sha256:local-static",
          actualChecksum: "sha256:local-static",
          signatureValid: true,
        },
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            governanceDecision: {
              decision_id: "decision_taxonomy_missing_text",
              request_id: "cos_trace_taxonomy_submit",
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              rationale: "Review responses must carry generated contract fields.",
              blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
              trace_id: "trace_taxonomy_submit",
              audit_id: "audit_taxonomy_missing_text",
            },
            traceEnvelope: {
              trace_id: "trace_taxonomy_submit",
              parent_trace_id: "conv_taxonomy_review",
              actor_id: "napoleon.chief_of_staff",
              request_id: "cos_trace_taxonomy_submit",
              decision_id: "decision_taxonomy_missing_text",
              timestamp: "2026-06-13T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_taxonomy_missing_text",
              trace_id: "trace_taxonomy_submit",
              decision_id: "decision_taxonomy_missing_text",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              evidence_links: ["trace:trace_taxonomy_submit"],
            },
            appliedLocally: false,
            memoryWritePerformed: false,
            approvalCaptured: false,
            externalSendPerformed: false,
            agentDispatchPerformed: false,
          }),
        }),
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch"),
  );

  assert.equal(events.at(-1)?.event, "capability_taxonomy_review_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
});

test("taxonomy review handoff rejects unreadable review response bodies", async () => {
  const ledger = createCapabilityLedger();
  addWorkingSignal(ledger, { traceId: "trace_deploy_1", topic: "deploy", capability: "release_summary" });
  addWorkingSignal(ledger, { traceId: "trace_deployment_1", topic: "deployment", capability: "release_summary" });
  const draft = draftChiefOfStaffTaxonomyReview(ledger.listRecent(), createCapabilityTaxonomy(), {
    conversationId: "conv_taxonomy_review",
    traceId: "trace_taxonomy_review",
  });
  const events: Array<{ event: string; attributes: Record<string, unknown> }> = [];
  const blockedEffects = [
    "memory_write",
    "agent_dispatch",
    "external_send",
    "approval_capture",
    "runtime_authority",
  ];

  await assert.rejects(
    () =>
      submitChiefOfStaffTaxonomyReviewDraft(draft, {
        conversationId: "conv_taxonomy_review",
        traceId: "trace_taxonomy_submit",
        getEndpoint: () => "https://napoleon.example/concierge",
        descriptorConnection: {
          endpointConfigured: true,
          descriptor: defaultChiefOfStaffDescriptor,
          expectedChecksum: "sha256:local-static",
          actualChecksum: "sha256:local-static",
          signatureValid: true,
        },
        emit: (event) => events.push(event),
        fetch: async () => ({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error("private taxonomy response detail");
          },
        }),
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "NapoleonBridgeError" &&
      error.message.includes("contract_mismatch") &&
      "blockedEffects" in error &&
      JSON.stringify((error as { blockedEffects?: string[] }).blockedEffects) === JSON.stringify(blockedEffects),
  );

  assert.equal(events.at(-1)?.event, "capability_taxonomy_review_send_failed");
  assert.equal(events.at(-1)?.attributes.reason, "contract_mismatch");
  assert.deepEqual(events.at(-1)?.attributes.blockedEffects, blockedEffects);
  assert.equal(JSON.stringify(events).includes("private taxonomy response detail"), false);
});
