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
- Added sanitized live bridge contract evidence capture for success and fail-closed text bridge outcomes without storing raw prompt text, response text, endpoint hosts, or bearer tokens.
- Added a bridge evidence capture runner that discovers the Chief of Staff descriptor, sends one governed text turn to a configured endpoint, and validates the sanitized evidence path against the local harness.
- Added a bridge evidence comparator and sample evidence fixture that check captured bridge metadata against the OpenAPI-aligned bridge registry while rejecting raw payload or secret fields.
- Added a local harness HTTP evaluator runner and `make eval-http-local-harness` target for validating evaluator HTTP plumbing without treating the harness as real Napoleon.
- Added OpenAPI-validated governed response artifacts for text turns, memory proposal review, and Chief of Staff steering review, with governance, trace, audit, delegation, and recommendation provenance consistency checks where applicable.
- Added OpenAPI-validated governed request artifacts for memory proposal and Chief of Staff steering handoffs, with proposal-only boundary checks that reject nested approval, memory write, agent dispatch, external send, or local-apply claims.
- Added child-protected memory proposal request artifact validation that requires guardian review and preserves child protected profile mapping.
- Added optional local bridge bearer token support for live text turns and governed steering handoff, sent only as an authorization header.
- Added canonical bridge endpoint resolution from a configured Napoleon base URL for text turns and Chief of Staff steering handoff.
- Added a generated bridge operation registry derived from the canonical OpenAPI Concierge paths.
- Added contract-aware repository validation for bridge operation paths, request kinds, bearer security, and named bridge operation usage.
- Added runtime source validation that fails when Concierge directly executes processes, accesses memory or graph systems, or dispatches agents/tools outside the governed bridge.
- Added first-class Napoleon descriptor connection state for discovered, missing, and checksum/signature mismatch cases.
- Added live Napoleon Chief of Staff descriptor discovery from the canonical descriptor endpoint, with invalid or mismatched descriptors kept fail-closed.
- Added strict live bridge provenance checks requiring Napoleon trace and audit envelopes to match governance and delegation attribution.
- Added Napoleon delegation provenance support and a Text Concierge delegation panel that only attributes agent contributions when the bridge response includes them.
- Added reusable Napoleon bridge contract fixtures for delegated success, auth failure, contract mismatch, and timeout cases.
- Added evaluator coverage for bridge delegation provenance and reusable bridge fixture fail-closed cases.
- Added a local Napoleon-compatible HTTP bridge harness for governed path smoke validation without a live runtime.
- Added a proposal-only Chief of Staff steering draft flow that turns local capability signals into a recommendation, evaluator case candidate, and evolution proposal draft without sending, writing memory, dispatching agents, or capturing approval.
- Added governed Chief of Staff steering submission that sends evolution proposal review packets only after endpoint and descriptor preflight, without applying changes locally.
- Added governed memory proposal submission that sends review packets to Napoleon only after endpoint and descriptor preflight, without writing memory or capturing approval locally.
- Added a Text Concierge live bridge readiness panel that combines endpoint, descriptor integrity, local evidence capture/comparison state, blocked effects, and the reminder that readiness is not Napoleon approval.
- Added last live-send outcome and fail-closed reason rendering to the Text Concierge live bridge readiness panel.
- Added in-session bridge evidence readiness tracking so live text attempts update the readiness panel from sanitized evidence capture and local registry/secret-field comparison.
- Added a local harness endpoint preset in Text Concierge settings that points at the governed local bridge harness without starting services or granting authority.
- Added an app-level local harness text smoke test that exercises descriptor discovery, governed text send, delegation provenance rendering inputs, blocked effects, and bridge readiness evidence.
- Expanded the app-level local harness text smoke test to return denied fail-closed bridge details and blocked effects.
- Added CoS-aligned schemas, a sample text turn contract, repository validation script, and `make check`.
- Added evaluation efficiency and Chief of Staff improvement analysis.
- Started maintaining this changelog.

### Fixed

- Show blocked effects from fail-closed memory proposal review and Chief of Staff steering handoff errors in telemetry and visible failure messages.
- Show live text bridge failure reasons and blocked effects in the conversation transcript as well as the bridge failure panel.
- Show blocked effects from fail-closed live bridge errors in telemetry and the visible bridge-blocked message.
- Preserve the local governed text-turn blocked-effect list in early fail-closed bridge errors, telemetry, and sanitized contract evidence.
- Preserve local memory proposal and Chief of Staff steering blocked-effect lists in early fail-closed governed handoff errors and telemetry.
- Reject live text responses that claim "Napoleon recommends..." unless matching recommendation provenance includes the recommended contribution and response trace/audit references.
- Reject live text responses that claim selected-agent findings such as "Passive Brain found..." unless matching delegation provenance includes that agent contribution.
- Treat live Napoleon `deny` and `no_go` governance responses as fail-closed outcomes for text turns, memory proposal review, and Chief of Staff steering handoffs instead of normal successful responses, while retaining sanitized trace, audit, governance, and blocked-effect evidence where available.
- Kept evaluator HTTP dependencies out of stub mode until HTTP evaluation is requested.
- Aligned evaluator report schema with the structured hard-failure records written by the evaluator.
- Ignored generated Tauri schema files alongside other local build artifacts.
