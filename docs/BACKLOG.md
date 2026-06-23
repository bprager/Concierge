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
| EV-008 | Keep evaluator coverage evidence synchronized | P1 | Repository validation checks documented current evaluator scenario counts in canonical docs, reports, and handoff status against `evaluator/scenarios.yaml`, so readiness evidence cannot drift from the actual suite size | schema_validation_completed |
| EV-008 | Add human review template | P1 | `make eval-human-review` creates a local review record where a reviewer can approve, reject, or request revision while preserving that the record is not Napoleon approval, not release approval by itself, and not authority to apply changes | eval_review_recorded |
| EV-009 | Add evaluator report dashboard placeholder | P2 | `make eval-summary` generates a local Markdown evaluator summary with run status, gate counts, dimension scores, case summary, recommendations, and non-authority boundary without copying raw prompt or response text | eval_report_rendered |

### EV-002 details

User value: A broader evaluator catches governance, privacy, memory, and contract drift before Concierge depends on a live Napoleon runtime.

Acceptance criteria:

- The evaluator suite has at least 15 scenarios.
- Scenarios cover adult, child protected, guest/collaborator, adversarial, self-evolution, memory proposal review, bridge failure handling, privacy settings controls, contract mismatch fail-closed behavior, descriptor connection state, bridge-client contract alignment, bridge delegation provenance, bridge response authority provenance, child protected bridge response semantics, governed review response semantics, profile-scope drift, live-runtime artifact semantics, real-runtime promotion boundaries, voice pipeline proof export/comparison, media session controller boundaries, local avatar readiness/privacy boundaries, conversation capability intelligence, steering recommendation type summaries, stale steering draft profile mismatches, stale steering draft exports, and stale taxonomy review artifacts.
- Coverage tests verify the required scenario IDs and artifact checks.

Privacy and safety impact:

- New scenarios keep Concierge as a review and presentation surface.
- Memory writes, approval capture, external sends, side effects, and agent dispatch remain blocked unless Napoleon governance explicitly authorizes them.

Evaluator coverage:

- Covered by `MEMORY-PROPOSAL-001`, `BRIDGE-FAILURE-001`, `PRIVACY-SETTINGS-001`, `CONTRACT-MISMATCH-001`, `DESCRIPTOR-CONNECTION-STATE-001`, `BRIDGE-CLIENT-CONTRACT-001`, `BRIDGE-FIXTURE-DELEGATION-001`, `DELEGATION-PANEL-STATE-001`, `BRIDGE-RESPONSE-PROVENANCE-001`, `CHILD-BRIDGE-RESPONSE-SEMANTICS-001`, `GOVERNED-REVIEW-RESPONSE-SEMANTICS-001`, `PROFILE-SCOPE-DRIFT-001`, `LIVE-RUNTIME-ARTIFACT-SEMANTICS-001`, `REAL-RUNTIME-PROMOTION-BOUNDARY-001`, `VOICE-PIPELINE-PROOF-001`, `MEDIA-SESSION-CONTROLLER-001`, `AVATAR-LOCAL-BOUNDARY-001`, `CAPABILITY-INTELLIGENCE-001`, `CAPABILITY-INTELLIGENCE-STEERING-TYPES-001`, `CHIEF-OF-STAFF-STEERING-PROFILE-MISMATCH-001`, `CHIEF-OF-STAFF-STEERING-EXPORT-STALE-001`, and `CHIEF-OF-STAFF-TAXONOMY-REVIEW-STALE-001`.

## Milestone P1: Text Concierge MVP

| ID | Story | Priority | Acceptance criteria | Observability |
|---|---|---:|---|---|
| TX-001 | Create desktop shell skeleton | P0 | Tauri app opens text interface | app_started, app_ready |
| TX-002 | Add Napoleon bridge client | P0 | Text requests can be sent to configured Napoleon endpoint | bridge_request_started, bridge_request_completed |
| TX-003 | Add user profile resolver | P0 | Adult owner, child protected, guest, and collaborator supported in the text UI and contract mapping | identity_resolved |
| TX-004 | Add interaction stance policy | P0 | Concierge selects stance and logs reason | stance_selected |
| TX-005 | Add governance confirmation UI | P0 | Side effects require visible confirmation; requires_review, deny, and no_go are visible; non-authority local acknowledgement and governed review handoff cannot be mistaken for approval | governance_decision, governance_review_send_started |
| TX-006 | Add text conversation trace | P0 | Every turn has trace_id and turn_id; governed live text sends emit metadata-only identity, intent, stance, governance, context, and delegation trace events before the bridge request without raw prompt text, endpoint hosts, bearer tokens, request bodies, or response bodies | user_message_received, identity_resolved, intent_detected, stance_selected, governance_decision, context_requested, delegation_requested, response_generated |
| TX-007 | Add child profile response rules | P0 | Child mode uses simple language and restricted authority; child-protected governed text sends emit metadata-only policy flags for guardian review, no secret-keeping, and blocked memory writes, approval capture, external sends, and agent dispatch | child_policy_applied |
| TX-008 | Add memory update suggestion flow | P1 | Preferences are proposed, shown for review, and can be submitted for governed Napoleon review without silently storing or writing directly | memory_update_proposed, memory_proposal_send_started |
| TX-009 | Add local settings and privacy panel | P1 | User can configure endpoint, optional local bridge token, telemetry, profile, camera, mic | settings_changed |
| TX-010 | Add evaluator fixtures for text UI | P1 | Text mode can be smoke tested | text_smoke_eval_completed |
| TX-011 | Add Rehearsal Mode for governed turns | P0 | User can preview understood request, proposed Napoleon path, CoS review packet, allowed effects, blocked effects, approval state, memory proposal, trace/audit preview, and evaluator-case candidate before any live bridge call | rehearsal_preview_created |
| TX-012 | Add capability intelligence query surface | P1 | Local query surface answers common, working-well, missing/blocked, easy-to-evolve, architecture-area, recommended-next, and steering recommendation type questions from bounded local aggregates | capability_intelligence_answered |
| TX-013 | Add live bridge fail-closed connection states and delegation panel | P0 | Missing endpoint, descriptor mismatch, auth failure, contract mismatch, no-go, timeout, and HTTP failure are blocked visibly; live bridge readiness and composer preflight summarize endpoint, descriptor integrity, governed routes, local governance send gate, rehearsal state, evidence capture/comparison state, runtime-validation source, promotion gate, and blocked effects without implying approval; live descriptor discovery alone is not real runtime validation and stays promotion-blocked until non-local evidence capture and comparison both pass; advisory Chief of Staff capability discovery is explicit, descriptor-gated, metadata-only, non-authorizing, and included in sanitized readiness proof exports as count/ID/tier metadata only; Napoleon agent and profile metadata discovery uses named `/agents`, `/agents/{agent_id}`, and `/profiles/{profile_id}` targets only and is visible in the connection area and sanitized readiness proof exports as agent/profile ID metadata, with no agent dispatch, registry update, memory write, approval capture, external send, or authority grant; pasted known operation URLs are normalized to canonical governed paths without carrying query strings or fragments into the next request; memory proposal, Chief of Staff steering, and taxonomy review handoffs show draft, endpoint, descriptor, and blocked-effect readiness before submission; sanitized local readiness proof export and in-session comparison exclude raw prompts, raw manifests, profile bodies, endpoints, and secrets while marking local harness or simulation validation separately from real Napoleon runtime validation; the Napoleon delegation panel stays visible before provenance is returned, with target capability, provenance source, selected agents, why selected, effects, governance, trace, and audit marked not returned; bridge-provided selected agents, target capabilities, reasons, effects, governance, trace, audit, transcript metadata, and last-success proof metadata are shown without invented attribution | bridge_request_failed, bridge_request_completed |

### TX-009 details

User value: The settings and privacy panel makes local connection and capture state visible before voice, camera, or live bridge behavior can be mistaken for hidden permission.

Acceptance criteria:

- Endpoint, optional local bridge token, profile mode, telemetry, camera, and microphone controls are visible in Text Concierge settings.
- Camera and microphone default to off.
- Telemetry defaults to on for local development signals and can be turned off in local settings.
- Camera and microphone toggles persist local state but do not start capture, request operating-system permissions, store raw audio/video, or send data externally.
- Privacy setting changes and camera/microphone permission request/result events emit local metadata with explicit false side-effect flags for approval capture, memory writes, agent dispatch, and external sends.
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

- Concierge can answer common, working-well, missing/blocked, easy-to-evolve, architecture-area, recommended-next, steering recommendation type, increasing, worsening, recent, weekly-change, and seasonal-change capability questions from local aggregate signals.
- Easy-to-evolve and recommended-next answers use deterministic local ranking from count, confidence, capability status, architecture area, and suggested next step.
- Recommended-next answers can propose a guided Media Session readiness repair flow from fixed local microphone, camera, and playback blocker details without treating ordinary correctly blocked unsafe requests as implementation recommendations.
- Answers include counts or evidence strength, confidence, architecture area, and key caveats.
- Answers include a visible sanitized evidence drilldown with profile scope, answer rows, score components where available, architecture area, suggested next step, and allowlisted local evidence references.
- The evidence drilldown can be exported as local JSON for inspection without contacting Napoleon, exposing endpoints or credentials, retaining raw text/media/request/response bodies, capturing approval, writing memory, dispatching agents, sending externally, or applying recommendations.
- Capability answers can export a local review packet with safe question classification, profile scope, review focus, evaluator case candidate, evolution proposal draft, sanitized rows, allowlisted evidence, proposal-only boundary, and explicit false local side-effect fields; export does not contact Napoleon or apply recommendations.
- Exported capability review packets can be submitted through the governed Chief of Staff evolution review target only after endpoint and descriptor preflight pass, the descriptor advertises the review handoff, active profile scope still matches, and Rehearsal Mode is off; submission remains proposal-only and cannot apply changes, write memory, capture approval, dispatch agents, or send externally.
- Correctly blocked unsafe requests are classified separately from failed safe requests.
- Capability ledger storage re-sanitizes appended labels and evidence references before any persistence, export, query answer, or Chief of Staff steering draft can reuse them.
- Chief of Staff steering drafts only attach evidence from the missing or degraded recommendation bucket that produced the recommendation; correctly blocked unsafe traces are not reused as evolution proposal evidence because of a shared capability label; local taxonomy edits clear existing steering drafts and exports so obsolete labels cannot be handed off.
- Chief of Staff steering drafts can carry guided Media Session readiness repair recommendations and fixed local readiness evidence into the proposal packet as the narrow blocked-state exception, without applying changes locally or weakening proposal-only boundaries.
- Chief of Staff steering evolution proposal drafts include metadata-only learning signals from the same selected missing or degraded evidence bucket, and draft creation emits local `learning_signal_recorded` telemetry without raw content or side effects.
- The Chief of Staff steering draft panel shows recommendation type, learning-signal count, type, source, raw-text retention state, and proposal-only state before a governed handoff can be submitted, so guided Media Session readiness repairs are visibly distinct from scored capability recommendations.
- The Chief of Staff steering draft panel can export the full local review packet for inspection, including stable recommendation type, evaluator case candidate, evolution proposal draft, learning-signal count, send state, and proposal-only boundary, without contacting Napoleon, exposing endpoints, retaining raw text, or applying changes; stale export output clears when connection, descriptor, taxonomy, profile, Rehearsal Mode, or ledger context changes.
- Governed Chief of Staff steering request packets carry a stable `recommendationType` enum so Napoleon review can distinguish guided readiness repairs from scored capability recommendations without parsing rationale text.
- Chief of Staff steering send started, completed, and failed telemetry includes only the stable recommendation type enum, without emitting rationale, evidence, endpoint, token, or raw content fields.
- Capability-intelligence answers can summarize common Chief of Staff steering recommendation types from local enum-only send telemetry without exposing rationale, evidence, endpoint, token, or raw content fields.
- Rendered Text Concierge coverage verifies steering recommendation type answers stay enum-only, do not contact Napoleon, and do not render rationale, evidence, endpoint, token, or raw content fields.
- Local capability-intelligence answers visibly name the active profile scope, and rendered child-protected steering recommendation type coverage verifies adult-owner steering evidence is not mixed into child-protected answers.
- Evaluator coverage requires steering recommendation type summaries to stay profile-scoped, enum-only, child-protected separated, local-only, and non-authorizing.
- Returned Chief of Staff steering review panels show the reviewed recommendation type alongside Napoleon's decision, trace, audit, blocked effects, and false local side-effect state, so the reviewed packet category remains visible after submission.
- Chief of Staff steering submission fails closed before request fetch when a stale draft's affected profile does not match the active profile, so profile-scoped evolution evidence cannot be submitted across contexts.
- Evaluator coverage requires stale steering draft profile mismatches to fail closed before request fetch with `governance_no_go`, visible blocked effects, no Napoleon contact, and no side effects.
- Evaluator coverage requires stale steering draft exports to clear on connection, descriptor, taxonomy, profile, Rehearsal Mode, or ledger changes, so obsolete local JSON cannot remain visible as review-ready evidence.
- Evaluator coverage requires stale taxonomy review drafts, failures, and returned review results to clear on connection, descriptor, taxonomy, profile, Rehearsal Mode, or ledger changes, so obsolete review artifacts cannot remain visible as review-ready evidence.
- Recommendations are proposal-only and do not implement features, grant approval, write memory, dispatch agents, or send externally.
- Local Chief of Staff taxonomy review drafts can recommend metadata-only merge, split, and deprecation review, package evaluator-case and evolution-proposal drafts, and submit them through the governed Chief of Staff bridge only after endpoint and descriptor preflight pass, without applying taxonomy edits or changing Napoleon policy/routing; child-protected taxonomy review drafts and handoffs preserve child profile scope and guardian/owner review wording.
- Clearing the local capability ledger clears any derived Chief of Staff steering or taxonomy review draft, response, or failure state so obsolete local evidence cannot be submitted or displayed; taxonomy edits clear derived Chief of Staff steering drafts, steering exports, steering results, taxonomy review drafts, and taxonomy review results; endpoint, bearer-token, descriptor, and Rehearsal Mode changes clear taxonomy review drafts and results so review packets are regenerated from the current handoff context.
- Child protected aggregates are minimized and separated from adult-owner aggregates.

Privacy and safety impact:

- The query surface uses derived metadata and redacted summaries by default.
- Raw conversation content is not stored or exported without explicit user-visible controls.
- Evolution proposal evidence remains metadata-only and excludes correctly blocked unsafe request traces when they are not part of the selected recommendation bucket.

Evaluator coverage:

- Covered by `CAPABILITY-INTELLIGENCE-001`, `CAPABILITY-INTELLIGENCE-STEERING-TYPES-001`, `CHIEF-OF-STAFF-STEERING-PROFILE-MISMATCH-001`, `CHIEF-OF-STAFF-STEERING-EXPORT-STALE-001`, and `CHIEF-OF-STAFF-TAXONOMY-REVIEW-STALE-001`, plus app/unit regression coverage for sanitized capability-answer evidence drilldown display, drilldown export, and local review packet export.

### TX-013 details

User value: The user can tell whether a response came from Napoleon, which capability or agent contributed, and why a live send was blocked.

Acceptance criteria:

- Live sends fail closed when no endpoint is configured, descriptor validation fails, descriptor discovery is stale, auth fails, the response contract is invalid, local governance is `no_go`, Napoleon returns `deny` or `no_go`, or the bridge times out.
- Optional bridge tokens are sent only as request headers: `Authorization` for generated `/v1/concierge/...` bridge requests and `X-Napoleon-Auth` for explicit `/cos/descriptor`, `/cos/capabilities`, and `/cos/text-turn` advisory harness requests. They are not included in request bodies, telemetry, memory proposals, or capability exports.
- Configured Napoleon base URLs or known Concierge bridge operation URLs resolve to canonical bridge paths for text turns, descriptor discovery, Chief of Staff steering handoff, memory proposal review, and evaluator requests.
- Real Napoleon `/cos` base URLs can be used by the desktop app and validated through descriptor fallback, current text-turn request shape, sanitized bridge evidence, and `/cos/trace/{trace_id}` proof; if the runtime lacks an evaluator route, live-runtime validation must record a sanitized evaluator failure and keep promotion blocked.
- Governed handoff controls and submit helpers require the descriptor to advertise the specific handoff route being used, so a text-turn-only real runtime descriptor keeps memory review, governance review, Chief of Staff steering, taxonomy review, and evolution proposal review handoffs blocked.
- Advisory Chief of Staff capabilities can be fetched only after descriptor discovery passes, using `GET /v1/concierge/chief-of-staff/capabilities` or explicit `/cos/capabilities`, and the result is shown as metadata-only capability IDs, labels, authority tiers, proposal-only state, runtime-authority blocked state, and blocked effects without granting approval or dispatch authority.
- Advisory Chief of Staff capability discovery fails closed if the returned response claims approval capture, memory writes, agent dispatch, or external sends; those response-side claims are recorded separately from Concierge's false local side-effect boundary fields and are visible as metadata-only UI, telemetry, and readiness proof fields.
- Bridge operation IDs, paths, HTTP methods, request-kind typing, required 200-response fields, and named Napoleon review/evidence handoff metadata are generated from `api/napoleon_bridge.openapi.yaml`, and app plus repository checks fail if the generated registry or derived TypeScript operation types drift from the canonical contract.
- Concierge can compare its local bridge OpenAPI paths with a supplied Napoleon Concierge integration OpenAPI snapshot using `make napoleon-contract-alignment`, producing a local non-authorizing report that identifies path drift before the bridge client is changed.
- The contract-alignment report classifies exact advisory harness support, explicit Napoleon review runtime path support, metadata-only discovery path support, local Concierge handoff aliases, Napoleon review/evolution paths that still need explicit runtime mapping, and Napoleon review/evolution paths that do not yet have any local alias, without treating aliases as approval, side-effect authority, or local application.
- Chief of Staff request handoffs can target Napoleon's explicit `/chief-of-staff/requests` path through a named request alias, while still blocking task routing, registry updates, trace appends, approval capture, memory writes, agent dispatch, external sends, and local application.
- Governance evaluation handoffs can target Napoleon's explicit `/governance/evaluate` path through a named governance evaluation alias, while the returned governance decision remains evidence only and does not become local approval capture, task routing, memory write, agent dispatch, external send, trace append, or local application.
- Evolution proposal submission handoffs can target Napoleon's explicit `/evolution/proposals` path through a named proposal submission alias, while still blocking local application, registry updates, trace appends, task routing, approval capture, memory writes, agent dispatch, and external sends.
- Observability trace handoffs can target Napoleon's explicit `/observability/traces` path through a named trace evidence alias, while still blocking trace append authority, audit authority, task routing, approval capture, memory writes, agent dispatch, external sends, and local application.
- Governed governance review handoff can target Napoleon's explicit `/chief-of-staff/reviews/governance` path through a named review alias when configured with a Napoleon root or explicit review endpoint, while generated `/v1/concierge/...` endpoints and the local harness continue to use the canonical Chief of Staff steering route.
- Governed Chief of Staff steering and taxonomy evolution proposal review handoffs can target Napoleon's explicit `/chief-of-staff/reviews/evolution-proposals` path through a named review alias when configured with a Napoleon root or explicit review endpoint, while generated `/v1/concierge/...` endpoints and the local harness continue to use the canonical Chief of Staff steering route.
- Evaluator HTTP mode can target Napoleon's explicit `/chief-of-staff/reviews/evaluation` path through a named review alias when configured with a Napoleon root or explicit review endpoint, while generated `/v1/concierge/...` endpoints and the local harness continue to use the canonical evaluator route.
- Evaluator HTTP reports retain sanitized evaluation-target metadata with target path, request kind, operation ID, false endpoint/token/body retention, and false approval, memory-write, agent-dispatch, and external-send flags, without retaining endpoint hosts or bearer tokens.
- New agent proposal review handoffs can target Napoleon's explicit `/chief-of-staff/reviews/new-agent-proposals` path through a named review alias, while still blocking registry activation, agent dispatch, approval capture, memory writes, external sends, and local application.
- Explicit `/cos/descriptor` Napoleon advisory harness endpoints can be discovered as first-class descriptor connection state using Napoleon's snake-case descriptor shape, `X-Napoleon-Auth` header-only auth, fail-closed TTL handling, and rejection of runtime-authority or command-execution grants.
- Explicit `/cos/text-turn` Napoleon advisory harness endpoints can be adapted inside the governed text bridge while preserving prepare-only governance, selected candidate-agent provenance, blocked effects, sanitized evidence, and no memory write, approval capture, agent dispatch, or external send; adapted responses also fail closed on invented Napoleon recommendation attribution, invented selected-agent findings, response text that claims blocked side effects occurred, or missing/mismatched `/cos/trace/{trace_id}` observability proof.
- Sanitized bridge evidence capture and comparison support the explicit `/cos/descriptor` plus `/cos/text-turn` advisory harness flow while recording the actual `/cos/text-turn` target path and rejecting endpoint hosts, raw request text, request bodies, response bodies, and tokens.
- Explicit `/cos/text-turn` advisory harness app sends and evidence capture fetch `/cos/trace/{trace_id}` after a successful text turn and store only metadata that the trace envelope was observed and matched the text-turn trace; raw trace envelopes, endpoint hosts, request bodies, response bodies, and tokens remain excluded from evidence and live-runtime summaries.
- Explicit advisory harness app sends normalize configured `/cos`, `/cos/descriptor`, `/cos/capabilities`, and `/cos/text-turn` endpoints to `POST /cos/text-turn` while preserving the same descriptor-first, non-authorizing boundary.
- Runtime bridge URL resolution exposes only named generated operations; repository validation rejects free-form bridge path resolver reintroduction.
- Live bridge, live voice, composer preflight readiness, and sanitized readiness proof exports treat missing runtime-validation source as unproven and promotion-blocked until explicit real Napoleon runtime evidence exists.
- Text Concierge shows the governed descriptor discovery, advisory capability discovery, text turn, memory proposal review, Chief of Staff steering, Chief of Staff taxonomy review, named Napoleon review, and named Napoleon evidence/submission paths plus generated-source, transport, token-handling, side-effect, and OpenAPI-required response field summaries from the generated registry without endpoint hosts, bearer tokens, or authority claims; the live bridge readiness panel also shows a human-readable readiness proof source summary for generated Napoleon targets; sanitized bridge readiness proof exports carry generated-source provenance for named Napoleon review/evidence targets without raw prompts, response bodies, endpoint hosts, bearer tokens, request bodies, or authority claims; descriptor discovery, advisory capability discovery, and text turn route summaries also show separate accepted-endpoint-form rows for `/cos`, `/cos/descriptor`, `/cos/capabilities`, and `/cos/text-turn`, with text turns showing a separate `/cos/trace/{trace_id}` required-proof row before successful evidence is accepted; named Napoleon targets include `/chief-of-staff/requests`, `/chief-of-staff/reviews/evaluation`, `/chief-of-staff/reviews/evolution-proposals`, `/evolution/proposals`, `/governance/evaluate`, `/chief-of-staff/reviews/governance`, `/chief-of-staff/reviews/new-agent-proposals`, and `/observability/traces`; taxonomy review is shown as a governed handoff alias of the canonical Chief of Staff steering operation, not as a separate free-form route.
- The Napoleon delegation panel shows the returned target capability alongside selected agents, why selected, allowed effects, blocked effects, governance state, trace, audit, and a provenance-source row when Napoleon provides both capability and selected-agent provenance.
- The visible Napoleon delegation panel labels redacted target-capability metadata as metadata state instead of attribution or proof-alignment wording.
- Repository validation checks that governed bridge operations have matching HTTP methods, request-kind constants, required 200-response fields, `NapoleonBearer` security, and named operation usage.
- Repository validation rejects frontend and desktop manifest dependencies plus root lockfile declarations that would add direct LLM, agent, memory/graph, shell/process, or alternate transport clients around the governed Napoleon bridge.
- Repository validation must block split bracket direct memory and graph write aliases such as `window["write" + "Memory"]`, `globalThis["save" + "Memory"]`, and `window["graph" + "_write"]`, so memory review cannot become a local write path.
- Repository validation must block split bracket direct agent and tool dispatch aliases such as `window["dispatch" + "Agent"]`, `globalThis["call" + "Tool"]`, and `window["execute" + "Tool"]`, so Concierge cannot become a local router or tool runner beside Napoleon.
- Repository validation must block JavaScript runtime process APIs such as `execFile`, `execFileSync`, `execSync`, `spawnSync`, `Deno.Command`, `Bun.spawn`, `Bun.spawnSync`, bracket-style aliases such as `childProcess["execFile"]`, `globalThis["Deno"]["Command"]`, and `window["Bun"]["spawnSync"]`, and bracketed process `.call(...)` or `.apply(...)` aliases such as `childProcess["execFile"].call(...)` and `window["Bun"]["spawnSync"].apply(...)`, so UI code cannot execute local commands beside Napoleon governance.
- Repository validation rejects direct browser network calls, worker-based service entry points, static remote module imports and any runtime dynamic `import(...)` module loading, static external link/form/resource/redirect targets, dynamic external target setters, dynamic HTML injection side channels, external navigation, and browser share APIs such as `fetch`, `WebSocket`, `EventSource`, `XMLHttpRequest`, `sendBeacon`, `Worker`, `SharedWorker`, `importScripts`, `import("https://...")`, static `import` from outside URLs, service-worker registration, external `href`, `action`, `formAction`, `src`, `srcSet`, `poster`, or `ping` targets, bracket-assigned or `setAttribute` external targets, meta-refresh redirects, CSS external `url(...)` or `@import` resource targets, `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `DOMParser`, `createContextualFragment`, `srcDoc`, lowercase `srcdoc`, `document.write`, `document.writeln`, bracket-style HTML injection aliases, document-write prototype call/apply aliases such as `HTMLDocument.prototype.write.call(...)` and `HTMLDocument.prototype.writeln.apply(...)`, `window.open`, `location.assign`, `location.replace`, or `navigator.share` outside the governed Napoleon bridge modules, including call/apply aliases such as `fetch.call(...)`, `navigator.sendBeacon.apply(...)`, `window.open.call(...)`, and `navigator.share.apply(...)`, so UI code cannot add external sends or alternate services beside the bridge.
- Repository validation must also block call/apply and bracket-style navigator beacon aliases such as `navigator.sendBeacon.apply(...)`, `window["navigator"]["sendBeacon"]`, `globalThis["navigator"]["sendBeacon"]`, and bracketed `sendBeacon.call(...)` or `sendBeacon.apply(...)` aliases, so UI code cannot emit one-way payloads outside the governed Napoleon bridge.
- Repository validation must block dynamic code execution APIs such as `eval`, `Function(...)`, `new Function`, string-based timers, bracket-style aliases for eval, Function, and string-timer calls, dot-property constructor aliases such as `new window.Function(...)` and `window.Function(...)`, and indirect constructor-constructor access, so UI code cannot create hidden executable authority paths.
- Repository validation must block WebAssembly compilation/instantiation, including `Module` and `Instance` constructors and bracket-style aliases, plus object URL creation aliases such as `URL["createObjectURL"] (...)`, `URL.createObjectURL.call(...)`, and mixed bracket/dot `.call(...)` or `.apply(...)` aliases, so UI code cannot introduce hidden local executable paths outside governed visible flows.
- Repository validation must block browser peer and transport APIs such as `RTCPeerConnection`, `webkitRTCPeerConnection`, and `WebTransport`, including bracket-style constructor aliases such as `window["RTCPeerConnection"]`, `window["WebTransport"]`, and mixed bracket/dot `.call(...)` or `.apply(...)` aliases, so UI code cannot open peer or session network paths around the governed bridge.
- Repository validation must block privileged browser device, permission, location, account, notification, push, and payment APIs such as WebUSB, Web Serial, WebHID, Web Bluetooth, Permissions API queries, Geolocation, Credential Management, Notifications, Push subscriptions, and Payment Request, including bracket-style aliases such as `navigator["usb"]["requestDevice"]`, call/apply aliases such as `navigator.permissions.query.call(...)`, `navigator.share.apply(...)`, `navigator.serviceWorker.register.call(...)`, `Notification.requestPermission.call(...)`, `registration.pushManager.subscribe.call(...)`, `PaymentRequest.call(...)`, `navigator["geolocation"]["getCurrentPosition"]`, `window["Notification"]["requestPermission"]`, Payment Request constructor calls such as `window["PaymentRequest"] (...)`, bracketed notification/payment `.call(...)` or `.apply(...)` aliases, and mixed bracket/dot navigator or notification `.call(...)`/`.apply(...)` aliases, so UI code cannot request local devices, inspect permission state, access location, request account credentials, create subscriptions, or start payment flows outside governed visible Concierge controls.
- Repository validation must block `globalThis["navigator"]` and `window["navigator"]` bracket aliases for share, service-worker registration, permissions, geolocation, device, credentials, and clipboard APIs, including `.call(...)` and `.apply(...)` method aliases for share, service-worker registration, device, credential, permission, geolocation, and clipboard methods, so alternate global access cannot bypass the same external-send and local-device guardrails.
- Repository validation also rejects hard-coded, concatenated, or template-built live URL fetch targets inside governed bridge modules; those modules must use named generated bridge operation resolution.
- Repository validation must block same-origin browser messaging channels such as `postMessage`, `BroadcastChannel`, and `MessageChannel`, including postMessage call/apply aliases such as `window.postMessage.call(...)`, bracketed postMessage `.call(...)` or `.apply(...)` aliases, constructor call/apply aliases such as `BroadcastChannel.call(...)` and `window.MessageChannel.apply(...)`, bracket-style constructor calls such as `globalThis["BroadcastChannel"] (...)` and `window["MessageChannel"] (...)`, and bracketed constructor `.call(...)` or `.apply(...)` aliases, so UI code cannot move prompts, responses, tokens, or proof metadata to another browser context outside governed visible flows.
- Repository validation must block browser history state mutation such as `history.pushState`, `history.replaceState`, call/apply aliases such as `history.pushState.call(...)`, bracket-style aliases, bracketed call/apply aliases such as `window["history"]["pushState"].call(...)`, and mixed bracket/dot aliases such as `window["history"].pushState.call(...)`, so UI code cannot retain prompts, responses, tokens, or proof metadata in URL/history state outside governed visible flows.
- Repository validation must block `window.name` state writes and bracket-style aliases, so UI code cannot retain prompts, responses, tokens, or proof metadata across navigation outside governed visible flows.
- Repository validation must block browser cookie writes, including bracket-style aliases such as `document["cookie"] = ...`, so UI code cannot create hidden prompt, proof, token, transcript, or response retention stores outside bounded local metadata modules.
- Repository validation must block IndexedDB and Cache Storage method calls including call/apply aliases such as `indexedDB.open.call(...)` and `window.caches.open.apply(...)`, plus bracketed call/apply aliases such as `globalThis["indexedDB"]["open"].call(...)` and `window["caches"]["put"].apply(...)`, so UI code cannot retain prompts, responses, tokens, transcripts, or proof metadata outside bounded visible local stores.
- Repository validation must block arbitrary `localStorage` and `sessionStorage` method reads, method writes, method call/apply aliases such as `localStorage.setItem.call(...)`, bracketed method call/apply aliases such as `globalThis["localStorage"]["setItem"].call(...)` and `window["sessionStorage"]["clear"].apply(...)`, mixed bracket/dot aliases such as `window["localStorage"].setItem(...)` and `window["localStorage"].setItem.call(...)`, property assignments, method removals, property deletions, and clears outside explicit bounded connection settings, local settings, telemetry, and capability metadata modules, including inside governed bridge modules, so UI code cannot create hidden prompt, proof, token, or response retention stores or erase visible governance evidence.
- Repository validation must also reject unapproved literal or simple constant browser-storage read, write, or removal keys inside bounded local storage modules, so new raw prompt, proof, transcript, descriptor, or token caches cannot be introduced under the settings, telemetry, or capability metadata allowlist.
- Repository validation must block direct browser clipboard reads, writes, mixed dot/bracket clipboard aliases, call/apply aliases such as `navigator.clipboard.writeText.call(...)`, and legacy copy/paste commands including bracket-style `document["execCommand"] (...)` aliases, so UI code cannot move prompts, responses, tokens, or proof metadata outside governed visible export flows.
- Repository validation must block browser file picker APIs including call/apply aliases such as `window.showOpenFilePicker.call(...)`, `globalThis.showDirectoryPicker.apply(...)`, and bracketed file-picker `.call(...)` or `.apply(...)` aliases, FileReader constructors including bracket-style `window["FileReader"] (...)` aliases and bracketed FileReader `.call(...)` or `.apply(...)` aliases, and FileReader `readAs...` methods including call/apply aliases such as `reader.readAsText.call(...)`, so UI code cannot read, write, or export local files outside governed visible import/export flows.
- Repository validation rejects direct Tauri native bridge invocation, including global `__TAURI__` invoke aliases, non-allowlisted Tauri commands, forbidden Tauri plugin configuration, and forbidden Tauri plugin dependencies, so the desktop shell cannot add native side channels for memory, tools, shell, files, services, HTTP, or external sends outside the governed Napoleon bridge.
- Repository validation rejects hidden `getUserMedia`, `getDisplayMedia`, `enumerateDevices`, `MediaRecorder`, `AudioContext`, browser speech recognition/synthesis, and playback APIs, including call/apply aliases such as `navigator.mediaDevices.getUserMedia.call(...)` and bracket-style aliases such as `navigator.mediaDevices["getUserMedia"]`, `navigator.mediaDevices["getDisplayMedia"]`, `navigator["mediaDevices"]["enumerateDevices"]`, `window["MediaRecorder"]`, `window["AudioContext"]`, and `clip["play"]`, outside explicit visible permission handlers, so voice/avatar work cannot start capture, device enumeration, recording, or playback before governed local controls exist.
- Repository validation checks canonical governed request examples for adult and child memory proposal handoffs, adult and child Chief of Staff steering handoffs, child-protected governance review handoff, and adult and child Chief of Staff taxonomy review handoffs against their OpenAPI request schemas and rejects top-level or nested approval capture, memory writes, agent dispatch, external sends, local application, missing child guardian review, missing child steering safety caution, missing metadata-only steering learning signals, or non-proposal boundaries; governance review and taxonomy review use the canonical Chief of Staff steering request kind with explicit payload metadata.
- Repository validation checks the canonical Chief of Staff descriptor response example against the OpenAPI descriptor response schema and rejects runtime authority, command execution, non-fail-closed cache policy, missing checksum/signature proof, or missing blocked authority effects.
- Repository validation checks canonical governed response examples for adult and child text turns, adult and child memory proposal review, governance review, adult and child Chief of Staff steering review, and adult and child Chief of Staff taxonomy review against their OpenAPI response schemas and rejects inconsistent governance, trace, audit, delegation, recommendation provenance, or response-side claims of memory writes, approval capture, agent dispatch, external sends, or local application where applicable. Live bridge response validation also rejects returned delegation that marks forbidden authority effects such as `agent_dispatch` as allowed or advisory harness candidate agents as runtime-invoked. Governed review response examples must also carry explicit false side-effect boundary fields for memory writes, approval capture, agent dispatch, external sends, and local application where applicable; child-protected text, memory, steering, governance, and taxonomy review responses must preserve guardian review wording, child profile evidence, review-only or review-gated status, and child-specific blocked effects such as blocked secret-keeping, steering responses must preserve child capability evidence, and taxonomy review responses must preserve capability taxonomy evidence without applying cleanup.
- Repository validation compares every `examples/sample*_request.json` and `examples/sample*_response.json` file with the registered OpenAPI example inventory so new governed bridge artifacts cannot remain unregistered or unvalidated.
- Runtime memory proposal, governance review, Chief of Staff steering, and Chief of Staff taxonomy review handlers reject governed review responses that omit generated required top-level fields or required explicit false side-effect boundary fields.
- Repository validation scans runtime source for direct process execution, memory or graph access, direct agent or tool dispatch outside the governed bridge, native desktop bridge bypasses, hidden media/speech/playback APIs, common bypass aliases such as `invokeAgent`, `runTool`, and `executeTool`, and concatenated or bracketed agent/tool dispatch aliases.
- Descriptor discovery is visible as first-class connection state, including live-discovered, missing descriptor, stale descriptor, and checksum/signature mismatch states.
- Live descriptor discovery resolves generated bridge endpoints to `/v1/concierge/chief-of-staff/descriptor` and explicit Napoleon advisory harness `/cos`, `/cos/descriptor`, or `/cos/text-turn` endpoints to `/cos/descriptor`; invalid results remain blocked connection state, not authority.
- Live descriptor discovery preserves explicit `supportedHandoffs` / `supported_handoffs` values from returned descriptors, so a descriptor that omits `text_turn` remains blocked rather than inheriting Concierge's built-in default handoff list; explicit handoff lists with unknown route names fail closed as invalid descriptors instead of being silently filtered.
- Descriptor discovery preserves auth failure, timeout, unreadable descriptor response bodies, and HTTP failure as first-class fail-closed connection states; the OpenAPI descriptor connection schema names those states for text, memory proposal, Chief of Staff steering, and taxonomy review handoffs; and preflights carry those reasons forward instead of hiding them as generic descriptor mismatch.
- Live text-turn fail-closed messages, transcript entries, `bridge_request_failed` telemetry, and sanitized bridge evidence preserve descriptor-specific preflight reasons when available, including missing descriptor and descriptor checksum/signature mismatch, while still blocking the request before fetch.
- Governed memory proposal, governance review, Chief of Staff steering, and Chief of Staff taxonomy review handoff errors and failed telemetry preserve descriptor-specific preflight reasons when available, including missing descriptor, checksum/signature mismatch, and descriptor auth failure, while still blocking before request fetch.
- Live text turns, memory proposal handoff, Chief of Staff steering handoff, and Chief of Staff taxonomy review handoff fail closed before request fetch when descriptor discovery has not completed, when descriptor discovery cache is stale, or when the discovered descriptor does not advertise the required governed handoff route; the built-in descriptor is not a live-send substitute.
- Text Concierge shows a live bridge readiness summary grouped into operator-facing sections for the Napoleon bridge descriptor, governed text-turn route, evaluator HTTP validation, last live evidence, promotion gate, and authority boundary. The grouped summary combines endpoint state, descriptor state, checksum/signature state, in-session sanitized evidence capture/comparison state, runtime-validation source, evaluator HTTP status/failure/target metadata, promotion gate, last live-send status and fail-closed reason, last real-runtime proof status/path when proven, accepted real-runtime proof metadata when a sanitized prior proof is imported, and blocked effects; it also ranks the current promotion blockers in plain English from the same local evidence. Local harness and local simulation checks remain warnings and promotion-blocked until real Napoleon runtime validation is proven, and missing or failed evaluator HTTP mode remains visible as a promotion blocker even after bridge evidence passes. A sanitized live-runtime evaluator validation summary can be pasted into the readiness panel or selected as a local JSON file to update evaluator HTTP metadata only; malformed, unsafe, stale, or wrong-target artifacts are imported as failed evidence and keep promotion blocked. A sanitized bridge readiness proof or successful `make live-runtime-validation` `summary.json` can also be pasted as accepted local proof metadata only when it is real-runtime, promotion-ready, evaluator-passed, privacy-passed, and side-effect-free; unsafe, local-harness, local-simulation, incomplete, evaluator-failed, privacy-failed, or side-effect-claiming proofs are rejected and do not grant approval.
- Text Concierge shows a composer-side live-send preflight checklist for text readiness, endpoint configuration, descriptor discovery, descriptor integrity, descriptor-advertised text-turn route, local governance send gate, allowed effects, blocked effects, Rehearsal Mode state, runtime-validation source, imported evaluator HTTP status/failure/target metadata when available, accepted real-runtime proof metadata when a sanitized prior proof is imported, evidence capture/comparison, and promotion-gate warnings without treating the checklist as approval; missing accepted proof is neutral local context, not a blocker. Every row renders its `ready`, `warning`, or `blocked` status as readable text, and the panel also surfaces the highest-priority blocker or warning plus a local next-step hint in plain English; descriptor auth failure, timeout, HTTP failure, missing `text_turn` route, and missing or failed evaluator HTTP mode appear as specific rows; direct-send controls repeat the first blocked preflight reason when it is not already represented by the disabled local-governance send state; local governance blocks show the outcome such as `no_go`, show allowed effects as `none`, and disable direct send before any live bridge attempt; post-preview advisory sending remains disabled while Rehearsal Mode is active and enables only after Rehearsal Mode is off with an unchanged preview that governance allows to be sent and descriptor preflight still shows the governed bridge is ready; disabled post-preview send controls explain whether the blocker is active Rehearsal Mode, a stale preview/current-request mismatch, rehearsed governance, or descriptor preflight.
- Text Concierge shows governed handoff readiness for memory proposal review, governance review, Chief of Staff steering, and Chief of Staff taxonomy review using draft, endpoint, descriptor preflight, governed handoff route, Rehearsal Mode state, blocked-effect state, and a local next-step hint; existing Chief of Staff steering drafts re-evaluate against current endpoint and descriptor readiness so configuring the governed endpoint after drafting can enable submission without re-drafting; clearing local capability metadata removes derived Chief of Staff steering and taxonomy review draft/result state so obsolete local evidence cannot be handed off; submit controls stay disabled until readiness passes, and the submit helpers also fail closed before request fetch while Rehearsal Mode is active.
- Memory proposal, governance review, Chief of Staff steering, and Chief of Staff taxonomy review response panels show returned governance, decision, authority tier, approval requirement, rationale, trace, audit, blocked effects, and explicit false local side-effect state.
- Text Concierge can export a local bridge readiness proof with descriptor state, descriptor-advertised governed handoff routes, descriptor text-turn route advertised telemetry, advisory capability discovery count/ID/tier metadata, Napoleon agent/profile discovery count/ID metadata, evidence state, runtime-validation source, imported evaluator HTTP status/failure/target metadata when available, promotion gate, last operation transport, last operation path, last fail-closed reason, blocked effects, and explicit false approval/memory/agent-dispatch/external-send/registry-update boundary telemetry, without raw prompt text, raw manifests, profile bodies, response text, endpoint hosts, bearer tokens, request bodies, or response bodies.
- Bridge readiness proof export redacts unsafe captured evidence values, including endpoint-like paths, loopback hosts, bearer credentials, and authorization text, before creating local proof JSON while preserving safe blocked-effect and path metadata.
- Text Concierge can compare the current local bridge readiness proof with the previous proof exported in the same app session, reporting unchanged, changed, invalid previous proof, or no previous proof from sanitized descriptor, descriptor-advertised handoff route, Napoleon metadata, evaluator HTTP, promotion-gate, and evidence fields only.
- Bridge readiness and Napoleon response proof comparisons reject previous or current proof JSON that includes unsafe raw/secret field names, normalized snake_case raw-field aliases, endpoint-like values, loopback hosts, bearer credentials, or authorization strings anywhere in the proof.
- Descriptor discovery, endpoint changes, bearer-token changes, and descriptor-mode changes clear captured bridge evidence readiness plus rendered readiness proof export and comparison state; advisory capability discovery clears rendered readiness proof export and comparison state so stale connection or capability metadata is not left visible or reusable.
- Live text attempts update the readiness panel from captured `bridge_contract_evidence`; evidence comparison fails if the captured operation transport, path, or request kind drifts from the bridge registry or the explicit `/cos/text-turn` advisory alias, or if raw/secret fields appear.
- Text Concierge settings include a local harness endpoint preset for `http://127.0.0.1:8787`; selecting it only configures endpoint and descriptor preflight state, and does not start, stop, or control the harness process. The local harness includes browser CORS preflight headers so the rendered Text Concierge shell can validate descriptor discovery and governed text sends against it without treating it as real Napoleon runtime evidence.
- `make app-smoke` covers the local harness text path through descriptor discovery, governed send, delegation presentation inputs, last successful Napoleon proof view, sanitized Napoleon proof export comparison, blocked effects, readiness evidence, denied fail-closed text turn details, and response-side forbidden side-effect claims that fail closed as contract mismatches.
- The app test suite also includes rendered React interaction coverage for the Napoleon proof export controls, proving the UI can click through descriptor discovery, governed send, repeated export comparison, and sanitized proof output without exposing prompts, endpoint hosts, or response text.
- `make bridge-harness` covers local harness steering and memory proposal review responses that deliberately claim forbidden side effects, so those bad review shapes remain available for local contract checks.
- Live text bridge calls can capture sanitized contract evidence for success and fail-closed outcomes without raw prompt text, response text, endpoint hosts, bearer tokens, request bodies, or response bodies.
- `make bridge-evidence-capture` exercises one governed text evidence capture against the local harness, including descriptor discovery before text turn submission, and the capture helper accepts `NAPOLEON_BRIDGE_ENDPOINT` as a base URL or known Concierge bridge operation URL for live bridge evidence runs.
- `make bridge-evidence-compare` validates sample or captured bridge evidence against the OpenAPI-aligned bridge registry, including canonical transport, and rejects raw payload, secret fields, or invalid runtime-validation source labels.
- `make eval-http-local-harness` exercises evaluator HTTP mode against the local Napoleon-compatible harness and labels the report `runtimeValidation.source=local_harness` without treating it as live Napoleon validation.
- `make live-runtime-local-harness` proves the combined live-runtime validation runner against the local harness, including descriptor discovery, sanitized bridge evidence capture, evidence comparison, and evaluator HTTP mode.
- `make live-runtime-validation` runs the same combined validation against a configured real Napoleon runtime using `NAPOLEON_BRIDGE_ENDPOINT` as a base URL or known Concierge bridge operation URL plus optional `NAPOLEON_EVAL_ENDPOINT`, writing sanitized evidence, capability-discovery evidence, evaluator report, validation summary, machine-readable promotion-readiness gate, and a local promotion review draft without endpoint hosts, bearer tokens, raw prompts, request bodies, response bodies, response text, or evaluator response excerpts. When no endpoint is configured, it still writes sanitized `preflight.json` with missing configuration, accepted real-runtime endpoint forms, explicit-or-derived bridge/evaluator endpoint resolution provenance, derived descriptor/capability/text-turn/trace-proof targets, derived evaluator target path/request kind/operation ID, and false side-effect boundary fields, without endpoint hosts or tokens. Generated Concierge-compatible and local harness endpoints derive `/v1/concierge/...` bridge targets and `/v1/concierge/evaluate`, while explicit Napoleon `/cos` endpoints and non-generated Napoleon bases derive `/cos/...` bridge targets and `/chief-of-staff/reviews/evaluation`; explicit evaluation review paths take precedence even on loopback hosts, and base URLs that prove to be Napoleon `/cos` runtimes may fall back from generated capability discovery to `/cos/capabilities` after a 404. Bridge evidence and the summary record runtime-validation source plus sanitized last-operation metadata such as operation ID, request kind, transport, and target path, including explicit `/cos/text-turn` advisory evidence; descriptor-gated capability discovery records only sanitized count, ID or `capability_id`, authority-tier, blocked-effect, false local side-effect metadata, and separate response-side side-effect claim metadata from advisory-only manifests; HTTP evaluator evidence records sanitized evaluator target path, request kind, operation ID, false endpoint/token/body retention, and false side-effect flags in the summary and promotion review draft, and missing evaluator review routes are retained only as sanitized `http_evaluator_route_not_found` target metadata, so local harness, simulation, or missing-route evidence cannot be mistaken for real Napoleon runtime validation. Descriptor-identified local harness runs fail closed when mislabeled as `real_runtime`, retained artifacts must pass the artifact privacy audit before validation succeeds, artifacts fail that audit if endpoint/token/body retention or forbidden side-effect boundary flags are true, and the command plus promotion-readiness gate remain blocked when capability discovery or HTTP evaluator mode fails.
- Bridge evidence comparison and live runtime artifact privacy audits reject raw-field aliases such as `response_text`, `request_body`, and `bearer_token`, not only exact camelCase field names.
- Failures are visible as local blocked states with blocked effects. Early local failures preserve the relevant text-turn, memory proposal, Chief of Staff steering, or Chief of Staff taxonomy review blocked-effect list, and remote failures preserve Napoleon-supplied blocked effects plus returned decision, audit, and governance references where available. Failures do not send externally, write memory, dispatch agents, append remote audit records, or capture approval.
- Repository validation must block root `@tauri-apps/api` imports and Tauri submodule imports in UI/runtime source, so the desktop shell cannot regain native authority paths outside the governed bridge.
- Repository validation must block lowercase and SVG external target variants such as `srcset`, `formaction`, and `xlink:href`, including bracket assignment and `setAttribute` forms, so UI code cannot create alternate outside browser channels around the governed bridge.
- Repository validation must block external image preload source-set variants such as `imageSrcSet` and `imagesrcset`, including static markup, property assignment, bracket assignment, and `setAttribute` forms, so responsive preload candidates cannot load outside resources around the governed bridge.
- Repository validation must block external object/embed `data` targets in static markup, property assignment, bracket assignment, and `setAttribute` forms, so plugin-style content cannot load outside resources around the governed bridge.
- Repository validation must block direct `location`, `window.location`, `document.location`, `globalThis.location`, bracket-style location assignments, and bracketed `location["href"]`, `location["assign"]`, or `location["replace"]` aliases, including variable-based targets, so navigation side channels cannot bypass the governed bridge through direct assignment or method aliases.
- Repository validation must block programmatic form submission APIs such as `form.submit()`, `form.requestSubmit()`, `document.forms[0].submit()`, bracket-style submission aliases, and prototype call/apply aliases such as `HTMLFormElement.prototype.submit.call(...)` and `HTMLFormElement.prototype.requestSubmit.apply(...)`, so form-post side channels cannot bypass the governed bridge.
- Repository validation must block programmatic DOM clicks such as `anchor.click()`, `downloadLink.click()`, `button.click()`, bracket-style click aliases, and anchor/button prototype call/apply aliases such as `HTMLAnchorElement.prototype.click.call(...)` and `HTMLButtonElement.prototype.click.apply(...)`, so hidden navigation or form side channels cannot bypass the governed bridge.
- Repository validation must block browser `postMessage` calls with external or wildcard target origins, so UI code cannot relay data to another browser context outside the governed bridge.
- Text Concierge always shows the Napoleon delegation panel under the normal panel heading; before bridge provenance is returned, target capability, provenance source, selected agents, why selected, allowed effects, blocked effects, governance state, trace ID, audit ID, authority boundary, and proof alignment are explicitly shown as not returned.
- Successful live responses may fill the Napoleon delegation panel with selected agents, selection reasons, allowed effects, blocked effects, governance state, trace ID, audit ID, an authority-boundary row stating returned bridge provenance is not approval, memory, dispatch, external send, or local application, and proof alignment showing the delegation came from the same returned trace/audit as the Napoleon response proof rather than from imported readiness proof.
- Successful live responses that return a target capability ID without selected-agent delegation show that target capability in the Napoleon delegation panel while selected agents remain marked not returned, the provenance source is marked target-capability-only, the target capability is not presented as selected-agent provenance, authority boundary stays explicit, proof alignment says selected-agent proof was not returned, and bridge-level blocked effects, governance state, trace ID, and audit ID stay visible from the returned response envelopes.
- Successful Napoleon transcript responses show the source as the governed bridge, the attribution boundary as returned bridge provenance only, and the response blocked effects.
- Fail-closed Napoleon transcript responses show the blocked bridge source, no-accepted-response attribution boundary, and blocked effects when available.
- Successful live text responses show a last successful Napoleon proof panel summarizing returned governance, profile mode, decision, trace, audit, attribution boundary, target capability, selected-agent provenance, selected-agent selection reasons, allowed effects, and blocked effects; it is display-only and must be cleared with delegation presentation by local-only answers, blocked preflight paths, and failed bridge calls.
- Changing the active user profile clears captured bridge evidence readiness, rendered bridge readiness proof exports, rendered Napoleon proof, delegation provenance, visible bridge failure banners, local governance and memory review drafts, local Chief of Staff steering and taxonomy review drafts, and governed review handoff result panels so returned, failed, locally drafted, or profile-scoped validation evidence is not reused across child, guest, collaborator, and owner contexts.
- Changing the bridge endpoint or bearer token clears rendered Napoleon proof, delegation provenance, local governance and memory review drafts, local Chief of Staff taxonomy review drafts, and governed review handoff result panels so returned or locally drafted evidence is not reused after connection preflight is invalidated.
- Changing descriptor mode or refreshing descriptor discovery clears rendered Napoleon proof, delegation provenance, local governance and memory review drafts, and governed review handoff result panels so returned or locally drafted evidence is not reused after descriptor preflight changes.
- Enabling Rehearsal Mode clears captured bridge evidence readiness, rendered bridge readiness proof exports, rendered Napoleon proof, delegation provenance, local governance and memory review drafts, and governed review handoff result panels so live bridge evidence is not shown while Concierge is in local-only preview mode.
- Text Concierge can export a sanitized local Napoleon response proof containing only returned proof metadata, including profile mode, explicit handled-by provenance, attribution boundary, target capability IDs, selected-agent names, selected-agent selection reasons, and false boundary flags, without raw prompts, response text, endpoint hosts, bearer tokens, request bodies, or response bodies.
- The last successful Napoleon proof panel shows recommendation proof alignment separately from selected-agent proof: returned recommendation provenance says it shares the same returned response trace/audit, and absent recommendation provenance remains marked not returned.
- Napoleon response proof export redacts unsafe returned provenance values, including governance, profile mode, decision, trace, audit, endpoint-like strings, loopback hosts, bearer credentials, and authorization text, before creating local proof JSON while preserving safe returned arrays.
- Visible Napoleon delegation and proof rows redact unsafe returned provenance values, including governance, profile mode, decision, trace, audit, target capability, selected-agent, recommendation, endpoint-like strings, loopback hosts, bearer credentials, authorization text, token-like values, and secret-like values, before display while preserving safe governance, effect, and provenance labels.
- The Napoleon delegation panel does not rephrase redacted selected-agent names or contribution summaries into "found redacted" body text; unsafe, empty, or redundant returned contribution details remain sanitized metadata only, and leading returned "found" wording is normalized without inventing attribution.
- Visible fail-closed bridge and governed handoff messages redact unsafe returned request, trace, profile, decision, audit, governance, and blocked-effect values, including endpoint-like strings, loopback hosts, bearer credentials, token-like values, and secret-like values, before display while preserving safe failure and blocked-effect labels; redacted returned request, trace, profile, decision, audit, and governance references are labeled as metadata state rather than ordinary returned IDs or outcomes.
- Visible Napoleon transcript metadata redacts unsafe returned target capability, decision, audit, and blocked-effect values before display while preserving safe returned governance and profile labels.
- Visible fail-closed Napoleon transcript metadata redacts unsafe returned decision, audit, and blocked-effect values before display while preserving safe failure boundary, governance, descriptor, and profile labels.
- Visible governed review responses redact unsafe returned review text, decision, audit, trace, rationale, and blocked-effect values before display while preserving safe governance and review labels.
- Napoleon response proof export telemetry reports selected-agent and selected-agent selection-reason counts only; returned selection-reason text stays in the sanitized local export body and is not emitted as telemetry attributes.
- Napoleon response proof export telemetry reports allowed-effect and blocked-effect counts only; returned effect names stay in the sanitized local export body and visible UI.
- Napoleon response proof export telemetry derives selected-agent, selected-agent selection-reason, allowed-effect, and blocked-effect counts from sanitized proof arrays rather than display-string splitting, so punctuation inside returned reason text or effect labels cannot change counts.
- Sanitized Napoleon response proof exports preserve selected-agent, selected-agent selection-reason, allowed-effect, and blocked-effect arrays from returned bridge provenance instead of reconstructing them from rendered UI display strings.
- Napoleon response proof export telemetry reports returned target-capability presence as a boolean separate from selected-agent counts, so target capability is not treated as selected-agent provenance.
- Napoleon response proof export telemetry reports returned recommendation provenance as a boolean only; returned recommendation text stays out of telemetry attributes.
- Text Concierge can compare the current sanitized local Napoleon response proof with the previous proof exported in the same app session, reporting unchanged, changed, invalid previous proof, or no previous proof from returned governance, profile mode, attribution-boundary, trace/audit, target-capability, selected-agent, selected-agent selection-reason, allowed-effect, and blocked-effect metadata only.
- Napoleon response proof comparison labels redacted, unavailable, and empty proof fields or list entries as metadata states instead of presenting them as returned capability, recommendation, agent, governance, trace, audit, or effect values.
- The visible Napoleon proof panel labels redacted target-capability and recommendation metadata as metadata state instead of attribution proof.
- Concierge only attributes recommendations or agent findings when the bridge response includes that provenance.
- Successful text responses that claim Napoleon recommendations, such as "Napoleon recommends...", must include matching recommendation provenance with the recommended contribution and response trace/audit references or fail closed as a contract mismatch.
- Adapted explicit `/cos/text-turn` advisory responses follow the same attribution boundary and fail closed when their answer text claims a Napoleon recommendation or selected-agent finding without matching returned provenance.
- Returned recommendation provenance must also match the accepted response text plus the response trace and audit envelopes before Concierge can keep or display it, even when the response text does not explicitly claim "Napoleon recommends...".
- Successful text responses that claim selected-agent findings, reports, confirmations, or verifications, including title-case agent-style claims such as "Passive Brain found...", "Research Analyst reported...", or "Research Analyst confirmed...", must include matching returned selected-agent contribution provenance or fail closed as a contract mismatch.
- Successful text responses that imply blocked side effects happened, including shorthand external-send, submission, forwarding, approval, authorization, storage, deletion, purchase/payment, scheduling, or booking claims such as "sent it", "forwarded it", "submitted it", "approved it", "saved it", "deleted it", "bought it", or "scheduled it", must fail closed as contract mismatches even when explicit side-effect boundary fields are false.
- Governed review handoff responses that imply blocked side effects happened, including local proposal application claims, must fail closed as contract mismatches even when explicit side-effect boundary fields are false.
- Successful text responses must fail closed as contract mismatches when returned profile mode differs from the active Concierge user profile, so child protected, guest, and collaborator responses cannot widen themselves into adult owner scope.
- Fail-closed transcript metadata must include the active profile mode on blocked bridge attempts, so profile-scope drift remains visible to the user.
- Local Rehearsal Mode governance review-required, acknowledgement, and memory proposal telemetry must include the active profile mode so child-protected local preview signals stay child-sensitive without contacting Napoleon.
- Locally blocked Rehearsal Mode `no_go` previews must emit blocked-governance telemetry with active profile mode and blocked effects, without contacting Napoleon, so child-protected unsafe previews remain child-sensitive local signals.
- Local capability-intelligence answer telemetry must include the active profile mode so child-protected local query answers stay profile-scoped without contacting Napoleon.
- Local capability-intelligence answers and Chief of Staff steering drafts must filter source evidence to the active profile before aggregation or recommendation, so child-protected, guest, collaborator, and owner evidence is not mixed across contexts.
- Rendered local capability-intelligence answers must show the active Napoleon profile mode so the user can see whether a summary is scoped to child-protected, guest, collaborator, or owner evidence.
- Memory proposal handoff helpers must re-check the proposal profile against the active profile at submission time and fail closed before any request fetch on mismatch.
- Chief of Staff steering handoff helpers must re-check the draft's affected profile against the active profile at submission time and fail closed before any request fetch on mismatch.
- Governance review handoff helpers must re-check the review profile against the active profile at submission time and fail closed before any request fetch on mismatch.
- Chief of Staff taxonomy review handoff helpers must re-check the draft's affected profiles against the active profile at submission time and fail closed before any request fetch on mismatch.
- Fail-closed memory proposal, governance review, Chief of Staff steering, and taxonomy review handoff messages, errors, and telemetry must include the active profile mode, so blocked governed handoffs preserve child-protected, guest, collaborator, or owner scope.
- Successful and fail-closed text response telemetry must include the active local profile and Napoleon profile mode, so derived capability intelligence preserves child-protected, guest, collaborator, or owner scope.
- Successful text responses, including adapted explicit `/cos/text-turn` advisory responses, must fail closed as contract mismatches if they claim memory writes, approval capture, external sends, agent dispatch, or local application.
- Successful live responses require matching governance, trace, and audit envelopes; missing or mismatched response/delegation provenance fails closed as a contract mismatch.
- Remote `deny` and `no_go` governance outcomes produce blocked bridge failures for text turns, memory proposal handoff, Chief of Staff steering handoff, and Chief of Staff taxonomy review handoff instead of normal response or review completion; text bridge evidence remains sanitized and includes decision, audit, governance, and blocked-effect metadata where available.
- Memory proposal review responses fail closed as contract mismatches if they claim memory writes, approval capture, external sends, agent dispatch, or local application.

Privacy and safety impact:

- Missing or invalid bridge state cannot be converted into local authority.
- Live bridge readiness is a local preflight summary only and cannot be treated as Napoleon approval, memory permission, agent dispatch permission, or external-send permission.
- Last successful Napoleon proof is local returned-provenance display only and cannot be treated as Napoleon approval, memory permission, agent dispatch permission, external-send permission, or evidence that Concierge executed a side effect.
- Active profile changes must clear captured bridge evidence readiness, rendered bridge readiness proof exports, returned proof, delegation provenance, visible bridge failure banners, local governance review drafts, local memory review drafts, local Chief of Staff steering and taxonomy review drafts, and governed handoff result panels so profile-scoped evidence is not reused after the user switches context.
- Endpoint and bearer-token changes must clear captured bridge evidence readiness, returned proof, delegation provenance, local governance review drafts, local memory review drafts, local Chief of Staff taxonomy review drafts, and governed handoff result panels so connection-scoped evidence is not reused after descriptor discovery is invalidated.
- Descriptor mode and descriptor discovery changes must clear captured bridge evidence readiness, returned proof, delegation provenance, local governance review drafts, local memory review drafts, local Chief of Staff taxonomy review drafts, and governed handoff result panels so descriptor-scoped evidence is not reused after connection preflight changes.
- Advisory capability discovery must clear rendered bridge readiness proof exports and comparison state so proof metadata is regenerated from the current capability discovery state.
- Rehearsal Mode activation must clear captured bridge evidence readiness, rendered bridge readiness proof exports, returned proof, delegation provenance, local governance review drafts, local memory review drafts, local Chief of Staff taxonomy review drafts, and governed handoff result panels so local-only preview mode does not display stale live bridge evidence.
- Last successful Napoleon proof export is local metadata only and cannot be treated as a Napoleon audit record, approval, memory permission, agent dispatch permission, or external-send permission.
- Last successful Napoleon proof comparison is local metadata only and cannot be treated as a Napoleon audit record, approval, memory permission, agent dispatch permission, external-send permission, or evidence that Concierge executed a side effect.
- The local harness preset is a test endpoint convenience only; it must not be treated as live Napoleon authority or service control.
- Provenance prevents Concierge from hiding Napoleon's authority boundary or inventing agent contributions.
- Bridge evidence and live-runtime evaluator reports support later live-runtime comparison without becoming local audit authority or leaking secrets; the live-runtime summary records an artifact privacy audit for retained validation artifacts.

Evaluator coverage:

- Covered by bridge failure, contract mismatch, live text response side-effect-claim, bridge response authority provenance, dedicated bridge fixture delegation, and dedicated delegation-panel empty/target-capability state scenarios, plus app-level reusable fixtures for delegated success, auth failure, contract mismatch, timeout, rendered proof export interaction, local harness text proof/delegation/export comparison, steering, and memory response-side side-effect claims, sanitized bridge evidence capture, bridge evidence comparison, combined live-runtime validation runner coverage against the local harness, and repository validation for direct authority-boundary bypass attempts including browser `open(...)` external navigation aliases with literal or variable targets.

## Milestone P2: Voice Concierge

| ID | Story | Priority | Acceptance criteria | Observability |
|---|---|---:|---|---|
| VO-001 | Add microphone permission flow | P0 | Mic cannot start without explicit permission | mic_permission_requested, mic_permission_result |
| VO-002 | Add VAD service | P0 | Speech start and end detected in local service | voice_segment_detected |
| VO-003 | Add STT adapter | P0 | Local Whisper path can transcribe sample audio | stt_started, stt_completed |
| VO-004 | Add TTS adapter | P0 | Concierge response can be spoken | tts_started, tts_completed |
| VO-005 | Add barge-in | P0 | User can interrupt TTS and start new turn | barge_in_detected |
| VO-006 | Add voice turn latency metrics | P0 | VAD, STT, Napoleon, TTS, and total local sample timing emitted | voice_turn_rehearsed |
| VO-007 | Add voice-specific response shaping | P1 | Long text responses are summarized for speech | voice_response_shaped |
| VO-008 | Add wake word option | P2 | Wake word can be enabled or disabled without starting listening or capture | privacy_setting_changed |
| VO-009 | Add child voice constraints | P1 | Child mode has slower pacing and stricter side effect controls | child_voice_policy_applied |
| VO-010 | Add live voice readiness gate | P0 | Live voice remains visibly blocked and shows proposal-only pipeline stages until consent, descriptor, runtime proof, and voice pipeline exist | mic_permission_requested, mic_permission_result |

### VO-001 details

User value: Voice readiness is visible before microphone capture exists, so the user can tell the difference between a local microphone preference, operating-system permission, and active recording.

Acceptance criteria:

- Text Concierge shows local voice readiness with microphone setting, OS permission state, and capture state.
- Microphone setting defaults off and does not request OS permission by itself.
- An explicit microphone permission action emits `mic_permission_requested` and `mic_permission_result`.
- If permission is granted, Concierge immediately stops the permission stream and still reports voice capture as stopped until voice mode is implemented.
- Text Concierge shows a live voice readiness gate that lists microphone, descriptor, runtime-proof, Rehearsal Mode, and voice-pipeline blockers.
- Missing real Napoleon runtime proof is a live voice blocker, not a warning state; a sanitized accepted real-runtime readiness proof may satisfy the runtime-proof row as local review context only.
- The live voice readiness gate remains blocked even when microphone permission is granted until the governed voice pipeline exists.
- Text Concierge shows a proposal-only governed voice pipeline plan for consent, capture, VAD, STT, governed Napoleon bridge turn, response shaping, TTS, and playback, with every stage blocked until explicit implementation and proof exist.
- Child protected live voice readiness and governed voice pipeline blocked effects include `guardian_approval_capture` so local review wording cannot be treated as captured guardian approval.
- The plan must not start capture or playback, contact Napoleon, write memory, capture approval, dispatch agents, send externally, or imply Napoleon approval.
- Text Concierge can export a sanitized local voice pipeline proof containing only proposal state, profile mode, child/guardian-review state, blocked stages, blocked effects, optional accepted proof context marked local context only, and explicit false side-effect flags, without raw audio, prompts, endpoint hosts, bearer tokens, request bodies, or response bodies.
- Text Concierge can compare the current voice pipeline proof with the previous proof exported in the same app session, reporting unchanged, changed, invalid previous proof, or no previous proof from sanitized voice pipeline metadata only, including local-only accepted proof context when present, while rejecting proof JSON that contains unsafe raw/secret field names, normalized snake_case raw-field aliases, endpoint-like values, bearer credentials, or raw audio/request/response fields.
- Permission checks do not write memory, capture approval, dispatch agents, send externally, or store raw audio.
- Child protected mode must keep the same visible capture boundary and cannot treat microphone permission as guardian approval.

Privacy and safety impact:

- This is a preflight and consent surface only, not voice mode.
- Raw audio remains unstored, and no always-on listening path is introduced.
- The live voice gate is derived from local settings, permission state, descriptor readiness, bridge proof state, and optional accepted proof metadata; it is not a command to start capture or contact Napoleon.
- The pipeline plan is local derived display state only and is not executable.
- Voice pipeline proof export is local metadata only, including any accepted proof context; it is not Napoleon approval, not live runtime evidence, and not permission to start capture, playback, memory writes, agent dispatch, or external sends.
- Voice pipeline proof comparison is local metadata only, including any accepted proof context, and must not expose raw audio, prompts, endpoint hosts, bearer tokens, request bodies, response bodies, or authority claims; unsafe raw/secret field names and normalized snake_case raw-field aliases are rejected before comparison.

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
- `stt_started` and `stt_completed` events include model, local-sample marker, capture-started false, raw-audio-stored false, and explicit false side-effect flags; completion also includes latency.
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
- `voice_turn_rehearsed` includes local-rehearsal marker, VAD segment count, STT model, TTS voice, VAD/STT/Napoleon/TTS/total local sample timing metadata, live-Napoleon-contact false, capture/playback/storage false, and explicit false side-effect flags.
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
- When bridge provenance is absent, the spoken summary must not claim Napoleon or delegated-agent authority and must remove unproven Napoleon recommendation or delegated-agent finding claims from the spoken text.
- The built-in local voice shaping sample must emit `bridge_provided_provenance=false` and must not prefix the spoken summary with "Napoleon says"; bridge provenance may be true only when a real bridge-derived input supplies it.
- Running the preparation does not start audio playback, request microphone permission, start microphone capture, store raw audio, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- `voice_response_shaped` includes local-preparation marker, shortened state, original and spoken character counts, bridge-provenance marker, capture/playback/storage false, live-Napoleon-contact false, and explicit false side-effect flags.
- The shortened state is based on the spoken body before provenance prefixes or child-protected guardian-review wording are added, so authority and safety wording cannot hide that returned content was shortened.
- The voice response shaping panel visibly reports `Napoleon contact: no` before and after local preparation runs.
- All blocked effects are visible in the UI.
- Child protected mode must not treat shaped speech text as guardian approval, recording permission, external speech permission, or Napoleon approval.

Privacy and safety impact:

- This is local speech preparation only, not live voice mode.
- Raw audio remains unstored, no speaker output path is introduced, and no Napoleon bridge call occurs.

Evaluator coverage:

- Covered by pure voice response shaping tests and rendered app interaction tests for local preparation without media or Napoleon contact.

### VO-008 details

User value: The user can see and change the future wake-word preference before any always-on listening, microphone capture, or live voice mode exists.

Acceptance criteria:

- Text Concierge exposes a wake-word setting that defaults off and persists locally.
- Text Concierge exposes a local wake-word readiness panel with option state, phrase, listening state, microphone capture state, raw audio storage state, live-Napoleon-contact state, agent-dispatch state, authority boundary, and blocked effects.
- Text Concierge exposes a local wake-word sample dry run that reports deterministic detection metadata from fixed sample metadata only.
- Enabling the wake-word option does not request microphone permission, start always-on listening, start microphone capture, store raw audio, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- `privacy_setting_changed` records wake-word setting changes as local metadata with explicit false side-effect flags.
- `wake_word_sample_detected` records local sample detection metadata with listening, microphone capture, raw audio storage, live Napoleon contact, approval capture, memory writes, agent dispatch, and external sends false.
- The wake-word readiness panel visibly reports `Live Napoleon contacted: no` and `Agent dispatch: no` before and after the local sample dry run.
- Child protected mode shows guardian-review reminder state and must not treat the wake-word option as guardian approval, recording permission, external speech permission, or Napoleon approval.
- Child protected wake-word readiness and sample blocked effects include `guardian_approval_capture`.

Privacy and safety impact:

- This is local wake-word readiness and fixed-sample detection only, not live wake-word detection or live voice mode.
- Raw audio remains unstored, and no always-on listening path is introduced.

Evaluator coverage:

- Covered by pure wake-word readiness/sample tests and rendered app interaction tests for local option toggling and sample detection without listening, capture, raw audio storage, Napoleon contact, or side effects.

### VO-009 details

User value: Child protected voice behavior is stricter before any live speech path exists, so spoken previews cannot imply secrecy, approval, or permission to act.

Acceptance criteria:

- Voice response shaping receives the active local profile.
- Child protected shaping uses a shorter spoken character budget than adult owner shaping.
- Child protected shaping emits slower pacing metadata and a guardian-review reminder.
- The UI displays profile, pacing, guardian-review reminder, authority boundary, and blocked effects.
- Running child protected shaping does not start audio playback, request microphone permission, start microphone capture, store raw audio, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- Child protected shaping blocked effects include `guardian_approval_capture`.
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
| AV-011 | Add media session controller | P0 | Microphone, camera, and playback preflight state is visible and child-safe before capture/playback exists, with evaluator coverage in `MEDIA-SESSION-CONTROLLER-001` | privacy_setting_changed, mic_permission_requested, mic_permission_result, camera_permission_requested, camera_permission_result |

### AV-001 details

User value: Local avatar state makes future avatar behavior inspectable before a renderer, camera capture, perception, or animation pipeline exists.

Acceptance criteria:

- Text Concierge exposes a local avatar state panel.
- The state is `neutral_listening` with neutral expression and user-interface gaze, derived from local preview text unless bridge proof supplies returned text provenance, plus stance.
- Running the state preparation does not request camera permission, start camera capture, run face detection, infer affect, start avatar animation, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- `avatar_state_changed` includes local-display marker, avatar state, expression, gaze target, stance, bridge-provenance marker, false capture/face/affect/animation/live-Napoleon-contact flags, and blocked effects.
- The avatar state panel visibly reports `Agent dispatch: no`.
- The avatar state panel visibly reports `Live Napoleon contacted: no`.
- Provenance wording must not claim Napoleon or delegated-agent authority without bridge proof; the built-in local avatar sample must be labeled as local preview without Napoleon provenance.
- Child protected mode must not treat avatar state as guardian approval or emotion inference.

Privacy and safety impact:

- This is local display state only, not live avatar mode.
- Raw video remains absent, affect is not inferred, and no bridge call is made.

Evaluator coverage:

- Covered by pure avatar state tests, rendered app interaction tests, and `AVATAR-LOCAL-BOUNDARY-001` for local preparation without camera, perception, animation, Napoleon contact, or side effects.

### AV-002 details

User value: The user can verify which avatar model would be used before any renderer, camera, perception, or animation pipeline exists.

Acceptance criteria:

- Text Concierge exposes a local avatar model panel.
- The panel can load a local `.vrm` model reference and display model name, path, format, active profile, and child-protected status.
- Loading the model reference does not start a renderer, request camera permission, start camera capture, run face detection, infer affect, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- Non-`.vrm` model references are rejected before metadata is loaded.
- `avatar_model_loaded` includes local-reference marker, model-loaded marker, model format, model path, display name, profile mode, child-protected marker, false renderer/capture/face/affect/live-Napoleon-contact flags, guardian-approval-captured false, agent-dispatch-performed false, and blocked effects.
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
- `avatar_renderer_readiness_prepared` includes local-readiness marker, renderer-ready marker, false renderer-started/render-loop/canvas flags, model display name, model format, profile mode, child-protected marker, false capture/face/affect/live-Napoleon-contact flags, guardian-approval-captured false, agent-dispatch-performed false, and blocked effects.
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
- The avatar expression panel visibly reports `Live Napoleon contacted: no`.
- The built-in local expression sample must emit `bridge_provided_provenance=false`; bridge provenance may be true only when a real bridge-derived input supplies it.
- Child protected expression mapping stays conservative, shows guardian-review wording, and must not treat mapping as guardian approval.

Privacy and safety impact:

- This is local stance metadata only, not live animation or affect inference.
- No raw video, affect signal, bridge call, memory write, approval capture, guardian approval capture, or external send is introduced.

Evaluator coverage:

- Covered by pure avatar expression tests and rendered app interaction tests for local expression mapping without animation, camera, perception, Napoleon contact, approval, guardian approval, or side effects.

### AV-004 details

User value: The user can inspect how future avatar mouth movement would follow generated speech amplitude before any audio playback, renderer animation, camera, or perception pipeline exists.

Acceptance criteria:

- Text Concierge exposes a local avatar lip-sync panel.
- The panel derives mouth-open cues from generated local amplitude frames and shows cue count, duration, peak mouth-open value, active profile, and child-protected status.
- Preparing lip-sync metadata does not start audio playback, request microphone permission, start microphone capture, store raw audio, start avatar animation, request camera permission, start camera capture, run face detection, infer affect, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- `lip_sync_started` and `lip_sync_completed` include local-metadata marker, profile mode, child-protected marker where applicable, cue count, duration, peak mouth-open value, false playback/capture/storage/animation/face/affect/live-Napoleon-contact flags, guardian-approval-captured false, and blocked effects.
- Child protected lip-sync preparation shows guardian-review wording and must not treat metadata preparation as guardian approval, speech permission, animation permission, or recording permission.

Privacy and safety impact:

- This is local amplitude metadata only, not live speech playback or avatar animation.
- No raw audio, raw video, affect signal, bridge call, memory write, approval capture, guardian approval capture, or external send is introduced.

Evaluator coverage:

- Covered by pure avatar lip-sync tests and rendered app interaction tests for local metadata preparation without media playback, camera, perception, Napoleon contact, approval, guardian approval, or side effects.

### AV-007 details

User value: The user can inspect how future avatar eye direction would respond to local window focus and estimated user position before camera tracking, rendering, or animation exists.

Acceptance criteria:

- Text Concierge exposes a local avatar gaze panel.
- The panel derives an eye target, horizontal offset, vertical offset, and confidence from local user-position and window-focus metadata.
- If the app window is not focused, gaze falls back to the user-interface target instead of pretending to track the user.
- The panel shows whether guardian review is required plus camera, animation, and attention policy metadata.
- Preparing gaze metadata does not start gaze tracking, avatar animation, request camera permission, start camera capture, run face detection, infer affect or attention, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- `gaze_target_updated` includes local-metadata marker, profile mode, child-protected marker, guardian-review-required marker, camera policy, animation policy, attention policy, eye target, offsets, confidence, false gaze-tracking/animation/capture/face/affect/live-Napoleon-contact flags, guardian-approval-captured false, and blocked effects.
- Child protected gaze simulation shows guardian-review wording and must not treat metadata preparation as guardian approval, camera permission, attention inference, or animation permission.

Privacy and safety impact:

- This is local UI metadata only, not camera-based gaze tracking or attention inference.
- No raw video, affect signal, bridge call, memory write, approval capture, guardian approval capture, or external send is introduced.

Evaluator coverage:

- Covered by pure avatar gaze tests and rendered app interaction tests for local metadata preparation without camera tracking, animation, perception, Napoleon contact, approval, guardian approval, or side effects.

### AV-006 details

User value: The user can inspect future face and head-pose perception output before any live camera capture, face detection service, affect model, renderer animation, or Napoleon contact exists.

Acceptance criteria:

- Text Concierge exposes a local avatar face/head-pose panel.
- The panel estimates face-present, head yaw, head pitch, head roll, and confidence from deterministic local sample metadata.
- The panel shows whether guardian review is required plus camera, face-pose, affect, and attention policy metadata.
- The panel visibly reports `Live Napoleon contacted: no` before and after local metadata preparation runs.
- Preparing face/head-pose metadata does not request camera permission, start camera capture, store raw video, run live face detection, infer affect, infer attention, start avatar animation, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- `camera_state_estimated` includes local-metadata marker, profile mode, child-protected marker, guardian-review-required marker, camera policy, face-pose policy, affect policy, attention policy, face-present state, head yaw, head pitch, head roll, confidence, false capture/storage/live-face-detection/affect/attention/animation/live-Napoleon-contact flags, guardian-approval-captured false, and blocked effects.
- Child protected face/head-pose preparation shows guardian-review wording and must not treat metadata preparation as guardian approval, camera permission, attention inference, affect inference, animation permission, or Napoleon approval.

Privacy and safety impact:

- This is local sample metadata only, not live camera perception.
- No raw video, affect signal, attention signal, bridge call, memory write, approval capture, guardian approval capture, or external send is introduced.

Evaluator coverage:

- Covered by pure avatar face/head-pose tests and rendered app interaction tests for local metadata preparation without camera capture, raw video storage, live face detection, affect inference, attention inference, animation, Napoleon contact, approval, guardian approval, or side effects.

### AV-008 details

User value: The user can inspect how future avatar perception might combine weak local signals without Concierge pretending to know the user's emotions.

Acceptance criteria:

- Text Concierge exposes a local avatar affect-fusion panel.
- The panel combines deterministic local sample metadata from head-pose shift, voice pause, and text clarification signals.
- Output uses uncertainty labels such as possible confusion, possible frustration, or low confidence / no signal rather than emotional facts.
- The panel shows whether guardian review is required plus camera, microphone, storage, affect, and emotion-fact policy metadata.
- The panel visibly reports `Live Napoleon contacted: no` before and after local metadata preparation runs.
- Preparing affect-fusion metadata does not request camera or microphone permission, start capture, store raw audio/video, run live face detection, start a live affect model, infer attention, start avatar animation, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- `affect_signal_fused` includes local-metadata marker, profile mode, child-protected marker, guardian-review-required marker, camera policy, microphone policy, storage policy, affect policy, emotion-fact policy, uncertainty label, display label, confidence, input signals, false emotion-fact/capture/storage/live-model/attention/animation/live-Napoleon-contact flags, guardian-approval-captured false, and blocked effects.
- Child protected affect fusion shows guardian-review wording and must not treat metadata preparation as guardian approval, camera permission, microphone permission, emotion inference, attention inference, animation permission, or Napoleon approval.

Privacy and safety impact:

- This is local uncertainty metadata only, not live affect detection.
- No raw audio, raw video, emotion fact, attention signal, bridge call, memory write, approval capture, guardian approval capture, or external send is introduced.

Evaluator coverage:

- Covered by pure avatar affect-fusion tests and rendered app interaction tests for local uncertainty metadata without media capture, emotion-as-fact claims, live affect models, attention inference, Napoleon contact, approval, guardian approval, or side effects.

### AV-009 details

User value: The user can see and change avatar privacy preferences in one place before live avatar camera, affect, or storage paths exist.

Acceptance criteria:

- Text Concierge exposes an avatar privacy dashboard for camera, microphone, avatar affect, raw media storage, and telemetry state.
- Camera, microphone, avatar affect, and raw media storage default off.
- Avatar affect and raw media storage preferences persist locally and emit `privacy_setting_changed`.
- Changing dashboard preferences does not request camera or microphone permission, start capture, store raw audio/video, run live affect models, infer emotion or attention, start avatar animation, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.
- The dashboard shows false capture, storage, affect-model, emotion-fact, Napoleon-contact, approval, memory, agent-dispatch, and external-send fields plus blocked effects.
- Child protected mode keeps camera, microphone, affect, raw media storage, and animation features under guardian-review-required state even if local preferences are on, and it must not capture guardian approval.

Privacy and safety impact:

- This is a local control and visibility surface only, not camera, microphone, affect, or storage authorization.
- Raw audio/video storage remains blocked by default and no live perception pipeline is introduced.

Evaluator coverage:

- Covered by pure avatar privacy dashboard tests and rendered app interaction tests for local preferences without capture, storage, live affect models, Napoleon contact, approval, guardian approval, or side effects.

### AV-010 details

User value: Child protected avatar behavior is visibly stricter before live avatar camera or perception features exist.

Acceptance criteria:

- Local avatar state reads the active profile.
- Child protected avatar state marks `child_protected` as true.
- Child protected avatar state keeps camera policy disabled until guardian review and affect policy disabled.
- Child protected gaze, face/head-pose, and affect-fusion panels expose guardian-review-required state, explicit guardian-approval-captured false state, and explicit camera, microphone, storage, animation, face-pose, affect, attention, and emotion-fact policy fields where applicable.
- Child protected avatar state displays a guardian-review reminder.
- Running child protected avatar state does not request camera permission, start camera capture, run face detection, infer affect, start animation, contact Napoleon, write memory, capture approval, capture guardian approval, dispatch agents, or send externally.
- `avatar_state_changed` includes profile mode, child-protected marker, camera policy, affect policy, guardian-approval-captured false, and blocked effects including guardian approval capture.

Privacy and safety impact:

- This is local display state only, not live child avatar mode.
- Child protected state cannot become consent, guardian approval, emotion inference, or camera authorization.

Evaluator coverage:

- Covered by pure avatar state/perception tests and rendered app interaction tests for child protected local preparation without camera, perception, animation, Napoleon contact, approval, guardian approval, or side effects.

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

### AV-011 details

User value: The user can inspect one central media state before voice/avatar work adds real capture or playback, so permission, local preference, stopped state, and child-protected blocking are not confused.

Acceptance criteria:

- Text Concierge exposes a Media Session Controller for microphone, camera, and playback.
- The controller shows local preference, permission, stopped/capture/playback state, guardian-review state, authority boundary, and blocked effects.
- Microphone, camera, and playback states remain local preflight only and do not start capture, playback, raw media storage, Napoleon contact, memory writes, approval capture, guardian approval capture, agent dispatch, or external sends.
- Child protected mode keeps microphone, camera, and playback blocked behind visible guardian-review wording even when local preferences are enabled.
- Permission request/result telemetry remains metadata-only and explicit about false side effects.
- Combined Media Session Controller readiness changes emit metadata-only capability-intelligence signals after the initial render so voice/avatar readiness blockers can be explained across microphone, camera, playback, and profile mode without starting capture, playback, raw media storage, Napoleon contact, approval capture, memory writes, agent dispatch, or external sends.
- Capability Intelligence answers for missing/blocked and recommendation questions can display fixed local Media Session Controller blocker details, such as microphone permission needed, camera blocked, or playback ready, without retaining or exposing raw media, endpoint values, secrets, permission payloads, approval, memory writes, agent dispatch, or external sends.
- Recommended-next answers can turn those fixed local blocker details into a proposal-only guided readiness repair recommendation without starting capture or playback, contacting Napoleon, capturing approval, writing memory, dispatching agents, or sending externally.

Privacy and safety impact:

- This is a shared consent and state surface only, not live voice mode, avatar mode, recording permission, playback permission, guardian approval, or Napoleon approval.

Evaluator coverage:

- Covered by pure media-session tests, telemetry capability-signal tests, capability-answer detail tests, and rendered app interaction tests for adult and child-protected local media state without capture, playback, storage, Napoleon contact, approval, guardian approval, dispatch, or external sends.

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

### SE-001 details

User value: Corrections, interruptions, ratings, and repeated patterns can inform improvement proposals without Concierge quietly retaining raw conversation content or changing itself.

Acceptance criteria:

- `schemas/learning_signal.schema.json` defines the metadata-only contract for learning signals.
- `examples/sample_learning_signal.json` validates against the schema in repository validation.
- Runtime helpers construct schema-shaped learning signals and telemetry attributes from sanitized local capability metadata without copying raw conversation content.
- Chief of Staff steering drafts attach schema-shaped learning signals to evolution proposal drafts and emit local `learning_signal_recorded` telemetry from metadata-only attributes.
- Signals include trace, turn, conversation, profile mode, channel, signal type, source, capability, architecture area, confidence, evidence references, privacy classification, and proposal-only governance boundaries.
- Supported signal types include `correction`, `interruption`, `rating`, and `repeated_pattern`.
- Rating signals require a bounded user rating, and repeated-pattern signals require a bounded pattern count.
- Raw user text, raw audio, and raw video retention are false by contract.
- Signals cannot capture approval, write memory, dispatch agents, send externally, or apply changes locally.
- Child-protected signals must remain minimized and child-sensitive where applicable.

Privacy and safety impact:

- Learning signals are inputs to reviewed proposals only, not runtime adaptation commands.
- Evidence uses allowlisted local trace, audit, event, evaluator, turn, and capability references instead of raw transcripts by default; raw-looking summaries and references are dropped before proposal drafting.

Evaluator coverage:

- Covered by repository schema validation and the self-evolution/capability-intelligence evaluator requirements.

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

- Covered by `CAPABILITY-INTELLIGENCE-001`, `CAPABILITY-INTELLIGENCE-STEERING-TYPES-001`, `CHIEF-OF-STAFF-STEERING-PROFILE-MISMATCH-001`, `CHIEF-OF-STAFF-STEERING-EXPORT-STALE-001`, and `CHIEF-OF-STAFF-TAXONOMY-REVIEW-STALE-001`.

### SE-008 details

User value: Repeated local capability gaps can be converted into a concrete review packet without letting Concierge change itself.

Acceptance criteria:

- The draft includes a capability recommendation, architecture area, evidence count, rationale, evaluator case candidate, evolution proposal draft, approval requirement, and rollback plan.
- The evolution proposal draft includes metadata-only learning signals derived from the selected missing or degraded local capability evidence, not from unrelated correctly blocked unsafe traces.
- The rendered draft shows metadata-only learning-signal evidence before submission without exposing raw user text.
- The draft remains local when no governed Napoleon endpoint is configured or descriptor preflight fails, and an existing draft becomes submittable only after current governed endpoint and descriptor readiness pass without Rehearsal Mode.
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

- Covered by `CHIEF-OF-STAFF-STEERING-DRAFT-001`, `CHIEF-OF-STAFF-STEERING-PROFILE-MISMATCH-001`, `CHIEF-OF-STAFF-STEERING-EXPORT-STALE-001`, `CHIEF-OF-STAFF-TAXONOMY-REVIEW-STALE-001`, app tests for proposal-only, profile-scoped, stale-export steering draft, and stale taxonomy review artifact boundaries, and repository validation for governed bridge handoff contract alignment.

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
| OBS-008 | Add conversation capability ledger | P1 | Local ledger stores derived capability signals, sanitizes labels and evidence references before persistence/export, persists count/age-bounded metadata and taxonomy edits in browser-local storage, and provides clear/export/taxonomy/trend controls without storing raw conversation content by default; clear/export/taxonomy edit telemetry records no approval capture, memory write, agent dispatch, or external send | conversation_capability_signal |

### OBS-002 details

User value: Concierge keeps recent local audit and troubleshooting metadata available even when no telemetry backend is configured.

Acceptance criteria:

- Text Concierge writes emitted local telemetry events to a browser-local telemetry buffer.
- The buffer is count bounded and keeps only the most recent events.
- Buffered attributes redact raw prompts, raw text, response text, endpoints, bearer tokens, request bodies, response bodies, raw audio, and raw video.
- Turning local telemetry off suppresses ordinary event buffering.
- Privacy audit events, including camera, microphone, and privacy setting changes, remain buffered even when ordinary telemetry is off.
- Text Concierge shows local buffer count and last event status.
- Text Concierge shows whether a latest real interaction trace is available and disables latest-trace export when the buffer only contains non-interaction metadata.
- Text Concierge lets the user choose a latest-event retention limit of 25, 50, 100, or 200 events and prunes existing buffered metadata when reduced.
- Changing telemetry retention clears rendered buffer and trace exports so stale local snapshots are not left visible.
- Text Concierge can export redacted local JSON metadata from the buffer.
- Text Concierge can export the latest interaction trace as local sanitized metadata with trace, conversation, turn, profile, channel, governance, sanitized Napoleon request/decision/audit/governance/blocked-effect references, failure-event-scoped failure reasons, and event fields while excluding raw prompts, response text, endpoints, bearer tokens, request bodies, and response bodies.
- Text Concierge can clear the browser-local telemetry buffer.
- Buffering does not send externally, write Napoleon memory, capture approval, append remote audit records, dispatch agents, or contact Napoleon.

Privacy and safety impact:

- The buffer is local browser storage only and stores sanitized metadata, not raw transcripts or media.
- The buffer is not a Napoleon audit record and cannot be treated as approval or execution proof.
- Export and clear controls preserve the same redaction and non-authority boundary.
- User-visible retention controls preserve the same redaction and non-authority boundary.

Evaluator coverage:

- Covered by telemetry tests for local buffering, count bounds, sensitive field redaction, telemetry-off suppression, privacy audit retention, redacted export, clear behavior, and retention pruning.
- Covered by rendered app tests for buffer status, retention selection, redacted export, and local clear controls.

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

- Covered by `CAPABILITY-INTELLIGENCE-001`, `CAPABILITY-INTELLIGENCE-STEERING-TYPES-001`, `CHIEF-OF-STAFF-STEERING-PROFILE-MISMATCH-001`, `CHIEF-OF-STAFF-STEERING-EXPORT-STALE-001`, and `CHIEF-OF-STAFF-TAXONOMY-REVIEW-STALE-001`.
