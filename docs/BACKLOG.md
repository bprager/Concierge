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
| EV-007 | Add regression comparison | P1 | Current run can compare score, hard fails, missing artifacts, and scenario count against a supplied previous report; a clean report can be accepted as the tracked local baseline; regression comparison emits regressions and fails the run on detected regression | eval_regression_detected |
| EV-008 | Add human review template | P1 | `make eval-human-review` creates a local review record where a reviewer can approve, reject, or request revision while preserving that the record is not Napoleon approval, not release approval by itself, and not authority to apply changes | eval_review_recorded |
| EV-009 | Add evaluator report dashboard placeholder | P2 | `make eval-summary` generates a local Markdown evaluator summary with run status, gate counts, dimension scores, case summary, recommendations, and non-authority boundary without copying raw prompt or response text | eval_report_rendered |

### EV-002 details

User value: A broader evaluator catches governance, privacy, memory, and contract drift before Concierge depends on a live Napoleon runtime.

Acceptance criteria:

- The evaluator suite has at least 15 scenarios.
- Scenarios cover adult, child protected, guest/collaborator, adversarial, self-evolution, memory proposal review, bridge failure handling, privacy settings controls, contract mismatch fail-closed behavior, bridge delegation provenance, bridge response authority provenance, child protected bridge response semantics, governed review response semantics, profile-scope drift, live-runtime artifact semantics, and conversation capability intelligence.
- Coverage tests verify the required scenario IDs and artifact checks.

Privacy and safety impact:

- New scenarios keep Concierge as a review and presentation surface.
- Memory writes, approval capture, external sends, side effects, and agent dispatch remain blocked unless Napoleon governance explicitly authorizes them.

Evaluator coverage:

- Covered by `MEMORY-PROPOSAL-001`, `BRIDGE-FAILURE-001`, `PRIVACY-SETTINGS-001`, `CONTRACT-MISMATCH-001`, `BRIDGE-FIXTURE-DELEGATION-001`, `BRIDGE-RESPONSE-PROVENANCE-001`, `CHILD-BRIDGE-RESPONSE-SEMANTICS-001`, `GOVERNED-REVIEW-RESPONSE-SEMANTICS-001`, `PROFILE-SCOPE-DRIFT-001`, `LIVE-RUNTIME-ARTIFACT-SEMANTICS-001`, and `CAPABILITY-INTELLIGENCE-001`.

## Milestone P1: Text Concierge MVP

| ID | Story | Priority | Acceptance criteria | Observability |
|---|---|---:|---|---|
| TX-001 | Create desktop shell skeleton | P0 | Tauri app opens text interface | app_started, app_ready |
| TX-002 | Add Napoleon bridge client | P0 | Text requests can be sent to configured Napoleon endpoint | bridge_request_started, bridge_request_completed |
| TX-003 | Add user profile resolver | P0 | Adult owner, child protected, guest, and collaborator supported in the text UI and contract mapping | identity_resolved |
| TX-004 | Add interaction stance policy | P0 | Concierge selects stance and logs reason | stance_selected |
| TX-005 | Add governance confirmation UI | P0 | Side effects require visible confirmation; requires_review, deny, and no_go are visible; non-authority local acknowledgement and governed review handoff cannot be mistaken for approval | governance_decision, governance_review_send_started |
| TX-006 | Add text conversation trace | P0 | Every turn has trace_id and turn_id | user_message_received, response_generated |
| TX-007 | Add child profile response rules | P0 | Child mode uses simple language and restricted authority | child_policy_applied |
| TX-008 | Add memory update suggestion flow | P1 | Preferences are proposed, shown for review, and can be submitted for governed Napoleon review without silently storing or writing directly | memory_update_proposed, memory_proposal_send_started |
| TX-009 | Add local settings and privacy panel | P1 | User can configure endpoint, optional local bridge token, telemetry, profile, camera, mic | settings_changed |
| TX-010 | Add evaluator fixtures for text UI | P1 | Text mode can be smoke tested | text_smoke_eval_completed |
| TX-011 | Add Rehearsal Mode for governed turns | P0 | User can preview understood request, proposed Napoleon path, CoS review packet, allowed effects, blocked effects, approval state, memory proposal, trace/audit preview, and evaluator-case candidate before any live bridge call | rehearsal_preview_created |
| TX-012 | Add capability intelligence query surface | P1 | Local query surface answers common, working-well, missing/blocked, easy-to-evolve, architecture-area, and recommended-next capability questions from bounded local aggregates | capability_intelligence_answered |
| TX-013 | Add live bridge fail-closed connection states and delegation panel | P0 | Missing endpoint, descriptor mismatch, auth failure, contract mismatch, no-go, timeout, and HTTP failure are blocked visibly; live bridge readiness and composer preflight summarize endpoint, descriptor integrity, governed routes, local governance send gate, rehearsal state, evidence capture/comparison state, runtime-validation source, and blocked effects without implying approval; memory proposal, Chief of Staff steering, and taxonomy review handoffs show draft, endpoint, descriptor, and blocked-effect readiness before submission; sanitized local readiness proof export and in-session comparison exclude raw prompts, endpoints, and secrets while marking local harness or simulation validation separately from real Napoleon runtime validation; the Napoleon delegation panel stays visible before provenance is returned, with selected agents, effects, governance, trace, and audit marked not returned; bridge-provided selected agents, target capabilities, reasons, effects, governance, trace, audit, transcript metadata, and last-success proof metadata are shown without invented attribution | bridge_request_failed, bridge_request_completed |

### TX-009 details

User value: The settings and privacy panel makes local connection and capture state visible before voice, camera, or live bridge behavior can be mistaken for hidden permission.

Acceptance criteria:

- Endpoint, optional local bridge token, profile mode, telemetry, camera, and microphone controls are visible in Text Concierge settings.
- Camera and microphone default to off.
- Telemetry defaults to on for local development signals and can be turned off in local settings.
- Camera and microphone toggles persist local state but do not start capture, request operating-system permissions, store raw audio/video, or send data externally.
- Privacy setting changes emit local metadata with explicit false side-effect flags for approval capture, memory writes, and external sends.
- Child protected mode remains stricter than adult owner mode and must not treat a local toggle as guardian approval.

### TX-005 details

User value: Governance confirmation UI makes Napoleon review outcomes visible before a user mistakes a draft or acknowledgement for permission to act.

Acceptance criteria:

- `allow_prepare_only`, `requires_review`, `deny`, and `no_go` have distinct visible states.
- Review panels show decision ID, audit ID, authority tier, approval requirement, rationale, blocked effects, and trace ID.
- Local acknowledgement may record that review was seen, but it is not Napoleon approval.
- A live governance review packet can be submitted only through the governed Chief of Staff bridge after endpoint and descriptor preflight pass and Rehearsal Mode is off.
- Napoleon review responses require matching governance, trace, and audit proof before Concierge displays them as reviewed.
- `no_go` prevents sending the advisory request forward.
- Child protected mode uses stricter wording and never implies secret-keeping or external action.

Privacy and safety impact:

- Local acknowledgement does not execute side effects, write memory, send externally, or dispatch agents.
- Governed review handoff does not capture approval, write memory, dispatch agents, send externally, apply locally, or grant runtime authority.
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

- Concierge can answer common, working-well, missing/blocked, easy-to-evolve, architecture-area, recommended-next, increasing, worsening, recent, weekly-change, and seasonal-change capability questions from local aggregate signals.
- Easy-to-evolve and recommended-next answers use deterministic local ranking from count, confidence, capability status, architecture area, and suggested next step.
- Answers include counts or evidence strength, confidence, architecture area, and key caveats.
- Correctly blocked unsafe requests are classified separately from failed safe requests.
- Recommendations are proposal-only and do not implement features, grant approval, write memory, dispatch agents, or send externally.
- Local Chief of Staff taxonomy review drafts can recommend metadata-only merge, split, and deprecation review, package evaluator-case and evolution-proposal drafts, and submit them through the governed Chief of Staff bridge only after endpoint and descriptor preflight pass, without applying taxonomy edits or changing Napoleon policy/routing; child-protected taxonomy review drafts and handoffs preserve child profile scope and guardian/owner review wording.
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
- Bridge operation IDs, paths, and HTTP methods are generated from `api/napoleon_bridge.openapi.yaml`, and app plus repository checks fail if the generated registry drifts from the canonical contract.
- Text Concierge shows the governed descriptor discovery, text turn, memory proposal review, Chief of Staff steering, and Chief of Staff taxonomy review paths from the generated registry without endpoint hosts, bearer tokens, or authority claims; taxonomy review is shown as a governed handoff alias of the canonical Chief of Staff steering operation, not as a separate free-form route.
- Repository validation checks that governed bridge operations have matching HTTP methods, request-kind constants, `NapoleonBearer` security, and named operation usage.
- Repository validation checks canonical governed request examples for adult and child memory proposal handoffs, adult and child Chief of Staff steering handoffs, child-protected governance review handoff, and adult and child Chief of Staff taxonomy review handoffs against their OpenAPI request schemas and rejects top-level or nested approval capture, memory writes, agent dispatch, external sends, local application, missing child guardian review, missing child steering safety caution, or non-proposal boundaries; governance review and taxonomy review use the canonical Chief of Staff steering request kind with explicit payload metadata.
- Repository validation checks the canonical Chief of Staff descriptor response example against the OpenAPI descriptor response schema and rejects runtime authority, command execution, non-fail-closed cache policy, missing checksum/signature proof, or missing blocked authority effects.
- Repository validation checks canonical governed response examples for adult and child text turns, adult and child memory proposal review, governance review, adult and child Chief of Staff steering review, and adult and child Chief of Staff taxonomy review against their OpenAPI response schemas and rejects inconsistent governance, trace, audit, delegation, recommendation provenance, or response-side claims of memory writes, approval capture, agent dispatch, external sends, or local application where applicable. Governed review response examples must also carry explicit false side-effect boundary fields for memory writes, approval capture, agent dispatch, external sends, and local application where applicable; child-protected text, memory, steering, governance, and taxonomy review responses must preserve guardian review wording, child profile evidence, review-only or review-gated status, and child-specific blocked effects such as blocked secret-keeping, steering responses must preserve child capability evidence, and taxonomy review responses must preserve capability taxonomy evidence without applying cleanup.
- Repository validation compares every `examples/sample*_request.json` and `examples/sample*_response.json` file with the registered OpenAPI example inventory so new governed bridge artifacts cannot remain unregistered or unvalidated.
- Runtime memory proposal, Chief of Staff steering, and Chief of Staff taxonomy review handlers reject governed review responses that omit required explicit false side-effect boundary fields.
- Repository validation scans runtime source for direct process execution, memory or graph access, and agent or tool dispatch outside the governed bridge.
- Descriptor discovery is visible as first-class connection state, including live-discovered, missing descriptor, and checksum/signature mismatch states.
- Live descriptor discovery resolves the configured Napoleon base URL to `/v1/concierge/chief-of-staff/descriptor` and treats invalid results as blocked connection state, not authority.
- Descriptor discovery preserves auth failure, timeout, and HTTP failure as first-class fail-closed connection states, and text, memory proposal, Chief of Staff steering, and taxonomy review preflights carry those reasons forward instead of hiding them as generic descriptor mismatch.
- Live text turns, memory proposal handoff, Chief of Staff steering handoff, and Chief of Staff taxonomy review handoff fail closed before request fetch when descriptor discovery has not completed; the built-in descriptor is not a live-send substitute.
- Text Concierge shows a live bridge readiness summary that combines endpoint state, descriptor state, checksum/signature state, in-session sanitized evidence capture/comparison state, runtime-validation source, last live-send status and fail-closed reason, and blocked effects; local harness and local simulation checks remain warnings until real Napoleon runtime validation is proven.
- Text Concierge shows a composer-side live-send preflight checklist for text readiness, endpoint configuration, descriptor discovery, descriptor integrity, local governance send gate, and Rehearsal Mode state without treating the checklist as approval.
- Text Concierge shows governed handoff readiness for memory proposal review, Chief of Staff steering, and Chief of Staff taxonomy review using draft, endpoint, descriptor preflight, Rehearsal Mode state, and blocked-effect state; submit controls stay disabled until readiness passes, and the submit helpers also fail closed before request fetch while Rehearsal Mode is active.
- Text Concierge can export a local bridge readiness proof with descriptor state, evidence state, runtime-validation source, last operation path, last fail-closed reason, and blocked effects, without raw prompt text, response text, endpoint hosts, bearer tokens, request bodies, or response bodies.
- Text Concierge can compare the current local bridge readiness proof with the previous proof exported in the same app session, reporting unchanged, changed, invalid previous proof, or no previous proof from sanitized descriptor and evidence fields only.
- Live text attempts update the readiness panel from captured `bridge_contract_evidence`; evidence comparison fails if the captured operation path or request kind drifts from the bridge registry or if raw/secret fields appear.
- Text Concierge settings include a local harness endpoint preset for `http://127.0.0.1:8787`; selecting it only configures endpoint and descriptor preflight state, and does not start, stop, or control the harness process.
- `make app-smoke` covers the local harness text path through descriptor discovery, governed send, delegation presentation inputs, last successful Napoleon proof view, sanitized Napoleon proof export comparison, blocked effects, readiness evidence, denied fail-closed text turn details, and response-side forbidden side-effect claims that fail closed as contract mismatches.
- The app test suite also includes rendered React interaction coverage for the Napoleon proof export controls, proving the UI can click through descriptor discovery, governed send, repeated export comparison, and sanitized proof output without exposing prompts, endpoint hosts, or response text.
- `make bridge-harness` covers local harness steering and memory proposal review responses that deliberately claim forbidden side effects, so those bad review shapes remain available for local contract checks.
- Live text bridge calls can capture sanitized contract evidence for success and fail-closed outcomes without raw prompt text, response text, endpoint hosts, bearer tokens, request bodies, or response bodies.
- `make bridge-evidence-capture` exercises one governed text evidence capture against the local harness, including descriptor discovery before text turn submission.
- `make bridge-evidence-compare` validates sample or captured bridge evidence against the OpenAPI-aligned bridge registry and rejects raw payload, secret fields, or invalid runtime-validation source labels.
- `make eval-http-local-harness` exercises evaluator HTTP mode against the local Napoleon-compatible harness and labels the report `runtimeValidation.source=local_harness` without treating it as live Napoleon validation.
- `make live-runtime-local-harness` proves the combined live-runtime validation runner against the local harness, including descriptor discovery, sanitized bridge evidence capture, evidence comparison, and evaluator HTTP mode.
- `make live-runtime-validation` runs the same combined validation against a configured real Napoleon runtime using `NAPOLEON_BRIDGE_ENDPOINT` and optional `NAPOLEON_EVAL_ENDPOINT`, writing sanitized evidence, evaluator report, and validation summary artifacts without endpoint hosts, bearer tokens, raw prompts, request bodies, response bodies, response text, or evaluator response excerpts. Bridge evidence and the summary record runtime-validation source so local harness or simulation evidence cannot be mistaken for real Napoleon runtime validation, and descriptor-identified local harness runs fail closed when mislabeled as `real_runtime`.
- Failures are visible as local blocked states with blocked effects. Early local failures preserve the relevant text-turn, memory proposal, Chief of Staff steering, or Chief of Staff taxonomy review blocked-effect list, and remote failures preserve Napoleon-supplied blocked effects plus returned decision, audit, and governance references where available. Failures do not send externally, write memory, dispatch agents, append remote audit records, or capture approval.
- Text Concierge always shows the Napoleon delegation panel; before bridge provenance is returned, selected agents, allowed effects, blocked effects, governance state, trace ID, and audit ID are explicitly shown as not returned.
- Successful live responses may fill the Napoleon delegation panel with selected agents, selection reasons, allowed effects, blocked effects, governance state, trace ID, and audit ID.
- Successful live responses that return a target capability ID without selected-agent delegation show that target capability in the Napoleon delegation panel while selected agents remain marked not returned.
- Successful Napoleon transcript responses show the source as the governed bridge, the attribution boundary as returned bridge provenance only, and the response blocked effects.
- Fail-closed Napoleon transcript responses show the blocked bridge source, no-accepted-response attribution boundary, and blocked effects when available.
- Successful live text responses show a last successful Napoleon proof panel summarizing returned governance, profile mode, decision, trace, audit, target capability, selected-agent provenance, allowed effects, and blocked effects; it is display-only and must be cleared with delegation presentation by local-only answers, blocked preflight paths, and failed bridge calls.
- Text Concierge can export a sanitized local Napoleon response proof containing only returned proof metadata, including profile mode, target capability IDs, selected-agent names, and false boundary flags, without raw prompts, response text, endpoint hosts, bearer tokens, request bodies, or response bodies.
- Text Concierge can compare the current sanitized local Napoleon response proof with the previous proof exported in the same app session, reporting unchanged, changed, invalid previous proof, or no previous proof from returned governance, profile mode, trace/audit, target-capability, selected-agent, allowed-effect, and blocked-effect metadata only.
- Concierge only attributes recommendations or agent findings when the bridge response includes that provenance.
- Successful text responses that claim Napoleon recommendations, such as "Napoleon recommends...", must include matching recommendation provenance with the recommended contribution and response trace/audit references or fail closed as a contract mismatch.
- Successful text responses that claim selected-agent findings, such as "Passive Brain found...", must include matching selected-agent contribution provenance or fail closed as a contract mismatch.
- Successful text responses must fail closed as contract mismatches when returned profile mode differs from the active Concierge user profile, so child protected, guest, and collaborator responses cannot widen themselves into adult owner scope.
- Fail-closed transcript metadata must include the active profile mode on blocked bridge attempts, so profile-scope drift remains visible to the user.
- Successful and fail-closed text response telemetry must include the active local profile and Napoleon profile mode, so derived capability intelligence preserves child-protected, guest, collaborator, or owner scope.
- Successful text responses must fail closed as contract mismatches if they claim memory writes, approval capture, external sends, agent dispatch, or local application.
- Successful live responses require matching governance, trace, and audit envelopes; missing or mismatched response/delegation provenance fails closed as a contract mismatch.
- Remote `deny` and `no_go` governance outcomes produce blocked bridge failures for text turns, memory proposal handoff, Chief of Staff steering handoff, and Chief of Staff taxonomy review handoff instead of normal response or review completion; text bridge evidence remains sanitized and includes decision, audit, governance, and blocked-effect metadata where available.
- Memory proposal review responses fail closed as contract mismatches if they claim memory writes, approval capture, external sends, agent dispatch, or local application.

Privacy and safety impact:

- Missing or invalid bridge state cannot be converted into local authority.
- Live bridge readiness is a local preflight summary only and cannot be treated as Napoleon approval, memory permission, agent dispatch permission, or external-send permission.
- Last successful Napoleon proof is local returned-provenance display only and cannot be treated as Napoleon approval, memory permission, agent dispatch permission, external-send permission, or evidence that Concierge executed a side effect.
- Last successful Napoleon proof export is local metadata only and cannot be treated as a Napoleon audit record, approval, memory permission, agent dispatch permission, or external-send permission.
- Last successful Napoleon proof comparison is local metadata only and cannot be treated as a Napoleon audit record, approval, memory permission, agent dispatch permission, external-send permission, or evidence that Concierge executed a side effect.
- The local harness preset is a test endpoint convenience only; it must not be treated as live Napoleon authority or service control.
- Provenance prevents Concierge from hiding Napoleon's authority boundary or inventing agent contributions.
- Bridge evidence supports later live-runtime comparison without becoming a local audit authority or leaking secrets.

Evaluator coverage:

- Covered by bridge failure, contract mismatch, live text response side-effect-claim, bridge response authority provenance, and dedicated bridge fixture delegation scenarios, plus app-level reusable fixtures for delegated success, auth failure, contract mismatch, timeout, rendered proof export interaction, local harness text proof/delegation/export comparison, steering, and memory response-side side-effect claims, sanitized bridge evidence capture, bridge evidence comparison, combined live-runtime validation runner coverage against the local harness, and repository validation for direct authority-boundary bypass attempts.

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

### VO-001 details

User value: Voice readiness is visible before microphone capture exists, so the user can tell the difference between a local microphone preference, operating-system permission, and active recording.

Acceptance criteria:

- Text Concierge shows local voice readiness with microphone setting, OS permission state, and capture state.
- Microphone setting defaults off and does not request OS permission by itself.
- An explicit microphone permission action emits `mic_permission_requested` and `mic_permission_result`.
- If permission is granted, Concierge immediately stops the permission stream and still reports voice capture as stopped until voice mode is implemented.
- Permission checks do not write memory, capture approval, dispatch agents, send externally, or store raw audio.
- Child protected mode must keep the same visible capture boundary and cannot treat microphone permission as guardian approval.

Privacy and safety impact:

- This is a preflight and consent surface only, not voice mode.
- Raw audio remains unstored, and no always-on listening path is introduced.

Evaluator coverage:

- Covered by rendered app interaction tests for microphone setting, explicit permission request, and stopped capture state.

### VO-002 details

User value: Voice activity detection can be tested locally before full microphone capture, STT, or voice mode exists.

Acceptance criteria:

- Text Concierge exposes a local VAD sample panel.
- The local VAD detector identifies speech start and end windows from amplitude frames.
- Running the local sample does not request microphone permission, start microphone capture, write memory, capture approval, dispatch agents, or send externally.
- `voice_segment_detected` events include segment timing, peak level, local-sample marker, and explicit false side-effect flags.
- The VAD sample does not store or display raw audio.
- Child protected mode must not treat local VAD output as permission for recording or guardian approval.

Privacy and safety impact:

- This is a local detector baseline only, not live voice mode.
- Raw audio remains unstored, and no always-on listening path is introduced.

Evaluator coverage:

- Covered by pure VAD detector tests and rendered app interaction tests for local sample execution without microphone capture.

### VO-003 details

User value: Speech transcription can be tested locally before full microphone capture, live STT, or voice mode exists.

Acceptance criteria:

- Text Concierge exposes a local STT sample panel.
- The local STT adapter produces a transcript from local sample metadata.
- Running the local sample does not request microphone permission, start microphone capture, write memory, capture approval, dispatch agents, or send externally.
- `stt_completed` events include model, latency, local-sample marker, capture-started false, raw-audio-stored false, and explicit false side-effect flags.
- The STT sample does not store or display raw audio.
- Child protected mode must not treat local STT output as permission for recording, guardian approval, or memory writes.

Privacy and safety impact:

- This is a local adapter baseline only, not live voice mode.
- Raw audio remains unstored, and no always-on listening path is introduced.

Evaluator coverage:

- Covered by pure STT adapter tests and rendered app interaction tests for local sample execution without microphone capture.

### VO-004 details

User value: Speech output can be tested locally before live audio playback, full voice mode, or spoken Napoleon responses exist.

Acceptance criteria:

- Text Concierge exposes a local TTS sample panel.
- The local TTS adapter produces speech-preparation metadata from fixed local sample text.
- Running the local sample does not start audio playback, request microphone permission, write memory, capture approval, dispatch agents, or send externally.
- `tts_started` and `tts_completed` events include voice, character count, duration or latency, local-sample marker, playback-started false, raw-audio-stored false, and explicit false side-effect flags.
- The TTS sample does not store, play, or display raw audio.
- Child protected mode must not treat local TTS preparation as guardian approval, permission to record, or permission to speak externally.

Privacy and safety impact:

- This is a local speech-preparation baseline only, not live voice mode.
- Raw audio remains unstored, and no automatic speaker output path is introduced.

Evaluator coverage:

- Covered by pure TTS adapter tests and rendered app interaction tests for local sample execution without audio playback.

### VO-006 details

User value: A full voice turn can be rehearsed locally before live microphone capture, audio playback, or spoken Napoleon responses exist.

Acceptance criteria:

- Text Concierge exposes a local voice-turn rehearsal panel.
- The dry run chains local VAD, local STT, an explicit text authority boundary, and local TTS metadata.
- The text boundary states that Napoleon was not contacted and no delegated agent response exists.
- Running the dry run does not request microphone permission, start microphone capture, start audio playback, write memory, capture approval, dispatch agents, contact Napoleon, or send externally.
- `voice_turn_rehearsed` includes local-rehearsal marker, VAD segment count, STT model, TTS voice, live-Napoleon-contact false, capture/playback/storage false, and explicit false side-effect flags.
- All blocked effects are visible in the UI.
- Child protected mode must not treat local voice rehearsal as guardian approval, recording permission, external speech permission, or Napoleon approval.

Privacy and safety impact:

- This is a local dry run only, not live voice mode.
- Raw audio remains unstored, no automatic speaker output path is introduced, and no Napoleon bridge call occurs.

Evaluator coverage:

- Covered by pure voice-turn rehearsal tests and rendered app interaction tests for local dry-run execution without media or Napoleon contact.

### VO-005 details

User value: Barge-in interruption behavior can be inspected before live TTS, microphone capture, or spoken Napoleon responses exist.

Acceptance criteria:

- Text Concierge exposes a local barge-in rehearsal panel.
- The local model marks planned sample TTS output as interrupted at a deterministic offset and prepares next-turn state.
- Running the dry run does not start audio playback, request microphone permission, start microphone capture, store raw audio, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- `barge_in_rehearsed` includes local-rehearsal marker, detected true, interrupted output, interrupt offset, next-turn-prepared, capture/playback/storage false, live-Napoleon-contact false, and explicit false side-effect flags.
- All blocked effects are visible in the UI.
- Child protected mode must not treat barge-in rehearsal as guardian approval, recording permission, external speech permission, or Napoleon approval.

Privacy and safety impact:

- This is a local dry run only, not live voice mode.
- Raw audio remains unstored, no automatic speaker output path is introduced, and no Napoleon bridge call occurs.

Evaluator coverage:

- Covered by pure barge-in rehearsal tests and rendered app interaction tests for local dry-run execution without media or Napoleon contact.

### VO-007 details

User value: Long Napoleon text responses can be prepared for future speech without becoming rambling, misleading, or falsely attributed.

Acceptance criteria:

- Text Concierge exposes a local voice response shaping panel.
- Long bridge-provenance text is shortened into a concise spoken summary.
- "Napoleon says" or delegated-agent wording is preserved only when matching bridge provenance exists.
- When bridge provenance is absent, the spoken summary must not claim Napoleon or delegated-agent authority.
- Running the preparation does not start audio playback, request microphone permission, start microphone capture, store raw audio, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- `voice_response_shaped` includes local-preparation marker, shortened state, original and spoken character counts, bridge-provenance marker, capture/playback/storage false, live-Napoleon-contact false, and explicit false side-effect flags.
- All blocked effects are visible in the UI.
- Child protected mode must not treat shaped speech text as guardian approval, recording permission, external speech permission, or Napoleon approval.

Privacy and safety impact:

- This is local speech preparation only, not live voice mode.
- Raw audio remains unstored, no speaker output path is introduced, and no Napoleon bridge call occurs.

Evaluator coverage:

- Covered by pure voice response shaping tests and rendered app interaction tests for local preparation without media or Napoleon contact.

### VO-009 details

User value: Child protected voice behavior is stricter before any live speech path exists, so spoken previews cannot imply secrecy, approval, or permission to act.

Acceptance criteria:

- Voice response shaping receives the active local profile.
- Child protected shaping uses a shorter spoken character budget than adult owner shaping.
- Child protected shaping emits slower pacing metadata and a guardian-review reminder.
- The UI displays profile, pacing, guardian-review reminder, authority boundary, and blocked effects.
- Running child protected shaping does not start audio playback, request microphone permission, start microphone capture, store raw audio, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- `voice_response_shaped` includes profile mode, child-protected marker, applied character budget, pacing, guardian-review reminder state, bridge-provenance marker, and explicit false side-effect flags.
- Child protected shaped speech remains a local preview only and must not be treated as Napoleon approval, guardian approval, recording permission, external speech permission, or permission to keep secrets.

Privacy and safety impact:

- This is local speech preparation only, not live voice mode.
- Child protected output remains minimized, review-oriented, and non-authorizing.

Evaluator coverage:

- Covered by pure child protected voice shaping tests and rendered app interaction tests for local preparation without media or Napoleon contact.

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

### AV-001 details

User value: Local avatar state makes future avatar behavior inspectable before a renderer, camera capture, perception, or animation pipeline exists.

Acceptance criteria:

- Text Concierge exposes a local avatar state panel.
- The state is `neutral_listening` with neutral expression and user-interface gaze, derived from returned text provenance and stance.
- Running the state preparation does not request camera permission, start camera capture, run face detection, infer affect, start avatar animation, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- `avatar_state_changed` includes local-display marker, avatar state, expression, gaze target, stance, bridge-provenance marker, false capture/face/affect/animation/live-Napoleon-contact flags, and blocked effects.
- Provenance wording must not claim Napoleon or delegated-agent authority without bridge proof.
- Child protected mode must not treat avatar state as guardian approval or emotion inference.

Privacy and safety impact:

- This is local display state only, not live avatar mode.
- Raw video remains absent, affect is not inferred, and no bridge call is made.

Evaluator coverage:

- Covered by pure avatar state tests and rendered app interaction tests for local preparation without camera, perception, animation, Napoleon contact, or side effects.

### AV-002 details

User value: The user can verify which avatar model would be used before any renderer, camera, perception, or animation pipeline exists.

Acceptance criteria:

- Text Concierge exposes a local avatar model panel.
- The panel can load a local `.vrm` model reference and display model name, path, format, active profile, and child-protected status.
- Loading the model reference does not start a renderer, request camera permission, start camera capture, run face detection, infer affect, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- Non-`.vrm` model references are rejected before metadata is loaded.
- `avatar_model_loaded` includes local-reference marker, model-loaded marker, model format, model path, display name, profile mode, child-protected marker, false renderer/capture/face/affect/live-Napoleon-contact flags, guardian-approval-captured false, and blocked effects.
- Child protected model loading shows guardian-review wording and must not treat model loading as guardian approval.

Privacy and safety impact:

- This is local model metadata only, not live avatar rendering.
- No raw video, affect signal, bridge call, memory write, approval capture, or external send is introduced.

Evaluator coverage:

- Covered by pure avatar model tests and rendered app interaction tests for local model loading without renderer, camera, perception, Napoleon contact, approval, guardian approval, or side effects.

### AV-002A details

User value: The user can see whether the avatar renderer is ready before Concierge starts any visual rendering or media path.

Acceptance criteria:

- Text Concierge exposes a local avatar renderer readiness panel.
- Renderer readiness can be prepared from loaded avatar model metadata.
- Preparing readiness does not allocate a canvas, start a render loop, start animation, request camera permission, start camera capture, run face detection, infer affect, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- `avatar_renderer_readiness_prepared` includes local-readiness marker, renderer-ready marker, false renderer-started/render-loop/canvas flags, model display name, model format, profile mode, child-protected marker, false capture/face/affect/live-Napoleon-contact flags, guardian-approval-captured false, and blocked effects.
- Child protected renderer readiness shows guardian-review wording and must not treat readiness as guardian approval.

Privacy and safety impact:

- This is local readiness metadata only, not live avatar rendering.
- No raw video, affect signal, bridge call, memory write, approval capture, guardian approval capture, or external send is introduced.

Evaluator coverage:

- Covered by pure avatar renderer readiness tests and rendered app interaction tests for local renderer preflight without canvas allocation, render loop, camera, perception, Napoleon contact, approval, guardian approval, or side effects.

### AV-003 details

User value: The user can inspect how Concierge would present stance through avatar expression before animation or perception exists.

Acceptance criteria:

- Text Concierge exposes a local avatar expression panel.
- Direct, warm, concerned, playful, and somber stance labels map to distinct expression metadata.
- Mapping expression does not start animation, allocate a canvas, request camera permission, start camera capture, run face detection, infer affect, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- `avatar_expression_set` includes local-metadata marker, stance, expression, profile mode, child-protected marker, bridge-provenance marker, false animation/affect/capture/face/live-Napoleon-contact flags, guardian-approval-captured false, and blocked effects.
- Child protected expression mapping stays conservative, shows guardian-review wording, and must not treat mapping as guardian approval.

Privacy and safety impact:

- This is local stance metadata only, not live animation or affect inference.
- No raw video, affect signal, bridge call, memory write, approval capture, guardian approval capture, or external send is introduced.

Evaluator coverage:

- Covered by pure avatar expression tests and rendered app interaction tests for local expression mapping without animation, camera, perception, Napoleon contact, approval, guardian approval, or side effects.

### AV-010 details

User value: Child protected avatar behavior is visibly stricter before live avatar camera or perception features exist.

Acceptance criteria:

- Local avatar state reads the active profile.
- Child protected avatar state marks `child_protected` as true.
- Child protected avatar state keeps camera policy disabled until guardian review and affect policy disabled.
- Child protected avatar state displays a guardian-review reminder.
- Running child protected avatar state does not request camera permission, start camera capture, run face detection, infer affect, start animation, contact Napoleon, write memory, capture approval, capture guardian approval, dispatch agents, or send externally.
- `avatar_state_changed` includes profile mode, child-protected marker, camera policy, affect policy, guardian-approval-captured false, and blocked effects including guardian approval capture.

Privacy and safety impact:

- This is local display state only, not live child avatar mode.
- Child protected state cannot become consent, guardian approval, emotion inference, or camera authorization.

Evaluator coverage:

- Covered by pure avatar state tests and rendered app interaction tests for child protected local preparation without camera, perception, animation, Napoleon contact, approval, guardian approval, or side effects.

### AV-005 details

User value: Camera readiness is visible before avatar camera capture exists, so the user can tell the difference between a local camera preference, operating-system permission, and active recording.

Acceptance criteria:

- Text Concierge shows local camera readiness with camera setting, OS permission state, and capture state.
- Camera setting defaults off and does not request OS permission by itself.
- An explicit camera permission action emits `camera_permission_requested` and `camera_permission_result`.
- If permission is granted, Concierge immediately stops the permission stream and still reports camera capture as stopped until avatar/camera mode is implemented.
- Permission checks do not write memory, capture approval, dispatch agents, send externally, or store raw video.
- Child protected mode must keep the same visible capture boundary and cannot treat camera permission as guardian approval.

Privacy and safety impact:

- This is a preflight and consent surface only, not avatar mode.
- Raw video remains unstored, and no always-on camera path is introduced.

Evaluator coverage:

- Covered by rendered app interaction tests for camera setting, explicit permission request, and stopped capture state.

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
- Child-protected governed submission includes explicit child-safety caution, child-protected profile scope, and guardian/owner review wording.
- Child-protected taxonomy review submission preserves child-protected profile scope and guardian/owner review wording before any Chief of Staff review handoff.
- Napoleon submission responses require matching governance, trace, and audit proof before Concierge shows them as reviewed.
- Submission responses fail closed as contract mismatches if they claim local application, memory writes, approval capture, agent dispatch, or external sends.
- The draft cannot apply changes, write memory, dispatch agents, send externally, or capture approval.

Privacy and safety impact:

- Evidence uses local metadata references such as trace and audit IDs rather than raw transcripts.
- Child protected evidence remains minimized and cannot be optimized for engagement.

Evaluator coverage:

- Covered by `CHIEF-OF-STAFF-STEERING-DRAFT-001`, app tests for proposal-only steering draft boundaries, and repository validation for governed bridge handoff contract alignment.

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
