# Governance, Safety, and Privacy

## 1. Authority model

Concierge starts read-only and advisory.

It may:

- Answer
- Clarify
- Summarize
- Draft
- Recommend
- Route through Napoleon
- Propose memory updates
- Propose evolution changes

It may not directly:

- Send emails
- Modify calendar
- Buy anything
- Change memory authority
- Enable camera or microphone silently
- Act for a child without guardian-appropriate approval
- Bypass Napoleon governance

## 2. Confirmation tiers

| Tier | Examples | Approval |
|---|---|---|
| Read-only | Summarize, explain, inspect | No extra approval |
| Draft | Draft email, draft plan | User review |
| Low-risk local preference | Shorter responses | User approval or setting |
| Side effect | Send, book, delete, purchase | Explicit confirmation |
| Sensitive access | Health, finance, child data | Purpose-bound confirmation |
| Policy change | Memory, autonomy, child behavior | Chief of Staff plus approval |

## 3. Governance review UI

Text Concierge displays Napoleon governance outcomes as local review states:

- `allow_prepare_only`: advisory preparation is allowed, but blocked effects remain unavailable.
- `requires_review`: Chief of Staff or Napoleon review is needed before anything moves beyond preparation.
- `deny`: the requested action is not allowed through the current path.
- `no_go`: the request is non-executable and cannot be sent forward as an advisory request.

Every review panel must show decision ID, audit ID, authority tier, approval requirement, rationale, blocked effects, and trace ID.

Local acknowledgement is not approval. It records that the review state was seen, but it must not execute side effects, write memory, send externally, dispatch agents, or capture Napoleon approval.

Child protected mode uses stricter wording. It must not imply secret-keeping, hidden external action, or guardian-bypassing approval.

## 4. Memory proposal review

Text Concierge may identify possible preferences or profile notes from a turn and show them as memory proposals.

Every memory proposal review must show proposal ID, source turn, user profile, proposed value, rationale, review state, blocked effects, trace ID, and audit ID.

Memory proposal review is proposal-only. Local acknowledgement records that the proposal was seen, and local dismissal hides the local proposal, but neither action writes memory, captures approval, appends Napoleon audit records, or changes profile authority.

Child protected memory proposals require guardian-appropriate review and must use wording that rejects secret-keeping.

## 5. Privacy defaults

- Camera off by default
- Microphone off by default
- Raw audio not stored by default
- Raw video not stored by default
- Derived signals stored only when useful
- Child data minimized
- Telemetry redacted before export

Conversation Capability Intelligence persistence:

- Stores derived metadata signals only by default, not raw user text, raw audio, or raw video.
- Uses bounded browser-local retention for the latest capability signals.
- Shows local retention status in the Text Concierge UI.
- Provides a clear control that removes both persisted and in-memory capability signals.
- Provides a local JSON export control with a privacy caveat; export does not grant permission to share externally.
- Clear and export controls do not capture approval, write Napoleon memory, dispatch agents, send externally, or change governance authority.
- Child protected records remain minimized and marked with `child_sensitive` privacy class.

## 6. Child mode rules

Child protected mode must:

- Use age-appropriate language
- Encourage healthy independence
- Refuse secret-keeping from guardian in safety-relevant contexts
- Require guardian approval for external actions
- Avoid emotional dependency
- Avoid persuasive avatar behavior
- Minimize memory
- Disable camera affect estimation by default unless explicitly approved

## 7. Avatar safety

Avatar mode must:

- Clearly identify as AI
- Be easy to mute, hide, pause, or disable
- Avoid fake emotional dependence
- Avoid intense emotional mirroring
- Avoid surveillance-like behavior
- Explain camera and mic state visibly
- Preserve user agency
