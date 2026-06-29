#!/usr/bin/env python3
"""Create a sanitized local Napoleon runtime handoff status artifact."""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


EXPECTED_ALIGNMENT_KIND = "concierge.napoleon-contract-alignment.v1"
OUTPUT_KIND = "concierge.runtime-handoff-status.v1"


def _read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def _read_json(path: Path | None) -> dict[str, Any] | None:
    if path is None:
        return None
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def _bool(value: Any) -> bool | None:
    return value if isinstance(value, bool) else None


def _string(value: Any) -> str | None:
    return value if isinstance(value, str) and value else None


def _false_required(record: dict[str, Any], key: str) -> None:
    if record.get(key) is not False:
        raise ValueError(f"alignment report {key} must be false")


def _sanitize_required_action(action: Any) -> dict[str, Any] | None:
    if not isinstance(action, dict):
        return None
    sanitized: dict[str, Any] = {}
    for key in ("id", "owner", "path", "requestKind", "operationId", "reason"):
        value = _string(action.get(key))
        if value:
            sanitized[key] = value
    return sanitized if sanitized else None


def _sanitize_alignment(report: dict[str, Any] | None) -> dict[str, Any]:
    if report is None:
        return {
            "provided": False,
            "kind": None,
            "alignmentStatus": None,
            "runtimeAligned": None,
            "blockingLivePromotion": None,
            "napoleonRequiredActionCount": 0,
            "napoleonRequiredActions": [],
        }
    if report.get("kind") != EXPECTED_ALIGNMENT_KIND:
        raise ValueError(f"alignment report kind must be {EXPECTED_ALIGNMENT_KIND}")
    for key in (
        "approvalCaptured",
        "memoryWritePerformed",
        "agentDispatchPerformed",
        "externalSendPerformed",
        "sideEffectsPerformed",
    ):
        _false_required(report, key)
    actions = [
        sanitized
        for sanitized in (_sanitize_required_action(action) for action in report.get("napoleonRequiredActions", []))
        if sanitized is not None
    ]
    return {
        "provided": True,
        "kind": EXPECTED_ALIGNMENT_KIND,
        "alignmentStatus": _string(report.get("alignmentStatus")),
        "runtimeAligned": _bool(report.get("runtimeAligned")),
        "blockingLivePromotion": _bool(report.get("blockingLivePromotion")),
        "napoleonRequiredActionCount": len(actions),
        "napoleonRequiredActions": actions,
    }


def _sanitize_health(report: dict[str, Any] | None) -> dict[str, Any]:
    if report is None:
        return {
            "provided": False,
            "status": None,
            "serviceId": None,
            "runtimeOwner": None,
            "safeToCall": None,
            "memoryWrite": None,
            "externalSend": None,
            "agentDispatch": None,
            "approvalCaptured": None,
            "runtimeAuthority": None,
        }
    return {
        "provided": True,
        "status": _string(report.get("status")),
        "serviceId": _string(report.get("service_id")),
        "runtimeOwner": _string(report.get("runtime_owner")),
        "safeToCall": _bool(report.get("safe_to_call")),
        "memoryWrite": _bool(report.get("memory_write")),
        "externalSend": _bool(report.get("external_send")),
        "agentDispatch": _bool(report.get("agent_dispatch")),
        "approvalCaptured": _bool(report.get("approval_captured")),
        "runtimeAuthority": _bool(report.get("runtime_authority")),
    }


def _token_file_readable(token_file: str | None) -> bool:
    if not token_file:
        return False
    path = Path(token_file)
    return path.is_file() and os.access(path, os.R_OK)


def build_report(
    *,
    env_path: Path = Path(".env"),
    health_json_path: Path | None = None,
    alignment_report_path: Path | None = None,
) -> dict[str, Any]:
    env = _read_env(env_path)
    token_file = env.get("NAPOLEON_RUNTIME_AUTH_TOKEN_FILE") or env.get("NAPOLEON_EVAL_TOKEN_FILE")
    health = _read_json(health_json_path)
    alignment = _read_json(alignment_report_path)
    return {
        "kind": OUTPUT_KIND,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "connection": {
            "bridgeEndpointConfigured": bool(env.get("NAPOLEON_BRIDGE_ENDPOINT")),
            "evalEndpointConfigured": bool(env.get("NAPOLEON_EVAL_ENDPOINT")),
            "endpointHostRetained": False,
        },
        "authProvisioning": {
            "tokenConfigured": bool(env.get("NAPOLEON_EVAL_TOKEN") or env.get("NAPOLEON_RUNTIME_AUTH_TOKEN")),
            "tokenFileConfigured": bool(token_file),
            "tokenFileReadable": _token_file_readable(token_file),
            "tokenRetained": False,
            "tokenFilePathRetained": False,
        },
        "health": _sanitize_health(health),
        "contractAlignment": _sanitize_alignment(alignment),
        "boundary": {
            "localHandoffEvidenceOnly": True,
            "doesNotContactNapoleon": True,
            "doesNotApprove": True,
            "doesNotWriteMemory": True,
            "doesNotDispatchAgents": True,
            "doesNotSendExternally": True,
            "doesNotApplyEvolution": True,
            "endpointHostRetained": False,
            "tokenRetained": False,
            "tokenFilePathRetained": False,
            "requestBodyRetained": False,
            "responseBodyRetained": False,
        },
    }


def write_report(report: dict[str, Any], out_path: Path) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return out_path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env", type=Path, default=Path(".env"))
    parser.add_argument("--health-json", type=Path)
    parser.add_argument("--contract-alignment-report", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    out_path = write_report(
        build_report(
            env_path=args.env,
            health_json_path=args.health_json,
            alignment_report_path=args.contract_alignment_report,
        ),
        args.out,
    )
    print(out_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
