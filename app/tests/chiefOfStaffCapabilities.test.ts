import assert from "node:assert/strict";
import test from "node:test";
import { discoverChiefOfStaffCapabilities } from "../src/chiefOfStaffCapabilities.js";

test("capability discovery fails closed before fetch when descriptor is not ready", async () => {
  let fetchCalled = false;

  const result = await discoverChiefOfStaffCapabilities({
    endpoint: "https://napoleon.example/concierge",
    descriptorReady: false,
    fetch: async () => {
      fetchCalled = true;
      return { ok: true, json: async () => ({}) };
    },
  });

  assert.equal(fetchCalled, false);
  assert.equal(result.state, "blocked");
  assert.equal(result.capabilities.length, 0);
  assert.equal(result.runtimeAuthority, false);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.agentDispatchPerformed, false);
  assert.equal(result.externalSendPerformed, false);
});

test("capability discovery fetches advisory capabilities with header-only auth", async () => {
  const requestedUrls: string[] = [];
  let capabilityHeaders: Record<string, string> | undefined;

  const result = await discoverChiefOfStaffCapabilities({
    endpoint: "https://napoleon.example/concierge/v1/concierge/turn?debug=true",
    authToken: "token_capabilities",
    descriptorReady: true,
    profileId: "adult_owner",
    fetch: async (url: string, init?: { headers?: Record<string, string> }) => {
      requestedUrls.push(url);
      if (url.endsWith("/v1/concierge/chief-of-staff/capabilities")) {
        capabilityHeaders = init?.headers;
      }
      if (url === "https://napoleon.example/concierge/agents") {
        return {
          ok: true,
          json: async () => ({
            agents: [
              {
                agentId: "passive_brain",
                displayName: "Passive Brain",
                description: "Surfaces relevant context.",
                allowedEffects: ["prepare_advisory_response"],
                blockedEffects: ["memory_write", "agent_dispatch"],
                runtimeAuthority: false,
                agentDispatchPerformed: false,
              },
            ],
            runtimeAuthority: false,
            agentDispatchPerformed: false,
            memoryWritePerformed: false,
            approvalCaptured: false,
            externalSendPerformed: false,
            blockedEffects: ["memory_write", "agent_dispatch"],
          }),
        };
      }
      if (url === "https://napoleon.example/concierge/profiles/adult_owner") {
        return {
          ok: true,
          json: async () => ({
            profileId: "adult_owner",
            label: "Adult owner",
            retentionMode: "derived_signals_only",
            runtimeAuthority: false,
            memoryWritePerformed: false,
            approvalCaptured: false,
            blockedEffects: ["memory_write", "approval_capture"],
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          serviceId: "napoleon.chief_of_staff",
          capabilities: [
            {
              id: "napoleon.capability.answer",
              label: "Answer with governance",
              description: "Prepare advisory answers through Napoleon.",
              authorityTier: "prepare_only",
              proposalOnly: true,
            },
          ],
          runtimeAuthority: false,
          blockedEffects: ["memory_write", "approval_capture", "agent_dispatch", "external_send"],
        }),
      };
    },
  });

  assert.deepEqual(requestedUrls, [
    "https://napoleon.example/concierge/v1/concierge/chief-of-staff/capabilities",
    "https://napoleon.example/concierge/agents",
    "https://napoleon.example/concierge/profiles/adult_owner",
  ]);
  assert.equal(capabilityHeaders?.Authorization, "Bearer token_capabilities");
  assert.equal(JSON.stringify(capabilityHeaders).includes("token_capabilities"), true);
  assert.equal(result.state, "ready");
  assert.equal(result.serviceId, "napoleon.chief_of_staff");
  assert.equal(result.capabilities[0]?.id, "napoleon.capability.answer");
  assert.equal(result.capabilities[0]?.proposalOnly, true);
  assert.deepEqual(result.blockedEffects, ["memory_write", "approval_capture", "agent_dispatch", "external_send"]);
  assert.equal(result.runtimeAuthority, false);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.agentDispatchPerformed, false);
  assert.equal(result.externalSendPerformed, false);
  assert.equal(result.agents[0]?.agentId, "passive_brain");
  assert.equal(result.agents[0]?.agentDispatchPerformed, false);
  assert.equal(result.profileMetadata?.profileId, "adult_owner");
  assert.equal(result.profileMetadata?.memoryWritePerformed, false);
  assert.equal(result.profileMetadata?.approvalCaptured, false);
});

test("capability discovery uses explicit cos capabilities endpoint and X-Napoleon-Auth", async () => {
  let targetUrl: string | undefined;
  let headers: Record<string, string> | undefined;

  const result = await discoverChiefOfStaffCapabilities({
    endpoint: "http://127.0.0.1:8765/cos/text-turn",
    authToken: "token_cos_capabilities",
    descriptorReady: true,
    fetch: async (url: string, init?: { headers?: Record<string, string> }) => {
      targetUrl = url;
      headers = init?.headers;
      return {
        ok: true,
        json: async () => ({
          service_id: "napoleon.chief_of_staff",
          capabilities: [],
          runtime_authority: false,
          blocked_effects: ["runtime_authority", "memory_write"],
        }),
      };
    },
  });

  assert.equal(targetUrl, "http://127.0.0.1:8765/cos/capabilities");
  assert.equal(headers?.["X-Napoleon-Auth"], "token_cos_capabilities");
  assert.equal(headers?.Authorization, undefined);
  assert.equal(result.state, "ready");
});

test("capability discovery accepts current runtime cos capability registry shape", async () => {
  const result = await discoverChiefOfStaffCapabilities({
    endpoint: "/napoleon-runtime/cos",
    authToken: "token_cos_capabilities",
    descriptorReady: true,
    profileId: "adult_owner",
    fetch: async () => ({
      ok: true,
      json: async () => ({
        schema_version: "napoleon/cos/capabilities/v1",
        status: "ready",
        authority_tier: "advisory_prepare_only",
        capabilities: [
          {
            capability_id: "napoleon.capability.answer",
            name: "Answer with governance",
            summary: "Prepare advisory answers through Napoleon.",
            runtime_authority: false,
            blocked_effects: ["memory_write", "approval_capture", "agent_dispatch", "external_send"],
          },
        ],
        capability_count: 1,
        runtime_authority: false,
        command_execution: false,
        graph_write: false,
        memory_write: false,
        external_send: false,
        approval_captured: false,
        service_control: false,
        task_dispatch: false,
      }),
    }),
  });

  assert.equal(result.state, "ready");
  assert.equal(result.serviceId, null);
  assert.equal(result.capabilities[0]?.id, "napoleon.capability.answer");
  assert.equal(result.capabilities[0]?.authorityTier, "advisory_prepare_only");
  assert.equal(result.capabilities[0]?.proposalOnly, true);
  assert.deepEqual(result.blockedEffects, [
    "runtime_authority",
    "memory_write",
    "approval_capture",
    "agent_dispatch",
    "external_send",
    "service_control",
    "graph_write",
  ]);
  assert.equal(result.agents.length, 0);
  assert.equal(result.profileMetadata, null);
  assert.equal(result.responseMemoryWritePerformed, false);
  assert.equal(result.responseAgentDispatchPerformed, false);
  assert.equal(result.responseExternalSendPerformed, false);
});

test("capability discovery rejects capabilities that grant runtime authority", async () => {
  const result = await discoverChiefOfStaffCapabilities({
    endpoint: "https://napoleon.example/concierge",
    descriptorReady: true,
    fetch: async () => ({
      ok: true,
      json: async () => ({
        serviceId: "napoleon.chief_of_staff",
        capabilities: [],
        runtimeAuthority: true,
        blockedEffects: ["memory_write"],
      }),
    }),
  });

  assert.equal(result.state, "blocked");
  assert.equal(result.capabilities.length, 0);
  assert.match(result.message, /blocked/);
});

test("capability discovery rejects responses that claim side effects", async () => {
  const result = await discoverChiefOfStaffCapabilities({
    endpoint: "https://napoleon.example/concierge",
    descriptorReady: true,
    fetch: async () => ({
      ok: true,
      json: async () => ({
        serviceId: "napoleon.chief_of_staff",
        capabilities: [
          {
            id: "napoleon.capability.memory_update",
            label: "Memory update",
            description: "Claims a runtime memory write.",
            authorityTier: "prepare_only",
            proposalOnly: true,
          },
        ],
        runtimeAuthority: false,
        memoryWritePerformed: true,
        approvalCaptured: true,
        agentDispatchPerformed: true,
        externalSendPerformed: true,
        blockedEffects: ["memory_write", "approval_capture"],
      }),
    }),
  });

  assert.equal(result.state, "blocked");
  assert.equal(result.capabilities.length, 0);
  assert.match(result.message, /side-effect claims/);
  assert.equal(result.responseApprovalCaptured, true);
  assert.equal(result.responseMemoryWritePerformed, true);
  assert.equal(result.responseAgentDispatchPerformed, true);
  assert.equal(result.responseExternalSendPerformed, true);
  assert.equal(result.approvalCaptured, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.agentDispatchPerformed, false);
  assert.equal(result.externalSendPerformed, false);
});
