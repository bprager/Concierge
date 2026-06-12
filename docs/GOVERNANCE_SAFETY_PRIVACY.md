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
- Execute local shell or process commands
- Call agents, tools, Memgraph, memory, or services outside the governed bridge
- Enable camera or microphone silently
- Act for a child without guardian-appropriate approval
- Bypass Napoleon governance

Repository validation scans Concierge runtime source for direct process execution, memory or graph access, and agent or tool dispatch. The scan is a guardrail, not authority: it catches local implementation drift while Napoleon remains the only authority layer.

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

Live Napoleon bridge failures are fail-closed states. Missing endpoint, missing descriptor, descriptor mismatch, checksum or signature mismatch, authentication failure, contract mismatch, local `no_go`, remote `deny` or `no_go`, timeout, and HTTP failure must be shown as blocked local states. Remote `deny` and `no_go` outcomes must block text responses, memory proposal handoff, and Chief of Staff steering handoff instead of being treated as successful answers or completed reviews. They must not be treated as Napoleon approval. Early local failures must preserve the relevant text-turn, memory proposal, or Chief of Staff steering blocked-effect list, and remote failures must preserve Napoleon-supplied blocked effects where available, rather than retrying into side effects. Live text-turn failure reasons and blocked effects must be visible in the conversation transcript as well as the bridge failure panel.

The optional bridge bearer token is a local connection credential. Concierge sends it only in the `Authorization` header for governed bridge requests. It must not be included in request bodies, local capability exports, telemetry attributes, memory proposals, or user-visible provenance panels.

Delegation and recommendation attribution require bridge provenance. Concierge may say that Napoleon recommended something only when the live bridge response includes matching recommendation provenance with that contribution, trace ID, and audit ID, and those IDs match the response trace and audit envelopes. Concierge may say that a selected agent found something only when the live bridge response includes that contribution, selected agent, governance state, trace ID, and audit ID, and those IDs match the response trace and audit envelopes. Live text that claims a Napoleon recommendation or selected-agent finding without matching contribution provenance must be blocked as a contract mismatch. Missing or mismatched provenance fails closed rather than being repaired locally.

## 4. Memory proposal review

Text Concierge may identify possible preferences or profile notes from a turn and show them as memory proposals.

Every memory proposal review must show proposal ID, source turn, user profile, proposed value, rationale, review state, blocked effects, trace ID, and audit ID.

Memory proposal review is proposal-only. Local acknowledgement records that the proposal was seen, and local dismissal hides the local proposal, but neither action writes memory, captures approval, appends Napoleon audit records, or changes profile authority.

When a governed Napoleon endpoint is configured and descriptor preflight passes, Concierge may submit the proposal to Napoleon review through `/v1/concierge/memory-proposals`. That handoff is still proposal-only: Concierge must not write memory, capture approval, send externally, dispatch agents, or treat submission as permission. Rehearsal Mode remains local and must not use this handoff.

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
- Uses count and age bounded browser-local retention for the latest capability signals.
- Shows local retention status in the Text Concierge UI, including maximum signal count and maximum age.
- Provides a clear control that removes both persisted and in-memory capability signals.
- Provides a local JSON export control with privacy, retention, trend, and scoring caveats; export does not grant permission to share externally.
- Provides local taxonomy controls for rename, merge, deprecated markers, split-candidate markers, and reset.
- Clear, export, taxonomy, retention pruning, trend answers, and recommendation scoring do not capture approval, write Napoleon memory, dispatch agents, send externally, change governance authority, or change Napoleon routing/policy.
- Chief of Staff steering drafts are proposal packets only. They can contain a capability recommendation, evaluator case candidate, and evolution proposal draft. Concierge may submit them to Napoleon Chief of Staff review only through the governed bridge after endpoint and descriptor preflight pass, but submission does not apply changes, write memory, dispatch agents, send externally, or capture approval.
- Recommendation scoring penalizes privacy risk, child safety risk, governance risk, authority expansion, and high implementation effort.
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
