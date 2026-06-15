# Rehearsal Mode

Rehearsal Mode is Concierge's local preview for governed Napoleon turns.

It lets the user inspect what Concierge believes it is about to ask Napoleon before a live bridge request is sent. The preview is contract-only. It does not grant authority, capture approval, write memory, send externally, dispatch agents, execute commands, or append remote audit events.

## User Value

Rehearsal Mode makes governance visible. Instead of hiding the boundary in schemas or logs, Concierge shows the proposed path and the blocked effects before the user sends the advisory request.

This is useful for:

- Verifying what Concierge understood.
- Seeing which Napoleon and Chief of Staff contracts would be used.
- Spotting blocked side effects early.
- Treating memory changes as proposal-only review items.
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

Voice-turn rehearsal is also local, but it is not a spoken Napoleon turn. It chains local sample VAD, STT, an explicit text authority boundary, and TTS metadata so the user can inspect the future voice path before live capture or playback exists. It must show that Napoleon was not contacted, that no delegated agent response exists, and that recording, playback, raw audio storage, memory writes, approval capture, agent dispatch, and external sends are blocked.

Barge-in rehearsal is local state modeling only, not live interruption of a spoken Napoleon turn. It may mark planned sample speech as interrupted and prepare next-turn state, but it must not start playback, request microphone permission, capture audio, store raw audio, contact Napoleon, write memory, capture approval, dispatch agents, or send externally.

Voice response shaping is local preparation only, not spoken output. It may shorten bridge-provenance text for a future speech surface, but it must not start playback, request microphone permission, capture audio, store raw audio, contact Napoleon, write memory, capture approval, dispatch agents, or send externally. It must not add Napoleon or delegated-agent attribution unless matching bridge provenance exists. Child protected shaping uses a shorter speech budget, slower pacing metadata, and a guardian-review reminder while remaining non-authorizing.

Avatar state preparation is local display state only, not live avatar mode. It may prepare a neutral avatar-facing state from returned text provenance, stance, and active profile, but it must not request camera permission, capture video, run face detection, infer affect, animate an avatar, contact Napoleon, write memory, capture approval, dispatch agents, or send externally. It must not claim Napoleon or delegated-agent authority unless bridge provenance supports that claim. In child protected mode, avatar camera and affect paths stay disabled until guardian review and the state must show that guardian approval was not captured.

Avatar model loading is local metadata preparation only, not live rendering. It may validate a `.vrm` model reference and show model metadata, but it must not start a renderer, request camera permission, capture video, run face detection, infer affect, contact Napoleon, write memory, capture approval, dispatch agents, or send externally. Child protected model loading stays non-authorizing and must show that guardian review is still required before rendering, camera, or affect features.

Avatar renderer readiness is local preflight only, not live rendering. It may confirm that loaded model metadata is sufficient to prepare a future renderer, but it must not allocate a canvas, start a render loop, animate a model, request camera permission, capture video, run face detection, infer affect, contact Napoleon, write memory, capture approval, dispatch agents, or send externally. Child protected readiness remains blocked on guardian review and does not capture guardian approval.

Avatar expression mapping is local stance metadata only, not animation or emotion inference. It may map direct, warm, concerned, playful, or somber stance labels to expression labels, but it must not start animation, request camera permission, capture video, run face detection, infer affect, contact Napoleon, write memory, capture approval, dispatch agents, or send externally. Child protected mapping stays conservative and does not capture guardian approval.

Sending an advisory request is a separate user action after the preview exists, but it is disabled while Rehearsal Mode remains active. The user must leave Rehearsal Mode before any live governed bridge send can be attempted. The unchanged preview remains available for that separate send after Rehearsal Mode is off; if the prompt changes, the post-preview send stays blocked until a new preview is created. That send still goes through the governed bridge path and remains subject to Chief of Staff and governance decisions.

If the rehearsed turn is `no_go` or denied, Concierge blocks the send action. If the turn is `requires_review`, Concierge shows a review panel. A local acknowledgement can record that the review was seen, but it is not Napoleon approval and does not grant authority.

If the turn looks like a memory preference or profile note, Concierge shows a memory proposal review panel. Acknowledging or dismissing that panel is local only: it does not write memory, capture approval, send externally, or append a Napoleon audit record.

## Privacy And Safety

- Raw text stays local during preview.
- No raw audio or video is involved.
- Memory is shown only as a proposal for review.
- Child protected mode keeps blocked effects visible and does not allow secret-keeping or external action.
- A preview cannot be used as evidence that an action was approved.

## Observability

The app emits `rehearsal_preview_created` with trace, conversation, turn, profile, and request identifiers. This event records that a preview was created, not that any external action happened.

For memory proposals, the app emits local `memory_proposal_review_created`, `memory_proposal_acknowledged_locally`, or `memory_proposal_dismissed_locally` events. These events include proposal and trace identifiers and explicitly record that no memory write or approval capture occurred.

## Evaluator Use

Rehearsal previews can seed evaluator cases because they include the request, profile mode, expected blocked effects, trace ID, and source request ID.

The evaluator includes four Rehearsal Mode scenarios:

- `REHEARSAL-ADULT-001`
- `REHEARSAL-CHILD-001`
- `REHEARSAL-GUEST-001`
- `REHEARSAL-ADVERSARIAL-001`

Representative fixtures live in `examples/rehearsal_evaluator_cases.json`.

The related governance review UI scenario is `GOVERNANCE-REVIEW-001`.

The related memory proposal review scenario is `MEMORY-PROPOSAL-001`.
