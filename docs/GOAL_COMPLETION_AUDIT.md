# Goal Completion Audit

Concierge now has a local audit for the active Napoleon UI goal:

```bash
make goal-completion-audit
```

The command writes `/tmp/concierge-goal-completion-audit.json`. The report maps the main goal requirements to current repository evidence, including descriptor connection state, generated bridge alignment, delegation rendering, response provenance, fail-closed bridge states, Chief of Staff steering, authority-boundary validation, Rehearsal Mode, local Capability Intelligence, child protected boundaries, and evolution proposal status refresh.

The audit is deliberately conservative. It can show that local evidence exists for a requirement, but it does not declare the overall goal complete while required runtime evidence is missing or blocked. In the current state, the report keeps the Napoleon-owned `expose_evolution_proposal_status_runtime_target` action separate as an `external_blocker` because the latest inspected Napoleon snapshot does not advertise the read-only `/evolution/proposals/{proposal_id}/status` target.

When Napoleon publishes a newer Concierge integration contract, retain a fresh contract-alignment report and pass it into the audit:

```bash
NAPOLEON_CONTRACT_OPENAPI=/path/to/concierge-integration.openapi.yaml NAPOLEON_CONTRACT_ALIGNMENT_OUT=/tmp/concierge-napoleon-alignment.json make napoleon-contract-alignment
GOAL_COMPLETION_ALIGNMENT_REPORT=/tmp/concierge-napoleon-alignment.json make goal-completion-audit
```

That optional report is non-authorizing evidence only. It can clear the evolution-status external blocker only when it identifies itself as `concierge.napoleon-contract-alignment.v1`, is runtime-aligned, carries the `alignment_check_only` boundary, exposes `/evolution/proposals/{proposal_id}/status`, has no `expose_evolution_proposal_status_runtime_target` required action, and preserves false approval, memory-write, agent-dispatch, external-send, and side-effect flags.

The JSON report includes:

- `alignmentEvidence`: whether a fresh non-authorizing contract-alignment report was loaded, whether it can clear the current evolution-status blocker, and a sanitized summary of the retained alignment status, runtime-aligned flag, live-promotion blocker flag, Napoleon required-action count, and missing runtime targets.
- `statusCounts`: current counts for proven, weak, missing, or externally blocked requirements.
- `blockers`: sanitized top-level blocker metadata with requirement ID, owner, external flag, next action, validation commands, and any Napoleon required-action packet for direct handoff tooling.
- `nextActions`: one machine-readable repair action per blocker, including owner, whether the blocker is external, validation commands, the next action text, and, for Napoleon-owned runtime blockers, a sanitized `napoleonRequiredAction` packet with the expected target path, request kind, descriptor advertising forms, live-promotion blocker state, and false side-effect flags.
- `completionGate`: whether the active goal can be closed and which validation commands must pass first.
- `requirements`: requirement-by-requirement evidence, validation commands, and blocker metadata when applicable.

The report is local evidence only. It does not contact Napoleon, approve anything, write memory, dispatch agents, send externally, apply evolution, or grant runtime authority.

To render a copyable Markdown handoff from the current sanitized blocker list:

```bash
make goal-blocker-handoff
```

The command reruns the audit and writes `/tmp/concierge-goal-blocker-handoff.md`. The handoff includes the blocker owner, requirement ID, target path, request kind, descriptor advertising forms, validation commands, required false side-effect flags, and any retained sanitized alignment summary loaded through `GOAL_COMPLETION_ALIGNMENT_REPORT`. It is local evidence only and does not contact Napoleon, approve anything, write memory, dispatch agents, send externally, apply evolution, or grant runtime authority.

To render the highest-priority blocker as a compact copy-and-paste goal prompt:

```bash
make goal-blocker-goal-prompt
```

The command reruns the audit and writes `/tmp/concierge-goal-blocker-goal-prompt.md`. The prompt is generated from the same sanitized blocker metadata, includes a compact retained alignment summary when available, and fails if it reaches the 4,000-character goal limit. It is local evidence only and does not contact Napoleon, approve anything, write memory, dispatch agents, send externally, apply evolution, or grant runtime authority.

Use the audit when deciding whether the active goal can be closed. A completion claim should require:

- `make check` passing.
- `make eval` passing.
- A fresh retained Napoleon contract-alignment report when Napoleon contract evidence changed.
- Live HTTP validation passing when a real Napoleon endpoint is available.
- `completionGate.canCloseGoal` set to `true`.
- The goal audit showing no missing, weak, or external-blocker items.
- Current docs, backlog, changelog, and `.codex/status.md` reflecting the verified state.
