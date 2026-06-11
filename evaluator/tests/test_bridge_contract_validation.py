import unittest

from scripts import validate_repo


class BridgeContractValidationTest(unittest.TestCase):
    def test_bridge_operation_registry_matches_openapi_paths(self):
        operations = validate_repo.load_bridge_operations()
        openapi_paths = validate_repo.load_openapi_concierge_paths()

        self.assertEqual(
            sorted(operation["path"] for operation in operations),
            sorted(openapi_paths),
        )

    def test_bridge_operation_request_kinds_match_openapi_consts(self):
        request_kinds = validate_repo.load_openapi_request_kinds()
        operations = validate_repo.load_bridge_operations()

        for operation in operations:
            with self.subTest(operation=operation["id"]):
                if operation["id"] == "chief_of_staff_descriptor":
                    continue
                self.assertEqual(operation["requestKind"], request_kinds[operation["path"]])

    def test_governed_bridge_operations_require_bearer_security(self):
        security = validate_repo.load_openapi_bearer_security()
        operations = validate_repo.load_bridge_operations()

        for operation in operations:
            with self.subTest(operation=operation["id"]):
                self.assertTrue(operation["governedBridgeOnly"])
                self.assertEqual(operation["tokenPlacement"], "authorization_header_only")
                self.assertTrue(security[operation["path"]])

    def test_bridge_callers_use_named_operations_not_freeform_paths(self):
        offenders = validate_repo.find_freeform_bridge_path_callers()

        self.assertEqual(offenders, [])


if __name__ == "__main__":
    unittest.main()
