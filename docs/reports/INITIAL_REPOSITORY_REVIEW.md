# Initial Repository Review

Date: 2026-06-08

## Executive Summary

Concierge is currently a well-scoped early scaffold for Napoleon's human interface, not a ready product. The repository has a clear product direction, strong safety principles, a starter evaluator, a Tauri and React app shell, bridge and trace schemas, and a concise `.codex` handoff layer.

The strongest architectural decision is the boundary: Concierge owns local interaction, presentation, consent, and telemetry capture; Napoleon owns governance, memory, routing, agent delegation, Chief of Staff review, and evolution approval.

The June 8 integration pass discovered Napoleon-side Chief of Staff integration contracts on `bernd@mimir` under `~/Projects/Napoleon/docs/concierge-integration/`. Those documents materially improve alignment: Napoleon now defines contract-only surfaces for Chief of Staff requests, agent manifests, governance decisions, user profiles, observability envelopes, and evolution proposals. They do not grant runtime authority.

The main weakness has shifted from "no Napoleon contract evidence" to "local Concierge contracts do not yet mirror Napoleon's contract package." The app skeleton still does not implement complete identity resolution, governance confirmation, durable trace assembly, privacy audit records, endpoint authentication, or child-mode policy enforcement. The evaluator is useful as a smoke test but not yet a strong judge of Napoleon or Chief of Staff quality.

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
- Napoleon Chief of Staff integration package via `ssh bernd@mimir`: `~/Projects/Napoleon/docs/concierge-integration/README.md`, `integration-guide.md`, `architecture.md`, `chief-of-staff-discovery.md`, `concierge-evidence.yaml`, `apis/concierge-integration.openapi.yaml`, `discovery/chief-of-staff-service.yaml`, and six schemas under `schemas/`

## Repository Inventory

| Area | Current contents | Review judgment |
|---|---|---|
| Product docs | PRD, roadmap, backlog, risk register, governance, stance, observability, self-evolution | Strong starting point. Clear direction and non-goals. Needs tighter P0/P1 exit criteria and more concrete contracts. |
| Architecture | System diagrams, runtime sequence, bridge boundary, ADRs | Good conceptual boundary. Missing detailed bridge, confirmation, memory, auth, and trace lifecycle contracts. |
| Evaluator | Python runner, YAML scenarios, rubric, expected artifacts, CI workflow | Good scaffold. Current evaluator is deterministic keyword scoring and has 10 scenarios, including Rehearsal Mode coverage; backlog asks for at least 15. |
| Desktop app | Tauri 2 shell, React UI skeleton, bridge client, telemetry helper | Useful skeleton. Not yet a P1 MVP. Current bridge and telemetry are local stub/console-level only. |
| Bridge | OpenAPI for `/v1/concierge/turn` and `/v1/concierge/evaluate`; service README | Directionally correct. Too thin for live P1 use: lacks auth, errors, request IDs, confirmation flow, memory/context request format, and governance detail. |
| Schemas | Agent contract, evaluator report, evolution proposal, interaction trace, stance decision, user profile | Good initial types. Need stricter required fields, event enums, versioning, and examples for every schema. |
| Examples | Adult profile, child profile, sample interaction trace | Helpful. The sample trace is incomplete relative to the observability requirements. |
| Services | Napoleon bridge notes and local perception contract stubs | Appropriate placeholders. No runtime services yet. |
| `.codex` | Context routing, status, capability inventory, decisions, lessons | Useful handoff layer. `status.md` should continue tracking the Napoleon contract-ingestion state. |
| GitHub | Issue templates and evaluator workflow | Good initial structure. CI runs stub/http evaluator but does not validate schemas or frontend/Tauri build. |
| Napoleon CoS integration docs | Remote contract-only package with service descriptor, OpenAPI, governance, profile, observability, agent manifest, Chief of Staff, and evolution proposal schemas | Strong alignment input. Must be reconciled into local Concierge contracts before P1 implementation. |

## Key Assumptions In The Repository

1. Napoleon already exists or will exist as the authority layer for governance, memory, routing, agent registry, and evolution.
2. Chief of Staff can review design quality, prioritization, risk, and proposed evolution changes.
3. Concierge should be Mac-first through Tauri while preserving future cross-platform options.
4. Camera and microphone features are future work and must remain local-first, explicit, visible, and opt-in.
5. The evaluator should be the first quality gate before serious product expansion.
6. OpenTelemetry-compatible traces, metrics, and logs are expected but not yet implemented.
7. Child protected mode is a first-class safety profile, not a UI variant.
8. Napoleon's current CoS integration package is contract-only: it advertises service identity, request/response shapes, blocked effects, and review workflows, but does not execute, approve, route, write memory, append audit logs, or activate runtime behavior.

## Current Risks

| Risk | Severity | Why it matters |
|---|---:|---|
| Documented governance outpaces implementation | High | The app can imply readiness before confirmation, profile, trace, and authority checks exist. |
| Bridge contract is under-specified | High | P1 cannot safely integrate with Napoleon without auth, error handling, request IDs, confirmation semantics, and memory/context boundaries. |
| Evaluator can pass without real Napoleon quality | High | Stub mode currently returns a deliberately complete response; a green report does not prove alignment. |
| Child mode is documented but not enforceable | High | The profile exists, but there is no runtime guardrail, test fixture, guardian approval flow, or memory enforcement. |
| Observability requirements are broader than implementation | High | The helper logs console events but does not assemble complete traces, redact, buffer, retain, export, or audit. |
| Local and Napoleon contracts can diverge | High | Local Concierge currently has `/v1/concierge/turn`; Napoleon's package defines `/chief-of-staff/requests`, `/agents`, `/governance/evaluate`, `/profiles/{profile_id}`, `/observability/traces`, and `/evolution/proposals`. |
| Contract-only package could be mistaken for operational authority | High | The remote descriptor explicitly blocks runtime authority, command execution, routing, dispatch, memory writes, graph writes, approval capture, external sends, and audit append. |
| License docs contradict each other | Medium | `LICENSE` is MIT, while `LICENSE-TODO.md` says a license must be chosen. |
| Handoff drift can recur | Medium | `.codex/status.md` is now updated, but future integration passes should refresh it whenever source authority changes. |
| Voice/avatar can distract from P1 safety | Medium | The docs correctly defer them, but the project must keep resisting feature-first expansion. |

## Missing Decisions

1. Exact live Napoleon HTTP, MCP, or stdio endpoint for the `napoleon.chief_of_staff` descriptor; the remote descriptor currently leaves runtime base URLs blank.
2. Authentication and descriptor signature/checksum model; the remote descriptor marks signature and checksum as pending future implementation.
3. How local `/v1/concierge/turn` should map to Napoleon's contract surfaces: ChiefOfStaffRequest, GovernanceEvaluationRequest, agent manifest discovery, profile lookup, observability trace reference, and EvolutionProposal.
4. Confirmation UX lifecycle for the remote governance outcomes: `allow_prepare_only`, `deny`, `requires_review`, and `no_go`.
5. Memory write proposal details; the remote contracts currently block memory writes but do not define a user-facing memory proposal payload.
6. Trace ID, conversation ID, turn ID, Napoleon request ID, decision ID, audit ID, and response ID generation and ownership rules.
7. Local telemetry retention defaults, redaction rules, encryption expectation, and export controls.
8. Guardian approval workflow for `child_protected_user`, which is Napoleon's profile-mode name for the child protected profile.
9. Evaluator regression baseline storage and promotion gate rules.
10. Whether `LICENSE-TODO.md` should be removed or replaced with third-party license review notes now that `LICENSE` is MIT.

## Contradictions And Drift

- `docs/BACKLOG.md` says EV-002 requires at least 15 scenarios; `evaluator/scenarios.yaml` currently has 10.
- `docs/EVALUATOR.md` includes `regressions` in the report shape; `schemas/evaluator_run.schema.json` and the runner currently do not require or emit regressions.
- `docs/PRD.md` says the local bridge must be authenticated; `api/napoleon_bridge.openapi.yaml` and `app/src/napoleonBridge.ts` do not define authentication.
- `docs/OBSERVABILITY.md` requires many trace fields and events; `examples/sample_interaction_trace.json` and `app/src/telemetry.ts` include only a subset.
- Local Concierge uses `child_protected`; Napoleon's profile contract uses `child_protected_user`. This needs an explicit mapping before contract tests.
- Local Concierge's OpenAPI describes `/v1/concierge/turn`; Napoleon's integration OpenAPI describes review/discovery/governance/profile/observability/evolution endpoints and is marked `contract_only`.
- Napoleon's `concierge-evidence.yaml` says no local Concierge repository or report files were found during its contract-generation task. That remote evidence is now stale relative to this Concierge repo and should be superseded by the current reports.
- `LICENSE` is MIT; `LICENSE-TODO.md` still says to choose a license before publishing.
- `.codex/status.md` was previously stale; it now needs to stay synchronized with the Napoleon CoS integration state.

## Contributor Readiness

A new contributor can understand what Concierge is and why it exists by reading `README.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, and `.codex/context-index.md`.

A new contributor can now see both sides of the intended integration: local Concierge planning reports and Napoleon's remote contract-only CoS package. The local repo also has a first-pass reconciled Text Concierge bridge path with schemas, tests, profile mapping, trace/audit envelopes, blocked effects, and UI presentation. They still cannot treat P1 as complete because live endpoint/auth, confirmation workflows, memory proposal behavior, and contract-aware evaluator coverage remain incomplete.

## Recommended Immediate Corrections

1. Treat this review and the other reports in `docs/reports/` as the startup baseline.
2. Keep `.codex/status.md` synchronized with the Napoleon CoS integration state.
3. Add a single `make check` target that runs evaluator stub mode, schema validation, frontend build, and Tauri check when dependencies are available.
4. Expand contract tests around the reconciled local Text Concierge bridge path.
5. Add live endpoint/auth validation once Napoleon provides a runtime transport.
6. Harden evaluator scenarios and scoring before phase promotion.
7. Resolve the license TODO contradiction.
