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

test("rendered natural proof source follow-up answers from returned proof without live send", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const requestedUrls: string[] = [];
  let acceptedTraceId = "";

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
          supportedHandoffs: ["text_turn"],
          blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "external_send"],
        },
        checksum: { expected: "sha256:source", actual: "sha256:source" },
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
    acceptedTraceId = body.traceId;
    return harnessJsonResponse(200, {
      text: "Napoleon recommends keeping this as a governed review draft. Passive Brain found bridge context.",
      profileMode: body.profileMode,
      targetAgent: "napoleon.chief_of_staff",
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
        recommendation: "keeping this as a governed review draft",
        selectedAgents: [
          {
            agentId: "passive_brain",
            displayName: "Passive Brain",
            selectionReason: "Prior bridge context is relevant; deployment context was requested.",
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
  }) as typeof fetch;

  try {
    const view = render(<App />);

    await user.click(view.getByRole("button", { name: "Use local harness" }));
    await waitFor(() =>
      assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor")),
    );
    const rehearsalCheckbox = view.getByLabelText("Rehearsal Mode");
    if ((rehearsalCheckbox as HTMLInputElement).checked) {
      fireEvent.click(rehearsalCheckbox);
    }
    await waitFor(() => assert.equal((rehearsalCheckbox as HTMLInputElement).checked, false));
    await user.type(view.getByPlaceholderText("Ask Napoleon through Concierge..."), "Draft a bridge readiness summary");
    await user.click(view.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      assert.ok(
        view.getAllByText(
          "Napoleon recommends keeping this as a governed review draft. Passive Brain found bridge context.",
        ).length >= 1,
      ),
    );
    const turnRequestCount = requestedUrls.filter((url) => url === "http://127.0.0.1:8787/v1/concierge/turn").length;

    fireEvent.change(view.getByPlaceholderText("Ask Napoleon through Concierge..."), {
      target: { value: "where did that come from?" },
    });
    await user.click(view.getByRole("button", { name: "Send" }));

    let sourceAnswer: HTMLElement | undefined;
    await waitFor(() => {
      sourceAnswer = Array.from(document.querySelectorAll("article.assistant"))
        .filter((article) => article.textContent?.includes("Latest Napoleon delegation from returned bridge proof:"))
        .at(-1) as HTMLElement | undefined;
      assert.ok(sourceAnswer);
      assert.ok(sourceAnswer.textContent?.includes(`Trace: ${acceptedTraceId}. Audit: audit_${acceptedTraceId}.`));
      assert.ok(sourceAnswer.textContent?.includes("Proof alignment: same returned trace/audit as Napoleon response proof."));
    });
    assert.ok(sourceAnswer);
    assert.equal(requestedUrls.filter((url) => url === "http://127.0.0.1:8787/v1/concierge/turn").length, turnRequestCount);

    const sourceAnswerEvent = JSON.parse(
      localStorage.getItem("concierge_telemetry_buffer_v1") ?? "{}",
    ).events?.filter((event: { event: string }) => event.event === "napoleon_delegation_answered").at(-1);
    assert.equal(sourceAnswerEvent?.attributes.localAnswerOnly, true);
    assert.equal(sourceAnswerEvent?.attributes.traceReturned, true);
    assert.equal(sourceAnswerEvent?.attributes.auditReturned, true);
    assert.equal(sourceAnswerEvent?.attributes.externalSendPerformed, false);
    assert.equal(JSON.stringify(sourceAnswerEvent).includes("where did that come from?"), false);
    assert.equal(JSON.stringify(sourceAnswerEvent).includes(acceptedTraceId), false);
    assert.equal(JSON.stringify(sourceAnswerEvent).includes("audit_"), false);

    fireEvent.change(view.getByPlaceholderText("Ask Napoleon through Concierge..."), {
      target: { value: "what evidence supports that?" },
    });
    await user.click(view.getByRole("button", { name: "Send" }));

    let evidenceAnswer: HTMLElement | undefined;
    await waitFor(() => {
      evidenceAnswer = Array.from(document.querySelectorAll("article.assistant"))
        .filter((article) => article.textContent?.includes("Latest Napoleon delegation from returned bridge proof:"))
        .at(-1) as HTMLElement | undefined;
      assert.ok(evidenceAnswer);
      assert.ok(evidenceAnswer.textContent?.includes("Handled by: Passive Brain."));
      assert.ok(evidenceAnswer.textContent?.includes("Selected-agent contribution: Passive Brain: bridge context."));
    });
    assert.ok(evidenceAnswer);
    assert.equal(requestedUrls.filter((url) => url === "http://127.0.0.1:8787/v1/concierge/turn").length, turnRequestCount);
  } finally {
    cleanup();
    dom.window.close();
  }
});
