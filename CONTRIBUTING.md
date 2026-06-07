# Contributing

This repo starts as a product and architecture scaffold.

Before code is merged, it should have:

1. A linked backlog item
2. Acceptance criteria
3. Observability events or a clear reason none are needed
4. Updated evaluator cases when behavior changes
5. Privacy review when camera, mic, memory, or child profiles are involved

## Definition of done

A change is done when:

- It passes relevant evaluator scenarios
- It emits required telemetry
- It respects the agent contract
- It documents safety, privacy, and rollback behavior
