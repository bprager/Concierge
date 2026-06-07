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
- Started maintaining this changelog.

### Fixed

- Kept evaluator HTTP dependencies out of stub mode until HTTP evaluation is requested.
- Aligned evaluator report schema with the structured hard-failure records written by the evaluator.
- Ignored generated Tauri schema files alongside other local build artifacts.
