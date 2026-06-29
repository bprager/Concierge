.PHONY: check eval eval-with-baseline eval-accept-baseline eval-human-review eval-summary evaluator-test bridge-harness bridge-evidence-capture bridge-evidence-compare napoleon-contract-alignment runtime-handoff-status goal-completion-audit goal-blocker-handoff goal-blocker-goal-prompt generate-bridge-operations bridge-operations-check eval-http eval-http-local-harness live-runtime-validation live-runtime-local-harness schema-check app-test app-smoke app-build tauri-check zip

NAPOLEON_CONTRACT_ALIGNMENT_OUT ?= /tmp/concierge-napoleon-alignment.json
GOAL_COMPLETION_RUNTIME_HANDOFF_STATUS ?= /tmp/concierge-runtime-handoff-status.json

check: eval evaluator-test bridge-harness bridge-evidence-capture bridge-evidence-compare bridge-operations-check schema-check app-test app-smoke app-build tauri-check

eval:
	uv run --with PyYAML --with requests --with jsonschema python evaluator/eval_runner.py --mode stub --out evaluator/reports/latest.json

eval-with-baseline:
	uv run --with PyYAML --with requests --with jsonschema python evaluator/eval_runner.py --mode stub --baseline evaluator/reports/accepted_baseline.json --out evaluator/reports/latest.json

eval-accept-baseline:
	uv run --with PyYAML --with requests --with jsonschema python scripts/accept_eval_baseline.py --source evaluator/reports/latest.json --out evaluator/reports/accepted_baseline.json

eval-human-review:
	uv run --with PyYAML python scripts/create_eval_human_review.py --report evaluator/reports/latest.json --baseline evaluator/reports/accepted_baseline.json --out evaluator/reports/human_review.md

eval-summary:
	uv run --with PyYAML python scripts/create_eval_summary.py --report evaluator/reports/latest.json --review evaluator/reports/human_review.md --out evaluator/reports/summary.md

evaluator-test:
	PYTHONPATH=evaluator uv run --with PyYAML python -m unittest discover -s evaluator/tests

bridge-harness:
	PYTHONPATH=evaluator uv run --with PyYAML python -m unittest evaluator.tests.test_local_bridge_harness

bridge-evidence-capture:
	PYTHONPATH=evaluator uv run --with PyYAML python -m unittest evaluator.tests.test_bridge_evidence_capture

bridge-evidence-compare:
	PYTHONPATH=evaluator uv run --with PyYAML python scripts/bridge_evidence_compare.py examples/sample_bridge_contract_evidence.json

napoleon-contract-alignment:
	uv run --with PyYAML python scripts/napoleon_contract_alignment.py --napoleon-openapi $$NAPOLEON_CONTRACT_OPENAPI --out $(NAPOLEON_CONTRACT_ALIGNMENT_OUT)

runtime-handoff-status:
	uv run python scripts/runtime_handoff_status.py --env .env --out /tmp/concierge-runtime-handoff-status.json $(if $(NAPOLEON_RUNTIME_HEALTH_JSON),--health-json $(NAPOLEON_RUNTIME_HEALTH_JSON),) $(if $(NAPOLEON_CONTRACT_ALIGNMENT_REPORT),--contract-alignment-report $(NAPOLEON_CONTRACT_ALIGNMENT_REPORT),)

goal-completion-audit:
	uv run python scripts/goal_completion_audit.py --out /tmp/concierge-goal-completion-audit.json --quiet $(if $(GOAL_COMPLETION_ALIGNMENT_REPORT),--contract-alignment-report $(GOAL_COMPLETION_ALIGNMENT_REPORT),) $(if $(wildcard $(GOAL_COMPLETION_RUNTIME_HANDOFF_STATUS)),--runtime-handoff-status $(GOAL_COMPLETION_RUNTIME_HANDOFF_STATUS),)

goal-blocker-handoff: goal-completion-audit
	uv run python scripts/create_goal_blocker_handoff.py --audit /tmp/concierge-goal-completion-audit.json --out /tmp/concierge-goal-blocker-handoff.md

goal-blocker-goal-prompt: goal-completion-audit
	uv run python scripts/create_goal_blocker_handoff.py --audit /tmp/concierge-goal-completion-audit.json --out /tmp/concierge-goal-blocker-goal-prompt.md --format goal-prompt

generate-bridge-operations:
	uv run --with PyYAML python scripts/generate_bridge_operations.py

bridge-operations-check:
	uv run --with PyYAML python scripts/generate_bridge_operations.py --check

eval-http:
	uv run --with PyYAML --with requests --with jsonschema python evaluator/eval_runner.py --mode http --endpoint $$NAPOLEON_EVAL_ENDPOINT --out evaluator/reports/latest.json

eval-http-local-harness:
	PYTHONPATH=evaluator uv run --with PyYAML --with requests --with jsonschema python scripts/eval_http_local_harness.py

live-runtime-validation:
	PYTHONPATH=evaluator uv run --with PyYAML --with requests --with jsonschema python scripts/live_runtime_validation.py

live-runtime-local-harness:
	PYTHONPATH=evaluator uv run --with PyYAML --with requests --with jsonschema python -m unittest evaluator.tests.test_live_runtime_validation

schema-check:
	uv run --with PyYAML --with jsonschema python scripts/validate_repo.py

app-test:
	cd app && npm test

app-smoke:
	cd app && npm run smoke:local-harness

app-build:
	cd app && npm run build

tauri-check:
	cd app/src-tauri && cargo check

zip:
	cd .. && zip -r concierge_initial_repo.zip concierge_initial_repo
