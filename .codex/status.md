# Status

Last updated: 2026-06-14

## Current Project State

Concierge is an initial scaffold for Napoleon's adaptive human interface. The repository contains product and architecture docs, evaluator design and runner, schemas, example profiles/traces, a Tauri + React app skeleton, bridge/perception service placeholders, GitHub templates, and an evaluator workflow scaffold.

The initial scaffold is committed and pushed. The startup review reports under `docs/reports/` include Napoleon Chief of Staff integration evidence discovered over ssh from `bernd@mimir` at `~/Projects/Napoleon/docs/concierge-integration/`. The Text Concierge app now has a first-pass CoS-aware bridge path, a generated bridge operation registry derived from the canonical OpenAPI Concierge paths, a local governed route panel for descriptor discovery, text turns, memory proposal review, and Chief of Staff steering, contract-aware repository validation for generated bridge drift/request kinds/security/named operation usage plus OpenAPI governed request/response artifact and provenance consistency checks for text, memory proposal, and steering review paths, adult owner/child protected/guest/collaborator profile selection, a local Napoleon-compatible HTTP bridge harness for governed path smoke validation with forbidden side-effect claim triggers for text, steering, and memory proposal responses, canonical endpoint path resolution from a configured Napoleon base URL, optional local bridge bearer token support, first-class descriptor connection state with live descriptor discovery, a local harness endpoint preset, app-level local harness text smoke coverage for successful, denied fail-closed, and response-side side-effect-claim turns, rendered React interaction coverage for the Napoleon proof export comparison controls, a live bridge readiness panel, composer-side live-send preflight checklist, and governed handoff readiness summaries for memory proposal, steering, and taxonomy review submissions backed by draft, endpoint, descriptor, and blocked-effect state, local Rehearsal Mode preview, governance review UI states, proposal-only memory review with governed Napoleon review handoff, fail-closed live bridge errors including remote `deny` and `no_go` outcomes across text, memory proposal, steering, and taxonomy review handoffs, blocked-effect propagation in bridge failure telemetry, sanitized bridge evidence, and visible text-turn, memory proposal, steering, and taxonomy review failure messages, transcript-visible live text bridge failure reasons and blocked effects, strict live response provenance checks that also reject unproven Napoleon recommendation, selected-agent finding claims, and side-effect claims in response text, reusable Napoleon bridge contract fixtures, Napoleon delegation provenance rendering, a count and age bounded browser-local Conversation Capability Intelligence ledger with clear/export/taxonomy controls and local Chief of Staff taxonomy review drafts that include evaluator-case and evolution-proposal packets plus governed review submission, and a local query surface for common, working-well, missing/blocked, easy-to-evolve, architecture-area, recommended-next, increasing, worsening-missing, recently-working, weekly-change, and seasonal-change capability questions. Recommendation answers now include deterministic local risk/value score components and scoring caveats, plus Chief of Staff steering and taxonomy review flows that create proposal-only review packets and can submit them through the governed bridge only after endpoint and descriptor preflight without applying them locally. The evaluator now has 24 scenarios and meets the backlog breadth target, including memory proposal review, governed review response semantics, Chief of Staff steering draft boundaries, profile-scope drift, live-runtime artifact semantics, bridge failure handling, bridge fixture delegation provenance, bridge response authority provenance, child protected bridge response semantics, privacy settings controls, contract mismatch fail-closed coverage, live text response side-effect-claim coverage, and conversation capability intelligence coverage.

## Recently Completed

- Added the AI handoff structure in `.codex/`.
- Added root `AGENTS.md` guidance for future agents.
- Mapped Concierge context to canonical docs, schemas, evaluator, app, and service files.
- Captured project constraints around Napoleon governance, local-first capture, child mode, observability, and controlled self-evolution.
- Added and pushed the initial Concierge scaffold.
- Verified evaluator stub mode, frontend build, Tauri check, schema validation, Markdown links, and YAML parsing during scaffold packaging.
- Added startup planning reports in `docs/reports/`.
- Ingested Napoleon's contract-only Chief of Staff integration package: service descriptor, integration guide, architecture notes, OpenAPI, discovery guide, evidence note, and schemas for ChiefOfStaff, agent manifests, governance decisions, user profiles, observability envelopes, and evolution proposals.
- Updated the five startup reports to reflect the `napoleon.chief_of_staff` descriptor, governance outcomes, authority tiers, profile modes, observability envelope requirements, blocked effects, and non-authority boundary.
- Added local CoS-aligned schemas for ChiefOfStaff, governance decisions, agent manifests, observability envelopes, and text turn contracts.
- Added a Text Concierge contract adapter with local-to-Napoleon profile mapping, CoS request generation, governance request/decision generation, trace/audit envelopes, and blocked effects.
- Updated the bridge client and React text UI to display contract descriptor status, governance outcomes, decision IDs, audit IDs, profile mode, and blocked effects.
- Added collaborator profile selection to Text Concierge settings so every local profile mode in the contract mapping is selectable.
- Added app tests and a `make check` target covering evaluator, schema/YAML/docs validation, app tests, frontend build, and Tauri check.
- Added `docs/reports/EVALUATION_EFFICIENCY_AND_COS_IMPROVEMENTS.md`.
- Added Rehearsal Mode so a text turn can be previewed locally before a live Napoleon bridge call, including understood request, proposed path, Chief of Staff packet, allowed effects, blocked effects, approval state, memory proposal, trace/audit preview, and evaluator-case candidate.
- Added `docs/REHEARSAL_MODE.md` and `docs/superpowers/plans/2026-06-08-rehearsal-mode.md`.
- Added Rehearsal Mode evaluator coverage for adult owner, child protected, guest/collaborator, and adversarial preview paths.
- Added governance review UI states for `requires_review`, `deny`, and `no_go`, including local-only acknowledgement that is not Napoleon approval.
- Expanded evaluator coverage from 11 to 15 scenarios with memory proposal review, bridge failure handling, privacy settings controls, and contract mismatch fail-closed cases.
- Added Text Concierge memory proposal review panels with local acknowledgement/dismissal that never writes memory or captures approval.
- Designed Conversation Capability Intelligence for privacy-safe tracking of common, working, missing, architecture-blocked, and recommended next capabilities.
- Added the first local `conversation_capability_signal` TypeScript model, bounded in-memory ledger, aggregation helpers, and telemetry wiring for existing Text Concierge flows.
- Added the first Text Concierge query surface over the local capability ledger for common conversations and missing/blocked capabilities.
- Expanded the Text Concierge capability query surface with working-well, easy-to-evolve, architecture-area, and recommended-next local planning answers.
- Added browser-local capability ledger persistence, retention, clear, and metadata-only JSON export controls.
- Added local capability taxonomy rename, merge, deprecated marker, split-candidate marker, reset, persistence, and export controls.
- Added age-based capability ledger retention and local trend answers for increasing conversations, worsening missing capabilities, recently working capabilities, and weekly changes.
- Added seasonal capability trend answers that compare recent 28 day local metadata with the previous 28 days while preserving proposal-only boundaries and child minimization.
- Added local risk/value scoring for capability recommendations, including score components, risk penalties, child-safety caution, and scoring caveats.
- Added fail-closed live Napoleon bridge errors for missing endpoint, descriptor mismatch, auth failure, contract mismatch, governance no-go, timeout, and HTTP failure.
- Added sanitized live text bridge contract evidence capture for success and fail-closed outcomes; records omit raw prompt text, response text, endpoint hosts, bearer tokens, request bodies, and response bodies.
- Added a bridge evidence capture runner for one governed text turn against a configured endpoint, with descriptor discovery preflight and local Napoleon-compatible harness coverage.
- Added a local bridge evidence comparator plus sample evidence fixture to check captured bridge metadata against the OpenAPI-aligned bridge registry and reject raw payload or secret fields.
- Added optional local bridge bearer token support for text turns and governed steering handoff; tokens are sent only in authorization headers and excluded from payloads and telemetry.
- Hardened live governed handoffs so Napoleon `deny` and `no_go` responses become blocked outcomes for text turns, memory proposal review, and Chief of Staff steering instead of normal successful responses or completed reviews.
- Added canonical bridge endpoint resolution so configured Napoleon base URLs route text turns to `/v1/concierge/turn` and steering handoff to `/v1/concierge/chief-of-staff/steering`.
- Added a named bridge operation registry for text turns, descriptor discovery, Chief of Staff steering, memory proposal review, and evaluator requests, with app tests that compare registry paths to `api/napoleon_bridge.openapi.yaml`.
- Added a Text Concierge governed route panel that shows descriptor discovery, text turn, memory proposal review, and Chief of Staff steering paths from the generated registry without endpoint hosts or tokens.
- Added contract-aware repository validation for bridge operation paths, request-kind constants, `NapoleonBearer` security, and named operation usage.
- Added runtime authority-boundary validation that fails if Concierge source directly executes processes, accesses memory or graph systems, or dispatches agents/tools outside the governed bridge.
- Added first-class Napoleon descriptor connection state for discovered, missing, and checksum/signature mismatch cases, with bridge preflight blocking before network calls.
- Added live Chief of Staff descriptor discovery from `/v1/concierge/chief-of-staff/descriptor`, including checksum/signature parsing and fail-closed invalid descriptor states.
- Added a Text Concierge live bridge readiness panel that combines endpoint, descriptor, checksum/signature, evidence capture/comparison, last live-send outcome, and blocked-effect state while stating that readiness is not Napoleon approval.
- Added a composer-side live-send preflight checklist for text readiness, endpoint configuration, descriptor discovery, descriptor integrity, local governance send gate, and Rehearsal Mode state.
- Added in-session readiness tracking from captured `bridge_contract_evidence`, with local registry and raw/secret field comparison before evidence is marked passed.
- Added a sanitized local bridge readiness proof export with descriptor state, blocked effects, evidence status, last failure reason, and no raw prompts, endpoints, or secrets.
- Added same-session local bridge readiness proof comparison that reports sanitized proof changes without exposing raw prompts, endpoints, tokens, request bodies, or response bodies.
- Added a local harness endpoint preset that configures `http://127.0.0.1:8787` and descriptor preflight without starting services or granting authority.
- Added `make app-smoke` for app-level local harness text flow coverage across descriptor discovery, governed send, delegation presentation, last successful proof presentation, blocked effects, readiness evidence, and denied fail-closed text turn details.
- Added Napoleon delegation provenance parsing plus a Text Concierge panel for selected agents, selection reasons, allowed and blocked effects, governance state, trace ID, and audit ID.
- Added reusable Napoleon bridge contract fixtures for delegated success, auth failure, contract mismatch, and timeout cases.
- Added evaluator coverage for bridge delegation provenance and bridge contract fixture fail-closed behavior.
- Added evaluator coverage for bridge response authority provenance so invented Napoleon recommendations, invented selected-agent findings, and side-effect claims require matching provenance or fail closed.
- Added evaluator coverage for child protected bridge response semantics so valid bridge responses still preserve guardian review, no secret-keeping, memory minimization, blocked effects, and stricter child fail-closed behavior.
- Added evaluator coverage for governed memory proposal and Chief of Staff steering review response semantics so `requires_review` remains non-approval and reviewed packets stay proposal-only, not locally applied.
- Added evaluator coverage for profile-scope drift so guest, collaborator, and child protected responses cannot widen themselves into adult owner or owner-only authority.
- Added evaluator coverage for live-runtime artifact semantics so bridge evidence and Napoleon proof exports stay sanitized, traceable, and non-authorizing.
- Added a local Napoleon-compatible HTTP bridge harness for descriptor, delegated text turn, steering, memory proposal, and evaluator request smoke validation without a live runtime.
- Added local Chief of Staff steering draft generation from capability signals, including evaluator case candidate and evolution proposal draft while preserving proposal-only boundaries.
- Added strict live bridge response provenance validation: successful Napoleon responses must include matching governance, trace, and audit envelopes, delegation trace/audit IDs must match before Concierge attributes agent contributions, and live text responses cannot claim side effects.
- Expanded local harness and app smoke coverage so forbidden side-effect claims in text responses are proven to fail closed as contract mismatches.
- Expanded local harness coverage for forbidden side-effect claims in Chief of Staff steering and memory proposal review responses.
- Hardened selected-agent attribution so live response text such as "Passive Brain found..." fails closed unless matching selected-agent contribution provenance is present.
- Hardened Napoleon recommendation attribution so live response text such as "Napoleon recommends..." fails closed unless matching recommendation provenance is present.
- Added blocked-effect propagation for fail-closed live bridge errors so bridge failure telemetry and the visible bridge-blocked message can show denied effects.
- Added blocked-effect propagation into sanitized bridge evidence for early fail-closed live text errors such as missing endpoint and auth failure.
- Added blocked-effect propagation for fail-closed memory proposal review and Chief of Staff steering handoff errors so their visible failure messages and telemetry can show denied effects even before a network call is attempted.
- Added transcript-visible live text bridge failure messages that include the fail-closed reason and blocked effects where available.
- Added returned decision, audit, and governance references to live text bridge fail-closed errors, telemetry, and visible failure messages when Napoleon supplies those references before blocking.
- Added generated bridge operation registry output from the canonical OpenAPI bridge contract and repository validation that fails when the generated file is stale.
- Added governed Chief of Staff steering submission for evolution proposal review packets, gated by endpoint and descriptor preflight and blocked from local application, memory writes, approval capture, agent dispatch, or external sends.
- Added child-protected safeguards to governed Chief of Staff steering submissions, including child-safety caution, child profile scope, and guardian/owner review wording.
- Hardened governed Chief of Staff steering review responses so side-effect claims fail closed as contract mismatches.
- Hardened live text responses so memory write, approval capture, external send, agent dispatch, or local-apply claims fail closed as contract mismatches.
- Added governed memory proposal review submission for live memory proposals, gated by endpoint and descriptor preflight and blocked from local memory writes, approval capture, agent dispatch, or external sends.
- Hardened governed memory proposal review responses so memory write, approval, external send, agent dispatch, or local-apply claims fail closed as contract mismatches.
- Hardened live text turns, Chief of Staff steering handoff, and memory proposal handoff so they fail closed before request fetch when descriptor discovery has not completed, instead of using Concierge's built-in descriptor as live evidence.
- Added OpenAPI-governed request artifact validation for memory proposal and Chief of Staff steering handoffs, including proposal-only boundary checks that reject nested authority claims.
- Hardened OpenAPI-governed response artifact validation so text, memory proposal, and steering response examples reject memory write, approval capture, external send, agent dispatch, or local-apply claims.
- Added child-protected memory proposal request artifact validation with guardian review and child profile enforcement.
- Added child-protected Chief of Staff steering request artifact validation with required child-safety caution and proposal-only boundary enforcement.
- Added a last successful Napoleon proof panel that displays returned governance, trace, audit, delegation, recommendation, allowed-effect, and blocked-effect metadata without treating it as approval or execution authority.
- Added successful Napoleon transcript metadata that displays a returned target capability when Napoleon supplies one without selected-agent delegation.
- Centralized Text Concierge Napoleon response presentation state so local-only, blocked, and failed paths clear stale delegation and proof together.
- Added sanitized local export for the last successful Napoleon response proof, excluding raw prompts, response text, endpoint hosts, tokens, request bodies, and response bodies.
- Added same-session sanitized comparison for last successful Napoleon response proof exports, with local UI and telemetry status/change counts only.
- Added returned profile mode to the last successful Napoleon proof panel, sanitized proof export, export telemetry, and same-session proof comparison.
- Expanded local harness smoke coverage so the sanitized Napoleon proof export comparison is verified through the app-level governed text path.
- Added rendered React interaction coverage that clicks through the local harness preset, descriptor discovery, governed send, transcript-level target capability metadata, no-endpoint preflight and fail-closed transcript metadata, missing-descriptor preflight and fail-closed transcript metadata, descriptor-integrity fail-closed transcript metadata, auth-failure transcript metadata, bridge-timeout transcript metadata, contract-mismatch transcript metadata for forbidden side-effect claims, fail-closed no-go transcript metadata, governed memory proposal, Chief of Staff steering, and Chief of Staff taxonomy review submissions with visible no-agent-dispatch local effects, repeated Napoleon proof exports, and sanitized proof output checks.
- Added local Chief of Staff taxonomy review drafts for Conversation Capability Intelligence, including merge, split, deprecation, evaluator-case, and evolution-proposal packet details from local metadata evidence while preserving proposal-only boundaries.
- Added governed Chief of Staff taxonomy review submission for Conversation Capability Intelligence, gated by endpoint and descriptor preflight and blocked from applying taxonomy edits, writing memory, capturing approval, dispatching agents, or sending externally.
- Added visible governed handoff readiness summaries for memory proposal review, Chief of Staff steering, and Chief of Staff taxonomy review so submit controls explain draft, endpoint, descriptor, and blocked-effect blockers before any Napoleon handoff.
- Tightened canonical governed review response contracts and examples so memory proposal and Chief of Staff steering review responses must carry explicit false side-effect fields for memory writes, approval capture, agent dispatch, external sends, and local application where applicable.
- Tightened runtime governed review handling so memory proposal, Chief of Staff steering, and Chief of Staff taxonomy review responses fail closed when required explicit false side-effect fields are omitted.
- Tightened live text bridge handling so returned profile-mode drift fails closed instead of widening child protected, guest, or collaborator turns into another scope.
- Added active profile-mode metadata to blocked live bridge transcript messages so profile-scope drift failures show the preserved local scope.
- Added active profile and profile-mode telemetry for successful and fail-closed live text responses so Conversation Capability Intelligence keeps child-protected, guest, collaborator, or owner scope in derived local signals.
- Added local Text Concierge privacy controls for telemetry, camera, and microphone state; camera and microphone remain off by default, toggles persist local state only, and privacy-setting events do not store raw audio/video or claim side effects.
- Added a local Voice readiness panel with explicit microphone permission request/result state; toggling the microphone setting does not request permission, granted permission is stopped immediately, and voice capture remains inactive until a future voice mode pipeline exists.
- Added a local Camera readiness panel with explicit camera permission request/result state; toggling the camera setting does not request permission, granted permission is stopped immediately, and camera capture remains inactive until a future avatar/camera pipeline exists.
- Added a local Voice Activity Detection sample panel and deterministic detector; running the sample emits segment metadata only and does not request microphone permission, start capture, store raw audio, or claim side effects.
- Added a local Speech Transcription sample panel and deterministic adapter; running the sample emits transcript metadata only and does not request microphone permission, start capture, store raw audio, or claim side effects.
- Added a local Text to Speech sample panel and deterministic adapter; running the sample emits speech-preparation metadata only and does not start audio playback, store raw audio, or claim side effects.
- Added a local Voice Turn Rehearsal panel and deterministic adapter; running the dry run chains VAD, STT, text boundary, and TTS metadata while keeping Napoleon contact, media capture, playback, storage, approval, memory, dispatch, and external sends blocked.

## Current Blockers

- No runtime blocker is known from the handoff setup itself.
- Real Napoleon HTTP evaluator mode requires a configured `NAPOLEON_EVAL_ENDPOINT`; `make eval-http-local-harness` only verifies local HTTP evaluator plumbing.
- Live Chief of Staff/Napoleon runtime alignment could not be verified because the remote descriptor has no populated live HTTP/MCP/stdio base URL and no local `NAPOLEON_EVAL_ENDPOINT` is configured.
- License docs are now consistent: `LICENSE` is MIT, and `LICENSE-TODO.md` tracks only third-party asset license review.

## Known Bugs Or Risks

- The evaluator stub can pass while real Napoleon integration is incomplete.
- The app skeleton can imply product readiness before live credential validation, live runtime validation, and durable trace completeness are implemented.
- Camera, microphone, child-mode, and avatar work can weaken privacy or agency if implemented before consent and audit controls.
- The bridge boundary can erode if UI code starts calling tools or services directly instead of governed Napoleon APIs; repository validation now catches representative direct runtime bypasses.
- Self-evolution language can be misread as permission for automatic production changes; it is proposal-only until gates and approval exist.
- The Napoleon bridge contract has a first-pass CoS-aware Text Concierge adapter, OpenAPI-aligned bridge operation registry, local governed route panel, local HTTP bridge harness, a UI local harness endpoint preset, canonical endpoint path resolution, optional local bearer-token header support, sanitized bridge contract evidence capture and comparison with a live-capable runner and UI-session readiness tracking, local/live descriptor connection state, a local live bridge readiness panel, composer-side live-send preflight checklist, same-session readiness proof comparison, local rehearsal preview, governance review display, governed memory proposal review handoff, fail-closed live errors, strict response provenance checks, reusable fixtures, and delegation provenance display, but live runtime validation still needs a configured endpoint.
- The evaluator has 24 scenarios and meets the current backlog breadth target. Repository validation now includes contract-aware bridge and runtime authority-boundary gates, accepted baseline regression checks, and a local human review record generator for promotion decisions, but live Napoleon HTTP mode is still not configured or validated and actual reviewed promotion records still need to be kept when changes are promoted.
- The capability ledger is browser-local, count and age bounded, with clear/export/taxonomy controls, local Chief of Staff taxonomy review drafts with evaluator-case and evolution-proposal packet details, governed taxonomy review submission, 7 day and 28 day trend answers, deterministic risk/value scoring, and governed evolution proposal review handoff; applying reviewed taxonomy changes remains future work.
- Local Concierge contracts now include first-pass mirrors of Napoleon's CoS package for text turns, OpenAPI-tested canonical operation paths, request-kind and bearer-security validation, governed memory proposal review handoff, required live response trace/audit provenance, live text side-effect claim rejection, response authority provenance evaluator coverage, child protected bridge response semantics coverage, governed review response semantics coverage, profile-scope drift evaluator coverage, live-runtime artifact semantics evaluator coverage, governed request/response artifact validation, and live/local descriptor checksum/signature state. Remaining mismatches include live runtime validation against a real endpoint.
- Local voice work now includes deterministic barge-in rehearsal state and a rendered Text Concierge panel that shows planned sample speech interruption and blocked effects without playback, capture, raw audio storage, Napoleon contact, approval capture, memory writes, agent dispatch, or external sends.
- Local voice work now includes voice response shaping that shortens long bridge-provenance text for future speech while refusing to invent Napoleon or delegated-agent attribution when provenance is absent.
- Child protected voice shaping is stricter than adult owner shaping, with shorter speech, slower pacing metadata, visible guardian-review reminders, and the same local-only blocked side-effect boundary.
- Local avatar work now includes a neutral display-only avatar state panel derived from returned text provenance, stance, and active profile, with child protected avatar camera and affect paths disabled until guardian review and camera capture, face detection, affect inference, animation, live Napoleon contact, approval capture, guardian approval capture, memory writes, agent dispatch, and external sends blocked.
- Local avatar work now includes stance-to-expression metadata mapping for direct, warm, concerned, playful, and somber stance labels without animation, emotion inference, camera capture, perception, Napoleon contact, approval capture, guardian approval capture, memory writes, agent dispatch, or external sends.
- The Text Concierge Napoleon delegation panel now stays visible even before bridge provenance is returned, with selected agents, allowed effects, blocked effects, governance state, trace ID, and audit ID shown as not returned until Napoleon supplies matching provenance.
- Successful Napoleon bridge responses now show transcript-level source, returned-provenance attribution boundary, and blocked effects on the assistant message itself, not only in the proof and delegation panels.
- Fail-closed Napoleon bridge attempts now show transcript-level blocked bridge source, no-accepted-response attribution boundary, and blocked effects on the assistant failure message when available.
- Last successful Napoleon proof rendering and sanitized proof export now preserve returned target capability IDs when selected-agent delegation is not returned.
- Sanitized Napoleon response proof export and comparison now keep returned target capability separate from selected-agent provenance.
- The Napoleon delegation panel now also displays a returned target capability ID when selected-agent delegation is not returned, while keeping selected agents marked as not returned.
- Resolved the license documentation drift by replacing the obsolete license-choice TODO with third-party asset license review guidance.
- Refreshed stale startup report authentication gaps to reflect the current OpenAPI bearer scheme, generated header-only token registry, and remaining live credential-validation dependency.
- Added evaluator regression reporting: reports now include `regressions`, and the runner can compare against a supplied or accepted local baseline.
- Added accepted evaluator baseline storage at `evaluator/reports/accepted_baseline.json`, with `make eval-accept-baseline` requiring a clean report and `make eval-with-baseline` failing on local regression.
- Added `make eval-human-review` for local evaluator promotion records with reviewer decision fields, baseline evidence, hard-fail/missing-artifact/regression counts, and explicit non-authority boundaries.
- Local avatar work now includes a metadata-only VRM model reference loader and Avatar Model panel that validates the local model reference without starting rendering, camera capture, perception, Napoleon contact, approval capture, guardian approval capture, memory writes, agent dispatch, or external sends.
- Local avatar work now includes an Avatar Renderer readiness panel that prepares renderer preflight metadata from the loaded model without allocating a canvas, starting a render loop, camera capture, perception, Napoleon contact, approval capture, guardian approval capture, memory writes, agent dispatch, or external sends.
- The remote integration package is contract-only and explicitly does not grant runtime authority, command execution, task routing, agent dispatch, graph writes, memory writes, approval capture, external sends, audit append, event publication, service control, or remediation.

## Next 3 To 5 Priorities

1. Validate live Napoleon descriptor discovery against a real runtime endpoint once available.
2. Add live governance review submission once Napoleon exposes a runtime transport.
3. Add live Napoleon runtime validation and fixture-backed contract comparison once a runtime transport exists.
4. Add governed application flow for reviewed taxonomy changes once Napoleon exposes an explicit approval/application endpoint.
5. Add broader live-runtime artifact comparison once a real Napoleon endpoint is available.

## Useful Validation Commands

- Full local check: `make check`
- Evaluator default report path: `make eval`
- Local bridge harness smoke: `make bridge-harness`
- App local harness text smoke: `make app-smoke`
- Napoleon HTTP evaluator: `NAPOLEON_EVAL_ENDPOINT=<url> make eval-http`
- Frontend build, if dependencies are installed: `cd app && npm run build`
- Tauri shell check, if Rust dependencies are available: `cd app/src-tauri && cargo check`

## Relevant Files For Next Session

- `.codex/context-index.md`
- `.codex/project-context.md`
- `.codex/capabilities.md`
- `docs/reports/INITIAL_REPOSITORY_REVIEW.md`
- `docs/reports/CHIEF_OF_STAFF_ALIGNMENT.md`
- `docs/reports/ARCHITECTURE_GAP_ANALYSIS.md`
- `docs/reports/EVALUATOR_READINESS_REVIEW.md`
- `docs/reports/RECOMMENDED_STARTUP_PLAN.md`
- Remote Napoleon source for this pass: `bernd@mimir:~/Projects/Napoleon/docs/concierge-integration/`
- `AGENTS.md`
- `README.md`
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/BACKLOG.md`
- `docs/REHEARSAL_MODE.md`
- `docs/CONVERSATION_CAPABILITY_INTELLIGENCE.md`
- `docs/EVALUATOR.md`
- `docs/GOVERNANCE_SAFETY_PRIVACY.md`
- `docs/INTERACTION_STANCE_POLICY.md`
- `docs/OBSERVABILITY.md`
- `docs/SELF_EVOLUTION.md`
- `docs/RISK_REGISTER.md`
- `api/napoleon_bridge.openapi.yaml`
- `schemas/`
- `evaluator/`
- `app/`
- `services/`
