import unittest

from scripts import validate_repo


class AuthorityBoundaryValidationTest(unittest.TestCase):
    def test_current_runtime_sources_do_not_call_authority_systems_directly(self):
        violations = validate_repo.find_direct_authority_boundary_violations()

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
