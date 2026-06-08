# Status

Last updated: 2026-06-08

## Current Project State

Concierge is an initial scaffold for Napoleon's adaptive human interface. The repository contains product and architecture docs, evaluator design and runner, schemas, example profiles/traces, a Tauri + React app skeleton, bridge/perception service placeholders, GitHub templates, and an evaluator workflow scaffold.

The initial scaffold is committed and pushed. The startup review reports under `docs/reports/` now include Napoleon Chief of Staff integration evidence discovered over ssh from `bernd@mimir` at `~/Projects/Napoleon/docs/concierge-integration/`.

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
- The Napoleon bridge contract is currently too thin for P1: auth, confirmation, errors, memory proposals, delegation, and trace propagation need detail.
- The evaluator has 6 scenarios, while the backlog target is at least 15.
- Local Concierge contracts do not yet mirror Napoleon's CoS package. Key mismatches include `/v1/concierge/turn` versus Napoleon's review/discovery/governance/profile/observability/evolution endpoints, local `child_protected` versus Napoleon `child_protected_user`, and missing local handling for decision IDs, audit IDs, evidence links, and blocked effects.
- The remote integration package is contract-only and explicitly does not grant runtime authority, command execution, task routing, agent dispatch, graph writes, memory writes, approval capture, external sends, audit append, event publication, service control, or remediation.

## Next 3 To 5 Priorities

1. Add a `make check` target that runs evaluator stub mode, schema validation, YAML parsing, frontend build, and Tauri check where dependencies are available.
2. Reconcile local Concierge contracts with Napoleon's CoS descriptor, OpenAPI, and schemas before expanding UI behavior.
3. Harden the local bridge adapter around auth, governance decisions, confirmation, errors, delegation, memory proposals, trace IDs, decision IDs, audit IDs, evidence links, and blocked effects.
4. Tighten trace schemas and add complete adult, child, guest, confirmation, and blocked-flow examples aligned with Napoleon observability envelopes.
5. Expand evaluator scenarios to at least 15 and add negative governance, memory, child, telemetry, self-evolution, descriptor, and contract-only authority cases.

## Useful Validation Commands

- Evaluator stub without changing repo reports: `python evaluator/eval_runner.py --mode stub --out /tmp/concierge-eval.json`
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
