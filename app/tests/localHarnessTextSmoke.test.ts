import assert from "node:assert/strict";
import test from "node:test";
import {
  runLocalHarnessChildRequiredActionSmoke,
  runLocalHarnessContractPacketSmoke,
  runLocalHarnessTextSmoke,
} from "../src/localHarnessSmoke.js";

function harnessJsonResponse(status: number, payload: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

test("smoke tests a governed text turn through a local Napoleon-compatible harness", async () => {
  const result = await runLocalHarnessTextSmoke({
    endpoint: "http://127.0.0.1:8787",
    message: "Draft a bridge readiness summary",
    profile: "adult_owner",
    fetch: async (url, init) => {
      if (url === "http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor") {
        return harnessJsonResponse(200, {
          descriptor: {
            schemaVersion: "napoleon/concierge/chief-of-staff-service/v1",
            serviceId: "napoleon.chief_of_staff",
            runtimeAuthority: false,
            commandExecution: false,
            cachePolicy: "fail_closed_to_review_required",
            blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "external_send"],
          },
          checksum: { expected: "sha256:smoke", actual: "sha256:smoke" },
          signature: { valid: true },
        });
      }

      assert.equal(url, "http://127.0.0.1:8787/v1/concierge/turn");
      assert.equal(init?.method, "POST");
      const body = JSON.parse(init?.body ?? "{}") as {
        traceId: string;
        profileMode: string;
        chiefOfStaffRequest: { request_id: string };
      };
      assert.equal(body.profileMode, "adult_owner");
      const traceId = body.traceId;
      const requestId = body.chiefOfStaffRequest.request_id;

      return harnessJsonResponse(200, {
        text: "Napoleon recommends keeping this as a governed review draft. Passive Brain found bridge context.",
        profileMode: body.profileMode,
        governanceDecision: {
          decision_id: `decision_${traceId}`,
          request_id: requestId,
          outcome: "requires_review",
          authority_tier: "advisory_review",
          approval_requirement: "chief_of_staff_and_owner_review",
          rationale: "Local harness requires governed review.",
          blocked_effects: ["memory_write", "approval_capture", "external_send", "agent_dispatch"],
          trace_id: traceId,
          audit_id: `audit_${traceId}`,
        },
        traceEnvelope: {
          trace_id: traceId,
          parent_trace_id: "local_harness",
          actor_id: "napoleon.local_harness",
          request_id: requestId,
          decision_id: `decision_${traceId}`,
          timestamp: "2026-06-12T00:00:00.000Z",
        },
        auditEnvelope: {
          audit_id: `audit_${traceId}`,
          trace_id: traceId,
          decision_id: `decision_${traceId}`,
          actor_id: "napoleon.local_harness",
          authority_tier: "advisory_review",
          approval_requirement: "chief_of_staff_and_owner_review",
          evidence_links: [`trace:${traceId}`, "harness:local"],
        },
        delegation: {
          selectedAgents: [
            {
              agentId: "passive_brain",
              displayName: "Passive Brain",
              selectionReason: "Prior bridge context is relevant to the request.",
              contributionSummary: "bridge context",
            },
          ],
          allowedEffects: ["prepare_advisory_response"],
          blockedEffects: ["memory_write", "approval_capture", "external_send", "agent_dispatch"],
          governanceState: "requires_review",
          traceId,
          auditId: `audit_${traceId}`,
        },
        recommendationProvenance: {
          summary: "keeping this as a governed review draft",
          traceId,
          auditId: `audit_${traceId}`,
        },
      });
    },
  });

  assert.equal(result.descriptorConnection.state, "ready");
  if (result.status !== "success") {
    throw new Error(`Expected success smoke result, got ${result.status}`);
  }
  assert.equal(result.response.governanceDecision.outcome, "requires_review");
  assert.equal(result.delegationView.heading, "Napoleon delegation");
  assert.ok(result.delegationView.body.includes("Passive Brain"));
  assert.equal(result.proofView.heading, "Last successful Napoleon proof");
  assert.equal(result.proofView.status, "verified");
  assert.ok(result.proofView.summary.includes("Passive Brain"));
  assert.ok(result.proofView.summary.includes("Napoleon recommendation"));
  assert.ok(result.proofView.caveat.includes("not Napoleon approval"));
  assert.ok(
    result.proofView.details.some(
      (detail) => detail.label === "Blocked effects" && detail.value.includes("memory_write"),
    ),
  );
  assert.ok(
    result.delegationView.details.some(
      (detail) => detail.label === "Blocked effects" && detail.value.includes("memory_write"),
    ),
  );
  assert.equal(result.readiness.captureState, "passed");
  assert.equal(result.readiness.comparisonState, "passed");
  assert.equal(result.liveBridgeReadiness.status, "warning");
  assert.equal(result.liveBridgeReadiness.canSendLive, true);
  assert.ok(result.liveBridgeReadiness.summary.includes("real Napoleon runtime validation has not been proven"));
  assert.ok(
    result.liveBridgeReadiness.details.some(
      (detail) =>
        detail.label === "Runtime validation" &&
        detail.value === "Local harness only; not real Napoleon runtime validation",
    ),
  );
  assert.ok(result.liveBridgeReadiness.blockedEffects.includes("memory_write"));
});

test("smoke tests governed contract packet submissions through a local Napoleon-compatible harness", async () => {
  const requestedUrls: string[] = [];
  const result = await runLocalHarnessContractPacketSmoke({
    endpoint: "http://127.0.0.1:8787",
    message: "Prepare a bridge review request for Napoleon",
    profile: "adult_owner",
    fetch: async (url, init) => {
      requestedUrls.push(url);
      if (url === "http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor") {
        return harnessJsonResponse(200, {
          descriptor: {
            schemaVersion: "napoleon/concierge/chief-of-staff-service/v1",
            serviceId: "napoleon.chief_of_staff",
            runtimeAuthority: false,
            commandExecution: false,
            cachePolicy: "fail_closed_to_review_required",
            blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "external_send"],
            supportedHandoffs: ["chief_of_staff_request", "governance_evaluation"],
          },
          checksum: { expected: "sha256:smoke", actual: "sha256:smoke" },
          signature: { valid: true },
        });
      }

      assert.equal(init?.method, "POST");
      const body = JSON.parse(init?.body ?? "{}") as {
        requestKind: string;
        bridgeTargetPath: string;
        traceEnvelope: { trace_id: string; parent_trace_id: string; request_id: string };
      };
      const isGovernance = url === "http://127.0.0.1:8787/governance/evaluate";
      assert.ok(isGovernance || url === "http://127.0.0.1:8787/chief-of-staff/requests");
      assert.equal(body.bridgeTargetPath, isGovernance ? "/governance/evaluate" : "/chief-of-staff/requests");
      assert.equal(
        body.requestKind,
        isGovernance ? "governance_evaluation_handoff" : "chief_of_staff_request_handoff",
      );

      return harnessJsonResponse(200, {
        text: isGovernance
          ? "Napoleon evaluated the governance packet as review-only evidence."
          : "Napoleon received the Chief of Staff request packet for review.",
        governanceDecision: {
          decision_id: isGovernance ? "decision_governance_packet_smoke" : "decision_cos_packet_smoke",
          request_id: body.traceEnvelope.request_id,
          outcome: "requires_review",
          authority_tier: "advisory_review",
          approval_requirement: "chief_of_staff_and_owner_review",
          rationale: isGovernance
            ? "Governance packet evidence remains non-authorizing."
            : "Chief of Staff request packet remains review-only.",
          blocked_effects: ["memory_write", "approval_capture", "external_send", "agent_dispatch"],
          trace_id: body.traceEnvelope.trace_id,
          audit_id: isGovernance ? "audit_governance_packet_smoke" : "audit_cos_packet_smoke",
        },
        traceEnvelope: {
          trace_id: body.traceEnvelope.trace_id,
          parent_trace_id: body.traceEnvelope.parent_trace_id,
          actor_id: isGovernance ? "napoleon.governance" : "napoleon.chief_of_staff",
          request_id: body.traceEnvelope.request_id,
          decision_id: isGovernance ? "decision_governance_packet_smoke" : "decision_cos_packet_smoke",
          timestamp: "2026-06-24T00:00:00.000Z",
        },
        auditEnvelope: {
          audit_id: isGovernance ? "audit_governance_packet_smoke" : "audit_cos_packet_smoke",
          trace_id: body.traceEnvelope.trace_id,
          decision_id: isGovernance ? "decision_governance_packet_smoke" : "decision_cos_packet_smoke",
          actor_id: isGovernance ? "napoleon.governance" : "napoleon.chief_of_staff",
          authority_tier: "advisory_review",
          approval_requirement: "chief_of_staff_and_owner_review",
          evidence_links: [`trace:${body.traceEnvelope.trace_id}`, "harness:local"],
        },
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        routingPerformed: false,
        registryUpdatePerformed: false,
        traceAppendPerformed: false,
        governanceOverrideApplied: false,
        appliedLocally: false,
      });
    },
  });

  assert.equal(result.status, "success");
  assert.equal(result.descriptorConnection.state, "ready");
  assert.equal(result.chiefOfStaffRequestResult.governanceDecision.outcome, "requires_review");
  assert.equal(result.governanceEvaluationResult.governanceDecision.outcome, "requires_review");
  assert.equal(result.chiefOfStaffRequestResult.appliedLocally, false);
  assert.equal(result.governanceEvaluationResult.appliedLocally, false);
  assert.equal(result.chiefOfStaffRequestResult.memoryWritePerformed, false);
  assert.equal(result.governanceEvaluationResult.memoryWritePerformed, false);
  assert.equal(result.chiefOfStaffRequestResult.agentDispatchPerformed, false);
  assert.equal(result.governanceEvaluationResult.agentDispatchPerformed, false);
  assert.equal(result.chiefOfStaffRequestResult.externalSendPerformed, false);
  assert.equal(result.governanceEvaluationResult.externalSendPerformed, false);
  assert.equal(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor"), true);
  assert.equal(requestedUrls.includes("http://127.0.0.1:8787/chief-of-staff/requests"), true);
  assert.equal(requestedUrls.includes("http://127.0.0.1:8787/governance/evaluate"), true);
});

test("smoke test compares exported Napoleon proof metadata after local harness success", async () => {
  const result = await runLocalHarnessTextSmoke({
    endpoint: "http://127.0.0.1:8787",
    message: "Draft a bridge readiness summary",
    profile: "adult_owner",
    fetch: async (url, init) => {
      if (url === "http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor") {
        return harnessJsonResponse(200, {
          descriptor: {
            schemaVersion: "napoleon/concierge/chief-of-staff-service/v1",
            serviceId: "napoleon.chief_of_staff",
            runtimeAuthority: false,
            commandExecution: false,
            cachePolicy: "fail_closed_to_review_required",
            blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "external_send"],
          },
          checksum: { expected: "sha256:smoke", actual: "sha256:smoke" },
          signature: { valid: true },
        });
      }

      assert.equal(url, "http://127.0.0.1:8787/v1/concierge/turn");
      const body = JSON.parse(init?.body ?? "{}") as {
        traceId: string;
        profileMode: string;
        chiefOfStaffRequest: { request_id: string };
      };

      return harnessJsonResponse(200, {
        text: "Napoleon recommends keeping this as a governed review draft. Passive Brain found bridge context.",
        profileMode: body.profileMode,
        governanceDecision: {
          decision_id: `decision_${body.traceId}`,
          request_id: body.chiefOfStaffRequest.request_id,
          outcome: "requires_review",
          authority_tier: "advisory_review",
          approval_requirement: "chief_of_staff_and_owner_review",
          rationale: "Local harness requires governed review.",
          blocked_effects: ["memory_write", "approval_capture", "external_send", "agent_dispatch"],
          trace_id: body.traceId,
          audit_id: `audit_${body.traceId}`,
        },
        traceEnvelope: {
          trace_id: body.traceId,
          parent_trace_id: "local_harness",
          actor_id: "napoleon.local_harness",
          request_id: body.chiefOfStaffRequest.request_id,
          decision_id: `decision_${body.traceId}`,
          timestamp: "2026-06-12T00:00:00.000Z",
        },
        auditEnvelope: {
          audit_id: `audit_${body.traceId}`,
          trace_id: body.traceId,
          decision_id: `decision_${body.traceId}`,
          actor_id: "napoleon.local_harness",
          authority_tier: "advisory_review",
          approval_requirement: "chief_of_staff_and_owner_review",
          evidence_links: [`trace:${body.traceId}`, "harness:local"],
        },
        delegation: {
          selectedAgents: [
            {
              agentId: "passive_brain",
              displayName: "Passive Brain",
              selectionReason: "Prior bridge context is relevant to the request.",
              contributionSummary: "bridge context",
            },
          ],
          allowedEffects: ["prepare_advisory_response"],
          blockedEffects: ["memory_write", "approval_capture", "external_send", "agent_dispatch"],
          governanceState: "requires_review",
          traceId: body.traceId,
          auditId: `audit_${body.traceId}`,
        },
        recommendationProvenance: {
          summary: "keeping this as a governed review draft",
          traceId: body.traceId,
          auditId: `audit_${body.traceId}`,
        },
      });
    },
  });

  if (result.status !== "success") {
    throw new Error(`Expected success smoke result, got ${result.status}`);
  }
  assert.equal(result.firstProofComparison.status, "not_available");
  assert.equal(result.secondProofComparison.status, "unchanged");
  assert.equal(result.secondProofComparison.changes.length, 0);
  assert.ok(result.proofExportJson.includes("concierge_napoleon_response_proof"));
  assert.ok(!result.proofExportJson.includes("Draft a bridge readiness summary"));
  assert.ok(!result.proofExportJson.includes("127.0.0.1"));
  assert.ok(!result.proofExportJson.includes("Napoleon recommends keeping this as a governed review draft"));
});

test("smoke tests child protected required-action minimization from local harness runtime evidence", async () => {
  const result = runLocalHarnessChildRequiredActionSmoke({
    runtimeSummaryJson: JSON.stringify({
      runtimeValidation: {
        source: "local_harness",
      },
      napoleonRequiredActions: [
        {
          id: "advertise_evaluation_review_handoff",
          owner: "napoleon",
          reason: "real_runtime_promotion_blocker",
          handoffName: "evaluation_review",
          targetPath: "/chief-of-staff/reviews/evaluation",
          requestKind: "evaluation_review_handoff",
          operationId: "evaluation_review",
          advertiseUsing: ["supportedHandoffs", "required_for"],
          requiredAction:
            "Napoleon must advertise evaluation_review in supportedHandoffs before Concierge can promote live.",
          sideEffectsPerformed: false,
          approvalCaptured: false,
          memoryWritePerformed: false,
          agentDispatchPerformed: false,
          externalSendPerformed: false,
          appliedLocally: false,
        },
      ],
      httpEvaluator: {
        status: "failed",
        failureReason: "http_evaluator_handoff_not_advertised",
        targetPath: "/chief-of-staff/reviews/evaluation",
        targetRequestKind: "evaluation_review_handoff",
        targetOperationId: "evaluation_review",
        endpointHostRetained: false,
        tokenRetained: false,
        requestBodyRetained: false,
        responseBodyRetained: false,
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
      },
    }),
    profile: "child_protected_user",
  });

  assert.equal(result.status, "success");
  assert.equal(result.answer.actionCount, 1);
  assert.equal(result.answer.runtimeValidationSource, "local_harness");
  assert.ok(result.answer.content.includes("Napoleon has 1 required action from local harness runtime evidence."));
  assert.ok(result.answer.content.includes("trusted adult/operator"));
  assert.ok(result.answer.content.includes("Profile scope: child_protected_user."));
  assert.ok(result.answer.content.includes("not Napoleon approval"));
  assert.equal(result.sideEffects.localAnswerOnly, true);
  assert.equal(result.sideEffects.approvalCaptured, false);
  assert.equal(result.sideEffects.memoryWritePerformed, false);
  assert.equal(result.sideEffects.agentDispatchPerformed, false);
  assert.equal(result.sideEffects.externalSendPerformed, false);
  assert.equal(result.sideEffects.appliedLocally, false);

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("advertise_evaluation_review_handoff"), false);
  assert.equal(serialized.includes("/chief-of-staff/reviews/evaluation"), false);
  assert.equal(serialized.includes("evaluation_review_handoff"), false);
  assert.equal(serialized.includes("evaluation_review"), false);
  assert.equal(serialized.includes("Napoleon must advertise"), false);
  assert.equal(serialized.includes("highestPriorityAction"), false);
});

test("smoke test rejects a local harness text response that claims forbidden side effects", async () => {
  const result = await runLocalHarnessTextSmoke({
    endpoint: "http://127.0.0.1:8787",
    message: "claim-side-effect",
    profile: "adult_owner",
    traceId: "trace_side_effect_claim_smoke",
    fetch: async (url, init) => {
      if (url === "http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor") {
        return harnessJsonResponse(200, {
          descriptor: {
            schemaVersion: "napoleon/concierge/chief-of-staff-service/v1",
            serviceId: "napoleon.chief_of_staff",
            runtimeAuthority: false,
            commandExecution: false,
            cachePolicy: "fail_closed_to_review_required",
            blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "external_send"],
          },
          checksum: { expected: "sha256:smoke", actual: "sha256:smoke" },
          signature: { valid: true },
        });
      }

      assert.equal(url, "http://127.0.0.1:8787/v1/concierge/turn");
      const body = JSON.parse(init?.body ?? "{}") as {
        traceId: string;
        profileMode: string;
        chiefOfStaffRequest: { request_id: string };
      };

      return harnessJsonResponse(200, {
        text: "Napoleon recommends keeping this as a governed review draft. Passive Brain found bridge context.",
        profileMode: body.profileMode,
        governanceDecision: {
          decision_id: `decision_${body.traceId}`,
          request_id: body.chiefOfStaffRequest.request_id,
          outcome: "requires_review",
          authority_tier: "advisory_review",
          approval_requirement: "chief_of_staff_and_owner_review",
          rationale: "Local harness requires governed review.",
          blocked_effects: ["memory_write", "approval_capture", "external_send", "agent_dispatch"],
          trace_id: body.traceId,
          audit_id: `audit_${body.traceId}`,
        },
        traceEnvelope: {
          trace_id: body.traceId,
          parent_trace_id: "local_harness",
          actor_id: "napoleon.local_harness",
          request_id: body.chiefOfStaffRequest.request_id,
          decision_id: `decision_${body.traceId}`,
          timestamp: "2026-06-12T00:00:00.000Z",
        },
        auditEnvelope: {
          audit_id: `audit_${body.traceId}`,
          trace_id: body.traceId,
          decision_id: `decision_${body.traceId}`,
          actor_id: "napoleon.local_harness",
          authority_tier: "advisory_review",
          approval_requirement: "chief_of_staff_and_owner_review",
          evidence_links: [`trace:${body.traceId}`, "harness:local"],
        },
        delegation: {
          selectedAgents: [
            {
              agentId: "passive_brain",
              displayName: "Passive Brain",
              selectionReason: "Prior bridge context is relevant to the request.",
              contributionSummary: "bridge context",
            },
          ],
          allowedEffects: ["prepare_advisory_response"],
          blockedEffects: ["memory_write", "approval_capture", "external_send", "agent_dispatch"],
          governanceState: "requires_review",
          traceId: body.traceId,
          auditId: `audit_${body.traceId}`,
        },
        recommendationProvenance: {
          summary: "keeping this as a governed review draft",
          traceId: body.traceId,
          auditId: `audit_${body.traceId}`,
        },
        memoryWritePerformed: true,
        approvalCaptured: true,
        externalSendPerformed: true,
        agentDispatchPerformed: true,
        appliedLocally: true,
      });
    },
  });

  if (result.status !== "fail_closed") {
    throw new Error(`Expected fail-closed smoke result, got ${result.status}`);
  }
  assert.equal(result.failureReason, "contract_mismatch");
  assert.ok(result.failureMessage.includes("contract_mismatch"));
  assert.ok(result.failureMessage.includes("Blocked effects:"));
  assert.ok(result.failureMessage.includes("memory_write"));
  assert.ok(result.failureMessage.includes("external_send"));
  assert.equal(result.readiness.captureState, "passed");
  assert.equal(result.readiness.comparisonState, "passed");
  assert.equal(result.readiness.lastEvidenceStatus, "fail_closed");
  assert.equal(result.readiness.lastFailureReason, "contract_mismatch");
  assert.equal(result.liveBridgeReadiness.status, "warning");
  assert.equal(result.liveBridgeReadiness.canSendLive, true);
});

test("smoke test returns fail-closed bridge details when harness denies a text turn", async () => {
  const result = await runLocalHarnessTextSmoke({
    endpoint: "http://127.0.0.1:8787",
    message: "Send an external update",
    profile: "adult_owner",
    traceId: "trace_denied_smoke",
    fetch: async (url, init) => {
      if (url === "http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor") {
        return harnessJsonResponse(200, {
          descriptor: {
            schemaVersion: "napoleon/concierge/chief-of-staff-service/v1",
            serviceId: "napoleon.chief_of_staff",
            runtimeAuthority: false,
            commandExecution: false,
            cachePolicy: "fail_closed_to_review_required",
            blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "external_send"],
          },
          checksum: { expected: "sha256:smoke", actual: "sha256:smoke" },
          signature: { valid: true },
        });
      }

      assert.equal(url, "http://127.0.0.1:8787/v1/concierge/turn");
      const body = JSON.parse(init?.body ?? "{}") as {
        traceId: string;
        chiefOfStaffRequest: { request_id: string };
      };

      return harnessJsonResponse(200, {
        text: "Napoleon denied this request.",
        governanceDecision: {
          decision_id: "decision_denied_smoke",
          request_id: body.chiefOfStaffRequest.request_id,
          outcome: "deny",
          authority_tier: "prohibited",
          approval_requirement: "not_available",
          rationale: "External update is blocked.",
          blocked_effects: ["external_send", "memory_write", "approval_capture", "agent_dispatch"],
          trace_id: body.traceId,
          audit_id: "audit_denied_smoke",
        },
        traceEnvelope: {
          trace_id: body.traceId,
          parent_trace_id: "local_harness",
          actor_id: "napoleon.local_harness",
          request_id: body.chiefOfStaffRequest.request_id,
          decision_id: "decision_denied_smoke",
          timestamp: "2026-06-12T00:00:00.000Z",
        },
        auditEnvelope: {
          audit_id: "audit_denied_smoke",
          trace_id: body.traceId,
          decision_id: "decision_denied_smoke",
          actor_id: "napoleon.local_harness",
          authority_tier: "prohibited",
          approval_requirement: "not_available",
          evidence_links: [`trace:${body.traceId}`, "harness:local"],
        },
      });
    },
  });

  if (result.status !== "fail_closed") {
    throw new Error(`Expected fail-closed smoke result, got ${result.status}`);
  }
  assert.equal(result.failureReason, "governance_denied");
  assert.ok(result.failureMessage?.includes("governance_denied"));
  assert.ok(result.failureMessage?.includes("Blocked effects: external_send, memory_write, approval_capture, agent_dispatch"));
  assert.equal(result.readiness.captureState, "passed");
  assert.equal(result.readiness.comparisonState, "passed");
  assert.equal(result.liveBridgeReadiness.status, "warning");
  assert.equal(result.liveBridgeReadiness.canSendLive, true);
});
