import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

function harnessJsonResponse(status: number, payload: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://127.0.0.1:5173/",
  });
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.localStorage.clear();
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.HTMLInputElement = dom.window.HTMLInputElement;
  globalThis.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
  globalThis.HTMLSelectElement = dom.window.HTMLSelectElement;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });
  return dom;
}

test("answers Napoleon metadata questions from local discovery state without a new bridge request", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const requestedUrls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    requestedUrls.push(url);
    if (url === "http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor") {
      return harnessJsonResponse(200, {
        descriptor: {
          schemaVersion: "napoleon/concierge/chief-of-staff-service/v1",
          serviceId: "napoleon.chief_of_staff",
          runtimeAuthority: false,
          commandExecution: false,
          cachePolicy: "fail_closed_to_review_required",
          supportedHandoffs: ["text_turn"],
          blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "agent_dispatch", "external_send"],
        },
        checksum: { expected: "sha256:metadata-answer", actual: "sha256:metadata-answer" },
        signature: { valid: true },
      });
    }
    if (url === "http://127.0.0.1:8787/v1/concierge/chief-of-staff/capabilities") {
      return harnessJsonResponse(200, {
        serviceId: "napoleon.chief_of_staff",
        capabilities: [],
        runtimeAuthority: false,
        blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "agent_dispatch", "external_send"],
      });
    }
    if (url === "http://127.0.0.1:8787/agents") {
      return harnessJsonResponse(200, {
        agents: [
          {
            agentId: "passive_brain",
            displayName: "Passive Brain",
            description: "Surfaces relevant Napoleon context.",
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
      });
    }
    if (url === "http://127.0.0.1:8787/profiles/adult_owner") {
      return harnessJsonResponse(200, {
        profileId: "adult_owner",
        label: "Adult owner",
        retentionMode: "derived_signals_only",
        runtimeAuthority: false,
        memoryWritePerformed: false,
        approvalCaptured: false,
        blockedEffects: ["memory_write", "approval_capture"],
      });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const view = render(<App />);
    await user.click(view.getByRole("button", { name: "Use local harness" }));
    await view.findByText("Napoleon Chief of Staff descriptor is discovered, valid, and contract-only.");
    await user.click(view.getByRole("button", { name: "Discover advisory capabilities" }));
    await view.findByText("Advisory Chief of Staff capabilities discovered. This is not Napoleon approval.");
    const networkCountBeforeQuestion = requestedUrls.length;

    const composer = view.getByPlaceholderText("Ask Napoleon through Concierge...") as HTMLTextAreaElement;
    fireEvent.change(composer, { target: { value: "Which Napoleon agents are currently available?" } });
    await waitFor(() => assert.equal(composer.value, "Which Napoleon agents are currently available?"));
    await user.click(view.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      assert.ok(document.body.textContent?.includes("Napoleon metadata discovery is available as local connection metadata.")),
    );
    assert.ok(document.body.textContent?.includes("Agent manifests: Passive Brain (passive_brain)"));
    assert.ok(document.body.textContent?.includes("Profile metadata: Adult owner (adult_owner), retention derived_signals_only"));
    assert.ok(document.body.textContent?.includes("Boundary: metadata only; no agent dispatch, registry update, memory write, approval capture, external send, or local application."));
    assert.equal(requestedUrls.length, networkCountBeforeQuestion);

    const telemetryBuffer = JSON.parse(globalThis.localStorage.getItem("concierge_telemetry_buffer_v1") ?? "{}") as {
      events?: Array<{ event?: string; attributes?: Record<string, unknown> }>;
    };
    const metadataAnswerEvent = telemetryBuffer.events?.find((event) => event.event === "napoleon_metadata_answered");
    assert.equal(metadataAnswerEvent?.attributes?.agentCount, 1);
    assert.equal(metadataAnswerEvent?.attributes?.profileMetadataReturned, true);
    assert.equal(metadataAnswerEvent?.attributes?.localAnswerOnly, true);
    assert.equal(metadataAnswerEvent?.attributes?.agentDispatchPerformed, false);
    assert.equal(metadataAnswerEvent?.attributes?.externalSendPerformed, false);
    assert.equal(JSON.stringify(metadataAnswerEvent).includes("Passive Brain"), false);
    assert.equal(JSON.stringify(metadataAnswerEvent).includes("passive_brain"), false);
    assert.equal(JSON.stringify(metadataAnswerEvent).includes("derived_signals_only"), false);
  } finally {
    cleanup();
    dom.window.close();
  }
});
