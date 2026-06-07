# ADR-0001: Use Tauri as the primary desktop shell

## Status

Proposed.

## Context

Concierge should run primarily on MacBook, with optional Linux and Windows support later. It needs native permission handling, local services, a web-based avatar renderer, and a secure bridge to Napoleon.

## Decision

Use Tauri for the first cross-platform shell.

## Consequences

Positive:

- Mac-first but not Mac-only
- Smaller footprint than Electron
- Rust backend suitable for secure local bridge
- Web frontend can use three.js and VRM

Tradeoffs:

- More integration work than Electron
- Native ML modules may require sidecars or platform-specific bindings
- Team needs Rust and frontend skills
