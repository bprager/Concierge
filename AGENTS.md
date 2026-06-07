# AGENTS.md

## Project Direction

Concierge is the adaptive human interface to Napoleon. It starts with an evaluator and text desktop shell, then grows into voice, avatar, local perception, and controlled self-evolution.

Concierge is not the authority layer. Napoleon owns governance, memory, routing, agent delegation, and approval boundaries. Concierge owns local interaction, presentation, consent surfaces, telemetry capture, and conservative derived signals.

## Working Rules

- Modify only the Concierge repository unless explicitly asked otherwise.
- Keep `.codex/` as the AI handoff layer, not a replacement for product docs.
- Treat `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/BACKLOG.md`, `docs/GOVERNANCE_SAFETY_PRIVACY.md`, `docs/INTERACTION_STANCE_POLICY.md`, `docs/OBSERVABILITY.md`, and `docs/SELF_EVOLUTION.md` as canonical product and operating docs.
- Preserve the Napoleon governance boundary. Do not let Concierge directly execute side effects, bypass approval, or become a monolithic agent.
- Keep camera and microphone features local-first, explicit, visible, and opt-in.
- Do not store raw audio or video by default.
- Do not treat inferred emotion as fact. Use conservative, uncertain interaction signals.
- Child protected mode must minimize memory, avoid secret-keeping in safety-relevant contexts, and require guardian-appropriate approval for external actions.
- Add or update evaluator scenarios when changing behavior, authority, policy, stance selection, bridge contracts, or observability.
- Prefer small, reviewable commits.
- Preserve traceability from backlog items to acceptance criteria, telemetry, privacy impact, and evaluator coverage.

## Architecture Direction

- Keep the Tauri desktop shell focused on UI, settings, consent, and local telemetry buffering.
- Keep Napoleon access behind the governed bridge contract.
- Build text Concierge before voice or avatar features.
- Build voice before camera-aware avatar behavior.
- Keep self-evolution proposal-only until evaluator gates, approval, rollout, and rollback are implemented.
- Use OpenTelemetry-compatible traces, metrics, and logs where practical.

## Validation

Before claiming work is complete:

- Run the relevant local checks.
- For evaluator changes, run `python evaluator/eval_runner.py --mode stub --out /tmp/concierge-eval.json`.
- For frontend changes, run the app build or dev server checks when dependencies are installed.
- For schema changes, validate affected examples or fixtures where possible.
- Confirm no privacy, governance, child-mode, or authority boundary was weakened.
- Update `.codex/status.md` if the current handoff state changes.
