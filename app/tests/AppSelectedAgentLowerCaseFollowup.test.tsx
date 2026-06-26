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

function agentMetadataPayload() {
  return {
    agents: [
      {
        agentId: "napoleon.research_analyst",
        displayName: "Research Analyst",
        description: "Reviews Napoleon bridge evidence.",
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
  };
}

function profileMetadataPayload() {
  return {
    profileId: "adult_owner",
    label: "Adult owner",
    retentionMode: "derived_signals_only",
    runtimeAuthority: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    blockedEffects: ["memory_write", "approval_capture"],
  };
}

test("rendered lower-case selected-agent follow-up answers from returned proof without live send", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const requestedUrls: string[] = [];
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
        checksum: { expected: "sha256:ui", actual: "sha256:ui" },
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
      return harnessJsonResponse(200, agentMetadataPayload());
    }
    if (url === "http://127.0.0.1:8787/profiles/adult_owner") {
      return harnessJsonResponse(200, profileMetadataPayload());
    }

    assert.equal(url, "http://127.0.0.1:8787/v1/concierge/turn");
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      traceId: string;
      profileMode: string;
      chiefOfStaffRequest: { request_id: string };
    };
    return harnessJsonResponse(200, {
      text: "Passive Brain found the prior rollout note.",
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
            agentId: "napoleon.passive_brain",
            displayName: "Passive Brain",
            selectionReason: "Prior rollout memory was relevant.",
            contributionSummary: "Found the prior rollout note.",
          },
          {
            agentId: "napoleon.research_analyst",
            displayName: "Research Analyst",
            selectionReason: "Architecture evidence needed review.",
            contributionSummary: "Found descriptor alignment risk.",
          },
        ],
        allowedEffects: ["prepare_advisory_response"],
        blockedEffects: ["memory_write", "approval_capture", "external_send", "agent_dispatch"],
        governanceState: "requires_review",
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

    await waitFor(() => assert.ok(view.getAllByText(/Passive Brain found the prior rollout note/).length >= 1));
    const turnRequestCount = requestedUrls.filter((url) => url === "http://127.0.0.1:8787/v1/concierge/turn").length;

    fireEvent.change(view.getByPlaceholderText("Ask Napoleon through Concierge..."), {
      target: { value: "what did research analyst find?" },
    });
    await user.click(view.getByRole("button", { name: "Send" }));

    let followUpAnswer: HTMLElement | undefined;
    await waitFor(() => {
      followUpAnswer = Array.from(document.querySelectorAll("article.assistant"))
        .filter((article) => article.textContent?.includes("Latest Napoleon delegation from returned bridge proof:"))
        .at(-1) as HTMLElement | undefined;
      assert.ok(followUpAnswer);
      assert.ok(followUpAnswer.textContent?.includes("Selected-agent contribution: Research Analyst: Found descriptor alignment risk."));
    });
    assert.ok(followUpAnswer);
    assert.equal(requestedUrls.filter((url) => url === "http://127.0.0.1:8787/v1/concierge/turn").length, turnRequestCount);
    assert.equal(followUpAnswer.textContent?.includes("Passive Brain: Found the prior rollout note."), false);
    const delegationAnswerEvent = JSON.parse(
      localStorage.getItem("concierge_telemetry_buffer_v1") ?? "{}",
    ).events?.filter((event: { event: string }) => event.event === "napoleon_delegation_answered").at(-1);
    assert.equal(delegationAnswerEvent?.attributes.localAnswerOnly, true);
    assert.equal(delegationAnswerEvent?.attributes.selectedAgentContributionCount, 1);
    assert.equal(delegationAnswerEvent?.attributes.externalSendPerformed, false);
    assert.equal(JSON.stringify(delegationAnswerEvent).includes("what did research analyst find?"), false);
    assert.equal(JSON.stringify(delegationAnswerEvent).includes("Research Analyst"), false);
    assert.equal(JSON.stringify(delegationAnswerEvent).includes("descriptor alignment risk"), false);

    fireEvent.change(view.getByPlaceholderText("Ask Napoleon through Concierge..."), {
      target: { value: "why was research analyst selected?" },
    });
    await user.click(view.getByRole("button", { name: "Send" }));

    let reasonAnswer: HTMLElement | undefined;
    await waitFor(() => {
      reasonAnswer = Array.from(document.querySelectorAll("article.assistant"))
        .filter((article) => article.textContent?.includes("Latest Napoleon delegation from returned bridge proof:"))
        .at(-1) as HTMLElement | undefined;
      assert.ok(reasonAnswer);
      assert.ok(reasonAnswer.textContent?.includes("Why selected: Research Analyst: Architecture evidence needed review."));
    });
    assert.ok(reasonAnswer);
    assert.equal(requestedUrls.filter((url) => url === "http://127.0.0.1:8787/v1/concierge/turn").length, turnRequestCount);
    assert.equal(reasonAnswer.textContent?.includes("Passive Brain: Prior rollout memory was relevant."), false);
    const reasonAnswerEvent = JSON.parse(
      localStorage.getItem("concierge_telemetry_buffer_v1") ?? "{}",
    ).events?.filter((event: { event: string }) => event.event === "napoleon_delegation_answered").at(-1);
    assert.equal(reasonAnswerEvent?.attributes.localAnswerOnly, true);
    assert.equal(reasonAnswerEvent?.attributes.selectedAgentReasonCount, 1);
    assert.equal(reasonAnswerEvent?.attributes.externalSendPerformed, false);
    assert.equal(JSON.stringify(reasonAnswerEvent).includes("why was research analyst selected?"), false);
    assert.equal(JSON.stringify(reasonAnswerEvent).includes("Research Analyst"), false);
    assert.equal(JSON.stringify(reasonAnswerEvent).includes("Architecture evidence"), false);
  } finally {
    cleanup();
    dom.window.close();
  }
});
