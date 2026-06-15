# Evaluator

The evaluator tests Napoleon and Chief of Staff on complex agent development capability.

Primary case: Concierge.

## Run locally

```bash
make eval
```

Run evaluator unit tests:

```bash
make evaluator-test
```

Accept the current clean local report as the regression baseline:

```bash
make eval-accept-baseline
```

Compare a local run against the accepted baseline:

```bash
make eval-with-baseline
```

## Run against Napoleon

```bash
export NAPOLEON_EVAL_ENDPOINT="https://example.test/evaluate"
python evaluator/eval_runner.py --mode http --endpoint "$NAPOLEON_EVAL_ENDPOINT" --out evaluator/reports/latest.json
```

Expected endpoint contract:

```json
{
  "case_id": "DESIGN-001",
  "prompt": "..."
}
```

Expected response:

```json
{
  "text": "Napoleon response text..."
}
```

## Scoring

The first version uses deterministic artifact and keyword checks. It should later support:

- LLM-as-judge with fixed judge prompt
- Human review
- Golden artifact comparison

Current scenario coverage includes broad Concierge design, critique, policy, observability, evolution, avatar safety, Rehearsal Mode coverage for adult, child protected, guest/collaborator, and adversarial preview paths, plus governance review UI coverage for local acknowledgement and no-go behavior. Regression tracking can compare against `evaluator/reports/accepted_baseline.json`; accepting that baseline is local evaluator evidence only, not Napoleon approval or release approval.
