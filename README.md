# Concierge

Concierge is the adaptive human interface to Napoleon.

This repository contains the initial product design, evaluator design, backlog, schemas, observability plan, and starter skeleton for the full lifecycle:

1. Periodic evaluator for Napoleon complex agent development capability
2. MVP text-only Concierge
3. Voice Concierge
4. Avatar Concierge with local camera and voice perception
5. Controlled self-evolution through evaluated improvement proposals

The current recommendation is Mac-first with a future cross-platform path:

- Desktop shell: Tauri
- Frontend: React or Svelte
- Avatar renderer: three.js with VRM
- Local perception: MediaPipe, Silero VAD, Whisper or WhisperKit, optional wake word
- Observability: OpenTelemetry-compatible traces, metrics, logs, and evaluation reports
- Napoleon access: governed bridge API, never direct uncontrolled action execution

## Repository status

This is an initial GitHub repository scaffold. It is designed to make the project buildable in phases, not to ship the final product on day one.

## Quick start

Run the local check suite:

```bash
make check
```

Or run only the evaluator in stub mode:

```bash
make eval
```

To verify the evaluator's HTTP transport path against the local Napoleon-compatible harness:

```bash
make eval-http-local-harness
```

This local harness check does not replace validation against a real Napoleon endpoint. The generated evaluator report labels `runtimeValidation.source` as `local_harness` and includes a caveat that it is not real Napoleon runtime validation.

To prove the combined live-runtime validation runner against the local harness, run:

```bash
make live-runtime-local-harness
```

When a real Napoleon runtime is available, set `NAPOLEON_BRIDGE_ENDPOINT` to the Napoleon base URL and `NAPOLEON_EVAL_ENDPOINT` to the evaluator endpoint if it differs from `/v1/concierge/evaluate`, then run:

```bash
make live-runtime-validation
```

The live runtime validation artifacts are local evidence only. They omit raw prompts, response bodies, response text, endpoint hosts, bearer tokens, and evaluator response excerpts.
The validation summary and captured bridge evidence record the runtime validation source. Keep the default `real_runtime` for an actual Napoleon runtime; use `--runtime-validation-source local_harness` only for local harness evidence.
If the descriptor identifies the local harness but the run is labeled as `real_runtime`, validation fails closed before sending the text turn.

The lower-level evaluator-only command is still available:

```bash
make eval-http
```

Review the core documents:

- [PRD](docs/PRD.md)
- [Backlog](docs/BACKLOG.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Evaluator](docs/EVALUATOR.md)
- [Observability](docs/OBSERVABILITY.md)
- [Rehearsal Mode](docs/REHEARSAL_MODE.md)
- [Interaction stance policy](docs/INTERACTION_STANCE_POLICY.md)
- [Self-evolution](docs/SELF_EVOLUTION.md)
- [Evaluation efficiency and CoS improvements](docs/reports/EVALUATION_EFFICIENCY_AND_COS_IMPROVEMENTS.md)

## Core principle

Concierge may adapt how it interacts with the user, but it must evolve authority cautiously.

The avatar, voice, and camera front-end should read user signals conservatively. It should not pretend to know emotions as facts. It should generate auditable interaction signals that Napoleon can use through governance.

## Development phases

| Phase | Name | Goal |
|---|---|---|
| P0 | Evaluator foundation | Periodically test Napoleon and Chief of Staff agent design ability |
| P1 | Text Concierge MVP | Safe text interface with routing, stance, identity, governance, and traces |
| P2 | Voice Concierge | Wake, VAD, STT, TTS, barge-in, and voice-friendly interaction |
| P3 | Avatar Concierge | VRM avatar, gaze simulation, camera-aware stance, privacy controls |
| P4 | Controlled self-evolution | Improvement proposals, regression gates, approval, rollout, rollback |

## Non-goals

- Concierge is not a monolithic super-agent.
- Concierge does not bypass Napoleon governance.
- Concierge does not store raw camera or microphone data by default.
- Concierge does not infer child emotions as durable facts.
- Concierge does not self-modify production behavior without evaluation and approval.
