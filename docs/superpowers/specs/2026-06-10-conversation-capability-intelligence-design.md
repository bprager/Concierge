# Conversation Capability Intelligence Design

## Context

The user wants Concierge to answer questions about common conversations, working conversations, missing but easy-to-evolve capabilities, architecture blockers, and recommended next capabilities.

Canonical design: `docs/CONVERSATION_CAPABILITY_INTELLIGENCE.md`.

## Approaches considered

1. Raw transcript analytics.
   - Benefit: rich analysis.
   - Rejected because it creates unnecessary privacy, child-safety, and retention risk.

2. Local derived capability ledger.
   - Benefit: enough signal for useful answers while avoiding raw conversation storage by default.
   - Chosen because it fits Concierge's local-first privacy model and Napoleon's governance boundary.

3. Napoleon-owned global analytics.
   - Benefit: cross-device and cross-agent completeness.
   - Deferred because Concierge does not yet have live runtime transport, auth, or governed telemetry export.

## Chosen design

Build a local Conversation Capability Intelligence layer with derived metadata signals, bounded local storage, aggregation, ranking, and proposal-only recommendations.

The design distinguishes:

- Topic: what the conversation is about.
- Intent: what the user wants done.
- Capability: what system behavior is required.

It records capability status as working, degraded, missing, blocked, or unknown. It separately tracks correctly blocked unsafe requests and failed safe requests.

## Safety boundary

The capability may observe, classify, aggregate, explain, and propose.

It must not:

- Store raw transcripts by default.
- Implement features automatically.
- Grant approval.
- Write memory.
- Dispatch agents.
- Send externally.
- Expand tool access.
- Change child policy.
- Optimize engagement over safety, privacy, and user value.

## Implementation phases

1. Define `conversation_capability_signal` schema and taxonomy.
2. Emit local derived signals from text turns, rehearsal, governance review, memory review, bridge errors, corrections, and dismissals.
3. Add local bounded ledger with redaction, retention, deletion, and opt-in export controls.
4. Add aggregate query answers for common, working, missing, architecture-blocked, and recommended next capabilities.
5. Add recommendation scoring and proposal-only handoff to Napoleon evolution proposals or backlog items.
6. Add evaluator and regression coverage.

## Documentation updated

- `docs/CONVERSATION_CAPABILITY_INTELLIGENCE.md`
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/OBSERVABILITY.md`
- `docs/SELF_EVOLUTION.md`
- `docs/RISK_REGISTER.md`
- `docs/BACKLOG.md`
- `docs/EVALUATOR.md`
