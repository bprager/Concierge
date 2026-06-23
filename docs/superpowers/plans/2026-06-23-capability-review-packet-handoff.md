# Capability Review Packet Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user submit a sanitized capability answer review packet to Napoleon Chief of Staff review through the governed bridge.

**Architecture:** Reuse the existing Chief-of-Staff steering bridge path instead of adding a new authority route. The local packet remains proposal-only; submission requires endpoint, descriptor preflight, advertised governed handoff route, and Rehearsal Mode off.

**Tech Stack:** TypeScript, React, Tauri shell, Node test runner, existing generated bridge operation registry.

---

### Task 1: Unit-Level Governed Submission

**Files:**
- Modify: `app/src/chiefOfStaffSteering.ts`
- Test: `app/tests/chiefOfStaffSteering.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests that build a sanitized capability review packet from `answerCapabilityQuestion`, submit it through the governed steering endpoint, and assert the request body contains `handoffKind: "capability_review_packet_handoff"`, the packet, evaluator case candidate, evolution proposal draft, proposal-only boundary, child-safe profile handling, and no forbidden side effects.

- [ ] **Step 2: Verify red**

Run: `npm test -- --test-name-pattern "capability review packet handoff"` from `app`.
Expected: fail because no submission helper exists.

- [ ] **Step 3: Implement minimal helper**

Add `submitCapabilityReviewPacket` beside `submitChiefOfStaffSteeringDraft`. Reuse descriptor, endpoint, auth, Rehearsal Mode, response validation, no-go, and contract-mismatch logic. Send through `resolveNapoleonEvolutionProposalReviewOperation`.

- [ ] **Step 4: Verify green**

Run: `npm test -- --test-name-pattern "capability review packet handoff"` from `app`.
Expected: pass.

### Task 2: Rendered UI Handoff

**Files:**
- Modify: `app/src/App.tsx`
- Test: `app/tests/AppProofExportInteraction.test.tsx`

- [ ] **Step 1: Write failing rendered tests**

Add a rendered test that asks for recommended capabilities, clicks `Export capability review packet`, then clicks `Send capability review packet to Napoleon review` after local harness descriptor readiness. Assert the returned decision/audit text is visible, the packet remains no-side-effect, and fetch is called only for the governed endpoint.

- [ ] **Step 2: Verify red**

Run: `npm test -- --test-name-pattern "sends capability review packet"` from `app`.
Expected: fail because the button/result does not exist.

- [ ] **Step 3: Implement UI state and controls**

Store the last exported packet object, render governed handoff readiness using the existing `describeGovernedHandoffReadiness`, add a send button disabled until ready, clear stale packet state when profile, endpoint, token, descriptor, Rehearsal Mode, taxonomy, or ledger context changes, and render returned review metadata.

- [ ] **Step 4: Verify green**

Run: `npm test -- --test-name-pattern "sends capability review packet"` from `app`.
Expected: pass.

### Task 3: Docs and Validation

**Files:**
- Modify: `docs/CONVERSATION_CAPABILITY_INTELLIGENCE.md`
- Modify: `docs/BACKLOG.md`
- Modify: `docs/GOVERNANCE_SAFETY_PRIVACY.md`
- Modify: `docs/OBSERVABILITY.md`
- Modify: `Changelog.md`
- Modify: `.codex/status.md`

- [ ] **Step 1: Update docs**

Document that capability review packet submission is governed, descriptor-gated, profile-scoped, Rehearsal Mode blocked, proposal-only, and unable to approve, apply, write memory, dispatch agents, or send externally.

- [ ] **Step 2: Run validation**

Run: `git diff --check`, `make eval`, `npm run build` in `app`, `cargo check` in `app/src-tauri`, and `make check`.

- [ ] **Step 3: Commit**

Stage the app, tests, docs, changelog, and `.codex/status.md`, then commit and push.
