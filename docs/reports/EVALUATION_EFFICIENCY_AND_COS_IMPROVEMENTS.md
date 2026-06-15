# Evaluation Efficiency And Chief Of Staff Improvements

Date: 2026-06-08

## Summary

The current evaluator is efficient as a local smoke test because it is deterministic, fast, and cheap to run. It is not yet efficient as a decision-support system because it can pass shallow keyword coverage and does not yet use Napoleon's Chief of Staff contracts as hard evidence.

The best improvement is to make the evaluator contract-aware. Instead of asking only whether a response mentions governance, memory, traces, or self-evolution, it should verify whether the response and generated artifacts conform to the `napoleon.chief_of_staff` descriptor, ChiefOfStaffRequest/Response, GovernanceDecision, AgentManifest, UserProfile, TraceEnvelope, AuditEnvelope, and EvolutionProposal contracts.

## Current Evaluation Efficiency

| Dimension | Current state | Efficiency judgment |
|---|---|---|
| Runtime cost | Stub mode runs quickly and does not need a live Napoleon endpoint. | Efficient for local health checks. |
| Signal quality | Keyword and artifact checks catch missing concepts. | Useful but easy to game. |
| Contract coverage | The evaluator does not validate CoS descriptor, governance, profile, observability, or evolution schemas. | Low efficiency for integration readiness. |
| Regression support | Reports include scores, regression fields, optional baseline comparison, an accepted local baseline file, and a generated local human review record. | Still needs live-runtime baseline policy and actual reviewed records for promoted runs. |
| Human review | `make eval-human-review` generates a structured local review record with run evidence, baseline evidence, decision fields, checklist, and non-authority boundary. | Useful for owner review, but still not Napoleon approval or release approval by itself. |
| Failure localization | Missing artifacts and hard fails are reported, but failures are not tied to specific contract fields. | Moderate for planning, weak for implementation. |

## How CoS Can Improve The Process

Chief of Staff can improve evaluator support by turning review into a contract-backed workflow:

1. Require every evaluation case to declare affected contract surfaces.
2. Require source evidence links in every evaluation review packet.
3. Validate generated artifacts against local Concierge schemas and Napoleon CoS schemas.
4. Classify failures by authority boundary, governance, profile, observability, registry, memory, evolution, or UX.
5. Require `blocked_effects` and `audit_id` coverage for authority-sensitive cases.
6. Compare each run against the previous accepted baseline.
7. Return a ChiefOfStaffResponse with `accept_for_review`, `request_changes`, `reject`, `defer`, or `no_go`.
8. Generate or attach the compact human review record that explains what changed, what failed, what cannot be activated, and whether the owner approved, rejected, or requested revision.

## Recommended Evaluation Pipeline

```text
scenario -> generated response/artifacts -> schema validation -> governance hard fails
         -> trace/audit coverage checks -> regression comparison -> CoS review packet
         -> human/owner decision -> backlog or evolution proposal
```

## Concrete Improvements

### Add Contract-Aware Scenarios

Add scenarios for:

- Chief of Staff descriptor discovery and stale descriptor fail-closed behavior.
- Agent manifest missing `chief_of_staff_discovery`.
- GovernanceDecision missing `decision_id`, `audit_id`, `blocked_effects`, or `evidence_links`.
- Profile mismatch between local `child_protected` and Napoleon `child_protected_user`.
- EvolutionProposal missing rollback validation or regression requirements.
- Treating a contract-only response as approval or runtime authority.

### Add Schema Validation Gates

Each evaluator run should validate:

- `schemas/chief_of_staff_contract.schema.json`
- `schemas/governance_decision.schema.json`
- `schemas/agent_manifest.schema.json`
- `schemas/observability_envelope.schema.json`
- `schemas/concierge_text_turn.schema.json`
- `schemas/evolution_proposal.schema.json`
- `schemas/user_profile.schema.json`
- `schemas/interaction_trace.schema.json`

### Add Regression Comparison

The local repo now stores the last accepted evaluator report and compares:

- total score
- hard fail count
- scenario pass/fail state
- missing artifacts
- contract conformance failures
- trace completeness
- governance boundary violations

Regression should block promotion unless Chief of Staff and owner review explicitly accept the risk. The stored local baseline and generated human review record are evaluator evidence only; they are not Napoleon approval or release approval.

### Add CoS Review Packets

The evaluator should produce a review packet with:

- evaluation case ID
- rubric version
- result envelope
- source evidence
- affected contract surfaces
- blocked runtime effects
- recommended ChiefOfStaffResponse
- proposed backlog or evolution item

## Efficiency Tradeoff

Contract-aware evaluation will take slightly longer to run than keyword scoring, but it should reduce wasted implementation time. The current evaluator can say "this response mentions governance." A contract-aware evaluator can say "this response cannot safely activate because it lacks a decision ID, audit ID, blocked effects, and rollback validation."

That is the more useful efficiency target: fewer false positives, clearer review packets, and faster correction loops.

## Recommendation

Keep the fast stub evaluator for local smoke checks, but add a contract-aware evaluation layer before any phase promotion. Chief of Staff should own the review packet and failure classification, while Concierge should own local schema validation, trace examples, and UI evidence capture.
