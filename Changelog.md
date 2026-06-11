# Changelog
All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, https://keepachangelog.com/en/1.1.0/,
and this project adheres to Semantic Versioning, https://semver.org/spec/v2.0.0.html.

## [Unreleased]

### Added

- Added initial project scaffold with product docs, governance and safety docs, architecture notes, backlog, risk register, roadmap, and ADRs.
- Added evaluator scenarios, rubrics, expected artifacts, CI workflow, and report output handling.
- Added starter Tauri and React desktop shell with local stub bridge behavior and development telemetry.
- Added frontend and Tauri lockfiles plus a placeholder desktop icon so the scaffold can be built repeatably.
- Added bridge API, JSON schemas, example profiles, sample traces, and local perception contract stubs.
- Added initial repository review, Chief of Staff alignment, architecture gap analysis, evaluator readiness, and recommended startup plan reports.
- Updated startup planning reports with Napoleon Chief of Staff integration contracts discovered from `bernd@mimir`.
- Added first-pass Text Concierge integration with Napoleon Chief of Staff contract envelopes, governance decisions, profile mapping, observability envelopes, blocked effects, and tests.
- Added Rehearsal Mode for local, contract-only previews of governed text turns before live Napoleon bridge calls.
- Added Rehearsal Mode evaluator coverage for adult owner, child protected, guest/collaborator, and adversarial preview paths.
- Added governance review UI states for `requires_review`, `deny`, and `no_go`, with local-only acknowledgement that is not Napoleon approval.
- Expanded evaluator coverage to 15 scenarios with memory proposal review, bridge failure handling, privacy settings controls, and contract mismatch fail-closed cases.
- Added proposal-only memory review panels with local acknowledgement and dismissal that do not write memory or capture approval.
- Added Conversation Capability Intelligence design, backlog items, observability signals, risks, and evaluator coverage for privacy-safe capability tracking and proposal-only recommendations.
- Added the first local `conversation_capability_signal` TypeScript model, bounded in-memory ledger, aggregation helpers, and telemetry wiring for Text Concierge flows.
- Added the first Conversation Capability Intelligence query surface for local common-conversation and missing/blocked-capability answers.
- Expanded Conversation Capability Intelligence answers with local working-well, easy-to-evolve, architecture-area, and recommended-next capability planning views.
- Added browser-local Conversation Capability Intelligence persistence with retention, clear, and metadata-only JSON export controls.
- Added local Conversation Capability Intelligence taxonomy controls for rename, merge, deprecation, split-candidate marking, reset, persistence, and export.
- Added age-based Conversation Capability Intelligence retention and local trend answers for increasing, worsening, recently working, and weekly-change questions.
- Added local risk/value score components and scoring caveats for Conversation Capability Intelligence recommendations.
- Added fail-closed live Napoleon bridge errors for missing endpoints, descriptor mismatch, auth failure, contract mismatch, no-go governance, bridge timeout, and HTTP failure.
- Added first-class Napoleon descriptor connection state for discovered, missing, and checksum/signature mismatch cases.
- Added strict live bridge provenance checks requiring Napoleon trace and audit envelopes to match governance and delegation attribution.
- Added Napoleon delegation provenance support and a Text Concierge delegation panel that only attributes agent contributions when the bridge response includes them.
- Added reusable Napoleon bridge contract fixtures for delegated success, auth failure, contract mismatch, and timeout cases.
- Added evaluator coverage for bridge delegation provenance and reusable bridge fixture fail-closed cases.
- Added a proposal-only Chief of Staff steering draft flow that turns local capability signals into a recommendation, evaluator case candidate, and evolution proposal draft without sending, writing memory, dispatching agents, or capturing approval.
- Added governed Chief of Staff steering submission that sends evolution proposal review packets only after endpoint and descriptor preflight, without applying changes locally.
- Added CoS-aligned schemas, a sample text turn contract, repository validation script, and `make check`.
- Added evaluation efficiency and Chief of Staff improvement analysis.
- Started maintaining this changelog.

### Fixed

- Kept evaluator HTTP dependencies out of stub mode until HTTP evaluation is requested.
- Aligned evaluator report schema with the structured hard-failure records written by the evaluator.
- Ignored generated Tauri schema files alongside other local build artifacts.
