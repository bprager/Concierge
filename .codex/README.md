# .codex Index

`.codex` is the AI handoff layer for Codex and ChatGPT sessions. It should stay concise and point to canonical product docs instead of copying them.

- `context-index.md`: Start here. Routes a session to the right repo docs and `.codex` files.
- `status.md`: Current handoff state, blockers, risks, next priorities, and files for the next session.
- `project-context.md`: Stable summary of what Concierge is, who it serves, constraints, assumptions, maturity, and done criteria.
- `architecture-plan.md`: AI-facing architecture summary and where to read canonical architecture details.
- `backlog.md`: AI-facing backlog triage and links to canonical roadmap/status sources.
- `capabilities.md`: Inventory of current, weak, planned, candidate, research-backed, and rejected capabilities.
- `research.md`: Decision-oriented research notes with relevance, action, and adoption status.
- `decisions.md`: ADR-lite log for decisions too lightweight for full `docs/decisions/` entries.
- `lessons-learned.md`: Durable mistakes, gotchas, and repeated AI failure modes.

Use root docs, `docs/`, `schemas/`, `evaluator/`, `app/`, and `services/` as the source of truth for product behavior, contracts, operations, and user-facing documentation.
