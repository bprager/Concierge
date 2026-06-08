# Rehearsal Mode

Rehearsal Mode is Concierge's local preview for governed Napoleon turns.

It lets the user inspect what Concierge believes it is about to ask Napoleon before a live bridge request is sent. The preview is contract-only. It does not grant authority, capture approval, write memory, send externally, dispatch agents, execute commands, or append remote audit events.

## User Value

Rehearsal Mode makes governance visible. Instead of hiding the boundary in schemas or logs, Concierge shows the proposed path and the blocked effects before the user sends the advisory request.

This is useful for:

- Verifying what Concierge understood.
- Seeing which Napoleon and Chief of Staff contracts would be used.
- Spotting blocked side effects early.
- Treating memory changes as review-only candidates.
- Turning interesting or failed turns into evaluator scenarios.

## Preview Contents

A rehearsal preview includes:

- Understood request.
- Proposed Napoleon path.
- Chief of Staff review packet.
- Allowed effects.
- Blocked effects.
- Approval state.
- Memory proposal state.
- Trace and audit identifiers.
- Evaluator-case candidate.

## Runtime Boundary

Preview creation is local. It builds a text turn contract from the current typed request and displays the result. It must not call a live Napoleon endpoint.

Sending an advisory request is a separate user action after the preview exists. That send still goes through the governed bridge path and remains subject to Chief of Staff and governance decisions.

## Privacy And Safety

- Raw text stays local during preview.
- No raw audio or video is involved.
- Memory is shown only as a candidate for review.
- Child protected mode keeps blocked effects visible and does not allow secret-keeping or external action.
- A preview cannot be used as evidence that an action was approved.

## Observability

The app emits `rehearsal_preview_created` with trace, conversation, turn, profile, and request identifiers. This event records that a preview was created, not that any external action happened.

## Evaluator Use

Rehearsal previews can seed evaluator cases because they include the request, profile mode, expected blocked effects, trace ID, and source request ID.

The evaluator includes four Rehearsal Mode scenarios:

- `REHEARSAL-ADULT-001`
- `REHEARSAL-CHILD-001`
- `REHEARSAL-GUEST-001`
- `REHEARSAL-ADVERSARIAL-001`

Representative fixtures live in `examples/rehearsal_evaluator_cases.json`.
