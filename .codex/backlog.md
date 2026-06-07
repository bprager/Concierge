# Backlog

Last updated: 2026-06-07

This file is an AI-facing backlog router. Keep canonical roadmap and public status in `docs/ROADMAP.md` and `docs/BACKLOG.md`; use this file to decide what to inspect next.

## Active Themes

- Evaluator foundation: scenarios, rubric, expected artifacts, hard fails, reports, regression comparison, and CI cadence.
- Text Concierge MVP: Tauri text UI, identity resolution, stance selection, governed Napoleon bridge, confirmation UI, and complete traces.
- Governance and privacy: authority tiers, child protected mode, memory update proposals, camera/mic defaults, and privacy audit records.
- Observability: interaction trace completeness, local telemetry buffer, redaction, dashboards, and evaluator reports.
- Future interfaces: voice, avatar, local perception, and controlled self-evolution after text and evaluator gates are stable.

## Candidate Next Issues

- Review and commit the current initial scaffold if it has not already been packaged as a baseline.
- Run the evaluator in stub mode and make the report stable enough for CI artifacts.
- Validate the example interaction trace against `schemas/interaction_trace.schema.json`.
- Add a P1 text smoke path that sends a mock request through `app/src/napoleonBridge.ts`.
- Add tests or fixtures for adult owner, child protected, and guest user profiles.
- Define the local settings model for Napoleon endpoint, telemetry, profile, camera, microphone, and privacy controls.
- Add bridge error handling and visible governance confirmation states in the text UI.
- Add evaluator regression comparison against the previous report.

## Not A Backlog

- Product requirements belong in `docs/PRD.md`.
- Canonical roadmap and story tables belong in `docs/ROADMAP.md` and `docs/BACKLOG.md`.
- Major architecture decisions belong in `docs/decisions/`.
- User-facing setup belongs in `README.md`, `app/README.md`, and service README files.
