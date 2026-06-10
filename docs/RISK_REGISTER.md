# Risk Register

| Risk | Impact | Likelihood | Mitigation | Owner |
|---|---:|---:|---|---|
| Concierge becomes a monolith | High | Medium | Keep Napoleon bridge and governance boundary | Chief of Staff |
| Missing observability makes failures un-debuggable | High | Medium | Trace schema and required events from P0 | Engineering |
| Avatar feels manipulative | High | Medium | Stance policy, avatar constraints, user controls | Product |
| Child mode over-collects data | High | Medium | Minimal memory, guardian controls, camera off by default | Privacy |
| Camera affect misclassification | Medium | High | Treat as uncertain signal, do not store as fact | Perception |
| Voice mode captures without user awareness | High | Low | Visible mic state and explicit permission | Front-end |
| Self-evolution weakens safety | High | Medium | Evolution proposals, approvals, evaluator gates | Napoleon |
| Tauri packaging complexity | Medium | Medium | Start with skeleton, add native modules gradually | Engineering |
| Local model performance insufficient | Medium | Medium | Model adapters and remote fallback | Engineering |
| Telemetry leaks sensitive content | High | Medium | Redaction, local buffer, user settings | Observability |
| Capability intelligence optimizes engagement instead of user value | High | Medium | Rank by user value, safety, privacy, and strategic fit; penalize engagement-only signals | Product |
| Capability gap tracking stores raw or sensitive conversations | High | Medium | Store derived metadata and redacted summaries by default; require visible retention and deletion controls | Privacy |
| Capability recommendations bypass governance | High | Low | Keep recommendations proposal-only and require Napoleon evolution approval before behavior changes | Napoleon |
| Frequent low-risk requests hide rare high-impact missing capabilities | Medium | Medium | Include severity, safety risk, and strategic fit in ranking, not frequency alone | Chief of Staff |
