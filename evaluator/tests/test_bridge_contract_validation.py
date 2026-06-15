import copy
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

    def test_sample_text_turn_response_matches_openapi_response_contract(self):
        response = validate_repo.load_json("examples/sample_text_turn_response.json")
        schema = validate_repo.load_openapi_response_schema("/v1/concierge/turn", "200")

        validate_repo.validate_openapi_instance(schema, response)

    def test_sample_text_turn_response_provenance_is_internally_consistent(self):
        response = validate_repo.load_json("examples/sample_text_turn_response.json")

        validate_repo.validate_bridge_response_provenance(response)

    def test_sample_memory_proposal_response_matches_openapi_response_contract(self):
        response = validate_repo.load_json("examples/sample_memory_proposal_response.json")
        schema = validate_repo.load_openapi_response_schema("/v1/concierge/memory-proposals", "200")

        validate_repo.validate_openapi_instance(schema, response)
        validate_repo.validate_bridge_response_provenance(response)

    def test_sample_child_memory_proposal_response_matches_openapi_response_contract(self):
        response = validate_repo.load_json("examples/sample_child_memory_proposal_response.json")
        schema = validate_repo.load_openapi_response_schema("/v1/concierge/memory-proposals", "200")

        validate_repo.validate_openapi_instance(schema, response)
        validate_repo.validate_bridge_response_provenance(response)
        validate_repo.validate_child_memory_response_boundary(response)

    def test_sample_chief_of_staff_steering_response_matches_openapi_response_contract(self):
        response = validate_repo.load_json("examples/sample_chief_of_staff_steering_response.json")
        schema = validate_repo.load_openapi_response_schema("/v1/concierge/chief-of-staff/steering", "200")

        validate_repo.validate_openapi_instance(schema, response)
        validate_repo.validate_bridge_response_provenance(response)

    def test_sample_child_chief_of_staff_steering_response_matches_openapi_response_contract(self):
        response = validate_repo.load_json("examples/sample_child_chief_of_staff_steering_response.json")
        schema = validate_repo.load_openapi_response_schema("/v1/concierge/chief-of-staff/steering", "200")

        validate_repo.validate_openapi_instance(schema, response)
        validate_repo.validate_bridge_response_provenance(response)
        validate_repo.validate_child_steering_response_boundary(response)

    def test_sample_governance_review_response_matches_openapi_response_contract(self):
        response = validate_repo.load_json("examples/sample_governance_review_response.json")
        schema = validate_repo.load_openapi_response_schema("/v1/concierge/chief-of-staff/steering", "200")

        validate_repo.validate_openapi_instance(schema, response)
        validate_repo.validate_bridge_response_provenance(response)
        validate_repo.validate_governance_review_response_boundary(response)

    def test_sample_taxonomy_review_response_matches_openapi_response_contract(self):
        response = validate_repo.load_json("examples/sample_chief_of_staff_taxonomy_review_response.json")
        schema = validate_repo.load_openapi_response_schema("/v1/concierge/chief-of-staff/steering", "200")

        validate_repo.validate_openapi_instance(schema, response)
        validate_repo.validate_bridge_response_provenance(response)
        validate_repo.validate_taxonomy_review_response_boundary(response)

    def test_sample_child_taxonomy_review_response_matches_openapi_response_contract(self):
        response = validate_repo.load_json("examples/sample_child_chief_of_staff_taxonomy_review_response.json")
        schema = validate_repo.load_openapi_response_schema("/v1/concierge/chief-of-staff/steering", "200")

        validate_repo.validate_openapi_instance(schema, response)
        validate_repo.validate_bridge_response_provenance(response)
        validate_repo.validate_child_taxonomy_review_response_boundary(response)

    def test_governed_review_responses_carry_explicit_false_side_effect_boundaries(self):
        examples = [
            "examples/sample_memory_proposal_response.json",
            "examples/sample_child_memory_proposal_response.json",
            "examples/sample_chief_of_staff_steering_response.json",
            "examples/sample_child_chief_of_staff_steering_response.json",
            "examples/sample_governance_review_response.json",
            "examples/sample_chief_of_staff_taxonomy_review_response.json",
            "examples/sample_child_chief_of_staff_taxonomy_review_response.json",
        ]
        required_false_fields = [
            "memoryWritePerformed",
            "approvalCaptured",
            "agentDispatchPerformed",
            "externalSendPerformed",
        ]

        for example_path in examples:
            response = validate_repo.load_json(example_path)
            with self.subTest(example=example_path):
                for field in required_false_fields:
                    self.assertIn(field, response)
                    self.assertFalse(response[field])

    def test_response_validator_rejects_text_turn_side_effect_claims(self):
        response = validate_repo.load_json("examples/sample_text_turn_response.json")
        unsafe_response = copy.deepcopy(response)
        unsafe_response["memoryWritePerformed"] = True

        with self.assertRaises(SystemExit):
            validate_repo.validate_bridge_response_provenance(unsafe_response)

    def test_response_validator_rejects_memory_review_side_effect_claims(self):
        response = validate_repo.load_json("examples/sample_memory_proposal_response.json")
        unsafe_response = copy.deepcopy(response)
        unsafe_response["approvalCaptured"] = True

        with self.assertRaises(SystemExit):
            validate_repo.validate_bridge_response_provenance(unsafe_response)

    def test_response_validator_rejects_steering_local_application_claims(self):
        response = validate_repo.load_json("examples/sample_chief_of_staff_steering_response.json")
        unsafe_response = copy.deepcopy(response)
        unsafe_response["appliedLocally"] = True

        with self.assertRaises(SystemExit):
            validate_repo.validate_bridge_response_provenance(unsafe_response)

    def test_sample_memory_proposal_request_matches_openapi_request_contract(self):
        request = validate_repo.load_json("examples/sample_memory_proposal_request.json")
        schema = validate_repo.load_openapi_request_schema("/v1/concierge/memory-proposals")

        validate_repo.validate_openapi_instance(schema, request)
        validate_repo.validate_proposal_only_request_boundary(request)

    def test_sample_child_memory_proposal_request_matches_openapi_request_contract(self):
        request = validate_repo.load_json("examples/sample_child_memory_proposal_request.json")
        schema = validate_repo.load_openapi_request_schema("/v1/concierge/memory-proposals")

        validate_repo.validate_openapi_instance(schema, request)
        validate_repo.validate_proposal_only_request_boundary(request)

    def test_sample_chief_of_staff_steering_request_matches_openapi_request_contract(self):
        request = validate_repo.load_json("examples/sample_chief_of_staff_steering_request.json")
        schema = validate_repo.load_openapi_request_schema("/v1/concierge/chief-of-staff/steering")

        validate_repo.validate_openapi_instance(schema, request)
        validate_repo.validate_proposal_only_request_boundary(request)

    def test_sample_child_chief_of_staff_steering_request_matches_openapi_request_contract(self):
        request = validate_repo.load_json("examples/sample_child_chief_of_staff_steering_request.json")
        schema = validate_repo.load_openapi_request_schema("/v1/concierge/chief-of-staff/steering")

        validate_repo.validate_openapi_instance(schema, request)
        validate_repo.validate_proposal_only_request_boundary(request)

    def test_proposal_only_request_validator_rejects_nested_memory_write_claim(self):
        request = validate_repo.load_json("examples/sample_memory_proposal_request.json")
        unsafe_request = copy.deepcopy(request)
        unsafe_request["memoryProposal"]["memoryWriteAllowed"] = True

        with self.assertRaises(SystemExit):
            validate_repo.validate_proposal_only_request_boundary(unsafe_request)

    def test_proposal_only_request_validator_rejects_child_memory_without_guardian_review(self):
        request = validate_repo.load_json("examples/sample_child_memory_proposal_request.json")
        unsafe_request = copy.deepcopy(request)
        unsafe_request["memoryProposal"]["guardianReviewRequired"] = False

        with self.assertRaises(SystemExit):
            validate_repo.validate_proposal_only_request_boundary(unsafe_request)

    def test_proposal_only_request_validator_rejects_nested_steering_dispatch_claim(self):
        request = validate_repo.load_json("examples/sample_chief_of_staff_steering_request.json")
        unsafe_request = copy.deepcopy(request)
        unsafe_request["recommendation"]["agentDispatchAllowed"] = True

        with self.assertRaises(SystemExit):
            validate_repo.validate_proposal_only_request_boundary(unsafe_request)

    def test_proposal_only_request_validator_rejects_child_steering_without_child_safety_caution(self):
        request = validate_repo.load_json("examples/sample_child_chief_of_staff_steering_request.json")
        unsafe_request = copy.deepcopy(request)
        unsafe_request["recommendation"]["childSafetyCaution"] = False

        with self.assertRaises(SystemExit):
            validate_repo.validate_proposal_only_request_boundary(unsafe_request)


if __name__ == "__main__":
    unittest.main()
