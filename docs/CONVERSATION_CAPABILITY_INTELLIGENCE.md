# Conversation Capability Intelligence

## 1. Purpose

Conversation Capability Intelligence is Concierge's local analysis layer for understanding which conversation capabilities are common, working, missing, or worth improving next.

It should let the user ask questions such as:

- What conversations are most common?
- What conversations are working well?
- What capabilities are missing but easy to evolve?
- What part of the Concierge architecture must improve to fix missing capabilities?
- What capabilities should be implemented next?

This capability is not a replacement for Napoleon governance or controlled self-evolution. It observes, classifies, aggregates, explains, and proposes. It does not implement features, change policy, write memory, dispatch agents, send externally, or grant authority.

## 2. Critical framing

The important distinction is between a conversation topic, an intent, and a capability:

- Topic: what the user is talking about, such as releases, homework, calendar, or architecture.
- Intent: what the user is trying to do, such as summarize, plan, send, remember, compare, troubleshoot, or delegate.
- Capability: the system behavior needed to satisfy the intent safely, such as bridge error recovery, memory proposal review, file search, calendar delegation, child-safe explanation, or evaluator regression generation.

Tracking only topics would be misleading. A frequent topic may already work well. A rare topic may expose a high-risk missing capability. The system must rank improvement opportunities by frequency, failure severity, safety risk, user value, implementation effort, and architectural dependency.

## 3. Data model

The local ledger should store derived metadata, not raw conversation transcripts by default.

Initial implementation: `app/src/capabilityLedger.ts` defines the TypeScript model and an in-memory bounded ledger. It is wired through `app/src/telemetry.ts` for current Text Concierge events. The ledger is local process memory for now; durable storage, deletion controls, and export controls are future work.

Each turn can emit a `conversation_capability_signal` with:

- `trace_id`
- `conversation_id`
- `turn_id`
- `profile_mode`
- `channel`
- `topic_label`
- `intent_label`
- `capability_label`
- `capability_status`: `working`, `degraded`, `missing`, `blocked`, `unknown`
- `outcome_signal`: `answered`, `clarified`, `rehearsed`, `review_required`, `blocked`, `bridge_failed`, `user_corrected`, `user_retried`, `dismissed`, `abandoned`
- `confidence`
- `evidence_refs`: trace, audit, evaluator, or local event references
- `architecture_area`: `text_ui`, `bridge`, `governance_ux`, `memory_review`, `settings_privacy`, `observability`, `evaluator`, `voice`, `avatar`, `napoleon_runtime`, `agent_registry`
- `privacy_class`: `metadata_only`, `redacted_summary`, `sensitive`, `child_sensitive`
- `suggested_next_step`: `no_action`, `write_evaluator_case`, `add_backlog_item`, `create_evolution_proposal`, `needs_human_review`

Raw content may be temporarily used to classify a turn, but it should not be retained in this ledger by default.

## 4. Answer model

Concierge should answer capability questions from aggregated local signals:

- Most common conversations: rank by topic, intent, and capability label, with counts and trend direction.
- Working well: rank capabilities with high completion, low correction, low retry, low governance block, and low bridge failure rates.
- Missing but easy to evolve: rank missing or degraded capabilities by high user value, low implementation effort, low governance risk, and available evaluator coverage.
- Architecture area to improve: group missing capabilities by the component that blocks them, such as bridge auth, memory review submission, trace completeness, profile handling, or evaluator coverage.
- What to implement next: produce proposal-only recommendations with evidence, expected benefit, risk, evaluator cases, and rollback needs.

Every answer should include uncertainty. Example: "Based on 42 local metadata signals, calendar delegation is common but not implemented; confidence 0.72; blocker is Napoleon runtime transport and governed delegation."

Initial query implementation: Text Concierge can answer clear local questions such as "What conversations are most common?", "What conversations are working well?", "What capabilities are missing or blocked?", "What capabilities are missing but easy to evolve?", "What part of the Concierge architecture has to be improved to fix missing capabilities?", and "What capabilities should be implemented next?" from the in-memory ledger. The answer includes counts, local evidence size, confidence, score where ranked, architecture area, suggested next step where relevant, caveats, and a reminder that the summary does not approve, implement, write memory, dispatch agents, or send externally.

## 5. Ranking strategy

Recommended priority score:

```text
priority =
  user_value
  + frequency
  + failure_severity
  + strategic_fit
  + evaluator_gap
  - implementation_effort
  - governance_risk
  - privacy_risk
  - child_safety_risk
```

The score must be explainable. Concierge should show the top reasons and the strongest counterarguments.

## 6. Missed requirements and edge cases

Important items not obvious in the initial request:

- The system needs negative signals, not just successes. Retries, corrections, no-go decisions, bridge errors, dismissed proposals, and abandoned turns are often the best evidence of missing capabilities.
- Rare high-impact misses must not be buried by frequent low-value topics.
- Child protected signals need stricter minimization and separate aggregation so child behavior is not optimized like adult-owner behavior.
- The system needs a taxonomy review loop. Capability labels will drift unless users or Chief of Staff can merge, split, rename, and deprecate labels.
- Recommendations can create perverse incentives if they optimize engagement or frequency alone. The ranking must penalize privacy risk, safety risk, and authority expansion.
- Capability tracking should distinguish "blocked correctly" from "failed." A no-go result can be a success if the request was unsafe.
- Evidence must be auditable without storing raw content. Use trace IDs, audit IDs, evaluator case IDs, and redacted summaries.
- The UI should disclose when an answer is based only on local metadata and may miss conversations from other devices or disabled telemetry periods.

## 7. Privacy and safety

Defaults:

- Local-only storage.
- Metadata and redacted summaries only.
- User-visible retention and deletion controls.
- Opt-in export.
- No raw audio, raw video, or raw child conversation storage.
- Child protected signals are minimized and guardian-controlled.
- No automatic self-evolution.

The ledger must not be used to infer durable emotional traits, manipulate engagement, or bypass governance.

## 8. Architecture

Initial components:

1. Signal emitter: emits derived capability signals from text turns, rehearsal previews, governance reviews, memory proposals, bridge failures, and user corrections.
2. Local ledger: stores bounded, redacted metadata.
3. Taxonomy mapper: maps topics, intents, capabilities, and architecture areas.
4. Aggregator: computes counts, trends, success rates, failure clusters, and confidence.
5. Recommendation engine: creates proposal-only capability improvement recommendations.
6. Query surface: lets the user ask natural-language questions about common, working, missing, and next capabilities.
7. Evolution handoff: converts approved recommendations into Napoleon evolution proposals or backlog items.

## 9. Backlog and evaluator integration

This capability should be built in phases:

1. Define schema and local derived event emission. Implemented in `app/src/capabilityLedger.ts` and `app/src/telemetry.ts`.
2. Add bounded local ledger and redaction policy. Initial in-memory bounded ledger is implemented; persistent retention and deletion controls remain next.
3. Add query summaries for common, working, missing, and next capabilities. Initial common, working-well, missing/blocked, easy-to-evolve, architecture-area, and recommended-next answers are implemented in the Text Concierge UI.
4. Add architecture-area mapping and recommendation scoring. Initial deterministic local scoring is implemented from count, confidence, status, architecture area, and suggested next step; richer value, effort, risk, and trend scoring remain future work.
5. Add evaluator scenarios for capability intelligence privacy, ranking, and proposal-only boundaries.
6. Add governed handoff to Napoleon evolution proposals.

Evaluator coverage should ensure Concierge does not store raw conversation content by default, does not treat recommendations as approval, and does not optimize for engagement over safety.
