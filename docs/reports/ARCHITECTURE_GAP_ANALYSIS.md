# Architecture Gap Analysis

Date: 2026-06-08

## Review Scope

Reviewed the PRD, roadmap, backlog, evaluator design, observability plan, governance and privacy policy, interaction stance policy, self-evolution policy, ADRs, schemas, bridge OpenAPI, examples, app skeleton, service notes, `.codex` handoff files, and Napoleon's remote Chief of Staff integration package discovered over ssh from `bernd@mimir`.

## Overall Assessment

The architecture is directionally sound. It correctly separates local user interaction from Napoleon authority. It also correctly delays voice, avatar, camera, and self-evolution until evaluator, text, governance, and observability foundations exist.

Napoleon's remote package now supplies contract-only detail for Chief of Staff discovery, agent manifests, governance decisions, user profiles, observability envelopes, and evolution proposals. The main architecture gap is now reconciliation: local Concierge contracts do not yet mirror those Napoleon contract surfaces, and no runtime endpoint/auth path is active.

## Strengths

- Clear Napoleon governance boundary.
- Explicit non-goals against monolithic agent behavior, direct side effects, raw media storage, emotional labeling, and uncontrolled self-modification.
- Mac-first Tauri direction is reasonable for a local desktop shell with future cross-platform options.
- Local-first perception and avatar-as-expression ADRs address major future risks early.
- Observability is treated as a product requirement from P0, not a later enhancement.
- Backlog items include acceptance criteria, observability, privacy, and evaluator expectations.
- The `.codex` layer is concise and points to canonical docs rather than duplicating them.
- Napoleon's CoS package defines a stable service id, `napoleon.chief_of_staff`, and repeatedly asserts that discovery and schemas do not grant runtime authority.
- Napoleon's governance schema provides concrete outcomes, authority tiers, approval requirements, decision IDs, audit IDs, evidence links, and blocked effects.

## High-Priority Gaps

### 1. Napoleon Bridge Contract Is Too Thin

Current state:

- `api/napoleon_bridge.openapi.yaml` defines `/v1/concierge/turn` and `/v1/concierge/evaluate`.
- `app/src/napoleonBridge.ts` can send a basic request or return a local stub.
- Napoleon's remote OpenAPI defines `/chief-of-staff/requests`, review endpoints, `/agents`, `/agents/{agent_id}`, `/governance/evaluate`, `/profiles/{profile_id}`, `/observability/traces`, and `/evolution/proposals`.

Missing:

- Local mapping from `/v1/concierge/turn` to Napoleon's manifest/profile/ChiefOfStaff/governance/observability contracts.
- Live endpoint, authentication, descriptor signature, and checksum verification.
- Error response schema.
- Request and response IDs.
- Decision and audit IDs.
- Trace propagation details aligned with Napoleon `TraceEnvelope` and `AuditEnvelope`.
- Confirmation request/response schema.
- Memory proposal schema that respects Napoleon's current blocked memory-write boundary.
- Context request schema.
- Delegation target and agent manifest schema.
- Versioning.

Recommendation:

Make contract reconciliation the next architecture artifact. No P1 behavior should depend on ad hoc response fields or bypass the `napoleon.chief_of_staff` descriptor.

### 2. Governance UX Is Not Defined Enough

Current state:

- Governance tiers are documented.
- The app has no confirmation UI.

Missing:

- User-facing confirmation states for `allow_prepare_only`, `deny`, `requires_review`, and `no_go`.
- Expiration and cancellation rules.
- Sensitive-access wording.
- Child/guardian approval path.
- Audit event requirements using Napoleon `audit_id`, `authority_tier`, `approval_requirement`, and `evidence_links`.
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

- Event enum and Napoleon envelope alignment.
- Required event fields by event type.
- Trace completeness checks.
- Local buffer contract.
- Redaction rules as executable policy.
- Privacy audit schema aligned with Napoleon `AuditEnvelope`.
- Dashboard/report format.

Recommendation:

Create a trace contract that can be validated by tests before the UI grows.

### 4. Evaluator Objective Is Ahead Of Evaluator Mechanics

Current state:

- The docs describe evaluator quality gates, hard fails, regression, reports, and human review.
- The implementation is a deterministic keyword/artifact checker with 11 scenarios, including Rehearsal Mode and governance review UI coverage.

Missing:

- Backlog-required 15+ scenarios.
- Regression comparison.
- Human review artifact.
- Adversarial and negative cases.
- Real HTTP/MCP/local stdio Napoleon baseline.
- Golden artifact comparison or judge model.
- Scenario coverage for the actual bridge and trace contracts.
- Scenarios that verify contract-only boundaries and blocked effects from the remote CoS package.

Recommendation:

Treat stub evaluator pass as build health only. Do not use it as phase readiness evidence.

### 5. Runtime Profile And Memory Semantics Are Under-Specified

Current state:

- User profile schema and adult/child examples exist.
- Memory policy appears as strings.

Missing:

- Profile resolution source and mapping from local `child_protected` to Napoleon `child_protected_user`.
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

- Evidence capture format aligned with Napoleon `evidence_links`.
- Chief of Staff review flow aligned with `ChiefOfStaffRequest` and `ChiefOfStaffResponse`.
- Rollout state machine.
- Monitoring window.
- Rollback trigger and rollback validation command.
- Evaluator scenario linkage through regression requirements.

Recommendation:

Keep self-evolution proposal-only. Do not build runtime adaptation until evaluator regression, approval, rollout, and rollback are testable.

## Inconsistencies

| Area | Inconsistency | Recommendation |
|---|---|---|
| Evaluator scenarios | Backlog asks for at least 15; current suite has 11. | Add at least four more scenarios before using evaluator for phase gates. |
| Evaluator reports | Docs mention regressions; schema/runner do not emit them. | Add regression fields or revise docs. |
| Authentication | PRD requires authenticated local bridge; OpenAPI does not specify auth. | Add auth scheme to OpenAPI. |
| Observability | Required events are broad; sample trace and telemetry helper are minimal. | Add trace completeness tests. |
| Contract surface | Local `/v1/concierge/turn` does not match Napoleon's contract-only review/discovery/governance/profile/evolution API. | Define a local adapter or revise local OpenAPI to reference Napoleon contracts. |
| Profile naming | Local profile enum uses `child_protected`; Napoleon uses `child_protected_user`. | Add explicit mapping and tests. |
| License | `LICENSE` is MIT; `LICENSE-TODO.md` says choose a license. | Replace TODO with third-party license review note. |
| `.codex/status.md` | Says scaffold is uncommitted and build status unknown. | Refresh status after this review. |

## Missing Interfaces And Contracts

1. `ConciergeTurnRequest` mapped to Napoleon `ChiefOfStaffRequest` and `GovernanceEvaluationRequest`
2. `ConciergeTurnResponse` mapped to `ChiefOfStaffResponse` and `GovernanceDecision`
3. `ChiefOfStaffServiceDescriptor`
4. `AgentManifest`
5. `GovernanceDecision`
6. `ConfirmationRequest`
7. `ConfirmationResult`
8. `DelegationRequest`
9. `DelegationResult`
10. `MemoryReadRequest`
11. `MemoryWriteProposal`
12. `TraceEnvelope`
13. `EventEnvelope`
14. `MetricEnvelope`
15. `AuditEnvelope`
16. `TelemetryExportPolicy`
17. `EvolutionProposal`

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

1. Promote Napoleon contract reconciliation to the next critical path item.
2. Validate and cache the `napoleon.chief_of_staff` descriptor with fail-closed behavior for stale schema versions.
3. Define governance confirmation as a state machine around Napoleon outcomes, authority tiers, approval requirements, blocked effects, evidence links, and audit IDs.
4. Tighten trace schemas and add validation fixtures aligned with Napoleon envelopes.
5. Add structured memory and profile policies, including profile-mode mapping.
6. Expand evaluator coverage to match the backlog and the remote contract package.
7. Resolve stale docs before they mislead future contributors.
8. Add `make check` as the single local verification entrypoint.
9. Keep voice/avatar work deferred until text trace and governance are tested.

## Architecture Verdict

The architecture is healthy for a new scaffold. The most likely failure mode is not a wrong framework choice; it is contract drift between local Concierge and Napoleon's authority boundary. The next work should reconcile the Napoleon CoS contract package into local bridge, governance, memory, profile, trace, and evaluator contracts before building more visible product behavior.
