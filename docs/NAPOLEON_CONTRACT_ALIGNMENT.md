# Napoleon Contract Alignment

Concierge keeps its local governed bridge registry generated from `api/napoleon_bridge.openapi.yaml`. Napoleon also publishes Concierge integration contracts under `docs/concierge-integration/` in the Napoleon repository.

Use this check when a Napoleon contract snapshot is available locally:

```bash
NAPOLEON_CONTRACT_OPENAPI=/path/to/concierge-integration.openapi.yaml make napoleon-contract-alignment
```

The report is local evidence only. It does not contact Napoleon, approve a runtime, write memory, dispatch agents, send externally, or grant authority. It also separates exact path drift from practical integration readiness:

- `aligned` is true only when Concierge and Napoleon expose the same literal path set.
- `runtimeAligned` is true when every Napoleon-only runtime path in the snapshot is covered by a supported advisory path, supported review/discovery path, or explicit local handoff alias, and every named Concierge Napoleon review/evidence/status target is present in the Napoleon snapshot, even if Concierge intentionally keeps local `/v1/concierge/...` packaging paths.
- `alignmentStatus` is `exact_path_match`, `runtime_mapped_with_local_contract_paths`, or `runtime_mapping_gaps_present`.
- `unmappedNapoleonRuntimePaths` lists Napoleon-only paths that are not yet covered by any supported runtime mapping or local handoff alias.
- `supportedAdvisoryRuntimePaths` lists Napoleon advisory harness paths Concierge already knows how to use directly, such as `/cos/descriptor`, `/cos/capabilities`, `/cos/text-turn`, and `/cos/trace/{trace_id}`.
- `supportedReviewRuntimePaths` lists Napoleon review paths Concierge can target explicitly through a named governed bridge alias, while still requiring proof-bearing review responses.
- `supportedDiscoveryRuntimePaths` lists Napoleon metadata discovery paths Concierge can target explicitly through named governed bridge aliases, such as `/agents`, `/agents/{agent_id}`, and `/profiles/{profile_id}`. These are metadata-only reads and do not dispatch agents, update registries, write memory, capture approval, send externally, or grant runtime authority.
- `conciergeLocalHandoffAliases` lists local generated Concierge operations that currently package review handoffs, such as Chief of Staff steering or evaluator review packets. These are packaging aliases; runtime compatibility still depends on their explicit named Napoleon path mappings plus descriptor preflight and proof-bearing responses.
- Alias entries classify mapped Napoleon review paths as `explicit_napoleon_runtime_paths_supported` and metadata discovery paths as `explicit_metadata_discovery_paths_supported`; both classifications remain non-authorizing local evidence.
- `napoleonReviewPathsNeedingRuntimeMapping` lists Napoleon review, governance, observability, and evolution paths that still need explicit bridge-client mapping or a Napoleon-side `/v1/concierge/...` equivalent before Concierge should send to them.
- `napoleonReviewPathsWithoutLocalAlias` lists contract paths that do not even have a current local handoff alias.
- `conciergeReviewPathsMissingFromNapoleonRuntime` and `conciergeReviewOperationsMissingFromNapoleonRuntime` list named Concierge Napoleon targets that are generated locally but absent from the inspected Napoleon snapshot; these are runtime exposure gaps, not permission to fall back to free-form paths.
- `napoleonRequiredActions` turns those missing named targets into Napoleon-owned required actions with the expected operation, target path, request kind, live-promotion blocking state, and non-authority boundary.

## Current Finding

The Napoleon snapshot inspected from `bernd@mimir:~/Projects/Napoleon/docs/concierge-integration/apis/concierge-integration.openapi.yaml` is not path-identical with Concierge's generated bridge registry. The snapshot verified on 2026-06-27 maps all Napoleon-only runtime paths that Concierge knows how to use, but it does not yet expose Concierge's named read-only `evolution_proposal_status` target for `/evolution/proposals/{proposal_id}/status`. In machine-readable report terms, `aligned` remains false because the literal path sets differ, `runtimeAligned` remains false until that Concierge-side target is present in the Napoleon snapshot, and `alignmentStatus` is `runtime_mapping_gaps_present`.

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

The alignment report now also emits a Napoleon-owned required action:

- `expose_evolution_proposal_status_runtime_target`: expose and advertise the read-only `evolution_proposal_status` runtime target at `/evolution/proposals/{proposal_id}/status` with `evolution_proposal_status_handoff` before Concierge can refresh proposal status against live Napoleon.

That action blocks live promotion for proposal-status refresh only. It does not authorize Concierge to use free-form paths, capture approval, apply evolution, update registries, write memory, dispatch agents, send externally, append traces, route tasks, or treat proposal status as local authority.

The Napoleon snapshot declares `x-napoleon-runtime-authority: false`, so the path mismatch is not an authority grant. Concierge should continue to treat local `/v1/concierge/...` paths and Napoleon runtime paths as separate named mappings, with descriptor preflight, evidence comparison, response validation, and proposal-only boundaries deciding whether a given handoff may be attempted.

## Current Compatibility

Concierge can discover an explicitly configured Napoleon advisory harness through `/cos/descriptor`, including the snake-case descriptor shape published by Napoleon's integration package. It treats descriptor discovery as connection state only, sends optional harness credentials only through `X-Napoleon-Auth`, honors the descriptor TTL, and fails closed if the descriptor grants runtime authority or command execution. The generated `/v1/concierge/chief-of-staff/descriptor` discovery path remains supported for generated contract-compatible runtimes.

Concierge can also adapt a Napoleon advisory harness text turn into the local Napoleon response model inside the governed bridge module. The configured endpoint may be `/cos`, `/cos/descriptor`, `/cos/capabilities`, or `/cos/text-turn`; live text sends normalize those forms to `POST /cos/text-turn`. That adapter preserves the same prepare-only boundary: it does not write memory, capture approval, dispatch agents, send externally, or treat candidate agents as runtime-invoked agents. A successful adapted app response must also fetch `/cos/trace/{trace_id}` and confirm that the returned trace envelope matches the text-turn trace before Concierge accepts the response as successful bridge evidence.

Sanitized evidence capture and comparison now accept the explicit `/cos/descriptor` plus `/cos/text-turn` advisory harness flow while preserving the actual `/cos/text-turn` target path and privacy checks. After a successful explicit `/cos/text-turn` app send or capture, Concierge records only whether the observability envelope was observed and matched the returned text-turn trace. The trace envelope body, endpoint host, request body, response body, and token are not retained.

Chief of Staff request handoff now has a named Napoleon request-path mapping. Napoleon root endpoints or explicit Chief of Staff request endpoints use `/chief-of-staff/requests` with the `chief_of_staff_request_handoff` request kind. The handoff submits a request packet for Napoleon review only; it does not grant approval, route tasks, write memory, dispatch agents, send externally, update registries, append traces, or apply changes locally. The governed route panel must show that task routing, registry update, trace append, approval capture, memory write, agent dispatch, external send, and local application remain blocked Concierge effects.

Governance evaluation now has a named Napoleon path mapping. Napoleon root endpoints or explicit governance evaluation endpoints use `/governance/evaluate` with the `governance_evaluation_handoff` request kind. The result can be treated only as Napoleon governance evidence for the current packet; Concierge still cannot override governance, capture approval, perform side effects, route tasks, write memory, dispatch agents, send externally, update registries, append traces, or apply changes locally. The governed route panel must show that governance override and those side effects remain blocked Concierge effects.

Governance review handoff now has a named Napoleon review-path mapping. Generated Concierge-compatible endpoints, including the local harness, continue to use `/v1/concierge/chief-of-staff/steering` with the `chief_of_staff_steering_handoff` request kind. Napoleon root endpoints or explicit governance review endpoints use `/chief-of-staff/reviews/governance` with the `governance_review_handoff` request kind. Both paths still require descriptor preflight, Rehearsal Mode off, matching governance/trace/audit proof, and explicit false side-effect fields before Concierge displays the handoff as reviewed. The governed route panel must show that approval capture, governance override, memory write, agent dispatch, external send, registry update, trace append, routing, and local application remain blocked Concierge effects.

Evolution proposal review handoff now has the same named Napoleon review-path mapping for Chief of Staff steering and taxonomy review packets. Generated Concierge-compatible endpoints, including the local harness, continue to use `/v1/concierge/chief-of-staff/steering` with the `chief_of_staff_steering_handoff` request kind. Napoleon root endpoints or explicit evolution proposal review endpoints use `/chief-of-staff/reviews/evolution-proposals` with the `evolution_proposal_review_handoff` request kind. Both paths still require descriptor preflight, Rehearsal Mode off, matching governance/trace/audit proof, and explicit false side-effect fields before Concierge displays the handoff as reviewed. The governed route panel must show that evolution application, approval capture, registry update, memory write, agent dispatch, external send, trace append, routing, and local application remain blocked Concierge effects.

Evolution proposal submission now has a named Napoleon path mapping. Napoleon root endpoints or explicit evolution proposal endpoints use `/evolution/proposals` with the `evolution_proposal_submission_handoff` request kind. The handoff is proposal-only evidence for Napoleon review; Concierge still cannot apply evolution changes, write memory, update registries, capture approval, dispatch agents, send externally, append traces, route tasks, or treat the response as local authority.

Evolution proposal status now has a named read-only Napoleon path mapping. Napoleon root endpoints or explicit evolution proposal status endpoints use `/evolution/proposals/{proposal_id}/status` with the `evolution_proposal_status_handoff` request kind. The refresh can update only browser-local lifecycle metadata after descriptor preflight advertises the handoff; Concierge still cannot capture approval, apply evolution, update registries, write memory, dispatch agents, send externally, append traces, route tasks, or treat the status response as local authority.

Observability trace handoff now has a named Napoleon path mapping and a descriptor-gated packet sender. Napoleon root endpoints or explicit observability trace endpoints use `/observability/traces` with the `observability_trace_handoff` request kind. The handoff is retained evidence only; Concierge still cannot append Napoleon traces, capture approval, write memory, dispatch agents, route tasks, send externally, apply changes, or treat the response as audit authority. Responses that claim trace append, audit authority, or other blocked effects are contract mismatches. The governed route panel must show that trace append, audit authority, approval capture, memory write, task routing, agent dispatch, external send, and local application remain blocked Concierge effects.

Evaluator review handoff now has a named Napoleon review-path mapping for HTTP evaluator mode. Generated Concierge-compatible endpoints, including the local harness, continue to use `/v1/concierge/evaluate` with the `evaluator_prompt` request kind. Napoleon root endpoints or explicit evaluation review endpoints use `/chief-of-staff/reviews/evaluation` with the `evaluation_review_handoff` request kind. Descriptor discovery also allowlists generated Napoleon review, request, governance-evaluation, evolution-submission, new-agent-review, evaluator-review, observability, memory, steering, taxonomy, and text-turn handoff names in `supportedHandoffs` / `supported_handoffs`, so Napoleon can advertise those mapped targets without Concierge treating the descriptor as invalid. The retained evaluator report is still sanitized before it is kept as local validation evidence, and the handoff remains non-authorizing. The governed route panel must show that evaluator approval, release approval, memory write, agent dispatch, external send, registry update, trace append, routing, and local application remain blocked Concierge effects.

New agent proposal review now has a named Napoleon review-path mapping and descriptor-gated packet sender. Napoleon root endpoints or explicit new-agent proposal review endpoints use `/chief-of-staff/reviews/new-agent-proposals` with the `new_agent_proposal_review_handoff` request kind. The Text UI can draft/export a sanitized candidate agent proposal from Capability Intelligence review evidence, then submit it only when endpoint, descriptor, advertised handoff route, active profile, and Rehearsal Mode gates pass. The handoff remains proposal-only: it cannot activate an agent, write to the registry, dispatch an agent, capture approval, write memory, send externally, or apply local changes. Responses that claim registry update or agent activation are contract mismatches.

Napoleon agent and profile metadata discovery now has named runtime mapping generated from `x-concierge-napoleon-discovery-operations`: `agent_manifest_list` uses `/agents` with `agent_manifest_discovery`, `agent_manifest` uses `/agents/{agent_id}` with `agent_manifest_discovery`, and `profile` uses `/profiles/{profile_id}` with `profile_metadata_discovery`. These targets are read-only connection metadata surfaces. They cannot be used as local agent dispatch, registry update, profile memory write, approval capture, external send, or runtime authority paths.

This is still not full path alignment because Concierge intentionally keeps generated `/v1/concierge/...` local contract paths alongside Napoleon's advisory `/cos/...` and review/evidence paths. The review, governance, observability, evolution, discovery, and profile metadata surfaces now have explicit named runtime mappings.

## Review and Evolution Mapping Gap

Concierge currently packages local governance review, Chief of Staff steering, taxonomy review, and evaluator handoffs through generated `/v1/concierge/...` operations. This keeps the UI on named governed operations and avoids free-form paths, but it is not the same as calling Napoleon's contract-only review endpoints directly.

There are currently no known Napoleon review, governance, observability, or evolution handoff surfaces that still need explicit runtime mapping.

Text Concierge's governed route panel displays the named Napoleon review, governance, evolution, Chief of Staff request, new-agent proposal review, and observability trace targets as review-only or evidence-only handoffs. The panel keeps endpoint hosts and tokens out of view and does not treat any listed target as local approval, routing, memory-write, registry-update, trace-append, agent-dispatch, external-send, or local-application authority.

The explicit request/review path currently mapped is:

- `/chief-of-staff/requests`
- `/chief-of-staff/reviews/evolution-proposals`
- `/chief-of-staff/reviews/evaluation`
- `/chief-of-staff/reviews/governance`
- `/chief-of-staff/reviews/new-agent-proposals`
- `/evolution/proposals`
- `/evolution/proposals/{proposal_id}/status`
- `/governance/evaluate`
- `/observability/traces`
- `/agents`
- `/agents/{agent_id}`
- `/profiles/{profile_id}`

The current local aliases are useful packaging boundaries:

- Chief of Staff steering packages capability recommendation, taxonomy review, governance review, and evolution proposal review handoffs.
- Evaluator review packages local evaluator prompts.
- Chief of Staff capability discovery packages metadata-only capability and agent manifest discovery.

They remain non-authorizing. They do not imply approval, memory writes, agent dispatch, external sends, trace appends, or local application of evolution proposals.
