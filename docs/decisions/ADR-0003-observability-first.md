# ADR-0003: Observability from P0

## Status

Accepted.

## Context

Agentic systems fail in subtle ways: bad routing, wrong authority, poor stance, missing context, and unsafe autonomy. These failures cannot be fixed reliably without traces.

## Decision

Require observability from the evaluator and MVP text phase onward.

## Consequences

Positive:

- Easier debugging
- Safer rollout
- Better evaluator and regression tracking
- Supports controlled self-evolution

Tradeoffs:

- More upfront design work
- Requires privacy-conscious redaction
