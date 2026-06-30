# Decisions

Last updated: 2026-06-30

ADR-lite log for decisions that help future AI sessions. Use `docs/decisions/` for major architectural decisions.

## Decision: Keep `.codex` As AI Handoff, Not Product Documentation

- Date: 2026-06-07
- Context: Concierge already has canonical docs, schemas, evaluator files, app code, and service placeholders. Duplicating those details inside `.codex` would create drift.
- Options considered: Copy product docs into `.codex`; make `.codex` only an index; use `.codex` for context routing plus current handoff state.
- Chosen option: Use `.codex` for concise handoff state, context routing, capability inventory, research notes, decisions, and lessons.
- Tradeoffs: Future sessions must follow links to canonical docs, but the handoff layer stays easier to maintain.
- Revisit trigger: `.codex` files become stale, too large, or start replacing canonical docs.

## Decision: Preserve Napoleon As Authority Boundary

- Date: 2026-06-07
- Context: Concierge is the human interface to Napoleon, but Napoleon owns governance, memory, routing, agent delegation, and approval.
- Options considered: Let Concierge call tools directly; make Concierge a peer agent runtime; keep Concierge behind a governed bridge.
- Chosen option: Keep normal Napoleon behavior behind the governed bridge contract.
- Tradeoffs: Requires bridge and confirmation UX work before real side effects, but prevents authority drift.
- Revisit trigger: A future architecture review explicitly changes Napoleon and Concierge responsibilities.

## Decision: Treat Evaluator As The First Quality Gate

- Date: 2026-06-07
- Context: The repo's first milestone is evaluator foundation, and Concierge is also the benchmark for Napoleon's complex agent design quality.
- Options considered: Build UI first; build voice/avatar prototypes first; harden the evaluator first.
- Chosen option: Keep P0 evaluator as the first gate before phase promotion.
- Tradeoffs: Slower path to visible app behavior, but better safety and regression control.
- Revisit trigger: P0 evaluator becomes stable enough that P1 text work can proceed in parallel.

## Decision: Keep Camera And Microphone Opt-In And Local-First

- Date: 2026-06-07
- Context: Voice and avatar features can create privacy, child-safety, and surveillance risks.
- Options considered: Always-on capture; remote-first perception; explicit local-first capture with visible state.
- Chosen option: Camera and microphone stay off by default, visible when active, and local-first where feasible.
- Tradeoffs: More consent/settings work is required, but privacy and user agency stay central.
- Revisit trigger: A specific feature requires remote processing and has a documented consent, retention, and redaction design.

## Decision: Self-Evolution Is Proposal-Only Until Gated

- Date: 2026-06-07
- Context: Controlled self-evolution is a project goal, but production self-modification without review would weaken safety.
- Options considered: Automatic self-modification; disabled evolution; proposal workflow with evaluator and approval gates.
- Chosen option: Evolution may propose changes, but rollout requires evaluator regression checks, approval, monitoring, and rollback.
- Tradeoffs: Improvement is slower, but failures remain reviewable and reversible.
- Revisit trigger: The proposal, approval, evaluator, rollout, and rollback path is implemented and tested.

## Decision: Treat Real-Runtime Evidence As The Live Text Baseline

- Date: 2026-06-30
- Context: Concierge live-runtime validation passed against the real Napoleon runtime with bridge evidence, capability discovery, governed contract packet submissions, HTTP evaluator review, artifact privacy, and promotion readiness all passing. A local promotion review was recorded in `docs/reports/LIVE_TEXT_INTERACTION_PROMOTION_REVIEW.md`.
- Options considered: Keep live text interaction blocked until a broader product phase review; approve only the narrow live text baseline; treat the validation as broader release approval.
- Chosen option: Approve the narrow baseline-ready state for governed live text interaction only.
- Tradeoffs: Concierge can move forward with live text usage while voice, avatar, memory writes, external sends, agent dispatch, tool execution, and self-evolution application remain blocked by their own gates.
- Revisit trigger: Runtime evidence fails, Napoleon bridge contracts change, authority boundaries change, or Concierge begins promoting non-text capabilities.
