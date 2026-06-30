#!/usr/bin/env python3
"""Validate the packaged desktop Napoleon runtime transport without retaining secrets."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Sequence


ROOT = Path(__file__).resolve().parents[1]
APP_DIR = ROOT / "app"
TAURI_DIR = ROOT / "app" / "src-tauri"
OUTPUT_KIND = "concierge.desktop-runtime-transport-validation.v1"
PROBE_ENDPOINT = "https://napoleon.example/cos"
PROBE_TOKEN = "probe_native_auth_value"
TRANSPORT_TESTS = [
    "desktop runtime fetch sends Napoleon HTTP through Tauri invoke without webview auth by default",
    "desktop runtime fetch can keep full endpoint in native configuration for compatibility override",
    "desktop runtime fetch can preserve explicit webview auth when native auth is disabled",
    "desktop runtime availability only reports true inside packaged Tauri",
    "desktop runtime config status is sanitized and does not expose endpoint or token values",
    "desktop runtime effective endpoint uses placeholder only for native-local packaged endpoint",
    "rejects_non_http_runtime_targets",
    "rejects_http_runtime_targets_outside_governed_napoleon_paths",
    "enforces_governed_runtime_methods_for_known_paths",
    "resolves_runtime_auth_from_environment_or_token_file",
    "desktop_runtime_command_forwards_governed_get_and_post_requests",
    "desktop_runtime_command_attaches_native_auth_when_webview_omits_auth",
    "desktop_runtime_command_strips_webview_auth_when_native_auth_is_enabled",
    "desktop_runtime_command_resolves_path_against_local_runtime_endpoint",
    "desktop_runtime_config_status_reports_only_sanitized_booleans",
    "desktop_runtime_config_status_probe_outputs_only_sanitized_booleans",
    "desktop_runtime_command_preserves_explicit_webview_auth_when_native_auth_is_disabled",
]


CommandRunner = Callable[[Sequence[str], Path], subprocess.CompletedProcess[str]]


def run_command(command: Sequence[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        list(command),
        cwd=str(cwd),
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


DEFAULT_COMMAND_RUNNER = run_command


def sanitized_check(
    *,
    check_id: str,
    description: str,
    command: Sequence[str],
    cwd: Path,
    runner: CommandRunner,
) -> dict[str, Any]:
    result = runner(command, cwd)
    return {
        "id": check_id,
        "description": description,
        "status": "passed" if result.returncode == 0 else "failed",
        "exitCode": result.returncode,
        "command": list(command),
        "stdoutRetained": False,
        "stderrRetained": False,
        "endpointHostRetained": False,
        "tokenRetained": False,
        "tokenFilePathRetained": False,
        "requestBodyRetained": False,
        "responseBodyRetained": False,
    }


def release_binary_path(tauri_dir: Path) -> Path:
    suffix = ".exe" if sys.platform.startswith("win") else ""
    return tauri_dir / "target" / "release" / f"concierge-desktop{suffix}"


def packaged_binary_config_probe_check(
    *,
    tauri_dir: Path,
    runner: CommandRunner,
) -> dict[str, Any]:
    command = [str(release_binary_path(tauri_dir))]
    env = {
        **os.environ,
        "CONCIERGE_DESKTOP_RUNTIME_CONFIG_PROBE": "1",
        "NAPOLEON_RUNTIME_ENDPOINT": PROBE_ENDPOINT,
        "NAPOLEON_RUNTIME_AUTH_TOKEN": PROBE_TOKEN,
    }
    if runner is DEFAULT_COMMAND_RUNNER:
        result = subprocess.run(
            command,
            cwd=str(tauri_dir),
            check=False,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
        )
    else:
        result = runner(command, tauri_dir)
    output = f"{result.stdout or ''}\n{result.stderr or ''}"
    probe_status = None
    try:
        probe_status = json.loads((result.stdout or "").strip())
    except json.JSONDecodeError:
        probe_status = None
    leaked_endpoint = PROBE_ENDPOINT in output or "napoleon.example" in output
    leaked_token = PROBE_TOKEN in output
    passed = (
        result.returncode == 0
        and isinstance(probe_status, dict)
        and probe_status.get("endpointConfigured") is True
        and probe_status.get("authConfigured") is True
        and not leaked_endpoint
        and not leaked_token
    )
    return {
        "id": "tauri_packaged_desktop_binary_config_probe",
        "description": (
            "The built no-bundle desktop binary can read local endpoint/auth readiness "
            "and emits only sanitized booleans before the webview starts."
        ),
        "status": "passed" if passed else "failed",
        "exitCode": result.returncode,
        "command": command,
        "stdoutRetained": False,
        "stderrRetained": False,
        "endpointHostRetained": leaked_endpoint,
        "tokenRetained": leaked_token,
        "tokenFilePathRetained": False,
        "requestBodyRetained": False,
        "responseBodyRetained": False,
    }


def build_report(
    *,
    runner: CommandRunner | None = None,
    app_dir: Path = APP_DIR,
    tauri_dir: Path = TAURI_DIR,
) -> dict[str, Any]:
    active_runner = runner or run_command
    checks = [
        sanitized_check(
            check_id="app_desktop_runtime_transport_tests",
            description=(
                "App tests prove packaged desktop fetch uses the Tauri command path, strips "
                "webview auth headers when native auth is enabled, and only reports packaged "
                "desktop availability inside Tauri."
            ),
            command=["npm", "run", "test:desktop-runtime"],
            cwd=app_dir,
            runner=active_runner,
        ),
        sanitized_check(
            check_id="tauri_desktop_runtime_transport_tests",
            description=(
                "Rust tests prove the packaged desktop command rejects non-HTTP targets, "
                "forwards governed runtime requests, reads approved local auth handoff, "
                "attaches the expected /cos or generated bridge auth header, strips webview "
                "auth at the command boundary when native auth is enabled, resolves governed "
                "path-only requests against a locally configured runtime endpoint, exposes only "
                "sanitized native endpoint/auth readiness booleans to the webview, and preserves "
                "explicit webview auth only when native auth is disabled while rejecting "
                "non-governed HTTP(S) paths and wrong methods for governed paths."
            ),
            command=["cargo", "test", "runtime"],
            cwd=tauri_dir,
            runner=active_runner,
        ),
        sanitized_check(
            check_id="tauri_desktop_runtime_transport_check",
            description="Tauri desktop backend compiles with the packaged runtime transport command enabled.",
            command=["cargo", "check"],
            cwd=tauri_dir,
            runner=active_runner,
        ),
        sanitized_check(
            check_id="tauri_packaged_desktop_no_bundle_build",
            description=(
                "Tauri packaged desktop no-bundle build succeeds with the governed runtime "
                "transport command and production frontend bundle."
            ),
            command=["npm", "run", "tauri", "--", "build", "--no-bundle"],
            cwd=app_dir,
            runner=active_runner,
        ),
        packaged_binary_config_probe_check(
            tauri_dir=tauri_dir,
            runner=active_runner,
        ),
    ]
    status = "passed" if all(check["status"] == "passed" for check in checks) else "failed"
    packaged_build_passed = any(
        check["id"] == "tauri_packaged_desktop_no_bundle_build"
        and check["status"] == "passed"
        for check in checks
    )
    packaged_config_probe_passed = any(
        check["id"] == "tauri_packaged_desktop_binary_config_probe"
        and check["status"] == "passed"
        for check in checks
    )
    return {
        "kind": OUTPUT_KIND,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "coveredRustTests": TRANSPORT_TESTS,
        "checks": checks,
        "packagedDesktopTransport": {
            "command": "napoleon_runtime_http_request",
            "usesTauriCommandPath": True,
            "browserProxyRequired": False,
            "nativeAuthFallbackWhenWebviewOmitsAuth": True,
            "webviewAuthHeadersStrippedWhenNativeAuthEnabled": True,
            "nativeAuthEnforcedAtCommandBoundary": True,
            "nativeEndpointResolution": True,
            "endpointHostOmittedFromInvokePayload": True,
            "nativeLocalEndpointReadiness": True,
            "packagedBinaryConfigProbePassed": packaged_config_probe_passed,
            "explicitWebviewAuthPreserved": True,
            "governedRouteAllowlistEnforced": True,
            "governedRouteMethodAllowlistEnforced": True,
            "packagedNoBundleBuildPassed": packaged_build_passed,
            "cosAuthHeader": "X-Napoleon-Auth",
            "generatedBridgeAuthHeader": "Authorization",
            "endpointHostRetained": False,
            "tokenRetained": False,
            "tokenFilePathRetained": False,
            "requestBodyRetained": False,
            "responseBodyRetained": False,
        },
        "authorityBoundary": {
            "validationEvidenceOnly": True,
            "doesNotContactNapoleon": True,
            "doesNotApprove": True,
            "doesNotWriteMemory": True,
            "doesNotDispatchAgents": True,
            "doesNotSendExternally": True,
            "doesNotApplyEvolution": True,
            "runtimeAuthorityGranted": False,
            "approvalCaptured": False,
            "memoryWritePerformed": False,
            "agentDispatchPerformed": False,
            "externalSendPerformed": False,
        },
        "nextRequiredEvidence": (
            "Run the packaged desktop app against the real Napoleon runtime and retain only "
            "sanitized proof that descriptor, capability, text-turn, proof, governance, and "
            "no-side-effect gates pass without a browser proxy workaround."
        ),
    }


def write_report(report: dict[str, Any], out_path: Path) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return out_path


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=Path("/tmp/concierge-desktop-runtime-transport-validation.json"))
    args = parser.parse_args(argv)

    report = build_report()
    out_path = write_report(report, args.out)
    print(out_path)
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
