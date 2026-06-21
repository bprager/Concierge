import assert from "node:assert/strict";
import test from "node:test";
import { discoverNapoleonDescriptor } from "../src/descriptorDiscovery.js";

test("descriptor discovery fails closed without endpoint and does not fetch", async () => {
  let fetchCalled = false;

  const result = await discoverNapoleonDescriptor({
    getEndpoint: () => null,
    fetch: async () => {
      fetchCalled = true;
      return { ok: true, json: async () => ({}) };
    },
  });

  assert.equal(fetchCalled, false);
  assert.equal(result.connection.state, "no_endpoint");
  assert.equal(result.connection.canAttemptLiveBridge, false);
});

test("descriptor discovery fetches canonical descriptor path with header-only auth", async () => {
  let targetUrl: string | undefined;
  let headers: Record<string, string> | undefined;

  const result = await discoverNapoleonDescriptor({
    getEndpoint: () => "https://napoleon.example/concierge",
    getAuthToken: () => "token_descriptor",
    fetch: async (url, init) => {
      targetUrl = url;
      headers = init?.headers;
      return {
        ok: true,
        json: async () => ({
          descriptor: {
            schemaVersion: "napoleon/concierge/chief-of-staff-service/v1",
            serviceId: "napoleon.chief_of_staff",
            runtimeAuthority: false,
            commandExecution: false,
            cachePolicy: "fail_closed_to_review_required",
            blockedEffects: ["runtime_authority", "memory_write"],
          },
          checksum: {
            expected: "sha256:descriptor-ok",
            actual: "sha256:descriptor-ok",
          },
          signature: {
            valid: true,
          },
        }),
      };
    },
  });

  assert.equal(targetUrl, "https://napoleon.example/concierge/v1/concierge/chief-of-staff/descriptor");
  assert.equal(headers?.Authorization, "Bearer token_descriptor");
  assert.equal(result.connection.state, "ready");
  assert.equal(result.connection.canAttemptLiveBridge, true);
  assert.equal(result.input.actualChecksum, "sha256:descriptor-ok");
});

test("descriptor discovery fetches explicit cos descriptor path with harness auth header", async () => {
  let targetUrl: string | undefined;
  let headers: Record<string, string> | undefined;

  const result = await discoverNapoleonDescriptor({
    getEndpoint: () => "http://127.0.0.1:8765/cos/text-turn",
    getAuthToken: () => "token_cos_descriptor",
    now: () => "2026-06-17T14:40:00.000Z",
    fetch: async (url, init) => {
      targetUrl = url;
      headers = init?.headers;
      return {
        ok: true,
        json: async () => ({
          schema_version: "napoleon/concierge/chief-of-staff-service/v1",
          service_id: "napoleon.chief_of_staff",
          runtime_authority: false,
          command_execution: false,
          cache_policy: {
            ttl_seconds: 300,
            stale_descriptor_action: "fail_closed_to_review_required",
          },
          security: {
            descriptor_signature: "pending_future_implementation",
            checksum: "pending_future_implementation",
          },
          blocked_effects: ["runtime_authority", "memory_write", "agent_dispatch", "external_send"],
        }),
      };
    },
  });

  assert.equal(targetUrl, "http://127.0.0.1:8765/cos/descriptor");
  assert.equal(headers?.["X-Napoleon-Auth"], "token_cos_descriptor");
  assert.equal(headers?.Authorization, undefined);
  assert.equal(result.connection.state, "ready");
  assert.equal(result.connection.checksumState, "not_checked");
  assert.equal(result.connection.signatureState, "not_checked");
  assert.equal(result.input.maxAgeSeconds, 300);
  assert.equal(result.input.discoveredAt, "2026-06-17T14:40:00.000Z");
});

test("descriptor discovery falls back from runtime base URL to cos descriptor", async () => {
  const requestedUrls: string[] = [];
  const headers: Record<string, string | undefined>[] = [];

  const result = await discoverNapoleonDescriptor({
    getEndpoint: () => "http://127.0.0.1:8765",
    getAuthToken: () => "token_cos_descriptor",
    now: () => "2026-06-21T15:30:00.000Z",
    fetch: async (url, init) => {
      requestedUrls.push(url);
      headers.push(init?.headers ?? {});
      if (url.endsWith("/v1/concierge/chief-of-staff/descriptor")) {
        return {
          ok: false,
          status: 404,
          json: async () => ({}),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          schema_version: "napoleon/concierge/runtime-descriptor/v1",
          service_id: "napoleon.chief_of_staff",
          runtime_authority: false,
          command_execution: false,
          endpoints: {
            descriptor: "GET /cos/descriptor",
            text_turn: "POST /cos/text-turn",
            trace: "GET /cos/trace/{trace_id}",
          },
          supported_authority_tiers: ["advisory_prepare_only"],
          blocked_effects: ["runtime_authority", "memory_write", "agent_dispatch", "external_send"],
        }),
      };
    },
  });

  assert.deepEqual(requestedUrls, [
    "http://127.0.0.1:8765/v1/concierge/chief-of-staff/descriptor",
    "http://127.0.0.1:8765/cos/descriptor",
  ]);
  assert.equal(headers[0]?.Authorization, "Bearer token_cos_descriptor");
  assert.equal(headers[1]?.["X-Napoleon-Auth"], "token_cos_descriptor");
  assert.equal(headers[1]?.Authorization, undefined);
  assert.equal(result.connection.state, "ready");
  assert.equal(result.connection.canAttemptLiveBridge, true);
  assert.equal(result.connection.descriptorStatus?.cachePolicy, "runtime_descriptor_live_response");
  assert.equal(result.input.maxAgeSeconds, 300);
});

test("descriptor discovery fails closed for cos descriptors that grant runtime authority", async () => {
  const result = await discoverNapoleonDescriptor({
    getEndpoint: () => "http://127.0.0.1:8765/cos/descriptor",
    fetch: async () => ({
      ok: true,
      json: async () => ({
        schema_version: "napoleon/concierge/chief-of-staff-service/v1",
        service_id: "napoleon.chief_of_staff",
        runtime_authority: true,
        command_execution: false,
        cache_policy: {
          ttl_seconds: 300,
          stale_descriptor_action: "fail_closed_to_review_required",
        },
        blocked_effects: ["runtime_authority", "memory_write"],
      }),
    }),
  });

  assert.equal(result.connection.state, "descriptor_mismatch");
  assert.equal(result.connection.failClosedReason, "descriptor_invalid");
  assert.equal(result.connection.canAttemptLiveBridge, false);
});

test("descriptor discovery reports mismatched checksum as fail-closed descriptor state", async () => {
  const result = await discoverNapoleonDescriptor({
    getEndpoint: () => "https://napoleon.example/concierge",
    fetch: async () => ({
      ok: true,
      json: async () => ({
        descriptor: {
          schemaVersion: "napoleon/concierge/chief-of-staff-service/v1",
          serviceId: "napoleon.chief_of_staff",
          runtimeAuthority: false,
          commandExecution: false,
          cachePolicy: "fail_closed_to_review_required",
          blockedEffects: ["runtime_authority", "memory_write"],
        },
        checksum: {
          expected: "sha256:expected",
          actual: "sha256:actual",
        },
      }),
    }),
  });

  assert.equal(result.connection.state, "descriptor_mismatch");
  assert.equal(result.connection.failClosedReason, "descriptor_signature_or_checksum_mismatch");
  assert.equal(result.connection.canAttemptLiveBridge, false);
});

test("descriptor discovery reports malformed descriptor as missing descriptor", async () => {
  const result = await discoverNapoleonDescriptor({
    getEndpoint: () => "https://napoleon.example/concierge",
    fetch: async () => ({
      ok: true,
      json: async () => ({ descriptor: { serviceId: "napoleon.chief_of_staff" } }),
    }),
  });

  assert.equal(result.connection.state, "missing_descriptor");
  assert.equal(result.connection.canAttemptLiveBridge, false);
});

test("descriptor discovery treats unreadable descriptor JSON as fail-closed HTTP state", async () => {
  const result = await discoverNapoleonDescriptor({
    getEndpoint: () => "https://napoleon.example/concierge",
    fetch: async () => ({
      ok: true,
      json: async () => {
        throw new Error("malformed descriptor body with private response detail");
      },
    }),
  });

  assert.equal(result.connection.state, "http_failure");
  assert.equal(result.connection.failClosedReason, "http_failure");
  assert.equal(result.connection.canAttemptLiveBridge, false);
  assert.match(result.connection.message, /failed over HTTP/);
});

test("descriptor discovery preserves auth failure as fail-closed connection state", async () => {
  const result = await discoverNapoleonDescriptor({
    getEndpoint: () => "https://napoleon.example/concierge",
    fetch: async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
    }),
  });

  assert.equal(result.connection.state, "auth_failure");
  assert.equal(result.connection.failClosedReason, "auth_failure");
  assert.equal(result.connection.canAttemptLiveBridge, false);
  assert.match(result.connection.message, /authentication/);
});

test("descriptor discovery preserves timeout as fail-closed connection state", async () => {
  const error = new Error("timed out");
  error.name = "AbortError";

  const result = await discoverNapoleonDescriptor({
    getEndpoint: () => "https://napoleon.example/concierge",
    fetch: async () => {
      throw error;
    },
  });

  assert.equal(result.connection.state, "bridge_timeout");
  assert.equal(result.connection.failClosedReason, "bridge_timeout");
  assert.equal(result.connection.canAttemptLiveBridge, false);
});
