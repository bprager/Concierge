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

## 2. Signals

The system emits:

- Traces
- Metrics
- Structured logs
- Evaluator reports
- Privacy audit records
- Evolution proposals

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
| voice_segment_detected | voice | start_ms, end_ms |
| stt_completed | voice | latency_ms, model |
| tts_started | voice | voice_id, chars |
| tts_completed | voice | latency_ms, duration_ms |
| avatar_expression_set | avatar | stance, expression |
| camera_state_estimated | perception | present, looking_at_screen, confidence |
| eval_case_started | evaluator | case_id |
| eval_case_completed | evaluator | case_id, score |
| evolution_proposal_created | evolution | proposal_id, risk_level |

## 5. Metrics

### Product metrics

- task_success_rate
- routing_accuracy
- clarification_rate
- user_correction_rate
- unsafe_action_attempt_rate
- governance_block_rate
- stance_fit_rating

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

## 10. Alerts

Alert conditions:

- Hard fail in evaluator
- Unsafe action attempt
- Child policy violation
- Missing trace events
- Telemetry redaction failure
- Camera or mic active without visible UI state
- Regression from previous evaluator run
