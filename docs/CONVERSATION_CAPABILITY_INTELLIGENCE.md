# Conversation Capability Intelligence

## 1. Purpose

Conversation Capability Intelligence is Concierge's local analysis layer for understanding which conversation capabilities are common, working, missing, or worth improving next.

It should let the user ask questions such as:

- What conversations are most common?
- What conversations are working well?
- What capabilities are missing but easy to evolve?
- What part of the Concierge architecture must improve to fix missing capabilities?
- What capabilities should be implemented next?
- What conversations are increasing?
- What changed this week?
- What seasonal conversation patterns changed?

This capability is not a replacement for Napoleon governance or controlled self-evolution. It observes, classifies, aggregates, explains, and proposes. It does not implement features, change policy, write memory, dispatch agents, send externally, or grant authority.

## 2. Critical framing

The important distinction is between a conversation topic, an intent, and a capability:

- Topic: what the user is talking about, such as releases, homework, calendar, or architecture.
- Intent: what the user is trying to do, such as summarize, plan, send, remember, compare, troubleshoot, or delegate.
- Capability: the system behavior needed to satisfy the intent safely, such as bridge error recovery, memory proposal review, file search, calendar delegation, child-safe explanation, or evaluator regression generation.

Tracking only topics would be misleading. A frequent topic may already work well. A rare topic may expose a high-risk missing capability. The system must rank improvement opportunities by frequency, failure severity, safety risk, user value, implementation effort, and architectural dependency.

## 3. Data model

The local ledger should store derived metadata, not raw conversation transcripts by default.

Initial implementation: `app/src/capabilityLedger.ts` defines the TypeScript model, bounded ledger, serialization, deserialization, validation, age/count pruning, trend windows, export, and clear helpers. It is wired through `app/src/telemetry.ts` for current Text Concierge events and uses browser-local storage through `app/src/capabilityLedgerStorage.ts`. `app/src/capabilityTaxonomy.ts` provides local taxonomy renames, merges, deprecation markers, split-candidate markers, reset, serialization, export, Chief of Staff taxonomy review drafts, and governed taxonomy review submission. The Text Concierge UI shows retained local signal count, count/age retention limits, taxonomy label counts, clear/export/taxonomy controls, a local taxonomy review draft panel, and a governed review handoff when endpoint and descriptor preflight pass.

Each turn can emit a `conversation_capability_signal` with:

- `trace_id`
- `observed_at`
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

Persistent local storage:

- Schema version: `concierge.capability-ledger.v1`.
- Export schema version: `concierge.capability-ledger.export.v1`.
- Retention: bounded to the latest 250 derived metadata signals and a 90 day local age window.
- Clear control: removes the persisted snapshot, clears the in-memory ledger, and clears derived Chief of Staff steering and taxonomy review drafts, review responses, and failure states so obsolete local evidence cannot be handed off.
- Export control: renders local JSON for derived metadata only, includes retention settings and trend caveats, and states that export does not grant permission to share externally; export and clear telemetry explicitly records no approval capture, memory write, agent dispatch, or external send.
- Child protected records remain distinguishable through `profile_mode` and `privacy_class: child_sensitive`, without retaining raw child content.

Local taxonomy storage:

- Schema version: `concierge.capability-taxonomy.v1`.
- Supports local renames, merges, deprecated markers, and split-candidate markers for topic, intent, capability, and architecture labels.
- Query answers apply edited labels to aggregates while preserving original derived signal records.
- Taxonomy edits are local hints only. They do not change Napoleon policy, routing, memory, approval, dispatch, or external sends, and edit telemetry records no approval capture, memory write, agent dispatch, or external send.
- Reset restores derived labels by clearing local taxonomy edits.
- Chief of Staff taxonomy review drafts can recommend merge, split, or deprecation review from local metadata and evidence references, then package those recommendations with an evaluator case candidate and evolution proposal draft without applying edits. Child-protected drafts show guardian/owner review wording before submission. Local taxonomy edits clear existing taxonomy review drafts and review results so the user must regenerate a packet from the current metadata before handoff. When a governed endpoint and descriptor preflight are available, Concierge can send the review packet to Napoleon through the governed Chief of Staff steering path using the canonical `chief_of_staff_steering_handoff` request kind with taxonomy review payload metadata; submission re-checks the draft affected profiles against the active profile and fails closed before any request if the user has switched context. Child-protected submissions preserve child profile scope and guardian/owner review wording, and the response still cannot apply taxonomy edits, write memory, capture approval, dispatch agents, or send externally.

## 4. Answer model

Concierge should answer capability questions from aggregated local signals:

- Most common conversations: rank by topic, intent, and capability label, with counts and trend direction.
- Working well: rank capabilities with high completion, low correction, low retry, low governance block, and low bridge failure rates.
- Missing but easy to evolve: rank missing or degraded capabilities by high user value, low implementation effort, low governance risk, and available evaluator coverage.
- Architecture area to improve: group missing capabilities by the component that blocks them, such as bridge auth, memory review submission, trace completeness, profile handling, or evaluator coverage.
- What to implement next: produce proposal-only recommendations with evidence, expected benefit, risk, evaluator cases, and rollback needs.

Every answer should include uncertainty. Example: "Based on 42 local metadata signals, calendar delegation is common but not implemented; confidence 0.72; blocker is Napoleon runtime transport and governed delegation."

Initial query implementation: Text Concierge can answer clear local questions such as "What conversations are most common?", "What conversations are working well?", "What capabilities are missing or blocked?", "What capabilities are missing but easy to evolve?", "What part of the Concierge architecture has to be improved to fix missing capabilities?", and "What capabilities should be implemented next?" from the in-memory ledger. Answers are filtered to the active profile before aggregation, so child-protected, guest, collaborator, and adult-owner signals are not mixed in local summaries or recommendations. Local answer telemetry includes the active profile mode so child-protected answers stay profile-scoped without contacting Napoleon. The answer includes counts, local evidence size, confidence, score where ranked, architecture area, suggested next step where relevant, caveats, and a reminder that the summary does not approve, implement, write memory, dispatch agents, or send externally.

Trend query implementation: Text Concierge can also answer local trend questions such as "What conversations are increasing?", "What missing capabilities are getting worse?", "What worked recently?", and "What changed this week?" using a recent 7 day window compared with the previous 7 days. It can answer seasonal questions such as "What seasonal conversation patterns changed?" using a recent 28 day window compared with the previous 28 days. Trend answers use locally edited taxonomy labels, include recent and previous counts plus deltas where relevant, and carry a caveat that sparse, disabled, or single-device telemetry can distort trends.

## 5. Ranking strategy

Recommended priority score:

```text
priority =
  user_value
  + frequency
  + recent_trend_delta
  + failure_severity
  + evaluator_gap
  - implementation_effort
  - governance_risk
  - privacy_risk
  - child_safety_risk
  - authority_expansion_risk
```

Initial scoring implementation: recommended-next and easy-to-evolve answers use deterministic local risk/value components for user value, frequency, recent trend delta, failure severity, evaluator gap, implementation effort, governance risk, privacy risk, child safety risk, authority expansion risk, and final priority score. Score explanations are shown in Text Concierge answer rows. Correctly blocked unsafe requests are excluded from implementation recommendations. Child protected evidence remains minimized and raises caution instead of optimizing engagement.

The score must be explainable. Concierge should show the top reasons and the strongest counterarguments. Scores are proposal-only heuristics, not approvals or automatic implementation decisions.

Initial Chief of Staff steering implementation: Text Concierge can draft a local review packet from the highest ranked local capability recommendation for the active profile. The draft includes the capability recommendation, architecture area, evidence count, rationale, evaluator case candidate, evolution proposal draft, and metadata-only learning signals derived from the same missing or degraded local capability evidence. The Text UI shows a learning-signal summary before handoff, including count, type, source, raw-text retention state, and proposal-only state. The draft evidence is limited to the active profile and to the missing or degraded recommendation bucket that produced the recommendation; correctly blocked unsafe signals are not attached as evolution proposal evidence or learning-signal evidence merely because they share the same capability label. The draft is local and proposal-only by default. If a governed endpoint is configured and descriptor preflight passes, Concierge can submit the draft to Napoleon Chief of Staff review through the governed bridge; an existing draft re-evaluates against the current endpoint and descriptor state, so configuring the governed endpoint after drafting can enable submission without re-drafting. Submission also verifies that the draft's affected profile still matches the active profile and fails closed before any request if the user has switched context. That submission still does not apply the proposed change, write memory, dispatch agents, send externally, or capture approval.

Capability signal construction now treats labels and evidence references as privacy-bearing inputs. The local ledger keeps compact machine labels and allowlisted local trace/event/audit references, but redacts sentence-like labels, email addresses, URLs, token-shaped values, and non-local references before persistence, aggregation, export, or Chief of Staff steering evidence selection. Learning-signal construction repeats the boundary before proposal drafting by sanitizing capability IDs, allowlisting local evidence references, and dropping raw-looking redacted summaries.

## 6. Missed requirements and edge cases

Important items not obvious in the initial request:

- The system needs negative signals, not just successes. Retries, corrections, no-go decisions, bridge errors, dismissed proposals, and abandoned turns are often the best evidence of missing capabilities.
- Rare high-impact misses must not be buried by frequent low-value topics.
- Child protected signals need stricter minimization and separate aggregation so child behavior is not optimized like adult-owner behavior.
- The system needs a taxonomy review loop. Initial local rename, merge, split-candidate, deprecation, reset controls, Chief of Staff-assisted taxonomy review drafts, and governed taxonomy review submission are implemented; applying reviewed taxonomy changes remains future work and must stay governed.
- Trends need age-aware retention. Initial count plus age pruning, 7 day trend windows, and 28 day seasonal comparison are implemented; richer cross-device trend analysis remains future work.
- Recommendations can create perverse incentives if they optimize engagement or frequency alone. Initial scoring penalizes privacy risk, child safety risk, governance risk, authority expansion, and implementation effort; richer human-reviewed value calibration remains future work.
- Capability tracking should distinguish "blocked correctly" from "failed." A no-go result can be a success if the request was unsafe.
- Evidence must be auditable without storing raw content. Use trace IDs, audit IDs, evaluator case IDs, and redacted summaries.
- The UI should disclose when an answer is based only on local metadata and may miss conversations from other devices or disabled telemetry periods.

## 7. Privacy and safety

Defaults:

- Local-only storage.
- Metadata and redacted summaries only.
- User-visible retention, deletion, and export controls.
- Export is user-triggered local JSON and does not imply permission to send or share externally.
- No raw audio, raw video, or raw child conversation storage.
- Child protected signals are minimized and guardian-controlled.
- No automatic self-evolution.

The ledger must not be used to infer durable emotional traits, manipulate engagement, or bypass governance.

## 8. Architecture

Initial components:

1. Signal emitter: emits derived capability signals from text turns, rehearsal previews, governance reviews, memory proposals, bridge failures, and user corrections.
2. Local ledger: stores bounded, redacted metadata.
3. Taxonomy mapper: maps topics, intents, capabilities, and architecture areas and applies local label edits during aggregation.
4. Aggregator: computes counts, trends, success rates, failure clusters, and confidence.
5. Recommendation engine: creates proposal-only capability improvement recommendations.
6. Query surface: lets the user ask natural-language questions about common, working, missing, and next capabilities.
7. Evolution handoff: converts approved recommendations into Napoleon evolution proposals or backlog items.

## 9. Backlog and evaluator integration

This capability should be built in phases:

1. Define schema and local derived event emission. Implemented in `app/src/capabilityLedger.ts` and `app/src/telemetry.ts`.
2. Add bounded local ledger and redaction policy. Bounded in-memory and browser-local persistence, deletion, export controls, local taxonomy editing, and count plus age retention are implemented.
3. Add query summaries for common, working, missing, and next capabilities. Initial common, working-well, missing/blocked, easy-to-evolve, architecture-area, recommended-next, increasing, worsening-missing, recently-working, weekly-change, and seasonal-change answers are implemented in the Text Concierge UI.
4. Add architecture-area mapping and recommendation scoring. Initial deterministic local risk/value scoring is implemented from evidence count, recent trend delta, confidence, status, evaluator gap, architecture area, suggested next step, implementation effort, privacy/safety/governance risk, and authority expansion risk; richer human-reviewed value calibration remains future work.
5. Add local Chief of Staff steering draft handoff. Initial draft generation and governed submission are implemented in `app/src/chiefOfStaffSteering.ts`; it produces a recommendation, evaluator case candidate, evolution proposal draft, and metadata-only learning signals while preserving proposal-only boundaries.
6. Add local Chief of Staff taxonomy review drafts. Initial draft generation and governed submission are implemented in `app/src/capabilityTaxonomy.ts`; it recommends taxonomy merge, split, and deprecation review from local metadata, packages an evaluator case candidate and evolution proposal draft, preserves proposal-only boundaries, re-checks active profile scope before fetch, keeps child-protected submissions in child scope with guardian/owner review wording, avoids raw conversation storage, and rejects responses that claim local application or side effects.
7. Add evaluator scenarios for capability intelligence privacy, ranking, steering-draft handoff, and proposal-only boundaries. Initial coverage is implemented by `CAPABILITY-INTELLIGENCE-001` and `CHIEF-OF-STAFF-STEERING-DRAFT-001`.
8. Replace the local endpoint configuration with live Napoleon descriptor discovery and auth once a runtime transport is available.

Evaluator coverage should ensure Concierge does not store raw conversation content by default, does not treat recommendations as approval, and does not optimize for engagement over safety.
