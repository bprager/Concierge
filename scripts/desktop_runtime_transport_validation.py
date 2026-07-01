#!/usr/bin/env python3
"""Validate the packaged desktop Napoleon runtime transport without retaining secrets."""

from __future__ import annotations

import argparse
import contextlib
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from threading import Thread
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
    "desktop_runtime_transport_probe_outputs_only_sanitized_booleans",
    "desktop_runtime_transport_probe_uses_native_endpoint_and_auth",
    "desktop_runtime_live_probe_outputs_only_sanitized_booleans",
    "desktop_runtime_live_probe_uses_governed_native_sequence",
    "desktop_runtime_live_probe_uses_generated_governed_sequence",
    "desktop_runtime_command_preserves_explicit_webview_auth_when_native_auth_is_disabled",
]


CommandRunner = Callable[[Sequence[str], Path], subprocess.CompletedProcess[str]]
LIVE_PROBE_ROUTE_FAMILIES = {"cos", "generated", "unknown"}
LIVE_PROBE_FAILURE_STAGES = {"none", "not_run", "descriptor", "capabilities", "text_turn", "trace"}
LIVE_PROBE_FAILURE_KINDS = {
    "none",
    "not_run",
    "request_failed",
    "http_not_ok",
    "missing_trace_id",
    "missing_generated_proof",
    "invalid_json",
    "unknown",
}


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


def sanitized_label(value: Any, allowed: set[str], default: str) -> str:
    return value if isinstance(value, str) and value in allowed else default


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


@contextlib.contextmanager
def local_runtime_probe_server():
    records: list[dict[str, str]] = []

    class ProbeHandler(BaseHTTPRequestHandler):
        def log_message(self, format: str, *args: object) -> None:
            return

        def do_GET(self) -> None:
            records.append(
                {
                    "method": "GET",
                    "path": self.path,
                    "xNapoleonAuth": self.headers.get("X-Napoleon-Auth", ""),
                    "authorization": self.headers.get("Authorization", ""),
                }
            )
            if self.path != "/cos/capabilities":
                self.send_response(404)
                self.end_headers()
                return
            body = b'{"capabilities":[],"runtimeAuthority":false}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    server = HTTPServer(("127.0.0.1", 0), ProbeHandler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}", records
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()


@contextlib.contextmanager
def local_live_probe_server(route_family: str):
    records: list[dict[str, str]] = []

    generated_responses = {
        ("GET", "/v1/concierge/chief-of-staff/descriptor"): b'{"descriptor":{"runtimeAuthority":false}}',
        ("GET", "/v1/concierge/chief-of-staff/capabilities"): (
            b'{"capabilities":[{"id":"napoleon.capability.governed_text_turn","proposalOnly":true}],'
            b'"runtimeAuthority":false}'
        ),
        ("POST", "/v1/concierge/turn"): (
            b'{"governanceDecision":{"trace_id":"trace_packaged_desktop_live_probe",'
            b'"audit_id":"audit_packaged_desktop_live_probe","outcome":"allow_prepare_only"},'
            b'"approvalCaptured":false,"memoryWritePerformed":false,'
            b'"agentDispatchPerformed":false,"externalSendPerformed":false}'
        ),
    }
    cos_responses = {
        ("GET", "/cos/descriptor"): b'{"descriptor":{"runtimeAuthority":false}}',
        ("GET", "/cos/capabilities"): (
            b'{"capabilities":[{"id":"napoleon.capability.governed_text_turn","proposalOnly":true}],'
            b'"runtimeAuthority":false}'
        ),
        ("POST", "/cos/text-turn"): (
            b'{"trace_id":"trace_packaged_desktop_live_probe",'
            b'"governance_decision":{"decision":"allow_prepare_only"},'
            b'"approval_captured":false,"memory_write_performed":false,'
            b'"agent_dispatch_performed":false,"external_send_performed":false}'
        ),
        ("GET", "/cos/trace/trace_packaged_desktop_live_probe"): (
            b'{"trace_id":"trace_packaged_desktop_live_probe"}'
        ),
    }
    responses = generated_responses if route_family == "generated" else cos_responses

    class ProbeHandler(BaseHTTPRequestHandler):
        def log_message(self, format: str, *args: object) -> None:
            return

        def _record(self) -> bytes:
            content_length = int(self.headers.get("Content-Length") or "0")
            body = self.rfile.read(content_length) if content_length else b""
            records.append(
                {
                    "method": self.command,
                    "path": self.path,
                    "xNapoleonAuth": self.headers.get("X-Napoleon-Auth", ""),
                    "authorization": self.headers.get("Authorization", ""),
                    "body": body.decode("utf-8", errors="replace"),
                }
            )
            return body

        def _send(self) -> None:
            self._record()
            response_body = responses.get((self.command, self.path))
            if response_body is None:
                self.send_response(404)
                self.end_headers()
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response_body)))
            self.end_headers()
            self.wfile.write(response_body)

        def do_GET(self) -> None:
            self._send()

        def do_POST(self) -> None:
            self._send()

    server = HTTPServer(("127.0.0.1", 0), ProbeHandler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}", records
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()


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


def packaged_binary_transport_probe_check(
    *,
    tauri_dir: Path,
    runner: CommandRunner,
) -> dict[str, Any]:
    command = [str(release_binary_path(tauri_dir))]
    endpoint = PROBE_ENDPOINT
    records: list[dict[str, str]] = []
    env = {
        **os.environ,
        "CONCIERGE_DESKTOP_RUNTIME_TRANSPORT_PROBE": "1",
        "NAPOLEON_RUNTIME_ENDPOINT": endpoint,
        "NAPOLEON_RUNTIME_AUTH_TOKEN": PROBE_TOKEN,
    }
    if runner is DEFAULT_COMMAND_RUNNER:
        with local_runtime_probe_server() as (local_endpoint, local_records):
            endpoint = local_endpoint
            records = local_records
            env = {
                **env,
                "NAPOLEON_RUNTIME_ENDPOINT": endpoint,
            }
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
    leaked_endpoint = endpoint in output or "napoleon.example" in output or "127.0.0.1" in output
    leaked_token = PROBE_TOKEN in output
    native_auth_attached = True
    if runner is DEFAULT_COMMAND_RUNNER:
        native_auth_attached = (
            len(records) == 1
            and records[0].get("method") == "GET"
            and records[0].get("path") == "/cos/capabilities"
            and records[0].get("xNapoleonAuth") == PROBE_TOKEN
            and records[0].get("authorization") == ""
        )
    passed = (
        result.returncode == 0
        and isinstance(probe_status, dict)
        and probe_status.get("requestSucceeded") is True
        and probe_status.get("statusOk") is True
        and native_auth_attached
        and not leaked_endpoint
        and not leaked_token
    )
    return {
        "id": "tauri_packaged_desktop_binary_transport_probe",
        "description": (
            "The built no-bundle desktop binary can make a governed native request "
            "to a Napoleon-compatible endpoint with local auth and emit only sanitized booleans."
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
        "nativeAuthObservedByProbeServer": native_auth_attached,
    }


def packaged_binary_local_live_probe_check(
    *,
    tauri_dir: Path,
    runner: CommandRunner,
    route_family: str,
) -> dict[str, Any]:
    command = [str(release_binary_path(tauri_dir))]
    endpoint = PROBE_ENDPOINT
    records: list[dict[str, str]] = []
    env = {
        **os.environ,
        "CONCIERGE_DESKTOP_RUNTIME_LIVE_PROBE": "1",
        "NAPOLEON_RUNTIME_ENDPOINT": endpoint,
        "NAPOLEON_RUNTIME_AUTH_TOKEN": PROBE_TOKEN,
    }
    if runner is DEFAULT_COMMAND_RUNNER:
        with local_live_probe_server(route_family) as (local_endpoint, local_records):
            endpoint = f"{local_endpoint}/cos" if route_family == "cos" else local_endpoint
            records = local_records
            env = {
                **env,
                "NAPOLEON_RUNTIME_ENDPOINT": endpoint,
            }
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
    leaked_endpoint = endpoint in output or "napoleon.example" in output or "127.0.0.1" in output
    leaked_token = PROBE_TOKEN in output
    sequence_observed = True
    if runner is DEFAULT_COMMAND_RUNNER:
        expected_paths = (
            [
                "/v1/concierge/chief-of-staff/descriptor",
                "/v1/concierge/chief-of-staff/capabilities",
                "/v1/concierge/turn",
            ]
            if route_family == "generated"
            else [
                "/cos/descriptor",
                "/cos/capabilities",
                "/cos/text-turn",
                "/cos/trace/trace_packaged_desktop_live_probe",
            ]
        )
        expected_methods = ["GET", "GET", "POST"] if route_family == "generated" else ["GET", "GET", "POST", "GET"]
        expected_auth = (
            ("authorization", f"Bearer {PROBE_TOKEN}", "xNapoleonAuth", "")
            if route_family == "generated"
            else ("xNapoleonAuth", PROBE_TOKEN, "authorization", "")
        )
        sequence_observed = (
            [record.get("path") for record in records] == expected_paths
            and [record.get("method") for record in records] == expected_methods
            and all(record.get(expected_auth[0]) == expected_auth[1] for record in records)
            and all(record.get(expected_auth[2]) == expected_auth[3] for record in records)
            and all(PROBE_TOKEN not in record.get("body", "") for record in records)
        )
    passed = (
        result.returncode == 0
        and isinstance(probe_status, dict)
        and probe_status.get("descriptorOk") is True
        and probe_status.get("capabilitiesOk") is True
        and probe_status.get("textTurnOk") is True
        and probe_status.get("traceOk") is True
        and probe_status.get("sideEffectClaimed") is False
        and sequence_observed
        and not leaked_endpoint
        and not leaked_token
    )
    label = "generated Concierge-compatible" if route_family == "generated" else "explicit /cos"
    return {
        "id": f"tauri_packaged_desktop_binary_{route_family}_live_probe_local",
        "description": (
            f"The built no-bundle desktop binary can run the full validation-only {label} "
            "live-probe sequence through native runtime transport against a local "
            "Napoleon-compatible harness while retaining only sanitized booleans."
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
        "routeFamily": route_family,
        "localLiveProbe": True,
        "descriptorOk": isinstance(probe_status, dict) and probe_status.get("descriptorOk") is True,
        "capabilitiesOk": isinstance(probe_status, dict) and probe_status.get("capabilitiesOk") is True,
        "textTurnOk": isinstance(probe_status, dict) and probe_status.get("textTurnOk") is True,
        "traceOk": isinstance(probe_status, dict) and probe_status.get("traceOk") is True,
        "sideEffectClaimed": isinstance(probe_status, dict) and probe_status.get("sideEffectClaimed") is True,
        "nativeAuthObservedByProbeServer": sequence_observed,
    }


def configured_live_probe_endpoint(env: dict[str, str] | None = None) -> str | None:
    active_env = os.environ if env is None else env
    for key in ["NAPOLEON_RUNTIME_ENDPOINT", "NAPOLEON_BRIDGE_ENDPOINT", "NAPOLEON_EVAL_ENDPOINT"]:
        value = active_env.get(key)
        if value and value.strip():
            return value.strip()
    return None


def packaged_binary_live_probe_check(
    *,
    tauri_dir: Path,
    runner: CommandRunner,
    endpoint: str | None,
) -> dict[str, Any]:
    command = [str(release_binary_path(tauri_dir))]
    if not endpoint:
        return {
            "id": "tauri_packaged_desktop_binary_live_probe",
            "description": (
                "The built no-bundle desktop binary live probe was not run because no real "
                "Napoleon endpoint was configured."
            ),
            "status": "not_configured",
            "exitCode": None,
            "command": command,
            "stdoutRetained": False,
            "stderrRetained": False,
            "endpointHostRetained": False,
            "tokenRetained": False,
            "tokenFilePathRetained": False,
            "requestBodyRetained": False,
            "responseBodyRetained": False,
            "liveProbeConfigured": False,
            "descriptorOk": False,
            "capabilitiesOk": False,
            "textTurnOk": False,
            "traceOk": False,
            "sideEffectClaimed": False,
        }

    env = {
        **os.environ,
        "CONCIERGE_DESKTOP_RUNTIME_LIVE_PROBE": "1",
        "NAPOLEON_RUNTIME_ENDPOINT": endpoint,
    }
    if not env.get("NAPOLEON_RUNTIME_AUTH_TOKEN"):
        env["NAPOLEON_RUNTIME_AUTH_TOKEN"] = os.environ.get("NAPOLEON_EVAL_TOKEN", "")
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
    leaked_endpoint = endpoint in output or "napoleon.example" in output
    leaked_token = PROBE_TOKEN in output or bool(env.get("NAPOLEON_RUNTIME_AUTH_TOKEN") and env["NAPOLEON_RUNTIME_AUTH_TOKEN"] in output)
    passed = (
        result.returncode == 0
        and isinstance(probe_status, dict)
        and probe_status.get("descriptorOk") is True
        and probe_status.get("capabilitiesOk") is True
        and probe_status.get("textTurnOk") is True
        and probe_status.get("traceOk") is True
        and probe_status.get("sideEffectClaimed") is False
        and not leaked_endpoint
        and not leaked_token
    )
    return {
        "id": "tauri_packaged_desktop_binary_live_probe",
        "description": (
            "The built no-bundle desktop binary can run the governed descriptor, capability, "
            "text-turn, and trace-proof live sequence through native runtime transport while "
            "retaining only sanitized booleans."
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
        "liveProbeConfigured": True,
        "descriptorOk": isinstance(probe_status, dict) and probe_status.get("descriptorOk") is True,
        "capabilitiesOk": isinstance(probe_status, dict) and probe_status.get("capabilitiesOk") is True,
        "textTurnOk": isinstance(probe_status, dict) and probe_status.get("textTurnOk") is True,
        "traceOk": isinstance(probe_status, dict) and probe_status.get("traceOk") is True,
        "sideEffectClaimed": isinstance(probe_status, dict) and probe_status.get("sideEffectClaimed") is True,
        "routeFamily": sanitized_label(
            probe_status.get("routeFamily") if isinstance(probe_status, dict) else None,
            LIVE_PROBE_ROUTE_FAMILIES,
            "unknown",
        ),
        "failureStage": sanitized_label(
            probe_status.get("failureStage") if isinstance(probe_status, dict) else None,
            LIVE_PROBE_FAILURE_STAGES,
            "unknown",
        ),
        "failureKind": sanitized_label(
            probe_status.get("failureKind") if isinstance(probe_status, dict) else None,
            LIVE_PROBE_FAILURE_KINDS,
            "unknown",
        ),
    }


def build_report(
    *,
    runner: CommandRunner | None = None,
    app_dir: Path = APP_DIR,
    tauri_dir: Path = TAURI_DIR,
    live_probe_endpoint: str | None = None,
) -> dict[str, Any]:
    active_runner = runner or run_command
    configured_endpoint = live_probe_endpoint or configured_live_probe_endpoint()
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
        packaged_binary_transport_probe_check(
            tauri_dir=tauri_dir,
            runner=active_runner,
        ),
        packaged_binary_local_live_probe_check(
            tauri_dir=tauri_dir,
            runner=active_runner,
            route_family="generated",
        ),
        packaged_binary_local_live_probe_check(
            tauri_dir=tauri_dir,
            runner=active_runner,
            route_family="cos",
        ),
        packaged_binary_live_probe_check(
            tauri_dir=tauri_dir,
            runner=active_runner,
            endpoint=configured_endpoint,
        ),
    ]
    required_checks_passed = all(
        check["status"] == "passed" or check["id"] == "tauri_packaged_desktop_binary_live_probe" and check["status"] == "not_configured"
        for check in checks
    )
    status = "passed" if required_checks_passed else "failed"
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
    packaged_transport_probe_passed = any(
        check["id"] == "tauri_packaged_desktop_binary_transport_probe"
        and check["status"] == "passed"
        for check in checks
    )
    packaged_generated_local_live_probe_passed = any(
        check["id"] == "tauri_packaged_desktop_binary_generated_live_probe_local"
        and check["status"] == "passed"
        for check in checks
    )
    packaged_cos_local_live_probe_passed = any(
        check["id"] == "tauri_packaged_desktop_binary_cos_live_probe_local"
        and check["status"] == "passed"
        for check in checks
    )
    packaged_live_probe = next(
        (check for check in checks if check["id"] == "tauri_packaged_desktop_binary_live_probe"),
        {},
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
            "packagedBinaryTransportProbePassed": packaged_transport_probe_passed,
            "packagedBinaryGeneratedLocalLiveProbePassed": packaged_generated_local_live_probe_passed,
            "packagedBinaryCosLocalLiveProbePassed": packaged_cos_local_live_probe_passed,
            "packagedBinaryLocalLiveProbePassed": (
                packaged_generated_local_live_probe_passed and packaged_cos_local_live_probe_passed
            ),
            "packagedBinaryLiveProbeConfigured": packaged_live_probe.get("liveProbeConfigured") is True,
            "packagedBinaryLiveProbePassed": packaged_live_probe.get("status") == "passed",
            "packagedBinaryLiveProbeDescriptorPassed": packaged_live_probe.get("descriptorOk") is True,
            "packagedBinaryLiveProbeCapabilitiesPassed": packaged_live_probe.get("capabilitiesOk") is True,
            "packagedBinaryLiveProbeTextTurnPassed": packaged_live_probe.get("textTurnOk") is True,
            "packagedBinaryLiveProbeTracePassed": packaged_live_probe.get("traceOk") is True,
            "packagedBinaryLiveProbeSideEffectClaimed": packaged_live_probe.get("sideEffectClaimed") is True,
            "packagedBinaryLiveProbeRouteFamily": packaged_live_probe.get("routeFamily") or "unknown",
            "packagedBinaryLiveProbeFailureStage": packaged_live_probe.get("failureStage") or "unknown",
            "packagedBinaryLiveProbeFailureKind": packaged_live_probe.get("failureKind") or "unknown",
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
            "doesNotContactNapoleon": configured_endpoint is None,
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
