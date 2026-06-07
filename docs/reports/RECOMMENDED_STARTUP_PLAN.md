# Recommended Startup Plan

Date: 2026-06-07

## Guiding Principle

Build the smallest observable, governed text path before adding voice, avatar, camera, or self-evolution behavior.

The project should optimize for maintainability, observability, governance, and future evolution over rapid visible features.

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

### Step 2: Harden The Napoleon Bridge Contract

Goal:

- Make the P1 bridge safe enough to build against.

Work:

- Add auth scheme.
- Add request/response IDs.
- Add error responses.
- Add governance decision enum.
- Add confirmation request and result payloads.
- Add memory proposal payload.
- Add delegation result payload.
- Add trace propagation fields.
- Add version field.

Why second:

- The bridge is the authority boundary. Weak contracts here will contaminate every later feature.

### Step 3: Define Trace Completeness

Goal:

- Ensure every text turn is explainable.

Work:

- Tighten `schemas/interaction_trace.schema.json`.
- Add event enum and required fields by event type.
- Add valid examples for adult, child, guest, confirmation-required, and blocked flows.
- Add schema validation in CI.

Why third:

- Governance and self-improvement depend on knowing what happened.

### Step 4: Expand Evaluator Coverage

Goal:

- Move the evaluator from smoke test to early quality gate.

Work:

- Expand from 6 to at least 15 scenarios.
- Add negative cases for unsafe autonomy, child safety, memory writes, raw capture, and direct tool execution.
- Add regression comparison.
- Add Markdown summary output.
- Add human review checklist.

Why fourth:

- The evaluator is the project's first gate, but it needs stronger coverage before it can block phase promotion.

### Step 5: Build The Text MVP Core Flow

Goal:

- Make one governed text turn work end to end.

Work:

- Resolve profile.
- Create conversation and turn IDs.
- Build trace object.
- Send request through the bridge.
- Render response.
- Handle bridge errors visibly.
- Log required events.

Why fifth:

- It proves the basic product loop without voice/avatar complexity.

### Step 6: Add Governance Confirmation UI

Goal:

- Prevent Concierge from becoming an authority layer.

Work:

- Display confirmation requests from Napoleon.
- Support approve, deny, and cancel.
- Emit audit and trace events.
- Handle child/guardian approval separately.

Why sixth:

- Any useful assistant eventually encounters action requests. Confirmation must be explicit before side-effect-adjacent behavior grows.

### Step 7: Add Settings And Privacy Panel

Goal:

- Make endpoint, telemetry, profile, camera, and microphone state visible and controllable.

Work:

- Configure Napoleon endpoint.
- Show bridge status.
- Show camera and microphone off by default.
- Configure telemetry retention/export.
- Expose profile mode.

Why seventh:

- Consent and visibility are product requirements, not optional preferences.

### Step 8: Add P1 Smoke And Regression Tests

Goal:

- Protect the text MVP from regressions.

Work:

- Add tests or fixtures for adult owner, child protected, and guest flows.
- Add bridge contract tests.
- Add trace completeness tests.
- Add governance confirmation tests.

Why eighth:

- Once UI behavior exists, evaluator and test coverage must prevent authority drift.

## What Should Be Built First

1. `make check`
2. Bridge contract hardening
3. Trace schema and examples
4. Evaluator scenario expansion
5. Text MVP turn flow
6. Governance confirmation UI
7. Settings/privacy panel

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

## Highest-Risk Areas

| Risk | Why it is high risk | Mitigation |
|---|---|---|
| Bridge boundary erosion | UI code may start calling tools or agents directly. | Keep all Napoleon behavior behind the bridge and add contract tests. |
| Weak governance confirmation | Side effects could become casual UI actions. | Define and test confirmation states before enabling action paths. |
| Incomplete traces | Failures become impossible to explain. | Make trace completeness a validator, not a convention. |
| Child mode under-enforcement | Docs alone will not protect child users. | Add child-specific runtime tests and guardian approval contracts. |
| Evaluator false confidence | Stub mode can pass while real Napoleon integration is missing. | Use HTTP mode, regression comparison, and human review. |
| Privacy telemetry leakage | Debug logs can accidentally include sensitive data. | Define redaction and local buffer behavior early. |
| Voice/avatar premature build-out | Presentation can obscure authority gaps. | Keep voice/avatar deferred until P1 exits cleanly. |

## Suggested First Backlog Items

1. Add `make check` with evaluator, schema, YAML, frontend, and Tauri checks.
2. Update OpenAPI bridge with authentication, governance, confirmation, errors, and trace IDs.
3. Add bridge contract fixtures and tests.
4. Tighten interaction trace schema and add examples for key flows.
5. Expand evaluator scenarios to at least 15.
6. Add evaluator regression comparison.
7. Implement text turn trace assembly.
8. Implement governance confirmation UI.
9. Implement settings/privacy panel.
10. Resolve `LICENSE-TODO.md` versus MIT `LICENSE` drift.

## Startup Verdict

Do not start with voice, avatar, or self-evolution. Start by making one text turn governed, observable, traceable, and testable. That gives the project a foundation that future voice and avatar work can safely build on.
