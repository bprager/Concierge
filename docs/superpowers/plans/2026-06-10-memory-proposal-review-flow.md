# Memory Proposal Review Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Text Concierge memory proposal review flow that stays proposal-only and never writes memory directly.

**Architecture:** Extend the existing contract bridge with structured memory proposal state derived from a text turn. Present that state in rehearsal/live UI as a local review surface with acknowledge/dismiss controls that record local review only, never approval or memory writes.

**Tech Stack:** React, TypeScript, Node test runner, deterministic evaluator/docs.

---

### Task 1: Contract And Presentation Tests

**Files:**
- Modify: `app/tests/contract.test.ts`
- Modify: `app/tests/presentation.test.ts`

- [x] Add tests for memory proposal state with proposal ID, source turn, profile, rationale, review state, blocked `memory_write`, trace ID, and audit ID.
- [x] Add tests proving local acknowledgement does not capture approval and does not write memory.
- [x] Add child protected wording tests requiring guardian review and no secret-keeping.
- [x] Run app tests and confirm the new tests fail before implementation.

### Task 2: Structured Memory Proposal State

**Files:**
- Modify: `app/src/contractBridge.ts`
- Modify: `app/src/presentation.ts`

- [x] Add structured memory proposal and review state types.
- [x] Infer conservative memory candidates from “remember/prefer/call me” style text.
- [x] Keep `memory_write`, `approval_capture`, and external effects blocked.
- [x] Add presentation copy that is clear for adult and child protected modes.

### Task 3: UI Flow

**Files:**
- Modify: `app/src/App.tsx`
- Modify: `app/src/styles.css`

- [x] Show memory proposal review panels in rehearsal and after live/stub responses.
- [x] Add local acknowledge/dismiss controls.
- [x] Emit local telemetry for proposed/acknowledged/dismissed memory review.
- [x] Ensure controls never call a memory write API and never imply Napoleon approval.

### Task 4: Docs And Validation

**Files:**
- Modify: `docs/BACKLOG.md`
- Modify: `docs/PRD.md`
- Modify: `docs/GOVERNANCE_SAFETY_PRIVACY.md`
- Modify: `docs/REHEARSAL_MODE.md`
- Modify: `.codex/status.md`
- Modify: `Changelog.md`

- [x] Document proposal-only memory review.
- [x] Run focused tests, `make check`, rendered UI validation, and final git status.
- [ ] Commit and push.
