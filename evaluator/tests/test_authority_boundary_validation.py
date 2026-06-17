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

    def test_scanner_detects_direct_process_execution(self):
        violations = validate_repo.scan_authority_boundary_text(
            "app/src-tauri/src/main.rs",
            'let child = std::process::Command::new("osascript").spawn();',
        )

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
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_authority_boundary_text("app/src/router.ts", source)

                self.assertTrue(violations)
                self.assertIn("direct agent or tool dispatch", violations[0])

    def test_scanner_detects_direct_tauri_native_bridge_access(self):
        for source in [
            'import { invoke } from "@tauri-apps/api/core";',
            'await invoke("write_memory", payload);',
            "#[tauri::command]\nfn write_memory() {}",
        ]:
            with self.subTest(source=source):
                violations = validate_repo.scan_authority_boundary_text("app/src/nativeBridge.ts", source)

                self.assertTrue(violations)
                self.assertIn("direct Tauri native bridge access", violations[0])

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

    def test_media_scanner_detects_hidden_capture_speech_and_playback(self):
        for source in [
            "await navigator.mediaDevices.getUserMedia({ audio: true });",
            "const audio = new AudioContext();",
            "const speech = new SpeechRecognition();",
            "window.speechSynthesis.speak(utterance);",
            "await clip.play();",
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
