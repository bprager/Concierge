# Rehearsal Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Rehearsal Mode so Concierge can preview a governed Napoleon turn before any live bridge call.

**Architecture:** Rehearsal Mode is a local, contract-only preview built from the existing text turn contract. The app uses it to show the understood request, Napoleon path, Chief of Staff review packet, allowed and blocked effects, approval state, memory proposal, trace/audit preview, and evaluator-case candidate before sending an advisory response.

**Tech Stack:** React, TypeScript, Node test runner, JSON schemas, Markdown docs.

---

### Task 1: Rehearsal Contract Helpers

**Files:**
- Modify: `app/tests/contract.test.ts`
- Modify: `app/src/contractBridge.ts`

- [x] **Step 1: Write the failing test**

Add a test that calls `buildRehearsalPreview` from `app/src/contractBridge.ts` and asserts that the preview is contract-only, contains the user's request, exposes the CoS review packet, lists blocked effects, and includes an evaluator-case candidate.

- [x] **Step 2: Run test to verify it fails**

Run: `cd app && npm test`
Expected: FAIL because `buildRehearsalPreview` is not exported yet.

- [x] **Step 3: Write minimal implementation**

Add `RehearsalPreview` types and `buildRehearsalPreview(contract, message)` in `app/src/contractBridge.ts`.

- [x] **Step 4: Run test to verify it passes**

Run: `cd app && npm test`
Expected: PASS.

### Task 2: Rehearsal Presentation

**Files:**
- Modify: `app/tests/presentation.test.ts`
- Modify: `app/src/presentation.ts`

- [x] **Step 1: Write the failing test**

Add a test for `summarizeRehearsalPreview` that confirms the summary says the preview is not executed and includes the approval state.

- [x] **Step 2: Run test to verify it fails**

Run: `cd app && npm test`
Expected: FAIL because `summarizeRehearsalPreview` is not exported yet.

- [x] **Step 3: Write minimal implementation**

Add `summarizeRehearsalPreview(preview)` in `app/src/presentation.ts`.

- [x] **Step 4: Run test to verify it passes**

Run: `cd app && npm test`
Expected: PASS.

### Task 3: Rehearsal UI

**Files:**
- Modify: `app/src/App.tsx`
- Modify: `app/src/styles.css`

- [x] **Step 1: Add app state**

Add `rehearsalMode`, `rehearsalPreview`, and `rehearsalSummary` state to the app. Keep Rehearsal Mode enabled by default.

- [x] **Step 2: Add preview action**

Add a `rehearse` action that builds the contract locally and displays the preview. The action must not call the live Napoleon endpoint.

- [x] **Step 3: Adjust send action**

When Rehearsal Mode is enabled, the primary button previews first. A second button sends the advisory request only after the preview exists.

- [x] **Step 4: Render preview panel**

Show understood request, proposed Napoleon path, Chief of Staff review packet, allowed effects, blocked effects, approval state, memory proposal, trace/audit preview, and evaluator-case candidate.

### Task 4: Documentation

**Files:**
- Modify: `docs/BACKLOG.md`
- Modify: `docs/PRD.md`
- Modify: `docs/ARCHITECTURE.md`
- Create: `docs/REHEARSAL_MODE.md`
- Modify: `Changelog.md`
- Modify: `.codex/status.md`

- [x] **Step 1: Add backlog story**

Add a P0 Text Concierge story for Rehearsal Mode with acceptance criteria, observability, privacy/safety impact, and evaluator coverage.

- [x] **Step 2: Update product and architecture docs**

Document Rehearsal Mode as a contract-only preview surface, not an authority path.

- [x] **Step 3: Update handoff and changelog**

Record the feature in `.codex/status.md` and `Changelog.md`.

### Task 5: Validation And Commit

**Files:**
- All changed files.

- [x] **Step 1: Run app tests**

Run: `cd app && npm test`
Expected: all tests pass.

- [x] **Step 2: Build app**

Run: `cd app && npm run build`
Expected: build succeeds.

- [x] **Step 3: Render app**

Run the local dev server and load the app in a browser/headless browser. Confirm the Rehearsal Mode panel appears and does not overlap.

- [x] **Step 4: Run full check**

Run: `make check`
Expected: evaluator, schemas, docs, app tests, app build, and Tauri check pass.

- [ ] **Step 5: Commit and push**

Run: `git add -A`, `git commit`, and `git push origin main`.
