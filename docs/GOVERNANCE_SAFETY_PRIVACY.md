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

Repository validation scans Concierge runtime source for direct process execution, memory or graph access, and agent or tool dispatch. The scan is a guardrail, not authority: it catches local implementation drift while Napoleon remains the only authority layer.

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

Child protected mode uses stricter wording. It must not imply secret-keeping, hidden external action, or guardian-bypassing approval.

Live Napoleon bridge failures are fail-closed states. Missing endpoint, missing descriptor, descriptor mismatch, checksum or signature mismatch, authentication failure, contract mismatch, local `no_go`, remote `deny` or `no_go`, timeout, and HTTP failure must be shown as blocked local states. Live text turns, memory proposal handoff, Chief of Staff steering handoff, and Chief of Staff taxonomy review handoff must not use Concierge's built-in descriptor as a substitute for completed descriptor discovery; endpoint or bearer-token changes require a fresh descriptor discovery before live sends resume. Remote `deny` and `no_go` outcomes must block text responses, memory proposal handoff, Chief of Staff steering handoff, and Chief of Staff taxonomy review handoff instead of being treated as successful answers or completed reviews. They must not be treated as Napoleon approval. Early local failures must preserve the relevant text-turn, memory proposal, Chief of Staff steering, or taxonomy review blocked-effect list, and remote failures must preserve Napoleon-supplied blocked effects plus returned decision, audit, and governance references where available, rather than retrying into side effects. Live text-turn failure reasons, returned decision/audit references, and blocked effects must be visible in the conversation transcript as well as the bridge failure panel.

The optional bridge bearer token is a local connection credential. Concierge sends it only in the `Authorization` header for governed bridge requests. It must not be included in request bodies, local capability exports, telemetry attributes, memory proposals, or user-visible provenance panels.

Text Concierge settings expose local telemetry, camera, and microphone switches. Telemetry defaults to on for local development signals; camera and microphone default to off. The camera and microphone switches persist local state only: they do not start capture, request operating-system permissions, store raw audio or video, send data externally, write memory, capture approval, or grant guardian consent. Privacy-setting events are local metadata and must carry explicit false side-effect flags.

Voice and camera readiness are also local preflight state. Concierge may request operating-system microphone or camera permission only after an explicit user action, and any granted permission stream must be stopped immediately until voice or avatar/camera mode starts. Permission granted is not active recording, not guardian approval, not Napoleon approval, and not permission to send raw audio or video externally.

Voice activity detection may run against local sample amplitude frames before live voice mode exists. Sample VAD output is timing and level metadata only: it must not request microphone permission, start capture, store raw audio, write memory, capture approval, dispatch agents, send externally, or imply guardian consent.

Speech transcription may run against fixed local sample metadata before live voice mode exists. Sample STT output is transcript metadata only: it must not request microphone permission, start capture, store raw audio, write memory, capture approval, dispatch agents, send externally, or imply guardian consent.

Text to speech may run against fixed local sample text before live voice mode exists. Sample TTS output is speech-preparation metadata only: it must not start audio playback, request microphone permission, store raw audio, write memory, capture approval, dispatch agents, send externally, or imply guardian consent.

Voice-turn rehearsal may chain local VAD, STT, text-boundary, and TTS sample metadata before live voice mode exists. It is a local dry run only: it must not request microphone permission, start capture, start playback, store raw audio, contact Napoleon, write memory, capture approval, dispatch agents, send externally, or imply guardian consent. Its text boundary must state when Napoleon was not contacted and no delegated agent response exists.

Barge-in rehearsal may mark local sample speech output as interrupted before live voice mode exists. It is local state modeling only: it must not start playback, request microphone permission, start capture, store raw audio, contact Napoleon, write memory, capture approval, dispatch agents, send externally, or imply guardian consent. It must make blocked effects visible and must not treat interruption as Napoleon approval or permission to record or speak externally.

Voice response shaping may shorten bridge-provenance text for future speech before live voice mode exists. It is local preparation only: it must not start playback, request microphone permission, start capture, store raw audio, contact Napoleon, write memory, capture approval, dispatch agents, send externally, or imply guardian consent. It may preserve "Napoleon says" or delegated-agent wording only when the bridge response supplied matching provenance; otherwise it must not claim Napoleon or delegated-agent authority. In child protected mode, shaped speech must be shorter, use slower pacing metadata, include guardian-review reminders, and remain non-authorizing.

Bridge readiness proof exports are local metadata only. They may include descriptor state, checksum/signature state, evidence status, last operation path, blocked effects, and last fail-closed reason, but they must not include raw prompts, response bodies, endpoint hosts, bearer tokens, request bodies, or response bodies. Exporting a readiness proof is not Napoleon approval and does not grant memory writes, approval capture, agent dispatch, local application, or external sends.

Bridge readiness proof comparison is also local metadata only. It compares the current proof with the previous proof exported in the same app session using sanitized descriptor and evidence fields, and it must not expose raw prompts, endpoint hosts, tokens, request bodies, response bodies, or authority claims.

The governed route panel is local contract metadata only. It may show canonical Napoleon bridge paths and request kinds from the generated registry, but it must not display configured endpoint hosts, bearer tokens, raw prompts, request bodies, response bodies, or any claim that Concierge can bypass Napoleon governance.

The live-send preflight checklist is local display state only. It may show whether text is present, endpoint configuration exists, descriptor discovery and integrity pass, local governance allows preparing an advisory request, and Rehearsal Mode is active, but it is not Napoleon approval and must not write memory, capture approval, dispatch agents, send externally, or hide blocked effects.

Governed handoff readiness for memory proposal review, Chief of Staff steering, and Chief of Staff taxonomy review is also local display state only. It may show whether a proposal-only draft exists, whether an endpoint is configured, whether descriptor preflight passes, whether Rehearsal Mode is off, and which effects remain blocked. It is not Napoleon approval, must not apply changes, write memory, capture approval, dispatch agents, or send externally, and submit controls must remain disabled until the draft, endpoint, descriptor preflight, and Rehearsal Mode state are ready. The submit helpers must also fail closed while Rehearsal Mode is active, even if called outside the visible disabled controls.

Delegation and recommendation attribution require bridge provenance. Concierge may say that Napoleon recommended something only when the live bridge response includes matching recommendation provenance with that contribution, trace ID, and audit ID, and those IDs match the response trace and audit envelopes. Concierge may say that a selected agent found something only when the live bridge response includes that contribution, selected agent, governance state, trace ID, and audit ID, and those IDs match the response trace and audit envelopes. Live text that claims a Napoleon recommendation or selected-agent finding without matching contribution provenance must be blocked as a contract mismatch. Missing or mismatched provenance fails closed rather than being repaired locally.

The last successful Napoleon proof panel is local display of returned bridge metadata only. It may summarize governance, profile mode, decision, trace, audit, returned target capability, selected-agent provenance, allowed effects, and blocked effects from the last successful live text turn, but it must not be treated as Napoleon approval, execution proof, memory-write permission, agent dispatch permission, or external-send permission. Local-only answers, blocked preflight paths, and failed bridge calls must clear stale proof and delegation presentation together instead of reusing them.

Last successful Napoleon proof exports are local metadata only. They may include generated time, conversation ID, proof status, governance outcome, profile mode, decision ID, trace ID, audit ID, returned target capability, selected agent display names, allowed effects, blocked effects, and explicit false boundary flags, but they must not include raw prompts, response text, endpoint hosts, bearer tokens, request bodies, or response bodies.

Last successful Napoleon proof comparison is also local metadata only. It compares the current proof with the previous proof exported in the same app session using returned governance, profile mode, trace/audit, target-capability, selected-agent, allowed-effect, and blocked-effect fields, and it must not expose raw prompts, response text, endpoint hosts, bearer tokens, request bodies, response bodies, or authority claims.

Live text responses that claim memory writes, approval capture, external sends, agent dispatch, or local application must also fail closed as contract mismatches. A response cannot convert a governed text turn into execution proof just by saying the side effect happened.

Live text responses must preserve the active user profile boundary. A child protected, guest, or collaborator turn cannot be widened into adult owner scope by returned response metadata; unexpected profile-mode drift fails closed as a contract mismatch unless a future governed profile-change path explicitly authorizes it. The fail-closed transcript metadata and local derived capability signal must show the active profile mode so the blocked response does not hide which scope was preserved.

Local avatar state preparation is display-only. It may map returned text provenance, stance, and active profile into a neutral avatar-facing state before live avatar rendering exists, but it must not start camera capture, face detection, affect inference, animation, storage, live Napoleon contact, memory writes, approval capture, agent dispatch, or external sends. It must not infer emotion as fact, claim Napoleon or delegated-agent authority without bridge proof, or treat child protected avatar state as guardian approval. Child protected avatar state must keep avatar camera and affect paths disabled until guardian review and must record that no guardian approval was captured.

Local avatar model loading is metadata-only until a real renderer exists. It may validate a local `.vrm` reference and show display metadata, but it must not start rendering, read files through privileged side channels, request camera permission, capture video, run face detection, infer affect, contact Napoleon, write memory, capture approval, dispatch agents, or send externally. Child protected model loading must show guardian-review wording and record that no guardian approval was captured.

Local avatar renderer readiness is preflight display state only. It may show that a renderer could be prepared from loaded model metadata, but it must not allocate a canvas, start a render loop, animate a model, request camera permission, capture video, run face detection, infer affect, contact Napoleon, write memory, capture approval, dispatch agents, or send externally. Child protected renderer readiness must remain blocked until guardian review and must record that no guardian approval was captured.

Local avatar expression mapping is stance metadata only. It may map an explicit Concierge stance such as direct, warm, concerned, playful, or somber to an expression label, but it must not infer the user's emotion, infer the assistant's emotion, start animation, request camera permission, capture video, run face detection, contact Napoleon, write memory, capture approval, dispatch agents, or send externally. Child protected expression mapping must remain conservative and must record that no guardian approval was captured.

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
- Chief of Staff steering drafts are proposal packets only. They can contain a capability recommendation, evaluator case candidate, and evolution proposal draft. Concierge may submit them to Napoleon Chief of Staff review only through the governed bridge after endpoint and descriptor preflight pass and Rehearsal Mode is off, but submission does not apply changes, write memory, dispatch agents, send externally, or capture approval.
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
