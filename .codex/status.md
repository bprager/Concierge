# Status

Last updated: 2026-06-07

## Current Project State

Concierge is an initial scaffold for Napoleon's adaptive human interface. The repository contains product and architecture docs, evaluator design and runner, schemas, example profiles/traces, a Tauri + React app skeleton, bridge/perception service placeholders, GitHub templates, and an evaluator workflow scaffold.

The repo currently has broad uncommitted scaffold work in addition to this `.codex` handoff layer. Treat unrelated dirty-tree changes as prior user/agent work and do not discard them without review.

## Recently Completed

- Added the AI handoff structure in `.codex/`.
- Added root `AGENTS.md` guidance for future agents.
- Mapped Concierge context to canonical docs, schemas, evaluator, app, and service files.
- Captured project constraints around Napoleon governance, local-first capture, child mode, observability, and controlled self-evolution.

## Current Blockers

- No runtime blocker is known from the handoff setup itself.
- The broader scaffold appears uncommitted; review the working tree before packaging or publishing a baseline.
- Real Napoleon HTTP evaluator mode requires a configured `NAPOLEON_EVAL_ENDPOINT`.
- Frontend dependency installation/build status has not been established in this handoff update.

## Known Bugs Or Risks

- The evaluator stub can pass while real Napoleon integration is incomplete.
- The app skeleton can imply product readiness before governance confirmation, profile handling, and trace completeness are implemented.
- Camera, microphone, child-mode, and avatar work can weaken privacy or agency if implemented before consent and audit controls.
- The bridge boundary can erode if UI code starts calling tools or services directly instead of governed Napoleon APIs.
- Self-evolution language can be misread as permission for automatic production changes; it is proposal-only until gates and approval exist.

## Next 3 To 5 Priorities

1. Review and package the initial scaffold as a clean baseline commit if appropriate.
2. Run the evaluator in stub mode and preserve a known-good report artifact strategy.
3. Add schema validation for sample traces, profiles, evaluator reports, and evolution proposals.
4. Build the P1 text smoke path around identity, stance, bridge request, governance confirmation, and trace IDs.
5. Add regression fixtures for adult owner, child protected, and guest flows before voice/avatar work.

## Useful Validation Commands

- Evaluator stub without changing repo reports: `python evaluator/eval_runner.py --mode stub --out /tmp/concierge-eval.json`
- Evaluator default report path: `make eval`
- Napoleon HTTP evaluator: `NAPOLEON_EVAL_ENDPOINT=<url> make eval-http`
- Frontend build, if dependencies are installed: `cd app && npm run build`

## Relevant Files For Next Session

- `.codex/context-index.md`
- `.codex/project-context.md`
- `.codex/capabilities.md`
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
