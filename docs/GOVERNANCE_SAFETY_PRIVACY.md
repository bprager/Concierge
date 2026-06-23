# Governance, Safety, and Privacy

## 1. Authority model

Concierge starts read-only and advisory.

It may:

- Answer
- Clarify
- Summarize
- Draft
- Recommend
- Route through Napoleon
- Propose memory updates
- Propose evolution changes

It may not directly:

- Send emails
- Modify calendar
- Buy anything
- Change memory authority
- Execute local shell or process commands
- Call agents, tools, Memgraph, memory, or services outside the governed bridge
- Enable camera or microphone silently
- Act for a child without guardian-appropriate approval
- Bypass Napoleon governance

Repository validation scans Concierge runtime source for direct process execution including bracketed `.call(...)` and `.apply(...)` aliases, memory or graph access, agent or tool dispatch, ungoverned network calls, runtime dynamic module loading, and external navigation paths including browser `open(...)` aliases with literal or variable targets. The scan is a guardrail, not authority: it catches local implementation drift while Napoleon remains the only authority layer.

## 2. Confirmation tiers

| Tier | Examples | Approval |
|---|---|---|
| Read-only | Summarize, explain, inspect | No extra approval |
| Draft | Draft email, draft plan | User review |
| Low-risk local preference | Shorter responses | User approval or setting |
| Side effect | Send, book, delete, purchase | Explicit confirmation |
| Sensitive access | Health, finance, child data | Purpose-bound confirmation |
| Policy change | Memory, autonomy, child behavior | Chief of Staff plus approval |

## 3. Governance review UI

Text Concierge displays Napoleon governance outcomes as local review states:

- `allow_prepare_only`: advisory preparation is allowed, but blocked effects remain unavailable.
- `requires_review`: Chief of Staff or Napoleon review is needed before anything moves beyond preparation.
- `deny`: the requested action is not allowed through the current path.
- `no_go`: the request is non-executable and cannot be sent forward as an advisory request.

Every review panel must show decision ID, audit ID, authority tier, approval requirement, rationale, blocked effects, and trace ID.

Local acknowledgement is not approval. It records that the review state was seen, but it must not execute side effects, write memory, send externally, dispatch agents, or capture Napoleon approval.

Live governance review handoff is also not approval. It sends the visible review packet through a named governed review route only after endpoint and descriptor preflight pass and Rehearsal Mode is off. Generated Concierge-compatible endpoints and the local harness use the canonical Chief of Staff steering route; Napoleon root or explicit review endpoints use `/chief-of-staff/reviews/governance`. The handoff keeps approval capture, memory writes, agent dispatch, external sends, local application, and runtime authority blocked. Remote `deny` or `no_go` outcomes remain blocked, and any response that claims Concierge performed those effects is a contract mismatch.

Child protected mode uses stricter wording. It must not imply secret-keeping, hidden external action, or guardian-bypassing approval.

Live Napoleon bridge failures are fail-closed states. Missing endpoint, missing descriptor, descriptor mismatch, checksum or signature mismatch, unreadable descriptor, missing descriptor-advertised text-turn route, live text response body, or governed review handoff response body, authentication failure, contract mismatch, local `no_go`, remote `deny` or `no_go`, timeout, and HTTP failure must be shown as blocked local states. Live text turns, governance review handoff, memory proposal handoff, Chief of Staff steering handoff, and Chief of Staff taxonomy review handoff must not use Concierge's built-in descriptor as a substitute for completed descriptor discovery or required descriptor-advertised routes; endpoint or bearer-token changes require a fresh descriptor discovery before live sends resume. Remote `deny` and `no_go` outcomes must block text responses, governance review handoff, memory proposal handoff, Chief of Staff steering handoff, and Chief of Staff taxonomy review handoff instead of being treated as successful answers or completed reviews. They must not be treated as Napoleon approval. Early local failures must preserve the relevant text-turn, governance review, memory proposal, Chief of Staff steering, or taxonomy review blocked-effect list and active profile mode, and remote failures must preserve Napoleon-supplied blocked effects plus returned decision, audit, and governance references where available, rather than retrying into side effects. Live text-turn failure reasons, governed handoff failure reasons, descriptor-specific preflight reasons where available, returned request, trace, decision, and audit references, and blocked effects must remain visible, so missing descriptor and checksum/signature mismatch failures are not hidden behind the same generic label. Unsafe returned request, trace, profile, decision, audit, governance, and blocked-effect values must be redacted before user-visible failure or handoff messages are rendered.

The optional bridge bearer token is a local connection credential. Concierge sends it only as a request header for governed bridge requests: `Authorization` for generated `/v1/concierge/...` bridge requests, or `X-Napoleon-Auth` for explicit Napoleon advisory harness `/cos/descriptor`, `/cos/capabilities`, and `/cos/text-turn` requests. It must not be included in request bodies, local capability exports, telemetry attributes, memory proposals, bridge evidence, readiness proofs, or user-visible provenance panels.

Advisory Chief of Staff capability discovery is visible connection metadata only. It may run only after descriptor discovery passes, and it may display returned capability IDs, labels, authority tiers, proposal-only status, runtime-authority blocked state, and blocked effects. It is not Napoleon approval, not agent selection proof, not permission to route work, not memory permission, not approval capture, and not an external send.

Text Concierge settings expose local telemetry, camera, and microphone switches. Telemetry defaults to on for local development signals; camera and microphone default to off. The camera and microphone switches persist local state only: they do not start capture, request operating-system permissions, store raw audio or video, send data externally, write memory, capture approval, or grant guardian consent. Privacy-setting events are local metadata and must carry explicit false side-effect flags.

Local telemetry buffering is browser-local metadata only. Buffered records must be bounded and redacted before storage, including raw prompts, raw text, response text, endpoints, bearer tokens, request bodies, response bodies, raw audio, and raw video. Turning local telemetry off suppresses ordinary buffering, but consent-relevant privacy audit events for camera, microphone, and privacy settings remain locally buffered. Text Concierge may show buffer status, reduce the latest-event retention limit, export the redacted local JSON metadata, export the latest real interaction trace from sanitized turn metadata, and clear the browser-local buffer, but these controls must not send data externally. Changing the active profile clears rendered telemetry and interaction trace exports so profile-scoped local metadata views are not reused across user scopes. Local proof/export telemetry may reference an interaction trace, but it must not replace the real turn trace in latest-trace export selection. The telemetry buffer and its exports are not Napoleon audit records, not approval, not memory, not agent dispatch, and not permission to send externally.

Voice and camera readiness are also local preflight state. Concierge may request operating-system microphone or camera permission only after an explicit user action, and any granted permission stream must be stopped immediately until voice or avatar/camera mode starts. Permission request and result telemetry is local metadata only and must record that no approval was captured, no memory was written, no agent was dispatched, and no data was sent externally. Permission granted is not active recording, not guardian approval, not Napoleon approval, and not permission to send raw audio or video externally. Missing real Napoleon runtime proof is a live voice blocker, not a warning state; a sanitized accepted real-runtime readiness proof may satisfy the visible proof row as local context only, but it must not start voice capture, playback, Napoleon contact, or any side effect. Child protected live voice readiness must visibly include `guardian_approval_capture` in blocked effects so guardian-review wording cannot be treated as captured guardian approval.

The Media Session Controller is the shared local state surface for microphone, camera, and playback preflight. It may show blocked, permission-needed, permission-requested, unavailable, stopped, available, or active-preview state, but current implementation keeps capture and playback stopped. It must not start microphone capture, camera capture, audio playback, raw media storage, Napoleon contact, memory writes, approval capture, guardian approval capture, agent dispatch, or external sends. Child protected mode must keep microphone, camera, and playback blocked behind guardian-review wording even if local preferences or operating-system permissions are present.

Voice activity detection may run against local sample amplitude frames before live voice mode exists. Sample VAD output is timing and level metadata only: it must not request microphone permission, start capture, store raw audio, write memory, capture approval, dispatch agents, send externally, or imply guardian consent.

Speech transcription may run against fixed local sample metadata before live voice mode exists. Sample STT output is transcript metadata only: it must not request microphone permission, start capture, store raw audio, write memory, capture approval, dispatch agents, send externally, or imply guardian consent.

Text to speech may run against fixed local sample text before live voice mode exists. Sample TTS output is speech-preparation metadata only: it must not start audio playback, request microphone permission, store raw audio, write memory, capture approval, dispatch agents, send externally, or imply guardian consent.

Voice-turn rehearsal may chain local VAD, STT, text-boundary, and TTS sample metadata before live voice mode exists. It is a local dry run only: it must not request microphone permission, start capture, start playback, store raw audio, contact Napoleon, write memory, capture approval, dispatch agents, send externally, or imply guardian consent. Its text boundary must state when Napoleon was not contacted and no delegated agent response exists.

Barge-in rehearsal may mark local sample speech output as interrupted before live voice mode exists. It is local state modeling only: it must not start playback, request microphone permission, start capture, store raw audio, contact Napoleon, write memory, capture approval, dispatch agents, send externally, or imply guardian consent. It must make blocked effects visible and must not treat interruption as Napoleon approval or permission to record or speak externally.

Voice response shaping may shorten bridge-provenance text for future speech before live voice mode exists. It is local preparation only: it must not start playback, request microphone permission, start capture, store raw audio, contact Napoleon, write memory, capture approval, dispatch agents, send externally, or imply guardian consent. It may preserve "Napoleon says" or delegated-agent wording only when the bridge response supplied matching provenance; otherwise it must remove Napoleon recommendation and delegated-agent finding claims from the spoken summary rather than repeating them as local speech. The built-in local voice shaping sample must not claim bridge provenance or prefix speech with "Napoleon says"; bridge provenance may be true only when a real bridge-derived input supplies it. The voice response shaping panel must visibly show that Napoleon was not contacted before and after local preparation runs. In child protected mode, shaped speech must be shorter, use slower pacing metadata, include guardian-review reminders, include `guardian_approval_capture` in blocked effects, and remain non-authorizing.

Wake-word readiness is local option state only before live voice mode exists. It must not start always-on listening, request microphone permission, start capture, store raw audio, contact Napoleon, write memory, capture approval, dispatch agents, send externally, or imply guardian consent. The wake-word readiness panel must visibly show that live Napoleon was not contacted and no agent dispatch occurred before and after the local fixed-sample dry run. In child protected mode, readiness and sample blocked effects include `guardian_approval_capture` so the option cannot be treated as captured guardian approval.

Governed voice pipeline proof exports are local metadata only. They may include generated time, conversation ID, profile mode, child/guardian-review state, proposal-only state, blocked pipeline stages, blocked effects, optional accepted proof context marked local context only, and explicit false side-effect flags, but they must not include raw audio, prompts, endpoint hosts, bearer tokens, request bodies, or response bodies. Exporting the proof is not Napoleon approval, not live runtime evidence, and does not grant capture, playback, memory writes, approval capture, agent dispatch, or external sends. Changing the active profile clears exported proof JSON and comparison state so adult-owner and child-protected voice readiness boundaries are not mixed or reused across scopes.

Governed voice pipeline proof comparison is also local metadata only. It compares the current proof with the previous proof exported in the same app session using sanitized profile, child/guardian-review, stage, blocked-effect, authority-boundary, and accepted proof context fields, and it must not expose raw audio, prompts, endpoint hosts, bearer tokens, request bodies, response bodies, or authority claims. Previous or current proof JSON is rejected before comparison if unsafe field names, normalized snake_case raw-field aliases, endpoint-like values, bearer credentials, or authorization strings appear anywhere in the proof.

Changing the active profile must also clear local voice and avatar sample results so dry-run metadata created under one profile is not reused under another profile.

Bridge readiness proof exports are local metadata only. They may include descriptor state, checksum/signature state, evidence status, runtime-validation source, promotion gate, last operation path, blocked effects, last fail-closed reason, advisory capability count/ID metadata, and Napoleon agent/profile discovery count/ID metadata, but they must not include raw prompts, raw manifests, profile bodies, response bodies, endpoint hosts, bearer tokens, request bodies, or response bodies. Exporting a readiness proof is not Napoleon approval and does not grant registry updates, memory writes, approval capture, agent dispatch, local application, or external sends. Active profile changes, descriptor discovery, advisory capability discovery, endpoint changes, and bearer-token changes clear rendered readiness proof exports so stale profile, connection, or capability evidence is not left visible.

The live bridge readiness promotion gate is local display state only. Local harness or simulation evidence remains blocked for live promotion until real Napoleon runtime evidence capture and comparison pass; the gate is not approval and does not authorize a send, memory write, agent dispatch, external send, or local application.

Bridge readiness proof comparison is also local metadata only. It compares the current proof with the previous proof exported in the same app session using sanitized descriptor and evidence fields, and it must not expose raw prompts, endpoint hosts, tokens, request bodies, response bodies, or authority claims. Previous or current proof JSON is rejected before comparison if unsafe field names, endpoint-like values, loopback hosts, bearer credentials, or authorization strings appear anywhere in the proof.

The governed route panel is local contract metadata only. It may show canonical Napoleon bridge paths and request kinds from the generated registry, but it must not display configured endpoint hosts, bearer tokens, raw prompts, request bodies, response bodies, or any claim that Concierge can bypass Napoleon governance.

The live-send preflight checklist is local display state only. It may show whether text is present, endpoint configuration exists, descriptor discovery and integrity pass, the descriptor advertises `text_turn`, local governance allows preparing an advisory request, Rehearsal Mode is active, evidence capture/comparison has passed, runtime validation came from the real Napoleon runtime or only a local harness/simulation, which advisory effects are locally allowed, and which effects remain blocked. Each row must show its `ready`, `warning`, or `blocked` status as readable text, not only styling. Descriptor auth failure, timeout, HTTP failure, and missing `text_turn` route must remain visible as specific blocked rows. When Rehearsal Mode is off, direct-send controls should repeat the first blocked preflight reason unless local governance already disables the direct send and shows its own blocker. Local governance blocks must show the outcome such as `no_go` before any send attempt, and the allowed-effects row must show `none` when local governance blocks forwarding. The checklist may also show a promotion-gate warning when evidence is not yet suitable for live promotion, but it is not Napoleon approval and must not write memory, capture approval, dispatch agents, send externally, or hide blocked effects. While Rehearsal Mode is active, the checklist must not claim that a direct live send is attemptable; it should point the user to the local preview boundary first. A post-preview advisory-send control must also remain disabled while Rehearsal Mode is active, and may enable only after Rehearsal Mode is off with an unchanged preview and governed bridge readiness, including descriptor preflight readiness.

Governed handoff readiness for memory proposal review, Chief of Staff steering, and Chief of Staff taxonomy review is also local display state only. It may show whether a proposal-only draft exists, whether an endpoint is configured, whether descriptor preflight passes, whether Rehearsal Mode is off, and which effects remain blocked. It is not Napoleon approval, must not apply changes, write memory, capture approval, dispatch agents, or send externally, and submit controls must remain disabled until the draft, endpoint, descriptor preflight, and Rehearsal Mode state are ready. Governance review, memory proposal, Chief of Staff steering, and Chief of Staff taxonomy review submit helpers must also re-check active profile scope at submission time and fail closed before request fetch if a stale review packet, proposal, or draft belongs to a different profile. Governed review responses must also fail closed when visible response text claims memory writes, approval capture, agent dispatch, external sends, or local application, even if the explicit boundary fields remain false. The submit helpers must also fail closed while Rehearsal Mode is active, even if called outside the visible disabled controls. Endpoint, bearer-token, descriptor, and Rehearsal Mode changes must clear rendered Chief of Staff taxonomy review drafts and results so a local packet cannot be reused across stale handoff context.

Local capability taxonomy edits must clear already-rendered Chief of Staff steering drafts, steering exports, steering review responses, and steering failures because edited labels can change the recommendation evidence the draft summarizes. The user must regenerate steering and taxonomy review packets from the current local labels before governed handoff.

Delegation and recommendation attribution require bridge provenance. Concierge may say that Napoleon recommended something only when the live bridge response includes matching recommendation provenance with that contribution, trace ID, and audit ID, and those IDs match the response trace and audit envelopes. Any returned recommendation provenance must match the accepted response text and those response envelopes before Concierge may keep or display it, even if the visible response text does not explicitly say "Napoleon recommends". Concierge may say that a selected agent found something only when the live bridge response includes that contribution, selected agent, governance state, trace ID, and audit ID, and those IDs match the response trace and audit envelopes. Live text that claims a Napoleon recommendation or selected-agent finding without matching contribution provenance must be blocked as a contract mismatch. The explicit `/cos/text-turn` advisory adapter follows the same rejection rule before accepting adapted responses. Missing or mismatched provenance fails closed rather than being repaired locally. Napoleon response proof comparison uses only sanitized returned-provenance metadata and rejects previous or current proof JSON if unsafe field names, endpoint-like values, loopback hosts, bearer credentials, or authorization strings appear anywhere in the proof.

The Napoleon delegation panel must stay visible under its normal panel heading even when no bridge provenance has been returned. In that empty state, target capability, provenance source, selected agents, why selected, allowed effects, blocked effects, governance state, trace ID, audit ID, and proof alignment must be shown as `not returned` rather than inferred locally or described as unavailable. When returned delegation exists, proof alignment must name the returned response trace/audit boundary and must not treat imported readiness proof as selected-agent delegation. When only a target capability is returned, proof alignment must state that selected-agent proof was not returned.

The last successful Napoleon proof panel is local display of returned bridge metadata only. It may summarize governance, profile mode, decision, trace, audit, returned target capability, selected-agent provenance, selected-agent selection reasons, recommendation proof alignment, allowed effects, and blocked effects from the last successful live text turn, but it must not be treated as Napoleon approval, execution proof, memory-write permission, agent dispatch permission, or external-send permission. Unsafe returned governance, profile mode, decision, trace, and audit values must be redacted before visible display or local proof export. Returned recommendation proof alignment must say it shares the same returned response trace/audit as the proof; absent recommendation provenance must remain marked not returned. Local-only answers, blocked preflight paths, failed bridge calls, active user profile changes, endpoint changes, bearer-token changes, descriptor mode changes, descriptor discovery refreshes, and Rehearsal Mode activation must clear stale proof and delegation presentation together instead of reusing them across profile, bridge-connection, or live/local mode contexts. Active user profile changes and Rehearsal Mode activation must also clear captured bridge evidence readiness and rendered bridge readiness proof exports so local-only preview mode or a different profile cannot display stale live validation. Active user profile changes must also clear visible bridge failure banners and local Chief of Staff steering and taxonomy review drafts because those failed or proposed states carry profile-scoped evidence, child-protected cautions, and review wording.

Last successful Napoleon proof exports are local metadata only. They may include generated time, conversation ID, proof status, explicit handled-by provenance, attribution boundary, governance outcome, profile mode, decision ID, trace ID, audit ID, returned target capability, returned Napoleon recommendation summary, selected agent display names, selected-agent selection reasons, allowed effects, blocked effects, and explicit false boundary flags, but they must not include raw prompts, response text, endpoint hosts, bearer tokens, request bodies, or response bodies.

Last successful Napoleon proof comparison is also local metadata only. It compares the current proof with the previous proof exported in the same app session using proof status, handled-by provenance, attribution boundary, returned governance, profile mode, trace/audit, target-capability, returned recommendation, selected-agent, selected-agent selection-reason, allowed-effect, and blocked-effect fields, and it must not expose raw prompts, response text, endpoint hosts, bearer tokens, request bodies, response bodies, or authority claims.

Live text responses that claim memory writes, approval capture, approval or authorization, external sends, proposal submission, scheduling or booking, agent dispatch, local storage, or local application must also fail closed as contract mismatches, including shorthand claims such as "sent it", "submitted it", "approved it", "saved it", or "scheduled it". This applies to both canonical generated bridge responses and adapted explicit `/cos/text-turn` advisory harness responses. A response cannot convert a governed text turn into execution proof just by saying the side effect happened.

Live text responses must preserve the active user profile boundary. A child protected, guest, or collaborator turn cannot be widened into adult owner scope by returned response metadata; unexpected profile-mode drift fails closed as a contract mismatch unless a future governed profile-change path explicitly authorizes it. Local Rehearsal Mode governance review-required, blocked `no_go`, acknowledgement, and memory proposal previews must also record the active profile mode and remain local without contacting Napoleon. Fail-closed bridge errors, governed handoff failure errors, visible governed handoff failure messages, `bridge_request_failed` telemetry, governed handoff failure telemetry, transcript metadata, local governance-review telemetry, local memory-proposal telemetry, and local derived capability signals must show the active profile mode so blocked responses, local previews, and blocked handoffs do not hide which scope was preserved.

Local avatar state preparation is display-only. It may map local preview text, or returned text provenance only when bridge proof exists, plus stance and active profile into a neutral avatar-facing state before live avatar rendering exists, but it must not start camera capture, face detection, affect inference, animation, storage, live Napoleon contact, memory writes, approval capture, agent dispatch, or external sends. The built-in local avatar sample must be labeled as a local preview without Napoleon provenance. It must not infer emotion as fact, claim Napoleon or delegated-agent authority without bridge proof, or treat child protected avatar state as guardian approval. Child protected avatar state must keep avatar camera and affect paths disabled until guardian review and must record that no guardian approval was captured. Local avatar state, expression, lip-sync, and gaze panels must show the no-agent-dispatch boundary explicitly instead of relying only on blocked-effect lists. Local avatar state and expression panels must also show that live Napoleon was not contacted.

Local avatar model loading is metadata-only until a real renderer exists. It may validate a local `.vrm` reference and show display metadata, but it must not start rendering, read files through privileged side channels, request camera permission, capture video, run face detection, infer affect, contact Napoleon, write memory, capture approval, dispatch agents, or send externally. Child protected model loading must show guardian-review wording and record that no guardian approval was captured.

Local avatar renderer readiness is preflight display state only. It may show that a renderer could be prepared from loaded model metadata, but it must not allocate a canvas, start a render loop, animate a model, request camera permission, capture video, run face detection, infer affect, contact Napoleon, write memory, capture approval, dispatch agents, or send externally. Child protected renderer readiness must remain blocked until guardian review and must record that no guardian approval was captured.

Local avatar expression mapping is stance metadata only. It may map an explicit Concierge stance such as direct, warm, concerned, playful, or somber to an expression label, but it must not infer the user's emotion, infer the assistant's emotion, start animation, request camera permission, capture video, run face detection, contact Napoleon, write memory, capture approval, dispatch agents, or send externally. The built-in local expression sample must not claim bridge provenance; bridge provenance may be true only when a real bridge-derived input supplies it. Child protected expression mapping must remain conservative and must record that no guardian approval was captured.

Local avatar lip-sync preparation is generated-amplitude metadata only. It may derive mouth-open cues from local amplitude frames for future avatar animation, but it must not start audio playback, request microphone permission, start microphone capture, store raw audio, start avatar animation, request camera permission, capture video, run face detection, infer affect, contact Napoleon, write memory, capture approval, dispatch agents, or send externally. Child protected lip-sync preparation must show guardian-review wording and must record that no guardian approval was captured.

Local avatar gaze simulation is UI metadata only. It may derive an eye target from explicit local window-focus and user-position metadata for future avatar behavior, but it must not start camera-based gaze tracking, infer attention, start avatar animation, request camera permission, capture video, run face detection, infer affect, contact Napoleon, write memory, capture approval, dispatch agents, or send externally. Child protected gaze simulation must show guardian-review wording, expose camera and animation policies as disabled until guardian review, keep attention policy disabled, and record that no guardian approval was captured.

Local avatar face and head-pose estimation is sample metadata only. It may show deterministic face-present, head yaw, head pitch, head roll, and confidence values for a future camera perception surface, but it must not request camera permission, start camera capture, store raw video, run live face detection, infer affect, infer attention, start avatar animation, contact Napoleon, write memory, capture approval, dispatch agents, or send externally. The panel must visibly show that live Napoleon was not contacted before and after local metadata preparation runs. Child protected face/head-pose preparation must show guardian-review wording, expose camera and face-pose policies as disabled until guardian review, keep affect and attention policies disabled, and record that no guardian approval was captured.

Local avatar affect fusion is uncertainty metadata only. It may combine deterministic local head-pose, voice-pause, and text-clarification samples, but it must not claim emotion facts, infer attention, request camera or microphone permission, start capture, store raw media, run live affect models, animate the avatar, contact Napoleon, write memory, capture approval, dispatch agents, or send externally. The panel must visibly show that live Napoleon was not contacted before and after local metadata preparation runs. Child protected affect fusion must show guardian-review wording, expose camera, microphone, storage, and affect policies as disabled until guardian review, keep emotion-fact policy disabled, and record that no guardian approval was captured.

## 4. Memory proposal review

Text Concierge may identify possible preferences or profile notes from a turn and show them as memory proposals.

Every memory proposal review must show proposal ID, source turn, user profile, proposed value, rationale, review state, blocked effects, trace ID, and audit ID.

Memory proposal review is proposal-only. Local acknowledgement records that the proposal was seen, and local dismissal hides the local proposal, but neither action writes memory, captures approval, appends Napoleon audit records, or changes profile authority.

When a governed Napoleon endpoint is configured, descriptor preflight passes, and Rehearsal Mode is off, Concierge may submit the proposal to Napoleon review through `/v1/concierge/memory-proposals`. That handoff is still proposal-only: Concierge must not write memory, capture approval, send externally, dispatch agents, or treat submission as permission. Rehearsal Mode remains local and must not use this handoff.

Governed memory review responses that claim a memory write, approval capture, external send, agent dispatch, or local application must fail closed as contract mismatches.

Child protected memory proposals require guardian-appropriate review and must use wording that rejects secret-keeping.

## 5. Privacy defaults

- Camera off by default
- Microphone off by default
- Raw audio not stored by default
- Raw video not stored by default
- Derived signals stored only when useful
- Child data minimized
- Telemetry redacted before export
- Local camera and microphone settings are not capture permission by themselves
- Microphone permission readiness is not active recording by itself
- Camera permission readiness is not active recording by itself

Conversation Capability Intelligence persistence:

- Stores derived metadata signals only by default, not raw user text, raw audio, or raw video.
- Uses count and age bounded browser-local retention for the latest capability signals.
- Shows local retention status in the Text Concierge UI, including maximum signal count and maximum age.
- Provides a clear control that removes both persisted and in-memory capability signals.
- Provides a local JSON export control with privacy, retention, trend, and scoring caveats; export does not grant permission to share externally.
- Provides local taxonomy controls for rename, merge, deprecated markers, split-candidate markers, reset, Chief of Staff taxonomy review drafts with evaluator-case and evolution-proposal packet details, and governed taxonomy review submission when endpoint and descriptor preflight pass and Rehearsal Mode is off.
- Clear, export, taxonomy, taxonomy review drafts and submissions, retention pruning, trend answers, and recommendation scoring do not capture approval, write Napoleon memory, dispatch agents, send externally, change governance authority, apply taxonomy edits, or change Napoleon routing/policy.
- Weekly and seasonal trend answers compare local metadata windows only. They must not optimize engagement over safety, infer durable personal traits, or grant permission to implement, write memory, dispatch agents, send externally, or change Napoleon routing/policy.
- Chief of Staff steering drafts are proposal packets only. They can contain a capability recommendation, evaluator case candidate, evolution proposal draft, and metadata-only learning signals. The visible draft may summarize learning-signal count, type, source, raw-text retention state, and proposal-only state, but must not expose raw user text. Concierge may submit them to Napoleon Chief of Staff review only through the named governed bridge target after endpoint and descriptor preflight pass and Rehearsal Mode is off. Generated Concierge-compatible endpoints and the local harness use the canonical Chief of Staff steering route; Napoleon root or explicit review endpoints use `/chief-of-staff/reviews/evolution-proposals`. Napoleon's direct proposal path `/evolution/proposals` has a separate named proposal submission target and still cannot apply changes, write memory, dispatch agents, send externally, update registries, append traces, route tasks, or capture approval.
- Recommendation scoring penalizes privacy risk, child safety risk, governance risk, authority expansion, and high implementation effort.
- Child protected records remain minimized and marked with `child_sensitive` privacy class.

## 6. Child mode rules

Child protected mode must:

- Use age-appropriate language
- Encourage healthy independence
- Refuse secret-keeping from guardian in safety-relevant contexts
- Require guardian approval for external actions
- Avoid emotional dependency
- Avoid persuasive avatar behavior
- Minimize memory
- Disable camera affect estimation by default unless explicitly approved

## 7. Avatar safety

Avatar mode must:

- Clearly identify as AI
- Be easy to mute, hide, pause, or disable
- Avoid fake emotional dependence
- Avoid intense emotional mirroring
- Avoid surveillance-like behavior
- Explain camera and mic state visibly
- Preserve user agency
- Treat affect fusion as uncertainty metadata only; do not present local signals as emotional facts or attention facts
- Keep raw avatar audio/video storage disabled by default and visibly separate local preferences from permission, approval, or live capture
