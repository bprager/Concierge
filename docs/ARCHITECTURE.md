# Architecture

## 1. Recommended architecture

Concierge is a local desktop front-end plus a governed Napoleon bridge.

The front-end owns interaction capture and presentation. Napoleon owns orchestration, governance, memory, and agent delegation.

## 2. System diagram

```plantuml
@startuml
scale max 600 width

actor "Human User" as User

rectangle "Concierge Desktop App" {
  component "Text UI" as TextUI
  component "Voice UI" as VoiceUI
  component "Avatar UI" as AvatarUI
  component "Settings and Consent UI" as Consent
  component "Local Telemetry Buffer" as Buffer
}

rectangle "Local Perception Services" {
  component "Voice Activity Detection" as VAD
  component "Speech to Text" as STT
  component "Text to Speech" as TTS
  component "Face and Head Pose" as Face
  component "Gaze Simulation" as Gaze
  component "User State Fusion" as Fusion
}

rectangle "Concierge Runtime" {
  component "Identity Resolver" as Identity
  component "Dialogue State" as Dialogue
  component "Interaction Stance Controller" as Stance
  component "Governance UX" as GovUX
  component "Napoleon Bridge" as Bridge
}

rectangle "Napoleon Core" {
  component "Chief of Staff" as CoS
  component "Governance Gate" as Gov
  component "Policy Engine" as Policy
  component "Memory Graph" as Memory
  component "Task Router" as Router
  component "Agent Registry" as Registry
  component "Evaluation Logger" as Eval
  component "Evolution Controller" as Evolution
}

User --> TextUI
User --> VoiceUI
User --> AvatarUI

VoiceUI --> VAD
VAD --> STT
STT --> Dialogue
Dialogue --> TTS
TTS --> VoiceUI

AvatarUI --> Face
Face --> Gaze
Gaze --> Fusion
Fusion --> Stance

TextUI --> Dialogue
Dialogue --> Identity
Identity --> Stance
Stance --> GovUX
GovUX --> Bridge
Bridge --> Gov
Gov --> Policy
Policy --> Router
Router --> Registry
Router --> Memory
CoS --> Gov
Bridge --> Eval
Eval --> Evolution
Evolution --> CoS

Buffer <-- TextUI
Buffer <-- VoiceUI
Buffer <-- AvatarUI
Buffer <-- Bridge
Buffer <-- Stance

@enduml
```

## 3. Evaluator cycle

```plantuml
@startuml
scale max 600 width

start
:Load evaluator scenarios;
:Submit design prompt to Napoleon;
:Collect Napoleon response and artifacts;
:Score rubric dimensions;
:Detect hard fails;
:Generate report;
if (Hard fail?) then (yes)
  :Block promotion;
else (no)
  :Compare to previous run;
  if (Regression?) then (yes)
    :Create improvement issue;
  else (no)
    :Mark candidate stable;
  endif
endif
:Propose evolution changes if needed;
stop

@enduml
```

## 4. Runtime turn sequence

```plantuml
@startuml
scale max 600 width

actor User
participant "Concierge UI" as UI
participant "Dialogue State" as D
participant "Stance Controller" as S
participant "Governance UX" as GUX
participant "Napoleon Bridge" as NB
participant "Napoleon Governance" as NG
participant "Task Router" as TR
participant "Telemetry" as OTEL

User -> UI: message or speech
UI -> OTEL: user_message_received
UI -> D: normalize input
D -> OTEL: intent_detected
D -> S: request stance
S -> OTEL: stance_selected
D -> GUX: action candidate
GUX -> NG: governance check
NG -> OTEL: governance_decision
NG -> TR: route if allowed
TR -> NB: response payload
NB -> UI: response
UI -> OTEL: response_generated
UI -> User: text, voice, or avatar response

@enduml
```

### Rehearsal Mode sequence

Rehearsal Mode is a local preview step before a live Napoleon bridge call. It builds the same text turn contract shape used by the bridge, then displays the understood request, proposed Napoleon path, Chief of Staff review packet, allowed effects, blocked effects, approval state, memory proposal, trace/audit preview, and evaluator-case candidate. It does not contact Napoleon, capture approval, write memory, send externally, dispatch agents, or execute commands.

```plantuml
@startuml
scale max 600 width

actor User
participant "Concierge UI" as UI
participant "Contract Adapter" as CA
participant "Telemetry" as OTEL

User -> UI: typed request
UI -> CA: build text turn contract
CA -> UI: rehearsal preview
UI -> OTEL: rehearsal_preview_created
UI -> User: preview blocked and allowed effects
User -> UI: send advisory request
UI -> "Napoleon Bridge": governed request

@enduml
```

## 5. Observability pipeline

```plantuml
@startuml
scale max 600 width

rectangle "Concierge App" {
  component "Trace Emitter"
  component "Metric Emitter"
  component "Structured Logger"
  component "Redaction Layer"
  component "Local Buffer"
}

rectangle "Telemetry Destinations" {
  component "Local JSONL Files"
  component "OTLP Collector"
  component "Evaluator Reports"
  component "Dashboard"
}

"Trace Emitter" --> "Redaction Layer"
"Metric Emitter" --> "Redaction Layer"
"Structured Logger" --> "Redaction Layer"
"Redaction Layer" --> "Local Buffer"
"Local Buffer" --> "Local JSONL Files"
"Local Buffer" --> "OTLP Collector"
"Local Buffer" --> "Evaluator Reports"
"OTLP Collector" --> "Dashboard"

@enduml
```

## 6. Component responsibilities

### Concierge Desktop App

- Owns UI, capture permissions, local rendering, and user controls.
- Does not own Napoleon authority.
- Does not silently retain raw camera or microphone data.

### Local Perception Services

- Convert raw local signals into conservative derived signals.
- Emit uncertainty and evidence.
- Avoid durable emotional labels.

### Concierge Runtime

- Maintains dialogue state.
- Resolves user profile.
- Chooses interaction stance.
- Asks for confirmation when governance requires it.
- Sends governed requests to Napoleon.

### Napoleon Core

- Owns governance, policy, memory, routing, agent registry, Chief of Staff review, and evolution approval.

## 7. Deployment shape

Initial target:

```text
Concierge.app
  app UI
  local settings
  telemetry buffer

local services
  perception service
  voice service
  avatar service

Napoleon bridge
  local or remote API endpoint
  authenticated
  trace-aware
```

## 8. Security boundaries

1. Camera and microphone are owned by local front-end.
2. Raw capture remains local unless user explicitly records or streams.
3. Napoleon receives derived signals, transcripts, and user-approved context.
4. External actions go through Napoleon governance.
5. Child mode is stricter than adult mode.
