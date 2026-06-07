# Roadmap

## P0: Evaluator foundation

Target outcome:

- Weekly evaluator run exists
- Napoleon design capability is measurable
- Concierge case is the primary benchmark

Exit gate:

- Evaluator has scenarios, rubric, hard fails, reports, and CI schedule

## P1: Text Concierge MVP

Target outcome:

- User can type to Concierge
- Concierge routes through Napoleon
- Stance, identity, and governance are visible
- Telemetry is complete

Exit gate:

- No evaluator hard fails
- Adult and child baseline tests pass
- Every turn has trace ID

## P2: Voice Concierge

Target outcome:

- User can speak and hear responses
- Voice has VAD, STT, TTS, barge-in
- Voice responses are concise and traceable

Exit gate:

- Voice latency meets initial target
- Mic privacy controls pass review
- Voice traces are complete

## P3: Avatar Concierge

Target outcome:

- Avatar presents stance through expression, voice, gaze, and posture
- Camera input is optional, local, and conservative
- User can control privacy and presence

Exit gate:

- Camera opt-in and visible state complete
- Avatar does not bypass governance
- Child avatar constraints pass

## P4: Controlled self-evolution

Target outcome:

- Concierge proposes improvements based on evidence
- Napoleon evaluates changes before rollout
- Regressions are caught

Exit gate:

- Evolution proposal workflow exists
- Rollback tested
- Evaluator regression suite blocks unsafe changes
