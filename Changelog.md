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
- Added CoS-aligned schemas, a sample text turn contract, repository validation script, and `make check`.
- Added evaluation efficiency and Chief of Staff improvement analysis.
- Started maintaining this changelog.

### Fixed

- Kept evaluator HTTP dependencies out of stub mode until HTTP evaluation is requested.
- Aligned evaluator report schema with the structured hard-failure records written by the evaluator.
- Ignored generated Tauri schema files alongside other local build artifacts.
