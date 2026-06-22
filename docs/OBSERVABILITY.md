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
| child_policy_applied | runtime | conversation_id, turn_id, profile, profile_mode, guardian_review_required, secret_keeping_allowed, memory_write_allowed, approval_capture_allowed, external_send_allowed, agent_dispatch_allowed |
| context_requested | bridge | context_type, purpose |
| governance_decision | Napoleon | action_type, decision, reason |
| delegation_requested | Napoleon | target_agent, reason |
| response_generated | UI | conversation_id, turn_id, profile, profile_mode, response_type, governance_outcome, decision_id, audit_id |
| response_failed | UI | conversation_id, turn_id, profile, profile_mode, error, bridge_failure_reason, status, blocked_effects, decision_id, audit_id, governance_outcome |
| bridge_request_failed | bridge | trace_id, request_id, reason, status, profile_mode, descriptor_failure_reason, blocked_effects |
| chief_of_staff_capabilities_discovered | bridge | conversation_id, capability_count, agent_count, profile_metadata_returned, service_id, runtime_authority, blocked_effects, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed, response_approval_captured, response_memory_write_performed, response_agent_dispatch_performed, response_external_send_performed |
| chief_of_staff_capabilities_blocked | bridge | conversation_id, capability_count, agent_count, profile_metadata_returned, service_id, runtime_authority, blocked_effects, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed, response_approval_captured, response_memory_write_performed, response_agent_dispatch_performed, response_external_send_performed |
| mic_permission_requested | voice | conversation_id, microphone_setting_enabled, local_only, capture_started, raw_audio_stored, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| mic_permission_result | voice | conversation_id, result, capture_started, raw_audio_stored, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| camera_permission_requested | avatar | conversation_id, camera_setting_enabled, local_only, capture_started, raw_video_stored, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| camera_permission_result | avatar | conversation_id, result, capture_started, raw_video_stored, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| privacy_setting_changed | privacy | conversation_id, setting, enabled, local_only, raw_audio_stored, raw_video_stored, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| voice_segment_detected | voice | start_ms, end_ms, peak_rms, local_sample_only, capture_started, raw_audio_stored, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| stt_completed | voice | latency_ms, model, local_sample_only, capture_started, raw_audio_stored, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| tts_started | voice | voice_id, chars, local_sample_only, audio_playback_started, raw_audio_stored, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| tts_completed | voice | latency_ms, duration_ms, local_sample_only, audio_playback_started, raw_audio_stored, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| voice_turn_rehearsed | voice | local_rehearsal_only, vad_segment_count, stt_model, tts_voice_id, vad_latency_ms, stt_latency_ms, napoleon_latency_ms, tts_latency_ms, total_latency_ms, live_napoleon_contacted, microphone_capture_started, audio_playback_started, raw_audio_stored, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed, blocked_effects |
| barge_in_rehearsed | voice | local_rehearsal_only, barge_in_detected, interrupted_output, interrupt_at_ms, next_turn_prepared, microphone_capture_started, audio_playback_started, raw_audio_stored, live_napoleon_contacted, blocked_effects |
| voice_response_shaped | voice | local_preparation_only, profile_mode, child_protected, was_shortened, original_chars, spoken_chars, max_spoken_chars_applied, pacing, requires_guardian_review_reminder, bridge_provided_provenance, microphone_capture_started, audio_playback_started, raw_audio_stored, live_napoleon_contacted, blocked_effects |
| child_voice_policy_applied | voice | profile_mode, child_protected, max_spoken_chars_applied, pacing, requires_guardian_review_reminder, local_preparation_only, microphone_capture_started, audio_playback_started, raw_audio_stored, live_napoleon_contacted, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed, blocked_effects |
| wake_word_sample_detected | voice | local_sample_only, enabled, detected, detected_at_ms, confidence, profile_mode, child_protected, guardian_review_reminder, listening_started, microphone_capture_started, raw_audio_stored, live_napoleon_contacted |
| avatar_state_changed | avatar | local_display_only, avatar_state, expression, gaze_target, profile_mode, child_protected, camera_policy, affect_policy, stance, bridge_provided_provenance, camera_capture_started, face_detection_started, affect_inferred, avatar_animation_started, live_napoleon_contacted, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed, guardian_approval_captured, blocked_effects |
| child_avatar_policy_applied | avatar | profile_mode, child_protected, camera_policy, affect_policy, guardian_approval_captured, local_display_only, camera_capture_started, face_detection_started, affect_inferred, avatar_animation_started, live_napoleon_contacted, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed, blocked_effects |
| avatar_model_loaded | avatar | local_reference_only, model_loaded, model_format, model_path, display_name, profile_mode, child_protected, renderer_started, camera_capture_started, face_detection_started, affect_inferred, live_napoleon_contacted, guardian_approval_captured, blocked_effects |
| avatar_renderer_readiness_prepared | avatar | local_readiness_only, renderer_ready, renderer_started, render_loop_started, canvas_allocated, model_display_name, model_format, profile_mode, child_protected, camera_capture_started, face_detection_started, affect_inferred, live_napoleon_contacted, guardian_approval_captured, blocked_effects |
| avatar_expression_set | avatar | local_metadata_only, stance, expression, profile_mode, child_protected, bridge_provided_provenance, avatar_animation_started, affect_inferred, camera_capture_started, face_detection_started, live_napoleon_contacted, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed, guardian_approval_captured, blocked_effects |
| lip_sync_started | avatar | local_metadata_only, profile_mode, audio_playback_started, avatar_animation_started, live_napoleon_contacted, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| lip_sync_completed | avatar | local_metadata_only, profile_mode, child_protected, cue_count, duration_ms, peak_mouth_open, audio_playback_started, microphone_capture_started, raw_audio_stored, avatar_animation_started, camera_capture_started, face_detection_started, affect_inferred, live_napoleon_contacted, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed, guardian_approval_captured, blocked_effects |
| gaze_target_updated | avatar | local_metadata_only, profile_mode, child_protected, guardian_review_required, camera_policy, animation_policy, attention_policy, eye_target, horizontal_offset, vertical_offset, confidence, gaze_tracking_started, avatar_animation_started, camera_capture_started, face_detection_started, affect_inferred, live_napoleon_contacted, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed, guardian_approval_captured, blocked_effects |
| camera_state_estimated | perception | present, looking_at_screen, confidence |
| eval_case_started | evaluator | case_id |
| eval_case_completed | evaluator | case_id, score |
| learning_signal_recorded | evolution | signal_id, conversation_id, turn_id, trace_id, profile_mode, channel, signal_type, capability_id, architecture_area, confidence, privacy_class, evidence_ref_count, proposal_only, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| evolution_proposal_created | evolution | proposal_id, risk_level |
| conversation_capability_signal | capability_intelligence | observed_at, conversation_id, turn_id, profile_mode, channel, topic_label, intent_label, capability_label, capability_status, outcome_signal, confidence, architecture_area, privacy_class |
| capability_recommendation_created | capability_intelligence | recommendation_id, capability_label, architecture_area, priority_score, score_components, risk_level, evidence_count, suggested_next_step |
| chief_of_staff_steering_draft_exported | capability_intelligence | conversation_id, capability, evaluator_case_id, proposal_id, learning_signal_count, proposal_only, approval_captured, memory_write_allowed, agent_dispatch_allowed, external_send_allowed |
| capability_recommendation_send_failed | capability_intelligence | request_id, profile_mode, reason, descriptor_failure_reason, status, blocked_effects, decision_id, audit_id, governance_outcome |
| capability_taxonomy_review_send_failed | capability_intelligence | conversation_id, request_id, profile_mode, reason, descriptor_failure_reason, status, blocked_effects, decision_id, audit_id, governance_outcome |
| capability_intelligence_answered | capability_intelligence | conversation_id, turn_id, profile_mode, kind, evidence_count |
| capability_ledger_persisted | capability_intelligence | conversation_id, turn_id, evidence_count, privacy_class, storage |
| capability_ledger_cleared | capability_intelligence | conversation_id, evidence_count, storage, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| capability_ledger_exported | capability_intelligence | conversation_id, evidence_count, storage, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| capability_taxonomy_label_renamed | capability_intelligence | conversation_id, dimension, source_label, display_label, storage, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| capability_taxonomy_labels_merged | capability_intelligence | conversation_id, dimension, source_label, target_label, storage, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| capability_taxonomy_label_marked | capability_intelligence | conversation_id, dimension, source_label, marker, value, storage, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| capability_taxonomy_reset | capability_intelligence | conversation_id, storage, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| memory_proposal_send_started | governance_ux | conversation_id, request_id, proposal_id, profile_mode |
| memory_proposal_send_completed | governance_ux | conversation_id, request_id, proposal_id, decision_id, audit_id, outcome, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| memory_proposal_send_failed | governance_ux | conversation_id, request_id, proposal_id, profile_mode, reason, descriptor_failure_reason, status, blocked_effects, decision_id, audit_id, governance_outcome |
| governance_review_send_started | governance_ux | conversation_id, request_id, decision_id, audit_id, profile_mode |
| governance_review_send_completed | governance_ux | conversation_id, request_id, decision_id, audit_id, outcome, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed, applied_locally |
| governance_review_send_failed | governance_ux | conversation_id, request_id, decision_id, audit_id, governance_outcome, profile_mode, reason, descriptor_failure_reason, status, blocked_effects |
| bridge_contract_evidence | bridge | operation_id, request_kind, transport, status, reason, http_status, target_path, trace_id, request_id, decision_id, audit_id, governance_outcome, descriptor_state, descriptor_failure_reason, profile_mode, runtime_validation_source, selected_agent_ids, allowed_effects, blocked_effects, provenance_verified |
| bridge_readiness_proof_exported | bridge | descriptor_state, checksum_state, signature_state, descriptor_text_turn_route_advertised, evidence_capture_state, evidence_comparison_state, runtime_validation_source, promotion_gate, evaluator_http_status, evaluator_failure_reason, evaluator_target_path, proof_comparison_status, proof_comparison_change_count, last_evidence_status, last_failure_reason |
| napoleon_response_proof_exported | bridge | status, handled_by, attribution_boundary, governance, profile_mode, response_trace_id, response_audit_id, selected_agent_count, selected_agent_selection_reason_count, allowed_effect_count, blocked_effect_count, target_capability_returned, recommendation_provenance_returned, proof_comparison_status, proof_comparison_change_count, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| voice_pipeline_proof_exported | voice | profile_mode, proposal_only, can_start_live_voice, stage_count, blocked_effects, proof_comparison_status, proof_comparison_change_count, microphone_capture_started, audio_playback_started, raw_audio_stored, live_napoleon_contacted, approval_captured, memory_write_performed, agent_dispatch_performed, external_send_performed |
| camera_state_estimated | avatar | local_metadata_only, profile_mode, child_protected, guardian_review_required, camera_policy, face_pose_policy, affect_policy, attention_policy, face_present, head_yaw_degrees, head_pitch_degrees, head_roll_degrees, confidence, camera_capture_started, raw_video_stored, face_detection_started, affect_inferred, attention_inferred, live_napoleon_contacted, guardian_approval_captured, blocked_effects |
| affect_signal_fused | avatar | local_metadata_only, profile_mode, child_protected, guardian_review_required, camera_policy, microphone_policy, storage_policy, affect_policy, emotion_fact_policy, uncertainty_label, display_label, confidence, input_signals, emotion_claimed_as_fact, camera_capture_started, microphone_capture_started, raw_video_stored, raw_audio_stored, live_face_detection_started, live_affect_model_started, attention_inferred, avatar_animation_started, live_napoleon_contacted, guardian_approval_captured, blocked_effects |

Initial local implementation: Text Concierge emits `conversation_capability_signal` records from `rehearsal_preview_created`, governance review required/blocked/acknowledged/submitted events, memory proposal review events, bridge failures, and normal response generation. Successful and failed text response events include the active local profile and Napoleon profile mode so derived capability signals keep child-protected, guest, collaborator, or owner scope instead of defaulting to another profile. Local Rehearsal Mode governance review-required, blocked `no_go`, acknowledgement, and memory proposal events emit the active profile mode without contacting Napoleon, so child-protected previews become child-sensitive local capability signals. Governed live text sends emit metadata-only `identity_resolved`, `intent_detected`, `stance_selected`, `governance_decision`, `context_requested`, and `delegation_requested` events before the bridge request, tied to the same trace and turn without raw prompt text, endpoint hosts, bearer tokens, request bodies, or response bodies. Child-protected governed text sends also emit `child_policy_applied` with guardian-review, no-secret-keeping, and false memory-write, approval-capture, external-send, and agent-dispatch policy flags. These records are stored in the count and age bounded ledger in `app/src/capabilityLedger.ts` and persisted as browser-local metadata through `app/src/capabilityLedgerStorage.ts`. The query surface emits `capability_intelligence_answered` with the active profile mode when Concierge answers common, working-well, missing/blocked, easy-to-evolve, architecture-area, recommended-next, increasing, worsening-missing, recently-working, or weekly-change capability questions from local aggregates and 7 day trend windows, without contacting Napoleon. Recommendation answers include local risk/value score components and scoring caveats. Runtime learning-signal helpers convert capability metadata into schema-shaped correction, rating, and repeated-pattern records plus count-only telemetry attributes, while keeping raw content out, child-protected records minimized, and all evolution boundaries proposal-only. The Chief of Staff steering draft emits `capability_recommendation_created` with proposal-only boundary fields, endpoint send state, capability label, architecture area, and evidence count; draft creation also emits `learning_signal_recorded` for each attached metadata-only learning signal using count-only attributes. Exporting that local draft emits `chief_of_staff_steering_draft_exported` with count and ID metadata only, while the visible JSON stays local, excludes endpoint hosts and raw retained message text, and is cleared when connection or descriptor context changes. Governed governance review submission emits `governance_review_send_started`, `governance_review_send_completed`, or `governance_review_send_failed` with request, decision, audit, governance outcome when blocked by governance, fail-closed reason metadata, and blocked effects, while recording that approval capture, memory writes, agent dispatch, external sends, and local application were not performed. Governed steering submission emits `capability_recommendation_send_started`, `capability_recommendation_send_completed`, or `capability_recommendation_send_failed` with request, proposal, decision, audit, fail-closed reason metadata, and blocked effects; child-protected submissions carry child-safety caution, child profile scope, and guardian/owner review wording in the governed packet, and review responses that claim side effects are recorded as contract mismatches. Governed taxonomy review submissions carry child profile scope and guardian/owner review wording for child-protected packets before review handoff. Governed memory proposal review submission emits `memory_proposal_send_started`, `memory_proposal_send_completed`, or `memory_proposal_send_failed` with request, proposal, decision, audit, fail-closed reason metadata, and blocked effects, while recording that approval capture, memory writes, and external sends were not performed. Live text bridge failures emit `bridge_request_failed` with sanitized reason metadata, active profile mode, descriptor-specific preflight reason when available, and blocked effects; early local failures preserve the relevant text-turn, governance review, memory proposal, Chief of Staff steering, or Chief of Staff taxonomy review blocked-effect list, while remote failures preserve Napoleon-supplied blocked effects where available. Visible text-turn, governance review, memory proposal, steering, and taxonomy review failure messages show the same blocked effects without raw prompt or response text. Text-turn bridge failures show the reason, profile mode, descriptor-specific reason when available, and blocked effects in both the bridge failure panel and the conversation transcript; blocked transcript metadata also carries the descriptor-specific reason when available, so missing descriptor and checksum/signature mismatch failures remain distinguishable. Live text bridge calls can also produce sanitized `bridge_contract_evidence` records for local runtime contract comparison. Explicit `/cos/capabilities` advisory discovery emits only count, service, runtime-authority, blocked-effect, and false side-effect metadata after descriptor discovery passes, without raw prompts, endpoint hosts, tokens, request bodies, or response bodies. Explicit `/cos/text-turn` advisory harness sends record the actual `/cos/text-turn` target path while remaining non-authorizing, and successful app sends must observe a matching `/cos/trace/{trace_id}` envelope before the response is accepted as successful bridge evidence; script-captured `/cos` evidence discovers `/cos/descriptor`, sends the harness text-turn request shape, compares `/cos/text-turn` as an explicit text-turn advisory alias, and still rejects raw/secret fields. These records include canonical operation transport and descriptor-specific preflight reason when available, are not Napoleon audit records, and must omit raw prompt text, response text, endpoint hosts, bearer tokens, request bodies, and response bodies. Script-captured evidence includes `runtimeValidationSource` so local harness or simulation records stay distinct from real Napoleon runtime evidence; descriptor-identified local harness runs fail closed when mislabeled as real runtime evidence. The Text Concierge readiness panel presents endpoint, descriptor, checksum/signature, evidence capture/comparison, runtime-validation source, last live-send outcome, and blocked-effect state as a local preflight summary only; it updates from in-session bridge evidence, shows the last fail-closed reason when Napoleon denied a send, marks local harness or local simulation validation as not real Napoleon runtime validation, and marks comparison failed if the captured operation transport/path/request kind drifts from the generated registry or the explicit `/cos/text-turn` advisory alias, or if raw/secret fields appear, but it does not emit Napoleon audit records or grant authority. The composer-side live-send preflight checklist is local display state only and does not emit new telemetry or audit records by itself; it also displays runtime-validation source, evidence capture/comparison, and promotion-gate warnings from the existing readiness state. Its local readiness proof export emits `bridge_readiness_proof_exported` and includes descriptor/evidence status, runtime-validation source, promotion gate, last operation transport and path, last failure reason, blocked effects, plus sanitized in-session proof comparison status and change count while excluding raw prompts, response bodies, endpoint hosts, bearer tokens, request bodies, and response bodies. Bridge readiness proof comparison rejects previous or current proof JSON if unsafe field names, normalized snake_case raw-field aliases, endpoint-like values, loopback hosts, bearer credentials, or authorization strings appear anywhere in the proof. The last successful Napoleon proof panel reuses returned live response governance, profile mode, trace, audit, target-capability, selected-agent, selected-agent selection-reason, recommendation, allowed-effect, and blocked-effect metadata already covered by bridge response handling; it does not emit a new audit record by itself and must not be treated as approval or execution proof. Its sanitized export emits `napoleon_response_proof_exported` with status, explicit handled-by provenance, attribution boundary, governance, profile mode, trace/audit references, returned target capability separate from selected agents, returned Napoleon recommendation summary, selected-agent selection reasons in the export body, count-only selected-agent and selection-reason telemetry, false boundary flags, sanitized in-session proof comparison status, and change count only; the export is not a Napoleon audit record and excludes raw prompts, response text, endpoint hosts, bearer tokens, request bodies, and response bodies. The proof comparison uses the previous proof exported in the same app session and compares returned metadata only: proof status, handled-by provenance, attribution boundary, governance, profile mode, decision, trace, audit, target capability, returned recommendation, selected agents, selected-agent selection reasons, allowed effects, and blocked effects. Napoleon proof comparison also rejects previous or current proof JSON if unsafe field names, normalized snake_case raw-field aliases, endpoint-like values, loopback hosts, bearer credentials, or authorization strings appear anywhere in the proof. The Text Concierge UI keeps returned delegation and proof in one local presentation state so local-only answers, blocked preflight paths, and bridge failures clear both displays together. The local harness endpoint preset is settings state only; it points at `http://127.0.0.1:8787` and does not start services, write memory, dispatch agents, send externally, or capture approval. The `make app-smoke` check exercises the same local harness text path with injected transport and verifies the UI-facing delegation, last successful proof view, sanitized Napoleon proof export comparison, blocked effects, readiness evidence inputs, denied fail-closed text turn details, and response-side forbidden side-effect claims that are reported as contract mismatches. The app test suite also renders the React UI and clicks through the local harness preset, descriptor discovery, governed send, repeated Napoleon proof export comparison, and sanitized output checks. `scripts/generate_bridge_operations.py` derives the bridge operation registry from `api/napoleon_bridge.openapi.yaml`, and `scripts/validate_repo.py` checks the generated file before comparing captured bridge evidence. `scripts/bridge_evidence_capture.py` discovers `/v1/concierge/chief-of-staff/descriptor` for generated bridge endpoints or `/cos/descriptor` for explicit advisory harness endpoints, fails closed if preflight is invalid, then sends one governed text turn to the matching generated or `/cos/text-turn` endpoint and writes only sanitized evidence. Capture accepts either a base URL or a known generated or `/cos` operation URL and normalizes it before descriptor preflight and text-turn submission, so full turn URLs do not create duplicated paths. `scripts/bridge_evidence_compare.py` compares captured evidence transport, path, and request kind with the local bridge operation registry plus the explicit `/cos/text-turn` advisory alias, while also rejecting obvious secret or raw payload fields, snake_case raw-field aliases, and invalid runtime-validation source labels. `scripts/live_runtime_validation.py` combines descriptor discovery, sanitized bridge evidence capture/comparison, and evaluator HTTP mode; it normalizes base or known operation bridge endpoint URLs before deriving evaluator URLs. Before retaining the live evaluator report, it removes evaluator response excerpts, audits retained bridge/evaluator artifacts for forbidden raw fields, snake_case raw-field aliases, and sensitive runtime values, and writes a non-authorizing summary plus a local promotion review draft with `runtimeValidation.source`, sanitized bridge operation metadata such as operation ID, request kind, transport, and target path, plus `artifactPrivacy` so local harness or simulation evidence remains distinct from real Napoleon runtime validation. The promotion review draft is local evidence only and is not Napoleon approval or release approval by itself. The same summary path supports explicit `/cos/text-turn` advisory evidence without retaining endpoint hosts or tokens. `make bridge-evidence-capture` exercises capture against the local harness, `make bridge-evidence-compare` runs the comparator against `examples/sample_bridge_contract_evidence.json`, and `make live-runtime-local-harness` proves the combined runner and artifact privacy audit against the local harness; future live captures should pass the same checks before being used as runtime evidence. Bridge bearer tokens are connection credentials and are excluded from telemetry attributes, bridge evidence records, readiness proof exports, Napoleon response proof exports, and live runtime validation artifacts. Clear, export, and taxonomy controls emit local audit events without granting approval, writing memory, dispatching agents, or sending externally.

Capability discovery telemetry, sanitized readiness proof exports, and the advisory capabilities panel distinguish Concierge local side-effect fields from response-side side-effect claim fields, so an unsafe Napoleon response can explain why discovery was blocked without retaining raw response content.

The combined live-runtime runner also writes sanitized descriptor-gated capability discovery evidence with count, capability IDs, authority-tier counts, blocked effects, runtime-authority state, and explicit false local approval, memory-write, agent-dispatch, external-send, endpoint-host, token, and response-body retention flags. When a configured real runtime base URL does not expose generated capability discovery, the runner can fall back from `/v1/concierge/chief-of-staff/capabilities` to `/cos/capabilities` after a 404 and accepts Napoleon's advisory-only snake-case capability manifests as metadata-only evidence. It records response-side approval-capture, memory-write, agent-dispatch, and external-send claims as separate remote-claim fields, and any true remote claim makes capability discovery fail closed while Concierge's local side-effect flags remain false. Promotion readiness remains blocked when that discovery fails.

Napoleon response proof export telemetry may report whether recommendation provenance was returned with `recommendationProvenanceReturned`, but it must not copy the recommendation summary text into telemetry attributes.

Napoleon response proof export telemetry may also report whether a target capability was returned with `targetCapabilityReturned`, but target capability presence remains separate from selected-agent counts so capability provenance is not misread as selected-agent delegation.

Napoleon response proof export telemetry may report allowed and blocked effect counts with `allowedEffectCount` and `blockedEffectCount`, but returned effect names remain in the sanitized local export body and visible UI instead of telemetry attributes.

Explicit advisory harness text sends normalize configured `/cos`, `/cos/descriptor`, `/cos/capabilities`, and `/cos/text-turn` endpoints to `POST /cos/text-turn` before recording sanitized bridge evidence. The evidence still records only the `/cos/text-turn` target path and matching `/cos/trace/{trace_id}` proof state, not endpoint hosts, tokens, prompts, request bodies, response bodies, or trace bodies.

Count-only Napoleon response proof telemetry derives selected-agent, selection-reason, allowed-effect, and blocked-effect totals from the sanitized proof export arrays, so punctuation inside returned text cannot inflate counts and the returned text remains local-only.

Sanitized Napoleon response proof exports preserve selected-agent names, selection reasons, allowed effects, and blocked effects from returned bridge provenance arrays before rendering, so multi-agent proof is not reconstructed from semicolon- or comma-delimited UI rows.

Governed memory proposal, governance review, Chief of Staff steering, and taxonomy review failure events and visible failure messages carry the active profile mode alongside fail-closed reason, returned decision/audit/governance references when available, and blocked-effect metadata. This keeps child-protected, guest, collaborator, or owner scope visible and preserves Napoleon-supplied denial context when a governed handoff is blocked before or after contacting Napoleon.

Governance review handoff target selection is named and local-only. Generated Concierge-compatible endpoints and the local harness resolve to `/v1/concierge/chief-of-staff/steering`; Napoleon root or explicit review endpoints resolve to `/chief-of-staff/reviews/governance`. The request records only the target path and operation name in the packet, not endpoint hosts or bearer tokens, and the response still fails closed unless governance, trace, audit, and false side-effect fields match.

Evolution proposal review target selection is also named and local-only for Chief of Staff steering and taxonomy review packets. Generated Concierge-compatible endpoints and the local harness resolve to `/v1/concierge/chief-of-staff/steering`; Napoleon root or explicit evolution review endpoints resolve to `/chief-of-staff/reviews/evolution-proposals`. The packet records only the target path and operation name, not endpoint hosts or bearer tokens, and the response still fails closed unless governance, trace, audit, and false side-effect fields match.

Explicit evolution proposal submission target selection is named for Napoleon's `/evolution/proposals` contract path. The request records only the target path and operation name, not endpoint hosts, bearer tokens, raw proposal bodies, approval capture, memory writes, registry updates, trace appends, task routing, agent dispatch, external sends, or local application. The response remains proposal-only evidence and cannot apply evolution changes from Concierge.

Explicit observability trace handoff target selection is named for Napoleon's `/observability/traces` contract path. The request records only the target path and operation name, not endpoint hosts, bearer tokens, raw trace bodies, approval capture, memory writes, trace append authority, task routing, agent dispatch, external sends, or local application. The response remains evidence-only and cannot create Napoleon audit authority from Concierge.

Napoleon agent and profile metadata discovery target selection is named for `/agents`, `/agents/{agent_id}`, and `/profiles/{profile_id}`. Retained local evidence records only target path, operation name, and conservative metadata such as agent/profile IDs, blocked effects, and explicit false side-effect flags. It does not retain endpoint hosts, bearer tokens, raw manifests, raw profile bodies, registry updates, agent dispatch, memory writes, approval capture, external sends, or runtime authority.

Evaluator review target selection is named for HTTP evaluator mode. Generated Concierge-compatible endpoints and the local harness resolve to `/v1/concierge/evaluate`; Napoleon root, explicit `/cos` endpoints, or explicit evaluation review endpoints resolve to `/chief-of-staff/reviews/evaluation`. The request records only the target path and operation name plus the evaluator case ID and prompt sent for evaluation, not endpoint hosts or bearer tokens. Retained evaluator reports include sanitized evaluation-target metadata with path, request kind, operation ID, false endpoint/token/body retention, and false approval, memory-write, agent-dispatch, and external-send flags. Retained evaluator reports are sanitized before they become local validation evidence and remain non-authorizing.

The governed-route registry displayed near bridge readiness shows the generated OpenAPI-required response fields for each route, making contract-mismatch expectations visible without retaining endpoint hosts, bearer tokens, prompts, request bodies, or response bodies.

The local telemetry buffer can also export the latest interaction trace as sanitized local metadata for trace-completeness review. Latest-trace selection prefers real turn events and follows local proof/export telemetry back to the referenced response trace rather than exporting the proof/export event as the conversation trace. The UI shows whether such a trace is available and disables latest-trace export when the buffer only contains non-interaction metadata. Changing telemetry retention or the active profile clears any rendered buffer or interaction trace export so stale snapshots are not left on screen after the visible buffer view or user scope changes. This export preserves trace, conversation, turn, user profile, channel, governance decision, sanitized Napoleon request, decision, audit, governance, failure-event-scoped failure, and blocked-effect references, and matching event metadata while excluding raw prompts, response text, endpoint hosts, bearer tokens, request bodies, and response bodies. It is not a Napoleon audit record, not Napoleon approval, not a memory write, not agent dispatch, and not permission to send externally.

Live voice readiness is a rendered gate derived from microphone permission events, privacy settings, descriptor readiness, bridge proof state, and Rehearsal Mode. It does not emit a live-start event because live voice capture, spoken Napoleon responses, and playback remain blocked until the governed voice pipeline exists. The governed voice pipeline plan is rendered proposal-only display state and does not emit a runtime start event; future events must be added only when capture, STT, bridge, TTS, and playback stages are implemented with explicit consent and proof. Its sanitized proof export emits `voice_pipeline_proof_exported` with blocked stage count, blocked effects, profile mode, proposal-only state, explicit false side-effect flags, and same-session comparison status/change count only; child protected proof metadata also includes `guardian_approval_capture` in blocked effects. It is not Napoleon approval, not guardian approval capture, not live runtime evidence, and excludes raw audio, prompts, endpoint hosts, bearer tokens, request bodies, and response bodies. The comparison uses the previous proof exported in the same app session and compares sanitized voice pipeline metadata only. Previous or current proof JSON is rejected if unsafe raw/secret field names, normalized snake_case raw-field aliases, endpoint-like values, bearer credentials, or authorization strings appear anywhere in the proof.

Local voice response shaping computes `was_shortened` from the spoken response body before bridge provenance prefixes or child-protected guardian-review wording are added. This keeps the metadata honest when safety wording makes the final spoken preview longer than the shortened returned text.

Media Session Controller state is rendered from local privacy settings, microphone/camera permission status, profile mode, and fixed playback preflight. It does not emit a separate runtime-start event because current microphone capture, camera capture, and audio playback remain stopped. Consent-relevant changes remain covered by `privacy_setting_changed`, `mic_permission_requested`, `mic_permission_result`, `camera_permission_requested`, and `camera_permission_result`; future preview start/stop events must carry explicit false raw-media, Napoleon-contact, memory-write, approval-capture, agent-dispatch, and external-send flags.

The readiness panel and sanitized readiness proof export include a promotion gate separate from the runtime-validation source. Local harness or local simulation evidence remains promotion-blocked until real Napoleon runtime evidence capture and comparison pass, and same-session proof comparison reports promotion-gate changes from sanitized metadata only. Descriptor-advertised governed handoff routes are included as sanitized capability labels so proof exports can explain text-only runtime descriptors without exposing endpoints or secrets; the proof export telemetry also records `descriptorTextTurnRouteAdvertised` as a boolean so missing text-turn routes are auditable without raw descriptor bodies. Advisory capability discovery state is included in readiness proof exports as metadata-only state, count, capability IDs, authority tiers, blocked effects, false runtime-authority/proposal-only boundary fields, and separate response-side side-effect claim booleans. Napoleon agent/profile metadata discovery state is included as metadata-only state, agent count, agent IDs, profile ID, blocked effects, and false registry-update, agent-dispatch, memory-write, approval-capture, and external-send fields without raw manifests or profile bodies. Evaluator HTTP status, sanitized failure reason, and target path can also be included in readiness proof exports and same-session comparisons; missing or failed evaluator HTTP mode keeps the promotion gate blocked and records false connection-value, credential-value, request-payload, response-payload, approval, memory-write, agent-dispatch, and external-send retention/effect flags. Descriptor discovery, endpoint changes, and bearer-token changes clear rendered readiness proof export and comparison state so local evidence reflects the current connection state.

Combined live-runtime validation summaries also include a machine-readable `promotionReadiness` gate with blocking reasons. This gate is local review evidence only; it does not grant Napoleon approval, release approval, memory writes, agent dispatch, external sends, approval capture, or permission to apply self-evolution changes. UI readiness proof exports preserve missing runtime-validation source as unavailable and promotion-blocked rather than converting it to real runtime evidence. Successful HTTP evaluator runs carry sanitized evaluator target metadata into `summary.json` and the promotion review draft, including target path, request kind, operation ID, and false endpoint/token/body retention plus false side-effect flags. Failed HTTP evaluator attempts write a sanitized non-authorizing failure report with the attempted evaluator target metadata; a missing Napoleon evaluator route is recorded as `http_evaluator_route_not_found` without retaining endpoint values, exception text, request bodies, or response bodies. Retained live-runtime artifacts fail the artifact privacy audit if they contain true endpoint, token, request-body, response-body, approval-capture, memory-write, agent-dispatch, or external-send boundary flags. Real `/cos` runtime bridge evidence may pass independently of HTTP evaluator mode; when an evaluator route is missing or fails, the summary keeps promotion blocked.

When live-runtime validation is run without a configured endpoint, it writes a sanitized `preflight.json` that records missing configuration, accepted real-runtime endpoint forms, derived descriptor/capability/text-turn/trace-proof targets when derivable, evaluator target path/request kind/operation ID when derivable, and explicit false retention plus side-effect fields without retaining endpoint hosts or tokens. It also records that local harness or simulation evidence is shape-only and cannot substitute for real Napoleon runtime readiness.

The standalone `make eval-http-local-harness` report is also labeled with `runtimeValidation.source=local_harness` and a caveat that it validates local evaluator transport only, not real Napoleon runtime behavior.

Standalone bridge evidence capture accepts `NAPOLEON_BRIDGE_ENDPOINT` as the governed bridge base URL or a known Concierge bridge operation URL and falls back to `NAPOLEON_EVAL_ENDPOINT` for evaluator-oriented setups; both paths still omit endpoint hosts and bearer tokens from retained evidence. The desktop app uses the same descriptor-first `/cos` alignment for live text sends: if a base URL does not expose generated `/v1/concierge/...` descriptor routes, descriptor discovery can fall back to `/cos/descriptor`, require an authority-safe live runtime descriptor, send the current `/cos/text-turn` contract, and verify `/cos/trace/{trace_id}` proof before treating bridge evidence as successful.

The generated bridge operation registry now carries canonical HTTP methods and required 200-response fields as well as paths, so descriptor discovery remains a `GET` operation while governed handoffs remain `POST` operations and runtime text, memory proposal review, governance review, Chief of Staff steering, and Chief of Staff taxonomy review responses fail closed if Napoleon omits OpenAPI-required top-level fields.

Wake-word readiness is represented as a local privacy setting and local display state only. Setting `wake_word` in `privacy_setting_changed` records whether the future wake-word option is enabled, while keeping always-on listening, microphone capture, raw audio storage, live Napoleon contact, approval capture, memory writes, agent dispatch, and external sends false. The local dry run emits `wake_word_sample_detected` from fixed sample metadata only and keeps listening, microphone capture, raw audio storage, live Napoleon contact, approval capture, memory writes, agent dispatch, and external sends false, with blocked effects included. Child protected wake-word readiness and sample metadata include `guardian_approval_capture` in blocked effects. No live `wake_word_detected` event is emitted until an explicit local detection path exists.

The canonical descriptor response sample is validated as contract-only metadata: it must keep runtime authority and command execution false, preserve fail-closed cache policy, carry checksum/signature proof, and keep authority effects blocked.

Explicit Napoleon advisory harness `/cos/descriptor` discovery is parsed as connection metadata only. Its snake-case descriptor fields are mapped into the same descriptor state, optional `X-Napoleon-Auth` credentials remain header-only, pending checksum/signature fields remain `not_checked`, TTL is preserved as the stale-descriptor gate, and any runtime-authority or command-execution grant fails closed as descriptor invalid.

Governed memory proposal review responses that claim memory writes, approval capture, external sends, agent dispatch, or local application are reported as `contract_mismatch` failures through `memory_proposal_send_failed`.

Live text responses that claim memory writes, approval capture, external sends, agent dispatch, or local application are reported as `contract_mismatch` failures through `bridge_request_failed` and remain visible through the bridge-blocked transcript message. The local harness can emit matching forbidden-claim response shapes for text, Chief of Staff steering, memory proposal review, and explicit new-agent proposal review paths so local checks can keep those failure signals exercised.

New-agent proposal review handoffs use the explicit Napoleon review target `/chief-of-staff/reviews/new-agent-proposals` with the `new_agent_proposal_review_handoff` request kind. Retained local evidence records the named target path and operation only; it does not retain endpoint hosts, tokens, raw proposals, registry writes, approval capture, agent dispatch, external sends, or local application.

Chief of Staff request handoffs use the explicit Napoleon request target `/chief-of-staff/requests` with the `chief_of_staff_request_handoff` request kind. Retained local evidence records the named target path and operation only; it does not retain endpoint hosts, tokens, raw request bodies, task-routing side effects, registry writes, trace appends, approval capture, memory writes, agent dispatch, external sends, or local application.

Governance evaluation handoffs use the explicit Napoleon evaluation target `/governance/evaluate` with the `governance_evaluation_handoff` request kind. Retained local evidence records the named target path and operation only; it does not retain endpoint hosts, tokens, raw request bodies, approval capture, task routing, memory writes, agent dispatch, external sends, trace appends, registry writes, or local application.

Evolution proposal submission handoffs use the explicit Napoleon target `/evolution/proposals` with the `evolution_proposal_submission_handoff` request kind. Retained local evidence records the named target path and operation only; it does not retain endpoint hosts, tokens, raw proposal bodies, approval capture, memory writes, registry updates, trace appends, task routing, agent dispatch, external sends, or local application.

Observability trace handoffs use the explicit Napoleon target `/observability/traces` with the `observability_trace_handoff` request kind. Retained local evidence records the named target path and operation only; it does not retain endpoint hosts, tokens, raw trace bodies, approval capture, memory writes, trace append authority, task routing, agent dispatch, external sends, or local application.

When descriptor discovery has not completed or the descriptor discovery cache is stale, live text turns, memory proposal handoff, Chief of Staff steering handoff, and Chief of Staff taxonomy review handoff fail closed before request fetch and report descriptor mismatch failures with the relevant blocked-effect list. When Rehearsal Mode is active, memory proposal review, Chief of Staff steering, and taxonomy review submit helpers fail closed before request fetch and emit their governed handoff failure events with blocked effects.

Descriptor discovery failures preserve `auth_failure`, `bridge_timeout`, and `http_failure` as local connection states and emit `descriptor_discovery_failed` rather than `descriptor_discovery_completed`. If a user attempts a governed text turn, memory proposal handoff, Chief of Staff steering handoff, or taxonomy review handoff after one of those failures, the preflight failure event carries the same reason before any request fetch is attempted.

Explicit descriptor `supportedHandoffs` / `supported_handoffs` lists are treated as contract claims. Unknown governed handoff names make descriptor discovery fail closed as an invalid descriptor instead of being dropped from telemetry or readiness proof state.

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
- voice_turn_total_latency_ms
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

Capability intelligence logs and persisted snapshots must avoid raw user content by default. Store timestamps, sanitized machine labels, counts, trend deltas, score components, confidence, privacy class, architecture area, suggested next step, taxonomy edits, retention settings, scoring caveats, and allowlisted local trace/event/audit references rather than transcripts. Sentence-like labels, email addresses, URLs, token-shaped values, and non-local evidence references are redacted before storage or export. Local export is JSON metadata only and does not grant permission to share externally.

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

Initial local implementation: Text Concierge stores emitted telemetry payloads in a browser-local buffer at `concierge_telemetry_buffer_v1`. The buffer defaults to the latest 200 events, can be reduced to latest 100, 50, or 25 events from settings, redacts sensitive attribute keys such as raw prompts, raw text, response text, endpoints, bearer tokens, request bodies, response bodies, raw audio, and raw video, and does not send externally. Ordinary events are not buffered when local telemetry is disabled, but privacy audit events for camera, microphone, and privacy settings remain buffered so consent-relevant changes stay locally auditable. The Text Concierge settings surface shows the buffered event count and last event, can export the redacted local JSON metadata, can clear the persisted buffer, prunes existing buffered metadata when the retention limit is reduced, and clears rendered buffer and trace exports when retention changes. The buffer and its export are local metadata only; they are not Napoleon approval, not Napoleon audit records, not memory writes, not agent dispatch, and not permission to send externally.

Requirements:

- Bounded size: initial implementation defaults to the latest 200 events and lets the user reduce retention to latest 100, 50, or 25 events.
- Redaction: initial implementation redacts common raw content, endpoint, body, and token fields before storage.
- User-visible retention settings: initial implementation stores the selected latest-event limit locally and immediately prunes existing buffered metadata when reduced.
- Stale export prevention: initial implementation clears rendered buffer and interaction trace exports when retention changes.
- Manual delete option: initial implementation clears the browser-local buffer from the settings surface.
- Export option for debugging: initial implementation exports redacted browser-local JSON metadata from the settings surface.
- Encryption at rest when feasible: future work.

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
