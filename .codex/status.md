# Status

Last updated: 2026-06-08

## Current Project State

Concierge is an initial scaffold for Napoleon's adaptive human interface. The repository contains product and architecture docs, evaluator design and runner, schemas, example profiles/traces, a Tauri + React app skeleton, bridge/perception service placeholders, GitHub templates, and an evaluator workflow scaffold.

The initial scaffold is committed and pushed. The startup review reports under `docs/reports/` include Napoleon Chief of Staff integration evidence discovered over ssh from `bernd@mimir` at `~/Projects/Napoleon/docs/concierge-integration/`. The Text Concierge app now has a first-pass CoS-aware bridge path and UI status surface.

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

## Current Blockers

- No runtime blocker is known from the handoff setup itself.
- Real Napoleon HTTP evaluator mode requires a configured `NAPOLEON_EVAL_ENDPOINT`.
- Live Chief of Staff/Napoleon runtime alignment could not be verified because the remote descriptor has no populated live HTTP/MCP/stdio base URL and no local `NAPOLEON_EVAL_ENDPOINT` is configured.
- `LICENSE` is MIT, while `LICENSE-TODO.md` still says to choose a license.

## Known Bugs Or Risks

- The evaluator stub can pass while real Napoleon integration is incomplete.
- The app skeleton can imply product readiness before governance confirmation, profile handling, and trace completeness are implemented.
- Camera, microphone, child-mode, and avatar work can weaken privacy or agency if implemented before consent and audit controls.
- The bridge boundary can erode if UI code starts calling tools or services directly instead of governed Napoleon APIs.
- Self-evolution language can be misread as permission for automatic production changes; it is proposal-only until gates and approval exist.
- The Napoleon bridge contract has a first-pass CoS-aware Text Concierge adapter, but live auth, confirmation workflows, memory proposals, delegation, and richer error handling still need detail.
- The evaluator has 6 scenarios, while the backlog target is at least 15.
- Local Concierge contracts now include first-pass mirrors of Napoleon's CoS package for text turns. Remaining mismatches include live endpoint/auth, descriptor signature/checksum validation, memory proposal details, and full contract-aware evaluator coverage.
- The remote integration package is contract-only and explicitly does not grant runtime authority, command execution, task routing, agent dispatch, graph writes, memory writes, approval capture, external sends, audit append, event publication, service control, or remediation.

## Next 3 To 5 Priorities

1. Add live Napoleon endpoint/auth support once the CoS descriptor exposes a runtime transport.
2. Extend contract-aware evaluator scenarios to at least 15, including descriptor, governance, memory, child, telemetry, self-evolution, and non-authority cases.
3. Implement governance confirmation and review-required UI states around `requires_review` and `no_go`.
4. Add memory proposal display flow that never writes memory directly.
5. Add richer bridge error handling and contract fixtures for live Napoleon responses.

## Useful Validation Commands

- Full local check: `make check`
- Evaluator default report path: `make eval`
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
