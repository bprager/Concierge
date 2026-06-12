# Status

Last updated: 2026-06-12

## Current Project State

Concierge is an initial scaffold for Napoleon's adaptive human interface. The repository contains product and architecture docs, evaluator design and runner, schemas, example profiles/traces, a Tauri + React app skeleton, bridge/perception service placeholders, GitHub templates, and an evaluator workflow scaffold.

The initial scaffold is committed and pushed. The startup review reports under `docs/reports/` include Napoleon Chief of Staff integration evidence discovered over ssh from `bernd@mimir` at `~/Projects/Napoleon/docs/concierge-integration/`. The Text Concierge app now has a first-pass CoS-aware bridge path, a bridge operation registry tested against the canonical OpenAPI Concierge paths, contract-aware repository validation for bridge request kinds/security/named operation usage, a local Napoleon-compatible HTTP bridge harness for governed path smoke validation, canonical endpoint path resolution from a configured Napoleon base URL, optional local bridge bearer token support, first-class descriptor connection state with live descriptor discovery, a local harness endpoint preset, app-level local harness text smoke coverage, a live bridge readiness panel backed by in-session sanitized bridge evidence state, local Rehearsal Mode preview, governance review UI states, proposal-only memory review with governed Napoleon review handoff, fail-closed live bridge errors including remote `deny` and `no_go` outcomes across text, memory proposal, and steering handoffs, strict live response provenance checks that also reject unproven selected-agent finding claims in response text, reusable Napoleon bridge contract fixtures, Napoleon delegation provenance rendering, a count and age bounded browser-local Conversation Capability Intelligence ledger with clear/export/taxonomy controls, and a local query surface for common, working-well, missing/blocked, easy-to-evolve, architecture-area, recommended-next, increasing, worsening-missing, recently-working, and weekly-change capability questions. Recommendation answers now include deterministic local risk/value score components and scoring caveats, plus a Chief of Staff steering flow that creates a recommendation, evaluator case candidate, and evolution proposal draft, and can submit it through the governed bridge only after endpoint and descriptor preflight without applying it locally. The evaluator now has 17 scenarios and meets the backlog breadth target, including memory proposal review, bridge failure handling, bridge fixture delegation provenance, privacy settings controls, contract mismatch fail-closed coverage, and conversation capability intelligence coverage.

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
- Added local risk/value scoring for capability recommendations, including score components, risk penalties, child-safety caution, and scoring caveats.
- Added fail-closed live Napoleon bridge errors for missing endpoint, descriptor mismatch, auth failure, contract mismatch, governance no-go, timeout, and HTTP failure.
- Added sanitized live text bridge contract evidence capture for success and fail-closed outcomes; records omit raw prompt text, response text, endpoint hosts, bearer tokens, request bodies, and response bodies.
- Added a bridge evidence capture runner for one governed text turn against a configured endpoint, with descriptor discovery preflight and local Napoleon-compatible harness coverage.
- Added a local bridge evidence comparator plus sample evidence fixture to check captured bridge metadata against the OpenAPI-aligned bridge registry and reject raw payload or secret fields.
- Added optional local bridge bearer token support for text turns and governed steering handoff; tokens are sent only in authorization headers and excluded from payloads and telemetry.
- Hardened live governed handoffs so Napoleon `deny` and `no_go` responses become blocked outcomes for text turns, memory proposal review, and Chief of Staff steering instead of normal successful responses or completed reviews.
- Added canonical bridge endpoint resolution so configured Napoleon base URLs route text turns to `/v1/concierge/turn` and steering handoff to `/v1/concierge/chief-of-staff/steering`.
- Added a named bridge operation registry for text turns, descriptor discovery, Chief of Staff steering, memory proposal review, and evaluator requests, with app tests that compare registry paths to `api/napoleon_bridge.openapi.yaml`.
- Added contract-aware repository validation for bridge operation paths, request-kind constants, `NapoleonBearer` security, and named operation usage.
- Added runtime authority-boundary validation that fails if Concierge source directly executes processes, accesses memory or graph systems, or dispatches agents/tools outside the governed bridge.
- Added first-class Napoleon descriptor connection state for discovered, missing, and checksum/signature mismatch cases, with bridge preflight blocking before network calls.
- Added live Chief of Staff descriptor discovery from `/v1/concierge/chief-of-staff/descriptor`, including checksum/signature parsing and fail-closed invalid descriptor states.
- Added a Text Concierge live bridge readiness panel that combines endpoint, descriptor, checksum/signature, evidence capture/comparison, live-send, and blocked-effect state while stating that readiness is not Napoleon approval.
- Added in-session readiness tracking from captured `bridge_contract_evidence`, with local registry and raw/secret field comparison before evidence is marked passed.
- Added a local harness endpoint preset that configures `http://127.0.0.1:8787` and descriptor preflight without starting services or granting authority.
- Added `make app-smoke` for app-level local harness text flow coverage across descriptor discovery, governed send, delegation presentation, blocked effects, and readiness evidence.
- Added Napoleon delegation provenance parsing plus a Text Concierge panel for selected agents, selection reasons, allowed and blocked effects, governance state, trace ID, and audit ID.
- Added reusable Napoleon bridge contract fixtures for delegated success, auth failure, contract mismatch, and timeout cases.
- Added evaluator coverage for bridge delegation provenance and bridge contract fixture fail-closed behavior.
- Added a local Napoleon-compatible HTTP bridge harness for descriptor, delegated text turn, steering, memory proposal, and evaluator request smoke validation without a live runtime.
- Added local Chief of Staff steering draft generation from capability signals, including evaluator case candidate and evolution proposal draft while preserving proposal-only boundaries.
- Added strict live bridge response provenance validation: successful Napoleon responses must include matching governance, trace, and audit envelopes, and delegation trace/audit IDs must match before Concierge attributes agent contributions.
- Hardened selected-agent attribution so live response text such as "Passive Brain found..." fails closed unless matching selected-agent contribution provenance is present.
- Added governed Chief of Staff steering submission for evolution proposal review packets, gated by endpoint and descriptor preflight and blocked from local application, memory writes, approval capture, agent dispatch, or external sends.
- Added governed memory proposal review submission for live memory proposals, gated by endpoint and descriptor preflight and blocked from local memory writes, approval capture, agent dispatch, or external sends.

## Current Blockers

- No runtime blocker is known from the handoff setup itself.
- Real Napoleon HTTP evaluator mode requires a configured `NAPOLEON_EVAL_ENDPOINT`.
- Live Chief of Staff/Napoleon runtime alignment could not be verified because the remote descriptor has no populated live HTTP/MCP/stdio base URL and no local `NAPOLEON_EVAL_ENDPOINT` is configured.
- `LICENSE` is MIT, while `LICENSE-TODO.md` still says to choose a license.

## Known Bugs Or Risks

- The evaluator stub can pass while real Napoleon integration is incomplete.
- The app skeleton can imply product readiness before live auth, full profile handling, live runtime validation, and trace completeness are implemented.
- Camera, microphone, child-mode, and avatar work can weaken privacy or agency if implemented before consent and audit controls.
- The bridge boundary can erode if UI code starts calling tools or services directly instead of governed Napoleon APIs; repository validation now catches representative direct runtime bypasses.
- Self-evolution language can be misread as permission for automatic production changes; it is proposal-only until gates and approval exist.
- The Napoleon bridge contract has a first-pass CoS-aware Text Concierge adapter, OpenAPI-aligned bridge operation registry, local HTTP bridge harness, a UI local harness endpoint preset, canonical endpoint path resolution, optional local bearer-token header support, sanitized bridge contract evidence capture and comparison with a live-capable runner and UI-session readiness tracking, local/live descriptor connection state, a local live bridge readiness panel, local rehearsal preview, governance review display, governed memory proposal review handoff, fail-closed live errors, strict response provenance checks, reusable fixtures, and delegation provenance display, but live runtime validation still needs a configured endpoint.
- The evaluator has 17 scenarios and meets the current backlog breadth target. Repository validation now includes contract-aware bridge and runtime authority-boundary gates, but live Napoleon HTTP mode is still not configured or validated.
- The capability ledger is browser-local, count and age bounded, with clear/export/taxonomy controls, basic 7 day trend answers, deterministic risk/value scoring, and governed evolution proposal review handoff; richer seasonal trend analysis and Chief of Staff-assisted taxonomy review remain future work.
- Local Concierge contracts now include first-pass mirrors of Napoleon's CoS package for text turns, OpenAPI-tested canonical operation paths, request-kind and bearer-security validation, governed memory proposal review handoff, required live response trace/audit provenance, and live/local descriptor checksum/signature state. Remaining mismatches include live runtime validation and broader contract-aware evaluator coverage for full response artifacts.
- The remote integration package is contract-only and explicitly does not grant runtime authority, command execution, task routing, agent dispatch, graph writes, memory writes, approval capture, external sends, audit append, event publication, service control, or remediation.

## Next 3 To 5 Priorities

1. Validate live Napoleon descriptor discovery against a real runtime endpoint once available.
2. Add live governance review submission once Napoleon exposes a runtime transport.
3. Add live Napoleon runtime validation and fixture-backed contract comparison once a runtime transport exists.
4. Expand contract-aware evaluator coverage to full governed bridge response artifacts.
5. Add seasonal trend analysis and Chief of Staff-assisted taxonomy review for Conversation Capability Intelligence.

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
