# Status

Last updated: 2026-06-07

## Current Project State

Concierge is an initial scaffold for Napoleon's adaptive human interface. The repository contains product and architecture docs, evaluator design and runner, schemas, example profiles/traces, a Tauri + React app skeleton, bridge/perception service placeholders, GitHub templates, and an evaluator workflow scaffold.

The initial scaffold is committed and pushed. The current startup review added planning reports under `docs/reports/` that inventory the repository, align expected Chief of Staff responsibilities, analyze architecture gaps, assess evaluator readiness, and recommend the first implementation sequence.

## Recently Completed

- Added the AI handoff structure in `.codex/`.
- Added root `AGENTS.md` guidance for future agents.
- Mapped Concierge context to canonical docs, schemas, evaluator, app, and service files.
- Captured project constraints around Napoleon governance, local-first capture, child mode, observability, and controlled self-evolution.
- Added and pushed the initial Concierge scaffold.
- Verified evaluator stub mode, frontend build, Tauri check, schema validation, Markdown links, and YAML parsing during scaffold packaging.
- Added startup planning reports in `docs/reports/`.

## Current Blockers

- No runtime blocker is known from the handoff setup itself.
- Real Napoleon HTTP evaluator mode requires a configured `NAPOLEON_EVAL_ENDPOINT`.
- Live Chief of Staff/Napoleon alignment could not be verified from this repository session because no Napoleon endpoint is configured.
- `LICENSE` is MIT, while `LICENSE-TODO.md` still says to choose a license.

## Known Bugs Or Risks

- The evaluator stub can pass while real Napoleon integration is incomplete.
- The app skeleton can imply product readiness before governance confirmation, profile handling, and trace completeness are implemented.
- Camera, microphone, child-mode, and avatar work can weaken privacy or agency if implemented before consent and audit controls.
- The bridge boundary can erode if UI code starts calling tools or services directly instead of governed Napoleon APIs.
- Self-evolution language can be misread as permission for automatic production changes; it is proposal-only until gates and approval exist.
- The Napoleon bridge contract is currently too thin for P1: auth, confirmation, errors, memory proposals, delegation, and trace propagation need detail.
- The evaluator has 6 scenarios, while the backlog target is at least 15.

## Next 3 To 5 Priorities

1. Add a `make check` target that runs evaluator stub mode, schema validation, YAML parsing, frontend build, and Tauri check where dependencies are available.
2. Harden the Napoleon bridge contract around auth, governance decisions, confirmation, errors, delegation, memory proposals, and trace propagation.
3. Tighten trace schemas and add complete adult, child, guest, confirmation, and blocked-flow examples.
4. Expand evaluator scenarios to at least 15 and add negative governance, memory, child, telemetry, and self-evolution cases.
5. Build the P1 text smoke path around identity, stance, bridge request, governance confirmation, and trace IDs.

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
