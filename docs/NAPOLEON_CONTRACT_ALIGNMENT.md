# Napoleon Contract Alignment

Concierge keeps its local governed bridge registry generated from `api/napoleon_bridge.openapi.yaml`. Napoleon also publishes Concierge integration contracts under `docs/concierge-integration/` in the Napoleon repository.

Use this check when a Napoleon contract snapshot is available locally:

```bash
NAPOLEON_CONTRACT_OPENAPI=/path/to/concierge-integration.openapi.yaml make napoleon-contract-alignment
```

The report is local evidence only. It does not contact Napoleon, approve a runtime, write memory, dispatch agents, send externally, or grant authority. It also separates exact path drift from practical integration readiness:

- `supportedAdvisoryRuntimePaths` lists Napoleon advisory harness paths Concierge already knows how to use directly, such as `/cos/descriptor`, `/cos/capabilities`, `/cos/text-turn`, and `/cos/trace/{trace_id}`.
- `supportedReviewRuntimePaths` lists Napoleon review paths Concierge can target explicitly through a named governed bridge alias, while still requiring proof-bearing review responses.
- `conciergeLocalHandoffAliases` lists local generated Concierge operations that currently package review handoffs, such as Chief of Staff steering or evaluator review packets. These are aliases, not proof that Napoleon's broader review endpoints are runtime-compatible.
- `napoleonReviewPathsNeedingRuntimeMapping` lists Napoleon review, governance, observability, and evolution paths that still need explicit bridge-client mapping or a Napoleon-side `/v1/concierge/...` equivalent before Concierge should send to them.
- `napoleonReviewPathsWithoutLocalAlias` lists contract paths that do not even have a current local handoff alias.

## Current Finding

The Napoleon snapshot inspected from `bernd@mimir:~/Projects/Napoleon/docs/concierge-integration/apis/concierge-integration.openapi.yaml` is not path-aligned with Concierge's generated bridge registry.

Concierge currently exposes governed bridge operations under:

- `/v1/concierge/chief-of-staff/descriptor`
- `/v1/concierge/chief-of-staff/steering`
- `/v1/concierge/evaluate`
- `/v1/concierge/memory-proposals`
- `/v1/concierge/turn`

The Napoleon advisory harness snapshot exposes:

- `/cos/descriptor`
- `/cos/capabilities`
- `/cos/text-turn`
- `/cos/trace/{trace_id}`
- `/chief-of-staff/requests`
- `/chief-of-staff/reviews/evaluation`
- `/chief-of-staff/reviews/evolution-proposals`
- `/chief-of-staff/reviews/governance`
- `/chief-of-staff/reviews/new-agent-proposals`
- `/agents`
- `/agents/{agent_id}`
- `/governance/evaluate`
- `/observability/traces`
- `/profiles/{profile_id}`
- `/evolution/proposals`

The Napoleon snapshot declares `x-napoleon-runtime-authority: false`, so the mismatch is an integration contract gap, not an authority grant. Concierge should not silently treat these paths as equivalent until the bridge client, evidence comparator, descriptor discovery, and response validation are intentionally aligned.

## Current Compatibility

Concierge can discover an explicitly configured Napoleon advisory harness through `/cos/descriptor`, including the snake-case descriptor shape published by Napoleon's integration package. It treats descriptor discovery as connection state only, sends optional harness credentials only through `X-Napoleon-Auth`, honors the descriptor TTL, and fails closed if the descriptor grants runtime authority or command execution. The generated `/v1/concierge/chief-of-staff/descriptor` discovery path remains supported for generated contract-compatible runtimes.

Concierge can also adapt an explicitly configured `/cos/text-turn` Napoleon advisory harness response into the local Napoleon response model inside the governed bridge module. That adapter preserves the same prepare-only boundary: it does not write memory, capture approval, dispatch agents, send externally, or treat candidate agents as runtime-invoked agents. A successful adapted app response must also fetch `/cos/trace/{trace_id}` and confirm that the returned trace envelope matches the text-turn trace before Concierge accepts the response as successful bridge evidence.

Sanitized evidence capture and comparison now accept the explicit `/cos/descriptor` plus `/cos/text-turn` advisory harness flow while preserving the actual `/cos/text-turn` target path and privacy checks. After a successful explicit `/cos/text-turn` app send or capture, Concierge records only whether the observability envelope was observed and matched the returned text-turn trace. The trace envelope body, endpoint host, request body, response body, and token are not retained.

Chief of Staff request handoff now has a named Napoleon request-path mapping. Napoleon root endpoints or explicit Chief of Staff request endpoints use `/chief-of-staff/requests` with the `chief_of_staff_request_handoff` request kind. The handoff submits a request packet for Napoleon review only; it does not grant approval, route tasks, write memory, dispatch agents, send externally, update registries, append traces, or apply changes locally.

Governance evaluation now has a named Napoleon path mapping. Napoleon root endpoints or explicit governance evaluation endpoints use `/governance/evaluate` with the `governance_evaluation_handoff` request kind. The result can be treated only as Napoleon governance evidence for the current packet; Concierge still cannot capture approval, perform side effects, route tasks, write memory, dispatch agents, send externally, append traces, or apply changes locally.

Governance review handoff now has a named Napoleon review-path mapping. Generated Concierge-compatible endpoints, including the local harness, continue to use `/v1/concierge/chief-of-staff/steering` with the `chief_of_staff_steering_handoff` request kind. Napoleon root endpoints or explicit governance review endpoints use `/chief-of-staff/reviews/governance` with the `governance_review_handoff` request kind. Both paths still require descriptor preflight, Rehearsal Mode off, matching governance/trace/audit proof, and explicit false side-effect fields before Concierge displays the handoff as reviewed.

Evolution proposal review handoff now has the same named Napoleon review-path mapping for Chief of Staff steering and taxonomy review packets. Generated Concierge-compatible endpoints, including the local harness, continue to use `/v1/concierge/chief-of-staff/steering` with the `chief_of_staff_steering_handoff` request kind. Napoleon root endpoints or explicit evolution proposal review endpoints use `/chief-of-staff/reviews/evolution-proposals` with the `evolution_proposal_review_handoff` request kind. Both paths still require descriptor preflight, Rehearsal Mode off, matching governance/trace/audit proof, and explicit false side-effect fields before Concierge displays the handoff as reviewed.

Evolution proposal submission now has a named Napoleon path mapping. Napoleon root endpoints or explicit evolution proposal endpoints use `/evolution/proposals` with the `evolution_proposal_submission_handoff` request kind. The handoff is proposal-only evidence for Napoleon review; Concierge still cannot apply evolution changes, write memory, update registries, capture approval, dispatch agents, send externally, append traces, route tasks, or treat the response as local authority.

Observability trace handoff now has a named Napoleon path mapping. Napoleon root endpoints or explicit observability trace endpoints use `/observability/traces` with the `observability_trace_handoff` request kind. The handoff is retained evidence only; Concierge still cannot append Napoleon traces, capture approval, write memory, dispatch agents, route tasks, send externally, apply changes, or treat the response as audit authority.

Evaluator review handoff now has a named Napoleon review-path mapping for HTTP evaluator mode. Generated Concierge-compatible endpoints, including the local harness, continue to use `/v1/concierge/evaluate` with the `evaluator_prompt` request kind. Napoleon root endpoints or explicit evaluation review endpoints use `/chief-of-staff/reviews/evaluation` with the `evaluation_review_handoff` request kind. The retained evaluator report is still sanitized before it is kept as local validation evidence, and the handoff remains non-authorizing.

New agent proposal review now has a named Napoleon review-path mapping. Napoleon root endpoints or explicit new-agent proposal review endpoints use `/chief-of-staff/reviews/new-agent-proposals` with the `new_agent_proposal_review_handoff` request kind. The handoff remains proposal-only: it cannot activate an agent, write to the registry, dispatch an agent, capture approval, write memory, send externally, or apply local changes.

This is still not full path alignment because Concierge intentionally keeps generated `/v1/concierge/...` local contract paths and Napoleon also exposes discovery/profile surfaces such as `/agents`, `/agents/{agent_id}`, and `/profiles/{profile_id}`. The review, governance, observability, and evolution handoff surfaces now have explicit named runtime mappings.

## Review and Evolution Mapping Gap

Concierge currently packages local governance review, Chief of Staff steering, taxonomy review, and evaluator handoffs through generated `/v1/concierge/...` operations. This keeps the UI on named governed operations and avoids free-form paths, but it is not the same as calling Napoleon's contract-only review endpoints directly.

There are currently no known Napoleon review, governance, observability, or evolution handoff surfaces that still need explicit runtime mapping.

The explicit request/review path currently mapped is:

- `/chief-of-staff/requests`
- `/chief-of-staff/reviews/evolution-proposals`
- `/chief-of-staff/reviews/evaluation`
- `/chief-of-staff/reviews/governance`
- `/chief-of-staff/reviews/new-agent-proposals`
- `/evolution/proposals`
- `/governance/evaluate`
- `/observability/traces`

The current local aliases are useful packaging boundaries:

- Chief of Staff steering packages capability recommendation, taxonomy review, governance review, and evolution proposal review handoffs.
- Evaluator review packages local evaluator prompts.
- Chief of Staff capability discovery packages metadata-only capability and agent manifest discovery.

They remain non-authorizing. They do not imply approval, memory writes, agent dispatch, external sends, trace appends, or local application of evolution proposals.
