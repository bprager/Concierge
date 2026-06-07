# Evaluator Readiness Review

Date: 2026-06-07

## Executive Summary

The evaluator is ready as a local smoke test and repository health check. It is not ready to objectively assess future Concierge development or Napoleon's real Chief of Staff quality.

The current runner proves that scenarios, rubrics, expected artifacts, and report generation are wired together. It does not yet prove that Napoleon can produce a safe, complete, implementation-ready Concierge design.

## Current Evaluator Inventory

| Artifact | Current state |
|---|---|
| Runner | `evaluator/eval_runner.py`, supports `stub` and `http` modes |
| Scenarios | 6 scenarios in `evaluator/scenarios.yaml` |
| Rubric | 10 weighted dimensions in `evaluator/rubrics.yaml` |
| Hard fails | 5 hard fail rules |
| Expected artifacts | Required keyword lists in `evaluator/expected_artifacts.yaml` |
| Prompts | Full design prompt and critique prompt |
| CI | Weekly/manual GitHub Actions workflow |
| Report | JSON report with scores, hard fails, missing artifacts, cases |

## Latest Local Evidence

The existing stub report at `evaluator/reports/latest.json` shows:

- Mode: `stub`
- Scenario count: 6
- Score total: 96.25
- Hard failures: 0
- Missing artifacts: 0

This is useful evidence that the runner works. It is not evidence that Napoleon or Chief of Staff is ready, because stub mode returns a deliberately complete response.

## Can It Objectively Assess Future Concierge Development?

Not yet.

The evaluator can check for the presence of important concepts. It cannot yet judge whether those concepts are correct, actionable, safe, complete, or consistent with the repository.

Specific limitations:

- Keyword matching can reward shallow mentions.
- There are too few scenarios for the backlog target.
- There are no negative tests that assert unsafe designs fail.
- There is no regression comparison.
- There is no human review artifact.
- There is no golden answer comparison.
- There is no bridge contract or trace validation.
- There is no evaluator coverage for the actual P1 UI flow.

## Scenario Gaps

Current scenarios cover broad design, critique, adult/child policy, observability, self-evolution, and avatar safety.

Missing scenario groups:

1. Side-effect request requiring confirmation.
2. Sensitive data access request.
3. Memory write proposal and rejection.
4. Child user asking for secret-keeping.
5. Child user requesting an external action.
6. Guest/collaborator access isolation.
7. Bridge error and degraded Napoleon availability.
8. Incomplete trace detection.
9. Missing governance decision detection.
10. Unsafe direct tool execution proposal.
11. Agent registry routing explanation.
12. Regression from a previous accepted design.
13. Telemetry redaction failure.
14. Camera/microphone opt-in violation.
15. Self-evolution proposal without rollback.
16. Avatar behavior that implies authority.
17. Voice always-on capture violation.
18. License/privacy publishing readiness.

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

## Readiness Gates Before P1 Promotion

Before treating the evaluator as a phase gate:

1. Expand to at least 15 scenarios.
2. Add negative scenarios for unsafe behavior.
3. Add regression comparison.
4. Add schema validation for reports and examples.
5. Add trace completeness checks.
6. Add governance-specific hard fails.
7. Run HTTP mode against a real Napoleon endpoint.
8. Add a human review artifact or checklist.
9. Store or compare evaluator history.
10. Make CI fail on hard fails, schema errors, and regression thresholds.

## Recommended Near-Term Evaluator Work

1. Add a `make check` target that runs evaluator stub mode and schema validation.
2. Add at least nine more scenarios to meet the backlog target.
3. Add hard fails for bridge auth, direct tool calls, memory writes, raw capture, and child guardian approval.
4. Add report schema coverage for regressions.
5. Add a Markdown summary output for human review.
6. Add first HTTP-mode run once Napoleon provides an endpoint.

## Evaluator Verdict

The evaluator is a useful P0 scaffold, but it should not be trusted as an objective gate yet. Its next job is to become stricter, broader, and harder to game.
