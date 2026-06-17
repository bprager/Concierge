# Napoleon Contract Alignment

Concierge keeps its local governed bridge registry generated from `api/napoleon_bridge.openapi.yaml`. Napoleon also publishes Concierge integration contracts under `docs/concierge-integration/` in the Napoleon repository.

Use this check when a Napoleon contract snapshot is available locally:

```bash
NAPOLEON_CONTRACT_OPENAPI=/path/to/concierge-integration.openapi.yaml make napoleon-contract-alignment
```

The report is local evidence only. It does not contact Napoleon, approve a runtime, write memory, dispatch agents, send externally, or grant authority.

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

Concierge can also adapt an explicitly configured `/cos/text-turn` Napoleon advisory harness response into the local Napoleon response model inside the governed bridge module. That adapter preserves the same prepare-only boundary: it does not write memory, capture approval, dispatch agents, send externally, or treat candidate agents as runtime-invoked agents.

This is still not full path alignment. Sanitized evidence capture and comparison now accept the explicit `/cos/descriptor` plus `/cos/text-turn` advisory harness flow while preserving the actual `/cos/text-turn` target path and privacy checks. The remaining work is to align the combined live-runtime validation and promotion path with the Napoleon `/cos/...` harness shape or to have Napoleon expose the `/v1/concierge/...` contract.
