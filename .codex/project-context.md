# Project Context

Last updated: 2026-06-07

This is stable context for future AI sessions. Do not put transient status updates here.

## What The Project Does

Concierge is Napoleon's adaptive human interface. It begins as a periodic evaluator and text desktop interface, then grows into voice, avatar, local perception, and controlled self-evolution. The core purpose is to make Napoleon easier to use while preserving safety, agency, privacy, observability, and governance.

## Target Users

- The adult owner using Napoleon through a lower-friction desktop interface.
- Child protected users who need simple, bounded, guardian-aware help.
- Guests or collaborators with scoped access and minimal memory.
- Future AI coding agents that need reliable project state without relying on previous chat context.

## Core Capabilities

- Deterministic evaluator scaffold for testing Napoleon and Chief of Staff agent design capability.
- Product, architecture, governance, observability, stance, risk, roadmap, and self-evolution docs.
- Tauri + React desktop app skeleton for the text Concierge path.
- OpenAPI bridge contract for governed Napoleon access.
- JSON schemas for agent contracts, evaluator runs, evolution proposals, interaction traces, stance decisions, and user profiles.
- Perception service placeholder with contracts for future local voice/camera-derived signals.
- GitHub issue templates and evaluator workflow scaffold.

## Important Constraints

- Concierge must not bypass Napoleon governance.
- Concierge starts read-only and advisory; side effects require explicit confirmation through governance.
- Camera and microphone are off by default and must have visible, explicit permission flows.
- Raw audio and video are not stored by default.
- Derived perception signals must be conservative and uncertain, not durable emotional facts.
- Child protected mode has stricter authority, memory, camera, microphone, and guardian-approval rules.
- Self-evolution must remain proposal-only until evaluator gates, approval, rollout, and rollback are implemented.

## Key Architecture Assumptions

- Napoleon remains the authority, memory, governance, and task-routing system.
- Concierge owns local interaction capture, presentation, consent, settings, and local telemetry buffering.
- The Napoleon bridge is the only normal path from Concierge to Napoleon behavior.
- Observability is a product requirement, not an afterthought.
- The evaluator is the first milestone because it turns vague agent quality into a measurable gate.

## Current Maturity Level

The project is an initial scaffold with substantial planning artifacts and starter implementation surfaces. It is not yet a production Concierge. The evaluator has a local stub mode, the app shell exists, contracts and docs exist, and most runtime behavior remains planned.

## What Done Means

A change is done when it preserves the Napoleon governance boundary, keeps privacy and child-mode assumptions intact, updates affected docs/contracts/evaluator cases, runs relevant checks, and leaves future sessions with enough context to verify or continue the work.
