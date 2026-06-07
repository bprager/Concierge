# Lessons Learned

Last updated: 2026-06-07

Only keep durable mistakes, gotchas, and repeated AI failure modes here. Promote permanent rules to `AGENTS.md`.

## Durable Lessons

### Do Not Turn Concierge Into Napoleon

- Lesson: Concierge is tempting to implement as a full agent runtime because it is the user-facing surface.
- Why it matters: That would bypass the intended Napoleon governance, memory, routing, and approval boundary.
- Better behavior: Keep Concierge focused on interaction, consent, presentation, telemetry, and bridge requests.

### Text First Makes Safety Easier To Verify

- Lesson: Voice and avatar features can distract from core authority, stance, and trace requirements.
- Why it matters: If P1 text behavior is not governed and observable, voice/avatar will multiply the failure modes.
- Better behavior: Make text identity, stance, bridge, confirmation, and trace flows solid before expanding channels.

### The Evaluator Stub Is A Smoke Test, Not Proof Of Readiness

- Lesson: Stub mode is useful for checking the evaluator runner and report shape, but it does not prove Napoleon integration quality.
- Why it matters: A green stub report can hide missing bridge behavior, weak real prompts, and absent regression comparison.
- Better behavior: Use stub mode as a local check, then add HTTP mode runs, regression comparison, and human review before promotion.

### Treat Perception As Evidence, Not Truth

- Lesson: Camera and voice systems can misread attention, emotion, age, fatigue, or intent.
- Why it matters: Durable emotional labels or confident claims can harm trust and safety, especially in child mode.
- Better behavior: Emit conservative derived signals with confidence and uncertainty, avoid raw retention by default, and keep user-visible controls.

### Avatar Presence Must Not Weaken Consent

- Lesson: A friendly avatar can make confirmations, boundaries, and refusals feel softer than they are.
- Why it matters: Presentation should not imply permission or manipulate the user into accepting actions.
- Better behavior: Keep avatar behavior mapped to stance only, preserve explicit confirmations, and make mute/hide/pause controls obvious.

### Observability Is Part Of The Product Contract

- Lesson: Adaptive interfaces become hard to debug if traces, metrics, logs, evaluator reports, and privacy audit records are added later.
- Why it matters: Governance and self-evolution depend on knowing what happened and why.
- Better behavior: Add trace IDs, stance reasons, governance decisions, bridge request IDs, and redaction behavior alongside feature work.
