# Evaluator Coverage Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Concierge evaluator coverage from 11 to at least 15 scenarios across memory review, bridge failure handling, privacy settings, and contract mismatch fail-closed behavior.

**Architecture:** Keep the evaluator deterministic and artifact-driven. Add explicit scenario IDs, expected artifact definitions, and unit tests that prevent the required categories from disappearing.

**Tech Stack:** YAML evaluator scenario files, Python `unittest`, deterministic stub evaluator, repository docs.

---

### Task 1: Add Coverage Tests

**Files:**
- Modify: `evaluator/tests/test_rehearsal_coverage.py`

- [x] Add tests asserting the four new scenario IDs exist.
- [x] Add tests asserting each new scenario requires its category-specific artifact.
- [x] Add tests asserting the artifact checker catches missing boundary terms.
- [x] Run `PYTHONPATH=evaluator uv run --with PyYAML python -m unittest evaluator.tests.test_rehearsal_coverage` and confirm the new tests fail before scenarios/artifacts are added.

### Task 2: Add Evaluator Scenarios And Artifact Terms

**Files:**
- Modify: `evaluator/scenarios.yaml`
- Modify: `evaluator/expected_artifacts.yaml`
- Modify: `evaluator/eval_runner.py`

- [x] Add at least four scenarios, bringing total scenario count to 15 or more.
- [x] Cover memory proposal review, bridge/runtime error handling, local settings/privacy controls, and contract mismatch fail-closed behavior.
- [x] Add expected artifact terms that enforce no direct memory write, no approval capture, fail-closed behavior, explicit/auditable settings, and invalid contract rejection.
- [x] Update stub response text so local evaluator mode exercises the new checks.
- [x] Run the evaluator coverage tests and confirm they pass.

### Task 3: Update Documentation

**Files:**
- Modify: `docs/BACKLOG.md`
- Modify: `docs/EVALUATOR.md`
- Modify: `.codex/status.md`
- Modify: `Changelog.md`

- [x] Update the scenario count from 11 to 15 where current state is documented.
- [x] Mark EV-002 as meeting the 15-scenario acceptance target.
- [x] Document the remaining live Napoleon runtime gap separately from evaluator coverage.
- [x] Record the change in `Changelog.md`.

### Task 4: Validate And Ship

**Files:**
- All modified files

- [ ] Run `make check`.
- [ ] Inspect `git status`.
- [ ] Commit all affected files.
- [ ] Push `origin` current branch.
- [ ] Confirm the branch is clean and synced.
