# Initial Repository Review

Date: 2026-06-07

## Executive Summary

Concierge is currently a well-scoped early scaffold for Napoleon's human interface, not a ready product. The repository has a clear product direction, strong safety principles, a starter evaluator, a Tauri and React app shell, bridge and trace schemas, and a concise `.codex` handoff layer.

The strongest architectural decision is the boundary: Concierge owns local interaction, presentation, consent, and telemetry capture; Napoleon owns governance, memory, routing, agent delegation, Chief of Staff review, and evolution approval.

The main weakness is that most guarantees are still documented rather than enforced. The app skeleton does not yet implement complete identity resolution, governance confirmation, durable trace assembly, privacy audit records, endpoint authentication, or child-mode policy enforcement. The evaluator is useful as a smoke test but not yet a strong judge of Napoleon or Chief of Staff quality.

## Evidence Reviewed

Reviewed documentation and handoff files:

- Root docs: `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `Changelog.md`, `LICENSE`, `LICENSE-TODO.md`, `tests/README.md`
- Canonical docs: `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/BACKLOG.md`, `docs/EVALUATOR.md`, `docs/GOVERNANCE_SAFETY_PRIVACY.md`, `docs/INTERACTION_STANCE_POLICY.md`, `docs/OBSERVABILITY.md`, `docs/ROADMAP.md`, `docs/RISK_REGISTER.md`, `docs/SELF_EVOLUTION.md`, `docs/TECHNOLOGY_REFERENCES.md`
- Decisions: `docs/decisions/ADR-0001-tauri-first.md`, `docs/decisions/ADR-0002-local-first-perception.md`, `docs/decisions/ADR-0003-observability-first.md`, `docs/decisions/ADR-0004-avatar-is-expression-not-authority.md`
- AI handoff layer: all files under `.codex/`
- Contracts and examples: `api/napoleon_bridge.openapi.yaml`, `schemas/`, `examples/`
- Evaluator: `evaluator/README.md`, `evaluator/eval_runner.py`, `evaluator/scenarios.yaml`, `evaluator/rubrics.yaml`, `evaluator/expected_artifacts.yaml`, evaluator prompts
- App and services: `app/`, `services/napoleon_bridge/README.md`, `services/perception/README.md`, `services/perception/contracts.py`
- Workflow and templates: `.github/workflows/evaluator.yml`, `.github/ISSUE_TEMPLATE/`

## Repository Inventory

| Area | Current contents | Review judgment |
|---|---|---|
| Product docs | PRD, roadmap, backlog, risk register, governance, stance, observability, self-evolution | Strong starting point. Clear direction and non-goals. Needs tighter P0/P1 exit criteria and more concrete contracts. |
| Architecture | System diagrams, runtime sequence, bridge boundary, ADRs | Good conceptual boundary. Missing detailed bridge, confirmation, memory, auth, and trace lifecycle contracts. |
| Evaluator | Python runner, YAML scenarios, rubric, expected artifacts, CI workflow | Good scaffold. Current evaluator is deterministic keyword scoring and has only 6 scenarios; backlog asks for at least 15. |
| Desktop app | Tauri 2 shell, React UI skeleton, bridge client, telemetry helper | Useful skeleton. Not yet a P1 MVP. Current bridge and telemetry are local stub/console-level only. |
| Bridge | OpenAPI for `/v1/concierge/turn` and `/v1/concierge/evaluate`; service README | Directionally correct. Too thin for live P1 use: lacks auth, errors, request IDs, confirmation flow, memory/context request format, and governance detail. |
| Schemas | Agent contract, evaluator report, evolution proposal, interaction trace, stance decision, user profile | Good initial types. Need stricter required fields, event enums, versioning, and examples for every schema. |
| Examples | Adult profile, child profile, sample interaction trace | Helpful. The sample trace is incomplete relative to the observability requirements. |
| Services | Napoleon bridge notes and local perception contract stubs | Appropriate placeholders. No runtime services yet. |
| `.codex` | Context routing, status, capability inventory, decisions, lessons | Useful. `status.md` is stale and should be refreshed after this review. |
| GitHub | Issue templates and evaluator workflow | Good initial structure. CI runs stub/http evaluator but does not validate schemas or frontend/Tauri build. |

## Key Assumptions In The Repository

1. Napoleon already exists or will exist as the authority layer for governance, memory, routing, agent registry, and evolution.
2. Chief of Staff can review design quality, prioritization, risk, and proposed evolution changes.
3. Concierge should be Mac-first through Tauri while preserving future cross-platform options.
4. Camera and microphone features are future work and must remain local-first, explicit, visible, and opt-in.
5. The evaluator should be the first quality gate before serious product expansion.
6. OpenTelemetry-compatible traces, metrics, and logs are expected but not yet implemented.
7. Child protected mode is a first-class safety profile, not a UI variant.

## Current Risks

| Risk | Severity | Why it matters |
|---|---:|---|
| Documented governance outpaces implementation | High | The app can imply readiness before confirmation, profile, trace, and authority checks exist. |
| Bridge contract is under-specified | High | P1 cannot safely integrate with Napoleon without auth, error handling, request IDs, confirmation semantics, and memory/context boundaries. |
| Evaluator can pass without real Napoleon quality | High | Stub mode currently returns a deliberately complete response; a green report does not prove alignment. |
| Child mode is documented but not enforceable | High | The profile exists, but there is no runtime guardrail, test fixture, guardian approval flow, or memory enforcement. |
| Observability requirements are broader than implementation | High | The helper logs console events but does not assemble complete traces, redact, buffer, retain, export, or audit. |
| License docs contradict each other | Medium | `LICENSE` is MIT, while `LICENSE-TODO.md` says a license must be chosen. |
| `.codex/status.md` is stale | Medium | It still describes uncommitted scaffold/build uncertainty that no longer reflects the repository. |
| Voice/avatar can distract from P1 safety | Medium | The docs correctly defer them, but the project must keep resisting feature-first expansion. |

## Missing Decisions

1. Exact Napoleon bridge authentication and local endpoint model.
2. Chief of Staff review workflow and approval format.
3. Agent registry lookup contract and delegation result format.
4. Memory read/write request policy and proposal workflow.
5. Governance confirmation lifecycle, including user approval, denial, expiration, and audit events.
6. Trace ID, conversation ID, turn ID, Napoleon request ID, and response ID generation rules.
7. Local telemetry retention defaults, redaction rules, encryption expectation, and export controls.
8. Guardian approval workflow for child protected mode.
9. Evaluator regression baseline storage and promotion gate rules.
10. Whether `LICENSE-TODO.md` should be removed or replaced with third-party license review notes now that `LICENSE` is MIT.

## Contradictions And Drift

- `docs/BACKLOG.md` says EV-002 requires at least 15 scenarios; `evaluator/scenarios.yaml` currently has 6.
- `docs/EVALUATOR.md` includes `regressions` in the report shape; `schemas/evaluator_run.schema.json` and the runner currently do not require or emit regressions.
- `docs/PRD.md` says the local bridge must be authenticated; `api/napoleon_bridge.openapi.yaml` and `app/src/napoleonBridge.ts` do not define authentication.
- `docs/OBSERVABILITY.md` requires many trace fields and events; `examples/sample_interaction_trace.json` and `app/src/telemetry.ts` include only a subset.
- `LICENSE` is MIT; `LICENSE-TODO.md` still says to choose a license before publishing.
- `.codex/status.md` still says the scaffold is uncommitted and frontend build status is unknown.

## Contributor Readiness

A new contributor can understand what Concierge is and why it exists by reading `README.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, and `.codex/context-index.md`.

A new contributor cannot yet safely implement P1 from docs alone because the most important integration contracts are incomplete: bridge auth, governance decisions, confirmation UI, trace assembly, memory proposals, and Chief of Staff review.

## Recommended Immediate Corrections

1. Treat this review and the other reports in `docs/reports/` as the startup baseline.
2. Refresh `.codex/status.md` so future sessions do not inherit stale working-tree information.
3. Add a single `make check` target that runs evaluator stub mode, schema validation, frontend build, and Tauri check when dependencies are available.
4. Expand the Napoleon bridge contract before building more UI behavior.
5. Harden evaluator scenarios and scoring before phase promotion.
6. Resolve the license TODO contradiction.
