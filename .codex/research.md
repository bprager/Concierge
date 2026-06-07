# Research

Last updated: 2026-06-07

Use this as a decision-oriented research log. Keep raw summaries elsewhere; every entry here should state why it matters and what action it implies.

## Entries

### Evaluator-First Agent Development

- Date: 2026-06-07
- Source or topic: `docs/EVALUATOR.md`, `evaluator/`
- Finding: Concierge is both product and benchmark. Testing Napoleon's ability to design Concierge gives the project a repeatable way to measure complex agent development quality.
- Relevance to this project: P0 should focus on reliable evaluator scenarios, rubrics, hard fails, reports, and regression comparison before production interface expansion.
- Possible action: Keep evaluator stub mode green and add regression comparison plus human review before phase promotion.
- Status: adopted

### Governance Boundary Between UI And Napoleon

- Date: 2026-06-07
- Source or topic: `docs/ARCHITECTURE.md`, `docs/GOVERNANCE_SAFETY_PRIVACY.md`, `api/napoleon_bridge.openapi.yaml`
- Finding: Concierge is safest when it presents, clarifies, and requests governed Napoleon actions rather than owning authority directly.
- Relevance to this project: The bridge contract must remain the normal path for Napoleon behavior, with confirmation and audit surfaces in Concierge.
- Possible action: Add bridge contract tests and UI states for governance decisions before enabling real side effects.
- Status: adopted

### Local-First Perception With Uncertain Signals

- Date: 2026-06-07
- Source or topic: `docs/decisions/ADR-0002-local-first-perception.md`, `services/perception/`
- Finding: Voice/camera signals should be processed locally where feasible and converted into conservative derived signals with uncertainty.
- Relevance to this project: Avatar and camera behavior must not store raw capture by default or turn inferred state into durable emotional facts.
- Possible action: Keep perception contracts explicit about confidence, source, retention, and child-mode restrictions.
- Status: adopted

### Observability As Safety Infrastructure

- Date: 2026-06-07
- Source or topic: `docs/OBSERVABILITY.md`, `schemas/interaction_trace.schema.json`, `examples/sample_interaction_trace.json`
- Finding: Trace completeness, redaction, privacy audit records, and evaluator reports are required to debug and govern adaptive behavior.
- Relevance to this project: Every user turn should be explainable: profile, intent, stance, context request, governance decision, route, response, latency, and errors.
- Possible action: Add schema validation and smoke tests for trace completeness early in P1.
- Status: adopted

### Avatar As Expression, Not Authority

- Date: 2026-06-07
- Source or topic: `docs/decisions/ADR-0004-avatar-is-expression-not-authority.md`, `docs/GOVERNANCE_SAFETY_PRIVACY.md`
- Finding: Avatar presence can improve interaction, but it can also manipulate or imply authority if not constrained.
- Relevance to this project: Avatar state should express stance and presence only; it must not weaken confirmation, consent, or governance.
- Possible action: Gate avatar work behind explicit privacy controls, child constraints, and stance-to-expression tests.
- Status: adopted
