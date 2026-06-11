import assert from "node:assert/strict";
import test from "node:test";
import {
  appendCapabilitySignal,
  answerCapabilityQuestion,
  aggregateCapabilitySignals,
  buildCapabilitySignal,
  clearCapabilityLedger,
  createCapabilityLedger,
  deriveCapabilitySignalFromEvent,
  deserializeCapabilityLedger,
  exportCapabilityLedger,
  serializeCapabilityLedger,
  type ConversationCapabilitySignal,
} from "../src/capabilityLedger.js";
import { createCapabilityTaxonomy, renameTaxonomyLabel } from "../src/capabilityTaxonomy.js";

function testSignal(
  traceId: string,
  options: {
    observedAt?: string;
    topic?: string;
    capability?: string;
    status?: "working" | "degraded" | "missing" | "blocked" | "unknown";
    architecture?: "text_ui" | "bridge" | "governance_ux" | "memory_review" | "settings_privacy" | "observability" | "evaluator" | "voice" | "avatar" | "napoleon_runtime" | "agent_registry";
    suggestedNextStep?: "no_action" | "write_evaluator_case" | "add_backlog_item" | "create_evolution_proposal" | "needs_human_review";
    profileMode?: "adult_owner" | "child_protected_user" | "guest" | "collaborator";
    rawMessage?: string;
  } = {},
): ConversationCapabilitySignal {
  return buildCapabilitySignal({
    traceId,
    conversationId: `conv_${traceId}`,
    turnId: `turn_${traceId}`,
    profileMode: options.profileMode ?? "adult_owner",
    channel: "text",
    topicLabel: options.topic ?? "deployment",
    intentLabel: "summarize",
    capabilityLabel: options.capability ?? "release_summary",
    capabilityStatus: options.status ?? "working",
    outcomeSignal: options.status === "missing" ? "bridge_failed" : "answered",
    confidence: 0.8,
    evidenceRefs: [`trace:${traceId}`],
    architectureArea: options.architecture ?? "text_ui",
    privacyClass: "metadata_only",
    suggestedNextStep: options.suggestedNextStep ?? "no_action",
    observedAt: options.observedAt,
    rawMessage: options.rawMessage,
  });
}

test("builds valid capability signals without storing raw message text", () => {
  const signal = buildCapabilitySignal({
    traceId: "trace_signal",
    conversationId: "conv_signal",
    turnId: "turn_signal",
    profileMode: "adult_owner",
    channel: "text",
    topicLabel: "deployment",
    intentLabel: "summarize",
    capabilityLabel: "text_rehearsal",
    capabilityStatus: "working",
    outcomeSignal: "rehearsed",
    confidence: 0.82,
    evidenceRefs: ["trace:trace_signal", "event:rehearsal_preview_created"],
    architectureArea: "text_ui",
    privacyClass: "metadata_only",
    suggestedNextStep: "no_action",
    rawMessage: "Remember this raw text must never be stored",
  });

  assert.equal(signal.traceId, "trace_signal");
  assert.equal(signal.eventName, "conversation_capability_signal");
  assert.equal(signal.capabilityStatus, "working");
  assert.equal(signal.outcomeSignal, "rehearsed");
  assert.equal(signal.confidence, 0.82);
  assert.equal("rawMessage" in signal, false);
  assert.equal(JSON.stringify(signal).includes("raw text"), false);
});

test("ledger stores bounded recent signals and aggregates by required dimensions", () => {
  const ledger = createCapabilityLedger({ maxSignals: 2 });
  const first = buildCapabilitySignal({
    traceId: "trace_old",
    conversationId: "conv",
    turnId: "turn_old",
    profileMode: "adult_owner",
    channel: "text",
    topicLabel: "old",
    intentLabel: "summarize",
    capabilityLabel: "old_capability",
    capabilityStatus: "working",
    outcomeSignal: "answered",
    confidence: 0.9,
    evidenceRefs: ["trace:trace_old"],
    architectureArea: "text_ui",
    privacyClass: "metadata_only",
    suggestedNextStep: "no_action",
  });
  const second = { ...first, traceId: "trace_memory", turnId: "turn_memory", topicLabel: "memory", capabilityLabel: "memory_review", architectureArea: "memory_review" } satisfies ConversationCapabilitySignal;
  const third = { ...first, traceId: "trace_bridge", turnId: "turn_bridge", topicLabel: "bridge", capabilityLabel: "bridge_failure", capabilityStatus: "missing", outcomeSignal: "bridge_failed", architectureArea: "bridge", suggestedNextStep: "write_evaluator_case" } satisfies ConversationCapabilitySignal;

  appendCapabilitySignal(ledger, first);
  appendCapabilitySignal(ledger, second);
  appendCapabilitySignal(ledger, third);

  const recent = ledger.listRecent();
  assert.equal(recent.length, 2);
  assert.deepEqual(recent.map((signal) => signal.traceId), ["trace_memory", "trace_bridge"]);

  const aggregate = aggregateCapabilitySignals(recent);
  assert.equal(aggregate.byTopic.memory, 1);
  assert.equal(aggregate.byTopic.bridge, 1);
  assert.equal(aggregate.byCapability.memory_review, 1);
  assert.equal(aggregate.byStatus.missing, 1);
  assert.equal(aggregate.byArchitectureArea.bridge, 1);
});

test("child protected signals use stricter privacy class and no raw content", () => {
  const signal = buildCapabilitySignal({
    traceId: "trace_child",
    conversationId: "conv_child",
    turnId: "turn_child",
    profileMode: "child_protected_user",
    channel: "text",
    topicLabel: "school",
    intentLabel: "ask_help",
    capabilityLabel: "child_safe_response",
    capabilityStatus: "working",
    outcomeSignal: "answered",
    confidence: 0.7,
    evidenceRefs: ["trace:trace_child"],
    architectureArea: "text_ui",
    privacyClass: "metadata_only",
    suggestedNextStep: "no_action",
    rawMessage: "child raw content",
  });

  assert.equal(signal.privacyClass, "child_sensitive");
  assert.equal(JSON.stringify(signal).includes("child raw content"), false);
});

test("blocked governance outcomes are separate from failed safe requests", () => {
  const reviewRequired = deriveCapabilitySignalFromEvent("governance_review_required", {
    traceId: "trace_review_required",
    conversationId: "conv_review_required",
    turnId: "turn_review_required",
    profile: "adult_owner",
  });
  const blocked = deriveCapabilitySignalFromEvent("governance_review_blocked", {
    traceId: "trace_blocked",
    conversationId: "conv_blocked",
    turnId: "turn_blocked",
    profile: "adult_owner",
    outcome: "no_go",
  });
  const failed = deriveCapabilitySignalFromEvent("response_failed", {
    traceId: "trace_failed",
    conversationId: "conv_failed",
    turnId: "turn_failed",
    profile: "adult_owner",
  });

  assert.equal(reviewRequired.capabilityStatus, "degraded");
  assert.equal(reviewRequired.outcomeSignal, "review_required");
  assert.equal(reviewRequired.suggestedNextStep, "needs_human_review");
  assert.equal(blocked.capabilityStatus, "blocked");
  assert.equal(blocked.outcomeSignal, "blocked");
  assert.equal(blocked.suggestedNextStep, "no_action");
  assert.equal(failed.capabilityStatus, "missing");
  assert.equal(failed.outcomeSignal, "bridge_failed");
  assert.equal(failed.suggestedNextStep, "write_evaluator_case");
});

test("capability recommendations remain proposal-only and non-authoritative", () => {
  const signal = deriveCapabilitySignalFromEvent("memory_proposal_acknowledged_locally", {
    traceId: "trace_memory_ack",
    conversationId: "conv_memory_ack",
    turnId: "turn_memory_ack",
    profile: "adult_owner",
  });

  assert.equal(signal.suggestedNextStep, "create_evolution_proposal");
  assert.equal(signal.recommendationBoundary.proposalOnly, true);
  assert.equal(signal.recommendationBoundary.approvalCaptured, false);
  assert.equal(signal.recommendationBoundary.memoryWriteAllowed, false);
  assert.equal(signal.recommendationBoundary.agentDispatchAllowed, false);
  assert.equal(signal.recommendationBoundary.externalSendAllowed, false);
});

test("answers common conversation questions from local aggregates", () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_common_1",
      conversationId: "conv_common",
      turnId: "turn_common_1",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "deployment",
      intentLabel: "summarize",
      capabilityLabel: "text_response_generation",
      capabilityStatus: "working",
      outcomeSignal: "answered",
      confidence: 0.8,
      evidenceRefs: ["trace:trace_common_1"],
      architectureArea: "text_ui",
      privacyClass: "metadata_only",
      suggestedNextStep: "no_action",
      rawMessage: "raw deployment content",
    }),
  );
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_common_2",
      conversationId: "conv_common",
      turnId: "turn_common_2",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "deployment",
      intentLabel: "plan",
      capabilityLabel: "rehearsal_mode",
      capabilityStatus: "working",
      outcomeSignal: "rehearsed",
      confidence: 0.84,
      evidenceRefs: ["trace:trace_common_2"],
      architectureArea: "text_ui",
      privacyClass: "metadata_only",
      suggestedNextStep: "no_action",
      rawMessage: "another raw deployment content",
    }),
  );

  const answer = answerCapabilityQuestion("What conversations are most common?", ledger);

  assert.ok(answer);
  if (!answer) throw new Error("expected capability answer");
  assert.equal(answer.kind, "common_conversations");
  assert.ok(answer.summary.includes("deployment"));
  assert.equal(answer.rows[0].label, "deployment");
  assert.equal(answer.rows[0].count, 2);
  assert.ok(answer.caveat.includes("local metadata"));
  assert.equal(answer.boundary.proposalOnly, true);
  assert.equal(JSON.stringify(answer).includes("raw deployment content"), false);
});

test("answers missing or blocked capability questions separately from successful safety blocks", () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    deriveCapabilitySignalFromEvent("response_failed", {
      traceId: "trace_missing",
      conversationId: "conv_missing",
      turnId: "turn_missing",
      profile: "adult_owner",
    }),
  );
  appendCapabilitySignal(
    ledger,
    deriveCapabilitySignalFromEvent("governance_review_blocked", {
      traceId: "trace_blocked_query",
      conversationId: "conv_blocked_query",
      turnId: "turn_blocked_query",
      profile: "adult_owner",
    }),
  );

  const answer = answerCapabilityQuestion("What capabilities are missing or blocked?", ledger);

  assert.ok(answer);
  if (!answer) throw new Error("expected capability answer");
  assert.equal(answer.kind, "missing_or_blocked_capabilities");
  assert.ok(answer.summary.includes("bridge_failure_handling"));
  assert.ok(answer.summary.includes("governance_review"));
  assert.equal(answer.rows.some((row) => row.status === "missing" && row.label === "bridge_failure_handling"), true);
  assert.equal(answer.rows.some((row) => row.status === "blocked" && row.label === "governance_review"), true);
  assert.ok(answer.caveat.includes("blocked can mean governance worked"));
  assert.equal(answer.boundary.approvalCaptured, false);
  assert.equal(answer.boundary.memoryWriteAllowed, false);
  assert.equal(answer.boundary.agentDispatchAllowed, false);
  assert.equal(answer.boundary.externalSendAllowed, false);
});

test("answers working-well conversation questions from local working signals", () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_working_1",
      conversationId: "conv_working",
      turnId: "turn_working_1",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "memory",
      intentLabel: "review_memory_proposal",
      capabilityLabel: "memory_proposal_review",
      capabilityStatus: "working",
      outcomeSignal: "review_required",
      confidence: 0.9,
      evidenceRefs: ["trace:trace_working_1"],
      architectureArea: "memory_review",
      privacyClass: "metadata_only",
      suggestedNextStep: "no_action",
      rawMessage: "raw memory content",
    }),
  );
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_working_2",
      conversationId: "conv_working",
      turnId: "turn_working_2",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "memory",
      intentLabel: "review_memory_proposal",
      capabilityLabel: "memory_proposal_review",
      capabilityStatus: "working",
      outcomeSignal: "review_required",
      confidence: 0.82,
      evidenceRefs: ["trace:trace_working_2"],
      architectureArea: "memory_review",
      privacyClass: "metadata_only",
      suggestedNextStep: "no_action",
    }),
  );
  appendCapabilitySignal(
    ledger,
    deriveCapabilitySignalFromEvent("response_failed", {
      traceId: "trace_not_working",
      conversationId: "conv_not_working",
      turnId: "turn_not_working",
      profile: "adult_owner",
    }),
  );

  const answer = answerCapabilityQuestion("What conversations are working well?", ledger);

  assert.ok(answer);
  if (!answer) throw new Error("expected capability answer");
  assert.equal(answer.kind, "working_well_conversations");
  assert.ok(answer.summary.includes("memory_proposal_review"));
  assert.equal(answer.rows[0].label, "memory_proposal_review");
  assert.equal(answer.rows[0].count, 2);
  assert.equal(answer.rows[0].status, "working");
  assert.equal(answer.rows[0].architectureArea, "memory_review");
  assert.ok(answer.caveat.includes("local metadata"));
  assert.equal(JSON.stringify(answer).includes("raw memory content"), false);
});

test("answers easy-to-evolve missing capability questions with deterministic proposal ranking", () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    deriveCapabilitySignalFromEvent("response_failed", {
      traceId: "trace_missing_easy_1",
      conversationId: "conv_missing_easy",
      turnId: "turn_missing_easy_1",
      profile: "adult_owner",
    }),
  );
  appendCapabilitySignal(
    ledger,
    deriveCapabilitySignalFromEvent("response_failed", {
      traceId: "trace_missing_easy_2",
      conversationId: "conv_missing_easy",
      turnId: "turn_missing_easy_2",
      profile: "adult_owner",
    }),
  );
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_missing_runtime",
      conversationId: "conv_missing_runtime",
      turnId: "turn_missing_runtime",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "delegation",
      intentLabel: "delegate_task",
      capabilityLabel: "napoleon_delegation",
      capabilityStatus: "missing",
      outcomeSignal: "bridge_failed",
      confidence: 0.75,
      evidenceRefs: ["trace:trace_missing_runtime"],
      architectureArea: "napoleon_runtime",
      privacyClass: "metadata_only",
      suggestedNextStep: "create_evolution_proposal",
    }),
  );
  appendCapabilitySignal(
    ledger,
    deriveCapabilitySignalFromEvent("governance_review_blocked", {
      traceId: "trace_correctly_blocked",
      conversationId: "conv_correctly_blocked",
      turnId: "turn_correctly_blocked",
      profile: "adult_owner",
    }),
  );

  const answer = answerCapabilityQuestion("What capabilities are missing but easy to evolve?", ledger);

  assert.ok(answer);
  if (!answer) throw new Error("expected capability answer");
  assert.equal(answer.kind, "easy_to_evolve_missing_capabilities");
  assert.equal(answer.rows[0].label, "bridge_failure_handling");
  assert.equal(answer.rows[0].status, "missing");
  assert.equal(answer.rows[0].architectureArea, "bridge");
  assert.equal(answer.rows.some((row) => row.label === "governance_review"), false);
  assert.ok(answer.summary.includes("proposal-only"));
  assert.ok(answer.caveat.includes("telemetry is disabled"));
  assert.equal(answer.boundary.memoryWriteAllowed, false);
});

test("answers architecture improvement questions from missing safe request areas", () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    deriveCapabilitySignalFromEvent("response_failed", {
      traceId: "trace_bridge_area_1",
      conversationId: "conv_bridge_area",
      turnId: "turn_bridge_area_1",
      profile: "adult_owner",
    }),
  );
  appendCapabilitySignal(
    ledger,
    deriveCapabilitySignalFromEvent("response_failed", {
      traceId: "trace_bridge_area_2",
      conversationId: "conv_bridge_area",
      turnId: "turn_bridge_area_2",
      profile: "adult_owner",
    }),
  );
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_eval_area",
      conversationId: "conv_eval_area",
      turnId: "turn_eval_area",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "evaluation",
      intentLabel: "validate",
      capabilityLabel: "live_eval_fixture",
      capabilityStatus: "missing",
      outcomeSignal: "bridge_failed",
      confidence: 0.7,
      evidenceRefs: ["trace:trace_eval_area"],
      architectureArea: "evaluator",
      privacyClass: "metadata_only",
      suggestedNextStep: "write_evaluator_case",
    }),
  );
  appendCapabilitySignal(
    ledger,
    deriveCapabilitySignalFromEvent("governance_review_blocked", {
      traceId: "trace_blocked_area",
      conversationId: "conv_blocked_area",
      turnId: "turn_blocked_area",
      profile: "adult_owner",
    }),
  );

  const answer = answerCapabilityQuestion(
    "What part of the Concierge architecture has to be improved to fix missing capabilities?",
    ledger,
  );

  assert.ok(answer);
  if (!answer) throw new Error("expected capability answer");
  assert.equal(answer.kind, "architecture_improvement_areas");
  assert.equal(answer.rows[0].label, "bridge");
  assert.equal(answer.rows[0].count, 2);
  assert.equal(answer.rows.some((row) => row.label === "governance_ux"), false);
  assert.ok(answer.summary.includes("Architecture areas"));
  assert.ok(answer.caveat.includes("Correctly blocked unsafe requests are excluded"));
});

test("answers next capability recommendation questions without granting authority", () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    deriveCapabilitySignalFromEvent("response_failed", {
      traceId: "trace_next_bridge",
      conversationId: "conv_next_bridge",
      turnId: "turn_next_bridge",
      profile: "adult_owner",
    }),
  );
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_next_memory",
      conversationId: "conv_next_memory",
      turnId: "turn_next_memory",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "memory",
      intentLabel: "review_memory_proposal",
      capabilityLabel: "memory_proposal_review",
      capabilityStatus: "working",
      outcomeSignal: "review_required",
      confidence: 0.9,
      evidenceRefs: ["trace:trace_next_memory"],
      architectureArea: "memory_review",
      privacyClass: "metadata_only",
      suggestedNextStep: "create_evolution_proposal",
    }),
  );
  appendCapabilitySignal(
    ledger,
    deriveCapabilitySignalFromEvent("governance_review_blocked", {
      traceId: "trace_next_blocked",
      conversationId: "conv_next_blocked",
      turnId: "turn_next_blocked",
      profile: "adult_owner",
    }),
  );

  const answer = answerCapabilityQuestion("What capabilities should be implemented next?", ledger);

  assert.ok(answer);
  if (!answer) throw new Error("expected capability answer");
  assert.equal(answer.kind, "recommended_next_capabilities");
  assert.equal(answer.rows[0].label, "bridge_failure_handling");
  assert.equal(answer.rows[0].status, "missing");
  assert.equal(answer.rows.some((row) => row.label === "governance_review"), false);
  assert.ok(answer.summary.includes("proposal-only"));
  assert.equal(answer.boundary.approvalCaptured, false);
  assert.equal(answer.boundary.agentDispatchAllowed, false);
  assert.equal(answer.boundary.externalSendAllowed, false);
});

test("does not answer unrelated questions as capability intelligence queries", () => {
  const ledger = createCapabilityLedger();

  const answer = answerCapabilityQuestion("Draft a bridge plan", ledger);

  assert.equal(answer, null);
});

test("serializes capability ledger as versioned metadata without raw user text", () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_persist",
      conversationId: "conv_persist",
      turnId: "turn_persist",
      profileMode: "adult_owner",
      channel: "text",
      topicLabel: "deployment",
      intentLabel: "summarize",
      capabilityLabel: "rehearsal_mode",
      capabilityStatus: "working",
      outcomeSignal: "rehearsed",
      confidence: 0.84,
      evidenceRefs: ["trace:trace_persist"],
      architectureArea: "text_ui",
      privacyClass: "metadata_only",
      suggestedNextStep: "no_action",
      rawMessage: "raw deployment secret",
    }),
  );

  const snapshot = serializeCapabilityLedger(ledger);

  assert.equal(snapshot.schemaVersion, "concierge.capability-ledger.v1");
  assert.equal(snapshot.privacyCaveat.includes("metadata-only"), true);
  assert.equal(snapshot.signals.length, 1);
  assert.equal(snapshot.signals[0].topicLabel, "deployment");
  assert.equal(JSON.stringify(snapshot).includes("raw deployment secret"), false);
});

test("deserializes persisted metadata into a queryable pruned ledger", () => {
  const source = createCapabilityLedger();
  appendCapabilitySignal(
    source,
    deriveCapabilitySignalFromEvent("rehearsal_preview_created", {
      traceId: "trace_old",
      conversationId: "conv_reload",
      turnId: "turn_old",
      profile: "adult_owner",
    }),
  );
  appendCapabilitySignal(
    source,
    deriveCapabilitySignalFromEvent("response_failed", {
      traceId: "trace_new",
      conversationId: "conv_reload",
      turnId: "turn_new",
      profile: "adult_owner",
    }),
  );
  const snapshot = serializeCapabilityLedger(source, { maxSignals: 1 });

  const restored = deserializeCapabilityLedger(snapshot);
  const answer = answerCapabilityQuestion("What capabilities should be implemented next?", restored);

  assert.equal(restored.listRecent().length, 1);
  assert.equal(restored.listRecent()[0].traceId, "trace_new");
  assert.ok(answer);
  if (!answer) throw new Error("expected persisted answer");
  assert.equal(answer.rows[0].label, "bridge_failure_handling");
});

test("clear helper removes in-memory capability signals", () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    deriveCapabilitySignalFromEvent("rehearsal_preview_created", {
      traceId: "trace_clear",
      conversationId: "conv_clear",
      turnId: "turn_clear",
      profile: "adult_owner",
    }),
  );

  clearCapabilityLedger(ledger);

  assert.equal(ledger.listRecent().length, 0);
  const answer = answerCapabilityQuestion("What conversations are most common?", ledger);
  assert.ok(answer);
  if (!answer) throw new Error("expected empty answer");
  assert.equal(answer.evidenceCount, 0);
});

test("export includes version, generated timestamp, privacy caveat, and metadata only", () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    deriveCapabilitySignalFromEvent("response_failed", {
      traceId: "trace_export",
      conversationId: "conv_export",
      turnId: "turn_export",
      profile: "adult_owner",
      error: "raw error details should not be exported",
    }),
  );

  const exported = exportCapabilityLedger(ledger);

  assert.equal(exported.schemaVersion, "concierge.capability-ledger.export.v1");
  assert.equal(/^\d{4}-\d{2}-\d{2}T/.test(exported.generatedAt), true);
  assert.equal(exported.privacyCaveat.includes("does not grant permission to share externally"), true);
  assert.equal(exported.signals.length, 1);
  assert.equal(JSON.stringify(exported).includes("raw error details"), false);
});

test("child protected persisted records remain minimized and distinguishable", () => {
  const ledger = createCapabilityLedger();
  appendCapabilitySignal(
    ledger,
    buildCapabilitySignal({
      traceId: "trace_child_persist",
      conversationId: "conv_child_persist",
      turnId: "turn_child_persist",
      profileMode: "child_protected_user",
      channel: "text",
      topicLabel: "school",
      intentLabel: "ask_help",
      capabilityLabel: "child_safe_response",
      capabilityStatus: "working",
      outcomeSignal: "answered",
      confidence: 0.7,
      evidenceRefs: ["trace:trace_child_persist"],
      architectureArea: "text_ui",
      privacyClass: "metadata_only",
      suggestedNextStep: "no_action",
      rawMessage: "child protected raw phrase",
    }),
  );

  const restored = deserializeCapabilityLedger(serializeCapabilityLedger(ledger));
  const [signal] = restored.listRecent();

  assert.equal(signal.profileMode, "child_protected_user");
  assert.equal(signal.privacyClass, "child_sensitive");
  assert.equal(JSON.stringify(signal).includes("child protected raw phrase"), false);
});

test("ledger prunes signals by max age as well as max count", () => {
  const ledger = createCapabilityLedger({
    maxSignals: 3,
    maxAgeDays: 7,
    now: () => new Date("2026-06-11T12:00:00.000Z"),
  });

  appendCapabilitySignal(ledger, testSignal("trace_too_old", { observedAt: "2026-06-01T12:00:00.000Z", topic: "old" }));
  appendCapabilitySignal(ledger, testSignal("trace_recent_1", { observedAt: "2026-06-06T12:00:00.000Z", topic: "recent_1" }));
  appendCapabilitySignal(ledger, testSignal("trace_recent_2", { observedAt: "2026-06-07T12:00:00.000Z", topic: "recent_2" }));
  appendCapabilitySignal(ledger, testSignal("trace_recent_3", { observedAt: "2026-06-08T12:00:00.000Z", topic: "recent_3" }));
  appendCapabilitySignal(ledger, testSignal("trace_recent_4", { observedAt: "2026-06-09T12:00:00.000Z", topic: "recent_4" }));

  assert.deepEqual(ledger.listRecent().map((signal) => signal.traceId), [
    "trace_recent_2",
    "trace_recent_3",
    "trace_recent_4",
  ]);
});

test("older persisted ledgers without age retention fields still load", () => {
  const source = createCapabilityLedger();
  appendCapabilitySignal(source, testSignal("trace_legacy", { observedAt: "2026-06-10T12:00:00.000Z" }));
  const snapshot = serializeCapabilityLedger(source, { generatedAt: "2026-06-11T12:00:00.000Z" });
  const legacySnapshot = {
    ...snapshot,
    retention: { maxSignals: 250 },
    signals: snapshot.signals.map(({ observedAt: _observedAt, ...signal }) => signal),
  };

  const restored = deserializeCapabilityLedger(legacySnapshot);

  assert.equal(restored.listRecent().length, 1);
  assert.equal(restored.listRecent()[0].traceId, "trace_legacy");
  assert.equal(/^\d{4}-\d{2}-\d{2}T/.test(restored.listRecent()[0].observedAt), true);
});

test("trend answers compare recent and previous windows with taxonomy-edited labels", () => {
  const ledger = createCapabilityLedger({ now: () => new Date("2026-06-11T12:00:00.000Z") });
  appendCapabilitySignal(ledger, testSignal("trace_prior_1", { observedAt: "2026-05-30T12:00:00.000Z", topic: "deploy" }));
  appendCapabilitySignal(ledger, testSignal("trace_recent_1", { observedAt: "2026-06-07T12:00:00.000Z", topic: "deploy" }));
  appendCapabilitySignal(ledger, testSignal("trace_recent_2", { observedAt: "2026-06-08T12:00:00.000Z", topic: "deploy" }));
  appendCapabilitySignal(ledger, testSignal("trace_recent_other", { observedAt: "2026-06-09T12:00:00.000Z", topic: "memory" }));
  const taxonomy = createCapabilityTaxonomy();
  renameTaxonomyLabel(taxonomy, "topic", "deploy", "release_operations");

  const answer = answerCapabilityQuestion("What conversations are increasing?", ledger, taxonomy, {
    now: "2026-06-11T12:00:00.000Z",
  });

  assert.ok(answer);
  if (!answer) throw new Error("expected trend answer");
  assert.equal(answer.kind, "increasing_conversations");
  assert.equal(answer.rows[0].label, "release_operations");
  assert.equal(answer.rows[0].count, 2);
  assert.equal(answer.rows[0].previousCount, 1);
  assert.equal(answer.rows[0].delta, 1);
  assert.ok(answer.summary.includes("recent 7 days"));
});

test("trend answers identify missing capabilities getting worse without granting authority", () => {
  const ledger = createCapabilityLedger({ now: () => new Date("2026-06-11T12:00:00.000Z") });
  appendCapabilitySignal(ledger, testSignal("trace_prior_missing", {
    observedAt: "2026-05-30T12:00:00.000Z",
    capability: "bridge_failure_handling",
    status: "missing",
    architecture: "bridge",
    suggestedNextStep: "write_evaluator_case",
  }));
  appendCapabilitySignal(ledger, testSignal("trace_recent_missing_1", {
    observedAt: "2026-06-07T12:00:00.000Z",
    capability: "bridge_failure_handling",
    status: "missing",
    architecture: "bridge",
    suggestedNextStep: "write_evaluator_case",
  }));
  appendCapabilitySignal(ledger, testSignal("trace_recent_missing_2", {
    observedAt: "2026-06-08T12:00:00.000Z",
    capability: "bridge_failure_handling",
    status: "missing",
    architecture: "bridge",
    suggestedNextStep: "write_evaluator_case",
  }));

  const answer = answerCapabilityQuestion("What missing capabilities are getting worse?", ledger, undefined, {
    now: "2026-06-11T12:00:00.000Z",
  });

  assert.ok(answer);
  if (!answer) throw new Error("expected missing trend answer");
  assert.equal(answer.kind, "worsening_missing_capabilities");
  assert.equal(answer.rows[0].label, "bridge_failure_handling");
  assert.equal(answer.rows[0].status, "missing");
  assert.equal(answer.rows[0].delta, 1);
  assert.equal(answer.boundary.approvalCaptured, false);
  assert.equal(answer.boundary.memoryWriteAllowed, false);
  assert.equal(answer.boundary.agentDispatchAllowed, false);
  assert.equal(answer.boundary.externalSendAllowed, false);
});

test("recent working answers use the recent trend window", () => {
  const ledger = createCapabilityLedger({ now: () => new Date("2026-06-11T12:00:00.000Z") });
  appendCapabilitySignal(ledger, testSignal("trace_old_working", {
    observedAt: "2026-05-25T12:00:00.000Z",
    capability: "old_success",
    status: "working",
  }));
  appendCapabilitySignal(ledger, testSignal("trace_recent_working", {
    observedAt: "2026-06-09T12:00:00.000Z",
    capability: "recent_success",
    status: "working",
  }));

  const answer = answerCapabilityQuestion("What worked recently?", ledger, undefined, {
    now: "2026-06-11T12:00:00.000Z",
  });

  assert.ok(answer);
  if (!answer) throw new Error("expected recent working answer");
  assert.equal(answer.kind, "recent_working_capabilities");
  assert.equal(answer.rows[0].label, "recent_success");
  assert.equal(answer.rows.some((row) => row.label === "old_success"), false);
});

test("export includes age retention and trend caveats without raw text", () => {
  const ledger = createCapabilityLedger({ maxSignals: 20, maxAgeDays: 30 });
  appendCapabilitySignal(ledger, testSignal("trace_export_retention", {
    observedAt: "2026-06-10T12:00:00.000Z",
    rawMessage: "raw trend export secret",
  }));

  const exported = exportCapabilityLedger(ledger, {
    maxSignals: 20,
    maxAgeDays: 30,
    generatedAt: "2026-06-11T12:00:00.000Z",
  });

  assert.equal(exported.retention.maxSignals, 20);
  assert.equal(exported.retention.maxAgeDays, 30);
  assert.ok(exported.trendCaveat.includes("recent 7 days"));
  assert.equal(JSON.stringify(exported).includes("raw trend export secret"), false);
});

test("child protected trend records remain minimized", () => {
  const ledger = createCapabilityLedger({ now: () => new Date("2026-06-11T12:00:00.000Z") });
  appendCapabilitySignal(ledger, testSignal("trace_child_trend", {
    observedAt: "2026-06-10T12:00:00.000Z",
    topic: "school",
    capability: "child_safe_response",
    status: "working",
    profileMode: "child_protected_user",
    rawMessage: "child raw trend phrase",
  }));

  const answer = answerCapabilityQuestion("What changed this week?", ledger, undefined, {
    now: "2026-06-11T12:00:00.000Z",
  });
  const exported = exportCapabilityLedger(ledger);

  assert.ok(answer);
  if (!answer) throw new Error("expected child trend answer");
  assert.equal(exported.signals[0].privacyClass, "child_sensitive");
  assert.equal(JSON.stringify(answer).includes("child raw trend phrase"), false);
  assert.equal(JSON.stringify(exported).includes("child raw trend phrase"), false);
});
