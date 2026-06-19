# Controlled Self-Evolution

## 1. Principle

Concierge may learn from interactions, but it must not freely rewrite production behavior.

The safe model is:

1. Observe
2. Measure
3. Propose
4. Evaluate
5. Approve
6. Roll out
7. Monitor
8. Roll back if needed

## 2. Evolution Controller

The Evolution Controller belongs to Napoleon, not the avatar front-end.

Responsibilities:

- Collect learning signals
- Detect repeated failures
- Create evolution proposals
- Attach evidence
- Assess risk
- Add evaluator regression cases
- Request approval
- Track rollout and rollback

## 3. Learning signals

Learning signals are metadata-only records validated by `schemas/learning_signal.schema.json`.

Examples:

- User correction
- User interruption
- User rating
- Repeated routing failure
- Repeated privacy setting change
- Stance mismatch
- Child confusion signal
- Governance block
- Evaluator regression
- Conversation capability signal
- Capability recommendation

Each signal must include trace, turn, conversation, profile mode, channel, signal type, capability, architecture area, confidence, evidence references, privacy classification, and explicit proposal-only governance boundaries. The schema supports corrections, interruptions, ratings, and repeated patterns. Raw user text, raw audio, and raw video are false by contract, and child-protected signals must be minimized before they can inform a proposal.

The Text Concierge runtime can now derive these records from local Conversation Capability Intelligence metadata through `app/src/learningSignal.ts`. The helper emits schema-shaped records and count-only telemetry attributes; it sanitizes capability labels, allowlists local evidence references, drops raw-looking redacted summaries that contain email addresses, URLs, token-shaped values, or secret wording, and does not copy raw conversation text, claim approval, write memory, dispatch agents, send externally, or apply changes locally.

Chief of Staff steering drafts attach these records to evolution proposal drafts when local capability evidence supports the recommendation. Draft creation also emits local `learning_signal_recorded` telemetry from metadata-only attributes, without raw content, approval capture, memory writes, agent dispatch, external sends, or local application.

## 4. Change categories

| Category | Example | Risk |
|---|---|---|
| Preference | User prefers shorter answers | Low |
| Stance | Reduce humor in work mode | Low |
| Routing | Calendar requests route to Calendar Agent first | Medium |
| Interface | Default camera off | Medium |
| Capability intelligence | Recommend a missing easy-to-evolve conversation capability | Medium |
| Memory | Store stable preference automatically | High |
| Tool access | Allow email metadata access | High |
| Child policy | Change child proactivity | Very high |
| External action authority | Send messages without confirmation | Very high |

## 5. Approval policy

| Risk | Approval |
|---|---|
| Low | User approval or local setting |
| Medium | Chief of Staff approval |
| High | Chief of Staff plus evaluator pass |
| Very high | Explicit human approval plus evaluator pass plus rollback plan |

## 6. Evolution proposal content

Each proposal must include:

- Summary
- Evidence
- Conversation capability evidence, if applicable
- Affected user profiles
- Affected channels
- Affected architecture area
- Risk level
- Expected benefit
- New evaluator cases
- Rollout plan
- Rollback plan
- Approval status

## 7. Regression rule

No change can be accepted unless:

- Existing hard fail tests still pass
- Related evaluator scenarios pass
- Observability fields remain complete
- Privacy behavior does not weaken silently

## 8. Capability intelligence boundary

Conversation Capability Intelligence may cluster working and missing capabilities, rank possible improvements, and suggest backlog or evaluator additions.

It may not:

- Implement capabilities automatically
- Grant approval
- Write memory
- Dispatch agents
- Send externally
- Expand tool access
- Change child policy
- Optimize for engagement at the expense of safety or privacy

Any recommendation that changes behavior must become an evolution proposal with evidence, evaluator coverage, approval, rollout, and rollback.
