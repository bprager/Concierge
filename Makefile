.PHONY: check eval eval-with-baseline eval-accept-baseline eval-human-review eval-summary evaluator-test bridge-harness bridge-evidence-capture bridge-evidence-compare generate-bridge-operations eval-http eval-http-local-harness live-runtime-validation live-runtime-local-harness schema-check app-test app-smoke app-build tauri-check zip

check: eval evaluator-test bridge-harness bridge-evidence-capture bridge-evidence-compare schema-check app-test app-smoke app-build tauri-check

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

generate-bridge-operations:
	uv run --with PyYAML python scripts/generate_bridge_operations.py

eval-http:
	uv run --with PyYAML --with requests --with jsonschema python evaluator/eval_runner.py --mode http --endpoint $$NAPOLEON_EVAL_ENDPOINT --out evaluator/reports/latest.json

eval-http-local-harness:
	PYTHONPATH=evaluator uv run --with PyYAML --with requests --with jsonschema python scripts/eval_http_local_harness.py

live-runtime-validation:
	PYTHONPATH=evaluator uv run --with PyYAML --with requests --with jsonschema python scripts/live_runtime_validation.py --bridge-endpoint $$NAPOLEON_BRIDGE_ENDPOINT --eval-endpoint $$NAPOLEON_EVAL_ENDPOINT

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
