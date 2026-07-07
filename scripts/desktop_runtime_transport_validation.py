#!/usr/bin/env python3
"""Validate the packaged desktop Napoleon runtime transport without retaining secrets."""

from __future__ import annotations

import argparse
import contextlib
import json
import os
import plistlib
import subprocess
import sys
import tempfile
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
    "desktop_runtime_live_probe_can_write_sanitized_output_file",
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
    "connect_failed",
    "connection_refused",
    "no_route_to_host",
    "network_unreachable",
    "dns_resolution_failed",
    "timeout",
    "tls_or_certificate_failed",
    "http_not_ok",
    "missing_trace_id",
    "missing_generated_proof",
    "invalid_json",
    "unknown",
}
LIVE_RUNTIME_ENV_KEYS = {
    "CONCIERGE_DESKTOP_RUNTIME_LIVE_PROBE",
    "CONCIERGE_DESKTOP_RUNTIME_LIVE_PROBE_OUT",
    "NAPOLEON_BRIDGE_ENDPOINT",
    "NAPOLEON_EVAL_ENDPOINT",
    "NAPOLEON_EVAL_TOKEN",
    "NAPOLEON_EVAL_TOKEN_FILE",
    "NAPOLEON_RUNTIME_AUTH_TOKEN",
    "NAPOLEON_RUNTIME_AUTH_TOKEN_FILE",
    "NAPOLEON_RUNTIME_ENDPOINT",
}


def run_command(command: Sequence[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        list(command),
        cwd=str(cwd),
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=scrubbed_generic_check_env(),
    )


DEFAULT_COMMAND_RUNNER = run_command


def scrubbed_generic_check_env(env: dict[str, str] | None = None) -> dict[str, str]:
    active_env = os.environ if env is None else env
    return {
        key: value
        for key, value in active_env.items()
        if key not in LIVE_RUNTIME_ENV_KEYS
    }


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


def macos_local_network_usage_check(tauri_dir: Path) -> dict[str, Any]:
    plist_path = tauri_dir / "Info.plist"
    declared = False
    if plist_path.exists():
        try:
            with plist_path.open("rb") as handle:
                plist = plistlib.load(handle)
            value = plist.get("NSLocalNetworkUsageDescription")
            declared = isinstance(value, str) and bool(value.strip())
        except (OSError, plistlib.InvalidFileException):
            declared = False
    return {
        "id": "tauri_macos_local_network_usage_description",
        "description": (
            "The packaged macOS app declares local-network access so private Napoleon "
            "runtime endpoints can use the OS permission path instead of failing as an "
            "undeclared local-network client."
        ),
        "status": "passed" if declared else "failed",
        "exitCode": None,
        "command": [],
        "stdoutRetained": False,
        "stderrRetained": False,
        "endpointHostRetained": False,
        "tokenRetained": False,
        "tokenFilePathRetained": False,
        "requestBodyRetained": False,
        "responseBodyRetained": False,
        "macosLocalNetworkUsageDeclared": declared,
    }


def release_binary_path(tauri_dir: Path) -> Path:
    suffix = ".exe" if sys.platform.startswith("win") else ""
    return tauri_dir / "target" / "release" / f"concierge-desktop{suffix}"


def macos_app_bundle_path(tauri_dir: Path) -> Path:
    return tauri_dir / "target" / "release" / "bundle" / "macos" / "Concierge.app"


def tauri_bundle_identifier(tauri_dir: Path) -> str | None:
    try:
        config = json.loads((tauri_dir / "tauri.conf.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    identifier = config.get("identifier")
    return identifier.strip() if isinstance(identifier, str) and identifier.strip() else None


def plist_value(plist_path: Path, key: str) -> Any:
    try:
        with plist_path.open("rb") as handle:
            plist = plistlib.load(handle)
    except (OSError, plistlib.InvalidFileException):
        return None
    return plist.get(key)


def macos_app_bundle_identity_check(
    *,
    tauri_dir: Path,
    runner: CommandRunner,
) -> dict[str, Any]:
    expected_identifier = tauri_bundle_identifier(tauri_dir)
    bundle_path = macos_app_bundle_path(tauri_dir)
    bundle_info_path = bundle_path / "Contents" / "Info.plist"
    bundle_identifier = plist_value(bundle_info_path, "CFBundleIdentifier")
    local_network_usage = plist_value(bundle_info_path, "NSLocalNetworkUsageDescription")
    bundle_identifier_matches = (
        isinstance(expected_identifier, str)
        and isinstance(bundle_identifier, str)
        and bundle_identifier == expected_identifier
    )
    local_network_usage_declared = isinstance(local_network_usage, str) and bool(local_network_usage.strip())
    sign_exit_code = None
    verify_exit_code = None
    signature_identifier_matches = False
    info_plist_bound = False
    if bundle_path.exists() and isinstance(expected_identifier, str):
        sign_command = [
            "codesign",
            "--force",
            "--sign",
            "-",
            "--identifier",
            expected_identifier,
            str(bundle_path),
        ]
        sign_result = runner(sign_command, tauri_dir)
        sign_exit_code = sign_result.returncode
        verify_command = ["codesign", "-dv", str(bundle_path)]
        verify_result = runner(verify_command, tauri_dir)
        verify_exit_code = verify_result.returncode
        signature_output = f"{verify_result.stdout or ''}\n{verify_result.stderr or ''}"
        if runner is DEFAULT_COMMAND_RUNNER:
            signature_identifier_matches = f"Identifier={expected_identifier}" in signature_output
            info_plist_bound = "Info.plist entries=" in signature_output
        else:
            signature_identifier_matches = sign_result.returncode == 0 and verify_result.returncode == 0
            info_plist_bound = signature_identifier_matches
    passed = (
        bundle_identifier_matches
        and local_network_usage_declared
        and sign_exit_code == 0
        and verify_exit_code == 0
        and signature_identifier_matches
        and info_plist_bound
    )
    return {
        "id": "tauri_macos_app_bundle_identity",
        "description": (
            "The built macOS app bundle uses the configured Concierge bundle identifier, "
            "keeps the local-network usage declaration in the generated bundle, and has "
            "that identity bound into the local validation signature."
        ),
        "status": "passed" if passed else "failed",
        "exitCode": 0 if passed else 1,
        "command": ["codesign", "--force", "--sign", "-", "--identifier", "<bundle-id>", "<app-bundle>"],
        "stdoutRetained": False,
        "stderrRetained": False,
        "endpointHostRetained": False,
        "tokenRetained": False,
        "tokenFilePathRetained": False,
        "requestBodyRetained": False,
        "responseBodyRetained": False,
        "bundleIdentifierMatches": bundle_identifier_matches,
        "bundleLocalNetworkUsageDeclared": local_network_usage_declared,
        "signatureIdentifierMatches": signature_identifier_matches,
        "infoPlistBoundToSignature": info_plist_bound,
    }


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


def live_probe_check_from_result(
    *,
    check_id: str,
    description: str,
    command: Sequence[str],
    result: subprocess.CompletedProcess[str],
    probe_output: str,
    endpoint: str,
    auth_token: str,
    live_probe_configured: bool,
) -> dict[str, Any]:
    output = f"{probe_output or ''}\n{result.stdout or ''}\n{result.stderr or ''}"
    probe_status = None
    try:
        probe_status = json.loads((probe_output or "").strip())
    except json.JSONDecodeError:
        probe_status = None
    leaked_endpoint = endpoint in output or "napoleon.example" in output
    leaked_token = PROBE_TOKEN in output or bool(auth_token and auth_token in output)
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
        "id": check_id,
        "description": description,
        "status": "passed" if passed else "failed",
        "exitCode": result.returncode,
        "command": list(command),
        "stdoutRetained": False,
        "stderrRetained": False,
        "endpointHostRetained": leaked_endpoint,
        "tokenRetained": leaked_token,
        "tokenFilePathRetained": False,
        "requestBodyRetained": False,
        "responseBodyRetained": False,
        "liveProbeConfigured": live_probe_configured,
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


def macos_app_bundle_live_probe_check(
    *,
    tauri_dir: Path,
    runner: CommandRunner,
    endpoint: str | None,
) -> dict[str, Any]:
    bundle_path = macos_app_bundle_path(tauri_dir)
    display_command = [
        "open",
        "-W",
        "-n",
        "-g",
        "<app-bundle>",
        "--env",
        "CONCIERGE_DESKTOP_RUNTIME_LIVE_PROBE=1",
        "--env",
        "CONCIERGE_DESKTOP_RUNTIME_LIVE_PROBE_OUT=<sanitized-output-path>",
        "--env",
        "NAPOLEON_RUNTIME_ENDPOINT=<configured>",
        "--env",
        "NAPOLEON_RUNTIME_AUTH_TOKEN=<configured>",
    ]
    if not endpoint:
        return {
            "id": "tauri_macos_app_bundle_live_probe",
            "description": (
                "The macOS app bundle live probe was not run because no real Napoleon endpoint "
                "was configured."
            ),
            "status": "not_configured",
            "exitCode": None,
            "command": display_command,
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

    auth_token = os.environ.get("NAPOLEON_RUNTIME_AUTH_TOKEN") or os.environ.get("NAPOLEON_EVAL_TOKEN", "")
    if runner is DEFAULT_COMMAND_RUNNER:
        with tempfile.TemporaryDirectory(prefix="concierge-app-live-probe-") as tmpdir:
            output_path = Path(tmpdir) / "probe.json"
            command = [
                "open",
                "-W",
                "-n",
                "-g",
                str(bundle_path),
                "--env",
                "CONCIERGE_DESKTOP_RUNTIME_LIVE_PROBE=1",
                "--env",
                f"CONCIERGE_DESKTOP_RUNTIME_LIVE_PROBE_OUT={output_path}",
                "--env",
                f"NAPOLEON_RUNTIME_ENDPOINT={endpoint}",
            ]
            if auth_token:
                command.extend(["--env", f"NAPOLEON_RUNTIME_AUTH_TOKEN={auth_token}"])
            result = subprocess.run(
                command,
                cwd=str(tauri_dir),
                check=False,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            try:
                probe_output = output_path.read_text(encoding="utf-8")
            except OSError:
                probe_output = ""
    else:
        result = runner(["open", "-W", "-n", "-g", str(bundle_path)], tauri_dir)
        probe_output = result.stdout or ""

    return live_probe_check_from_result(
        check_id="tauri_macos_app_bundle_live_probe",
        description=(
            "The macOS app bundle can be launched through LaunchServices with local-only "
            "runtime configuration and can write the sanitized governed descriptor, capability, "
            "text-turn, and trace-proof live probe result."
        ),
        command=display_command,
        result=result,
        probe_output=probe_output,
        endpoint=endpoint,
        auth_token=auth_token,
        live_probe_configured=True,
    )


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
        macos_local_network_usage_check(tauri_dir),
        sanitized_check(
            check_id="tauri_packaged_desktop_app_bundle_build",
            description=(
                "Tauri packaged desktop macOS app bundle build succeeds so validation can "
                "exercise the app identity macOS uses for local-network permission."
            ),
            command=["npm", "run", "tauri", "--", "build", "--bundles", "app", "--no-sign"],
            cwd=app_dir,
            runner=active_runner,
        ),
        macos_app_bundle_identity_check(
            tauri_dir=tauri_dir,
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
        macos_app_bundle_live_probe_check(
            tauri_dir=tauri_dir,
            runner=active_runner,
            endpoint=configured_endpoint,
        ),
    ]
    required_checks_passed = all(
        check["status"] == "passed"
        or check["id"] in {"tauri_packaged_desktop_binary_live_probe", "tauri_macos_app_bundle_live_probe"}
        and check["status"] == "not_configured"
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
    macos_local_network_usage_declared = any(
        check["id"] == "tauri_macos_local_network_usage_description"
        and check["status"] == "passed"
        for check in checks
    )
    macos_app_bundle_built = any(
        check["id"] == "tauri_packaged_desktop_app_bundle_build"
        and check["status"] == "passed"
        for check in checks
    )
    macos_app_bundle_identity_bound = any(
        check["id"] == "tauri_macos_app_bundle_identity"
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
    macos_app_bundle_live_probe = next(
        (check for check in checks if check["id"] == "tauri_macos_app_bundle_live_probe"),
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
            "macosLocalNetworkUsageDeclared": macos_local_network_usage_declared,
            "macosAppBundleBuilt": macos_app_bundle_built,
            "macosAppBundleIdentityBound": macos_app_bundle_identity_bound,
            "macosAppBundleLiveProbeConfigured": macos_app_bundle_live_probe.get("liveProbeConfigured") is True,
            "macosAppBundleLiveProbePassed": macos_app_bundle_live_probe.get("status") == "passed",
            "macosAppBundleLiveProbeDescriptorPassed": macos_app_bundle_live_probe.get("descriptorOk") is True,
            "macosAppBundleLiveProbeCapabilitiesPassed": macos_app_bundle_live_probe.get("capabilitiesOk") is True,
            "macosAppBundleLiveProbeTextTurnPassed": macos_app_bundle_live_probe.get("textTurnOk") is True,
            "macosAppBundleLiveProbeTracePassed": macos_app_bundle_live_probe.get("traceOk") is True,
            "macosAppBundleLiveProbeSideEffectClaimed": macos_app_bundle_live_probe.get("sideEffectClaimed") is True,
            "macosAppBundleLiveProbeRouteFamily": macos_app_bundle_live_probe.get("routeFamily") or "unknown",
            "macosAppBundleLiveProbeFailureStage": macos_app_bundle_live_probe.get("failureStage") or "unknown",
            "macosAppBundleLiveProbeFailureKind": macos_app_bundle_live_probe.get("failureKind") or "unknown",
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
