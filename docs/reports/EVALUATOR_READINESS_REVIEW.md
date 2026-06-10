# Evaluator Readiness Review

Date: 2026-06-08

## Executive Summary

The evaluator is ready as a local smoke test and repository health check. It is not ready to objectively assess future Concierge development or Napoleon's real Chief of Staff quality.

The current runner proves that scenarios, rubrics, expected artifacts, and report generation are wired together. It does not yet prove that Napoleon can produce a safe, complete, implementation-ready Concierge design. After ingesting Napoleon's remote CoS integration package, the evaluator also needs to test contract conformance, descriptor discovery, blocked effects, governance outcomes, and trace/audit envelope requirements.

## Current Evaluator Inventory

| Artifact | Current state |
|---|---|
| Runner | `evaluator/eval_runner.py`, supports `stub` and `http` modes |
| Scenarios | 15 scenarios in `evaluator/scenarios.yaml`, including Rehearsal Mode, governance review UI, memory proposal review, bridge failure handling, privacy settings controls, and contract mismatch fail-closed coverage |
| Rubric | 10 weighted dimensions in `evaluator/rubrics.yaml` |
| Hard fails | 5 hard fail rules |
| Expected artifacts | Required keyword lists in `evaluator/expected_artifacts.yaml` |
| Prompts | Full design prompt and critique prompt |
| CI | Weekly/manual GitHub Actions workflow |
| Report | JSON report with scores, hard fails, missing artifacts, cases |
| Napoleon contract evidence | Remote CoS integration package with descriptor, OpenAPI, and schema files ingested over ssh from `bernd@mimir` |

## Latest Local Evidence

The existing stub report at `evaluator/reports/latest.json` shows:

- Mode: `stub`
- Scenario count: 15
- Score total: 97.5
- Hard failures: 0
- Missing artifacts: 0

This is useful evidence that the runner works. It is not evidence that Napoleon or Chief of Staff is ready, because stub mode returns a deliberately complete response.

## Can It Objectively Assess Future Concierge Development?

Not yet.

The evaluator can check for the presence of important concepts. It cannot yet judge whether those concepts are correct, actionable, safe, complete, or consistent with the repository.

Specific limitations:

- Keyword matching can reward shallow mentions.
- The suite now meets the backlog target of at least 15 scenarios, but the cases are still deterministic artifact checks.
- There are no negative tests that assert unsafe designs fail.
- There is no regression comparison.
- There is no human review artifact.
- There is no golden answer comparison.
- There is no bridge contract or trace validation.
- There is no evaluator coverage for the actual P1 UI flow.
- There is no validation against Napoleon's `napoleon.chief_of_staff` descriptor, governance decision schema, agent manifest schema, profile contract, observability envelopes, or evolution proposal contract.

## Scenario Gaps

Current scenarios cover broad design, critique, adult/child policy, observability, self-evolution, avatar safety, Rehearsal Mode previews for adult owner, child protected, guest/collaborator, adversarial requests, governance review UI behavior, memory proposal review, live bridge failure handling, local privacy settings controls, and contract mismatch fail-closed behavior.

Missing scenario groups:

1. Sensitive data access request.
2. Additional memory write rejection variants beyond the first memory proposal review scenario.
3. Child user asking for secret-keeping.
4. Child user requesting an external action.
5. Guest/collaborator access isolation.
6. Additional degraded Napoleon availability variants beyond the first bridge failure scenario.
7. Incomplete trace detection.
8. Missing governance decision detection.
9. Unsafe direct tool execution proposal.
10. Agent registry routing explanation.
11. Regression from a previous accepted design.
12. Telemetry redaction failure.
13. Additional camera/microphone opt-in violation variants beyond the first privacy settings scenario.
14. Self-evolution proposal without rollback.
15. Avatar behavior that implies authority.
16. Voice always-on capture violation.
17. License/privacy publishing readiness.
18. Additional Chief of Staff descriptor discovery and fail-closed cache behavior variants beyond the first contract mismatch scenario.
19. Agent manifest missing `chief_of_staff_discovery`.
20. Governance decision missing `decision_id`, `audit_id`, `blocked_effects`, or `evidence_links`.
21. Local `child_protected` profile not mapped to Napoleon `child_protected_user`.
22. Evolution proposal missing rollback validation command or regression requirements.
23. Contract-only boundary violated by treating discovery as runtime authority.

## Scoring Criteria Gaps

The current dimensions are directionally right, but the scoring method is too loose.

Needed improvements:

- Require concrete artifacts, not only terms.
- Score bridge contract completeness separately.
- Score governance confirmation and approval lifecycle separately.
- Score trace completeness against schema.
- Score child protected mode with explicit negative cases.
- Score memory read/write boundaries separately.
- Score evaluator regression behavior separately.
- Score implementation readiness, not just concept coverage.
- Score contradictions against repository docs.
- Score conformance to Napoleon's contract-only schemas and blocked effects.
- Score descriptor discovery and stale descriptor behavior.

## Hard Fail Gaps

Current hard fails catch missing contract, missing observability, missing child policy, unsafe autonomy phrases, and emotion-as-fact phrases.

Add hard fails for:

- Missing bridge authentication.
- Missing governance decision path.
- Direct tool calls from Concierge.
- Missing trace ID or incomplete trace events.
- Raw audio/video storage by default.
- Child external action without guardian approval.
- Memory write without approval.
- Self-evolution rollout without rollback.
- Avatar or voice behavior that pressures the user.
- Missing redaction before telemetry export.
- No agent registry or delegation explanation.
- Missing `napoleon.chief_of_staff` descriptor validation.
- Missing source evidence in ChiefOfStaffRequest.
- Missing blocked effects in ChiefOfStaffResponse or GovernanceDecision.
- Treating a contract-only response as approval, dispatch, routing, memory write, audit append, or external send authority.

## Trace And Observability Gaps

The evaluator should check:

- Every scenario has `trace_id`, `conversation_id`, and `turn_id`.
- `identity_resolved` is emitted before profile-dependent behavior.
- `stance_selected` includes reason and confidence.
- `governance_decision` exists for any action candidate.
- `delegation_requested` includes target agent and reason.
- `response_generated` is present.
- Sensitive requests include redaction or privacy audit events.
- Child-mode requests include child policy event coverage.
- Bridge errors are traceable.
- Governance/delegation decisions include `decision_id`, `audit_id`, `authority_tier`, `approval_requirement`, `evidence_links`, and `blocked_effects`.
- Trace/audit envelopes align with Napoleon's observability schema.

## Governance Check Gaps

Evaluator scenarios should explicitly test:

- Read-only response needs no extra approval.
- Draft action requires user review.
- Side effect requires explicit confirmation.
- Sensitive access requires purpose-bound confirmation.
- Memory write requires approval.
- Policy change requires Chief of Staff plus approval.
- Child external action requires guardian-appropriate approval.
- Blocked actions are explained without bypass suggestions.
- `allow_prepare_only` never becomes direct execution.
- `requires_review` blocks activation until review evidence exists.
- `no_go` is treated as a hard stop.
- Discovery descriptor metadata is treated as advisory address/purpose metadata, not authority.

## Report Gaps

The docs describe richer reporting than the runner currently produces.

Missing or weak report fields:

- Regression delta.
- Previous run reference.
- Human-readable summary.
- Promotion recommendation.
- Scenario pass/fail status separate from score.
- Judge notes or failure rationale.
- Napoleon endpoint/version identity.
- Coverage summary by risk class.
- Trace completeness summary.
- Governance hard-fail summary.
- Napoleon contract conformance summary.
- Descriptor version/cache status.
- Blocked effects coverage.

## Readiness Gates Before P1 Promotion

Before treating the evaluator as a phase gate:

1. Add more negative scenarios for unsafe behavior.
2. Add regression comparison.
3. Add regression baseline storage for accepted reports.
4. Add schema validation for reports and examples.
5. Add trace completeness checks.
6. Add governance-specific hard fails.
7. Add validation against the remote CoS descriptor and schemas, or local mirrored equivalents.
8. Run HTTP/MCP/local stdio mode against a real Napoleon endpoint once available.
9. Add a human review artifact or checklist.
10. Store or compare evaluator history.
11. Make CI fail on hard fails, schema errors, contract boundary violations, and regression thresholds.

## Recommended Near-Term Evaluator Work

1. Add a `make check` target that runs evaluator stub mode and schema validation.
2. Add at least nine more scenarios to meet the backlog target.
3. Add hard fails for bridge auth, direct tool calls, memory writes, raw capture, child guardian approval, missing blocked effects, and contract-only authority violations.
4. Add report schema coverage for regressions and contract conformance.
5. Add a Markdown summary output for human review.
6. Add first HTTP/MCP/local stdio mode run once Napoleon provides an endpoint.

## Evaluator Verdict

The evaluator is a useful P0 scaffold, but it should not be trusted as an objective gate yet. Its next job is to become stricter, broader, harder to game, and explicitly aware of Napoleon's CoS contract package.
