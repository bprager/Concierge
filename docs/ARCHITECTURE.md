# Architecture

## 1. Recommended architecture

Concierge is a local desktop front-end plus a governed Napoleon bridge.

The front-end owns interaction capture and presentation. Napoleon owns orchestration, governance, memory, and agent delegation.

## 2. System diagram

```plantuml
@startuml
scale max 600 width

actor "Human User" as User

rectangle "Concierge Desktop App" {
  component "Text UI" as TextUI
  component "Voice UI" as VoiceUI
  component "Avatar UI" as AvatarUI
  component "Settings and Consent UI" as Consent
  component "Local Telemetry Buffer" as Buffer
}

rectangle "Local Perception Services" {
  component "Voice Activity Detection" as VAD
  component "Speech to Text" as STT
  component "Text to Speech" as TTS
  component "Face and Head Pose" as Face
  component "Gaze Simulation" as Gaze
  component "User State Fusion" as Fusion
}

rectangle "Concierge Runtime" {
  component "Identity Resolver" as Identity
  component "Dialogue State" as Dialogue
  component "Interaction Stance Controller" as Stance
  component "Governance UX" as GovUX
  component "Capability Intelligence" as CapIntel
  component "Napoleon Bridge" as Bridge
}

rectangle "Napoleon Core" {
  component "Chief of Staff" as CoS
  component "Governance Gate" as Gov
  component "Policy Engine" as Policy
  component "Memory Graph" as Memory
  component "Task Router" as Router
  component "Agent Registry" as Registry
  component "Evaluation Logger" as Eval
  component "Evolution Controller" as Evolution
}

User --> TextUI
User --> VoiceUI
User --> AvatarUI

VoiceUI --> VAD
VAD --> STT
STT --> Dialogue
Dialogue --> TTS
TTS --> VoiceUI

AvatarUI --> Face
Face --> Gaze
Gaze --> Fusion
Fusion --> Stance

TextUI --> Dialogue
Dialogue --> Identity
Identity --> Stance
Stance --> GovUX
Dialogue --> CapIntel
GovUX --> Bridge
Bridge --> Gov
Gov --> Policy
Policy --> Router
Router --> Registry
Router --> Memory
CoS --> Gov
Bridge --> Eval
CapIntel --> Eval
CapIntel --> Evolution
Eval --> Evolution
Evolution --> CoS

Buffer <-- TextUI
Buffer <-- VoiceUI
Buffer <-- AvatarUI
Buffer <-- Bridge
Buffer <-- Stance
Buffer <-- CapIntel

@enduml
```

## 3. Evaluator cycle

```plantuml
@startuml
scale max 600 width

start
:Load evaluator scenarios;
:Submit design prompt to Napoleon;
:Collect Napoleon response and artifacts;
:Score rubric dimensions;
:Detect hard fails;
:Generate report;
if (Hard fail?) then (yes)
  :Block promotion;
else (no)
  :Compare to previous run;
  if (Regression?) then (yes)
    :Create improvement issue;
  else (no)
    :Mark candidate stable;
  endif
endif
:Propose evolution changes if needed;
stop

@enduml
```

## 4. Runtime turn sequence

```plantuml
@startuml
scale max 600 width

actor User
participant "Concierge UI" as UI
participant "Dialogue State" as D
participant "Stance Controller" as S
participant "Governance UX" as GUX
participant "Napoleon Bridge" as NB
participant "Napoleon Governance" as NG
participant "Task Router" as TR
participant "Telemetry" as OTEL

User -> UI: message or speech
UI -> OTEL: user_message_received
UI -> D: normalize input
D -> OTEL: intent_detected
D -> S: request stance
S -> OTEL: stance_selected
D -> GUX: action candidate
GUX -> NG: governance check
NG -> OTEL: governance_decision
NG -> TR: route if allowed
TR -> NB: response payload
NB -> UI: response
UI -> OTEL: response_generated
UI -> User: text, voice, or avatar response

@enduml
```

### Rehearsal Mode sequence

Rehearsal Mode is a local preview step before a live Napoleon bridge call. It builds the same text turn contract shape used by the bridge, then displays the understood request, proposed Napoleon path, Chief of Staff review packet, allowed effects, blocked effects, approval state, memory proposal, trace/audit preview, and evaluator-case candidate. It does not contact Napoleon, capture approval, write memory, send externally, dispatch agents, or execute commands.

Live bridge calls fail closed when the Napoleon endpoint is missing, the Chief of Staff descriptor is missing, descriptor validation fails, descriptor checksum or signature validation fails, authentication fails, the response contract is invalid, local governance is `no_go`, Napoleon returns `deny` or `no_go`, or the bridge times out. This denial rule applies to text turns, memory proposal review handoff, and Chief of Staff steering handoff. Text Concierge can store an optional local bridge bearer token and sends it only as an `Authorization` header, never in request bodies, telemetry, memory proposals, capability exports, bridge evidence records, or readiness proof exports. The configured Napoleon endpoint is treated as a base URL; text turns resolve to `/v1/concierge/turn`, steering handoff resolves to `/v1/concierge/chief-of-staff/steering`, and memory proposal review handoff resolves to `/v1/concierge/memory-proposals`. The app keeps these paths in a named bridge operation registry generated into `app/src/generatedBridgeOperations.ts` from `api/napoleon_bridge.openapi.yaml`; repository validation reruns `scripts/generate_bridge_operations.py --check`, so local route constants cannot drift silently from the canonical contract. Text Concierge displays the same governed route registry locally for descriptor discovery, text turns, memory proposal review, and Chief of Staff steering without exposing endpoint hosts or bearer tokens. Repository validation also scans Concierge runtime source for direct process execution, memory or graph access, and agent or tool dispatch, so UI code cannot quietly bypass the governed bridge. A successful governed response must include matching governance, trace, and audit provenance from Napoleon, must not carry a denied or no-go governance outcome, and must not claim memory writes, approval capture, external sends, agent dispatch, or local application. Concierge does not synthesize missing trace or audit envelopes for a live success. Live text bridge calls can emit sanitized `bridge_contract_evidence` records for runtime contract comparison. These records contain operation, request kind, path, trace/request/decision/audit IDs, governance outcome, descriptor state, selected agent IDs, effects, and fail-closed reason metadata, but not raw prompt text, response text, endpoint host, or bearer tokens. The local bridge evidence comparator checks captured evidence against the OpenAPI-aligned bridge registry and rejects raw payload or secret fields before records are treated as validation evidence. The UI can export a local bridge readiness proof containing descriptor state, checksum/signature state, blocked effects, evidence capture/comparison status, last operation path, and last failure reason; it omits raw prompts, response bodies, endpoint hosts, bearer tokens, and request bodies, and it is not Napoleon approval. The UI can also compare the current proof with the previous proof exported in the same app session, using only sanitized descriptor and evidence fields. Early local failures preserve the relevant text-turn, memory proposal, or Chief of Staff steering blocked-effect list, remote failures preserve Napoleon-supplied blocked effects plus returned decision, audit, and governance references where available, and none of these failures execute side effects, write memory, dispatch agents, send externally, append remote audit records, or capture approval.

Descriptor discovery is treated as connection state, not authority. Text Concierge shows endpoint presence, descriptor discovery, validation, checksum state, signature state, runtime authority, and cache policy before live sends. It also summarizes live bridge readiness from endpoint state, descriptor integrity, in-session sanitized bridge evidence capture/comparison status, last live-send status and fail-closed reason, and blocked effects, while explicitly stating that readiness is not Napoleon approval and does not grant memory writes, agent dispatch, approval capture, or external sends. The composer includes a live-send preflight checklist for text readiness, endpoint configuration, descriptor discovery, descriptor integrity, local governance send gate, and Rehearsal Mode state; the checklist is local display state only and does not approve or send. Memory proposal review, Chief of Staff steering, and Chief of Staff taxonomy review panels also show governed handoff readiness from draft, endpoint, descriptor preflight, and blocked-effect state before enabling submission; those summaries are local display only and are not Napoleon approval or permission to apply changes. Captured evidence is compared locally against the named bridge operation registry and rejected if it contains raw or secret fields before the readiness panel marks evidence comparison as passed. The local UI can simulate discovered, missing, and checksum/signature mismatch states, and it can also explicitly fetch `/v1/concierge/chief-of-staff/descriptor` from the configured Napoleon base URL. A fetched descriptor is still only a preflight connection signal; invalid, missing, or mismatched discovery keeps live sends blocked. Text turns, Chief of Staff steering handoff, taxonomy review handoff, and memory proposal handoff must receive discovered descriptor state before they can attempt a live request; they must fail closed instead of substituting Concierge's built-in descriptor.

Concierge renders a separate Napoleon delegation panel even before delegation provenance is returned. In the empty state, selected agents, allowed effects, blocked effects, governance state, trace ID, and audit ID are shown as `not returned`, so Concierge does not silently imply a capability or agent handled the response. When Napoleon returns delegation provenance, the same panel fills in selected agents, selection reasons, allowed effects, blocked effects, governance state, trace ID, and audit ID. If Napoleon returns a `targetAgent` capability ID without selected-agent delegation, the delegation panel shows the returned target capability while still marking selected agents and detailed delegation fields as `not returned`. Each successful Napoleon transcript response also shows its source as the governed bridge, its attribution boundary as returned bridge provenance only, the returned target capability when present, and the response blocked effects. Fail-closed Napoleon bridge attempts also annotate the assistant failure message with a blocked bridge source, a boundary that no Napoleon response was accepted, the active profile mode, and blocked effects when available. After a successful live text turn, Concierge also renders a last successful Napoleon proof panel from returned bridge metadata: governance outcome, decision ID, response trace, audit ID, returned capability or agent provenance, allowed effects, and blocked effects. If Napoleon returns a `targetAgent` capability ID without selected-agent delegation, the proof panel and sanitized proof export preserve that returned capability instead of inventing selected-agent provenance. This panel is display-only provenance; it is not approval, memory permission, agent dispatch permission, or external-send permission. Concierge can export the proof as sanitized local metadata and compare it with the previous proof exported in the same app session using returned metadata only; comparison does not create Napoleon audit evidence or authority. Concierge only attributes statements such as "Passive Brain found..." when the bridge response contains that contribution and the delegation trace/audit IDs match the response envelopes. Concierge only relays statements such as "Napoleon recommends..." when matching recommendation provenance includes the recommended contribution and trace/audit IDs that match the response envelopes. If live response text claims a selected-agent finding or Napoleon recommendation without matching provenance, the bridge fails closed as a contract mismatch. Missing or mismatched provenance is rejected rather than invented. Live text responses must keep the returned profile mode aligned with the active Concierge user profile; child protected, guest, and collaborator turns cannot be widened into adult owner or owner-only scope by response text or metadata.

Reusable local bridge fixtures live in `app/src/napoleonBridgeFixtures.ts`. They cover delegated success, auth failure, contract mismatch, and timeout behavior so bridge handling can be tested without a live Napoleon endpoint while preserving the same fail-closed semantics. Canonical request artifacts live in `examples/sample_memory_proposal_request.json`, `examples/sample_child_memory_proposal_request.json`, `examples/sample_chief_of_staff_steering_request.json`, and `examples/sample_child_chief_of_staff_steering_request.json`; repository validation checks them against the OpenAPI request schemas and verifies that the handoff boundary remains proposal-only, including nested fields that might otherwise imply approval, memory writes, agent dispatch, external sends, or local application. The child memory proposal artifact must remain in child protected mode and require guardian review. The child Chief of Staff steering artifact must remain in child protected mode and include explicit child-safety caution on the recommendation. Canonical response artifacts live in `examples/sample_text_turn_response.json`, `examples/sample_memory_proposal_response.json`, and `examples/sample_chief_of_staff_steering_response.json`; repository validation checks them against the OpenAPI response schemas, verifies that governance, trace, audit, delegation, and recommendation references agree, and rejects response-side claims that memory was written, approval was captured, agents were dispatched, external sends occurred, or proposals were applied locally before the artifacts can be treated as local contract evidence. A local HTTP bridge harness lives in `scripts/local_bridge_harness.py`; it serves Napoleon-compatible descriptor, text turn, steering, memory proposal, and evaluator endpoints for smoke validation, including deterministic text-turn, Chief of Staff steering, and memory proposal review responses that claim forbidden side effects so local checks can prove Concierge rejects them. The harness is not a substitute for a real Napoleon runtime. `make eval-http-local-harness` runs the evaluator in HTTP mode against that local harness to verify transport plumbing while preserving the separate requirement for real Napoleon endpoint validation. Text Concierge settings include a local harness endpoint preset for `http://127.0.0.1:8787`; selecting it only configures the governed endpoint and descriptor preflight, and does not start, stop, or control the harness process or grant authority.

```plantuml
@startuml
scale max 600 width

actor User
participant "Concierge UI" as UI
participant "Contract Adapter" as CA
participant "Telemetry" as OTEL

User -> UI: typed request
UI -> CA: build text turn contract
CA -> UI: rehearsal preview
UI -> OTEL: rehearsal_preview_created
UI -> User: preview blocked and allowed effects
User -> UI: send advisory request
UI -> "Napoleon Bridge": governed request

@enduml
```

### Conversation Capability Intelligence sequence

Conversation Capability Intelligence records derived metadata about conversation capability performance. It is local-first and proposal-only. It can explain common conversations, working capabilities, missing capabilities, architecture blockers, and recommended next capabilities, but it cannot implement changes, grant approval, write memory, dispatch agents, or send externally.

Chief of Staff steering converts the highest-ranked local capability recommendation into a proposal-only review packet with an evaluator case candidate and evolution proposal draft. The packet remains local unless a governed Napoleon endpoint is configured and descriptor preflight passes. The UI shows handoff readiness for draft, endpoint, descriptor preflight, and blocked effects before the submit control is enabled. When submitted, Concierge sends an `evolution_proposal_review` request through the governed bridge and requires Napoleon governance, trace, and audit proof before displaying the review response. Child-protected submissions add explicit child-safety caution, child-protected profile scope, and guardian/owner review wording to the packet before it leaves Concierge. Remote `deny` or `no_go` outcomes are blocked handoff failures, not successful reviews, and any review response that claims local application, memory writes, approval capture, agent dispatch, or external sends fails closed as a contract mismatch. Submission does not apply changes locally, write memory, dispatch agents, send externally, or capture approval.

Chief of Staff taxonomy review uses the same governed handoff boundary for local capability taxonomy cleanup packets. Concierge can draft merge, split, and deprecation review recommendations from local metadata, then send the packet through the Chief of Staff steering endpoint only after endpoint and descriptor preflight pass. The UI shows the same handoff readiness summary before submission and keeps the submit control disabled while the draft, endpoint, or descriptor preflight is blocked. The request is still an `evolution_proposal_review` packet with evaluator-case and evolution-proposal details. Napoleon must return matching governance, trace, and audit proof before Concierge displays the review response. Any response that claims local taxonomy application, memory writes, approval capture, agent dispatch, external sends, or local application fails closed as a contract mismatch. Submission never applies taxonomy edits locally or changes Napoleon policy/routing.

Memory proposal handoff follows the same governed bridge pattern. Concierge may submit a live memory proposal review packet only after endpoint and descriptor preflight pass. The UI shows handoff readiness for the proposal draft, endpoint, descriptor preflight, and blocked effects before enabling review submission. The packet contains the proposed memory diff, profile, guardian-review need, blocked effects, trace/audit references, and a proposal-only boundary. Napoleon must return matching governance, trace, and audit proof before Concierge displays the review response. Remote `deny` or `no_go` outcomes are blocked handoff failures, not successful reviews, and any review response that claims memory writes, approval capture, external sends, agent dispatch, or local application fails closed as a contract mismatch. The handoff is not available from Rehearsal Mode, and it never writes memory, captures approval, dispatches agents, or sends externally from Concierge.

```plantuml
@startuml
scale max 600 width

actor User
participant "Concierge UI" as UI
participant "Dialogue State" as D
participant "Capability Intelligence" as CI
participant "Local Telemetry Buffer" as Buffer
participant "Evaluator" as Eval
participant "Napoleon Evolution Controller" as Evo

User -> UI: asks or corrects Concierge
UI -> D: normalize turn
D -> CI: derived topic, intent, capability, outcome
CI -> Buffer: conversation_capability_signal
CI -> UI: aggregate answer or recommendation
UI -> User: common, working, missing, next capability summary
CI -> UI: Chief of Staff steering draft
UI -> User: recommendation, evaluator case candidate, evolution proposal draft
CI -> Eval: suggested evaluator case candidate
CI -> Evo: proposal-only draft, not applied

@enduml
```

## 5. Observability pipeline

```plantuml
@startuml
scale max 600 width

rectangle "Concierge App" {
  component "Trace Emitter"
  component "Metric Emitter"
  component "Structured Logger"
  component "Redaction Layer"
  component "Local Buffer"
}

rectangle "Telemetry Destinations" {
  component "Local JSONL Files"
  component "OTLP Collector"
  component "Evaluator Reports"
  component "Dashboard"
}

"Trace Emitter" --> "Redaction Layer"
"Metric Emitter" --> "Redaction Layer"
"Structured Logger" --> "Redaction Layer"
"Redaction Layer" --> "Local Buffer"
"Local Buffer" --> "Local JSONL Files"
"Local Buffer" --> "OTLP Collector"
"Local Buffer" --> "Evaluator Reports"
"OTLP Collector" --> "Dashboard"

@enduml
```

## 6. Component responsibilities

### Concierge Desktop App

- Owns UI, capture permissions, local rendering, and user controls.
- Does not own Napoleon authority.
- Does not silently retain raw camera or microphone data.
- Exposes local telemetry, camera, and microphone state in settings; camera and microphone default off and toggling them does not start capture or send media.
- Shows voice readiness as local preflight state; explicit microphone permission can be requested, but any permission stream is stopped immediately until voice mode exists.
- Shows a local voice activity detection sample that exercises segment detection from amplitude frames without starting microphone capture or storing raw audio.
- Shows a local speech transcription sample that exercises transcript metadata from fixed local sample tokens without starting microphone capture or storing raw audio.
- Shows a local text-to-speech sample that exercises speech-preparation metadata from fixed local sample text without starting audio playback or storing raw audio.
- Shows a local voice-turn rehearsal that chains VAD, STT, an explicit text authority boundary, and TTS metadata without starting capture, playback, storage, or Napoleon contact.
- Shows a local barge-in rehearsal that marks planned sample speech as interrupted and prepares next-turn state without starting capture, playback, storage, or Napoleon contact.
- Shows local voice response shaping that shortens long bridge-provenance text for future speech without inventing Napoleon or delegated-agent attribution and without starting capture, playback, storage, or Napoleon contact; child protected mode applies shorter speech, slower pacing metadata, and guardian-review reminders.
- Shows local neutral avatar state from returned text provenance, stance, and active profile without starting camera capture, face detection, affect inference, animation, storage, Napoleon contact, or side effects; child protected mode disables avatar camera and affect paths until guardian review and never treats avatar state as approval.
- Shows local stance-to-expression metadata mapping without starting avatar animation, inferring emotion, reading camera signals, contacting Napoleon, or granting approval; child protected mode keeps expression animation blocked until guardian review.
- Shows a local avatar model reference loader for VRM metadata without starting a renderer, reading raw camera signals, contacting Napoleon, writing memory, capturing approval, dispatching agents, or sending externally.
- Shows local avatar renderer readiness from loaded model metadata without allocating a canvas, starting a render loop, reading camera signals, contacting Napoleon, writing memory, capturing approval, dispatching agents, or sending externally.
- Shows camera readiness as local preflight state; explicit camera permission can be requested, but any permission stream is stopped immediately until avatar/camera mode exists.

### Local Perception Services

- Convert raw local signals into conservative derived signals.
- Emit uncertainty and evidence.
- Avoid durable emotional labels.

### Concierge Runtime

- Maintains dialogue state.
- Resolves user profile.
- Chooses interaction stance.
- Asks for confirmation when governance requires it.
- Tracks derived conversation capability signals and proposal-only improvement recommendations.
- Sends governed requests to Napoleon.

### Napoleon Core

- Owns governance, policy, memory, routing, agent registry, Chief of Staff review, and evolution approval.

## 7. Deployment shape

Initial target:

```text
Concierge.app
  app UI
  local settings
  telemetry buffer

local services
  perception service
  voice service
  avatar service

Napoleon bridge
  local or remote API endpoint
  authenticated
  trace-aware
```

## 8. Security boundaries

1. Camera and microphone are owned by local front-end.
2. Raw capture remains local unless user explicitly records or streams.
3. A local camera or microphone toggle is not operating-system permission, capture start, guardian approval, or permission to send media.
4. Microphone permission readiness is not active recording; voice capture remains stopped until the voice mode pipeline explicitly starts.
5. Camera permission readiness is not active recording; camera capture remains stopped until the avatar/camera pipeline explicitly starts.
6. Napoleon receives derived signals, transcripts, and user-approved context.
7. External actions go through Napoleon governance.
8. Child mode is stricter than adult mode.
