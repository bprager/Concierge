# Chief Of Staff Alignment

Date: 2026-06-07

## Alignment Status

This is the initial alignment report based on the current Concierge repository. Live Napoleon or Chief of Staff coordination could not be verified in this session because no `NAPOLEON_EVAL_ENDPOINT` is configured in the environment.

The repository already makes the correct high-level claim: Concierge is not the authority layer. Napoleon and Chief of Staff own governance, memory, routing, agent registry, delegation review, and controlled evolution. Concierge owns local interaction, presentation, consent surfaces, telemetry capture, and conservative derived signals.

The next alignment step is to turn that claim into concrete contracts.

## Information Concierge Requires From Napoleon

### Architecture And Runtime

- Stable local or remote Napoleon bridge endpoint for Concierge turns.
- Authentication model for local app requests.
- Request and response correlation IDs.
- Supported channels: text now, voice/avatar later.
- Allowed timeout, retry, and failure behavior.
- Version compatibility rules for bridge schema changes.

### Governance

- Governance decision enum and required explanation fields.
- Which action types require confirmation.
- Confirmation challenge shape for side effects, sensitive access, memory writes, and child-protected actions.
- How approvals expire.
- How denials are represented.
- How policy changes are escalated to Chief of Staff.

### Agent Registry And Routing

- List of routable agent IDs, names, capabilities, and risk classes.
- Delegation request format.
- Delegation response format.
- Whether Concierge may display target agent names to the user.
- How routing confidence and alternatives are represented.

### Memory

- Readable memory scopes by profile.
- Memory write proposal format.
- Preference versus fact distinction.
- Child profile memory minimization rules.
- Guardian-controlled memory approval flow.
- Memory redaction and deletion hooks.

### Observability

- Required Napoleon request ID and response ID fields.
- Trace propagation format.
- Governance event payloads.
- Delegation event payloads.
- Evaluation logger contract.
- OTLP collector endpoint or local export strategy.
- Redaction responsibility split between Concierge and Napoleon.

### Chief Of Staff Review

- Review request format for architecture changes, policy changes, and evolution proposals.
- Review states: approved, rejected, needs_revision, blocked, expired.
- Required evidence for approval.
- How Chief of Staff decisions are logged and attached to proposals.
- Whether Chief of Staff can request new evaluator scenarios.

### Self-Evolution

- Accepted evolution proposal schema.
- Risk scoring rubric.
- Rollout policy by risk level.
- Rollback procedure.
- Required evaluator gates before rollout.
- Monitoring signals required after rollout.

## Expected Concierge And Chief Of Staff Interaction Contract

### Normal Text Turn

Concierge should send:

- `trace_id`
- `conversation_id`
- `turn_id`
- `profile_id`
- `profile_type`
- `channel`
- normalized user message
- local consent state
- relevant derived signals, if any
- requested action intent, if known
- client version and bridge schema version

Napoleon should return:

- `napoleon_request_id`
- `response_id`
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

The confirmation payload should include:

- action type
- human-readable action summary
- risk tier
- affected resources
- required approver profile
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

## Open Questions For Chief Of Staff

1. What is the exact bridge authentication mechanism for the first local MVP?
2. What are the canonical governance decision values?
3. Which side-effect categories must P1 support as draft-only versus confirmation-required?
4. What is the minimum agent registry format needed for text routing?
5. Can Concierge display agent routing details to the user, or should it abstract them?
6. What memory read scopes can adult owner, guest, collaborator, and child profiles access?
7. What is the guardian approval workflow for child protected mode?
8. Who owns trace assembly when both Concierge and Napoleon emit events?
9. What redaction happens locally before telemetry export, and what happens inside Napoleon?
10. Where are evaluator report histories stored for regression comparison?
11. What constitutes a Chief of Staff approval for medium-risk evolution changes?
12. Should Chief of Staff be able to block a Concierge UI release even when the evaluator passes?
13. What real Napoleon endpoint should be used for HTTP evaluator mode?
14. What is the first live test case Napoleon should run against Concierge?

## Current Contract Gaps

| Gap | Impact |
|---|---|
| OpenAPI bridge lacks auth | P1 cannot safely call a real Napoleon endpoint. |
| No governance decision enum | UI cannot reliably branch between read-only, draft, confirmation, blocked, or escalation states. |
| No confirmation request schema | The app cannot display high-risk actions safely. |
| No memory proposal schema in bridge | Memory updates could drift into ad hoc UI behavior. |
| No agent registry schema | Routing and delegation cannot be explained or tested. |
| No trace event merge contract | Local and Napoleon events may diverge. |
| No Chief of Staff review API | Approval flow is policy-only, not executable. |

## Recommended Alignment Sequence

1. Chief of Staff approves the responsibility split in `docs/ARCHITECTURE.md`.
2. Napoleon provides the first bridge auth and `/v1/concierge/turn` contract update.
3. Chief of Staff defines governance decision values and confirmation payloads.
4. Napoleon provides agent registry and memory scope contracts.
5. Concierge adds contract tests before extending UI behavior.
6. Evaluator HTTP mode is run against a real Napoleon endpoint.
7. Chief of Staff reviews the first evaluator output and records gaps as backlog items.

## Alignment Verdict

Concierge is strategically aligned with Napoleon on paper. It is not yet operationally aligned because the bridge, governance, memory, agent registry, observability, and Chief of Staff review contracts are incomplete.

The most important next step is not more UI. It is a concrete Napoleon bridge and governance contract that Concierge can test.
