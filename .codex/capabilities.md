# Capabilities

Last updated: 2026-06-07

This file tracks what Concierge can do and where it is weak. Keep it capability-focused; put current work state in `status.md`, research evidence in `research.md`, and final decisions in `decisions.md`.

## Current Capabilities

- Describe the Concierge product, roadmap, architecture, governance, stance, observability, risk, and self-evolution model.
- Run a deterministic evaluator in stub mode through `evaluator/eval_runner.py`.
- Represent evaluator scenarios, rubrics, and expected artifacts in YAML.
- Produce evaluator reports as JSON.
- Define a governed Napoleon bridge contract through OpenAPI.
- Define JSON schemas for agent contracts, evaluator runs, evolution proposals, interaction traces, stance decisions, and user profiles.
- Provide a Tauri + React app skeleton with Napoleon bridge and telemetry helper modules.
- Provide service placeholders for Napoleon bridge and local perception contracts.
- Provide sample adult and child profiles plus a sample interaction trace.
- Provide issue templates for backlog items and evolution proposals.

## Weak Or Missing Capabilities

- The text UI is still a skeleton and not a finished P1 product.
- The Napoleon bridge is a contract/client surface, not a fully implemented governed runtime service.
- Evaluator scoring is deterministic and keyword/artifact based; it is not yet a strong judge.
- Evaluator regression comparison and report dashboards are not complete.
- Voice, avatar, camera, VAD, STT, TTS, wake word, and lip sync are planned but not implemented.
- Local telemetry buffering, redaction, privacy audit logs, dashboards, and alerts are planned but not complete.
- Child-mode behavior is documented but needs runtime tests and UI enforcement.
- Self-evolution is documented as a policy and schema, not an active rollout system.

## Planned Capabilities

- P0 evaluator hardening with richer scenarios, regression comparison, CI artifacts, and human review.
- P1 text Concierge with identity, stance, governed bridge requests, confirmation UI, and full traces.
- P2 voice Concierge with explicit mic permission, local STT/TTS adapters, barge-in, and voice latency telemetry.
- P3 avatar Concierge with local VRM rendering, expression mapping, optional camera-aware signals, and privacy controls.
- P4 controlled self-evolution with proposal review, evaluator gates, rollout, monitoring, and rollback.

## Candidate Improvements

- Add schema validation commands for examples and reports.
- Add a single `make check` target that runs evaluator stub mode, schema validation, and available frontend checks.
- Add contract tests for `api/napoleon_bridge.openapi.yaml` and `app/src/napoleonBridge.ts`.
- Add fixture-driven tests for stance decisions and child protected mode.
- Add a markdown status summary generated from evaluator report JSON.

## Research-Backed Ideas

- Start with evaluator and text before voice/avatar because authority, stance, routing, and observability are easier to verify in text.
- Keep local perception as derived uncertain signals rather than emotional facts.
- Keep avatar expression separate from authority so presentation does not imply permission.
- Use observability and evaluator outputs as the feedback channel for safe improvement.

## Rejected Ideas

- Concierge as a monolithic super-agent: conflicts with the Napoleon governance boundary.
- Direct uncontrolled tool execution from Concierge: bypasses authority tiers and auditability.
- Raw camera or microphone storage by default: conflicts with privacy and child-mode requirements.
- Durable emotional labels inferred from camera or voice: too brittle and too risky.
- Production self-modification without approval and regression gates: conflicts with controlled self-evolution.
