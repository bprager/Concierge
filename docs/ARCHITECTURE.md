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

Live bridge calls fail closed when the Napoleon endpoint is missing, the Chief of Staff descriptor is missing, descriptor validation fails, descriptor checksum or signature validation fails, authentication fails, the response contract is invalid, local governance is `no_go`, Napoleon returns `deny` or `no_go`, or the bridge times out. This denial rule applies to text turns, memory proposal review handoff, Chief of Staff steering handoff, and Chief of Staff taxonomy review handoff. Memory proposal review and Chief of Staff steering submissions also fail closed before request fetch when the proposal or draft profile no longer matches the active profile. Text Concierge can store an optional local bridge bearer token and sends it only as a request header: `Authorization` for generated `/v1/concierge/...` bridge requests, or `X-Napoleon-Auth` for explicit Napoleon advisory harness `/cos/descriptor`, `/cos/capabilities`, and `/cos/text-turn` requests. It is never included in request bodies, telemetry, memory proposals, capability exports, bridge evidence records, or readiness proof exports. The configured Napoleon endpoint may be a base URL, any known Concierge bridge operation URL, or an explicit Napoleon advisory harness `/cos/descriptor`, `/cos/capabilities`, `/cos`, or `/cos/text-turn` URL; the UI discards pasted query strings or fragments, strips known operation suffixes, then resolves descriptor discovery to `GET /v1/concierge/chief-of-staff/descriptor` for generated bridge endpoints or `GET /cos/descriptor` for explicit advisory harness endpoints, advisory capabilities to `GET /v1/concierge/chief-of-staff/capabilities` or `GET /cos/capabilities` only after descriptor discovery passes, text turns to `POST /v1/concierge/turn`, steering and taxonomy review handoffs to `POST /v1/concierge/chief-of-staff/steering`, and memory proposal review handoff to `POST /v1/concierge/memory-proposals`. The app keeps the generated paths, HTTP methods, request-kind metadata, and required 200-response fields in a named bridge operation registry generated into `app/src/generatedBridgeOperations.ts` from `api/napoleon_bridge.openapi.yaml`; runtime TypeScript bridge operation IDs and request-kind types are derived from that generated registry, and repository validation reruns `scripts/generate_bridge_operations.py --check`, so local route, type, and response-shape constants cannot drift silently from the canonical contract. Runtime bridge URL resolution accepts only named generated operations, not arbitrary caller-supplied paths, and bridge modules must fetch only URLs produced by named generated operation resolution or the explicit `/cos/descriptor`, `/cos/capabilities`, and `/cos/text-turn` advisory harness adapters rather than hard-coded, concatenated, or template-built live targets. Text Concierge displays the same governed route registry locally for descriptor discovery, advisory capabilities, text turns, memory proposal review, Chief of Staff steering, and Chief of Staff taxonomy review without exposing endpoint hosts or bearer tokens; taxonomy review is presented as a governed alias of the canonical Chief of Staff steering operation, not a new bridge route. Advisory capability discovery is explicit user-triggered connection metadata: it lists returned capability IDs, labels, descriptions, authority tiers, proposal-only state, runtime authority blocked state, and blocked effects, but it is not Napoleon approval and cannot write memory, capture approval, dispatch agents, send externally, or grant runtime authority. Napoleon agent and profile metadata discovery also uses named governed targets only: `/agents`, `/agents/{agent_id}`, and `/profiles/{profile_id}` may be read for metadata and rendered as connection state for returned agent manifests and the active profile, but those reads cannot dispatch agents, update registries, write memory, capture approval, send externally, or grant runtime authority. Repository validation also scans Concierge runtime source, manifests, and root lockfile declarations for direct process execution, memory or graph access, direct agent/tool dispatch names including `invokeAgent`, `runTool`, and `executeTool`, concatenated or bracketed agent/tool dispatch aliases, direct LLM, agent, memory/graph, shell/process, or alternate transport client dependencies, direct Tauri native bridge invocation including global `__TAURI__` invoke aliases, non-allowlisted Tauri commands, forbidden Tauri native plugin configuration or dependencies, unallowlisted browser network calls, remote module imports, and worker entry points such as `fetch`, `WebSocket`, `EventSource`, `XMLHttpRequest`, `sendBeacon`, `Worker`, `SharedWorker`, `importScripts`, `import("https://...")`, static `import` from outside URLs, service-worker registration, external `href`, `action`, `formAction`, `src`, `srcSet`, `poster`, or `ping` targets, bracket-assigned or `setAttribute` external targets, meta-refresh redirects, CSS external `url(...)` or `@import` resource targets, dynamic HTML injection APIs such as `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `DOMParser`, `createContextualFragment`, or `srcDoc`, `window.open`, `location.assign`, `location.replace`, or `navigator.share`, direct URL fetch targets inside governed bridge modules, hidden media capture, display capture, device enumeration, recording, browser speech/playback APIs plus bracket and call/apply aliases outside explicit visible permission handlers, and free-form bridge path resolution, so UI code cannot quietly bypass the governed bridge or start future voice/avatar capture before local controls exist. A successful governed response must include a readable contract body, the OpenAPI-required top-level response fields, matching governance, trace, and audit provenance from Napoleon, must not carry a denied or no-go governance outcome, and must not claim memory writes, approval capture, external sends, agent dispatch, or local application in explicit boundary fields or visible response text. Explicit Napoleon advisory harness `/cos/text-turn` endpoints are adapted inside the governed bridge module only: Concierge sends the harness `TextTurnRequest` shape, receives the prepare-only `TextTurnResponse` shape, maps returned governance and candidate-agent provenance into the local response model, records sanitized evidence with target path `/cos/text-turn`, rejects invented recommendation or selected-agent attribution plus text-side side-effect claims, and still treats the response as non-authorizing prepare-only output. Concierge does not synthesize missing trace or audit envelopes for a live success; unreadable live text or governed review handoff response bodies fail closed as contract mismatches with blocked-effect evidence. Live text bridge calls can emit sanitized `bridge_contract_evidence` records for runtime contract comparison. These records contain operation, request kind, transport, path, trace/request/decision/audit IDs, governance outcome, descriptor state, selected agent IDs, effects, and fail-closed reason metadata, but not raw prompt text, response text, endpoint host, or bearer tokens. The local bridge evidence comparator checks captured evidence transport, path, and request kind against the OpenAPI-aligned bridge registry and rejects raw payload or secret fields before records are treated as validation evidence. The UI can export a local bridge readiness proof containing descriptor state, checksum/signature state, descriptor-advertised governed handoff routes, advisory capability discovery state as count/ID/tier metadata, Napoleon metadata discovery state as agent/profile IDs and blocked-effect metadata, evidence capture/comparison status, last operation transport, last operation path, and last failure reason; it omits raw prompts, raw manifests, response bodies, endpoint hosts, bearer tokens, request bodies, and profile bodies, and it is not Napoleon approval. The UI can also compare the current proof with the previous proof exported in the same app session, using only sanitized descriptor, advisory capability, Napoleon metadata, and evidence fields. Early local failures preserve the relevant text-turn, memory proposal, Chief of Staff steering, or taxonomy review blocked-effect list, remote failures preserve Napoleon-supplied blocked effects plus returned decision, audit, and governance references where available, and none of these failures execute side effects, write memory, dispatch agents, send externally, append remote audit records, or capture approval.

Capability discovery also fails closed if the returned response claims approval capture, memory writes, agent dispatch, or external sends, and those response-side claims stay separate from Concierge's false local side-effect boundary fields. The advisory capabilities panel, local telemetry, and sanitized readiness proof exports show only the remote claim booleans and blocked effect names, not raw response bodies.

For explicit Napoleon advisory harness endpoints, live text sends normalize `/cos`, `/cos/descriptor`, `/cos/capabilities`, and `/cos/text-turn` to `POST /cos/text-turn`, then require a matching `GET /cos/trace/{trace_id}` proof before accepting the response as successful evidence. Generated Concierge-compatible endpoints continue to use the generated `/v1/concierge/turn` route.

Governance review submissions also re-check the review profile against the active profile and fail closed before any request fetch if the user has switched context.

The visible governed route registry includes the generated OpenAPI-required response fields for each route, including descriptor discovery, advisory capability discovery, text turns, memory proposal review, Chief of Staff steering, and taxonomy review, so contract-mismatch expectations are visible without exposing endpoint hosts, bearer tokens, prompts, request bodies, or response bodies. For descriptor discovery, advisory capability discovery, and text turns, the same route view also shows separate accepted-endpoint-form rows for the explicit `/cos`, `/cos/descriptor`, `/cos/capabilities`, and `/cos/text-turn` endpoint forms; text turns also show a required-proof row for matching `/cos/trace/{trace_id}` evidence before successful evidence is accepted.

Browser peer and transport APIs such as `RTCPeerConnection`, `webkitRTCPeerConnection`, and `WebTransport`, including bracket-style constructor aliases such as `window["RTCPeerConnection"]` and `window["WebTransport"]`, are treated as ungoverned network paths outside the bridge, so future UI features cannot open peer or session transports beside Napoleon.

Beacon sends are also blocked through direct, call/apply, and bracket-style navigator aliases, including `navigator.sendBeacon.apply(...)`, `window["navigator"]["sendBeacon"]`, and `globalThis["navigator"]["sendBeacon"]`, so UI code cannot emit one-way audit, prompt, proof, or telemetry payloads around the governed bridge.

Privileged browser device, permission, location, account, notification, push, and payment APIs, including bracket-style aliases such as `navigator["usb"]["requestDevice"]`, call/apply aliases such as `navigator.permissions.query.call(...)`, `navigator.share.apply(...)`, `navigator.serviceWorker.register.call(...)`, `Notification.requestPermission.call(...)`, `registration.pushManager.subscribe.call(...)`, `PaymentRequest.call(...)`, `navigator["geolocation"]["getCurrentPosition"]`, `globalThis["navigator"]["share"]`, `globalThis["navigator"]["serviceWorker"]["register"]`, `window["Notification"]["requestPermission"]`, and Payment Request constructor calls such as `window["PaymentRequest"] (...)`, are treated as ungoverned authority paths outside visible Concierge controls and the governed Napoleon bridge.

Dynamic HTML injection APIs, including bracket-style aliases such as `container["innerHTML"]`, `window["DOMParser"]`, `range["createContextualFragment"]`, lowercase `srcdoc`, `document.write`, `document.writeln`, and prototype call/apply aliases such as `HTMLDocument.prototype.write.call(...)` and `HTMLDocument.prototype.writeln.apply(...)`, are treated as ungoverned markup paths because they can smuggle external targets around static UI checks.

Dynamic code execution APIs, including bracket-style aliases for eval and Function calls, constructor calls with or without `new`, indirect constructor-constructor access, dot-property aliases such as `new window.Function(...)`, and string-timer aliases, are treated as hidden authority paths and are rejected from Concierge runtime source.

Direct memory and graph write aliases, including split bracket forms such as `window["write" + "Memory"]`, `globalThis["save" + "Memory"]`, and `window["graph" + "_write"]`, are rejected so memory review remains proposal-only through Napoleon instead of becoming a local write path.

Direct agent and tool dispatch aliases, including split bracket forms such as `window["dispatch" + "Agent"]`, `globalThis["call" + "Tool"]`, and `window["execute" + "Tool"]`, are rejected so Concierge cannot become a local router or tool runner beside Napoleon.

JavaScript runtime process APIs such as `execFile`, `execFileSync`, `execSync`, `spawnSync`, `Deno.Command`, `Bun.spawn`, `Bun.spawnSync`, and bracket-style aliases such as `childProcess["execFile"]`, `globalThis["Deno"]["Command"]`, and `window["Bun"]["spawnSync"]` are treated as direct command execution and rejected from Concierge runtime source.

Browser persistence and context-state APIs, including IndexedDB, Cache Storage, call/apply aliases such as `indexedDB.open.call(...)`, bracketed persistence call/apply aliases such as `globalThis["indexedDB"]["open"].call(...)` and `window["caches"]["put"].apply(...)`, cookie writes such as `document["cookie"] = ...`, `localStorage`/`sessionStorage` method reads, method writes, method call/apply aliases such as `localStorage.setItem.call(...)`, bracketed storage call/apply aliases such as `globalThis["localStorage"]["setItem"].call(...)` and `window["sessionStorage"]["clear"].apply(...)`, mixed bracket/dot storage aliases such as `window["localStorage"].setItem(...)` and `window["localStorage"].setItem.call(...)`, property assignments, method removals, property deletions, and clears outside bounded connection settings, local settings, telemetry, and capability metadata modules, including inside governed bridge modules, `history.pushState`/`history.replaceState`, history call/apply aliases such as `history.pushState.call(...)`, bracketed history call/apply aliases such as `window["history"]["pushState"].call(...)`, mixed bracket/dot history aliases such as `window["history"].pushState(...)`, `window.name`, and bracket-style aliases, are treated as ungoverned retention paths outside the explicit bounded local metadata stores. Bounded storage modules may read, write, or remove only approved endpoint, token, privacy-toggle, telemetry-buffer, capability-ledger, and taxonomy keys, including when those keys are routed through simple local constants, so new raw prompt, proof, transcript, descriptor, or token caches cannot be added silently.

The same repository validation treats lowercase and SVG target spellings such as `srcset`, `formaction`, and `xlink:href` as external browser targets, including bracket assignment and `setAttribute` forms, so alternate markup spellings cannot bypass the governed bridge boundary.

Image preload source-set targets such as `imageSrcSet` and `imagesrcset` are treated as external resource targets in static markup, property assignment, bracket assignment, and `setAttribute` forms, so responsive preload candidates cannot fetch images outside the governed bridge.

Object and embed `data` targets are treated as external load targets only in object/embed element contexts, including static markup, property assignment, bracket assignment, and `setAttribute` forms, so plugin-style content cannot create another outside channel while ordinary application data fields remain usable.

Direct assignment to `location`, `window.location`, `document.location`, `globalThis.location`, or bracket-style `window["location"]` aliases is treated as browser navigation outside the governed bridge, including variable-based targets, matching the existing checks for `location.href`, `location.assign`, `location.replace`, and bracketed `location["href"]`, `location["assign"]`, or `location["replace"]` aliases.

Programmatic form submission APIs such as `form.submit()`, `form.requestSubmit()`, `document.forms[0].submit()`, bracket-style submission aliases, and prototype call/apply aliases such as `HTMLFormElement.prototype.submit.call(...)` and `HTMLFormElement.prototype.requestSubmit.apply(...)` are treated as external-send side channels outside the governed bridge, even when a form target is assembled dynamically.

Programmatic DOM clicks such as `anchor.click()`, `downloadLink.click()`, `button.click()`, bracket-style `click` aliases, and anchor/button prototype call/apply aliases such as `HTMLAnchorElement.prototype.click.call(...)` and `HTMLButtonElement.prototype.click.apply(...)` are treated as navigation or form side channels outside the governed bridge.

Browser cross-context messaging such as `postMessage`, `BroadcastChannel`, `MessageChannel`, postMessage call/apply aliases such as `window.postMessage.call(...)`, and constructor call/apply aliases such as `BroadcastChannel.call(...)` and `window.MessageChannel.apply(...)` is treated as a side channel so UI code cannot relay local prompts, responses, tokens, or proof metadata to another browser context outside governed visible flows.

Direct browser clipboard reads, writes, mixed dot/bracket clipboard aliases, call/apply aliases such as `navigator.clipboard.writeText.call(...)`, and legacy copy/paste commands are treated as local data side channels so UI code cannot move prompts, responses, tokens, or proof metadata outside governed visible export flows.

Browser file picker APIs including call/apply aliases such as `window.showOpenFilePicker.call(...)` and `globalThis.showDirectoryPicker.apply(...)`, FileReader constructors including bracket-style aliases such as `window["FileReader"] (...)`, and FileReader `readAs...` methods including call/apply aliases such as `reader.readAsText.call(...)` are treated as local data side channels so UI code cannot read, write, or export local files outside governed visible import/export flows.

WebAssembly compilation/instantiation, including `Module` and `Instance` constructors and bracket-style aliases, plus object URL creation aliases such as `URL["createObjectURL"] (...)` and `URL.createObjectURL.call(...)` are treated as local executable side channels so UI code cannot introduce hidden runtime behavior outside governed visible flows.

Descriptor discovery is treated as connection state, not authority. Text Concierge shows endpoint presence, descriptor discovery, validation, checksum state, signature state, runtime authority, cache policy, and advertised handoff routes before live sends. Live discovery preserves explicit `supportedHandoffs` / `supported_handoffs` values from the returned descriptor, so a route-incomplete descriptor remains blocked instead of inheriting Concierge's built-in defaults; explicit handoff lists with unknown route names fail closed as invalid descriptors instead of being silently filtered. It also summarizes live bridge readiness from endpoint state, descriptor integrity, in-session sanitized bridge evidence capture/comparison status, runtime-validation source, promotion gate, last live-send status and fail-closed reason, and blocked effects, while explicitly stating that readiness is not Napoleon approval and does not grant memory writes, agent dispatch, approval capture, or external sends. Local harness validation, local simulation validation, and missing runtime-validation source remain warning states and promotion-blocked until real Napoleon runtime validation is explicitly proven; sanitized readiness proof exports use the same rule and preserve missing runtime source as unavailable rather than real runtime evidence. The composer includes a live-send preflight checklist for text readiness, endpoint configuration, descriptor discovery, descriptor integrity, descriptor-advertised `text_turn` route, local governance send gate, allowed effects, blocked effects, Rehearsal Mode state, runtime-validation source, evidence capture/comparison, and promotion-gate warnings; each checklist row renders its `ready`, `warning`, or `blocked` status as readable text, and the checklist is local display state only and does not approve or send. When Rehearsal Mode is off and a direct send is blocked by a preflight item that is not already represented by the disabled local-governance send state, the composer action area repeats the first blocked preflight reason before the guarded submit attempt. Descriptor auth failure, timeout, HTTP failure, and missing `text_turn` route are shown as blocked rows with the specific fail-closed reason instead of being hidden behind a generic blocked summary. Local governance blocks show the returned outcome such as `no_go` in the governance send gate row, and the allowed-effects row switches to `none`, so a non-executable decision is visible before any send attempt. While Rehearsal Mode is active, the checklist remains a warning state and must not report direct live-send readiness, even if endpoint, descriptor, text, and governance checks otherwise pass. Enabling Rehearsal Mode also clears captured bridge evidence readiness and rendered readiness proof exports so live validation cannot linger in local-only preview mode. Active profile changes also clear captured bridge evidence readiness and rendered readiness proof exports so adult-owner, guest, collaborator, and child-protected validation state is not mixed. Memory proposal review, Chief of Staff steering, and Chief of Staff taxonomy review panels also show governed handoff readiness from draft, endpoint, descriptor preflight, descriptor-advertised handoff route, Rehearsal Mode state, and blocked-effect state before enabling submission; existing Chief of Staff steering drafts re-evaluate against current connection readiness, so an endpoint configured after drafting can enable the same draft only when the descriptor advertises the required route, without treating the earlier local draft state as authority. Those summaries are local display only and are not Napoleon approval or permission to apply changes. The submit helpers also fail closed when Rehearsal Mode is active, or when the descriptor is ready for text turns but does not advertise the required review or handoff route, so direct handoff paths cannot reach Napoleon while Concierge is rehearsing locally or while Napoleon exposes only text-turn capability. Captured evidence is compared locally against the named bridge operation registry for canonical transport, path, and request kind and rejected if it contains raw or secret fields before the readiness panel marks evidence comparison as passed. Explicit `/cos/text-turn` advisory harness app sends and evidence capture also fetch `/cos/trace/{trace_id}` after a successful text turn and store only whether the observability envelope was observed and matched the returned text-turn trace; readiness comparison rejects successful `/cos/text-turn` evidence without that matching trace metadata; it does not retain the trace body, endpoint host, request body, response body, token, or raw prompt. The local UI can simulate discovered, missing, and checksum/signature mismatch states, and it can explicitly fetch `/v1/concierge/chief-of-staff/descriptor` from generated bridge endpoints or `/cos/descriptor` from explicit Napoleon advisory harness endpoints. Descriptor discovery clears captured bridge evidence readiness plus rendered readiness proof exports and comparison state so pre-discovery evidence is not left visible or reusable after the connection state changes. Advisory capability discovery clears rendered readiness proof exports and comparison state so capability metadata in local proofs is regenerated from the latest discovery result. Descriptor discovery preserves fail-closed auth failure, timeout, unreadable descriptor response body, and HTTP failure states instead of flattening them into a generic missing descriptor, and the OpenAPI descriptor connection schema names those same states for text turns, memory proposal review, Chief of Staff steering, and taxonomy review handoffs. Subsequent text, memory proposal, Chief of Staff steering, and taxonomy review handoff preflights surface those same blocked reasons before fetch. Active profile and connection-boundary changes clear visible bridge failure banners with proof, delegation, and handoff state so a blocked live-send result is not reused across child, guest, collaborator, or owner contexts. A fetched descriptor is still only a preflight connection signal; invalid, missing, failed, mismatched, or route-incomplete discovery keeps affected live sends blocked. Endpoint, bearer-token, and descriptor-mode changes invalidate fetched descriptor state and reset captured bridge evidence readiness until discovery and a fresh governed bridge attempt succeed again. Text turns must receive discovered descriptor state with an advertised `text_turn` route before they can attempt a live request; Chief of Staff steering handoff, taxonomy review handoff, and memory proposal handoff must receive discovered descriptor state with their required handoff route before they can attempt a live request. All of these paths must fail closed instead of substituting Concierge's built-in descriptor.

Concierge renders a separate Napoleon delegation panel even before delegation provenance is returned. In the empty state, target capability, provenance source, selected agents, why selected, allowed effects, blocked effects, governance state, trace ID, and audit ID are shown as `not returned`, so Concierge does not silently imply a capability or agent handled the response. When Napoleon returns delegation provenance, the same panel fills in the returned target capability when present, provenance source, selected agents, selection reasons, allowed effects, blocked effects, governance state, trace ID, and audit ID. If Napoleon returns a `targetAgent` capability ID without selected-agent delegation, the delegation panel shows the returned target capability, marks the provenance source as target-capability-only, and still marks selected agents, why selected, and detailed delegation fields as `not returned`. Each successful Napoleon transcript response also shows its source as the governed bridge, its attribution boundary as returned bridge provenance only, the returned target capability when present, and the response blocked effects. Fail-closed Napoleon bridge attempts also annotate the assistant failure message with a blocked bridge source, a boundary that no Napoleon response was accepted, the active profile mode, and blocked effects when available. After a successful live text turn, Concierge also renders a last successful Napoleon proof panel from returned bridge metadata: governance outcome, profile mode, decision ID, response trace, audit ID, attribution boundary, returned target capability, selected-agent provenance, selected-agent selection reasons, allowed effects, and blocked effects. Returned delegation that marks forbidden authority effects such as `agent_dispatch` as allowed, or advisory harness candidate agents as runtime-invoked, is rejected as a contract mismatch before it can be displayed as provenance. Visible delegation, proof, successful and fail-closed transcript metadata, governed review responses, fail-closed bridge, and governed handoff rows also redact unsafe returned provenance values, including endpoint-like strings, loopback hosts, bearer credentials, authorization text, token-like values, and secret-like values, before rendering while preserving safe governance, effect, and provenance labels. If Napoleon returns a `targetAgent` capability ID without selected-agent delegation, the proof panel and sanitized proof export preserve that returned capability as target capability, not as selected-agent provenance. The proof panel and sanitized proof export both include an explicit attribution boundary derived only from returned target capability or selected-agent provenance. The sanitized proof export also includes selected-agent selection reasons and an explicit handled-by field. This panel is display-only provenance; it is not approval, memory permission, agent dispatch permission, or external-send permission. Concierge can export the proof as sanitized local metadata and compare it with the previous proof exported in the same app session using returned metadata only, including profile mode, handled-by provenance, attribution boundary, and selected-agent selection reasons; comparison does not create Napoleon audit evidence or authority. Changing the active user profile, bridge endpoint, bearer token, descriptor mode, discovered descriptor connection state, or enabling Rehearsal Mode clears the rendered proof and delegation presentation so returned evidence from one profile, connection, or live/local mode context is not reused for another. Those changes also clear local governance and memory review drafts plus governed handoff result panels, so proposal-only review controls cannot reuse adult, guest, collaborator, child-protected, connection, descriptor, or live/local context after the user switches state. Active user profile changes additionally clear local Chief of Staff steering and taxonomy review drafts because those drafts carry profile-scoped capability evidence and review wording; endpoint, bearer-token, descriptor, and Rehearsal Mode changes clear local Chief of Staff taxonomy review drafts so taxonomy packets cannot be reused across stale handoff context. Concierge only attributes statements such as "Passive Brain found..." when the bridge response contains that contribution and the delegation trace/audit IDs match the response envelopes. Concierge only relays statements such as "Napoleon recommends..." when matching recommendation provenance includes the recommended contribution and trace/audit IDs that match the response envelopes. If live response text claims a selected-agent finding or Napoleon recommendation without matching provenance, the bridge fails closed as a contract mismatch. Missing or mismatched provenance is rejected rather than invented. Live text responses must keep the returned profile mode aligned with the active Concierge user profile; child protected, guest, and collaborator turns cannot be widened into adult owner or owner-only scope by response text or metadata.

Reusable local bridge fixtures live in `app/src/napoleonBridgeFixtures.ts`. They cover delegated success, auth failure, contract mismatch, and timeout behavior so bridge handling can be tested without a live Napoleon endpoint while preserving the same fail-closed semantics. Canonical request artifacts live in `examples/sample_memory_proposal_request.json`, `examples/sample_child_memory_proposal_request.json`, `examples/sample_chief_of_staff_steering_request.json`, `examples/sample_child_chief_of_staff_steering_request.json`, `examples/sample_governance_review_request.json`, `examples/sample_chief_of_staff_taxonomy_review_request.json`, and `examples/sample_child_chief_of_staff_taxonomy_review_request.json`; repository validation checks them against the OpenAPI request schemas and verifies that the handoff boundary remains proposal-only, including nested fields that might otherwise imply approval, memory writes, agent dispatch, external sends, or local application. The child memory proposal artifact must remain in child protected mode and require guardian review. The child Chief of Staff steering artifact must remain in child protected mode and include explicit child-safety caution on the recommendation. The governance review artifact must use the canonical `chief_of_staff_steering_handoff` request kind, explicit `governance_review_handoff` payload marker, and child-protected guardian review wording without local approval capture. Taxonomy review artifacts use the canonical `chief_of_staff_steering_handoff` request kind with a taxonomy review payload rather than a separate free-form bridge request kind. The canonical descriptor response artifact lives in `examples/sample_chief_of_staff_descriptor_response.json`; repository validation checks it against the OpenAPI response schema and verifies contract-only, fail-closed descriptor boundaries before descriptor discovery can be treated as local contract evidence. Canonical governed response artifacts live in `examples/sample_text_turn_response.json`, `examples/sample_child_text_turn_response.json`, `examples/sample_memory_proposal_response.json`, `examples/sample_child_memory_proposal_response.json`, `examples/sample_chief_of_staff_steering_response.json`, `examples/sample_child_chief_of_staff_steering_response.json`, `examples/sample_governance_review_response.json`, `examples/sample_chief_of_staff_taxonomy_review_response.json`, and `examples/sample_child_chief_of_staff_taxonomy_review_response.json`; repository validation checks them against the OpenAPI response schemas, verifies that governance, trace, audit, delegation, and recommendation references agree, and rejects response-side claims that memory was written, approval was captured, agents were dispatched, external sends occurred, or proposals were applied locally before the artifacts can be treated as local contract evidence. Repository validation also compares every `examples/sample*_request.json` and `examples/sample*_response.json` file with the registered OpenAPI example inventory, so adding a governed sample without registering it fails validation. The child text response artifact must remain review-gated, preserve guardian review wording, child profile evidence, blocked secret-keeping, and explicit false side-effect fields. The child memory response artifact must remain review-only, preserve guardian review wording, preserve child profile and proposal evidence, keep secret-keeping blocked, and keep memory write, approval capture, agent dispatch, external send, and local application fields false. The child Chief of Staff steering response artifact must remain review-only, preserve guardian review wording, child profile evidence, child capability evidence, blocked secret-keeping, and no local application. The governance review response artifact must remain review-only, preserve child-protected guardian review wording, and keep memory write, approval capture, agent dispatch, external send, and local application fields explicitly false. Taxonomy review response artifacts must remain review-only, preserve capability taxonomy evidence, and keep local taxonomy application plus all side-effect fields explicitly false; the child-protected taxonomy response artifact must also preserve guardian review wording and child profile evidence. A local HTTP bridge harness lives in `scripts/local_bridge_harness.py`; it serves Napoleon-compatible descriptor, text turn, steering, memory proposal, and evaluator endpoints for smoke validation, including deterministic text-turn, Chief of Staff steering, and memory proposal review responses that claim forbidden side effects so local checks can prove Concierge rejects them. The harness is not a substitute for a real Napoleon runtime. `make eval-http-local-harness` runs the evaluator in HTTP mode against that local harness to verify transport plumbing while preserving the separate requirement for real Napoleon endpoint validation. Evaluator HTTP mode uses the named evaluator review target: generated Concierge-compatible endpoints and the local harness use `/v1/concierge/evaluate`, while Napoleon root or explicit evaluation review endpoints use `/chief-of-staff/reviews/evaluation`. Text Concierge settings include a local harness endpoint preset for `http://127.0.0.1:8787`; selecting it only configures the governed endpoint and descriptor preflight, and does not start, stop, or control the harness process or grant authority.

The adult and child Chief of Staff steering request artifacts must also carry schema-shaped metadata-only learning signals that match the selected capability, request trace, active profile, child minimization rules where applicable, and proposal-only governance boundary.

The local bridge harness includes browser CORS preflight headers so the rendered Text Concierge shell can exercise the local endpoint preset during manual validation. This does not make the harness a real Napoleon runtime, does not grant authority, and does not change the governed bridge contract.

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

Conversation Capability Intelligence records derived metadata about conversation capability performance. It is local-first and proposal-only. It can explain common conversations, working capabilities, missing capabilities, architecture blockers, and recommended next capabilities, but it cannot implement changes, grant approval, write memory, dispatch agents, or send externally. Capability answers and Chief of Staff steering drafts filter source evidence to the active profile before aggregation or recommendation, so child-protected, guest, collaborator, and owner evidence is not mixed across contexts.

Chief of Staff steering converts the highest-ranked local capability recommendation into a proposal-only review packet with an evaluator case candidate and evolution proposal draft. The evolution proposal evidence is selected from the same missing or degraded recommendation bucket that produced the recommendation, so correctly blocked unsafe traces are not attached just because they share a capability label. The packet remains local unless a governed Napoleon endpoint is configured, descriptor preflight passes, and Rehearsal Mode is off. The UI shows handoff readiness for draft, endpoint, descriptor preflight, Rehearsal Mode state, and blocked effects before the submit control is enabled. Clearing the local capability ledger clears derived steering drafts, review responses, and failure states so stale local evidence cannot be submitted. When submitted, Concierge sends an `evolution_proposal_review` request through a named governed bridge target and requires Napoleon governance, trace, audit, and generated required response fields before displaying the review response. Generated Concierge-compatible endpoints and the local harness use `/v1/concierge/chief-of-staff/steering`; Napoleon root endpoints or explicit evolution review endpoints use `/chief-of-staff/reviews/evolution-proposals`. Child-protected submissions add explicit child-safety caution, child-protected profile scope, and guardian/owner review wording to the packet before it leaves Concierge. Remote `deny` or `no_go` outcomes are blocked handoff failures, not successful reviews, and any review response that omits required top-level fields or claims local application, memory writes, approval capture, agent dispatch, or external sends fails closed as a contract mismatch. Submission does not apply changes locally, write memory, dispatch agents, send externally, or capture approval.

Explicit evolution proposal submission follows a separate governed bridge target for Napoleon's `/evolution/proposals` contract path with the `evolution_proposal_submission_handoff` request kind. It packages proposal evidence for Napoleon review only; Concierge must not apply evolution changes, update registries, append traces, route tasks, capture approval, write memory, dispatch agents, send externally, or treat a response as local authority.

Explicit observability trace handoff follows a separate governed bridge target for Napoleon's `/observability/traces` contract path with the `observability_trace_handoff` request kind. It packages trace evidence for Napoleon review only; Concierge must not append Napoleon traces, create audit authority, route tasks, capture approval, write memory, dispatch agents, send externally, apply changes, or treat a response as local authority.

Chief of Staff taxonomy review uses the same governed handoff boundary for local capability taxonomy cleanup packets. Concierge can draft merge, split, and deprecation review recommendations from local metadata, then send the packet through the named evolution proposal review target only after endpoint and descriptor preflight pass and Rehearsal Mode is off. The UI shows the same handoff readiness summary before submission and keeps the submit control disabled while the draft, endpoint, descriptor preflight, or Rehearsal Mode state is blocked. Clearing the local capability ledger or changing local taxonomy edits clears taxonomy review drafts, review responses, and failure states so stale taxonomy evidence cannot be submitted. The request uses `chief_of_staff_steering_handoff` on generated endpoints and `evolution_proposal_review_handoff` on explicit Napoleon review endpoints, carries taxonomy review details as payload, and remains an `evolution_proposal_review` packet with evaluator-case and evolution-proposal details. Child-protected taxonomy review handoffs preserve child profile scope and require guardian/owner review wording before they leave Concierge. Submission re-checks the draft affected profiles against the active profile and fails closed before any request if the user has switched context. Napoleon must return matching governance, trace, audit, and generated required response fields before Concierge displays the review response. Any response that omits required top-level fields or claims local taxonomy application, memory writes, approval capture, agent dispatch, external sends, or local application fails closed as a contract mismatch. Submission never applies taxonomy edits locally or changes Napoleon policy/routing.

Post-preview advisory sending follows the same Rehearsal Mode boundary. A local text preview can remain visible while Rehearsal Mode is active, and the unchanged preview remains available after the user turns Rehearsal Mode off. The rendered advisory-send control stays disabled while Rehearsal Mode is active and only enables after Rehearsal Mode is off, the prompt still matches the preview, the preview governance review allows an advisory send, and descriptor preflight still shows the governed bridge is ready. Stale descriptor discovery cache is treated as a descriptor mismatch and blocks the live send before request fetch, so preview creation cannot unlock a live Napoleon bridge call by itself.

Chief of Staff request handoff follows the governed bridge boundary for Napoleon request packets. The named target is `/chief-of-staff/requests` with the `chief_of_staff_request_handoff` request kind. It submits a request for Napoleon review only; Concierge must not treat the request as task routing, registry mutation, trace append, approval capture, memory write, agent dispatch, external send, or local application.

Governance evaluation handoff follows the governed bridge boundary for Napoleon governance checks. The named target is `/governance/evaluate` with the `governance_evaluation_handoff` request kind. A returned governance decision can inform the visible handoff state, but Concierge must not treat it as local approval capture or permission to route tasks, write memory, dispatch agents, send externally, append traces, update registries, or apply changes.

Governance review handoff follows a named governed bridge boundary for live review packets. Concierge can display a local governance review state and local acknowledgement, but live submission is enabled only when a Napoleon endpoint is configured, descriptor preflight passes, and Rehearsal Mode is off. Generated Concierge-compatible endpoints and the local harness use the canonical `/v1/concierge/chief-of-staff/steering` route with the `chief_of_staff_steering_handoff` request kind and a `governance_review_handoff` payload marker. Napoleon root endpoints or explicit review endpoints use `/chief-of-staff/reviews/governance` with the `governance_review_handoff` request kind. Both routes carry the same `governance_review` Chief of Staff request type, original decision, trace, audit, profile, approval requirement, blocked effects, and proposal-only boundary. Child-protected handoffs preserve child profile scope and require guardian/owner review wording. Submission re-checks the review profile against the active profile and fails closed before any request if the user has switched context. Remote `deny` or `no_go` blocks the handoff, and any response that omits generated required top-level fields or claims local approval capture, memory writes, agent dispatch, external sends, or local application fails closed as a contract mismatch. Submission never grants approval or performs side effects from Concierge.

New agent proposal review uses a separate named Napoleon review target, `/chief-of-staff/reviews/new-agent-proposals`, with the `new_agent_proposal_review_handoff` request kind. This mapping is review-only: Concierge may package a proposal for Napoleon review, but it must not activate an agent, write to the registry, dispatch an agent, capture approval, write memory, send externally, or apply local changes.

Memory proposal handoff follows the same governed bridge pattern. Concierge may submit a live memory proposal review packet only after endpoint and descriptor preflight pass and Rehearsal Mode is off. The UI shows handoff readiness for the proposal draft, endpoint, descriptor preflight, Rehearsal Mode state, and blocked effects before enabling review submission. The packet contains the proposed memory diff, profile, guardian-review need, blocked effects, trace/audit references, and a proposal-only boundary. Submission re-checks the proposal profile against the active profile and fails closed before any request if the user has switched context. Napoleon must return matching governance, trace, audit, and generated required response fields before Concierge displays the review response. Governed review response panels for memory proposal, governance review, Chief of Staff steering, and Chief of Staff taxonomy review show returned governance, decision, authority tier, approval requirement, rationale, trace, audit, blocked effects, and explicit false local side-effect state. Remote `deny` or `no_go` outcomes are blocked handoff failures, not successful reviews, and any review response that omits required top-level fields or claims memory writes, approval capture, external sends, agent dispatch, or local application fails closed as a contract mismatch. The handoff is not available from Rehearsal Mode, and it never writes memory, captures approval, dispatches agents, or sends externally from Concierge.

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
- Stores emitted local telemetry in a bounded browser-local buffer with sensitive attribute redaction; ordinary buffering follows the local telemetry setting, while camera, microphone, and privacy-setting audit events remain locally buffered for consent traceability without becoming Napoleon audit records or approval. Shows the local buffer count, last event, and latest real interaction trace availability; supports a local latest-event retention limit; clears rendered buffer and trace exports when retention changes; exports recursively redacted local JSON metadata so nested unsafe strings inside arrays or objects cannot carry endpoints, loopback hosts, bearer credentials, authorization text, tokens, or secrets; exports the latest interaction trace as sanitized local metadata only when a real turn trace is available, including sanitized Napoleon request, decision, audit, governance, failure-event-scoped failure, and consistently redacted blocked-effect references; and clears the browser-local buffer without contacting Napoleon or sending externally.
- Shows voice readiness as local preflight state; explicit microphone permission can be requested, but any permission stream is stopped immediately until voice mode exists. Missing real Napoleon runtime proof remains a live voice blocker, and child-protected readiness visibly blocks guardian approval capture.
- Shows a local Media Session Controller that centralizes microphone, camera, and playback state as visible preflight only; child protected mode keeps these surfaces blocked behind guardian-review wording, and the controller does not start capture, playback, raw media storage, Napoleon contact, memory writes, approval capture, agent dispatch, or external sends.
- Shows a local voice activity detection sample that exercises segment detection from amplitude frames without starting microphone capture or storing raw audio.
- Shows a local speech transcription sample that exercises transcript metadata from fixed local sample tokens without starting microphone capture or storing raw audio.
- Shows a local text-to-speech sample that exercises speech-preparation metadata from fixed local sample text without starting audio playback or storing raw audio.
- Shows a local voice-turn rehearsal that chains VAD, STT, an explicit text authority boundary, and TTS metadata without starting capture, playback, storage, or Napoleon contact.
- Shows a local barge-in rehearsal that marks planned sample speech as interrupted and prepares next-turn state without starting capture, playback, storage, or Napoleon contact.
- Shows local voice response shaping that shortens long bridge-provenance text for future speech without inventing Napoleon or delegated-agent attribution and without starting capture, playback, storage, or Napoleon contact; the built-in local sample emits no bridge provenance and does not say "Napoleon says"; when bridge provenance is absent, unproven Napoleon recommendation and delegated-agent finding claims are removed from the spoken summary; child protected mode applies shorter speech, slower pacing metadata, guardian-review reminders, and governed voice pipeline proof metadata that also blocks guardian approval capture. Shortened-state metadata is computed from the spoken body before provenance prefixes or guardian-review reminders are added, so safety wording cannot hide that returned content was shortened.
- Shows local neutral avatar state from local preview text, or from returned text provenance only when bridge proof exists, plus stance and active profile without starting camera capture, face detection, affect inference, animation, storage, Napoleon contact, or side effects; child protected mode disables avatar camera and affect paths until guardian review and never treats avatar state as approval.
- Shows local stance-to-expression metadata mapping without starting avatar animation, inferring emotion, reading camera signals, contacting Napoleon, or granting approval; the built-in sample emits no bridge provenance unless a real bridge-derived input supplies it; child protected mode keeps expression animation blocked until guardian review.
- Shows local avatar lip-sync metadata from generated amplitude frames without starting audio playback, microphone capture, raw audio storage, avatar animation, camera capture, perception, Napoleon contact, approval capture, memory writes, agent dispatch, or external sends; child protected mode keeps lip-sync animation blocked until guardian review.
- Shows local avatar gaze simulation from user-position and window-focus metadata without starting gaze tracking, avatar animation, camera capture, perception, Napoleon contact, approval capture, memory writes, agent dispatch, or external sends; child protected mode keeps gaze animation and camera tracking blocked until guardian review.
- Shows local avatar face and head-pose sample metadata with face-present, yaw, pitch, roll, and confidence fields without requesting camera permission, starting capture, storing raw video, running live face detection, inferring affect or attention, starting animation, contacting Napoleon, or performing side effects; child protected mode keeps camera, face, head-pose, and affect paths blocked until guardian review.
- Shows local avatar affect-fusion uncertainty metadata from deterministic head-pose, voice-pause, and text-clarification samples without claiming emotion as fact, requesting camera or microphone permission, starting capture, storing raw audio/video, running live face detection or affect models, inferring attention, animating the avatar, contacting Napoleon, approval capture, memory writes, agent dispatch, or external sends; child protected mode keeps affect fusion blocked until guardian review and exposes explicit camera, microphone, storage, affect, and emotion-fact policy metadata.
- Shows a local avatar privacy dashboard for camera, microphone, avatar affect, raw media storage, and telemetry preferences without requesting permissions, starting capture, storing raw media, running live affect models, contacting Napoleon, writing memory, capturing approval, dispatching agents, or sending externally; child protected mode marks avatar camera, microphone, affect, storage, and animation features as guardian-review-required.
- Shows local avatar gaze and face/head-pose policy metadata so child protected mode visibly marks camera, animation, face-pose, affect, and attention paths as disabled or guardian-review-gated before any live perception or renderer pipeline exists.
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
