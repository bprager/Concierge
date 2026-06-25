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

When a real Napoleon runtime is available, set `NAPOLEON_BRIDGE_ENDPOINT` to the Napoleon base URL or a known Concierge bridge operation URL and `NAPOLEON_EVAL_ENDPOINT` to the evaluator endpoint if it differs from the derived evaluator target, then run:

```bash
make live-runtime-validation
```

The live runtime validation artifacts are local evidence only. They omit raw prompts, response bodies, response text, endpoint hosts, bearer tokens, and evaluator response excerpts.
The validation runner writes a sanitized `preflight.json` even when no endpoint is configured, recording only missing configuration, accepted real-runtime endpoint forms, whether the bridge and evaluator endpoints were explicit or derived, derived descriptor/capability/text-turn/trace-proof targets, derived evaluator target path/request kind/operation ID, and false side-effect boundary fields. It does not retain endpoint hosts or tokens, and it marks local harness or simulation evidence as shape-only, not a substitute for real Napoleon runtime readiness. Generated Concierge-compatible and local harness endpoints derive `/v1/concierge/...` bridge targets and `/v1/concierge/evaluate`; explicit Napoleon endpoints, including `/cos`, `/cos/descriptor`, `/cos/capabilities`, and `/cos/text-turn`, derive `/cos/...` bridge targets and `/chief-of-staff/reviews/evaluation`. The validation summary and captured bridge evidence record the runtime validation source. The summary also records sanitized bridge operation metadata such as the last operation ID, request kind, transport, and target path, including explicit `/cos/text-turn` advisory evidence, without retaining endpoint hosts or tokens. After bridge evidence passes, the runner also attempts descriptor-gated capability discovery and governed contract-packet submissions for `/chief-of-staff/requests` and `/governance/evaluate`, recording only sanitized capability and packet metadata such as count, IDs, authority tiers, blocked effects, target paths, request kinds, operation IDs, governance/trace/audit presence, and false local side-effect flags. Capability discovery and packet validation fail closed if the response or retained evidence claims approval capture, memory writes, agent dispatch, external sends, routing, registry updates, trace appends, or local application; those remote response claims are recorded separately from Concierge's false local boundary flags. The summary also includes an artifact privacy audit, a machine-readable `promotionReadiness` gate with blocking reasons, and a local promotion review draft; validation fails if retained bridge, capability, packet, or evaluator artifacts contain forbidden raw fields or sensitive runtime values, and promotion readiness remains blocked when capability discovery, contract-packet validation, or evaluator HTTP mode fails. The promotion readiness gate and review draft are not Napoleon approval or release approval by themselves. Keep the default `real_runtime` for an actual Napoleon runtime; use `--runtime-validation-source local_harness` only for local harness evidence.
For Napoleon runtimes that expose `/cos/descriptor` and `/cos/text-turn` but no evaluator route, the bridge evidence can pass while HTTP evaluator mode is recorded as a sanitized failure; full promotion remains blocked until an evaluator endpoint also passes.
When a failed live-runtime `summary.json` includes sanitized top-level `napoleonRequiredActions`, the Text Concierge evaluator-validation import preserves those Napoleon-owned action packets for local display, local answers, required-action export, and readiness-proof export without treating them as approval or applying anything locally.
When `make live-runtime-validation` produces a successful, sanitized `summary.json`, the Text Concierge readiness panel can import that file as accepted real-runtime proof metadata. Concierge accepts it only when it records a real runtime source, passed bridge evidence, passed governed contract-packet submissions for `/chief-of-staff/requests` and `/governance/evaluate`, passed evaluator HTTP mode, passed artifact privacy, promotion readiness, and false side-effect boundaries; the imported summary remains local review context and is not Napoleon approval.
If the descriptor identifies the local harness but the run is labeled as `real_runtime`, validation fails closed before sending the text turn.
Standalone bridge evidence capture also accepts `NAPOLEON_BRIDGE_ENDPOINT` as either a base URL or known Concierge bridge operation URL; evaluator-only HTTP mode still uses `NAPOLEON_EVAL_ENDPOINT`.

To compare Concierge's generated bridge paths with a Napoleon integration OpenAPI snapshot:

```bash
NAPOLEON_CONTRACT_OPENAPI=/path/to/concierge-integration.openapi.yaml make napoleon-contract-alignment
```

This is a local alignment report only. It does not contact Napoleon or grant runtime authority.

The lower-level evaluator-only command is still available:

```bash
make eval-http
```

`NAPOLEON_EVAL_ENDPOINT` may be a Napoleon base URL or the explicit `/chief-of-staff/reviews/evaluation` URL. The evaluator resolves Napoleon base URLs to the named evaluation review path and keeps only sanitized target metadata in the report.

Review the core documents:

- [PRD](docs/PRD.md)
- [Backlog](docs/BACKLOG.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Evaluator](docs/EVALUATOR.md)
- [Observability](docs/OBSERVABILITY.md)
- [Rehearsal Mode](docs/REHEARSAL_MODE.md)
- [Napoleon contract alignment](docs/NAPOLEON_CONTRACT_ALIGNMENT.md)
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
