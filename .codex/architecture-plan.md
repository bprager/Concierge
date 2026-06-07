# Architecture Plan

Last updated: 2026-06-07

This is the AI-facing architecture handoff. Keep canonical architecture details in `docs/ARCHITECTURE.md`, `docs/decisions/`, `api/`, `schemas/`, and implementation files.

## Current Architecture

- Mac-first desktop shell using Tauri with a React frontend.
- Concierge owns UI, settings, consent, local capture surfaces, local telemetry buffering, and presentation.
- Napoleon owns governance, policy, memory, routing, agent registry, Chief of Staff review, and approved evolution.
- The governed Napoleon bridge is the intended boundary between Concierge and Napoleon.
- The evaluator is a Python scaffold with deterministic local stub mode and HTTP Napoleon mode.
- Observability is OpenTelemetry-compatible by design, with traces, metrics, structured logs, evaluator reports, and privacy audit records.

## Main Components

- `app/`: Desktop UI shell, frontend state, bridge client, telemetry helpers, and Tauri config.
- `evaluator/`: Scenario/rubric/artifact evaluator for Napoleon and Chief of Staff design quality.
- `api/`: Napoleon bridge OpenAPI contract.
- `schemas/`: JSON schemas for core contracts and traces.
- `services/napoleon_bridge/`: Bridge service notes and future implementation boundary.
- `services/perception/`: Local perception service notes and signal contracts.
- `docs/`: Canonical product, architecture, governance, observability, roadmap, risk, and self-evolution docs.
- `.github/`: Issue templates and evaluator workflow scaffold.

## Architecture Direction

- Finish P0 evaluator quality before treating the app as production behavior.
- Build the P1 text Concierge path through the Napoleon bridge before adding voice or avatar authority surfaces.
- Add voice with explicit microphone permission, local-first processing where feasible, barge-in, latency telemetry, and voice-specific response shaping.
- Add avatar behavior as expression and presence, not authority. Camera-aware behavior must stay local, optional, visible, and conservative.
- Keep controlled self-evolution behind proposals, evaluator regression gates, approval, rollout, and rollback.

## Open Architecture Questions

- What is the exact local Napoleon bridge process and authentication shape for first real text requests?
- Which frontend state model is enough for P1 conversation, identity, stance, and governance confirmation?
- What is the minimum evaluator report history and regression comparison needed before phase promotion?
- Which local STT/TTS/perception adapters should be chosen when moving from P1 to P2?
- How should privacy audit records be stored and exposed in the local settings UI?
