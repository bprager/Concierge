# ADR-0002: Local-first perception

## Status

Proposed.

## Context

Avatar mode uses camera and microphone input. This is sensitive, especially for child profiles.

## Decision

Run camera and voice perception locally by default. Send Napoleon derived signals, transcripts, and user-approved context rather than raw video or audio.

## Consequences

Positive:

- Better privacy posture
- Lower trust risk
- Works offline for perception
- Easier child safety controls

Tradeoffs:

- More local compute required
- Cross-platform packaging complexity
- Need clear model update strategy
