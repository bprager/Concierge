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
} from "../src/capabilityTaxonomy.js";

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
  assert.equal(taxonomy.entries.some((entry) => entry.sourceLabel === "deploy" && entry.mergedInto === "deployment"), false);
  assert.equal(JSON.stringify(draft).includes("raw taxonomy text"), false);
});
