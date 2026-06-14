# Observability

## 1. Observability goals

Concierge must be inspectable.

For each interaction, we should be able to answer:

1. What did the user ask?
2. Who was the user profile?
3. What did Concierge infer?
4. Which stance was selected?
5. Which context was requested?
6. Which governance decision was made?
7. Which agent was routed to?
8. What response was produced?
9. What latency and errors occurred?
10. What should improve?
11. Which conversation capabilities are common, working, missing, or blocked by architecture?

## 2. Signals

The system emits:

- Traces
- Metrics
- Structured logs
- Evaluator reports
- Privacy audit records
- Evolution proposals
- Conversation capability signals

OpenTelemetry is the preferred standard for traces, metrics, and logs because it is vendor-neutral and supports multiple languages and destinations.

## 3. Trace model

Every user turn has:

- trace_id
- conversation_id
- turn_id
- user_profile
- channel
- intent
- stance
- governance decision
- Napoleon request ID
- response ID

## 4. Required events

| Event | Source | Required fields |
|---|---|---|
| app_started | app | app_version, platform |
| user_message_received | UI | conversation_id, turn_id, channel |
| identity_resolved | runtime | user_profile, confidence |
| intent_detected | runtime | intent, confidence |
| stance_selected | stance | stance, reason, confidence |
| context_requested | bridge | context_type, purpose |
| governance_decision | Napoleon | action_type, decision, reason |
| delegation_requested | Napoleon | target_agent, reason |
| response_generated | UI | response_type, token_count |
| bridge_request_failed | bridge | trace_id, request_id, reason, status, blocked_effects |
| mic_permission_requested | voice | conversation_id, microphone_setting_enabled, local_only, capture_started, raw_audio_stored |
| mic_permission_result | voice | conversation_id, result, capture_started, raw_audio_stored |
| camera_permission_requested | avatar | conversation_id, camera_setting_enabled, local_only, capture_started, raw_video_stored |
| camera_permission_result | avatar | conversation_id, result, capture_started, raw_video_stored |
| voice_segment_detected | voice | start_ms, end_ms, peak_rms, local_sample_only, capture_started, raw_audio_stored |
| stt_completed | voice | latency_ms, model, local_sample_only, capture_started, raw_audio_stored |
| tts_started | voice | voice_id, chars, local_sample_only, audio_playback_started, raw_audio_stored |
| tts_completed | voice | latency_ms, duration_ms, local_sample_only, audio_playback_started, raw_audio_stored |
| voice_turn_rehearsed | voice | local_rehearsal_only, vad_segment_count, stt_model, tts_voice_id, live_napoleon_contacted, microphone_capture_started, audio_playback_started, raw_audio_stored, blocked_effects |
| barge_in_rehearsed | voice | local_rehearsal_only, barge_in_detected, interrupted_output, interrupt_at_ms, next_turn_prepared, microphone_capture_started, audio_playback_started, raw_audio_stored, live_napoleon_contacted, blocked_effects |
| voice_response_shaped | voice | local_preparation_only, profile_mode, child_protected, was_shortened, original_chars, spoken_chars, max_spoken_chars_applied, pacing, requires_guardian_review_reminder, bridge_provided_provenance, microphone_capture_started, audio_playback_started, raw_audio_stored, live_napoleon_contacted, blocked_effects |
| avatar_state_changed | avatar | local_display_only, avatar_state, expression, gaze_target, stance, bridge_provided_provenance, camera_capture_started, face_detection_started, affect_inferred, avatar_animation_started, live_napoleon_contacted, blocked_effects |
| avatar_expression_set | avatar | stance, expression |
| camera_state_estimated | perception | present, looking_at_screen, confidence |
| eval_case_started | evaluator | case_id |
| eval_case_completed | evaluator | case_id, score |
| evolution_proposal_created | evolution | proposal_id, risk_level |
| conversation_capability_signal | capability_intelligence | observed_at, conversation_id, turn_id, profile_mode, channel, topic_label, intent_label, capability_label, capability_status, outcome_signal, confidence, architecture_area, privacy_class |
| capability_recommendation_created | capability_intelligence | recommendation_id, capability_label, architecture_area, priority_score, score_components, risk_level, evidence_count, suggested_next_step |
| capability_recommendation_send_failed | capability_intelligence | request_id, reason, status, blocked_effects |
| capability_intelligence_answered | capability_intelligence | conversation_id, turn_id, profile_mode, kind, evidence_count |
| capability_ledger_persisted | capability_intelligence | conversation_id, turn_id, evidence_count, privacy_class, storage |
| capability_ledger_cleared | capability_intelligence | conversation_id, evidence_count, storage, approval_captured, memory_write_performed, external_send_performed |
| capability_ledger_exported | capability_intelligence | conversation_id, evidence_count, storage, approval_captured, memory_write_performed, external_send_performed |
| capability_taxonomy_label_renamed | capability_intelligence | conversation_id, dimension, source_label, display_label, storage, approval_captured, memory_write_performed, external_send_performed |
| capability_taxonomy_labels_merged | capability_intelligence | conversation_id, dimension, source_label, target_label, storage, approval_captured, memory_write_performed, external_send_performed |
| capability_taxonomy_label_marked | capability_intelligence | conversation_id, dimension, source_label, marker, value, storage, approval_captured, memory_write_performed, external_send_performed |
| capability_taxonomy_reset | capability_intelligence | conversation_id, storage, approval_captured, memory_write_performed, external_send_performed |
| memory_proposal_send_started | governance_ux | conversation_id, request_id, proposal_id, profile_mode |
| memory_proposal_send_completed | governance_ux | conversation_id, request_id, proposal_id, decision_id, audit_id, outcome, approval_captured, memory_write_performed, external_send_performed |
| memory_proposal_send_failed | governance_ux | conversation_id, request_id, proposal_id, reason, status, blocked_effects |
| bridge_contract_evidence | bridge | operation_id, request_kind, status, reason, http_status, target_path, trace_id, request_id, decision_id, audit_id, governance_outcome, descriptor_state, profile_mode, selected_agent_ids, allowed_effects, blocked_effects, provenance_verified |
| bridge_readiness_proof_exported | bridge | descriptor_state, checksum_state, signature_state, evidence_capture_state, evidence_comparison_state, proof_comparison_status, proof_comparison_change_count, last_evidence_status, last_failure_reason |
| napoleon_response_proof_exported | bridge | status, governance, response_trace_id, response_audit_id, proof_comparison_status, proof_comparison_change_count, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |

Initial local implementation: Text Concierge emits `conversation_capability_signal` records from `rehearsal_preview_created`, governance review required/blocked/acknowledged events, memory proposal review events, bridge failures, and normal response generation. These records are stored in the count and age bounded ledger in `app/src/capabilityLedger.ts` and persisted as browser-local metadata through `app/src/capabilityLedgerStorage.ts`. The query surface emits `capability_intelligence_answered` when Concierge answers common, working-well, missing/blocked, easy-to-evolve, architecture-area, recommended-next, increasing, worsening-missing, recently-working, or weekly-change capability questions from local aggregates and 7 day trend windows. Recommendation answers include local risk/value score components and scoring caveats. The Chief of Staff steering draft emits `capability_recommendation_created` with proposal-only boundary fields, endpoint send state, capability label, architecture area, and evidence count. Governed steering submission emits `capability_recommendation_send_started`, `capability_recommendation_send_completed`, or `capability_recommendation_send_failed` with request, proposal, decision, audit, fail-closed reason metadata, and blocked effects; child-protected submissions carry child-safety caution, child profile scope, and guardian/owner review wording in the governed packet, and review responses that claim side effects are recorded as contract mismatches. Governed memory proposal review submission emits `memory_proposal_send_started`, `memory_proposal_send_completed`, or `memory_proposal_send_failed` with request, proposal, decision, audit, fail-closed reason metadata, and blocked effects, while recording that approval capture, memory writes, and external sends were not performed. Live text bridge failures emit `bridge_request_failed` with sanitized reason metadata and blocked effects; early local failures preserve the relevant text-turn, memory proposal, or Chief of Staff steering blocked-effect list, while remote failures preserve Napoleon-supplied blocked effects where available. Visible text-turn, memory proposal, and steering failure messages show the same blocked effects without raw prompt or response text. Text-turn failures show the reason and blocked effects in both the bridge failure panel and the conversation transcript. Live text bridge calls can also produce sanitized `bridge_contract_evidence` records for local runtime contract comparison. These records are not Napoleon audit records and must omit raw prompt text, response text, endpoint hosts, bearer tokens, request bodies, and response bodies. The Text Concierge readiness panel presents endpoint, descriptor, checksum/signature, evidence capture/comparison, last live-send outcome, and blocked-effect state as a local preflight summary only; it updates from in-session bridge evidence, shows the last fail-closed reason when Napoleon denied a send, and marks comparison failed if the captured operation path/request kind drifts from the generated registry or if raw/secret fields appear, but it does not emit Napoleon audit records or grant authority. The composer-side live-send preflight checklist is local display state only and does not emit new telemetry or audit records by itself. Its local readiness proof export emits `bridge_readiness_proof_exported` and includes descriptor/evidence status, last operation path, last failure reason, blocked effects, plus sanitized in-session proof comparison status and change count while excluding raw prompts, response bodies, endpoint hosts, bearer tokens, request bodies, and response bodies. The last successful Napoleon proof panel reuses returned live response governance, trace, audit, delegation, recommendation, allowed-effect, and blocked-effect metadata already covered by bridge response handling; it does not emit a new audit record by itself and must not be treated as approval or execution proof. Its sanitized export emits `napoleon_response_proof_exported` with status, governance, trace/audit references, false boundary flags, sanitized in-session proof comparison status, and change count only; the export is not a Napoleon audit record and excludes raw prompts, response text, endpoint hosts, bearer tokens, request bodies, and response bodies. The proof comparison uses the previous proof exported in the same app session and compares returned metadata only: proof status, governance, decision, trace, audit, selected agents, allowed effects, and blocked effects. The Text Concierge UI keeps returned delegation and proof in one local presentation state so local-only answers, blocked preflight paths, and bridge failures clear both displays together. The local harness endpoint preset is settings state only; it points at `http://127.0.0.1:8787` and does not start services, write memory, dispatch agents, send externally, or capture approval. The `make app-smoke` check exercises the same local harness text path with injected transport and verifies the UI-facing delegation, last successful proof view, sanitized Napoleon proof export comparison, blocked effects, readiness evidence inputs, denied fail-closed text turn details, and response-side forbidden side-effect claims that are reported as contract mismatches. The app test suite also renders the React UI and clicks through the local harness preset, descriptor discovery, governed send, repeated Napoleon proof export comparison, and sanitized output checks. `scripts/generate_bridge_operations.py` derives the bridge operation registry from `api/napoleon_bridge.openapi.yaml`, and `scripts/validate_repo.py` checks the generated file before comparing captured bridge evidence. `scripts/bridge_evidence_capture.py` discovers `/v1/concierge/chief-of-staff/descriptor` first, fails closed if that preflight is invalid, then sends one governed text turn to a configured endpoint and writes only sanitized evidence. `scripts/bridge_evidence_compare.py` compares captured evidence with the local bridge operation registry and `api/napoleon_bridge.openapi.yaml`, while also rejecting obvious secret or raw payload fields. `make bridge-evidence-capture` exercises capture against the local harness, and `make bridge-evidence-compare` runs the comparator against `examples/sample_bridge_contract_evidence.json`; future live captures should pass the same check before being used as runtime evidence. Bridge bearer tokens are connection credentials and are excluded from telemetry attributes, bridge evidence records, readiness proof exports, and Napoleon response proof exports. Clear, export, and taxonomy controls emit local audit events without granting approval, writing memory, dispatching agents, or sending externally.

Governed memory proposal review responses that claim memory writes, approval capture, external sends, agent dispatch, or local application are reported as `contract_mismatch` failures through `memory_proposal_send_failed`.

Live text responses that claim memory writes, approval capture, external sends, agent dispatch, or local application are reported as `contract_mismatch` failures through `bridge_request_failed` and remain visible through the bridge-blocked transcript message. The local harness can emit matching forbidden-claim response shapes for text, Chief of Staff steering, and memory proposal review paths so local checks can keep those failure signals exercised.

When descriptor discovery has not completed, live text turns, memory proposal handoff, and Chief of Staff steering handoff fail closed before request fetch and report descriptor mismatch failures with the relevant blocked-effect list.

## 5. Metrics

### Product metrics

- task_success_rate
- routing_accuracy
- clarification_rate
- user_correction_rate
- unsafe_action_attempt_rate
- governance_block_rate
- stance_fit_rating
- capability_success_rate
- capability_gap_rate
- capability_recommendation_acceptance_rate
- correctly_blocked_request_rate

### Performance metrics

- app_start_ms
- text_turn_latency_ms
- napoleon_bridge_latency_ms
- voice_vad_latency_ms
- stt_latency_ms
- tts_start_latency_ms
- avatar_frame_rate
- camera_processing_ms

### Reliability metrics

- bridge_error_rate
- telemetry_drop_rate
- evaluator_failure_rate
- crash_free_sessions
- local_buffer_size

### Privacy metrics

- raw_audio_storage_enabled
- raw_video_storage_enabled
- camera_enabled_sessions
- mic_enabled_sessions
- child_profile_sessions
- redaction_failure_count
- raw_conversation_retention_enabled

## 6. Logs

Logs must be structured JSON.

Avoid raw user content by default.

Example:

```json
{
  "ts": "2026-06-07T12:00:00Z",
  "level": "info",
  "event": "stance_selected",
  "trace_id": "trace_123",
  "turn_id": "turn_456",
  "user_profile": "adult_owner",
  "stance": "direct_strategic",
  "confidence": 0.82,
  "reason_code": "architecture_review"
}
```

Capability intelligence logs and persisted snapshots must avoid raw user content by default. Store timestamps, labels, counts, trend deltas, score components, confidence, privacy class, architecture area, suggested next step, taxonomy edits, retention settings, scoring caveats, and trace references rather than transcripts. Local export is JSON metadata only and does not grant permission to share externally.

## 7. Redaction policy

Before telemetry leaves the local device:

- Remove raw audio
- Remove raw video
- Redact email addresses where possible
- Redact child names unless explicit debug mode is enabled
- Replace message content with hashes or summaries when possible
- Preserve enough metadata for debugging

## 8. Local buffer

The local buffer stores telemetry when the collector is unavailable.

Requirements:

- Bounded size
- User-visible retention settings
- Manual delete option
- Export option for debugging
- Encryption at rest when feasible

## 9. Dashboards

Minimum dashboards:

1. Evaluator readiness
2. Text turn quality
3. Voice pipeline latency
4. Avatar performance
5. Governance blocks and approvals
6. Stance fit and corrections
7. Privacy controls and capture state
8. Evolution proposal status
9. Conversation capability intelligence

The Conversation Capability Intelligence dashboard should answer:

- Most common topic, intent, and capability labels.
- Capabilities with high success and low correction rates.
- Missing or degraded capabilities grouped by architecture area.
- Correctly blocked unsafe requests versus failed safe requests.
- Recommendations ranked by value, effort, risk, and evaluator gap.
- Child protected aggregates, minimized and separated from adult-owner aggregates.

## 10. Alerts

Alert conditions:

- Hard fail in evaluator
- Unsafe action attempt
- Child policy violation
- Missing trace events
- Telemetry redaction failure
- Camera or mic active without visible UI state
- Regression from previous evaluator run
