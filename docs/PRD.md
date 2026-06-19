# PRD: Concierge

## 1. Product summary

Concierge is Napoleon's adaptive human interface.

It begins as a text-only interface, evolves into a voice interface, and eventually becomes an avatar-based desktop companion with camera and microphone input. Its purpose is to reduce friction between the human user and Napoleon while preserving safety, agency, privacy, and traceability.

Concierge is not another uncontrolled agent. It is a governed interface layer.

## 2. Product goals

1. Let users interact with Napoleon without knowing which agent or subsystem to invoke.
2. Support complex agent development through a periodic evaluator that tests Napoleon and Chief of Staff.
3. Provide a safe text MVP before voice or avatar expansion.
4. Add voice once text routing, authority, stance, and observability are stable.
5. Add avatar and camera perception only with explicit local-first privacy controls.
6. Support adult and child profiles with different authority, tone, explanation style, and memory rules.
7. Enable controlled self-evolution through evaluated improvement proposals.
8. Track local conversation capability signals so Concierge can explain common, working, missing, and next capabilities without storing raw conversations by default.

## 3. Non-goals

1. Concierge will not act as an autonomous super-agent.
2. Concierge will not directly execute high-impact side effects without governance.
3. Concierge will not store raw audio or video by default.
4. Concierge will not infer emotions as durable facts.
5. Concierge will not optimize engagement over wellbeing.
6. Concierge will not treat child users as adult users.
7. Concierge will not self-modify production policy without evaluation and approval.

## 4. Personas

### Adult owner

Example: Bernd.

Needs:

- Direct and strategic responses
- Low cognitive overhead
- Concise summaries when appropriate
- Honest critique
- Ability to delegate and prepare work
- Strong control over memory, autonomy, and privacy

Default stance:

- Direct
- Warm
- Serious for architecture, risk, money, health, legal, safety
- Light humor only when context supports it

### Child protected user

Example: Quinn.

Needs:

- Warm, simple, age-appropriate help
- Encouragement
- Clear boundaries
- Guardian-controlled memory and permissions
- No secret-keeping
- No external actions without guardian approval
- No manipulative or overly human emotional behavior

Default stance:

- Warm
- Encouraging
- Simple
- Patient
- Playful when safe
- Calm and firm for risk

### Guest or collaborator

Needs:

- Scoped assistance
- Minimal memory
- Limited access
- Clear separation from owner context

## 5. Product lifecycle

### P0: Evaluator foundation

Create a periodic evaluator that tests whether Napoleon and Chief of Staff can design, govern, integrate, test, and improve complex agents.

Primary test case: Concierge.

Evaluator must check:

- Problem framing
- Agent capability decomposition
- PRD quality
- Agent contract quality
- Governance model
- Napoleon integration
- Interaction stance and user profile handling
- Observability design
- Self-evolution design
- Risk handling
- Regression improvement

### P1: Text-only Concierge MVP

Text interface with:

- User identity mode
- Conversation state
- Intent understanding
- Napoleon bridge
- Governance prompt and confirmation
- Rehearsal Mode for previewing governed turns before live bridge calls
- Interaction stance policy
- Structured traces
- Evaluation hooks
- Child and adult response mode

### P2: Voice Concierge

Add:

- Mic permission and capture
- Voice activity detection
- Speech-to-text
- Text-to-speech
- Wake word option
- Barge-in and interruption handling
- Voice-specific brevity
- Voice telemetry
- Child-safe voice behavior

### P3: Avatar Concierge

Add:

- Local camera permission and capture
- VRM avatar renderer
- Avatar expression mapping from stance
- Lip sync
- Face and head pose tracking
- Gaze simulation
- Conservative user state fusion
- Camera privacy controls
- Avatar-specific safety rules

### P4: Controlled self-evolution

Add:

- Learning signals
- Conversation capability intelligence
- Failure clustering
- Improvement proposals
- Evaluation gates
- Human approval workflow
- Gradual rollout
- Rollback

## 6. Functional requirements

### FR1: Evaluator

The evaluator shall periodically run scenario suites against Napoleon.

It shall produce:

- Machine-readable report
- Human-readable summary
- Scores by rubric dimension
- Hard fail flags
- Missing artifact list
- Regression comparison to previous runs
- Recommended improvements

### FR2: Agent design artifact generation

Napoleon shall be tested on its ability to produce these artifacts for Concierge:

- PRD
- Capability map
- Agent contract
- Architecture design
- Governance model
- Memory policy
- Routing policy
- Interaction stance policy
- Observability plan
- Evaluation suite
- Risk register
- Backlog and rollout plan
- Self-evolution policy

### FR3: Text Concierge

Text Concierge shall:

- Accept typed user input
- Resolve user profile
- Identify intent
- Request context only through governed Napoleon APIs
- Discover advisory Chief of Staff capabilities only after descriptor discovery and present them as non-authorizing metadata
- Ask concise clarification when needed
- Route to Napoleon or specialized agents through the bridge
- Preview governed turns locally in Rehearsal Mode before sending a live bridge request
- Display allowed effects, blocked effects, approval state, memory proposal state, and trace/audit identifiers for rehearsed turns
- Display governance review states for `requires_review`, `deny`, and `no_go`; local acknowledgement and governed review handoff must not be treated as Napoleon approval
- Display memory proposal review as proposal-only with proposal ID, source turn, profile mode, rationale, blocked `memory_write`, trace ID, and audit ID; local acknowledgement or dismissal must not write memory
- Select an interaction stance
- Return responses in the user-appropriate style
- Emit telemetry for each turn

### FR4: Voice Concierge

Voice Concierge shall:

- Capture microphone input with explicit permission
- Distinguish microphone setting, operating-system permission, and active recording in the UI
- Detect speech boundaries
- Transcribe speech locally when feasible
- Synthesize responses with selectable voice
- Support interruption
- Prefer concise responses
- Log voice latency and quality metrics
- Avoid hidden always-on capture without visible state

### FR5: Avatar Concierge

Avatar Concierge shall:

- Render an avatar locally
- Map stance to expression and movement
- Simulate gaze based on screen and camera geometry
- Capture camera input only with explicit permission
- Distinguish camera setting, operating-system permission, and active recording in the UI
- Derive conservative user state signals
- Avoid durable emotional labeling
- Respect adult and child profile differences
- Expose camera, mic, memory, and avatar controls

### FR6: Observability

The system shall emit traces, metrics, logs, and evaluator reports.

Required trace events include:

- user_message_received
- identity_resolved
- intent_detected
- stance_selected
- context_requested
- governance_decision
- delegation_requested
- response_generated
- voice_segment_detected
- stt_completed
- tts_started
- tts_completed
- avatar_expression_set
- lip_sync_started
- lip_sync_completed
- gaze_target_updated
- camera_state_estimated
- eval_case_started
- eval_case_completed
- learning_signal_recorded
- evolution_proposal_created
- conversation_capability_signal
- capability_recommendation_created

### FR6A: Conversation Capability Intelligence

Concierge shall track derived metadata about conversation capabilities so the user can ask what conversations are common, what is working well, what is missing, what architecture area is blocking progress, and what capabilities should be built next.

It shall:

- Classify turns by topic, intent, capability, capability status, outcome signal, architecture area, confidence, and privacy class.
- Store local metadata and redacted summaries by default, not raw conversation transcripts.
- Treat correctly blocked unsafe requests as successful governance outcomes, not ordinary failures.
- Rank recommendations by user value, frequency, failure severity, strategic fit, evaluator gap, effort, governance risk, privacy risk, and child-safety risk.
- Produce proposal-only recommendations with evidence, uncertainty, evaluator needs, and rollback considerations.
- Keep child protected signals minimized and guardian-appropriate.

It shall not:

- Implement capabilities automatically.
- Grant approval or authority.
- Write memory directly.
- Dispatch agents or send externally.
- Optimize for engagement over safety, privacy, and user value.

### FR7: Self-evolution

Concierge may observe behavior and propose improvements.

It may not deploy high-risk behavioral changes without approval.

High-risk changes include:

- New tool access
- New memory write authority
- Child behavior changes
- External side effect authority
- Camera or microphone data retention changes
- Changes to persuasion or proactivity policy

## 7. Non-functional requirements

| Requirement | Target |
|---|---|
| Text response latency | Median under 2 seconds after Napoleon response is available |
| Voice turn latency | Initial target under 1.5 seconds after speech end for local pipeline excluding Napoleon |
| Avatar frame rate | 30 FPS minimum target on recommended hardware |
| Telemetry loss | Under 1 percent local event loss |
| Privacy | Raw audio and video off by default for storage |
| Security | Local bridge authenticated |
| Availability | Text mode works without camera or voice |
| Cross-platform | Mac first, Linux and Windows later |
| Accessibility | Keyboard-first text mode, captions for voice, camera optional |
| Observability | Every user turn has a trace ID |

## 8. Success metrics

### Evaluator metrics

- Rubric score
- Hard fail count
- Artifact completeness
- Regression delta
- Governance violations
- Missing observability fields
- Scenario pass rate

### Text metrics

- Correct routing rate
- Clarification usefulness
- Unsafe side effect rate
- User correction rate
- Stance fit rating
- Response latency
- Trace completeness

### Voice metrics

- VAD false start rate
- Speech end detection latency
- STT accuracy proxy
- TTS start latency
- Barge-in success rate
- Voice turn completion rate

### Avatar metrics

- Avatar FPS
- Camera processing latency
- Stance to expression mapping success
- User opt-in rate
- User disable rate
- Gaze simulation comfort rating
- Privacy setting changes

### Child profile metrics

- Guardian approval compliance
- Age-appropriate readability
- Escalation correctness
- Secret-keeping prevention
- External action prevention

## 9. Observability and auditability

Every interaction must produce an interaction trace.

The trace must answer:

1. Who was the user profile?
2. What did Concierge think the user wanted?
3. What context was requested?
4. What was allowed or blocked?
5. Which agent was selected?
6. Which interaction stance was selected?
7. What evidence supported the stance?
8. What response was generated?
9. What user correction or feedback occurred?
10. What should improve next time?

## 10. Privacy and safety

Camera, microphone, child profile, and memory features require explicit controls.

Default policy:

- Store derived signals only
- Do not store raw video
- Do not store raw audio unless explicitly recording
- Do not store inferred emotions as facts
- Redact personal content from routine telemetry where possible
- Use local-first perception

## 11. Release gates

### Gate P0 to P1

- Evaluator runs in CI
- Reports are generated
- Rubric and hard fail taxonomy exist
- Agent contract schema exists

### Gate P1 to P2

- Text mode passes governance tests
- Text mode emits complete traces
- Adult and child profiles pass baseline scenarios
- No hard fail in latest evaluator run

### Gate P2 to P3

- Voice permission model passes review
- Voice latency is acceptable
- Barge-in works
- Voice traces include VAD, STT, TTS, and response spans
- No always-on hidden capture

### Gate P3 to P4

- Avatar mode is opt-in
- Camera processing is local by default
- Gaze and affect estimates are conservative
- Child mode disables or restricts sensitive perception
- Privacy dashboard exists

## 12. Open questions

1. What is the exact Napoleon bridge API?
2. What governance workflow, if any, may change a user between adult owner, child protected, guest, and collaborator scopes?
3. What telemetry backend will be used locally and remotely?
4. What level of local LLM capability is required?
5. What avatar visual style best preserves trust without being manipulative?
6. What is the guardian approval workflow for child mode?
7. What hardware should be considered the recommended production target?
