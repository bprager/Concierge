# Chief Of Staff Alignment

Date: 2026-06-08

## Alignment Status

This report was rerun after discovering and ingesting Napoleon's Chief of Staff integration package via:

```bash
ssh bernd@mimir "ls ~/Projects/Napoleon/docs/concierge-integration/"
```

The remote package exists under `~/Projects/Napoleon/docs/concierge-integration/` and includes a Chief of Staff discovery descriptor, contract-only OpenAPI, and schemas for ChiefOfStaff, agent manifests, governance decisions, user profiles, observability envelopes, and evolution proposals. Live Napoleon or Chief of Staff runtime coordination still could not be verified because the descriptor has no populated live HTTP/MCP/stdio base URL and no `NAPOLEON_EVAL_ENDPOINT` is configured locally.

The repository already makes the correct high-level claim: Concierge is not the authority layer. Napoleon and Chief of Staff own governance, memory, routing, agent registry, delegation review, and controlled evolution. Concierge owns local interaction, presentation, consent surfaces, telemetry capture, and conservative derived signals.

The next alignment step is no longer to invent contracts from scratch. It is to reconcile Concierge's local bridge, profile, trace, evaluator, and evolution schemas with Napoleon's contract-only package.

## Napoleon CoS Contract Evidence Ingested

| Remote file | Alignment significance |
|---|---|
| `README.md` | Defines the integration package as contract-only and explicitly blocks runtime authority. |
| `integration-guide.md` | Defines integration order: manifest, profile, ChiefOfStaffRequest, governance evaluation, trace/audit references, evolution proposal. |
| `architecture.md` | Defines contract surfaces and decision traceability fields. |
| `chief-of-staff-discovery.md` | Defines discovery through stable service id `napoleon.chief_of_staff`, not hardcoded host or prompt text. |
| `discovery/chief-of-staff-service.yaml` | Canonical descriptor with schema version, supported transports, cache policy, blocked effects, approval requirements, and contract refs. |
| `apis/concierge-integration.openapi.yaml` | Contract-only endpoints for Chief of Staff review, agent discovery, governance evaluation, profiles, observability traces, and evolution proposals. |
| `schemas/chief-of-staff-contract.schema.yaml` | ChiefOfStaffRequest/Response shapes and review workflows. |
| `schemas/agent-manifest.schema.yaml` | Manifest fields, authority tiers, approval requirements, observability hooks, and Chief of Staff discovery block. |
| `schemas/governance-decision.schema.yaml` | GovernanceEvaluationRequest and GovernanceDecision with outcomes, authority tiers, approval requirements, blocked effects, trace ID, and audit ID. |
| `schemas/user-profile.schema.yaml` | Canonical profile modes and blocked actions. |
| `schemas/observability.schema.yaml` | Trace, event, metric, and audit envelopes plus decision traceability requirements. |
| `schemas/evolution-proposal.schema.yaml` | Evolution proposal review, approval, rollback, and regression requirements. |

## Information Concierge Requires From Napoleon

### Architecture And Runtime

- Stable `napoleon.chief_of_staff` discovery descriptor. Remote source: `discovery/chief-of-staff-service.yaml`.
- Runtime endpoint selection for supported transports: `file_manifest`, `http`, `mcp`, and `local_stdio`.
- Authentication model for local app requests; descriptor signature and checksum are marked pending.
- Request, response, decision, trace, and audit correlation IDs.
- Supported channels: text now, voice/avatar later.
- Allowed timeout, retry, and failure behavior.
- Version compatibility rules for bridge schema changes.

### Governance

- Governance decision outcomes from Napoleon: `allow_prepare_only`, `deny`, `requires_review`, and `no_go`.
- Authority tiers from Napoleon: `metadata_only`, `advisory_review`, `prepare_only`, `approval_required`, and `prohibited`.
- Approval requirements and blocked effects.
- Confirmation challenge shape for side effects, sensitive access, memory writes, and child-protected actions.
- How approvals expire.
- How denials are represented.
- How policy changes are escalated to Chief of Staff.

### Agent Registry And Routing

- Agent manifest discovery via `/agents` and `/agents/{agent_id}`.
- Manifest metadata: lifecycle status, capabilities, input/output modes, discovery info, authority tier, approval requirements, observability, evidence links, and `chief_of_staff_discovery`.
- Delegation request format.
- Delegation response format.
- Whether Concierge may display target agent names to the user.
- How routing confidence and alternatives are represented.

### Memory

- Canonical profile modes: `adult_owner`, `child_protected_user`, `guest`, and `collaborator`.
- Blocked actions by profile mode.
- Memory write proposal format.
- Preference versus fact distinction.
- Child profile memory minimization rules; Napoleon explicitly blocks `memory_write_without_owner_review` for `child_protected_user`.
- Guardian-controlled memory approval flow.
- Memory redaction and deletion hooks.

### Observability

- Required trace, event, metric, and audit envelope fields.
- Governance decisions require trace ID, audit ID, authority tier, approval requirement, and evidence links.
- Delegation decisions require trace ID, actor ID, target agent ID, decision ID, and blocked effects.
- Governance event payloads.
- Delegation event payloads.
- Evaluation logger contract.
- OTLP collector endpoint or local export strategy.
- Redaction responsibility split between Concierge and Napoleon.

### Chief Of Staff Review

- ChiefOfStaffRequest fields: request ID, requester, request type, profile mode, source evidence, requested authority tier, trace ID, and payload schema.
- ChiefOfStaffResponse decisions: `accept_for_review`, `request_changes`, `reject`, `defer`, and `no_go`.
- Review statuses: `review_ready`, `review_required`, `blocked`, `accepted`, `rejected`, and `deferred`.
- Required evidence for approval.
- How Chief of Staff decisions are logged and attached to proposals.
- Whether Chief of Staff can request new evaluator scenarios.

### Self-Evolution

- EvolutionProposal fields: proposal ID, proposer agent ID, affected surfaces, motivation, expected benefit, risk assessment, authority impact, evidence links, and trace ID.
- Review stages: proposal intake, governance review, evaluation review, rollback review, and owner acceptance.
- Approval requirements: owner explicit approval for activation, governance boundary acceptance, and regression evidence acceptance.
- Rollback requirements: rollback plan, rollback validation command, state restoration boundary, and owner abort path.
- Regression requirements: affected tests, baseline behavior, acceptance criteria, and failure handling.

## Expected Concierge And Chief Of Staff Interaction Contract

### Contract-First Integration Flow

The remote integration guide says future Concierge code should integrate in this order:

1. Fetch or validate an agent manifest from `/agents` or `/agents/{agent_id}`.
2. Determine the active user mode from the user profile contract.
3. Submit a `ChiefOfStaffRequest` with source evidence and requested authority tier.
4. Call `/governance/evaluate` before any authority-sensitive action.
5. Attach `TraceEnvelope` and `AuditEnvelope` identifiers to every governance and delegation decision.
6. For self-improvement, submit an `EvolutionProposal` and wait for review, approval, rollback, and regression evidence.

### Normal Text Turn

Concierge should send or derive:

- `trace_id`
- `conversation_id`
- `turn_id`
- `profile_id`
- Napoleon `profile_mode`
- `actor_id`
- `request_id`
- `channel`
- normalized user message
- local consent state
- relevant derived signals, if any
- requested action intent, if known
- source evidence links
- requested authority tier
- `blocked_effects`
- client version and bridge schema version

Napoleon should return:

- `napoleon_request_id`
- `response_id`
- `decision_id`, when governance or delegation is involved
- `audit_id`, when governance or delegation is involved
- response text or structured response
- selected target agent, if delegated
- governance decision
- required confirmation, if any
- selected or approved stance
- memory/context references used
- trace events or event fragments to merge into the local trace
- safe error details when the request cannot be completed

### Governance Confirmation

Concierge should not execute the side effect. It should display the confirmation request from Napoleon and send the user's approval or denial back through the bridge.

The confirmation payload should align with `GovernanceDecision` and should include:

- action type
- human-readable action summary
- authority tier
- approval requirement
- affected resources
- required approver profile
- blocked effects
- evidence links
- expiration
- rollback or undo notes, if available
- audit event ID

### Memory Update Proposal

Concierge may suggest a memory update but should not silently write it.

Expected flow:

1. Napoleon identifies a candidate memory update.
2. Concierge displays the proposal with scope, wording, retention, and profile.
3. User or guardian approves, edits, or rejects.
4. Napoleon writes or declines the memory update.
5. Trace records proposal, approval state, and final outcome.

### Chief Of Staff Review Flow

For policy, authority, child mode, memory, bridge, or self-evolution changes:

1. Concierge or Napoleon creates a review request.
2. Chief of Staff reviews evidence, risks, affected profiles, evaluator results, and rollback plan.
3. Chief of Staff returns an explicit decision.
4. Concierge records the decision only as presentation/audit state.
5. Napoleon remains responsible for applying or blocking the change.

## Remaining Open Questions For Chief Of Staff

1. What live endpoint or transport should Concierge use after validating the `napoleon.chief_of_staff` descriptor?
2. What authentication mechanism should be used for the first local MVP?
3. How should local `child_protected` map to Napoleon's `child_protected_user` profile mode?
4. Which side-effect categories must P1 support as prepare-only versus review-required?
5. Can Concierge display agent routing details to the user, or should it abstract them?
6. What memory proposal payload should be used if memory writes remain blocked by the current contract package?
7. What is the guardian approval workflow for `child_protected_user`?
8. Who owns trace assembly when both Concierge and Napoleon emit or reference trace/audit envelopes?
9. What redaction happens locally before telemetry export, and what happens inside Napoleon?
10. Where are evaluator report histories stored for regression comparison?
11. Should Chief of Staff be able to block a Concierge UI release even when the evaluator passes?
12. What real Napoleon endpoint should be used for HTTP evaluator mode?
13. What is the first live Napoleon test case Concierge should run?

## Current Contract Gaps

| Gap | Impact |
|---|---|
| Local OpenAPI does not mirror Napoleon package | Concierge currently has `/v1/concierge/turn`, while Napoleon exposes contract surfaces for Chief of Staff requests, agent discovery, governance evaluation, profiles, observability traces, and evolution proposals. |
| Live endpoint/auth still absent | The remote descriptor lists transports but does not provide live base URLs or implemented signature/checksum verification. |
| Confirmation request schema still local work | Napoleon defines governance decisions and blocked effects, but Concierge still needs a user-facing confirmation state machine. |
| Memory proposal schema remains incomplete | Napoleon blocks memory writes by contract; Concierge still needs a prepare-only proposal display contract. |
| Profile mode naming differs | Local uses `child_protected`; Napoleon uses `child_protected_user`. |
| Trace event merge contract still local work | Napoleon defines trace/audit envelopes; Concierge still must decide how local turn traces are assembled with Napoleon references. |

## Recommended Alignment Sequence

1. Validate the `napoleon.chief_of_staff` descriptor and cache/fail-closed rules locally.
2. Map local Concierge profiles, bridge requests, traces, and reports to Napoleon's schema names and required fields.
3. Update local contract tests before extending UI behavior.
4. Define user-facing confirmation UI around `GovernanceDecision` outcomes, authority tiers, approval requirements, blocked effects, evidence links, and audit IDs.
5. Add evaluator scenarios for descriptor discovery, governance evaluation, agent manifest validation, profile mapping, observability envelopes, and non-authority boundaries.
6. Run evaluator HTTP mode once Napoleon provides a real endpoint.
7. Chief of Staff reviews the first integrated evaluator output and records gaps as backlog items.

## Alignment Verdict

Concierge is strategically aligned with Napoleon on paper, and Napoleon now has a concrete contract-only integration package that Concierge can align against. It is not yet operationally aligned because the local Concierge repo has not reconciled its bridge, profile, governance, trace, evaluator, and evolution schemas with those Napoleon contracts, and no live endpoint is configured.

The most important next step is not more UI. It is local contract reconciliation and tests against the Napoleon CoS package.
