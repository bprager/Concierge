#!/usr/bin/env python3
"""Compare Concierge's local bridge contract with Napoleon integration docs."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONCIERGE_OPENAPI = ROOT / "api/napoleon_bridge.openapi.yaml"


def load_yaml(path: Path) -> dict[str, Any]:
    value = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"YAML document must be an object: {path}")
    return value


def operation_paths(openapi: dict[str, Any]) -> list[str]:
    paths = openapi.get("paths")
    if not isinstance(paths, dict):
        return []
    return sorted(path for path in paths if isinstance(path, str))


def build_alignment_report(concierge_openapi: Path, napoleon_openapi: Path) -> dict[str, Any]:
    concierge = load_yaml(concierge_openapi)
    napoleon = load_yaml(napoleon_openapi)
    concierge_paths = operation_paths(concierge)
    napoleon_paths = operation_paths(napoleon)
    concierge_set = set(concierge_paths)
    napoleon_set = set(napoleon_paths)
    napoleon_only = sorted(napoleon_set - concierge_set)
    concierge_only = sorted(concierge_set - napoleon_set)

    return {
        "aligned": not napoleon_only and not concierge_only,
        "conciergeContract": str(concierge_openapi),
        "napoleonContract": str(napoleon_openapi),
        "conciergePaths": concierge_paths,
        "napoleonPaths": napoleon_paths,
        "napoleonOnlyPaths": napoleon_only,
        "conciergeOnlyPaths": concierge_only,
        "napoleonRuntimeAuthority": napoleon.get("x-napoleon-runtime-authority"),
        "nonAuthorityBoundary": "alignment_check_only",
        "sideEffectsPerformed": False,
        "approvalCaptured": False,
        "memoryWritePerformed": False,
        "agentDispatchPerformed": False,
        "externalSendPerformed": False,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--concierge-openapi",
        type=Path,
        default=DEFAULT_CONCIERGE_OPENAPI,
        help="Path to Concierge's local bridge OpenAPI contract.",
    )
    parser.add_argument(
        "--napoleon-openapi",
        type=Path,
        required=True,
        help="Path to Napoleon's Concierge integration OpenAPI contract.",
    )
    parser.add_argument("--strict", action="store_true", help="Exit non-zero when paths are not aligned.")
    args = parser.parse_args(argv)

    report = build_alignment_report(args.concierge_openapi, args.napoleon_openapi)
    print(json.dumps(report, indent=2, sort_keys=True))
    if args.strict and not report["aligned"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
