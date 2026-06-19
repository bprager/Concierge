import unittest

from scripts import validate_repo


class AuthorityBoundaryValidationTest(unittest.TestCase):
    def test_current_runtime_sources_do_not_call_authority_systems_directly(self):
        violations = validate_repo.find_direct_authority_boundary_violations()

        self.assertEqual(violations, [])

    def test_current_runtime_sources_do_not_make_ungoverned_network_calls(self):
        violations = validate_repo.find_ungoverned_network_violations()

        self.assertEqual(violations, [])

    def test_current_runtime_sources_do_not_start_hidden_media_or_speech(self):
        violations = validate_repo.find_hidden_media_or_speech_violations()

        self.assertEqual(violations, [])

    def test_current_tauri_desktop_surface_does_not_enable_native_bypass_plugins(self):
        violations = validate_repo.find_tauri_desktop_authority_violations()

        self.assertEqual(violations, [])

    def test_current_runtime_manifests_do_not_include_direct_authority_clients(self):
        violations = validate_repo.find_dependency_authority_violations()

        self.assertEqual(violations, [])

    def test_scanner_detects_direct_process_execution(self):
        for source in [
            'let child = std::process::Command::new("osascript").spawn();',
            'execFile("osascript", args);',
            'execFileSync("osascript", args);',
            'spawnSync("sh", ["-c", script]);',
            'const command = new Deno.Command("osascript", { args });',
            'const child = Bun.spawn(["osascript", "-e", script]);',
            'const result = Bun.spawnSync(["sh", "-c", script]);',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_authority_boundary_text("app/src-tauri/src/main.rs", source)

                self.assertTrue(violations)
                self.assertIn("direct process or shell execution", violations[0])

    def test_scanner_detects_direct_process_execution_aliases(self):
        for source in [
            'await childProcess["execFile"]("osascript", args);',
            'await childProcess["spawnSync"]("sh", ["-c", script]);',
            'const command = new globalThis["Deno"]["Command"]("osascript", { args });',
            'const child = globalThis["Bun"]["spawn"](["osascript", "-e", script]);',
            'const result = window["Bun"]["spawnSync"](["sh", "-c", script]);',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_authority_boundary_text("app/src/processAlias.ts", source)

                self.assertTrue(violations)
                self.assertIn("direct process or shell execution", violations[0])

    def test_scanner_detects_direct_memory_or_graph_access(self):
        violations = validate_repo.scan_authority_boundary_text(
            "app/src/memory.ts",
            'const driver = neo4j.driver("bolt://localhost:7687");',
        )

        self.assertIn("direct memory or graph access", violations[0])

    def test_scanner_detects_direct_memgraph_access_case_insensitively(self):
        violations = validate_repo.scan_authority_boundary_text(
            "app/src/memory.ts",
            "const client = new MemgraphClient({ host: 'localhost' });",
        )

        self.assertIn("direct memory or graph access", violations[0])

    def test_scanner_detects_direct_memory_write_aliases(self):
        for source in [
            'await window["write" + "Memory"](proposal);',
            'await globalThis["save" + "Memory"](proposal);',
            'await window["graph" + "_write"](payload);',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_authority_boundary_text("app/src/memory.ts", source)

                self.assertTrue(violations)
                self.assertIn("direct memory or graph access", violations[0])

    def test_scanner_detects_direct_agent_or_tool_dispatch(self):
        violations = validate_repo.scan_authority_boundary_text(
            "app/src/router.ts",
            "await agentRegistry.dispatchAgent(request);",
        )

        self.assertIn("direct agent or tool dispatch", violations[0])

    def test_scanner_detects_direct_agent_or_tool_dispatch_aliases(self):
        for source in [
            "await invokeAgent(request);",
            "await runTool('calendar.lookup', payload);",
            "await executeTool(toolName, payload);",
            'await window["invoke" + "Agent"](request);',
            'await window["dispatch" + "Agent"](request);',
            'await globalThis["run" + "Tool"]("calendar.lookup", payload);',
            'await globalThis["call" + "Tool"]("calendar.lookup", payload);',
            'await window["execute" + "Tool"](toolName, payload);',
            'await tool["execute"](payload);',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_authority_boundary_text("app/src/router.ts", source)

                self.assertTrue(violations)
                self.assertIn("direct agent or tool dispatch", violations[0])

    def test_scanner_detects_direct_tauri_native_bridge_access(self):
        for source in [
            'import { invoke } from "@tauri-apps/api/core";',
            'await invoke("write_memory", payload);',
            'await window.__TAURI__.core.invoke("write_memory", payload);',
            'await globalThis.__TAURI__.tauri.invoke("dispatch_agent", payload);',
            'await window["__TAURI__"]["core"]["invoke"]("external_send", payload);',
            "#[tauri::command]\nfn write_memory() {}",
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_authority_boundary_text("app/src/nativeBridge.ts", source)

                self.assertTrue(violations)
                self.assertIn("direct Tauri native bridge access", violations[0])

    def test_scanner_detects_dynamic_code_execution(self):
        for source in [
            "eval(userSuppliedScript);",
            "const runner = new Function('payload', userSuppliedScript);",
            'setTimeout("fetch(`https://api.example.test/send`)", 0);',
            'setInterval("navigator.sendBeacon(`/audit`)", 1000);',
            'window["eval"](userSuppliedScript);',
            'const runner = new globalThis["Function"]("payload", userSuppliedScript);',
            'window["setTimeout"]("fetch(`https://api.example.test/send`)", 0);',
            'globalThis["setInterval"]("navigator.sendBeacon(`/audit`)", 1000);',
            "globalThis.eval(userSuppliedScript);",
            "const runner = new window.Function('payload', userSuppliedScript);",
            'window.setTimeout("fetch(`https://api.example.test/send`)", 0);',
            "const runner = Function('payload', userSuppliedScript);",
            "const runner = globalThis.Function('payload', userSuppliedScript);",
            "const runner = window.Function('payload', userSuppliedScript);",
            'const runner = window["Function"]("payload", userSuppliedScript);',
            'const runner = globalThis["Function"]("payload", userSuppliedScript);',
            'const runner = ({}).constructor.constructor("payload", userSuppliedScript);',
            'const runner = window["constructor"]["constructor"]("payload", userSuppliedScript);',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_authority_boundary_text("app/src/dynamicCode.ts", source)

                self.assertTrue(violations)
                self.assertIn("direct dynamic code execution", violations[0])

    def test_scanner_detects_tauri_configured_native_bypass_plugins(self):
        source = """
        {
          "plugins": {
            "shell": { "open": true },
            "http": { "scope": ["https://api.example.test"] },
            "fs": { "scope": ["$APPDATA/*"] }
          }
        }
        """

        violations = validate_repo.scan_tauri_config_text("app/src-tauri/tauri.conf.json", source)

        self.assertEqual(len(violations), 3)
        self.assertTrue(all("configured Tauri native bypass plugin" in violation for violation in violations))

    def test_scanner_detects_tauri_native_bypass_plugin_dependencies(self):
        source = """
        [dependencies]
        tauri-plugin-shell = "2"
        tauri-plugin-http = "2"
        tauri-plugin-fs = "2"
        """

        violations = validate_repo.scan_tauri_cargo_manifest_text("app/src-tauri/Cargo.toml", source)

        self.assertEqual(len(violations), 3)
        self.assertTrue(all("Tauri native bypass plugin dependency" in violation for violation in violations))

    def test_scanner_detects_forbidden_node_authority_client_dependencies(self):
        source = """
        {
          "dependencies": {
            "openai": "latest",
            "@anthropic-ai/sdk": "latest",
            "neo4j-driver": "latest",
            "langchain": "latest",
            "ws": "latest"
          },
          "devDependencies": {
            "shelljs": "latest"
          }
        }
        """

        violations = validate_repo.scan_node_package_manifest_text("app/package.json", source)

        self.assertEqual(len(violations), 6)
        self.assertTrue(all("forbidden authority client dependency" in violation for violation in violations))

    def test_scanner_detects_forbidden_rust_authority_client_dependencies(self):
        source = """
        [dependencies]
        reqwest = "0.12"
        async-openai = "0.27"
        neo4rs = "0.8"
        tokio-tungstenite = "0.26"
        """

        violations = validate_repo.scan_cargo_authority_dependency_text("app/src-tauri/Cargo.toml", source)

        self.assertEqual(len(violations), 4)
        self.assertTrue(all("forbidden authority client dependency" in violation for violation in violations))

    def test_scanner_detects_forbidden_node_lockfile_root_dependencies(self):
        source = """
        {
          "packages": {
            "": {
              "dependencies": {
                "openai": "latest",
                "neo4j-driver": "latest",
                "ws": "latest"
              },
              "devDependencies": {
                "shelljs": "latest"
              }
            },
            "node_modules/openai": {
              "version": "5.0.0"
            }
          }
        }
        """

        violations = validate_repo.scan_node_package_lock_text("app/package-lock.json", source)

        self.assertEqual(len(violations), 4)
        self.assertTrue(all("forbidden authority client dependency" in violation for violation in violations))

    def test_scanner_detects_forbidden_cargo_lockfile_root_dependencies(self):
        source = """
        [[package]]
        name = "concierge-desktop"
        version = "0.1.0"
        dependencies = [
         "reqwest",
         "async-openai",
         "tokio-tungstenite",
        ]

        [[package]]
        name = "reqwest"
        version = "0.12.0"
        """

        violations = validate_repo.scan_cargo_lock_authority_dependency_text("app/src-tauri/Cargo.lock", source)

        self.assertEqual(len(violations), 3)
        self.assertTrue(all("forbidden authority client dependency" in violation for violation in violations))

    def test_network_scanner_detects_unallowlisted_fetch_and_socket_calls(self):
        for source in [
            'await fetch("https://api.example.test/send", { method: "POST" });',
            'await window.fetch("https://api.example.test/send");',
            "const request = new XMLHttpRequest();",
            'const socket = new WebSocket("wss://api.example.test/live");',
            'const events = new EventSource("https://api.example.test/events");',
            'navigator.sendBeacon("https://api.example.test/audit", payload);',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_bracket_access_network_bypasses(self):
        for source in [
            'await globalThis["fetch"]("https://api.example.test/send");',
            'await window["fetch"]("https://api.example.test/send");',
            'const socket = new window["WebSocket"]("wss://api.example.test/live");',
            'navigator["sendBeacon"]("https://api.example.test/audit", payload);',
            'window["navigator"]["sendBeacon"]("https://api.example.test/audit", payload);',
            'globalThis["navigator"]["sendBeacon"]("https://api.example.test/audit", payload);',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_bracket_access_browser_side_channels(self):
        for source in [
            'window["postMessage"]({ payload }, "*");',
            'await navigator["clipboard"].writeText(secretProofJson);',
            'await window["navigator"]["share"]({ text: "send this outside Concierge" });',
            'window["open"]("https://api.example.test/export", "_blank");',
            'window["location"]["href"] = "https://api.example.test/export";',
            'await navigator["serviceWorker"]["register"]("/hidden-service-worker.js");',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_global_navigator_bracket_side_channels(self):
        for source in [
            'await globalThis["navigator"]["share"]({ text: "send this outside Concierge" });',
            'await globalThis["navigator"]["serviceWorker"]["register"]("/hidden-service-worker.js");',
            'await globalThis["navigator"]["permissions"]["query"]({ name: "microphone" });',
            'globalThis["navigator"]["geolocation"]["getCurrentPosition"](onPosition);',
            'await globalThis["navigator"]["usb"]["requestDevice"]({ filters: [] });',
            'await globalThis["navigator"]["credentials"]["get"]({ password: true });',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_browser_persistence_side_channels(self):
        for source in [
            'const db = await indexedDB.open("concierge-raw-transcripts");',
            'const cache = await caches.open("concierge-hidden-cache");',
            'await window["caches"]["open"]("concierge-hidden-cache");',
            'document.cookie = "concierge_secret=raw-transcript";',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_browser_file_access_side_channels(self):
        for source in [
            "const [handle] = await window.showOpenFilePicker();",
            "const handle = await globalThis.showSaveFilePicker();",
            "const directory = await window.showDirectoryPicker();",
            "const reader = new FileReader();",
            "reader.readAsText(file);",
            "reader.readAsArrayBuffer(file);",
            "reader.readAsDataURL(file);",
            "reader.readAsBinaryString(file);",
            'const [handle] = await window["showOpenFilePicker"]();',
            'const reader = new window["FileReader"]();',
            'reader["readAsText"](file);',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_browser_local_executable_side_channels(self):
        for source in [
            "const module = await WebAssembly.compile(bytes);",
            "const instance = await WebAssembly.instantiate(bytes, imports);",
            "const url = URL.createObjectURL(new Blob([script], { type: 'text/javascript' }));",
            "const url = window.URL.createObjectURL(blob);",
            'const instance = await window["WebAssembly"]["instantiate"](bytes, imports);',
            'const url = globalThis["URL"]["createObjectURL"](blob);',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_bracket_access_browser_persistence_and_context_aliases(self):
        for source in [
            'const db = await globalThis["indexedDB"]["open"]("concierge-raw-transcripts");',
            'await window["indexedDB"]["deleteDatabase"]("concierge-proof-cache");',
            'const channel = new globalThis["BroadcastChannel"]("concierge-proof");',
            'const channel = new window["MessageChannel"]();',
            'history.pushState({ proof: secretProofJson }, "", "/review");',
            'window.history.replaceState({ prompt: rawPromptText }, "", "/turn");',
            'window["history"]["pushState"]({ proof: secretProofJson }, "", "/review");',
            'globalThis["history"]["replaceState"]({ prompt: rawPromptText }, "", "/turn");',
            "window.name = secretProofJson;",
            'globalThis["name"] = rawPromptText;',
            'localStorage.setItem("rawPrompt", rawPromptText);',
            'localStorage.getItem("rawPrompt");',
            'window.sessionStorage.setItem("secretProof", secretProofJson);',
            'window.sessionStorage.getItem("secretProof");',
            'globalThis["localStorage"]["setItem"]("token", bridgeToken);',
            'globalThis["localStorage"]["getItem"]("token");',
            'window["sessionStorage"]["setItem"]("responseText", responseText);',
            'window["sessionStorage"]["getItem"]("responseText");',
            "localStorage.rawPrompt = rawPromptText;",
            'window.sessionStorage["secretProof"] = secretProofJson;',
            'globalThis["localStorage"].bridgeToken = bridgeToken;',
            'window["sessionStorage"]["responseText"] = responseText;',
            "delete localStorage.rawPrompt;",
            'delete window.sessionStorage["secretProof"];',
            'delete globalThis["localStorage"].bridgeToken;',
            'delete window["sessionStorage"]["responseText"];',
            'localStorage.removeItem("bridge_readiness_proof");',
            "window.sessionStorage.clear();",
            'globalThis["localStorage"]["removeItem"]("napoleon_descriptor");',
            'window["sessionStorage"]["clear"]();',
            'await window["navigator"]["clipboard"]["writeText"](secretProofJson);',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_peer_transport_side_channels(self):
        for source in [
            "const peer = new RTCPeerConnection({ iceServers: [] });",
            "const peer = new webkitRTCPeerConnection({ iceServers: [] });",
            'const transport = new WebTransport("https://api.example.test/session");',
            'const peer = new window["RTCPeerConnection"]({ iceServers: [] });',
            'const peer = new globalThis["webkitRTCPeerConnection"]({ iceServers: [] });',
            'const transport = new window["WebTransport"]("https://api.example.test/session");',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_privileged_browser_device_account_and_payment_side_channels(self):
        for source in [
            "await navigator.usb.requestDevice({ filters: [] });",
            "await navigator.serial.requestPort();",
            "await navigator.hid.requestDevice({ filters: [] });",
            "await navigator.bluetooth.requestDevice({ acceptAllDevices: true });",
            "await navigator.credentials.get({ password: true });",
            'await navigator.permissions.query({ name: "camera" });',
            'await window.navigator.permissions.query({ name: "geolocation" });',
            "navigator.geolocation.getCurrentPosition(onPosition);",
            "const watchId = navigator.geolocation.watchPosition(onPosition);",
            'await Notification.requestPermission();',
            "await registration.pushManager.subscribe(options);",
            "const request = new PaymentRequest(methods, details);",
            'await navigator["usb"]["requestDevice"]({ filters: [] });',
            'await window["navigator"]["credentials"]["get"]({ password: true });',
            'await navigator["permissions"]["query"]({ name: "microphone" });',
            'await window["navigator"]["permissions"]["query"]({ name: "camera" });',
            'window["navigator"]["geolocation"]["getCurrentPosition"](onPosition);',
            'navigator["geolocation"]["watchPosition"](onPosition);',
            'await window["Notification"]["requestPermission"]();',
            'await registration["pushManager"]["subscribe"](options);',
            'const request = new window["PaymentRequest"](methods, details);',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_worker_bypass_entry_points(self):
        for source in [
            'const worker = new Worker(new URL("./remoteServiceWorker.ts", import.meta.url));',
            'const worker = new SharedWorker("/service-worker.js");',
            'importScripts("https://api.example.test/hidden-service.js");',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_remote_code_import_side_channels(self):
        for source in [
            'import "https://api.example.test/hidden-module.js";',
            'import remoteModule from "https://api.example.test/hidden-module.js";',
            'await import("https://api.example.test/hidden-module.js");',
            'await import("data:text/javascript,fetch(`https://api.example.test/send`)");',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_service_worker_registration(self):
        for source in [
            'await navigator.serviceWorker.register("/hidden-service-worker.js");',
            'await window.navigator.serviceWorker.register(new URL("./serviceWorker.ts", import.meta.url));',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_external_navigation_and_share_side_channels(self):
        for source in [
            'window.open("https://api.example.test/export", "_blank");',
            'window.location.href = "mailto:team@example.test?body=secret";',
            'location.assign("https://api.example.test/send");',
            'document.location.replace("https://api.example.test/audit");',
            'await navigator.share({ text: "send this outside Concierge" });',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_external_post_message_side_channels(self):
        for source in [
            'window.postMessage({ payload }, "https://api.example.test");',
            'parent.postMessage(payload, "*");',
            'otherWindow.postMessage(payload, "mailto:team@example.test");',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_browser_cross_context_side_channels(self):
        for source in [
            'window.postMessage({ proof }, window.location.origin);',
            'const channel = new BroadcastChannel("concierge-proof"); channel.postMessage(proof);',
            "const channel = new MessageChannel(); channel.port1.postMessage(secretProofJson);",
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_clipboard_side_channels(self):
        for source in [
            "await navigator.clipboard.writeText(secretProofJson);",
            "await window.navigator.clipboard.write([new ClipboardItem(data)]);",
            "const copied = await navigator.clipboard.readText();",
            'await navigator.clipboard["writeText"](secretProofJson);',
            'await navigator["clipboard"]["readText"]();',
            'document.execCommand("copy");',
            "document.execCommand('paste');",
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_direct_location_assignment_side_channels(self):
        for source in [
            'window.location = "https://api.example.test/export";',
            'document.location = "https://api.example.test/audit";',
            'location = "mailto:team@example.test?body=secret";',
            "location = outboundUrl;",
            "window.location = outboundUrl;",
            "document.location = outboundUrl;",
            "globalThis.location = outboundUrl;",
            'window["location"] = outboundUrl;',
            'globalThis["location"] = outboundUrl;',
            'window.location["href"] = "https://api.example.test/send";',
            'document.location["href"] = "mailto:team@example.test?body=secret";',
            'window.location["href"] = outboundUrl;',
            'window["location"]["href"] = outboundUrl;',
            'location["assign"](outboundUrl);',
            'window.location["replace"](outboundUrl);',
            'globalThis["location"]["assign"](outboundUrl);',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_static_external_link_and_form_targets(self):
        for source in [
            '<a href="https://api.example.test/export">Export</a>',
            '<a href="mailto:team@example.test?body=secret">Email</a>',
            '<form action="https://api.example.test/send" method="post">',
            '<button formAction="https://api.example.test/send">Send</button>',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.tsx", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_programmatic_form_submission_side_channels(self):
        for source in [
            "form.submit();",
            "form.requestSubmit();",
            "document.forms[0].submit();",
            'form["submit"]();',
            'form["requestSubmit"]();',
            "HTMLFormElement.prototype.submit.call(form);",
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.tsx", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_programmatic_click_side_channels(self):
        for source in [
            "anchor.click();",
            "downloadLink.click();",
            "submitButton.click();",
            'anchor["click"]();',
            "HTMLAnchorElement.prototype.click.call(anchor);",
            "HTMLButtonElement.prototype.click.call(submitButton);",
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.tsx", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_static_external_resource_targets(self):
        for source in [
            '<img src="https://api.example.test/pixel.gif" alt="">',
            '<script src="https://api.example.test/hidden.js"></script>',
            '<iframe src="https://api.example.test/widget"></iframe>',
            '<link rel="stylesheet" href="https://api.example.test/hidden.css">',
            '<source srcSet="https://api.example.test/audio.mp3 1x">',
            '<div style={{ backgroundImage: "url(https://api.example.test/pixel.gif)" }} />',
            '@import url("https://api.example.test/hidden.css");',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.tsx", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_case_variant_external_targets(self):
        for source in [
            '<source srcset="https://api.example.test/audio.mp3 1x">',
            '<button formaction="https://api.example.test/send">Send</button>',
            '<svg><use xlink:href="https://api.example.test/icons.svg#send"></use></svg>',
            'button["formaction"] = "https://api.example.test/send";',
            'source.setAttribute("srcset", "https://api.example.test/audio.mp3 1x");',
            'use.setAttribute("xlink:href", "https://api.example.test/icons.svg#send");',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.tsx", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_external_image_srcset_targets(self):
        for source in [
            '<link rel="preload" as="image" imageSrcSet="https://api.example.test/hero.png 1x">',
            '<link rel="preload" as="image" imagesrcset="https://api.example.test/hero.png 1x">',
            'link.imageSrcSet = "https://api.example.test/hero.png 1x";',
            'link["imagesrcset"] = "https://api.example.test/hero.png 1x";',
            'link.setAttribute("imagesrcset", "https://api.example.test/hero.png 1x");',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.tsx", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_external_object_data_targets(self):
        for source in [
            '<object data="https://api.example.test/widget.html"></object>',
            '<embed data="https://api.example.test/plugin.html">',
            'objectElement.data = "https://api.example.test/widget.html";',
            'embedElement["data"] = "https://api.example.test/plugin.html";',
            'objectElement.setAttribute("data", "https://api.example.test/widget.html");',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.tsx", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_static_external_redirect_and_ping_targets(self):
        for source in [
            '<a href="/local-proof" ping="https://api.example.test/audit">Proof</a>',
            '<meta http-equiv="refresh" content="0; url=https://api.example.test/redirect">',
            '<meta httpEquiv="refresh" content="0;URL=https://api.example.test/redirect">',
            '<meta content="0; url=https://api.example.test/redirect" http-equiv="refresh">',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.tsx", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_dynamic_external_target_assignments(self):
        for source in [
            'image.src = "https://api.example.test/pixel.gif";',
            'script.src = "https://api.example.test/hidden.js";',
            'frame.src = "https://api.example.test/widget";',
            'link.href = "https://api.example.test/hidden.css";',
            'form.action = "https://api.example.test/send";',
            'button.formAction = "https://api.example.test/send";',
            'anchor.ping = "https://api.example.test/audit";',
            'image["src"] = "https://api.example.test/pixel.gif";',
            'link.setAttribute("href", "https://api.example.test/hidden.css");',
            'form.setAttribute("action", "https://api.example.test/send");',
            'anchor.setAttribute("ping", "https://api.example.test/audit");',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.tsx", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_detects_dynamic_html_injection_side_channels(self):
        for source in [
            '<div dangerouslySetInnerHTML={{ __html: remoteMarkup }} />',
            "container.innerHTML = remoteMarkup;",
            "container.outerHTML = remoteMarkup;",
            'container.insertAdjacentHTML("beforeend", remoteMarkup);',
            "new DOMParser().parseFromString(remoteMarkup, 'text/html');",
            "range.createContextualFragment(remoteMarkup);",
            '<iframe srcDoc={remoteMarkup} />',
            'container["innerHTML"] = remoteMarkup;',
            'container["outerHTML"] = remoteMarkup;',
            'container["insertAdjacentHTML"]("beforeend", remoteMarkup);',
            'new window["DOMParser"]().parseFromString(remoteMarkup, "text/html");',
            'range["createContextualFragment"](remoteMarkup);',
            '<iframe srcdoc={remoteMarkup} />',
            "document.write(remoteMarkup);",
            "document.writeln(remoteMarkup);",
            'document["write"](remoteMarkup);',
            'document["writeln"](remoteMarkup);',
            "HTMLDocument.prototype.write.call(document, remoteMarkup);",
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/randomService.tsx", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_media_scanner_detects_hidden_capture_speech_and_playback(self):
        for source in [
            "await navigator.mediaDevices.getUserMedia({ audio: true });",
            "const audio = new AudioContext();",
            "const speech = new SpeechRecognition();",
            "window.speechSynthesis.speak(utterance);",
            "await clip.play();",
            'await navigator.mediaDevices["getUserMedia"]({ audio: true });',
            'const audio = new window["AudioContext"]();',
            'const speech = new globalThis["SpeechRecognition"]();',
            'window["speechSynthesis"]["speak"](utterance);',
            'await clip["play"]();',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_hidden_media_or_speech_text("app/src/hiddenCapture.ts", source)

                self.assertTrue(violations)
                self.assertIn("hidden media capture or speech/playback API", violations[0])

    def test_media_scanner_allows_visible_permission_handlers(self):
        violations = validate_repo.scan_hidden_media_or_speech_text(
            "app/src/App.tsx",
            """
            async function requestCameraPermission() {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
              for (const track of stream.getTracks()) track.stop();
            }
            async function requestMicrophonePermission() {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
              for (const track of stream.getTracks()) track.stop();
            }
            """,
        )

        self.assertEqual(violations, [])

    def test_network_scanner_allows_named_bridge_modules(self):
        violations = validate_repo.scan_ungoverned_network_text(
            "app/src/napoleonBridge.ts",
            """
            const fetcher = dependencies.fetch ?? globalThis.fetch.bind(globalThis);
            await fetcher(resolveNapoleonBridgeOperation(endpoint, "text_turn"), {
              method: "POST",
              body: JSON.stringify(payload),
            });
            """,
        )

        self.assertEqual(violations, [])

    def test_network_scanner_rejects_direct_urls_inside_bridge_modules(self):
        for source in [
            'await fetcher("https://api.example.test/v1/concierge/turn", { method: "POST" });',
            'await fetcher(endpoint + "/v1/custom-service", { method: "POST" });',
            'await fetcher(`${endpoint}/v1/concierge/freeform`, { method: "POST" });',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/napoleonBridge.ts", source)

                self.assertTrue(violations)
                self.assertIn("bridge module network call must use named generated operation resolution", violations[0])

    def test_network_scanner_rejects_browser_storage_mutation_inside_bridge_modules(self):
        for source in [
            'localStorage.setItem("rawPrompt", rawPromptText);',
            'localStorage.getItem("napoleon_endpoint");',
            "localStorage.rawPrompt = rawPromptText;",
            "delete localStorage.rawPrompt;",
            'window.sessionStorage.removeItem("bridge_readiness_proof");',
            'window["sessionStorage"]["responseText"] = responseText;',
            'delete window["sessionStorage"]["responseText"];',
            'globalThis["localStorage"]["setItem"]("token", bridgeToken);',
            'globalThis["localStorage"]["getItem"]("napoleon_auth_token");',
            'window["sessionStorage"]["clear"]();',
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/napoleonBridge.ts", source)

                self.assertTrue(violations)
                self.assertIn("ungoverned network call outside Napoleon bridge modules", violations[0])

    def test_network_scanner_rejects_unapproved_browser_storage_keys_inside_bounded_modules(self):
        for source in [
            'localStorage.setItem("raw_prompt_cache", rawPromptText);',
            'localStorage.getItem("raw_prompt_cache");',
            'localStorage.removeItem("bridge_readiness_proof");',
            'storage.setItem("concierge_raw_transcript_v1", rawTranscript);',
            'storage.getItem("concierge_raw_transcript_v1");',
            'storage.removeItem("napoleon_descriptor_token_cache");',
            """
            const RAW_PROMPT_CACHE_KEY = "raw_prompt_cache";
            storage.setItem(RAW_PROMPT_CACHE_KEY, rawPromptText);
            """,
            """
            const RAW_PROMPT_CACHE_KEY = "raw_prompt_cache";
            storage.getItem(RAW_PROMPT_CACHE_KEY);
            """,
            """
            const BRIDGE_PROOF_CACHE_KEY = "bridge_readiness_proof";
            localStorage.removeItem(BRIDGE_PROOF_CACHE_KEY);
            """,
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/App.tsx", source)

                self.assertTrue(violations)
                self.assertIn("unapproved browser storage key", violations[0])

    def test_network_scanner_allows_approved_browser_storage_keys_inside_bounded_modules(self):
        for source in [
            'localStorage.setItem("napoleon_endpoint", value.trim());',
            'localStorage.removeItem("napoleon_auth_token");',
            'localStorage.setItem("concierge_camera_enabled", String(enabled));',
            'localStorage.getItem("concierge_camera_enabled");',
            'storage.setItem("concierge_telemetry_buffer_v1", JSON.stringify(next));',
            'storage.removeItem("concierge_capability_taxonomy_v1");',
            """
            const TELEMETRY_BUFFER_STORAGE_KEY = "concierge_telemetry_buffer_v1";
            storage.setItem(TELEMETRY_BUFFER_STORAGE_KEY, JSON.stringify(next));
            """,
            """
            const TELEMETRY_BUFFER_STORAGE_KEY = "concierge_telemetry_buffer_v1";
            storage.getItem(TELEMETRY_BUFFER_STORAGE_KEY);
            """,
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/App.tsx", source)

                self.assertEqual(violations, [])

        for source in [
            'localStorage.getItem("napoleon_endpoint");',
            """
            const NAPOLEON_AUTH_TOKEN_STORAGE_KEY = "napoleon_auth_token";
            localStorage.getItem(NAPOLEON_AUTH_TOKEN_STORAGE_KEY);
            """,
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/connectionStorage.ts", source)

                self.assertEqual(violations, [])

    def test_network_scanner_allows_bridge_modules_to_fetch_named_operation_targets(self):
        for source in [
            """
            const targetEndpoint = resolveNapoleonBridgeOperation(endpoint, "text_turn");
            response = await fetcher(targetEndpoint, { method: "POST" });
            """,
            """
            response = await fetcher(resolveNapoleonBridgeOperation(endpoint, "chief_of_staff_descriptor"), {
              method: "GET",
            });
            """,
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_ungoverned_network_text("app/src/descriptorDiscovery.ts", source)

                self.assertEqual(violations, [])

    def test_scanner_allows_governed_bridge_and_proposal_language(self):
        violations = validate_repo.scan_authority_boundary_text(
            "app/src/memoryProposalSubmission.ts",
            """
            const blockedEffects = ["memory_write", "agent_dispatch", "external_send"];
            const memoryWritePerformed = false;
            const agentDispatchAllowed = false;
            const response = await fetch(resolveNapoleonBridgeOperation("memory_proposal_review").url);
            """,
        )

        self.assertEqual(violations, [])


if __name__ == "__main__":
    unittest.main()
