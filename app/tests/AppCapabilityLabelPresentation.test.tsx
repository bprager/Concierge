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

test("rendered proof uses discovered capability labels while exported proof keeps returned IDs", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const requestedUrls: string[] = [];
  const telemetryPayloads: Array<{ event: string; attributes: Record<string, unknown> }> = [];
  const originalInfo = console.info;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
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
          blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "external_send"],
        },
        checksum: { expected: "sha256:ui", actual: "sha256:ui" },
        signature: { valid: true },
      });
    }
    if (url === "http://127.0.0.1:8787/v1/concierge/chief-of-staff/capabilities") {
      return harnessJsonResponse(200, {
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
        blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "agent_dispatch", "external_send"],
      });
    }
    if (url === "http://127.0.0.1:8787/agents") {
      return harnessJsonResponse(200, {
        agents: [],
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

    assert.equal(url, "http://127.0.0.1:8787/v1/concierge/turn");
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      traceId: string;
      profileMode: string;
      chiefOfStaffRequest: { request_id: string };
    };
    return harnessJsonResponse(200, {
      text: "Napoleon prepared a governed bridge response.",
      profileMode: body.profileMode,
      targetAgent: "napoleon.capability.answer",
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
    });
  }) as typeof fetch;

  try {
    console.info = (...args: unknown[]) => {
      const payload = args[1];
      if (
        args[0] === "[concierge.telemetry]" &&
        payload &&
        typeof payload === "object" &&
        "event" in payload &&
        "attributes" in payload
      ) {
        telemetryPayloads.push(payload as { event: string; attributes: Record<string, unknown> });
      }
    };
    const view = render(<App />);

    await user.click(view.getByRole("button", { name: "Use local harness" }));
    await waitFor(() =>
      assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor")),
    );
    await user.click(view.getByRole("button", { name: "Discover advisory capabilities" }));
    await view.findByText("Advisory Chief of Staff capabilities discovered. This is not Napoleon approval.");
    await waitFor(() => assert.equal((view.getByLabelText("Rehearsal Mode") as HTMLInputElement).checked, false));
    fireEvent.change(view.getByPlaceholderText("Ask Napoleon through Concierge..."), {
      target: { value: "Draft a bridge readiness summary" },
    });
    await user.click(view.getByRole("button", { name: "Send" }));

    await view.findByText("Last successful Napoleon proof");
    const capabilityLabel = "Answer with governance (napoleon.capability.answer)";
    const assistantReply = view.getByText("Napoleon prepared a governed bridge response.").closest("article") as HTMLElement;
    assert.ok(assistantReply);
    assert.ok(within(assistantReply).getByText("Capability"));
    assert.ok(within(assistantReply).getByText(capabilityLabel));

    const delegationPanel = view.getByLabelText("Napoleon delegation");
    assert.ok(within(delegationPanel).getByText("Napoleon target capability"));
    assert.ok(within(delegationPanel).getAllByText(capabilityLabel).length >= 1);

    const proofPanel = view.getByText("Last successful Napoleon proof").closest("section") as HTMLElement;
    assert.ok(proofPanel);
    assert.ok(within(proofPanel).getAllByText(capabilityLabel).length >= 1);

    await user.click(view.getByRole("button", { name: "Export Napoleon proof" }));
    const exported = JSON.parse(view.getByLabelText("Exported Napoleon response proof").textContent ?? "{}") as {
      responseProof?: { handledBy?: string; targetCapability?: string };
    };
    assert.equal(exported.responseProof?.handledBy, "napoleon.capability.answer");
    assert.equal(exported.responseProof?.targetCapability, "napoleon.capability.answer");
    const proofExportEvent = telemetryPayloads.find((payload) => payload.event === "napoleon_response_proof_exported");
    assert.ok(proofExportEvent);
    assert.equal(proofExportEvent.attributes.handledBy, "napoleon.capability.answer");
  } finally {
    console.info = originalInfo;
    cleanup();
    dom.window.close();
  }
});
