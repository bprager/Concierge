# Backlog

## Backlog principles

Every story should include:

1. User value
2. Acceptance criteria
3. Observability requirements
4. Privacy and safety implications
5. Evaluator coverage

## Milestone P0: Evaluator foundation

| ID | Story | Priority | Acceptance criteria | Observability |
|---|---|---:|---|---|
| EV-001 | Define evaluator objectives and rubric | P0 | Rubric covers product, architecture, governance, stance, observability, and self-evolution | eval_rubric_loaded |
| EV-002 | Create scenario suite for Concierge design | P0 | At least 15 scenarios, including adult, child, adversarial, evolution, memory, bridge failure, privacy settings, and contract mismatch cases | eval_case_started, eval_case_completed |
| EV-003 | Define expected artifacts | P0 | PRD, contract, architecture, stance policy, observability, backlog, risk register required | eval_artifact_checked |
| EV-004 | Implement evaluator runner | P0 | Runner supports stub mode and HTTP Napoleon mode | eval_run_started, eval_run_completed |
| EV-005 | Add hard fail taxonomy | P0 | Missing memory policy, unsafe authority, no contract, no observability can fail run | eval_hard_fail_detected |
| EV-006 | Add GitHub Actions periodic run | P1 | Weekly scheduled run creates JSON report artifact | eval_ci_run_started |
| EV-007 | Add regression comparison | P1 | Current run compares score to previous report | eval_regression_detected |
| EV-008 | Add human review template | P1 | Reviewer can approve, reject, or request revision | eval_review_recorded |
| EV-009 | Add evaluator report dashboard placeholder | P2 | HTML report or markdown summary generated | eval_report_rendered |

### EV-002 details

User value: A broader evaluator catches governance, privacy, memory, and contract drift before Concierge depends on a live Napoleon runtime.

Acceptance criteria:

- The evaluator suite has at least 15 scenarios.
- Scenarios cover adult, child protected, guest/collaborator, adversarial, self-evolution, memory proposal review, bridge failure handling, privacy settings controls, and contract mismatch fail-closed behavior.
- Coverage tests verify the required scenario IDs and artifact checks.

Privacy and safety impact:

- New scenarios keep Concierge as a review and presentation surface.
- Memory writes, approval capture, external sends, side effects, and agent dispatch remain blocked unless Napoleon governance explicitly authorizes them.

Evaluator coverage:

- Covered by `MEMORY-PROPOSAL-001`, `BRIDGE-FAILURE-001`, `PRIVACY-SETTINGS-001`, and `CONTRACT-MISMATCH-001`.

## Milestone P1: Text Concierge MVP

| ID | Story | Priority | Acceptance criteria | Observability |
|---|---|---:|---|---|
| TX-001 | Create desktop shell skeleton | P0 | Tauri app opens text interface | app_started, app_ready |
| TX-002 | Add Napoleon bridge client | P0 | Text requests can be sent to configured Napoleon endpoint | bridge_request_started, bridge_request_completed |
| TX-003 | Add user profile resolver | P0 | Adult owner, child protected, guest supported | identity_resolved |
| TX-004 | Add interaction stance policy | P0 | Concierge selects stance and logs reason | stance_selected |
| TX-005 | Add governance confirmation UI | P0 | Side effects require visible confirmation; requires_review, deny, and no_go are visible and non-authority local acknowledgement cannot be mistaken for approval | governance_decision |
| TX-006 | Add text conversation trace | P0 | Every turn has trace_id and turn_id | user_message_received, response_generated |
| TX-007 | Add child profile response rules | P0 | Child mode uses simple language and restricted authority | child_policy_applied |
| TX-008 | Add memory update suggestion flow | P1 | Preferences are proposed, shown for review, and can be submitted for governed Napoleon review without silently storing or writing directly | memory_update_proposed, memory_proposal_send_started |
| TX-009 | Add local settings and privacy panel | P1 | User can configure endpoint, optional local bridge token, telemetry, profile, camera, mic | settings_changed |
| TX-010 | Add evaluator fixtures for text UI | P1 | Text mode can be smoke tested | text_smoke_eval_completed |
| TX-011 | Add Rehearsal Mode for governed turns | P0 | User can preview understood request, proposed Napoleon path, CoS review packet, allowed effects, blocked effects, approval state, memory proposal, trace/audit preview, and evaluator-case candidate before any live bridge call | rehearsal_preview_created |
| TX-012 | Add capability intelligence query surface | P1 | Local query surface answers common, working-well, missing/blocked, easy-to-evolve, architecture-area, and recommended-next capability questions from bounded local aggregates | capability_intelligence_answered |
| TX-013 | Add live bridge fail-closed connection states and delegation panel | P0 | Missing endpoint, descriptor mismatch, auth failure, contract mismatch, no-go, timeout, and HTTP failure are blocked visibly; live bridge readiness summarizes endpoint, descriptor integrity, evidence capture/comparison state, and blocked effects without implying approval; bridge-provided selected agents, reasons, effects, governance, trace, and audit references are shown without invented attribution | bridge_request_failed, bridge_request_completed |

### TX-005 details

User value: Governance confirmation UI makes Napoleon review outcomes visible before a user mistakes a draft or acknowledgement for permission to act.

Acceptance criteria:

- `allow_prepare_only`, `requires_review`, `deny`, and `no_go` have distinct visible states.
- Review panels show decision ID, audit ID, authority tier, approval requirement, rationale, blocked effects, and trace ID.
- Local acknowledgement may record that review was seen, but it is not Napoleon approval.
- `no_go` prevents sending the advisory request forward.
- Child protected mode uses stricter wording and never implies secret-keeping or external action.

Privacy and safety impact:

- Local acknowledgement does not execute side effects, write memory, send externally, or dispatch agents.
- Concierge remains a presentation and consent surface; Napoleon and Chief of Staff remain the authority layer.

Evaluator coverage:

- Covered by `GOVERNANCE-REVIEW-001`.

### TX-008 details

User value: Memory proposal review lets the user see possible preferences before anything becomes durable memory.

Acceptance criteria:

- Memory-like turns create a proposal-only review panel with proposal ID, source turn, profile, proposed value, rationale, review state, blocked effects, trace ID, and audit ID.
- Local acknowledgement records that the proposal was seen, but it is not Napoleon approval.
- Local dismissal hides the local proposal, but it does not delete or write Napoleon memory.
- A live memory proposal can be submitted to Napoleon review only through the governed bridge after endpoint and descriptor preflight pass.
- Napoleon review responses require matching governance, trace, and audit proof before Concierge displays them as reviewed.
- `memory_write`, `approval_capture`, external sends, and remote audit appends remain blocked.
- Child protected mode requires guardian-appropriate review and rejects secret-keeping.

Privacy and safety impact:

- No memory is written directly from Concierge.
- The review flow emits local telemetry for proposal creation, acknowledgement, dismissal, and governed submission without treating those events as approval.

Evaluator coverage:

- Covered by `MEMORY-PROPOSAL-001`.

### TX-011 details

User value: Rehearsal Mode lets the user inspect a Napoleon-bound turn before anything leaves the local preview path.

Acceptance criteria:

- Rehearsal Mode is enabled by default in text mode.
- Preview creation does not call the live Napoleon endpoint.
- The preview shows the understood request, proposed path, Chief of Staff packet, allowed effects, blocked effects, approval state, memory proposal, trace/audit preview, and evaluator-case candidate.
- Sending the advisory request is a separate action after the preview exists.

Privacy and safety impact:

- Raw user text stays in the local app during preview.
- The preview must not capture approval, write memory, send externally, or execute commands.
- Child protected mode keeps the same blocked effects and review-only memory behavior.

Evaluator coverage:

- Covered by adult, child, guest/collaborator, and adversarial scenarios where Rehearsal Mode must expose blocked effects and avoid live execution.

### TX-012 details

User value: The user can ask Concierge where it is useful, where it is failing, and what should be improved next.

Acceptance criteria:

- Concierge can answer common, working-well, missing/blocked, easy-to-evolve, architecture-area, and recommended-next capability questions from local aggregate signals.
- Easy-to-evolve and recommended-next answers use deterministic local ranking from count, confidence, capability status, architecture area, and suggested next step.
- Answers include counts or evidence strength, confidence, architecture area, and key caveats.
- Correctly blocked unsafe requests are classified separately from failed safe requests.
- Recommendations are proposal-only and do not implement features, grant approval, write memory, dispatch agents, or send externally.
- Child protected aggregates are minimized and separated from adult-owner aggregates.

Privacy and safety impact:

- The query surface uses derived metadata and redacted summaries by default.
- Raw conversation content is not stored or exported without explicit user-visible controls.

Evaluator coverage:

- Covered by `CAPABILITY-INTELLIGENCE-001`.

### TX-013 details

User value: The user can tell whether a response came from Napoleon, which capability or agent contributed, and why a live send was blocked.

Acceptance criteria:

- Live sends fail closed when no endpoint is configured, descriptor validation fails, auth fails, the response contract is invalid, local governance is `no_go`, Napoleon returns `deny` or `no_go`, or the bridge times out.
- Optional bridge tokens are sent only as `Authorization` headers and are not included in request bodies, telemetry, memory proposals, or capability exports.
- Configured Napoleon base URLs resolve to canonical bridge paths for text turns, descriptor discovery, Chief of Staff steering handoff, memory proposal review, and evaluator requests.
- Bridge operation IDs and paths are generated from `api/napoleon_bridge.openapi.yaml`, and app plus repository checks fail if the generated registry drifts from the canonical contract.
- Repository validation checks that governed bridge operations have matching request-kind constants, `NapoleonBearer` security, and named operation usage.
- Repository validation checks a canonical text-turn response example against the OpenAPI response schema and rejects inconsistent governance, trace, audit, delegation, or recommendation provenance.
- Repository validation scans runtime source for direct process execution, memory or graph access, and agent or tool dispatch outside the governed bridge.
- Descriptor discovery is visible as first-class connection state, including live-discovered, missing descriptor, and checksum/signature mismatch states.
- Live descriptor discovery resolves the configured Napoleon base URL to `/v1/concierge/chief-of-staff/descriptor` and treats invalid results as blocked connection state, not authority.
- Text Concierge shows a live bridge readiness summary that combines endpoint state, descriptor state, checksum/signature state, in-session sanitized evidence capture/comparison state, last live-send status and fail-closed reason, and blocked effects.
- Live text attempts update the readiness panel from captured `bridge_contract_evidence`; evidence comparison fails if the captured operation path or request kind drifts from the bridge registry or if raw/secret fields appear.
- Text Concierge settings include a local harness endpoint preset for `http://127.0.0.1:8787`; selecting it only configures endpoint and descriptor preflight state, and does not start, stop, or control the harness process.
- `make app-smoke` covers the local harness text path through descriptor discovery, governed send, delegation presentation inputs, blocked effects, readiness evidence, and denied fail-closed text turn details.
- Live text bridge calls can capture sanitized contract evidence for success and fail-closed outcomes without raw prompt text, response text, endpoint hosts, bearer tokens, request bodies, or response bodies.
- `make bridge-evidence-capture` exercises one governed text evidence capture against the local harness, including descriptor discovery before text turn submission.
- `make bridge-evidence-compare` validates sample or captured bridge evidence against the OpenAPI-aligned bridge registry and rejects raw payload or secret fields.
- `make eval-http-local-harness` exercises evaluator HTTP mode against the local Napoleon-compatible harness without treating it as live Napoleon validation.
- Failures are visible as local blocked states with blocked effects. Early local failures preserve the relevant text-turn, memory proposal, or Chief of Staff steering blocked-effect list, and remote failures preserve Napoleon-supplied blocked effects where available. Failures do not send externally, write memory, dispatch agents, append remote audit records, or capture approval.
- Successful live responses may include a Napoleon delegation panel with selected agents, selection reasons, allowed effects, blocked effects, governance state, trace ID, and audit ID.
- Concierge only attributes recommendations or agent findings when the bridge response includes that provenance.
- Successful text responses that claim Napoleon recommendations, such as "Napoleon recommends...", must include matching recommendation provenance with the recommended contribution and response trace/audit references or fail closed as a contract mismatch.
- Successful text responses that claim selected-agent findings, such as "Passive Brain found...", must include matching selected-agent contribution provenance or fail closed as a contract mismatch.
- Successful live responses require matching governance, trace, and audit envelopes; missing or mismatched response/delegation provenance fails closed as a contract mismatch.
- Remote `deny` and `no_go` governance outcomes produce blocked bridge failures for text turns, memory proposal handoff, and Chief of Staff steering handoff instead of normal response or review completion; text bridge evidence remains sanitized and includes decision, audit, governance, and blocked-effect metadata where available.

Privacy and safety impact:

- Missing or invalid bridge state cannot be converted into local authority.
- Live bridge readiness is a local preflight summary only and cannot be treated as Napoleon approval, memory permission, agent dispatch permission, or external-send permission.
- The local harness preset is a test endpoint convenience only; it must not be treated as live Napoleon authority or service control.
- Provenance prevents Concierge from hiding Napoleon's authority boundary or inventing agent contributions.
- Bridge evidence supports later live-runtime comparison without becoming a local audit authority or leaking secrets.

Evaluator coverage:

- Covered by bridge failure, contract mismatch, and dedicated bridge fixture delegation scenarios, plus app-level reusable fixtures for delegated success, auth failure, contract mismatch, timeout, sanitized bridge evidence capture, bridge evidence comparison, and repository validation for direct authority-boundary bypass attempts.

## Milestone P2: Voice Concierge

| ID | Story | Priority | Acceptance criteria | Observability |
|---|---|---:|---|---|
| VO-001 | Add microphone permission flow | P0 | Mic cannot start without explicit permission | mic_permission_requested, mic_permission_result |
| VO-002 | Add VAD service | P0 | Speech start and end detected in local service | voice_segment_detected |
| VO-003 | Add STT adapter | P0 | Local Whisper path can transcribe sample audio | stt_started, stt_completed |
| VO-004 | Add TTS adapter | P0 | Concierge response can be spoken | tts_started, tts_completed |
| VO-005 | Add barge-in | P0 | User can interrupt TTS and start new turn | barge_in_detected |
| VO-006 | Add voice turn latency metrics | P0 | VAD, STT, Napoleon, TTS spans emitted | voice_turn_completed |
| VO-007 | Add voice-specific response shaping | P1 | Long text responses are summarized for speech | voice_response_shaped |
| VO-008 | Add wake word option | P2 | Wake word can be enabled or disabled | wake_word_detected |
| VO-009 | Add child voice constraints | P1 | Child mode has slower pacing and stricter side effect controls | child_voice_policy_applied |

## Milestone P3: Avatar Concierge

| ID | Story | Priority | Acceptance criteria | Observability |
|---|---|---:|---|---|
| AV-001 | Add avatar renderer placeholder | P0 | Text responses trigger neutral avatar state | avatar_state_changed |
| AV-002 | Add VRM loader | P0 | App can load a local VRM model | avatar_model_loaded |
| AV-003 | Map stance to expression | P0 | Direct, warm, concerned, playful, somber states render differently | avatar_expression_set |
| AV-004 | Add lip sync baseline | P1 | Mouth movement follows generated audio amplitude | lip_sync_started, lip_sync_completed |
| AV-005 | Add camera permission flow | P0 | Camera cannot start without explicit permission | camera_permission_requested, camera_permission_result |
| AV-006 | Add face and head pose detection | P1 | Local service emits face present, head yaw, pitch, roll | camera_state_estimated |
| AV-007 | Add gaze simulation | P1 | Avatar eye target updates based on user position and window state | gaze_target_updated |
| AV-008 | Add conservative affect fusion | P1 | Output uses uncertainty labels, not emotional facts | affect_signal_fused |
| AV-009 | Add avatar privacy dashboard | P0 | User can disable camera, affect, storage, and telemetry | privacy_setting_changed |
| AV-010 | Add child avatar constraints | P0 | Child mode disables or restricts camera affect estimation by default | child_avatar_policy_applied |

## Milestone P4: Controlled self-evolution

| ID | Story | Priority | Acceptance criteria | Observability |
|---|---|---:|---|---|
| SE-001 | Define learning signal schema | P0 | Corrections, interruptions, ratings, and repeated patterns captured | learning_signal_recorded |
| SE-002 | Create evolution proposal schema | P0 | Proposed changes include evidence, risk, rollback, evaluator cases | evolution_proposal_created |
| SE-003 | Add proposal review workflow | P1 | Human or Chief of Staff can approve or reject proposal | evolution_proposal_reviewed |
| SE-004 | Add regression gate | P0 | Any accepted change must run evaluator before rollout | evolution_regression_run |
| SE-005 | Add rollout policy | P1 | Low-risk changes can roll out locally, high-risk changes require approval | rollout_decision_recorded |
| SE-006 | Add rollback path | P1 | Last known good policy can be restored | rollback_completed |
| SE-007 | Add capability recommendation handoff | P1 | Capability recommendations can become reviewed evolution proposals with evidence, evaluator cases, rollout, and rollback | capability_recommendation_created |
| SE-008 | Add local Chief of Staff steering draft | P1 | Local capability signals can produce a proposal-only recommendation, evaluator case candidate, and evolution proposal draft; governed submission is allowed only when endpoint and descriptor preflight pass, and it never applies the proposal locally | capability_recommendation_created |

### SE-007 details

User value: High-value repeated misses can become concrete improvement proposals without letting Concierge change itself.

Acceptance criteria:

- Capability recommendations include evidence count, confidence, affected profiles, affected channels, architecture area, expected benefit, risk level, evaluator gap, rollout needs, and rollback needs.
- Recommendations can create backlog items or Napoleon evolution proposals only through an explicit reviewed handoff.
- Recommendations cannot grant approval, implement capabilities, write memory, dispatch agents, expand tool access, send externally, or change child policy.
- Ranking shows counterarguments, including low confidence, high privacy risk, high governance risk, or rare-but-severe signals.

Privacy and safety impact:

- Evidence uses trace, audit, evaluator, and redacted aggregate references rather than raw transcripts by default.
- Child protected signals remain minimized and cannot be used to optimize engagement.

Evaluator coverage:

- Covered by `CAPABILITY-INTELLIGENCE-001`.

### SE-008 details

User value: Repeated local capability gaps can be converted into a concrete review packet without letting Concierge change itself.

Acceptance criteria:

- The draft includes a capability recommendation, architecture area, evidence count, rationale, evaluator case candidate, evolution proposal draft, approval requirement, and rollback plan.
- The draft remains local when no governed Napoleon endpoint is configured or descriptor preflight fails.
- Governed submission posts an `evolution_proposal_review` packet with recommendation, evaluator case candidate, evolution proposal draft, proposal-only boundary, blocked effects, and trace/audit envelopes.
- Napoleon submission responses require matching governance, trace, and audit proof before Concierge shows them as reviewed.
- The draft cannot apply changes, write memory, dispatch agents, send externally, or capture approval.

Privacy and safety impact:

- Evidence uses local metadata references such as trace and audit IDs rather than raw transcripts.
- Child protected evidence remains minimized and cannot be optimized for engagement.

Evaluator coverage:

- Covered by app tests for proposal-only steering draft boundaries and repository validation for governed bridge handoff contract alignment; add richer live/evaluator scenario coverage before promotion.

## Milestone P5: Operations and observability

| ID | Story | Priority | Acceptance criteria | Observability |
|---|---|---:|---|---|
| OBS-001 | Define trace schema | P0 | JSON schema exists and validates example trace | trace_schema_validated |
| OBS-002 | Add local telemetry buffer | P0 | Events persist locally if backend is unavailable | telemetry_buffered |
| OBS-003 | Add redaction layer | P0 | PII and raw content controls exist before export | telemetry_redacted |
| OBS-004 | Add OpenTelemetry exporter plan | P1 | OTLP exporter configuration documented | telemetry_export_configured |
| OBS-005 | Add privacy audit log | P0 | Camera, mic, memory, and child policy changes are auditable | privacy_audit_logged |
| OBS-006 | Add evaluator report retention | P1 | Reports retained with timestamps and version metadata | eval_report_retained |
| OBS-007 | Add dashboard specification | P2 | Metrics, traces, evaluator history, and privacy events defined | dashboard_spec_created |
| OBS-008 | Add conversation capability ledger | P1 | Local ledger stores derived capability signals, persists count/age-bounded metadata and taxonomy edits in browser-local storage, and provides clear/export/taxonomy/trend controls without storing raw conversation content by default | conversation_capability_signal |

### OBS-008 details

User value: Concierge can inspect its own usefulness without requiring the user to manually remember repeated misses.

Acceptance criteria:

- Each eligible turn can emit a `conversation_capability_signal` with topic, intent, capability, outcome, architecture area, confidence, privacy class, and evidence references.
- The ledger is local, count-bounded, age-bounded, redacted, and persists derived metadata in browser-local storage.
- User-visible controls can clear the persisted and in-memory ledger, export local metadata JSON with retention/trend caveats, and edit local taxonomy labels.
- Raw transcripts, raw audio, raw video, and raw child conversation content are not stored by default.
- The taxonomy supports local merge, split-candidate, rename, reset, and deprecation review so labels do not drift.
- Aggregates can identify common, working, degraded, missing, blocked, and unknown capability states.
- Trend answers can compare the recent 7 day window with the previous 7 days for increasing conversations, worsening missing capabilities, recently working capabilities, and weekly changes.
- Recommendation answers include deterministic local risk/value score components and remain proposal-only.

Privacy and safety impact:

- Capability analysis must not infer durable emotional traits or optimize engagement.
- Recommendation scoring penalizes privacy, child safety, governance, and authority expansion risk.
- Export is opt-in and redacted.

Evaluator coverage:

- Covered by `CAPABILITY-INTELLIGENCE-001`.
