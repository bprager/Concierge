.PHONY: eval eval-http zip

eval:
	python evaluator/eval_runner.py --mode stub --out evaluator/reports/latest.json

eval-http:
	python evaluator/eval_runner.py --mode http --endpoint $$NAPOLEON_EVAL_ENDPOINT --out evaluator/reports/latest.json

zip:
	cd .. && zip -r concierge_initial_repo.zip concierge_initial_repo
