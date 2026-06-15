# Recommended Startup Plan

Date: 2026-06-08

## Guiding Principle

Build the smallest observable, governed text path before adding voice, avatar, camera, or self-evolution behavior.

The project should optimize for maintainability, observability, governance, and future evolution over rapid visible features. After ingesting Napoleon's CoS integration package, the first implementation sequence correctly prioritized local contract reconciliation before UI expansion. A first Text Concierge pass now exists; subsequent UI work should still be gated by deeper contract tests and live Napoleon validation.

## Recommended First Implementation Sequence

### Step 1: Stabilize The Baseline

Goal:

- Make the current scaffold easy to verify in one command.

Work:

- Add `make check`.
- Include evaluator stub mode.
- Validate JSON schemas and examples.
- Validate YAML files.
- Run frontend build when dependencies are installed.
- Run Tauri check when Rust dependencies are available.

Why first:

- Future work needs a reliable local gate.

### Step 2: Reconcile Napoleon CoS Contracts Locally

Goal:

- Make Concierge's local contracts match Napoleon's contract-only package before runtime behavior is built.

Current state:

- First-pass local reconciliation exists for Text Concierge schemas, bridge payloads, profile mode mapping, governance decisions, trace/audit envelopes, blocked effects, and tests.

Work:

- Add or reference the `napoleon.chief_of_staff` descriptor.
- Map local profile names to Napoleon profile modes.
- Map local bridge request/response concepts to ChiefOfStaffRequest, ChiefOfStaffResponse, GovernanceEvaluationRequest, GovernanceDecision, AgentManifest, TraceEnvelope, AuditEnvelope, and EvolutionProposal.
- Capture blocked effects as first-class test data.
- Add schema-version and cache/fail-closed rules for descriptor discovery.

Why second:

- The bridge is the authority boundary. Contract drift here will contaminate every later feature.

### Step 3: Harden The Local Bridge Adapter

Goal:

- Make the P1 bridge safe enough to build against.

Current state:

- The local bridge adapter builds CoS/governance/observability envelopes, posts them to a configured endpoint when present, and otherwise returns a prepare-only local stub with blocked effects visible.

Work:

- Validate the existing header-only bearer-token bridge scheme once Napoleon provides the live transport and credentials.
- Add request, response, decision, trace, and audit IDs.
- Add error responses.
- Add governance decision handling for `allow_prepare_only`, `deny`, `requires_review`, and `no_go`.
- Add confirmation request and result payloads.
- Add memory proposal display payload that does not write memory.
- Add delegation result payload based on agent manifests.
- Add trace propagation fields.
- Add version field.

Why third:

- Once local contracts match Napoleon's package, the app needs an adapter that keeps UI behavior inside those boundaries.

### Step 4: Define Trace Completeness

Goal:

- Ensure every text turn is explainable.

Work:

- Tighten `schemas/interaction_trace.schema.json` around Napoleon `TraceEnvelope`, `EventEnvelope`, `MetricEnvelope`, and `AuditEnvelope` requirements.
- Add event enum and required fields by event type.
- Add valid examples for adult, child, guest, confirmation-required, and blocked flows.
- Require `decision_id`, `audit_id`, `authority_tier`, `approval_requirement`, `evidence_links`, and `blocked_effects` when governance or delegation is involved.
- Add schema validation in CI.

Why third:

- Governance and self-improvement depend on knowing what happened.

### Step 5: Expand Evaluator Coverage

Goal:

- Move the evaluator from smoke test to early quality gate.

Work:

- Expand beyond the current 18 scenarios with more negative cases and regression checks.
- Add negative cases for unsafe autonomy, child safety, memory writes, raw capture, and direct tool execution.
- Add contract-conformance cases for descriptor discovery, agent manifests, governance decisions, profile mapping, observability envelopes, evolution proposals, and contract-only boundaries.
- Add regression comparison.
- Add Markdown summary output.
- Add human review checklist.

Why fourth:

- The evaluator is the project's first gate, but it needs stronger coverage before it can block phase promotion.

### Step 6: Build The Text MVP Core Flow

Goal:

- Make one governed text turn work end to end.

Work:

- Resolve profile.
- Create conversation and turn IDs.
- Build trace object.
- Send request through the local bridge adapter.
- Attach source evidence, actor ID, requested authority tier, profile mode, and blocked effects.
- Render response.
- Handle bridge errors visibly.
- Log required events.

Why fifth:

- It proves the basic product loop without voice/avatar complexity.

### Step 7: Add Governance Confirmation UI

Goal:

- Prevent Concierge from becoming an authority layer.

Work:

- Display confirmation requests from Napoleon.
- Support approve, deny, and cancel.
- Emit audit and trace events.
- Handle child/guardian approval separately.
- Treat `requires_review` and `no_go` as non-executable states.

Why sixth:

- Any useful assistant eventually encounters action requests. Confirmation must be explicit before side-effect-adjacent behavior grows.

### Step 8: Add Settings And Privacy Panel

Goal:

- Make endpoint, telemetry, profile, camera, and microphone state visible and controllable.

Work:

- Configure Napoleon endpoint.
- Show Chief of Staff descriptor status and schema version.
- Show bridge status.
- Show camera and microphone off by default.
- Configure telemetry retention/export.
- Expose profile mode.

Why seventh:

- Consent and visibility are product requirements, not optional preferences.

### Step 9: Add P1 Smoke And Regression Tests

Goal:

- Protect the text MVP from regressions.

Work:

- Add tests or fixtures for adult owner, child protected, and guest flows.
- Add bridge contract tests.
- Add trace completeness tests.
- Add governance confirmation tests.
- Add descriptor, profile mapping, blocked effects, and non-authority boundary tests.

Why eighth:

- Once UI behavior exists, evaluator and test coverage must prevent authority drift.

## What Should Be Built First

1. `make check`
2. Napoleon CoS contract reconciliation
3. Local bridge adapter hardening
4. Trace schema and examples
5. Evaluator scenario expansion
6. Text MVP turn flow
7. Governance confirmation UI
8. Settings/privacy panel

## What Should Be Deferred

Defer until P1 governance and trace behavior are stable:

- Voice activity detection.
- Speech-to-text.
- Text-to-speech.
- Wake word.
- Avatar renderer beyond placeholder.
- Camera perception.
- Affect fusion.
- Gaze simulation.
- Self-evolution rollout.
- Automatic memory writes.
- Direct specialized agent calls from Concierge.
- Treating Chief of Staff discovery, contract lookup, or governance review as runtime approval.

## Highest-Risk Areas

| Risk | Why it is high risk | Mitigation |
|---|---|---|
| Bridge boundary erosion | UI code may start calling tools or agents directly. | Keep all Napoleon behavior behind the bridge and add contract tests. |
| Contract mismatch with Napoleon | Local Concierge can pass local checks while violating Napoleon's descriptor, schema names, blocked effects, or profile modes. | Reconcile contracts and add conformance tests before UI expansion. |
| Weak governance confirmation | Side effects could become casual UI actions. | Define and test confirmation states before enabling action paths. |
| Incomplete traces | Failures become impossible to explain. | Make trace completeness a validator, not a convention. |
| Child mode under-enforcement | Docs alone will not protect child users. | Add child-specific runtime tests and guardian approval contracts. |
| Evaluator false confidence | Stub mode can pass while real Napoleon integration is missing. | Use HTTP mode, regression comparison, and human review. |
| Privacy telemetry leakage | Debug logs can accidentally include sensitive data. | Define redaction and local buffer behavior early. |
| Voice/avatar premature build-out | Presentation can obscure authority gaps. | Keep voice/avatar deferred until P1 exits cleanly. |

## Suggested First Backlog Items

1. Add `make check` with evaluator, schema, YAML, frontend, and Tauri checks.
2. Add local contract references or mirrors for the Napoleon CoS descriptor and schemas.
3. Continue updating the OpenAPI bridge with remaining error-response and confirmation payload details; authentication, governance, trace IDs, decision IDs, audit IDs, evidence links, and blocked effects are now represented locally.
4. Add bridge and CoS contract fixtures and tests.
5. Tighten interaction trace schema and add examples for key flows.
6. Expand evaluator scenarios to at least 15, including Napoleon contract-conformance cases.
7. Add evaluator regression comparison.
8. Implement text turn trace assembly.
9. Implement governance confirmation UI.
10. Implement settings/privacy panel.
11. Resolved `LICENSE-TODO.md` versus MIT `LICENSE` drift.

## Startup Verdict

Do not start with voice, avatar, or self-evolution. Start by making the local Concierge contracts conform to Napoleon's CoS package, then make one text turn governed, observable, traceable, and testable. That gives the project a foundation that future voice and avatar work can safely build on.
