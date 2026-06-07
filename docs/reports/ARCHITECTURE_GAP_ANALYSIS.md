# Architecture Gap Analysis

Date: 2026-06-07

## Review Scope

Reviewed the PRD, roadmap, backlog, evaluator design, observability plan, governance and privacy policy, interaction stance policy, self-evolution policy, ADRs, schemas, bridge OpenAPI, examples, app skeleton, service notes, and `.codex` handoff files.

## Overall Assessment

The architecture is directionally sound. It correctly separates local user interaction from Napoleon authority. It also correctly delays voice, avatar, camera, and self-evolution until evaluator, text, governance, and observability foundations exist.

The main gap is depth. The repository describes the right boundaries but does not yet define the concrete operational contracts needed to keep those boundaries intact during implementation.

## Strengths

- Clear Napoleon governance boundary.
- Explicit non-goals against monolithic agent behavior, direct side effects, raw media storage, emotional labeling, and uncontrolled self-modification.
- Mac-first Tauri direction is reasonable for a local desktop shell with future cross-platform options.
- Local-first perception and avatar-as-expression ADRs address major future risks early.
- Observability is treated as a product requirement from P0, not a later enhancement.
- Backlog items include acceptance criteria, observability, privacy, and evaluator expectations.
- The `.codex` layer is concise and points to canonical docs rather than duplicating them.

## High-Priority Gaps

### 1. Napoleon Bridge Contract Is Too Thin

Current state:

- `api/napoleon_bridge.openapi.yaml` defines `/v1/concierge/turn` and `/v1/concierge/evaluate`.
- `app/src/napoleonBridge.ts` can send a basic request or return a local stub.

Missing:

- Authentication and authorization.
- Error response schema.
- Request and response IDs.
- Trace propagation details.
- Governance decision enum.
- Confirmation request/response schema.
- Memory proposal schema.
- Context request schema.
- Delegation target and agent registry schema.
- Versioning.

Recommendation:

Make the bridge contract the next architecture artifact to harden. No P1 behavior should depend on ad hoc response fields.

### 2. Governance UX Is Not Defined Enough

Current state:

- Governance tiers are documented.
- The app has no confirmation UI.

Missing:

- User-facing confirmation states.
- Expiration and cancellation rules.
- Sensitive-access wording.
- Child/guardian approval path.
- Audit event requirements.
- How blocked actions are explained.

Recommendation:

Define a confirmation state machine before implementing any side-effect-adjacent behavior.

### 3. Observability Requirements Exceed Current Schemas

Current state:

- `docs/OBSERVABILITY.md` lists rich trace fields and required events.
- `schemas/interaction_trace.schema.json` is permissive.
- `examples/sample_interaction_trace.json` omits several required events and IDs.
- `app/src/telemetry.ts` only logs console payloads.

Missing:

- Event enum.
- Required event fields by event type.
- Trace completeness checks.
- Local buffer contract.
- Redaction rules as executable policy.
- Privacy audit schema.
- Dashboard/report format.

Recommendation:

Create a trace contract that can be validated by tests before the UI grows.

### 4. Evaluator Objective Is Ahead Of Evaluator Mechanics

Current state:

- The docs describe evaluator quality gates, hard fails, regression, reports, and human review.
- The implementation is a deterministic keyword/artifact checker with 6 scenarios.

Missing:

- Backlog-required 15+ scenarios.
- Regression comparison.
- Human review artifact.
- Adversarial and negative cases.
- Real HTTP Napoleon baseline.
- Golden artifact comparison or judge model.
- Scenario coverage for the actual bridge and trace contracts.

Recommendation:

Treat stub evaluator pass as build health only. Do not use it as phase readiness evidence.

### 5. Runtime Profile And Memory Semantics Are Under-Specified

Current state:

- User profile schema and adult/child examples exist.
- Memory policy appears as strings.

Missing:

- Profile resolution source.
- Profile switching constraints.
- Guest/collaborator examples.
- Guardian approval shape.
- Memory proposal and retention policy.
- Memory read/write audit fields.

Recommendation:

Turn profile and memory policy into structured contracts before implementing identity and memory flows.

### 6. Self-Evolution Is Conceptually Strong But Operationally Undefined

Current state:

- Policy and schema exist.
- Approval tiers are documented.

Missing:

- Evidence capture format.
- Chief of Staff review flow.
- Rollout state machine.
- Monitoring window.
- Rollback trigger.
- Evaluator scenario linkage.

Recommendation:

Keep self-evolution proposal-only. Do not build runtime adaptation until evaluator regression, approval, rollout, and rollback are testable.

## Inconsistencies

| Area | Inconsistency | Recommendation |
|---|---|---|
| Evaluator scenarios | Backlog asks for at least 15; current suite has 6. | Expand before using evaluator for phase gates. |
| Evaluator reports | Docs mention regressions; schema/runner do not emit them. | Add regression fields or revise docs. |
| Authentication | PRD requires authenticated local bridge; OpenAPI does not specify auth. | Add auth scheme to OpenAPI. |
| Observability | Required events are broad; sample trace and telemetry helper are minimal. | Add trace completeness tests. |
| License | `LICENSE` is MIT; `LICENSE-TODO.md` says choose a license. | Replace TODO with third-party license review note. |
| `.codex/status.md` | Says scaffold is uncommitted and build status unknown. | Refresh status after this review. |

## Missing Interfaces And Contracts

1. `ConciergeTurnRequest`
2. `ConciergeTurnResponse`
3. `GovernanceDecision`
4. `ConfirmationRequest`
5. `ConfirmationResult`
6. `DelegationRequest`
7. `DelegationResult`
8. `AgentRegistryEntry`
9. `MemoryReadRequest`
10. `MemoryWriteProposal`
11. `PrivacyAuditEvent`
12. `TraceEvent`
13. `TelemetryExportPolicy`
14. `ChiefOfStaffReviewRequest`
15. `ChiefOfStaffReviewDecision`

## Missing Success Metrics

The PRD lists many success metrics, but several need operational definitions:

- Correct routing rate: needs labeled fixtures and target threshold.
- Clarification usefulness: needs measurement method.
- Unsafe side effect rate: needs definition of unsafe attempt versus blocked attempt.
- Stance fit rating: needs collection and review method.
- Trace completeness: needs executable validator.
- Child age-appropriate readability: needs rubric or readability target.
- Guardian approval compliance: needs scenario tests.
- Redaction failure count: needs detection strategy.
- Evaluator regression delta: needs stored baseline and threshold.

## Recommended Architecture Improvements

1. Promote the bridge contract to the next critical path item.
2. Define governance confirmation as a state machine.
3. Tighten trace schemas and add validation fixtures.
4. Add structured memory and profile policies.
5. Expand evaluator coverage to match the backlog.
6. Resolve stale docs before they mislead future contributors.
7. Add `make check` as the single local verification entrypoint.
8. Keep voice/avatar work deferred until text trace and governance are tested.

## Architecture Verdict

The architecture is healthy for a new scaffold. The most likely failure mode is not a wrong framework choice; it is authority drift through underspecified contracts. The next work should make the Napoleon bridge, governance, memory, and trace contracts precise before building more visible product behavior.
