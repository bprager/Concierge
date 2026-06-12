.PHONY: check eval evaluator-test bridge-harness bridge-evidence-capture bridge-evidence-compare eval-http schema-check app-test app-smoke app-build tauri-check zip

check: eval evaluator-test bridge-harness bridge-evidence-capture bridge-evidence-compare schema-check app-test app-smoke app-build tauri-check

eval:
	uv run --with PyYAML --with requests --with jsonschema python evaluator/eval_runner.py --mode stub --out evaluator/reports/latest.json

evaluator-test:
	PYTHONPATH=evaluator uv run --with PyYAML python -m unittest discover -s evaluator/tests

bridge-harness:
	PYTHONPATH=evaluator uv run --with PyYAML python -m unittest evaluator.tests.test_local_bridge_harness

bridge-evidence-capture:
	PYTHONPATH=evaluator uv run --with PyYAML python -m unittest evaluator.tests.test_bridge_evidence_capture

bridge-evidence-compare:
	PYTHONPATH=evaluator uv run --with PyYAML python scripts/bridge_evidence_compare.py examples/sample_bridge_contract_evidence.json

eval-http:
	uv run --with PyYAML --with requests --with jsonschema python evaluator/eval_runner.py --mode http --endpoint $$NAPOLEON_EVAL_ENDPOINT --out evaluator/reports/latest.json

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
