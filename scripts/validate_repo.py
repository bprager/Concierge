#!/usr/bin/env python3
"""Validate Concierge repository contracts and documentation links."""

from __future__ import annotations

import json
import re
import subprocess
import sys
import warnings
from pathlib import Path
from typing import Any

import jsonschema
import yaml

warnings.filterwarnings("ignore", message="jsonschema.RefResolver is deprecated.*", category=DeprecationWarning)


ROOT = Path(__file__).resolve().parents[1]

AUTHORITY_SOURCE_ROOTS = [
    ROOT / "app/src",
    ROOT / "app/src-tauri/src",
]

AUTHORITY_SOURCE_SUFFIXES = {".ts", ".tsx", ".rs"}
AUTHORITY_SOURCE_EXCLUDED_NAMES = {
    "napoleonBridgeFixtures.ts",
}
AUTHORITY_SOURCE_EXCLUDED_PARTS = {
    ".git",
    ".venv",
    "node_modules",
    "dist",
    "target",
    "tests",
    "__tests__",
}

GOVERNED_NETWORK_SOURCE_ALLOWLIST = {
    "app/src/capabilityTaxonomy.ts",
    "app/src/chiefOfStaffSteering.ts",
    "app/src/descriptorDiscovery.ts",
    "app/src/governanceReviewSubmission.ts",
    "app/src/memoryProposalSubmission.ts",
    "app/src/napoleonBridge.ts",
}

BOUNDED_BROWSER_STORAGE_SOURCE_ALLOWLIST = {
    "app/src/App.tsx",
    "app/src/capabilityLedgerStorage.ts",
    "app/src/connectionStorage.ts",
    "app/src/telemetry.ts",
}

APPROVED_BROWSER_STORAGE_KEYS = {
    "concierge_avatar_affect_enabled",
    "concierge_camera_enabled",
    "concierge_capability_ledger_v1",
    "concierge_capability_taxonomy_v1",
    "concierge_microphone_enabled",
    "concierge_raw_media_storage_enabled",
    "concierge_telemetry_buffer_max_events",
    "concierge_telemetry_buffer_v1",
    "concierge_telemetry_enabled",
    "concierge_wake_word_enabled",
    "napoleon_auth_token",
    "napoleon_endpoint",
}

BOUNDED_BROWSER_STORAGE_KEY_PATTERN = re.compile(
    r"\b(?:localStorage|sessionStorage|storage)\s*\.\s*(?:getItem|setItem|removeItem)\s*\(\s*['\"](?P<key>[^'\"]+)['\"]"
)
BOUNDED_BROWSER_STORAGE_KEY_CONSTANT_PATTERN = re.compile(
    r"\b(?:const|let|var)\s+(?P<name>[A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*['\"](?P<key>[^'\"]+)['\"]"
)
BOUNDED_BROWSER_STORAGE_VARIABLE_KEY_PATTERN = re.compile(
    r"\b(?:localStorage|sessionStorage|storage)\s*\.\s*(?:getItem|setItem|removeItem)\s*\(\s*(?P<name>[A-Za-z_$][A-Za-z0-9_$]*)\b"
)

AUTHORITY_BOUNDARY_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (
        re.compile(
            r"\b(child_process|std::process|subprocess|os\.system)\b"
            r"|\b(?:exec|execFile|execFileSync|execSync|spawn|spawnSync)\s*\("
            r"|\b[A-Za-z_$][A-Za-z0-9_$]*\s*\[\s*['\"](?:execFile|execFileSync|execSync|spawn|spawnSync)['\"]\s*\]\s*\("
            r"|\bDeno\.Command\s*\("
            r"|\b(?:globalThis|window)\s*\[\s*['\"]Deno['\"]\s*\]\s*\[\s*['\"]Command['\"]\s*\]\s*\("
            r"|\bBun\.spawnSync\s*\("
            r"|\b(?:globalThis|window)\s*\[\s*['\"]Bun['\"]\s*\]\s*\[\s*['\"](?:spawn|spawnSync)['\"]\s*\]\s*\("
            r"|\bCommand::new\s*\("
        ),
        "direct process or shell execution",
    ),
    (
        re.compile(
            r"\b(memgraph\w*|neo4j|bolt://|writeMemory|saveMemory|memoryGraph)\b"
            r"|\bgraph_write\s*\("
            r"|\b(?:globalThis|window)\s*\[\s*['\"](?:write|save)['\"]\s*\+\s*['\"]Memory['\"]\s*\]\s*\("
            r"|\b(?:globalThis|window)\s*\[\s*['\"]graph['\"]\s*\+\s*['\"]_write['\"]\s*\]\s*\(",
            re.IGNORECASE,
        ),
        "direct memory or graph access",
    ),
    (
        re.compile(
            r"\b(dispatchAgent|invokeAgent|agentRegistry|taskRouter|callTool|runTool|executeTool)\b"
            r"|\btool\.execute\s*\("
            r"|\b(?:globalThis|window)\s*\[\s*['\"]invoke['\"]\s*\+\s*['\"]Agent['\"]\s*\]\s*\("
            r"|\b(?:globalThis|window)\s*\[\s*['\"]dispatch['\"]\s*\+\s*['\"]Agent['\"]\s*\]\s*\("
            r"|\b(?:globalThis|window)\s*\[\s*['\"]run['\"]\s*\+\s*['\"]Tool['\"]\s*\]\s*\("
            r"|\b(?:globalThis|window)\s*\[\s*['\"](?:call|execute)['\"]\s*\+\s*['\"]Tool['\"]\s*\]\s*\("
            r"|\btool\s*\[\s*['\"]execute['\"]\s*\]\s*\("
        ),
        "direct agent or tool dispatch",
    ),
    (
        re.compile(
            r"@tauri-apps/api/"
            r"|\binvoke\s*\("
            r"|\b(?:globalThis|window)\s*\[\s*['\"]__TAURI__['\"]\s*\]\s*\[\s*['\"](?:core|tauri)['\"]\s*\]\s*\[\s*['\"]invoke['\"]\s*\]\s*\("
        ),
        "direct Tauri native bridge access",
    ),
    (
        re.compile(
            r"\beval\s*\("
            r"|\bnew\s+Function\s*\("
            r"|\bnew\s+(?:globalThis|window)\.Function\s*\("
            r"|\b(?:globalThis\.|window\.)?Function\s*\("
            r"|\bset(?:Timeout|Interval)\s*\(\s*['\"]"
            r"|\b(?:globalThis|window)\s*\[\s*['\"]eval['\"]\s*\]\s*\("
            r"|\b(?:globalThis|window)\s*\[\s*['\"]Function['\"]\s*\]\s*\("
            r"|\bnew\s+(?:globalThis|window)\s*\[\s*['\"]Function['\"]\s*\]\s*\("
            r"|\b(?:globalThis|window)\s*\[\s*['\"]set(?:Timeout|Interval)['\"]\s*\]\s*\(\s*['\"]"
            r"|\.\s*constructor\s*\.\s*constructor\s*\("
            r"|\[\s*['\"]constructor['\"]\s*\]\s*\[\s*['\"]constructor['\"]\s*\]\s*\("
        ),
        "direct dynamic code execution",
    ),
]

ALLOWED_TAURI_COMMANDS = {"app_status"}
TAURI_COMMAND_ATTRIBUTE_PATTERN = re.compile(r"#\s*\[\s*tauri::command\s*\]")
RUST_FUNCTION_NAME_PATTERN = re.compile(r"\bfn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(")
TAURI_GENERATE_HANDLER_PATTERN = re.compile(r"generate_handler!\s*\[(?P<handlers>[^\]]*)\]")
CARGO_SECTION_PATTERN = re.compile(r"^\s*\[(?P<section>[^\]]+)\]\s*$")
CARGO_DEPENDENCY_PATTERN = re.compile(r"^\s*(?P<name>[A-Za-z0-9_.-]+)\s*=")
FORBIDDEN_TAURI_NATIVE_PLUGINS = {
    "fs",
    "http",
    "process",
    "shell",
    "sql",
    "store",
    "upload",
    "websocket",
}
FORBIDDEN_NODE_AUTHORITY_DEPENDENCIES = {
    "@anthropic-ai/sdk",
    "@aws-sdk/client-bedrock-runtime",
    "@azure/openai",
    "@google/generative-ai",
    "@langchain/anthropic",
    "@langchain/community",
    "@langchain/core",
    "@langchain/openai",
    "@modelcontextprotocol/sdk",
    "anthropic",
    "bolt-driver",
    "child_process",
    "execa",
    "langchain",
    "memgraph",
    "neo4j-driver",
    "node-fetch",
    "ollama",
    "openai",
    "shelljs",
    "socket.io-client",
    "undici",
    "ws",
}
FORBIDDEN_RUST_AUTHORITY_DEPENDENCIES = {
    "async-openai",
    "bolt-client",
    "ollama-rs",
    "openai-api-rs",
    "reqwest",
    "tokio-tungstenite",
    "tungstenite",
    "ureq",
    "websocket",
    "neo4rs",
}
VISIBLE_PERMISSION_HANDLER_SOURCE_ALLOWLIST = {
    "app/src/App.tsx",
}
EXTERNAL_TARGET_ATTRIBUTES = (
    r"href|xlink:href|xlinkHref|action|formAction|formaction|src|srcSet|srcset|imageSrcSet|imagesrcset|poster"
)

UNGOVERNED_NETWORK_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"\bfetch\s*\("),
    re.compile(r"\bfetch\.(?:call|apply)\s*\("),
    re.compile(r"\b(?:globalThis|window)\.fetch\b"),
    re.compile(r"\b(?:globalThis|window)\.fetch\.(?:call|apply)\s*\("),
    re.compile(r"\b(?:globalThis|window)\s*\[\s*['\"]fetch['\"]\s*\]\s*\("),
    re.compile(r"\bXMLHttpRequest\b"),
    re.compile(r"\bWebSocket\s*\("),
    re.compile(r"\b(?:globalThis|window)\s*\[\s*['\"]WebSocket['\"]\s*\]\s*\("),
    re.compile(r"\bEventSource\s*\("),
    re.compile(r"\b(?:globalThis|window)\s*\[\s*['\"]EventSource['\"]\s*\]\s*\("),
    re.compile(r"\b(?:RTCPeerConnection|webkitRTCPeerConnection|WebTransport)\s*\("),
    re.compile(r"\bnew\s+(?:globalThis|window)\s*\[\s*['\"](?:RTCPeerConnection|webkitRTCPeerConnection|WebTransport)['\"]\s*\]\s*\("),
    re.compile(
        r"\b(?:navigator|window\.navigator)\.(?:usb|serial|hid|bluetooth|credentials)\."
        r"(?:requestDevice|requestPort|get|create|store|preventSilentAccess)\s*\("
    ),
    re.compile(
        r"\b(?:navigator|window\.navigator)\.(?:usb|serial|hid|bluetooth|credentials)\."
        r"(?:requestDevice|requestPort|get|create|store|preventSilentAccess)\.(?:call|apply)\s*\("
    ),
    re.compile(r"\b(?:navigator|window\.navigator)\.permissions\.query\s*\("),
    re.compile(r"\b(?:navigator|window\.navigator)\.permissions\.query\.(?:call|apply)\s*\("),
    re.compile(r"\b(?:navigator|window\.navigator)\.geolocation\.(?:getCurrentPosition|watchPosition)\s*\("),
    re.compile(
        r"\b(?:navigator|window\.navigator)\.geolocation\.(?:getCurrentPosition|watchPosition)\.(?:call|apply)\s*\("
    ),
    re.compile(
        r"\b(?:navigator|window\.navigator|(?:globalThis|window)\s*\[\s*['\"]navigator['\"]\s*\])"
        r"\s*\[\s*['\"](?:usb|serial|hid|bluetooth|credentials)['\"]\s*\]"
        r"\s*\[\s*['\"](?:requestDevice|requestPort|get|create|store|preventSilentAccess)['\"]\s*\]\s*\("
    ),
    re.compile(
        r"\b(?:navigator|window\.navigator|(?:globalThis|window)\s*\[\s*['\"]navigator['\"]\s*\])"
        r"\s*\[\s*['\"]permissions['\"]\s*\]"
        r"\s*\[\s*['\"]query['\"]\s*\]\s*\("
    ),
    re.compile(
        r"\b(?:navigator|window\.navigator|(?:globalThis|window)\s*\[\s*['\"]navigator['\"]\s*\])"
        r"\s*\[\s*['\"]geolocation['\"]\s*\]"
        r"\s*\[\s*['\"](?:getCurrentPosition|watchPosition)['\"]\s*\]\s*\("
    ),
    re.compile(r"\bNotification\.requestPermission\s*\("),
    re.compile(r"\bNotification\.requestPermission\.(?:call|apply)\s*\("),
    re.compile(r"\b(?:globalThis|window)\s*\[\s*['\"]Notification['\"]\s*\]\s*\[\s*['\"]requestPermission['\"]\s*\]\s*\("),
    re.compile(r"\bpushManager\.subscribe\s*\("),
    re.compile(r"\b\w+(?:\.\w+)*\.pushManager\.subscribe\.(?:call|apply)\s*\("),
    re.compile(r"\b\w+\s*\[\s*['\"]pushManager['\"]\s*\]\s*\[\s*['\"]subscribe['\"]\s*\]\s*\("),
    re.compile(r"\bPaymentRequest\s*\("),
    re.compile(r"\b(?:PaymentRequest|(?:globalThis|window)\.PaymentRequest)\.(?:call|apply)\s*\("),
    re.compile(r"\bnew\s+(?:globalThis|window)\s*\[\s*['\"]PaymentRequest['\"]\s*\]\s*\("),
    re.compile(r"\b(?:globalThis|window)\s*\[\s*['\"]PaymentRequest['\"]\s*\]\s*\("),
    re.compile(r"\bsendBeacon\s*\("),
    re.compile(r"\b(?:navigator|window\.navigator)\.sendBeacon\.(?:call|apply)\s*\("),
    re.compile(r"\b(?:navigator|window\.navigator)\s*\[\s*['\"]sendBeacon['\"]\s*\]\s*\("),
    re.compile(r"\b(?:globalThis|window)\s*\[\s*['\"]navigator['\"]\s*\]\s*\[\s*['\"]sendBeacon['\"]\s*\]\s*\("),
    re.compile(r"\b(?:Worker|SharedWorker)\s*\("),
    re.compile(r"\b(?:globalThis|window)\s*\[\s*['\"](?:Worker|SharedWorker)['\"]\s*\]\s*\("),
    re.compile(r"\bimportScripts\s*\("),
    re.compile(r"\bimport\s*\(\s*['\"](?:https?://|data:)"),
    re.compile(r"\bimport\s+(?:[^;\n]*?\s+from\s+)?['\"](?:https?://|data:)"),
    re.compile(r"\b(?:navigator|window\.navigator)\.serviceWorker\.register\s*\("),
    re.compile(r"\b(?:navigator|window\.navigator)\.serviceWorker\.register\.(?:call|apply)\s*\("),
    re.compile(r"\b(?:navigator|window\.navigator|(?:globalThis|window)\s*\[\s*['\"]navigator['\"]\s*\])\s*\[\s*['\"]serviceWorker['\"]\s*\]\s*\[\s*['\"]register['\"]\s*\]\s*\("),
    re.compile(r"\bwindow\.open\s*\("),
    re.compile(r"\bwindow\.open\.(?:call|apply)\s*\("),
    re.compile(r"\bwindow\s*\[\s*['\"]open['\"]\s*\]\s*\("),
    re.compile(r"\b(?:window\.|document\.)?location\.(?:href|assign|replace)\b"),
    re.compile(r"\b(?:globalThis\.|window\.|document\.)?location\s*\[\s*['\"](?:href|assign|replace)['\"]\s*\]"),
    re.compile(r"\b(?:window\.|document\.)?location\s*="),
    re.compile(r"\b(?:globalThis|window|document)\s*\[\s*['\"]location['\"]\s*\]\s*="),
    re.compile(r"\b(?:globalThis|window|document)\s*\[\s*['\"]location['\"]\s*\]\s*\[\s*['\"](?:href|assign|replace)['\"]\s*\]"),
    re.compile(r"\b(?:[A-Za-z_$][A-Za-z0-9_$]*|document\.forms\s*\[[^\]]+\])\.(?:submit|requestSubmit)\s*\("),
    re.compile(r"\b[A-Za-z_$][A-Za-z0-9_$]*\s*\[\s*['\"](?:submit|requestSubmit)['\"]\s*\]\s*\("),
    re.compile(r"\bHTMLFormElement\.prototype\.(?:submit|requestSubmit)\.(?:call|apply)\s*\("),
    re.compile(r"\b[A-Za-z_$][A-Za-z0-9_$]*\.click\s*\("),
    re.compile(r"\b[A-Za-z_$][A-Za-z0-9_$]*\s*\[\s*['\"]click['\"]\s*\]\s*\("),
    re.compile(r"\bHTML(?:Anchor|Button)Element\.prototype\.click\.(?:call|apply)\s*\("),
    re.compile(r"\b(?:navigator|window\.navigator)\.share\s*\("),
    re.compile(r"\b(?:navigator|window\.navigator)\.share\.(?:call|apply)\s*\("),
    re.compile(r"\b(?:navigator|window\.navigator|(?:globalThis|window)\s*\[\s*['\"]navigator['\"]\s*\])\s*\[\s*['\"]share['\"]\s*\]\s*\("),
    re.compile(r"\bpostMessage\s*\("),
    re.compile(r"\b[A-Za-z_$][A-Za-z0-9_$.]*\.postMessage\.(?:call|apply)\s*\("),
    re.compile(r"\b(?:window|parent|top|opener|globalThis)\s*\[\s*['\"]postMessage['\"]\s*\]\s*\("),
    re.compile(r"\b(?:BroadcastChannel|MessageChannel)\s*\("),
    re.compile(r"\b(?:BroadcastChannel|MessageChannel|(?:globalThis|window)\.(?:BroadcastChannel|MessageChannel))\.(?:call|apply)\s*\("),
    re.compile(r"\b(?:navigator|window\.navigator)\.clipboard\.(?:read|readText|write|writeText)\s*\("),
    re.compile(
        r"\b(?:navigator|window\.navigator)\.clipboard\.(?:read|readText|write|writeText)\.(?:call|apply)\s*\("
    ),
    re.compile(
        r"\b(?:navigator|window\.navigator)\.clipboard\s*\[\s*['\"](?:read|readText|write|writeText)['\"]\s*\]\s*\("
    ),
    re.compile(r"\b(?:navigator|window\.navigator|(?:globalThis|window)\s*\[\s*['\"]navigator['\"]\s*\])\s*\[\s*['\"]clipboard['\"]\s*\]\s*\.\s*(?:read|readText|write|writeText)\s*\("),
    re.compile(
        r"\b(?:navigator|window\.navigator|(?:globalThis|window)\s*\[\s*['\"]navigator['\"]\s*\])\s*\[\s*['\"]clipboard['\"]\s*\]\s*\[\s*['\"](?:read|readText|write|writeText)['\"]\s*\]\s*\("
    ),
    re.compile(r"\b(?:globalThis|window)\s*\[\s*['\"]navigator['\"]\s*\]\s*\[\s*['\"]clipboard['\"]\s*\]\s*\[\s*['\"](?:read|readText|write|writeText)['\"]\s*\]\s*\("),
    re.compile(r"\bdocument\.execCommand\s*\(\s*['\"](?:copy|cut|paste)['\"]", re.IGNORECASE),
    re.compile(
        r"\b(?:(?:globalThis|window)\s*\[\s*['\"]document['\"]\s*\]|document)\s*\[\s*['\"]execCommand['\"]\s*\]\s*\(\s*['\"](?:copy|cut|paste)['\"]",
        re.IGNORECASE,
    ),
    re.compile(r"\b(?:globalThis|window)\.(?:showOpenFilePicker|showSaveFilePicker|showDirectoryPicker)\s*\("),
    re.compile(r"\b(?:globalThis|window)\.(?:showOpenFilePicker|showSaveFilePicker|showDirectoryPicker)\.(?:call|apply)\s*\("),
    re.compile(r"\b(?:globalThis|window)\s*\[\s*['\"](?:showOpenFilePicker|showSaveFilePicker|showDirectoryPicker)['\"]\s*\]\s*\("),
    re.compile(r"\bFileReader\s*\("),
    re.compile(r"\bnew\s+(?:globalThis|window)\s*\[\s*['\"]FileReader['\"]\s*\]\s*\("),
    re.compile(r"\b(?:globalThis|window)\s*\[\s*['\"]FileReader['\"]\s*\]\s*\("),
    re.compile(r"\b[A-Za-z_$][A-Za-z0-9_$]*\.(?:readAsText|readAsArrayBuffer|readAsDataURL|readAsBinaryString)\s*\("),
    re.compile(
        r"\b[A-Za-z_$][A-Za-z0-9_$]*\.(?:readAsText|readAsArrayBuffer|readAsDataURL|readAsBinaryString)\.(?:call|apply)\s*\("
    ),
    re.compile(
        r"\b[A-Za-z_$][A-Za-z0-9_$]*\s*\[\s*['\"](?:readAsText|readAsArrayBuffer|readAsDataURL|readAsBinaryString)['\"]\s*\]\s*\("
    ),
    re.compile(r"\bWebAssembly\.(?:compile|compileStreaming|instantiate|instantiateStreaming)\s*\("),
    re.compile(r"\bnew\s+WebAssembly\.(?:Module|Instance)\s*\("),
    re.compile(r"\b(?:globalThis|window)\s*\[\s*['\"]WebAssembly['\"]\s*\]\s*\[\s*['\"](?:compile|compileStreaming|instantiate|instantiateStreaming)['\"]\s*\]\s*\("),
    re.compile(r"\bnew\s+(?:globalThis|window)\s*\[\s*['\"]WebAssembly['\"]\s*\]\s*\[\s*['\"](?:Module|Instance)['\"]\s*\]\s*\("),
    re.compile(r"\b(?:URL|window\.URL|globalThis\.URL)\.createObjectURL\s*\("),
    re.compile(r"\b(?:URL|window\.URL|globalThis\.URL)\.createObjectURL\.(?:call|apply)\s*\("),
    re.compile(r"\b(?:URL|window\.URL|globalThis\.URL)\s*\[\s*['\"]createObjectURL['\"]\s*\]\s*\("),
    re.compile(r"\b(?:globalThis|window)\s*\[\s*['\"]URL['\"]\s*\]\s*\[\s*['\"]createObjectURL['\"]\s*\]\s*\("),
    re.compile(r"\b(?:indexedDB|window\.indexedDB)\.(?:open|deleteDatabase)\s*\("),
    re.compile(r"\b(?:indexedDB|window\.indexedDB)\.(?:open|deleteDatabase)\.(?:call|apply)\s*\("),
    re.compile(r"\b(?:globalThis|window)\s*\[\s*['\"]indexedDB['\"]\s*\]\s*\[\s*['\"](?:open|deleteDatabase)['\"]\s*\]\s*\("),
    re.compile(r"\b(?:caches|window\.caches)\.(?:open|delete|match|put)\s*\("),
    re.compile(r"\b(?:caches|window\.caches)\.(?:open|delete|match|put)\.(?:call|apply)\s*\("),
    re.compile(r"\bwindow\s*\[\s*['\"]caches['\"]\s*\]\s*\[\s*['\"](?:open|delete|match|put)['\"]\s*\]\s*\("),
    re.compile(r"\bglobalThis\s*\[\s*['\"]caches['\"]\s*\]\s*\[\s*['\"](?:open|delete|match|put)['\"]\s*\]\s*\("),
    re.compile(r"\bdocument\.cookie\s*="),
    re.compile(r"\bdocument\s*\[\s*['\"]cookie['\"]\s*\]\s*="),
    re.compile(r"\b(?:globalThis|window)\s*\[\s*['\"]document['\"]\s*\]\s*\[\s*['\"]cookie['\"]\s*\]\s*="),
    re.compile(r"\b(?:history|window\.history)\.(?:pushState|replaceState)\s*\("),
    re.compile(r"\b(?:history|window\.history)\.(?:pushState|replaceState)\.(?:call|apply)\s*\("),
    re.compile(r"\b(?:globalThis|window)\s*\[\s*['\"]history['\"]\s*\]\s*\[\s*['\"](?:pushState|replaceState)['\"]\s*\]\s*\("),
    re.compile(r"\b(?:globalThis|window)\.name\s*="),
    re.compile(r"\b(?:globalThis|window)\s*\[\s*['\"]name['\"]\s*\]\s*="),
    re.compile(r"\bnew\s+(?:globalThis|window)\s*\[\s*['\"](?:BroadcastChannel|MessageChannel)['\"]\s*\]\s*\("),
    re.compile(r"\b(?:globalThis|window)\s*\[\s*['\"](?:BroadcastChannel|MessageChannel)['\"]\s*\]\s*\("),
    re.compile(rf"\b(?:{EXTERNAL_TARGET_ATTRIBUTES})\s*=\s*['\"](?:https?://|mailto:)"),
    re.compile(r"<(?:object|embed)\b[^>\n]*\bdata\s*=\s*['\"]https?://", re.IGNORECASE),
    re.compile(r"\bping\s*=\s*['\"]https?://"),
    re.compile(rf"\[\s*['\"](?:{EXTERNAL_TARGET_ATTRIBUTES})['\"]\s*\]\s*=\s*['\"](?:https?://|mailto:)"),
    re.compile(r"\b\w*(?:object|embed)\w*\s*\[\s*['\"]data['\"]\s*\]\s*=\s*['\"]https?://", re.IGNORECASE),
    re.compile(r"\[\s*['\"]ping['\"]\s*\]\s*=\s*['\"]https?://"),
    re.compile(r"\b\w*(?:object|embed)\w*\.data\s*=\s*['\"]https?://", re.IGNORECASE),
    re.compile(
        rf"\bsetAttribute\s*\(\s*['\"](?:{EXTERNAL_TARGET_ATTRIBUTES})['\"]\s*,\s*['\"](?:https?://|mailto:)"
    ),
    re.compile(r"\b\w*(?:object|embed)\w*\.setAttribute\s*\(\s*['\"]data['\"]\s*,\s*['\"]https?://", re.IGNORECASE),
    re.compile(r"\bsetAttribute\s*\(\s*['\"]ping['\"]\s*,\s*['\"]https?://"),
    re.compile(r"\bhttp-?equiv\s*=\s*['\"]refresh['\"][^>\n]*\bcontent\s*=\s*['\"][^'\"]*url\s*=\s*https?://", re.IGNORECASE),
    re.compile(r"\bcontent\s*=\s*['\"][^'\"]*url\s*=\s*https?://[^>\n]*\bhttp-?equiv\s*=\s*['\"]refresh['\"]", re.IGNORECASE),
    re.compile(r"(?:@import\s+)?\burl\s*\(\s*['\"]?https?://"),
    re.compile(r"\bdangerouslySetInnerHTML\b"),
    re.compile(r"\b(?:innerHTML|outerHTML)\s*="),
    re.compile(r"\[\s*['\"](?:innerHTML|outerHTML)['\"]\s*\]\s*="),
    re.compile(r"\binsertAdjacentHTML\s*\("),
    re.compile(r"\[\s*['\"]insertAdjacentHTML['\"]\s*\]\s*\("),
    re.compile(r"\bDOMParser\s*\("),
    re.compile(r"\bnew\s+(?:globalThis|window)\s*\[\s*['\"]DOMParser['\"]\s*\]\s*\("),
    re.compile(r"\bcreateContextualFragment\s*\("),
    re.compile(r"\[\s*['\"]createContextualFragment['\"]\s*\]\s*\("),
    re.compile(r"\bdocument\.(?:write|writeln)\s*\("),
    re.compile(r"\bdocument\s*\[\s*['\"](?:write|writeln)['\"]\s*\]\s*\("),
    re.compile(r"\bHTMLDocument\.prototype\.(?:write|writeln)\.(?:call|apply)\s*\("),
    re.compile(r"\bsrcDoc\s*="),
    re.compile(r"\bsrcdoc\s*="),
]

BROWSER_STORAGE_PERSISTENCE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(
        r"\b(?:localStorage|sessionStorage|window\.(?:localStorage|sessionStorage))\.(?:getItem|setItem|removeItem|clear)\s*\("
    ),
    re.compile(
        r"\b(?:localStorage|sessionStorage|window\.(?:localStorage|sessionStorage))\.(?:getItem|setItem|removeItem|clear)\.(?:call|apply)\s*\("
    ),
    re.compile(
        r"\b(?:globalThis|window)\s*\[\s*['\"](?:localStorage|sessionStorage)['\"]\s*\]\s*\[\s*['\"](?:getItem|setItem|removeItem|clear)['\"]\s*\]\s*\("
    ),
    re.compile(r"\b(?:localStorage|sessionStorage|window\.(?:localStorage|sessionStorage))\.[A-Za-z_$][A-Za-z0-9_$]*\s*="),
    re.compile(
        r"\b(?:localStorage|sessionStorage|window\.(?:localStorage|sessionStorage))\s*\[\s*['\"][^'\"]+['\"]\s*\]\s*="
    ),
    re.compile(
        r"\b(?:globalThis|window)\s*\[\s*['\"](?:localStorage|sessionStorage)['\"]\s*\]\s*\.[A-Za-z_$][A-Za-z0-9_$]*\s*="
    ),
    re.compile(
        r"\b(?:globalThis|window)\s*\[\s*['\"](?:localStorage|sessionStorage)['\"]\s*\]\s*\[\s*['\"][^'\"]+['\"]\s*\]\s*="
    ),
    re.compile(
        r"\bdelete\s+(?:localStorage|sessionStorage|window\.(?:localStorage|sessionStorage))\.[A-Za-z_$][A-Za-z0-9_$]*"
    ),
    re.compile(
        r"\bdelete\s+(?:localStorage|sessionStorage|window\.(?:localStorage|sessionStorage))\s*\[\s*['\"][^'\"]+['\"]\s*\]"
    ),
    re.compile(
        r"\bdelete\s+(?:globalThis|window)\s*\[\s*['\"](?:localStorage|sessionStorage)['\"]\s*\]\s*\.[A-Za-z_$][A-Za-z0-9_$]*"
    ),
    re.compile(
        r"\bdelete\s+(?:globalThis|window)\s*\[\s*['\"](?:localStorage|sessionStorage)['\"]\s*\]\s*\[\s*['\"][^'\"]+['\"]\s*\]"
    ),
]

BRIDGE_MODULE_DIRECT_TARGET_PATTERN = re.compile(
    r"\b(?:fetcher|fetch)\s*\(\s*("
    r"['\"]https?://"
    r"|['\"][^'\"]*/v1/"
    r"|`[^`]*\$\{[^`]*\}[^`]*/v1/"
    r"|\w+\s*\+\s*['\"][^'\"]*/v1/"
    r")"
)

HIDDEN_MEDIA_OR_SPEECH_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"\bgetUserMedia\s*\("),
    re.compile(r"\bgetUserMedia\.(?:call|apply)\s*\("),
    re.compile(r"\bgetDisplayMedia\s*\("),
    re.compile(r"\bgetDisplayMedia\.(?:call|apply)\s*\("),
    re.compile(r"\benumerateDevices\s*\("),
    re.compile(r"\benumerateDevices\.(?:call|apply)\s*\("),
    re.compile(r"\[\s*['\"](?:getUserMedia|getDisplayMedia|enumerateDevices)['\"]\s*\]\s*\("),
    re.compile(r"\bMediaRecorder\s*\("),
    re.compile(r"\bnew\s+(?:globalThis|window)\s*\[\s*['\"]MediaRecorder['\"]\s*\]\s*\("),
    re.compile(r"\b(?:AudioContext|webkitAudioContext)\s*\("),
    re.compile(r"\bnew\s+(?:globalThis|window)\s*\[\s*['\"](?:AudioContext|webkitAudioContext)['\"]\s*\]\s*\("),
    re.compile(r"\bSpeechRecognition\s*\("),
    re.compile(r"\bnew\s+(?:globalThis|window)\s*\[\s*['\"]SpeechRecognition['\"]\s*\]\s*\("),
    re.compile(r"\bspeechSynthesis\b"),
    re.compile(r"\.play\s*\("),
    re.compile(r"\.play\.(?:call|apply)\s*\("),
    re.compile(r"\[\s*['\"]play['\"]\s*\]\s*\("),
]


def load_json(path: str) -> object:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def validate_json_pairs() -> None:
    pairs = [
        ("schemas/evaluator_run.schema.json", "evaluator/reports/latest.json"),
        ("schemas/evaluator_run.schema.json", "evaluator/reports/accepted_baseline.json"),
        ("schemas/user_profile.schema.json", "examples/adult_owner_profile.json"),
        ("schemas/user_profile.schema.json", "examples/child_protected_profile.json"),
        ("schemas/interaction_trace.schema.json", "examples/sample_interaction_trace.json"),
        ("schemas/concierge_text_turn.schema.json", "examples/sample_text_turn_contract.json"),
        ("schemas/learning_signal.schema.json", "examples/sample_learning_signal.json"),
    ]
    resolver = jsonschema.RefResolver.from_schema(
        {},
        store={
            "chief_of_staff_contract.schema.json": load_json("schemas/chief_of_staff_contract.schema.json"),
            "observability_envelope.schema.json": load_json("schemas/observability_envelope.schema.json"),
        },
    )
    for schema_path, data_path in pairs:
        schema = load_json(schema_path)
        data = load_json(data_path)
        jsonschema.Draft202012Validator.check_schema(schema)
        jsonschema.validate(data, schema, resolver=resolver)
        print(f"valid json: {data_path} against {schema_path}")


def validate_all_schemas() -> None:
    for path in sorted((ROOT / "schemas").glob("*.schema.json")):
        jsonschema.Draft202012Validator.check_schema(json.loads(path.read_text(encoding="utf-8")))
        print(f"valid schema: {path.relative_to(ROOT)}")


def validate_yaml() -> None:
    for path in sorted(ROOT.rglob("*.yaml")) + sorted(ROOT.rglob("*.yml")):
        if any(part in {".git", ".venv", "node_modules", "dist", "target"} for part in path.parts):
            continue
        yaml.safe_load(path.read_text(encoding="utf-8"))
        print(f"valid yaml: {path.relative_to(ROOT)}")


def validate_markdown_links() -> None:
    missing = []
    for path in ROOT.rglob("*.md"):
        if any(part in {".git", ".venv", "node_modules", "dist", "target"} for part in path.parts):
            continue
        text = path.read_text(encoding="utf-8")
        for match in re.finditer(r"\[[^\]]+\]\(([^)]+)\)", text):
            target = match.group(1).split("#", 1)[0]
            if not target or "://" in target or target.startswith("mailto:"):
                continue
            if not (path.parent / target).resolve().exists():
                missing.append(f"{path.relative_to(ROOT)}:{match.group(1)}")
    if missing:
        raise SystemExit("\n".join(missing))
    print("all markdown file links resolve")


def load_bridge_operations() -> list[dict[str, Any]]:
    text = (ROOT / "app/src/generatedBridgeOperations.ts").read_text(encoding="utf-8")
    operations: list[dict[str, Any]] = []
    for match in re.finditer(r"\{\s*id:\s*\"([^\"]+)\"(?P<body>.*?)\n\s*\}", text, re.DOTALL):
        body = match.group("body")
        operation = {"id": match.group(1)}
        for key in ["path", "requestKind", "transport", "tokenPlacement"]:
            value = re.search(rf"{key}:\s*\"([^\"]+)\"", body)
            if value:
                operation[key] = value.group(1)
        response_required = re.search(r"responseRequired:\s*\[(?P<items>[^\]]*)\]", body, re.DOTALL)
        if response_required:
            operation["responseRequired"] = re.findall(r"\"([^\"]+)\"", response_required.group("items"))
        governed = re.search(r"governedBridgeOnly:\s*(true|false)", body)
        if governed:
            operation["governedBridgeOnly"] = governed.group(1) == "true"
        operations.append(operation)
    if not operations:
        raise SystemExit("No bridge operations found in app/src/generatedBridgeOperations.ts")
    return operations


def validate_generated_bridge_operations() -> None:
    result = subprocess.run(
        [sys.executable, "scripts/generate_bridge_operations.py", "--check"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip()
        raise SystemExit(message)
    print(result.stdout.strip())


def load_openapi() -> dict[str, Any]:
    return yaml.safe_load((ROOT / "api/napoleon_bridge.openapi.yaml").read_text(encoding="utf-8"))


def load_openapi_concierge_paths() -> list[str]:
    openapi = load_openapi()
    return sorted(path for path in openapi.get("paths", {}) if path.startswith("/v1/concierge/"))


def load_openapi_concierge_transports() -> dict[str, str]:
    openapi = load_openapi()
    transports: dict[str, str] = {}
    method_to_transport = {"get": "http_get", "post": "http_post"}
    for path, path_spec in openapi.get("paths", {}).items():
        if not path.startswith("/v1/concierge/"):
            continue
        methods = [method for method in method_to_transport if method in path_spec]
        if len(methods) != 1:
            raise SystemExit(f"OpenAPI path must define exactly one supported bridge method: {path}")
        transports[path] = method_to_transport[methods[0]]
    return transports


def load_openapi_request_kinds() -> dict[str, str]:
    openapi = load_openapi()
    request_kinds: dict[str, str] = {}
    for path, path_spec in openapi.get("paths", {}).items():
        operation = path_spec.get("post") or path_spec.get("get") or {}
        schema = (
            operation.get("requestBody", {})
            .get("content", {})
            .get("application/json", {})
            .get("schema", {})
        )
        request_kind = schema.get("properties", {}).get("requestKind", {}).get("const")
        if request_kind:
            request_kinds[path] = request_kind
    return request_kinds


def load_openapi_bearer_security() -> dict[str, bool]:
    openapi = load_openapi()
    security: dict[str, bool] = {}
    for path, path_spec in openapi.get("paths", {}).items():
        operation = path_spec.get("post") or path_spec.get("get") or {}
        entries = operation.get("security", [])
        security[path] = any("NapoleonBearer" in entry for entry in entries if isinstance(entry, dict))
    return security


def load_openapi_response_schema(path: str, status_code: str) -> dict[str, Any]:
    openapi = load_openapi()
    operation = openapi.get("paths", {}).get(path, {}).get("post") or openapi.get("paths", {}).get(path, {}).get("get")
    if not operation:
        raise SystemExit(f"OpenAPI operation not found: {path}")
    schema = (
        operation.get("responses", {})
        .get(status_code, {})
        .get("content", {})
        .get("application/json", {})
        .get("schema")
    )
    if not schema:
        raise SystemExit(f"OpenAPI response schema not found: {path} {status_code}")
    return schema


def load_openapi_request_schema(path: str) -> dict[str, Any]:
    openapi = load_openapi()
    operation = openapi.get("paths", {}).get(path, {}).get("post") or openapi.get("paths", {}).get(path, {}).get("get")
    if not operation:
        raise SystemExit(f"OpenAPI operation not found: {path}")
    schema = (
        operation.get("requestBody", {})
        .get("content", {})
        .get("application/json", {})
        .get("schema")
    )
    if not schema:
        raise SystemExit(f"OpenAPI request schema not found: {path}")
    return schema


def validate_openapi_instance(schema: dict[str, Any], data: object) -> None:
    jsonschema.Draft202012Validator.check_schema(schema)
    jsonschema.validate(data, schema)


def require_equal(left: Any, right: Any, message: str) -> None:
    if left != right:
        raise SystemExit(f"{message}: {left!r} != {right!r}")


def validate_bridge_response_provenance(data: object) -> None:
    if not isinstance(data, dict):
        raise SystemExit("Bridge response example must be a JSON object")

    decision = data.get("governanceDecision")
    trace = data.get("traceEnvelope")
    audit = data.get("auditEnvelope")
    if not isinstance(decision, dict) or not isinstance(trace, dict) or not isinstance(audit, dict):
        raise SystemExit("Bridge response example must include governanceDecision, traceEnvelope, and auditEnvelope objects")

    require_equal(trace.get("trace_id"), decision.get("trace_id"), "traceEnvelope.trace_id must match governanceDecision.trace_id")
    require_equal(trace.get("request_id"), decision.get("request_id"), "traceEnvelope.request_id must match governanceDecision.request_id")
    require_equal(
        trace.get("decision_id"),
        decision.get("decision_id"),
        "traceEnvelope.decision_id must match governanceDecision.decision_id",
    )
    require_equal(audit.get("audit_id"), decision.get("audit_id"), "auditEnvelope.audit_id must match governanceDecision.audit_id")
    require_equal(audit.get("trace_id"), decision.get("trace_id"), "auditEnvelope.trace_id must match governanceDecision.trace_id")
    require_equal(
        audit.get("decision_id"),
        decision.get("decision_id"),
        "auditEnvelope.decision_id must match governanceDecision.decision_id",
    )
    require_equal(
        audit.get("authority_tier"),
        decision.get("authority_tier"),
        "auditEnvelope.authority_tier must match governanceDecision.authority_tier",
    )
    require_equal(
        audit.get("approval_requirement"),
        decision.get("approval_requirement"),
        "auditEnvelope.approval_requirement must match governanceDecision.approval_requirement",
    )

    delegation = data.get("delegation")
    if delegation is not None:
        if not isinstance(delegation, dict):
            raise SystemExit("Bridge response delegation must be an object")
        require_equal(delegation.get("traceId"), decision.get("trace_id"), "delegation.traceId must match governance trace")
        require_equal(delegation.get("auditId"), decision.get("audit_id"), "delegation.auditId must match governance audit")
        require_equal(
            delegation.get("governanceState"),
            decision.get("outcome"),
            "delegation.governanceState must match governance outcome",
        )

    recommendation = data.get("recommendationProvenance")
    if recommendation is not None:
        if not isinstance(recommendation, dict):
            raise SystemExit("Bridge response recommendationProvenance must be an object")
        require_equal(
            recommendation.get("traceId"),
            decision.get("trace_id"),
            "recommendationProvenance.traceId must match governance trace",
        )
        require_equal(
            recommendation.get("auditId"),
            decision.get("audit_id"),
            "recommendationProvenance.auditId must match governance audit",
        )

    forbidden_true_fields = {
        "approvalCaptured",
        "memoryWriteAllowed",
        "memoryWritePerformed",
        "agentDispatchAllowed",
        "agentDispatchPerformed",
        "externalSendAllowed",
        "externalSendPerformed",
        "appliedLocally",
    }

    def scan_forbidden_side_effect_claims(value: object, path: str) -> None:
        if isinstance(value, dict):
            for key, item in value.items():
                child_path = f"{path}.{key}"
                if key in forbidden_true_fields and item is not False:
                    raise SystemExit(f"{child_path} must be false in governed bridge response examples")
                scan_forbidden_side_effect_claims(item, child_path)
        elif isinstance(value, list):
            for index, item in enumerate(value):
                scan_forbidden_side_effect_claims(item, f"{path}[{index}]")

    scan_forbidden_side_effect_claims(data, "response")


def validate_governance_review_response_boundary(data: object) -> None:
    if not isinstance(data, dict):
        raise SystemExit("Governance review response example must be a JSON object")

    decision = data.get("governanceDecision")
    audit = data.get("auditEnvelope")
    if not isinstance(decision, dict) or not isinstance(audit, dict):
        raise SystemExit("Governance review response example must include governanceDecision and auditEnvelope objects")

    require_equal(decision.get("outcome"), "requires_review", "governance review response must remain review-only")
    require_equal(decision.get("authority_tier"), "advisory_review", "governance review response must stay advisory review")
    require_equal(data.get("appliedLocally"), False, "governance review response must not apply locally")
    require_equal(data.get("approvalCaptured"), False, "governance review response must not capture approval")
    require_equal(data.get("memoryWritePerformed"), False, "governance review response must not write memory")
    require_equal(data.get("agentDispatchPerformed"), False, "governance review response must not dispatch agents")
    require_equal(data.get("externalSendPerformed"), False, "governance review response must not send externally")

    approval_requirement = audit.get("approval_requirement")
    if not isinstance(approval_requirement, str) or "guardian" not in approval_requirement:
        raise SystemExit("child protected governance review responses must preserve guardian review wording")


def validate_descriptor_response_boundary(data: object) -> None:
    if not isinstance(data, dict):
        raise SystemExit("Descriptor response example must be a JSON object")

    descriptor = data.get("descriptor")
    connection = data.get("connection")
    checksum = data.get("checksum")
    signature = data.get("signature")
    if not isinstance(descriptor, dict):
        raise SystemExit("Descriptor response example must include descriptor object")
    if not isinstance(connection, dict):
        raise SystemExit("Descriptor response example must include connection object")
    if not isinstance(checksum, dict) or not isinstance(signature, dict):
        raise SystemExit("Descriptor response example must include checksum and signature objects")

    require_equal(data.get("serviceId"), "napoleon.chief_of_staff", "descriptor response serviceId must match Chief of Staff")
    require_equal(descriptor.get("serviceId"), "napoleon.chief_of_staff", "descriptor.serviceId must match Chief of Staff")
    require_equal(data.get("ready"), True, "descriptor response sample must be ready")
    require_equal(data.get("runtimeAuthority"), False, "descriptor response must not grant runtime authority")
    require_equal(descriptor.get("runtimeAuthority"), False, "descriptor must not grant runtime authority")
    require_equal(descriptor.get("commandExecution"), False, "descriptor must not allow command execution")
    require_equal(
        data.get("cachePolicy"),
        "fail_closed_to_review_required",
        "descriptor response must preserve fail-closed cache policy",
    )
    require_equal(
        descriptor.get("cachePolicy"),
        "fail_closed_to_review_required",
        "descriptor must preserve fail-closed cache policy",
    )
    require_equal(connection.get("state"), "ready", "descriptor connection state must be ready in ready sample")
    require_equal(connection.get("checksumState"), "matched", "descriptor checksum must match in ready sample")
    require_equal(connection.get("signatureState"), "valid", "descriptor signature must be valid in ready sample")
    require_equal(connection.get("canAttemptLiveBridge"), True, "descriptor sample may only attempt bridge after ready state")
    require_equal(checksum.get("expected"), checksum.get("actual"), "descriptor checksum sample must match")
    require_equal(signature.get("valid"), True, "descriptor signature sample must be valid")

    blocked_effects = descriptor.get("blockedEffects")
    top_level_blocked_effects = data.get("blockedEffects")
    if not isinstance(blocked_effects, list) or not isinstance(top_level_blocked_effects, list):
        raise SystemExit("Descriptor response must include blocked effect lists")
    for effect in ["runtime_authority", "command_execution", "memory_write", "agent_dispatch", "approval_capture", "external_send"]:
        if effect not in blocked_effects or effect not in top_level_blocked_effects:
            raise SystemExit(f"Descriptor response must keep {effect} blocked")


def validate_child_text_response_boundary(data: object) -> None:
    if not isinstance(data, dict):
        raise SystemExit("Child text response example must be a JSON object")

    decision = data.get("governanceDecision")
    audit = data.get("auditEnvelope")
    if not isinstance(decision, dict) or not isinstance(audit, dict):
        raise SystemExit("Child text response example must include governanceDecision and auditEnvelope objects")

    require_equal(data.get("profileMode"), "child_protected_user", "child text response must preserve child profile mode")
    require_equal(decision.get("outcome"), "requires_review", "child text response must remain review-gated")
    require_equal(decision.get("authority_tier"), "advisory_review", "child text response must stay advisory review")
    require_equal(data.get("memoryWritePerformed"), False, "child text response must not write memory")
    require_equal(data.get("approvalCaptured"), False, "child text response must not capture approval")
    require_equal(data.get("agentDispatchPerformed"), False, "child text response must not dispatch agents")
    require_equal(data.get("externalSendPerformed"), False, "child text response must not send externally")
    require_equal(data.get("appliedLocally"), False, "child text response must not apply locally")

    approval_requirement = audit.get("approval_requirement")
    if not isinstance(approval_requirement, str) or "guardian" not in approval_requirement:
        raise SystemExit("child protected text responses must preserve guardian review wording")

    evidence_links = audit.get("evidence_links")
    if not isinstance(evidence_links, list) or "profile_mode:child_protected_user" not in evidence_links:
        raise SystemExit("child protected text responses must preserve child profile evidence")

    blocked_effects = decision.get("blocked_effects")
    if not isinstance(blocked_effects, list) or "secret_keeping" not in blocked_effects:
        raise SystemExit("child protected text responses must keep secret-keeping blocked")


def validate_child_memory_response_boundary(data: object) -> None:
    if not isinstance(data, dict):
        raise SystemExit("Child memory response example must be a JSON object")

    decision = data.get("governanceDecision")
    audit = data.get("auditEnvelope")
    if not isinstance(decision, dict) or not isinstance(audit, dict):
        raise SystemExit("Child memory response example must include governanceDecision and auditEnvelope objects")

    require_equal(decision.get("outcome"), "requires_review", "child memory response must remain review-only")
    require_equal(decision.get("authority_tier"), "advisory_review", "child memory response must stay advisory review")
    require_equal(data.get("memoryWritePerformed"), False, "child memory response must not write memory")
    require_equal(data.get("approvalCaptured"), False, "child memory response must not capture approval")
    require_equal(data.get("agentDispatchPerformed"), False, "child memory response must not dispatch agents")
    require_equal(data.get("externalSendPerformed"), False, "child memory response must not send externally")

    approval_requirement = audit.get("approval_requirement")
    if not isinstance(approval_requirement, str) or "guardian" not in approval_requirement:
        raise SystemExit("child protected memory responses must preserve guardian review wording")

    evidence_links = audit.get("evidence_links")
    if not isinstance(evidence_links, list) or "profile_mode:child_protected_user" not in evidence_links:
        raise SystemExit("child protected memory responses must preserve child profile evidence")
    if "proposal:child_memory_request_sample" not in evidence_links:
        raise SystemExit("child protected memory responses must preserve proposal evidence")

    blocked_effects = decision.get("blocked_effects")
    if not isinstance(blocked_effects, list) or "secret_keeping" not in blocked_effects:
        raise SystemExit("child protected memory responses must keep secret-keeping blocked")


def validate_child_steering_response_boundary(data: object) -> None:
    if not isinstance(data, dict):
        raise SystemExit("Child steering response example must be a JSON object")

    decision = data.get("governanceDecision")
    audit = data.get("auditEnvelope")
    if not isinstance(decision, dict) or not isinstance(audit, dict):
        raise SystemExit("Child steering response example must include governanceDecision and auditEnvelope objects")

    require_equal(decision.get("outcome"), "requires_review", "child steering response must remain review-only")
    require_equal(decision.get("authority_tier"), "advisory_review", "child steering response must stay advisory review")
    require_equal(data.get("appliedLocally"), False, "child steering response must not apply locally")
    require_equal(data.get("approvalCaptured"), False, "child steering response must not capture approval")
    require_equal(data.get("memoryWritePerformed"), False, "child steering response must not write memory")
    require_equal(data.get("agentDispatchPerformed"), False, "child steering response must not dispatch agents")
    require_equal(data.get("externalSendPerformed"), False, "child steering response must not send externally")

    approval_requirement = audit.get("approval_requirement")
    if not isinstance(approval_requirement, str) or "guardian" not in approval_requirement:
        raise SystemExit("child protected steering responses must preserve guardian review wording")

    evidence_links = audit.get("evidence_links")
    if not isinstance(evidence_links, list) or "profile_mode:child_protected_user" not in evidence_links:
        raise SystemExit("child protected steering responses must preserve child profile evidence")
    if "capability:child_safe_homework_steps" not in evidence_links:
        raise SystemExit("child protected steering responses must preserve child capability evidence")

    blocked_effects = decision.get("blocked_effects")
    if not isinstance(blocked_effects, list) or "secret_keeping" not in blocked_effects:
        raise SystemExit("child protected steering responses must keep secret-keeping blocked")


def validate_taxonomy_review_response_boundary(data: object) -> None:
    if not isinstance(data, dict):
        raise SystemExit("Taxonomy review response example must be a JSON object")

    decision = data.get("governanceDecision")
    audit = data.get("auditEnvelope")
    if not isinstance(decision, dict) or not isinstance(audit, dict):
        raise SystemExit("Taxonomy review response example must include governanceDecision and auditEnvelope objects")

    require_equal(decision.get("outcome"), "requires_review", "taxonomy review response must remain review-only")
    require_equal(decision.get("authority_tier"), "advisory_review", "taxonomy review response must stay advisory review")
    require_equal(data.get("appliedLocally"), False, "taxonomy review response must not apply taxonomy edits locally")
    require_equal(data.get("approvalCaptured"), False, "taxonomy review response must not capture approval")
    require_equal(data.get("memoryWritePerformed"), False, "taxonomy review response must not write memory")
    require_equal(data.get("agentDispatchPerformed"), False, "taxonomy review response must not dispatch agents")
    require_equal(data.get("externalSendPerformed"), False, "taxonomy review response must not send externally")

    evidence_links = audit.get("evidence_links")
    if not isinstance(evidence_links, list) or "capability:capability_taxonomy_review" not in evidence_links:
        raise SystemExit("taxonomy review responses must preserve capability taxonomy review evidence")


def validate_child_taxonomy_review_response_boundary(data: object) -> None:
    validate_taxonomy_review_response_boundary(data)

    if not isinstance(data, dict):
        raise SystemExit("Child taxonomy review response example must be a JSON object")
    decision = data.get("governanceDecision")
    audit = data.get("auditEnvelope")
    if not isinstance(decision, dict) or not isinstance(audit, dict):
        raise SystemExit("Child taxonomy review response example must include governanceDecision and auditEnvelope objects")

    approval_requirement = audit.get("approval_requirement")
    if not isinstance(approval_requirement, str) or "guardian" not in approval_requirement:
        raise SystemExit("child protected taxonomy review responses must preserve guardian review wording")

    evidence_links = audit.get("evidence_links")
    if not isinstance(evidence_links, list) or "profile_mode:child_protected_user" not in evidence_links:
        raise SystemExit("child protected taxonomy review responses must preserve child profile evidence")

    rationale = decision.get("rationale")
    if not isinstance(rationale, str) or "Child-protected" not in rationale:
        raise SystemExit("child protected taxonomy review responses must state the child-protected boundary")


def validate_proposal_only_request_boundary(data: object) -> None:
    if not isinstance(data, dict):
        raise SystemExit("Governed handoff request example must be a JSON object")

    boundary = data.get("boundary")
    if not isinstance(boundary, dict):
        raise SystemExit("Governed handoff request example must include a boundary object")
    expected_boundary = {
        "proposalOnly": True,
        "approvalCaptured": False,
        "memoryWriteAllowed": False,
        "agentDispatchAllowed": False,
        "externalSendAllowed": False,
    }
    for key, expected in expected_boundary.items():
        require_equal(boundary.get(key), expected, f"boundary.{key} must preserve proposal-only semantics")

    chief = data.get("chiefOfStaffRequest")
    governance = data.get("governanceRequest")
    trace = data.get("traceEnvelope")
    audit = data.get("auditEnvelope")
    if not isinstance(chief, dict) or not isinstance(governance, dict) or not isinstance(trace, dict) or not isinstance(audit, dict):
        raise SystemExit("Governed handoff request example must include Chief of Staff, governance, trace, and audit objects")
    require_equal(chief.get("requested_authority_tier"), "advisory_review", "Chief of Staff request must be advisory review")
    require_equal(governance.get("requested_authority_tier"), "advisory_review", "Governance request must be advisory review")
    require_equal(trace.get("trace_id"), chief.get("trace_id"), "traceEnvelope.trace_id must match Chief of Staff trace")
    require_equal(trace.get("trace_id"), governance.get("trace_id"), "traceEnvelope.trace_id must match governance trace")
    require_equal(trace.get("request_id"), chief.get("request_id"), "traceEnvelope.request_id must match Chief of Staff request")
    require_equal(audit.get("trace_id"), trace.get("trace_id"), "auditEnvelope.trace_id must match request trace")
    require_equal(audit.get("decision_id"), trace.get("decision_id"), "auditEnvelope.decision_id must match request trace")
    require_equal(audit.get("authority_tier"), "advisory_review", "auditEnvelope.authority_tier must remain advisory review")

    memory_proposal = data.get("memoryProposal")
    if memory_proposal is not None:
        if not isinstance(memory_proposal, dict):
            raise SystemExit("memoryProposal must be an object")
        require_equal(memory_proposal.get("memoryWritePerformed"), False, "memoryProposal.memoryWritePerformed must be false")
        require_equal(memory_proposal.get("approvalCaptured"), False, "memoryProposal.approvalCaptured must be false")
        if data.get("profileMode") == "child_protected_user":
            require_equal(
                memory_proposal.get("guardianReviewRequired"),
                True,
                "child protected memory proposals must require guardian review",
            )
            require_equal(memory_proposal.get("profile"), "child_protected", "child memory proposal profile must stay child protected")

    recommendation = data.get("recommendation")
    if data.get("profileMode") == "child_protected_user" and recommendation is not None:
        if not isinstance(recommendation, dict):
            raise SystemExit("recommendation must be an object")
        require_equal(
            recommendation.get("childSafetyCaution"),
            True,
            "child protected steering recommendations must include child safety caution",
        )

    governance_review = data.get("governanceReview")
    if governance_review is not None:
        if not isinstance(governance_review, dict):
            raise SystemExit("governanceReview must be an object")
        require_equal(data.get("handoffKind"), "governance_review_handoff", "governanceReview handoff kind must be explicit")
        require_equal(chief.get("request_type"), "governance_review", "governance review handoffs must use governance_review request type")
        require_equal(governance_review.get("approvalCaptured"), False, "governanceReview.approvalCaptured must be false")
        if data.get("profileMode") == "child_protected_user":
            require_equal(
                governance_review.get("profile"),
                "child_protected",
                "child protected governance review profile must stay child protected",
            )
            approval_requirement = audit.get("approval_requirement")
            if not isinstance(approval_requirement, str) or "guardian" not in approval_requirement:
                raise SystemExit("child protected governance review handoffs must preserve guardian review wording")

    forbidden_true_fields = {
        "approvalCaptured",
        "memoryWriteAllowed",
        "memoryWritePerformed",
        "agentDispatchAllowed",
        "agentDispatchPerformed",
        "externalSendAllowed",
        "externalSendPerformed",
        "appliedLocally",
    }

    def scan_forbidden_authority_claims(value: object, path: str) -> None:
        if isinstance(value, dict):
            for key, item in value.items():
                child_path = f"{path}.{key}"
                if key in forbidden_true_fields and item is not False:
                    raise SystemExit(f"{child_path} must be false in proposal-only governed request examples")
                scan_forbidden_authority_claims(item, child_path)
        elif isinstance(value, list):
            for index, item in enumerate(value):
                scan_forbidden_authority_claims(item, f"{path}[{index}]")

    scan_forbidden_authority_claims(data, "request")


def validate_steering_learning_signals(data: object) -> None:
    if not isinstance(data, dict):
        raise SystemExit("Chief of Staff steering request example must be a JSON object")
    if data.get("requestKind") != "chief_of_staff_steering_handoff":
        return
    if data.get("taxonomyReview") is not None or data.get("governanceReview") is not None:
        return
    if data.get("recommendation") is None or data.get("evaluatorCaseCandidate") is None:
        return

    evolution_proposal = data.get("evolutionProposal")
    recommendation = data.get("recommendation")
    trace = data.get("traceEnvelope")
    if not isinstance(evolution_proposal, dict) or not isinstance(recommendation, dict) or not isinstance(trace, dict):
        raise SystemExit("Chief of Staff steering request examples must include recommendation, evolution proposal, and trace objects")

    learning_signals = evolution_proposal.get("learning_signals")
    if not isinstance(learning_signals, list) or not learning_signals:
        raise SystemExit("Chief of Staff steering evolution proposals must include metadata-only learning_signals")

    learning_signal_schema = load_json("schemas/learning_signal.schema.json")
    expected_profile = data.get("profileMode")
    expected_capability = recommendation.get("capability")
    expected_trace = trace.get("trace_id")
    for index, signal in enumerate(learning_signals):
        try:
            jsonschema.validate(signal, learning_signal_schema)
        except jsonschema.ValidationError as error:
            raise SystemExit(f"learning_signals[{index}] is invalid: {error.message}") from error
        if not isinstance(signal, dict):
            raise SystemExit(f"learning_signals[{index}] must be an object")
        require_equal(signal.get("source"), "local_capability_ledger", f"learning_signals[{index}].source must use local metadata")
        require_equal(signal.get("capability_id"), expected_capability, f"learning_signals[{index}].capability_id must match recommendation")
        require_equal(signal.get("trace_id"), expected_trace, f"learning_signals[{index}].trace_id must match request trace")
        require_equal(signal.get("profile_mode"), expected_profile, f"learning_signals[{index}].profile_mode must match request profile")

        privacy = signal.get("privacy")
        boundary = signal.get("governance_boundary")
        if not isinstance(privacy, dict) or not isinstance(boundary, dict):
            raise SystemExit(f"learning_signals[{index}] must include privacy and governance_boundary objects")
        require_equal(privacy.get("raw_user_text_stored"), False, f"learning_signals[{index}] must not store raw user text")
        require_equal(privacy.get("raw_audio_stored"), False, f"learning_signals[{index}] must not store raw audio")
        require_equal(privacy.get("raw_video_stored"), False, f"learning_signals[{index}] must not store raw video")
        require_equal(boundary.get("proposal_only"), True, f"learning_signals[{index}] must remain proposal-only")
        require_equal(boundary.get("approval_captured"), False, f"learning_signals[{index}] must not capture approval")
        require_equal(boundary.get("memory_write_performed"), False, f"learning_signals[{index}] must not write memory")
        require_equal(boundary.get("agent_dispatch_performed"), False, f"learning_signals[{index}] must not dispatch agents")
        require_equal(boundary.get("external_send_performed"), False, f"learning_signals[{index}] must not send externally")
        require_equal(boundary.get("applied_locally"), False, f"learning_signals[{index}] must not apply locally")

        if expected_profile == "child_protected_user":
            require_equal(privacy.get("classification"), "child_sensitive", "child protected learning signals must remain child sensitive")
            require_equal(privacy.get("child_minimized"), True, "child protected learning signals must be minimized")


def openapi_request_examples() -> list[tuple[str, str]]:
    return [
        ("/v1/concierge/memory-proposals", "examples/sample_memory_proposal_request.json"),
        ("/v1/concierge/memory-proposals", "examples/sample_child_memory_proposal_request.json"),
        ("/v1/concierge/chief-of-staff/steering", "examples/sample_chief_of_staff_steering_request.json"),
        ("/v1/concierge/chief-of-staff/steering", "examples/sample_child_chief_of_staff_steering_request.json"),
        ("/v1/concierge/chief-of-staff/steering", "examples/sample_governance_review_request.json"),
        ("/v1/concierge/chief-of-staff/steering", "examples/sample_chief_of_staff_taxonomy_review_request.json"),
        ("/v1/concierge/chief-of-staff/steering", "examples/sample_child_chief_of_staff_taxonomy_review_request.json"),
    ]


def openapi_response_examples() -> list[tuple[str, str, str]]:
    return [
        (
            "/v1/concierge/chief-of-staff/descriptor",
            "200",
            "examples/sample_chief_of_staff_descriptor_response.json",
        ),
        ("/v1/concierge/turn", "200", "examples/sample_text_turn_response.json"),
        ("/v1/concierge/turn", "200", "examples/sample_child_text_turn_response.json"),
        ("/v1/concierge/memory-proposals", "200", "examples/sample_memory_proposal_response.json"),
        ("/v1/concierge/memory-proposals", "200", "examples/sample_child_memory_proposal_response.json"),
        (
            "/v1/concierge/chief-of-staff/steering",
            "200",
            "examples/sample_chief_of_staff_steering_response.json",
        ),
        (
            "/v1/concierge/chief-of-staff/steering",
            "200",
            "examples/sample_child_chief_of_staff_steering_response.json",
        ),
        (
            "/v1/concierge/chief-of-staff/steering",
            "200",
            "examples/sample_governance_review_response.json",
        ),
        (
            "/v1/concierge/chief-of-staff/steering",
            "200",
            "examples/sample_chief_of_staff_taxonomy_review_response.json",
        ),
        (
            "/v1/concierge/chief-of-staff/steering",
            "200",
            "examples/sample_child_chief_of_staff_taxonomy_review_response.json",
        ),
    ]


def validate_openapi_example_inventory() -> None:
    registered_requests = {example_path for _, example_path in openapi_request_examples()}
    registered_responses = {example_path for _, _, example_path in openapi_response_examples()}
    discovered_requests = {
        str(path.relative_to(ROOT))
        for path in (ROOT / "examples").glob("sample*_request.json")
    }
    discovered_responses = {
        str(path.relative_to(ROOT))
        for path in (ROOT / "examples").glob("sample*_response.json")
    }

    if registered_requests != discovered_requests:
        missing = sorted(discovered_requests - registered_requests)
        stale = sorted(registered_requests - discovered_requests)
        raise SystemExit(f"OpenAPI request example inventory mismatch; missing={missing}, stale={stale}")
    if registered_responses != discovered_responses:
        missing = sorted(discovered_responses - registered_responses)
        stale = sorted(registered_responses - discovered_responses)
        raise SystemExit(f"OpenAPI response example inventory mismatch; missing={missing}, stale={stale}")

    print("OpenAPI request/response example inventory is complete")


def validate_openapi_request_examples() -> None:
    validate_openapi_example_inventory()
    examples = openapi_request_examples()
    for path, example_path in examples:
        data = load_json(example_path)
        schema = load_openapi_request_schema(path)
        validate_openapi_instance(schema, data)
        validate_proposal_only_request_boundary(data)
        validate_steering_learning_signals(data)
        print(f"valid OpenAPI request example: {example_path} against {path}")


def validate_openapi_response_examples() -> None:
    examples = openapi_response_examples()
    for path, status_code, example_path in examples:
        data = load_json(example_path)
        schema = load_openapi_response_schema(path, status_code)
        validate_openapi_instance(schema, data)
        if example_path.endswith("sample_chief_of_staff_descriptor_response.json"):
            validate_descriptor_response_boundary(data)
            print(f"valid OpenAPI response example: {example_path} against {path} {status_code}")
            continue
        validate_bridge_response_provenance(data)
        if example_path.endswith("sample_child_text_turn_response.json"):
            validate_child_text_response_boundary(data)
        if example_path.endswith("sample_child_memory_proposal_response.json"):
            validate_child_memory_response_boundary(data)
        if example_path.endswith("sample_child_chief_of_staff_steering_response.json"):
            validate_child_steering_response_boundary(data)
        if example_path.endswith("sample_governance_review_response.json"):
            validate_governance_review_response_boundary(data)
        if example_path.endswith("sample_chief_of_staff_taxonomy_review_response.json"):
            validate_taxonomy_review_response_boundary(data)
        if example_path.endswith("sample_child_chief_of_staff_taxonomy_review_response.json"):
            validate_child_taxonomy_review_response_boundary(data)
        print(f"valid OpenAPI response example: {example_path} against {path} {status_code}")


def find_freeform_bridge_path_callers() -> list[str]:
    offenders: list[str] = []
    for path in (ROOT / "app/src").glob("*.ts"):
        text = path.read_text(encoding="utf-8")
        if "resolveNapoleonBridgeEndpoint(" in text:
            offenders.append(str(path.relative_to(ROOT)))
    return sorted(offenders)


def is_authority_source_path(path: Path) -> bool:
    if path.suffix not in AUTHORITY_SOURCE_SUFFIXES:
        return False
    if path.name in AUTHORITY_SOURCE_EXCLUDED_NAMES:
        return False
    if any(part in AUTHORITY_SOURCE_EXCLUDED_PARTS for part in path.parts):
        return False
    return any(path.is_relative_to(root) for root in AUTHORITY_SOURCE_ROOTS)


def authority_source_paths() -> list[Path]:
    paths: list[Path] = []
    for root in AUTHORITY_SOURCE_ROOTS:
        if not root.exists():
            continue
        paths.extend(path for path in root.rglob("*") if path.is_file() and is_authority_source_path(path))
    return sorted(paths)


def scan_authority_boundary_text(path: str, text: str) -> list[str]:
    violations: list[str] = []
    lines = text.splitlines()
    for line_number, line in enumerate(lines, start=1):
        for pattern, reason in AUTHORITY_BOUNDARY_PATTERNS:
            if pattern.search(line):
                violations.append(f"{path}:{line_number}: {reason}")
        if TAURI_COMMAND_ATTRIBUTE_PATTERN.search(line):
            function_name = None
            for next_line in lines[line_number:]:
                function_match = RUST_FUNCTION_NAME_PATTERN.search(next_line)
                if function_match:
                    function_name = function_match.group(1)
                    break
            if function_name not in ALLOWED_TAURI_COMMANDS:
                violations.append(f"{path}:{line_number}: direct Tauri native bridge access")
        handler_match = TAURI_GENERATE_HANDLER_PATTERN.search(line)
        if handler_match:
            handlers = [handler.strip() for handler in handler_match.group("handlers").split(",")]
            blocked_handlers = [handler for handler in handlers if handler and handler not in ALLOWED_TAURI_COMMANDS]
            if blocked_handlers:
                violations.append(f"{path}:{line_number}: direct Tauri native bridge access")
    return violations


def find_direct_authority_boundary_violations() -> list[str]:
    violations: list[str] = []
    for path in authority_source_paths():
        relative_path = str(path.relative_to(ROOT))
        violations.extend(scan_authority_boundary_text(relative_path, path.read_text(encoding="utf-8")))
    return sorted(violations)


def scan_ungoverned_network_text(path: str, text: str) -> list[str]:
    storage_violations: list[str] = []
    if path in BOUNDED_BROWSER_STORAGE_SOURCE_ALLOWLIST:
        storage_key_constants: dict[str, str] = {}
        for line in text.splitlines():
            key_constant_match = BOUNDED_BROWSER_STORAGE_KEY_CONSTANT_PATTERN.search(line)
            if key_constant_match:
                storage_key_constants[key_constant_match.group("name")] = key_constant_match.group("key")
        for line_number, line in enumerate(text.splitlines(), start=1):
            key_match = BOUNDED_BROWSER_STORAGE_KEY_PATTERN.search(line)
            if key_match and key_match.group("key") not in APPROVED_BROWSER_STORAGE_KEYS:
                storage_violations.append(f"{path}:{line_number}: unapproved browser storage key")
                continue
            variable_key_match = BOUNDED_BROWSER_STORAGE_VARIABLE_KEY_PATTERN.search(line)
            if variable_key_match:
                key = storage_key_constants.get(variable_key_match.group("name"))
                if key is not None and key not in APPROVED_BROWSER_STORAGE_KEYS:
                    storage_violations.append(f"{path}:{line_number}: unapproved browser storage key")
    else:
        for line_number, line in enumerate(text.splitlines(), start=1):
            for pattern in BROWSER_STORAGE_PERSISTENCE_PATTERNS:
                if pattern.search(line):
                    storage_violations.append(
                        f"{path}:{line_number}: ungoverned network call outside Napoleon bridge modules"
                    )
                    break
    if path in GOVERNED_NETWORK_SOURCE_ALLOWLIST:
        violations: list[str] = storage_violations
        for line_number, line in enumerate(text.splitlines(), start=1):
            if BRIDGE_MODULE_DIRECT_TARGET_PATTERN.search(line):
                violations.append(
                    f"{path}:{line_number}: bridge module network call must use named generated operation resolution"
                )
        return violations
    violations: list[str] = storage_violations
    for line_number, line in enumerate(text.splitlines(), start=1):
        for pattern in UNGOVERNED_NETWORK_PATTERNS:
            if pattern.search(line):
                violations.append(f"{path}:{line_number}: ungoverned network call outside Napoleon bridge modules")
                break
    return violations


def find_ungoverned_network_violations() -> list[str]:
    violations: list[str] = []
    for path in authority_source_paths():
        relative_path = str(path.relative_to(ROOT))
        violations.extend(scan_ungoverned_network_text(relative_path, path.read_text(encoding="utf-8")))
    return sorted(violations)


def scan_hidden_media_or_speech_text(path: str, text: str) -> list[str]:
    if path in VISIBLE_PERMISSION_HANDLER_SOURCE_ALLOWLIST:
        return []
    violations: list[str] = []
    for line_number, line in enumerate(text.splitlines(), start=1):
        for pattern in HIDDEN_MEDIA_OR_SPEECH_PATTERNS:
            if pattern.search(line):
                violations.append(f"{path}:{line_number}: hidden media capture or speech/playback API")
                break
    return violations


def find_hidden_media_or_speech_violations() -> list[str]:
    violations: list[str] = []
    for path in authority_source_paths():
        relative_path = str(path.relative_to(ROOT))
        violations.extend(scan_hidden_media_or_speech_text(relative_path, path.read_text(encoding="utf-8")))
    return sorted(violations)


def scan_tauri_config_text(path: str, text: str) -> list[str]:
    try:
        config = json.loads(text)
    except json.JSONDecodeError as error:
        return [f"{path}:1: invalid Tauri config JSON: {error.msg}"]
    plugins = config.get("plugins", {})
    if not isinstance(plugins, dict):
        return []
    violations = []
    for plugin_name in sorted(plugins):
        if plugin_name in FORBIDDEN_TAURI_NATIVE_PLUGINS:
            violations.append(f"{path}: configured Tauri native bypass plugin: {plugin_name}")
    return violations


def scan_tauri_cargo_manifest_text(path: str, text: str) -> list[str]:
    violations = []
    dependency_names = []
    in_dependencies = False
    for line in text.splitlines():
        section_match = CARGO_SECTION_PATTERN.match(line)
        if section_match:
            in_dependencies = section_match.group("section") == "dependencies"
            continue
        if not in_dependencies:
            continue
        dependency_match = CARGO_DEPENDENCY_PATTERN.match(line)
        if dependency_match:
            dependency_names.append(dependency_match.group("name"))
    for dependency_name in sorted(dependency_names):
        if not dependency_name.startswith("tauri-plugin-"):
            continue
        plugin_name = dependency_name.removeprefix("tauri-plugin-")
        if plugin_name in FORBIDDEN_TAURI_NATIVE_PLUGINS:
            violations.append(f"{path}: Tauri native bypass plugin dependency: {dependency_name}")
    return violations


def scan_node_package_manifest_text(path: str, text: str) -> list[str]:
    try:
        manifest = json.loads(text)
    except json.JSONDecodeError as exc:
        return [f"{path}: invalid package manifest JSON: {exc.msg}"]

    violations: list[str] = []
    dependency_sections = [
        "dependencies",
        "devDependencies",
        "optionalDependencies",
        "peerDependencies",
    ]
    for section in dependency_sections:
        dependencies = manifest.get(section, {})
        if not isinstance(dependencies, dict):
            continue
        for dependency_name in sorted(dependencies):
            if dependency_name in FORBIDDEN_NODE_AUTHORITY_DEPENDENCIES:
                violations.append(f"{path}: forbidden authority client dependency in {section}: {dependency_name}")
    return violations


def scan_cargo_authority_dependency_text(path: str, text: str) -> list[str]:
    violations: list[str] = []
    in_dependencies = False
    for line in text.splitlines():
        section_match = CARGO_SECTION_PATTERN.match(line)
        if section_match:
            in_dependencies = section_match.group("section") == "dependencies"
            continue
        if not in_dependencies:
            continue
        dependency_match = CARGO_DEPENDENCY_PATTERN.match(line)
        if not dependency_match:
            continue
        dependency_name = dependency_match.group("name")
        if dependency_name in FORBIDDEN_RUST_AUTHORITY_DEPENDENCIES:
                violations.append(f"{path}: forbidden authority client dependency: {dependency_name}")
    return violations


def scan_node_package_lock_text(path: str, text: str) -> list[str]:
    try:
        lockfile = json.loads(text)
    except json.JSONDecodeError as exc:
        return [f"{path}: invalid package lock JSON: {exc.msg}"]

    packages = lockfile.get("packages", {})
    if not isinstance(packages, dict):
        return []
    root_package = packages.get("", {})
    if not isinstance(root_package, dict):
        return []

    root_manifest = {
        section: root_package.get(section, {})
        for section in ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]
    }
    return scan_node_package_manifest_text(path, json.dumps(root_manifest, sort_keys=True))


def scan_cargo_lock_authority_dependency_text(path: str, text: str) -> list[str]:
    violations: list[str] = []
    in_root_package = False
    in_dependency_list = False

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if line == "[[package]]":
            in_root_package = False
            in_dependency_list = False
            continue
        if line == 'name = "concierge-desktop"':
            in_root_package = True
            continue
        if not in_root_package:
            continue
        if line == "dependencies = [":
            in_dependency_list = True
            continue
        if in_dependency_list and line == "]":
            in_dependency_list = False
            continue
        if not in_dependency_list:
            continue
        dependency_match = re.match(r'"([^"]+)"', line)
        if not dependency_match:
            continue
        dependency_name = dependency_match.group(1).split(" ", 1)[0]
        if dependency_name in FORBIDDEN_RUST_AUTHORITY_DEPENDENCIES:
            violations.append(f"{path}: forbidden authority client dependency in root lockfile package: {dependency_name}")
    return violations


def find_tauri_desktop_authority_violations() -> list[str]:
    violations: list[str] = []
    config_path = ROOT / "app/src-tauri/tauri.conf.json"
    if config_path.exists():
        violations.extend(scan_tauri_config_text(str(config_path.relative_to(ROOT)), config_path.read_text(encoding="utf-8")))
    manifest_path = ROOT / "app/src-tauri/Cargo.toml"
    if manifest_path.exists():
        violations.extend(
            scan_tauri_cargo_manifest_text(str(manifest_path.relative_to(ROOT)), manifest_path.read_text(encoding="utf-8")),
        )
    return sorted(violations)


def find_dependency_authority_violations() -> list[str]:
    violations: list[str] = []
    package_path = ROOT / "app/package.json"
    if package_path.exists():
        violations.extend(
            scan_node_package_manifest_text(str(package_path.relative_to(ROOT)), package_path.read_text(encoding="utf-8"))
        )
    package_lock_path = ROOT / "app/package-lock.json"
    if package_lock_path.exists():
        violations.extend(
            scan_node_package_lock_text(
                str(package_lock_path.relative_to(ROOT)),
                package_lock_path.read_text(encoding="utf-8"),
            )
        )
    manifest_path = ROOT / "app/src-tauri/Cargo.toml"
    if manifest_path.exists():
        relative_path = str(manifest_path.relative_to(ROOT))
        text = manifest_path.read_text(encoding="utf-8")
        violations.extend(scan_cargo_authority_dependency_text(relative_path, text))
    cargo_lock_path = ROOT / "app/src-tauri/Cargo.lock"
    if cargo_lock_path.exists():
        violations.extend(
            scan_cargo_lock_authority_dependency_text(
                str(cargo_lock_path.relative_to(ROOT)),
                cargo_lock_path.read_text(encoding="utf-8"),
            )
        )
    return sorted(violations)


def validate_authority_boundary() -> None:
    violations = find_direct_authority_boundary_violations()
    if violations:
        raise SystemExit(
            "Concierge runtime code bypasses the governed Napoleon bridge:\n" + "\n".join(violations)
        )
    network_violations = find_ungoverned_network_violations()
    if network_violations:
        raise SystemExit(
            "Concierge runtime code makes network calls outside governed Napoleon bridge modules:\n"
            + "\n".join(network_violations)
        )
    media_violations = find_hidden_media_or_speech_violations()
    if media_violations:
        raise SystemExit(
            "Concierge runtime code starts hidden media capture or speech/playback APIs:\n"
            + "\n".join(media_violations)
        )
    tauri_violations = find_tauri_desktop_authority_violations()
    if tauri_violations:
        raise SystemExit(
            "Concierge desktop configuration enables native authority bypasses:\n"
            + "\n".join(tauri_violations)
        )
    dependency_violations = find_dependency_authority_violations()
    if dependency_violations:
        raise SystemExit(
            "Concierge runtime manifests include direct authority client dependencies:\n"
            + "\n".join(dependency_violations)
        )
    print("authority boundary scan passed")


def validate_bridge_contract_alignment() -> None:
    validate_generated_bridge_operations()
    operations = load_bridge_operations()
    openapi_paths = load_openapi_concierge_paths()
    registry_paths = sorted(operation.get("path") for operation in operations)
    if registry_paths != openapi_paths:
        raise SystemExit(
            "Bridge operation paths do not match OpenAPI paths:\n"
            f"registry={registry_paths}\nopenapi={openapi_paths}"
        )

    request_kinds = load_openapi_request_kinds()
    transports = load_openapi_concierge_transports()
    security = load_openapi_bearer_security()
    missing_security: list[str] = []
    request_kind_mismatch: list[str] = []
    transport_mismatch: list[str] = []
    response_required_mismatch: list[str] = []
    for operation in operations:
        path = operation["path"]
        if operation.get("governedBridgeOnly") is not True:
            raise SystemExit(f"Bridge operation is not governed-only: {operation['id']}")
        if operation.get("tokenPlacement") != "authorization_header_only":
            raise SystemExit(f"Bridge operation token placement is not header-only: {operation['id']}")
        if not security.get(path):
            missing_security.append(path)
        if operation.get("transport") != transports.get(path):
            transport_mismatch.append(
                f"{operation['id']} registry={operation.get('transport')} openapi={transports.get(path)}"
            )
        if operation["id"] != "chief_of_staff_descriptor" and request_kinds.get(path) != operation.get("requestKind"):
            request_kind_mismatch.append(
                f"{operation['id']} registry={operation.get('requestKind')} openapi={request_kinds.get(path)}"
            )
        response_required = load_openapi_response_schema(path, "200").get("required", [])
        if operation.get("responseRequired") != response_required:
            response_required_mismatch.append(
                f"{operation['id']} registry={operation.get('responseRequired')} openapi={response_required}"
            )

    if missing_security:
        raise SystemExit(f"OpenAPI paths missing NapoleonBearer security: {', '.join(missing_security)}")
    if transport_mismatch:
        raise SystemExit("Bridge transport mismatch:\n" + "\n".join(transport_mismatch))
    if request_kind_mismatch:
        raise SystemExit("Bridge requestKind mismatch:\n" + "\n".join(request_kind_mismatch))
    if response_required_mismatch:
        raise SystemExit("Bridge response required-field mismatch:\n" + "\n".join(response_required_mismatch))

    offenders = find_freeform_bridge_path_callers()
    if offenders:
        raise SystemExit("Bridge callers use free-form path resolution:\n" + "\n".join(offenders))
    print("bridge operations align with OpenAPI")


def main() -> int:
    validate_all_schemas()
    validate_json_pairs()
    validate_yaml()
    validate_openapi_request_examples()
    validate_openapi_response_examples()
    validate_bridge_contract_alignment()
    validate_authority_boundary()
    validate_markdown_links()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
