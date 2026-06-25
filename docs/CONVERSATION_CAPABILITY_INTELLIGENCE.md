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
- What steering recommendation types are most common?
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

Initial implementation: `app/src/capabilityLedger.ts` defines the TypeScript model, bounded ledger, serialization, deserialization, validation, age/count pruning, trend windows, export, and clear helpers. It is wired through `app/src/telemetry.ts` for current Text Concierge events and local voice sample/rehearsal completion metadata, and uses browser-local storage through `app/src/capabilityLedgerStorage.ts`. `app/src/capabilityTaxonomy.ts` provides local taxonomy renames, merges, deprecation markers, split-candidate markers, reset, serialization, export, Chief of Staff taxonomy review drafts, and governed taxonomy review submission. The Text Concierge UI shows retained local signal count, count/age retention limits, taxonomy label counts, clear/export/taxonomy controls, a local taxonomy review draft panel, and a governed review handoff when endpoint and descriptor preflight pass.

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
- Export control: renders local JSON for derived metadata only, includes retention settings and trend caveats, and states that export does not grant permission to share externally; export and clear telemetry explicitly records no approval capture, memory write, agent dispatch, or external send. Switching the active profile clears the already-rendered export output so a local metadata view from one profile is not left visible under another profile.
- Child protected records remain distinguishable through `profile_mode` and `privacy_class: child_sensitive`, without retaining raw child content.
- Descriptor discovery completion and failure can create `bridge` capability signals for Napoleon connection readiness. These signals retain only descriptor state, checksum/signature state, live-send readiness, and fail-closed reason metadata; they do not retain endpoint hosts, credentials, descriptor bodies, request bodies, response bodies, approval, memory writes, agent dispatch, or external sends.
- Advisory Chief of Staff capability discovery completion and blocked states can create `agent_registry` capability signals for Napoleon capability and metadata readiness. These signals retain only counts, profile-metadata presence, runtime-authority boundary state, and false local side-effect fields; they do not retain raw manifests, profile bodies, endpoint hosts, credentials, request bodies, response bodies, approval, memory writes, agent dispatch, or external sends.
- Governed Napoleon text bridge failures can create `bridge` capability signals from `bridge_request_failed` metadata. Contract mismatch, missing or invalid descriptor, timeout, authentication, HTTP, and transport failures become missing text bridge capability evidence with safe reason class, named route metadata, status class, blocked-effect count, active profile, and false side-effect boundaries. The follow-on `response_failed` UI telemetry remains buffered for the local trace, but it does not add a second derived capability signal for the same bridge failure. Governance `deny` and `no_go` outcomes remain blocked governance signals instead of bridge repair recommendations.
- Remote Napoleon `deny` and `no_go` response failures create `governance` capability signals for governed bridge no-go handling instead of `missing` bridge-repair signals. They retain only returned governance outcome, bridge failure reason, blocked-effect count, and local trace/event references, so correctly blocked unsafe requests do not become implementation recommendations.
- Governed review, evidence, and intake handoff sends for memory proposal review, governance review, capability review packets, Chief of Staff steering, taxonomy review, new-agent proposal review, evolution proposal submission, and observability trace evidence create local capability signals. Transport or contract failures remain bridge follow-up candidates, while returned `deny` and `no_go` outcomes are classified as correct governance blocks with no bridge-repair recommendation.
- Local STT sample completion, TTS sample completion, and full voice-turn rehearsal can create `voice` capability signals as working rehearsal evidence. Child-protected voice preparation uses separate `child_safe_*` capability labels and `child_sensitive` privacy class so it is not aggregated as ordinary adult-owner voice readiness. These signals are metadata-only and do not retain raw audio, start capture or playback, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- Local barge-in rehearsal can create a `voice` capability signal for interruption handling readiness. Child-protected barge-in preparation uses the separate `child_safe_barge_in_rehearsal` capability label and `child_sensitive` privacy class. The signal records only bounded metadata such as whether interruption was detected and the next turn was prepared; it does not retain interrupted output text or audio, start capture or playback, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- Local voice response shaping and child voice policy dry runs can create `voice` capability signals for spoken-response readiness. Child-protected shaping uses `child_safe_voice_response_shaping` and `child_safe_voice_policy` labels with `child_sensitive` privacy class. These signals retain only bounded metadata such as shortened state, provenance availability, pacing, and guardian-review reminder state; they do not retain spoken text, start playback or capture, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- Local wake-word readiness option changes and fixed local wake-word sample dry runs can create `voice` capability signals as working rehearsal evidence. Child-protected wake-word preparation uses separate `child_safe_*` capability labels and `child_sensitive` privacy class. These signals are metadata-only and do not retain raw audio, start always-on listening, start microphone capture, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- Local voice activity detection sample segments can create `voice` capability signals as working rehearsal evidence. Child-protected voice activity preparation uses the separate `child_safe_voice_activity_detection_sample` capability label and `child_sensitive` privacy class. These signals are metadata-only and do not retain raw audio, request microphone permission, start capture, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- Local microphone and camera permission results can create `voice` and `avatar` capability signals as readiness evidence. Granted permission is recorded as working readiness; denied, unavailable, or setting-off results are recorded as blocked local readiness. Child-protected permission readiness uses separate `child_safe_*` labels and `child_sensitive` privacy class. These signals are metadata-only and do not retain raw audio or video, start capture, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- The combined Media Session Controller summary can create a `media_session` capability signal when local microphone, camera, playback, profile, or permission state changes after the initial render. Ready-but-stopped local state is recorded as working readiness; permission-needed, unavailable, blocked, or child-protected states are recorded as blocked readiness. Child-protected media-session readiness uses a separate `child_safe_media_session_readiness_summary` label and `child_sensitive` privacy class. These signals are metadata-only and do not retain raw audio or video, start capture or playback, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- Local neutral avatar state, child avatar policy, expression mapping, model reference, and renderer readiness dry runs can create `avatar` capability signals as working rehearsal evidence. Child-protected avatar preparation uses separate `child_safe_*` capability labels, including `child_safe_avatar_policy`, and `child_sensitive` privacy class so it is not aggregated as ordinary adult-owner avatar readiness. These signals are metadata-only and do not retain raw video, start camera capture, start face detection, infer affect as fact, animate the avatar, treat guardian review as approval, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- Local avatar gaze simulation, face/head-pose sampling, and affect-uncertainty fusion dry runs can create `avatar` capability signals as working rehearsal evidence. Child-protected avatar perception preparation uses separate `child_safe_*` capability labels and `child_sensitive` privacy class. These signals remain metadata-only and do not retain raw audio or video, start camera or microphone capture, start live face detection, treat affect as emotional fact, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- Local avatar lip-sync baseline dry runs can create `avatar` capability signals as working rehearsal evidence. Child-protected lip-sync preparation uses a separate `child_safe_avatar_lip_sync_rehearsal` label and `child_sensitive` privacy class. These signals remain metadata-only and do not retain raw audio, start audio playback, start microphone capture, animate the avatar, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.

Local taxonomy storage:

- Schema version: `concierge.capability-taxonomy.v1`.
- Supports local renames, merges, deprecated markers, and split-candidate markers for topic, intent, capability, and architecture labels.
- Query answers apply edited labels to aggregates while preserving original derived signal records.
- Taxonomy edits are local hints only. They do not change Napoleon policy, routing, memory, approval, dispatch, or external sends, and edit telemetry records no approval capture, memory write, agent dispatch, or external send.
- Reset restores derived labels by clearing local taxonomy edits.
- Chief of Staff taxonomy review drafts can recommend merge, split, or deprecation review from local metadata and evidence references, then package those recommendations with an evaluator case candidate and evolution proposal draft without applying edits. Child-protected drafts show guardian/owner review wording before submission. Local taxonomy edits clear existing steering drafts, steering exports, steering review results, taxonomy review drafts, and taxonomy review results so the user must regenerate packets from the current labels and metadata before handoff. When a governed endpoint and descriptor preflight are available, Concierge can send the review packet to Napoleon through the named evolution proposal review target: generated Concierge-compatible endpoints and the local harness use Chief of Staff steering, while Napoleon root or explicit review endpoints use `/chief-of-staff/reviews/evolution-proposals`. Napoleon's direct proposal path `/evolution/proposals` has its own named proposal submission target and remains proposal-only. Submission re-checks the draft affected profiles against the active profile and fails closed before any request if the user has switched context. Child-protected submissions preserve child profile scope and guardian/owner review wording, and the response still cannot apply taxonomy edits, capture approval, update registries, write memory, dispatch agents, send externally, append traces, route tasks, or apply changes locally.

## 4. Answer model

Concierge should answer capability questions from aggregated local signals:

- Most common conversations: rank by topic, intent, and capability label, with counts and trend direction.
- Working well: rank capabilities with high completion, low correction, low retry, low governance block, and low bridge failure rates.
- Missing but easy to evolve: rank missing or degraded capabilities by high user value, low implementation effort, low governance risk, and available evaluator coverage.
- Architecture area to improve: group missing capabilities by the component that blocks them, such as bridge auth, memory review submission, trace completeness, profile handling, or evaluator coverage.
- What to implement next: produce proposal-only recommendations with evidence, expected benefit, risk, evaluator cases, and rollback needs.

Every answer should include uncertainty. Example: "Based on 42 local metadata signals, calendar delegation is common but not implemented; confidence 0.72; blocker is Napoleon runtime transport and governed delegation."

Initial query implementation: Text Concierge can answer clear local questions such as "What conversations are most common?", "What conversations are working well?", "What capabilities are missing or blocked?", "What capabilities are missing but easy to evolve?", "What part of the Concierge architecture has to be improved to fix missing capabilities?", "What capabilities should be implemented next?", and "What steering recommendation types are most common?" from the in-memory ledger. Answers are filtered to the active profile before aggregation, so child-protected, guest, collaborator, and adult-owner signals are not mixed in local summaries or recommendations, and the rendered answer names the active profile scope. Local answer telemetry includes the active profile mode so child-protected answers stay profile-scoped without contacting Napoleon. The answer includes counts, local evidence size, confidence, score where ranked, architecture area, suggested next step where relevant, caveats, and a reminder that the summary does not approve, implement, write memory, dispatch agents, or send externally. Successful governed Napoleon text-turn bridge completions create a metadata-only working `napoleon_text_turn_bridge` signal using route class, request kind, operation ID, governance outcome, active profile, and false side-effect boundaries, so working-well and common-conversation answers can distinguish accepted Napoleon bridge turns from generic local UI responses without storing prompts, endpoints, tokens, request bodies, or response bodies. Failed governed Napoleon text-turn bridge attempts create metadata-only missing `napoleon_text_turn_bridge` signals from `bridge_request_failed` when the reason is a safe bridge or contract gap, while governance `deny` and `no_go` are classified as protected blocks. The rendered answer and drilldown show this row as `Napoleon text bridge`, `Napoleon bridge failure handling`, or `Napoleon no-go handling` where applicable while retaining the stable metadata label for aggregation and export. Accepted evaluator validation imports with sanitized Napoleon required-action packet counts create a metadata-only `napoleon_runtime` missing-capability signal for descriptor handoff advertising, so architecture-improvement answers can surface missing Napoleon runtime advertisements from failed live validation without storing required-action IDs, target paths, required-action text, endpoints, credentials, request bodies, response bodies, approval, memory writes, agent dispatch, or external sends in the capability ledger. Steering recommendation type answers are fed by started, completed, and failed steering send telemetry but use only enum-count metadata; they do not include rationale, evidence, endpoints, credentials, raw content, approval, implementation, memory writes, agent dispatch, or external sends. Steering `deny` and `no_go` send failures still count by recommendation type but are classified as correct governance blocks with no bridge-repair next step. Media-session readiness answers can also include fixed local details such as microphone permission needed, camera blocked, or playback ready; these details are derived from safe readiness states only and do not expose raw media, endpoints, secrets, permission payloads, or user text.

Capability answers now carry a user-visible evidence drilldown. The drilldown shows the active profile scope, answer rows, count, status, architecture area, confidence, suggested next step, score, score components, score explanation, allowlisted local evidence references such as trace, event, audit, decision, request, proposal, capability, or taxonomy IDs, and, when present, sanitized latest Napoleon turn evidence from the current accepted or blocked turn. Latest-turn evidence includes explicit attribution source and proof alignment fields so a local capability answer can distinguish accepted bridge response proof from fail-closed bridge metadata without inventing selected-agent or recommendation provenance. Accepted selected-agent provenance is aligned to the same returned response trace/audit even when no Napoleon recommendation provenance was returned. Accepted target-capability-only provenance is also tied to the returned trace/audit, but remains labeled as target capability metadata with selected-agent proof not returned. Latest-turn target-capability, governance, failure-reason, and blocked-effect labels are redacted first and then canonicalized to lower snake-case where they are safe metadata labels, so casing, spaces, and hyphens do not fragment authority metadata in visible drilldowns, exports, or capability review packets. The Text Concierge UI can export the drilldown as `concierge.capability-answer-drilldown.export.v1` JSON with generated time, answer kind, safe question classification, profile scope, evidence count, rows, latest-turn evidence, privacy caveat, authority caveat, and proposal-only boundary. This export is local inspection metadata only: it excludes raw user text, endpoints, credentials, token or secret-bearing returned prose, request bodies, response bodies, raw audio, and raw video, and it does not contact Napoleon, capture approval, write memory, dispatch agents, send externally, or apply recommendations.

Capability answers can also export a local review packet as `concierge.capability-review-packet.export.v1` JSON. The packet carries the safe question classification, active profile scope, review focus, sanitized latest-turn evidence when available, sanitized drilldown rows, evaluator case candidate, evolution proposal draft, proposal-only boundary, and explicit local-only false side-effect flags. Export alone does not contact Napoleon, approve anything, write memory, dispatch agents, send externally, or apply changes. When a governed endpoint is configured, descriptor preflight passes, the descriptor advertises `evolution_proposal_review`, and Rehearsal Mode is off, Concierge can submit the packet through the Chief of Staff steering/evolution review target with `handoffKind: capability_review_packet_handoff`. The Text UI can also draft a separate `concierge.evolution-proposal-submission.v1` packet from the same review packet and send it to Napoleon's `/evolution/proposals` intake path only when the descriptor advertises `evolution_proposal_submission`. This submission is proposal-only and fails closed if Napoleon claims evolution application, registry update, approval capture, memory write, agent dispatch, external send, or local application. Capability review packet and evolution proposal submission telemetry are included in local capability tracking: successful sends are review-required evidence, transport failures remain bridge follow-up candidates, and returned `deny` or `no_go` outcomes are correct governance blocks rather than missing capability recommendations. Submission re-checks active profile scope and fails closed before fetch if the packet is stale for the visible context. Returned review metadata and exported packet state clear when local evidence, endpoint, bridge token, descriptor, profile, or live-mode context changes. The packet excludes raw user text, endpoints, credentials, request bodies, response bodies, raw audio, and raw video, and the returned review still cannot apply changes locally.

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

Initial scoring implementation: recommended-next and easy-to-evolve answers use deterministic local risk/value components for user value, frequency, recent trend delta, failure severity, evaluator gap, implementation effort, governance risk, privacy risk, child safety risk, authority expansion risk, and final priority score. Score explanations are shown in Text Concierge answer rows. Correctly blocked unsafe requests are excluded from implementation recommendations. Media Session Controller readiness blockers are the narrow blocked-state exception: recommended-next answers may suggest a proposal-only guided readiness repair flow from fixed local microphone, camera, and playback blocker details while still forbidding capture, playback, raw media storage, Napoleon contact, approval capture, memory writes, agent dispatch, and external sends. Child protected evidence remains minimized and raises caution instead of optimizing engagement.

The score must be explainable. Concierge should show the top reasons and the strongest counterarguments. Scores are proposal-only heuristics, not approvals or automatic implementation decisions.

Initial Chief of Staff steering implementation: Text Concierge can draft a local review packet from the highest ranked local capability recommendation for the active profile. The draft includes the capability recommendation, stable recommendation type, architecture area, evidence count, rationale, evaluator case candidate, evolution proposal draft, current governed handoff context, and metadata-only learning signals derived from the same missing or degraded local capability evidence. Guided Media Session Controller repair recommendations are the same narrow blocked-state exception as recommended-next answers: steering drafts may carry the concrete repair rationale and fixed local readiness evidence into the proposal packet, while correctly blocked unsafe requests remain excluded. The Text UI shows the recommendation type, current handoff blocker or ready state, local next step, blocked effects, and a learning-signal summary before handoff, including count, type, source, raw-text retention state, and proposal-only state, so guided Media Session readiness repair drafts are visibly distinct from scored capability recommendations. The draft can also be exported as local JSON so the user can inspect the recommendation, evaluator case candidate, evolution proposal draft, handoff context, learning-signal count, send state, and boundary before any governed handoff; the export is proposal-only, contains no endpoint or raw retained message text, emits count-only telemetry, and is cleared when connection, descriptor context, or local taxonomy labels change. Governed steering submissions carry the same `recommendationType` enum so Napoleon review can distinguish guided readiness repairs from scored capability recommendations without parsing rationale text, returned steering review panels keep that reviewed recommendation type visible alongside Napoleon's decision metadata, and send started/completed/failed telemetry carries only the enum without rationale, evidence, endpoints, tokens, or raw content. Capability-intelligence answers can aggregate those steering send events by recommendation type from local enum-count metadata only. The draft evidence is limited to the active profile and to the missing, degraded, or guided Media Session repair recommendation bucket that produced the recommendation; correctly blocked unsafe signals are not attached as evolution proposal evidence or learning-signal evidence merely because they share the same capability label. The draft is local and proposal-only by default. If a governed endpoint is configured, descriptor preflight passes, and the descriptor advertises the required review handoff route, Concierge can submit the draft to Napoleon Chief of Staff review through the named evolution proposal review target; an existing draft re-evaluates against the current endpoint and descriptor state, so configuring the governed endpoint after drafting can enable submission without re-drafting only when the required route is advertised. Submission also verifies that the draft's affected profile still matches the active profile and fails closed before any request if the user has switched context. That submission still does not apply the proposed change, capture approval, update registries, write memory, dispatch agents, send externally, append traces, or route tasks. Chief of Staff taxonomy review drafts are stricter: endpoint, bearer-token, descriptor, and Rehearsal Mode changes clear the draft and any rendered result so the packet must be regenerated before governed handoff. Taxonomy review send telemetry is tracked as local capability evidence with the same boundary: real transport failures can inform bridge follow-up, while returned `deny` and `no_go` outcomes are treated as correct governance blocks rather than taxonomy implementation gaps.

Capability signal construction and ledger append both treat labels and evidence references as privacy-bearing inputs. The local ledger keeps compact machine labels and allowlisted local trace/event/audit references, but redacts sentence-like labels, email addresses, URLs, token-shaped values, and non-local references before storage, persistence, aggregation, export, or Chief of Staff steering evidence selection. Learning-signal construction repeats the boundary before proposal drafting by sanitizing capability IDs, allowlisting local evidence references, and dropping raw-looking redacted summaries.

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
3. Add query summaries for common, working, missing, and next capabilities. Initial common, working-well, missing/blocked, easy-to-evolve, architecture-area, recommended-next, increasing, worsening-missing, recently-working, weekly-change, and seasonal-change answers are implemented in the Text Concierge UI with sanitized evidence drilldowns, latest-turn evidence when available, and local JSON export.
4. Add architecture-area mapping and recommendation scoring. Initial deterministic local risk/value scoring is implemented from evidence count, recent trend delta, confidence, status, evaluator gap, architecture area, suggested next step, implementation effort, privacy/safety/governance risk, and authority expansion risk; richer human-reviewed value calibration remains future work.
5. Add local Chief of Staff steering draft handoff. Initial draft generation, local export, and governed submission are implemented in `app/src/chiefOfStaffSteering.ts` and the Text Concierge UI; it produces a recommendation, evaluator case candidate, evolution proposal draft, current governed handoff context, and metadata-only learning signals while preserving proposal-only boundaries.
6. Add local Chief of Staff taxonomy review drafts. Initial draft generation and governed submission are implemented in `app/src/capabilityTaxonomy.ts`; it recommends taxonomy merge, split, and deprecation review from local metadata, packages an evaluator case candidate and evolution proposal draft, preserves proposal-only boundaries, re-checks active profile scope before fetch, keeps child-protected submissions in child scope with guardian/owner review wording, avoids raw conversation storage, and rejects responses that claim local application or side effects.
7. Add governed local capability review packet submission. Initial rendered UI and unit coverage submit sanitized exported capability-answer packets through the same governed evolution review target, preserve profile scope, reject stale or Rehearsal Mode context, and keep all side effects false.
8. Add governed new-agent proposal review submission. Initial rendered UI and unit coverage draft a proposal-only Napoleon-owned agent candidate from an exported capability review packet, require descriptor-advertised `new_agent_proposal_review` support, send only to `/chief-of-staff/reviews/new-agent-proposals`, classify the send events as local capability signals, and reject any registry update or agent activation claim.
9. Add governed evolution proposal submission. Initial rendered UI and unit coverage draft a proposal-only evolution submission from an exported capability review packet, require descriptor-advertised `evolution_proposal_submission` support, send only to `/evolution/proposals`, classify the send events as local capability signals, and reject any evolution application or registry update claim.
10. Add evaluator scenarios for capability intelligence privacy, ranking, steering-draft handoff, steering recommendation type summaries, stale draft profile mismatches, stale draft exports, stale taxonomy review artifacts, and proposal-only boundaries. Initial coverage is implemented by `CAPABILITY-INTELLIGENCE-001`, `CAPABILITY-INTELLIGENCE-STEERING-TYPES-001`, `CHIEF-OF-STAFF-STEERING-DRAFT-001`, `CHIEF-OF-STAFF-STEERING-PROFILE-MISMATCH-001`, `CHIEF-OF-STAFF-STEERING-EXPORT-STALE-001`, and `CHIEF-OF-STAFF-TAXONOMY-REVIEW-STALE-001`.
11. Replace the local endpoint configuration with live Napoleon descriptor discovery and auth once a runtime transport is available.

Evaluator coverage should ensure Concierge does not store raw conversation content by default, does not treat recommendations as approval, and does not optimize for engagement over safety.
