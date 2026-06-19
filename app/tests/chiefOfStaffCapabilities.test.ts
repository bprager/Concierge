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
  let targetUrl: string | undefined;
  let headers: Record<string, string> | undefined;

  const result = await discoverChiefOfStaffCapabilities({
    endpoint: "https://napoleon.example/concierge/v1/concierge/turn?debug=true",
    authToken: "token_capabilities",
    descriptorReady: true,
    fetch: async (url: string, init?: { headers?: Record<string, string> }) => {
      targetUrl = url;
      headers = init?.headers;
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

  assert.equal(targetUrl, "https://napoleon.example/concierge/v1/concierge/chief-of-staff/capabilities");
  assert.equal(headers?.Authorization, "Bearer token_capabilities");
  assert.equal(JSON.stringify(headers).includes("token_capabilities"), true);
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
