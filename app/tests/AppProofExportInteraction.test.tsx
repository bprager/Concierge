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

test("exports and compares Napoleon proof through rendered app controls", async () => {
  const dom = installDom();
  const [{ cleanup, render, screen, waitFor, within }, userEventModule, { App }] = await Promise.all([
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
          blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "external_send"],
        },
        checksum: { expected: "sha256:ui", actual: "sha256:ui" },
        signature: { valid: true },
      });
    }

    assert.equal(url, "http://127.0.0.1:8787/v1/concierge/turn");
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      traceId: string;
      profileMode: string;
      chiefOfStaffRequest: { request_id: string };
    };
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
  }) as typeof fetch;

  try {
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Use local harness" }));
    await waitFor(() =>
      assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor")),
    );
    assert.ok(screen.getAllByText("ready").length > 0);
    const readinessPanel = screen.getByText("Live bridge readiness").closest("section") as HTMLElement;
    assert.ok(readinessPanel);
    assert.ok(within(readinessPanel).getByText("Local harness only; not real Napoleon runtime validation"));
    await user.click(screen.getByRole("button", { name: "Export readiness proof" }));
    const readinessExport = screen.getByLabelText("Exported bridge readiness proof");
    assert.ok(readinessExport.textContent?.includes('"source": "local_harness"'));
    assert.ok(!readinessExport.textContent?.includes("127.0.0.1"));
    const rehearsalCheckbox = screen.getByLabelText("Rehearsal Mode");
    if ((rehearsalCheckbox as HTMLInputElement).checked) {
      await user.click(rehearsalCheckbox);
    }
    await user.type(screen.getByPlaceholderText("Ask Napoleon through Concierge..."), "Draft a bridge readiness summary");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await screen.findByText("Last successful Napoleon proof");
    const napoleonReply = screen.getByText(
      "Napoleon recommends keeping this as a governed review draft. Passive Brain found bridge context.",
    ).closest("article") as HTMLElement;
    assert.ok(napoleonReply);
    assert.ok(within(napoleonReply).getByText("Source"));
    assert.ok(within(napoleonReply).getByText("Napoleon governed bridge"));
    assert.ok(within(napoleonReply).getByText("Attribution"));
    assert.ok(within(napoleonReply).getByText("Returned bridge provenance only; not local authority."));
    assert.ok(within(napoleonReply).getByText("Capability"));
    assert.ok(within(napoleonReply).getByText("napoleon.chief_of_staff"));
    assert.ok(within(napoleonReply).getByText("Blocked effects"));
    assert.ok(within(napoleonReply).getByText("memory_write, approval_capture, external_send, agent_dispatch"));
    await user.click(screen.getByRole("button", { name: "Export Napoleon proof" }));
    await screen.findByText("No previous Napoleon response proof is available in this app session.");
    await user.click(screen.getByRole("button", { name: "Export Napoleon proof" }));
    await screen.findByText(/Napoleon response proof is unchanged/);

    const exportBlock = screen.getByLabelText("Exported Napoleon response proof");
    assert.ok(exportBlock.textContent?.includes("concierge_napoleon_response_proof"));
    assert.ok(exportBlock.textContent?.includes('"handledBy": "Passive Brain"'));
    assert.ok(exportBlock.textContent?.includes('"attributionBoundary": "Returned bridge provenance only; not local authority."'));
    assert.ok(!exportBlock.textContent?.includes("Draft a bridge readiness summary"));
    assert.ok(!exportBlock.textContent?.includes("127.0.0.1"));
    assert.ok(!exportBlock.textContent?.includes("Napoleon recommends keeping this as a governed review draft"));
    assert.equal(
      within(screen.getByText("Napoleon proof comparison").parentElement as HTMLElement).queryAllByText("Decision")
        .length,
      0,
    );
    assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/turn"));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("shows Napoleon delegation panel before bridge provenance is returned", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("../src/App.js"),
  ]);

  try {
    const view = render(<App />);
    const delegationPanel = within(view.getByLabelText("Napoleon delegation"));

    await delegationPanel.findByText("Napoleon delegation unavailable");
    assert.ok(
      delegationPanel.getByText(
        "No Napoleon delegation provenance was included with this response, so Concierge will not attribute the answer to a capability or agent.",
      ),
    );
    assert.equal(delegationPanel.getAllByText("not returned").length, 6);
    assert.equal(delegationPanel.queryByText(/Passive Brain found/), null);
    assert.equal(delegationPanel.queryByText(/Napoleon recommends/), null);
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("keeps post-preview advisory send disabled while Rehearsal Mode is active", async () => {
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
    assert.equal(url, "http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor");
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
  }) as typeof fetch;

  try {
    const view = render(<App />);

    await user.click(view.getByRole("button", { name: "Use local harness" }));
    await waitFor(() =>
      assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor")),
    );
    const rehearsalCheckbox = view.getByLabelText("Rehearsal Mode") as HTMLInputElement;
    if (!rehearsalCheckbox.checked) {
      await user.click(rehearsalCheckbox);
    }
    fireEvent.change(view.getByPlaceholderText("Ask Napoleon through Concierge..."), {
      target: { value: "Summarize bridge status" },
    });
    await user.click(view.getByRole("button", { name: "Rehearse" }));

    await view.findByText("Rehearsal only");
    const advisoryButton = view.getByRole("button", { name: "Send advisory request" }) as HTMLButtonElement;
    assert.equal(advisoryButton.disabled, true);
    assert.equal(requestedUrls.some((url) => url.endsWith("/v1/concierge/turn")), false);
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("enables post-preview advisory send after Rehearsal Mode is turned off", async () => {
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
          blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "external_send"],
        },
        checksum: { expected: "sha256:ui", actual: "sha256:ui" },
        signature: { valid: true },
      });
    }
    assert.equal(url, "http://127.0.0.1:8787/v1/concierge/turn");
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      traceId: string;
      profileMode: string;
      chiefOfStaffRequest: { request_id: string };
    };
    return harnessJsonResponse(200, {
      text: "Napoleon accepted the rehearsed advisory request for governed review.",
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
    });
  }) as typeof fetch;

  try {
    const view = render(<App />);

    await user.click(view.getByRole("button", { name: "Use local harness" }));
    await waitFor(() =>
      assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor")),
    );
    const rehearsalCheckbox = view.getByLabelText("Rehearsal Mode") as HTMLInputElement;
    if (!rehearsalCheckbox.checked) {
      await user.click(rehearsalCheckbox);
    }
    fireEvent.change(view.getByPlaceholderText("Ask Napoleon through Concierge..."), {
      target: { value: "Summarize bridge status" },
    });
    await user.click(view.getByRole("button", { name: "Rehearse" }));
    await view.findByText("Rehearsal only");
    assert.equal(requestedUrls.some((url) => url.endsWith("/v1/concierge/turn")), false);

    await user.click(view.getByLabelText("Rehearsal Mode"));
    await waitFor(() => assert.equal((view.getByLabelText("Rehearsal Mode") as HTMLInputElement).checked, false));
    const advisoryButton = view.getByRole("button", { name: "Send advisory request" }) as HTMLButtonElement;
    assert.equal(advisoryButton.disabled, false);
    await user.click(advisoryButton);

    await view.findByText("Napoleon accepted the rehearsed advisory request for governed review.");
    assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/turn"));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("shows taxonomy review in governed routes as the canonical steering handoff", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("../src/App.js"),
  ]);

  try {
    const view = render(<App />);
    const routesPanel = view.getByText("Governed Napoleon routes").closest("section") as HTMLElement;
    assert.ok(routesPanel);
    const routes = within(routesPanel);

    assert.ok(routes.getByText("Chief of Staff taxonomy review"));
    assert.ok(routes.getByText("Canonical operation: chief_of_staff_steering"));
    assert.equal(routes.getAllByText("/v1/concierge/chief-of-staff/steering").length, 2);
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("shows fail-closed transcript metadata when Napoleon returns no-go", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor, within }, userEventModule, { App }] = await Promise.all([
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
          blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "external_send"],
        },
        checksum: { expected: "sha256:ui", actual: "sha256:ui" },
        signature: { valid: true },
      });
    }

    assert.equal(url, "http://127.0.0.1:8787/v1/concierge/turn");
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      traceId: string;
      profileMode: string;
      chiefOfStaffRequest: { request_id: string };
    };
    return harnessJsonResponse(200, {
      text: "Napoleon refused the unsafe external action.",
      profileMode: body.profileMode,
      governanceDecision: {
        decision_id: `decision_${body.traceId}`,
        request_id: body.chiefOfStaffRequest.request_id,
        outcome: "no_go",
        authority_tier: "prohibited",
        approval_requirement: "unavailable",
        rationale: "No-go decisions must fail closed in Concierge.",
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
        authority_tier: "prohibited",
        approval_requirement: "unavailable",
        evidence_links: [`trace:${body.traceId}`, "harness:local"],
      },
    });
  }) as typeof fetch;

  try {
    const view = render(<App />);

    await user.click(view.getByRole("button", { name: "Use local harness" }));
    await waitFor(() =>
      assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor")),
    );
    await waitFor(() => assert.ok(view.getAllByText("ready").length > 0));
    const rehearsalCheckbox = view.getByLabelText("Rehearsal Mode") as HTMLInputElement;
    assert.ok(rehearsalCheckbox);
    if (rehearsalCheckbox.checked) {
      await user.click(rehearsalCheckbox);
    }
    await waitFor(() => assert.equal((view.getByLabelText("Rehearsal Mode") as HTMLInputElement).checked, false));
    const composer = view.getByPlaceholderText("Ask Napoleon through Concierge...") as HTMLTextAreaElement;
    fireEvent.change(composer, { target: { value: "Draft a bridge readiness summary" } });
    await waitFor(() => assert.equal(composer.value, "Draft a bridge readiness summary"));
    await waitFor(() => assert.equal((view.getByRole("button", { name: "Send" }) as HTMLButtonElement).disabled, false));
    await user.click(view.getByRole("button", { name: "Send" }));
    await waitFor(() => assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/turn")));

    const blockedMessages = await view.findAllByText(/Napoleon bridge blocked: governance_no_go/);
    const blockedReply = blockedMessages.find((message) => message.closest("article"))?.closest("article") as HTMLElement | null;
    assert.ok(blockedReply);
    assert.equal(view.queryByText("Napoleon refused the unsafe external action."), null);
    assert.ok(within(blockedReply).getByText("Blocked Napoleon governed bridge attempt"));
    assert.ok(within(blockedReply).getByText("No Napoleon response was accepted; fail-closed local state only."));
    assert.ok(within(blockedReply).getByText("Governance"));
    assert.ok(within(blockedReply).getByText("no_go"));
    assert.ok(within(blockedReply).getByText("Decision"));
    assert.ok(within(blockedReply).getAllByText(/decision_trace_/).length > 0);
    assert.ok(within(blockedReply).getByText("Audit"));
    assert.ok(within(blockedReply).getAllByText(/audit_trace_/).length > 0);
    assert.ok(within(blockedReply).getByText("Blocked effects"));
    assert.ok(within(blockedReply).getByText("memory_write, approval_capture, external_send, agent_dispatch"));
    assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/turn"));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("blocks rendered live send before fetch when descriptor integrity mismatches", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const requestedUrls: string[] = [];
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async (input: string | URL | Request) => {
      requestedUrls.push(String(input));
      return harnessJsonResponse(500, { error: "unexpected fetch" });
    }) as typeof fetch;

    const view = render(<App />);
    fireEvent.change(view.getByLabelText("Napoleon endpoint"), { target: { value: "http://127.0.0.1:8787" } });
    fireEvent.change(view.getByLabelText("Descriptor"), { target: { value: "checksum_mismatch" } });

    await view.findByText("Napoleon descriptor signature or checksum mismatch detected; Concierge is fail-closed.");
    const contractStatus = view.getByText("Connection state").closest("section") as HTMLElement;
    assert.ok(contractStatus);
    assert.ok(within(contractStatus).getByText("descriptor_mismatch"));
    assert.ok(within(contractStatus).getByText("mismatch"));
    assert.ok(within(contractStatus).getByText("invalid"));

    const rehearsalCheckbox = view.getByLabelText("Rehearsal Mode") as HTMLInputElement;
    if (rehearsalCheckbox.checked) {
      await user.click(rehearsalCheckbox);
    }
    await waitFor(() => assert.equal((view.getByLabelText("Rehearsal Mode") as HTMLInputElement).checked, false));
    const composer = view.getByPlaceholderText("Ask Napoleon through Concierge...") as HTMLTextAreaElement;
    fireEvent.change(composer, { target: { value: "Draft a bridge readiness summary" } });
    await waitFor(() => assert.equal(composer.value, "Draft a bridge readiness summary"));
    await user.click(view.getByRole("button", { name: "Send" }));

    const blockedMessages = await view.findAllByText(/Napoleon bridge blocked: descriptor_mismatch/);
    const blockedReply = blockedMessages.find((message) => message.closest("article"))?.closest("article") as HTMLElement | null;
    assert.ok(blockedReply);
    assert.ok(within(blockedReply).getByText("Blocked Napoleon governed bridge attempt"));
    assert.ok(within(blockedReply).getByText("No Napoleon response was accepted; fail-closed local state only."));
    assert.ok(within(blockedReply).getByText("Blocked effects"));
    assert.ok(within(blockedReply).getAllByText(/runtime_authority/).length > 0);
    assert.equal(
      requestedUrls.some((url) => url === "http://127.0.0.1:8787/v1/concierge/turn"),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    dom.window.close();
  }
});

test("blocks rendered live send before fetch when no Napoleon endpoint is configured", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const requestedUrls: string[] = [];
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async (input: string | URL | Request) => {
      requestedUrls.push(String(input));
      return harnessJsonResponse(500, { error: "unexpected fetch" });
    }) as typeof fetch;

    const view = render(<App />);
    fireEvent.change(view.getByLabelText("Napoleon endpoint"), { target: { value: "" } });
    const preflight = view.getByText("Live send preflight").closest("div")?.parentElement as HTMLElement | null;
    assert.ok(preflight);
    assert.ok(preflight.classList.contains("blocked"));
    assert.ok(within(preflight).getByText("Endpoint configured"));
    assert.ok(within(preflight).getByText("No Napoleon endpoint is configured."));

    const rehearsalCheckbox = view.getByLabelText("Rehearsal Mode") as HTMLInputElement;
    if (rehearsalCheckbox.checked) {
      await user.click(rehearsalCheckbox);
    }
    await waitFor(() => assert.equal((view.getByLabelText("Rehearsal Mode") as HTMLInputElement).checked, false));
    const composer = view.getByPlaceholderText("Ask Napoleon through Concierge...") as HTMLTextAreaElement;
    fireEvent.change(composer, { target: { value: "Draft a bridge readiness summary" } });
    await waitFor(() => assert.equal(composer.value, "Draft a bridge readiness summary"));
    await user.click(view.getByRole("button", { name: "Send" }));

    const blockedMessages = await view.findAllByText(/Napoleon bridge blocked: no_endpoint/);
    const blockedReply = blockedMessages.find((message) => message.closest("article"))?.closest("article") as HTMLElement | null;
    assert.ok(blockedReply);
    assert.ok(within(blockedReply).getByText("Blocked Napoleon governed bridge attempt"));
    assert.ok(within(blockedReply).getByText("No Napoleon response was accepted; fail-closed local state only."));
    assert.ok(within(blockedReply).getByText("Blocked effects"));
    assert.ok(within(blockedReply).getAllByText(/external_send/).length > 0);
    assert.equal(requestedUrls.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    dom.window.close();
  }
});

test("blocks rendered live send before fetch when endpoint changes without live descriptor discovery", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const requestedUrls: string[] = [];
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async (input: string | URL | Request) => {
      requestedUrls.push(String(input));
      return harnessJsonResponse(500, { error: "unexpected fetch" });
    }) as typeof fetch;

    const view = render(<App />);
    fireEvent.change(view.getByLabelText("Napoleon endpoint"), { target: { value: "http://127.0.0.1:8787" } });

    await waitFor(() => assert.ok(view.getAllByText("No Napoleon Chief of Staff descriptor has been discovered.").length > 0));
    const preflight = view.getByText("Live send preflight").closest("div")?.parentElement as HTMLElement | null;
    assert.ok(preflight);
    assert.ok(preflight.classList.contains("blocked"));
    assert.ok(within(preflight).getByText("Descriptor discovered"));
    assert.ok(within(preflight).getByText("No Napoleon Chief of Staff descriptor has been discovered."));

    const rehearsalCheckbox = view.getByLabelText("Rehearsal Mode") as HTMLInputElement;
    if (rehearsalCheckbox.checked) {
      await user.click(rehearsalCheckbox);
    }
    await waitFor(() => assert.equal((view.getByLabelText("Rehearsal Mode") as HTMLInputElement).checked, false));
    const composer = view.getByPlaceholderText("Ask Napoleon through Concierge...") as HTMLTextAreaElement;
    fireEvent.change(composer, { target: { value: "Draft a bridge readiness summary" } });
    await waitFor(() => assert.equal(composer.value, "Draft a bridge readiness summary"));
    await user.click(view.getByRole("button", { name: "Send" }));

    const blockedMessages = await view.findAllByText(/Napoleon bridge blocked: descriptor_mismatch/);
    const blockedReply = blockedMessages.find((message) => message.closest("article"))?.closest("article") as HTMLElement | null;
    assert.ok(blockedReply);
    assert.ok(within(blockedReply).getByText("Blocked Napoleon governed bridge attempt"));
    assert.ok(within(blockedReply).getByText("No Napoleon response was accepted; fail-closed local state only."));
    assert.ok(within(blockedReply).getByText("Blocked effects"));
    assert.equal(requestedUrls.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    dom.window.close();
  }
});

test("blocks rendered live send before fetch when no Napoleon descriptor is discovered", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const requestedUrls: string[] = [];
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async (input: string | URL | Request) => {
      requestedUrls.push(String(input));
      return harnessJsonResponse(500, { error: "unexpected fetch" });
    }) as typeof fetch;

    const view = render(<App />);
    fireEvent.change(view.getByLabelText("Napoleon endpoint"), { target: { value: "http://127.0.0.1:8787" } });
    fireEvent.change(view.getByLabelText("Descriptor"), { target: { value: "missing" } });

    await waitFor(() => assert.ok(view.getAllByText("No Napoleon Chief of Staff descriptor has been discovered.").length > 0));
    const preflight = view.getByText("Live send preflight").closest("div")?.parentElement as HTMLElement | null;
    assert.ok(preflight);
    assert.ok(preflight.classList.contains("blocked"));
    assert.ok(within(preflight).getByText("Descriptor discovered"));
    assert.ok(within(preflight).getByText("No Napoleon Chief of Staff descriptor has been discovered."));

    const rehearsalCheckbox = view.getByLabelText("Rehearsal Mode") as HTMLInputElement;
    if (rehearsalCheckbox.checked) {
      await user.click(rehearsalCheckbox);
    }
    await waitFor(() => assert.equal((view.getByLabelText("Rehearsal Mode") as HTMLInputElement).checked, false));
    const composer = view.getByPlaceholderText("Ask Napoleon through Concierge...") as HTMLTextAreaElement;
    fireEvent.change(composer, { target: { value: "Draft a bridge readiness summary" } });
    await waitFor(() => assert.equal(composer.value, "Draft a bridge readiness summary"));
    await user.click(view.getByRole("button", { name: "Send" }));

    const blockedMessages = await view.findAllByText(/Napoleon bridge blocked: descriptor_mismatch/);
    const blockedReply = blockedMessages.find((message) => message.closest("article"))?.closest("article") as HTMLElement | null;
    assert.ok(blockedReply);
    assert.ok(within(blockedReply).getByText("Blocked Napoleon governed bridge attempt"));
    assert.ok(within(blockedReply).getByText("No Napoleon response was accepted; fail-closed local state only."));
    assert.ok(within(blockedReply).getByText("Blocked effects"));
    assert.ok(within(blockedReply).getAllByText(/external_send/).length > 0);
    assert.equal(
      requestedUrls.some((url) => url === "http://127.0.0.1:8787/v1/concierge/turn"),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    dom.window.close();
  }
});

test("shows fail-closed transcript metadata when Napoleon auth fails", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const requestedUrls: string[] = [];
  const authHeaders: Array<string | undefined> = [];
  const postedBodies: string[] = [];
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      requestedUrls.push(url);
      const headers = init?.headers as Record<string, string> | undefined;
      authHeaders.push(headers?.Authorization);
      if (init?.body) {
        postedBodies.push(String(init.body));
      }
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

      assert.equal(url, "http://127.0.0.1:8787/v1/concierge/turn");
      return harnessJsonResponse(401, { text: "Unauthorized secret_token" });
    }) as typeof fetch;

    const view = render(<App />);
    fireEvent.change(view.getByLabelText("Napoleon endpoint"), { target: { value: "http://127.0.0.1:8787" } });
    fireEvent.change(view.getByLabelText("Bridge token"), { target: { value: "secret_token" } });
    await user.click(view.getByRole("button", { name: "Discover descriptor" }));
    await waitFor(() =>
      assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor")),
    );
    await view.findByText("Napoleon Chief of Staff descriptor is discovered, valid, and contract-only.");

    const rehearsalCheckbox = view.getByLabelText("Rehearsal Mode") as HTMLInputElement;
    if (rehearsalCheckbox.checked) {
      await user.click(rehearsalCheckbox);
    }
    await waitFor(() => assert.equal((view.getByLabelText("Rehearsal Mode") as HTMLInputElement).checked, false));
    const composer = view.getByPlaceholderText("Ask Napoleon through Concierge...") as HTMLTextAreaElement;
    fireEvent.change(composer, { target: { value: "Draft a bridge readiness summary" } });
    await waitFor(() => assert.equal(composer.value, "Draft a bridge readiness summary"));
    await user.click(view.getByRole("button", { name: "Send" }));
    await waitFor(() => assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/turn")));

    const blockedMessages = await view.findAllByText(/Napoleon bridge blocked: auth_failure/);
    const blockedReply = blockedMessages.find((message) => message.closest("article"))?.closest("article") as HTMLElement | null;
    assert.ok(blockedReply);
    assert.ok(within(blockedReply).getByText("Blocked Napoleon governed bridge attempt"));
    assert.ok(within(blockedReply).getByText("No Napoleon response was accepted; fail-closed local state only."));
    assert.ok(within(blockedReply).getByText("Blocked effects"));
    assert.ok(within(blockedReply).getAllByText(/external_send/).length > 0);
    assert.ok(authHeaders.includes("Bearer secret_token"));
    assert.equal(postedBodies.some((body) => body.includes("secret_token")), false);
    assert.equal(view.container.textContent?.includes("Unauthorized secret_token"), false);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    dom.window.close();
  }
});

test("blocks rendered live send before fetch when descriptor discovery auth fails", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const requestedUrls: string[] = [];
  const authHeaders: Array<string | undefined> = [];
  const postedBodies: string[] = [];
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      requestedUrls.push(url);
      const headers = init?.headers as Record<string, string> | undefined;
      authHeaders.push(headers?.Authorization);
      if (init?.body) {
        postedBodies.push(String(init.body));
      }
      if (url === "http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor") {
        return harnessJsonResponse(401, { text: "Unauthorized secret_token" });
      }

      assert.fail(`unexpected fetch after descriptor auth failure: ${url}`);
    }) as typeof fetch;

    const view = render(<App />);
    fireEvent.change(view.getByLabelText("Napoleon endpoint"), { target: { value: "http://127.0.0.1:8787" } });
    fireEvent.change(view.getByLabelText("Bridge token"), { target: { value: "secret_token" } });
    await user.click(view.getByRole("button", { name: "Discover descriptor" }));
    await waitFor(() =>
      assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor")),
    );
    const authFailureMessages = await view.findAllByText(
      "Napoleon descriptor discovery failed authentication, so Concierge is blocked from live bridge sends.",
    );
    assert.ok(authFailureMessages.length > 0);

    const rehearsalCheckbox = view.getByLabelText("Rehearsal Mode") as HTMLInputElement;
    if (rehearsalCheckbox.checked) {
      await user.click(rehearsalCheckbox);
    }
    await waitFor(() => assert.equal((view.getByLabelText("Rehearsal Mode") as HTMLInputElement).checked, false));
    const composer = view.getByPlaceholderText("Ask Napoleon through Concierge...") as HTMLTextAreaElement;
    fireEvent.change(composer, { target: { value: "Draft a bridge readiness summary" } });
    await waitFor(() => assert.equal(composer.value, "Draft a bridge readiness summary"));
    await user.click(view.getByRole("button", { name: "Send" }));

    const blockedMessages = await view.findAllByText(/Napoleon bridge blocked: auth_failure/);
    const blockedReply = blockedMessages.find((message) => message.closest("article"))?.closest("article") as HTMLElement | null;
    assert.ok(blockedReply);
    assert.ok(within(blockedReply).getByText("Blocked Napoleon governed bridge attempt"));
    assert.ok(within(blockedReply).getByText("No Napoleon response was accepted; fail-closed local state only."));
    assert.equal(
      requestedUrls.some((url) => url === "http://127.0.0.1:8787/v1/concierge/turn"),
      false,
    );
    assert.ok(authHeaders.includes("Bearer secret_token"));
    assert.equal(postedBodies.length, 0);
    assert.equal(view.container.textContent?.includes("Unauthorized secret_token"), false);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    dom.window.close();
  }
});

test("shows fail-closed transcript metadata when Napoleon bridge times out", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const requestedUrls: string[] = [];
  const originalFetch = globalThis.fetch;

  try {
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
            blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "external_send"],
          },
          checksum: { expected: "sha256:ui", actual: "sha256:ui" },
          signature: { valid: true },
        });
      }

      assert.equal(url, "http://127.0.0.1:8787/v1/concierge/turn");
      const error = new Error("Simulated transport timeout with private endpoint detail");
      error.name = "AbortError";
      throw error;
    }) as typeof fetch;

    const view = render(<App />);
    fireEvent.change(view.getByLabelText("Napoleon endpoint"), { target: { value: "http://127.0.0.1:8787" } });
    await user.click(view.getByRole("button", { name: "Discover descriptor" }));
    await waitFor(() =>
      assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor")),
    );
    await view.findByText("Napoleon Chief of Staff descriptor is discovered, valid, and contract-only.");

    const rehearsalCheckbox = view.getByLabelText("Rehearsal Mode") as HTMLInputElement;
    if (rehearsalCheckbox.checked) {
      await user.click(rehearsalCheckbox);
    }
    await waitFor(() => assert.equal((view.getByLabelText("Rehearsal Mode") as HTMLInputElement).checked, false));
    const composer = view.getByPlaceholderText("Ask Napoleon through Concierge...") as HTMLTextAreaElement;
    fireEvent.change(composer, { target: { value: "Draft a bridge readiness summary" } });
    await waitFor(() => assert.equal(composer.value, "Draft a bridge readiness summary"));
    await user.click(view.getByRole("button", { name: "Send" }));
    await waitFor(() => assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/turn")));

    const blockedMessages = await view.findAllByText(/Napoleon bridge blocked: bridge_timeout/);
    const blockedReply = blockedMessages.find((message) => message.closest("article"))?.closest("article") as HTMLElement | null;
    assert.ok(blockedReply);
    assert.ok(within(blockedReply).getByText("Blocked Napoleon governed bridge attempt"));
    assert.ok(within(blockedReply).getByText("No Napoleon response was accepted; fail-closed local state only."));
    assert.ok(within(blockedReply).getByText("Blocked effects"));
    assert.ok(within(blockedReply).getAllByText(/external_send/).length > 0);
    assert.equal(view.container.textContent?.includes("Simulated transport timeout with private endpoint detail"), false);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    dom.window.close();
  }
});

test("shows fail-closed transcript metadata when Napoleon response mismatches the contract", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const requestedUrls: string[] = [];
  const originalFetch = globalThis.fetch;

  try {
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

      assert.equal(url, "http://127.0.0.1:8787/v1/concierge/turn");
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        traceId: string;
        profileMode: string;
        chiefOfStaffRequest: { request_id: string };
      };
      return harnessJsonResponse(200, {
        text: "Napoleon wrote memory and sent the deployment summary externally.",
        profileMode: body.profileMode,
        governanceDecision: {
          decision_id: `decision_${body.traceId}`,
          request_id: body.chiefOfStaffRequest.request_id,
          outcome: "requires_review",
          authority_tier: "advisory_review",
          approval_requirement: "chief_of_staff_and_owner_review",
          rationale: "The response claims effects that Concierge must not accept.",
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

    const view = render(<App />);
    fireEvent.change(view.getByLabelText("Napoleon endpoint"), { target: { value: "http://127.0.0.1:8787" } });
    await user.click(view.getByRole("button", { name: "Discover descriptor" }));
    await waitFor(() =>
      assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor")),
    );
    await view.findByText("Napoleon Chief of Staff descriptor is discovered, valid, and contract-only.");

    const rehearsalCheckbox = view.getByLabelText("Rehearsal Mode") as HTMLInputElement;
    if (rehearsalCheckbox.checked) {
      await user.click(rehearsalCheckbox);
    }
    await waitFor(() => assert.equal((view.getByLabelText("Rehearsal Mode") as HTMLInputElement).checked, false));
    const composer = view.getByPlaceholderText("Ask Napoleon through Concierge...") as HTMLTextAreaElement;
    fireEvent.change(composer, { target: { value: "Send the deployment summary" } });
    await waitFor(() => assert.equal(composer.value, "Send the deployment summary"));
    await user.click(view.getByRole("button", { name: "Send" }));
    await waitFor(() => assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/turn")));

    const blockedMessages = await view.findAllByText(/Napoleon bridge blocked: contract_mismatch/);
    const blockedReply = blockedMessages.find((message) => message.closest("article"))?.closest("article") as HTMLElement | null;
    assert.ok(blockedReply);
    assert.equal(view.queryByText("Napoleon wrote memory and sent the deployment summary externally."), null);
    assert.ok(within(blockedReply).getByText("Blocked Napoleon governed bridge attempt"));
    assert.ok(within(blockedReply).getByText("No Napoleon response was accepted; fail-closed local state only."));
    assert.ok(within(blockedReply).getByText("Blocked effects"));
    assert.ok(within(blockedReply).getAllByText(/memory_write/).length > 0);
    assert.ok(within(blockedReply).getAllByText(/external_send/).length > 0);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    dom.window.close();
  }
});

test("shows active profile boundary when Napoleon response tries to drift profile scope", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const requestedUrls: string[] = [];
  const telemetryPayloads: Array<{ event: string; attributes: Record<string, unknown> }> = [];
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;

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

      assert.equal(url, "http://127.0.0.1:8787/v1/concierge/turn");
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        traceId: string;
        profileMode: string;
        chiefOfStaffRequest: { request_id: string };
      };
      assert.equal(body.profileMode, "child_protected_user");
      return harnessJsonResponse(200, {
        text: "Prepared through Napoleon.",
        profileMode: "adult_owner",
        governanceDecision: {
          decision_id: `decision_${body.traceId}`,
          request_id: body.chiefOfStaffRequest.request_id,
          outcome: "requires_review",
          authority_tier: "advisory_review",
          approval_requirement: "guardian_owner_review_required",
          rationale: "Profile scope drift must fail closed.",
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
          timestamp: "2026-06-14T00:00:00.000Z",
        },
        auditEnvelope: {
          audit_id: `audit_${body.traceId}`,
          trace_id: body.traceId,
          decision_id: `decision_${body.traceId}`,
          actor_id: "napoleon.local_harness",
          authority_tier: "advisory_review",
          approval_requirement: "guardian_owner_review_required",
          evidence_links: [`trace:${body.traceId}`, "harness:local"],
        },
      });
    }) as typeof fetch;

    const view = render(<App />);
    fireEvent.change(view.getByLabelText("User profile"), { target: { value: "child_protected" } });
    fireEvent.change(view.getByLabelText("Napoleon endpoint"), { target: { value: "http://127.0.0.1:8787" } });
    await user.click(view.getByRole("button", { name: "Discover descriptor" }));
    await waitFor(() =>
      assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor")),
    );
    await view.findByText("Napoleon Chief of Staff descriptor is discovered, valid, and contract-only.");

    const rehearsalCheckbox = view.getByLabelText("Rehearsal Mode") as HTMLInputElement;
    if (rehearsalCheckbox.checked) {
      await user.click(rehearsalCheckbox);
    }
    await waitFor(() => assert.equal((view.getByLabelText("Rehearsal Mode") as HTMLInputElement).checked, false));
    const composer = view.getByPlaceholderText("Ask Napoleon through Concierge...") as HTMLTextAreaElement;
    fireEvent.change(composer, { target: { value: "Remember this without telling anyone" } });
    await waitFor(() => assert.equal(composer.value, "Remember this without telling anyone"));
    await user.click(view.getByRole("button", { name: "Send" }));
    await waitFor(() => assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/turn")));

    const blockedMessages = await view.findAllByText(/Napoleon bridge blocked: contract_mismatch/);
    const blockedReply = blockedMessages.find((message) => message.closest("article"))?.closest("article") as HTMLElement | null;
    assert.ok(blockedReply);
    assert.equal(view.queryByText("Prepared through Napoleon."), null);
    assert.ok(within(blockedReply).getByText("Blocked Napoleon governed bridge attempt"));
    assert.ok(within(blockedReply).getByText("No Napoleon response was accepted; fail-closed local state only."));
    assert.ok(within(blockedReply).getByText("Profile mode"));
    assert.ok(within(blockedReply).getByText("child_protected_user"));
    const responseFailed = telemetryPayloads.find((payload) => payload.event === "response_failed");
    assert.ok(responseFailed);
    assert.equal(responseFailed.attributes.profile, "child_protected");
    assert.equal(responseFailed.attributes.profileMode, "child_protected_user");
    assert.equal(responseFailed.attributes.bridgeFailureReason, "contract_mismatch");
    const blockedEffects = responseFailed.attributes.blockedEffects as string[];
    assert.ok(blockedEffects.includes("memory_write"));
    assert.ok(blockedEffects.includes("approval_capture"));
    assert.ok(blockedEffects.includes("external_send"));
    assert.ok(blockedEffects.includes("agent_dispatch"));
    const capabilitySignal = telemetryPayloads.find(
      (payload) =>
        payload.event === "conversation_capability_signal" &&
        payload.attributes.traceId === responseFailed.attributes.traceId &&
        payload.attributes.outcomeSignal === "bridge_failed",
    );
    assert.ok(capabilitySignal);
    assert.equal(capabilitySignal.attributes.profileMode, "child_protected_user");
    assert.equal(capabilitySignal.attributes.privacyClass, "child_sensitive");
  } finally {
    globalThis.fetch = originalFetch;
    console.info = originalInfo;
    cleanup();
    dom.window.close();
  }
});

test("drafts a proposal-only taxonomy review from rendered app controls", async () => {
  const dom = installDom();
  const [{ cleanup, render }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();

  try {
    const view = render(<App />);

    await user.click(view.getByRole("button", { name: "Draft taxonomy review" }));

    await view.findByText("Chief of Staff taxonomy review draft");
    assert.ok(view.getByText(/proposal only; no approval captured; no memory write/));
    assert.ok(view.getByText("Evolution proposal"));
    assert.ok(view.getByText(/evo_capability_taxonomy_review_/));
    assert.ok(view.getByText("No local taxonomy review recommendations yet."));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("shows guardian review on child protected taxonomy review drafts before handoff", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();

  try {
    const view = render(<App />);

    fireEvent.change(view.getByLabelText("User profile"), { target: { value: "child_protected" } });
    await user.click(view.getByRole("button", { name: "Draft taxonomy review" }));

    await view.findByText("Chief of Staff taxonomy review draft");
    assert.ok(view.getByText(/guardian_and_owner_review_required_before_child_protected_taxonomy_change/));
    assert.equal(view.queryByText(/Napoleon Chief of Staff and owner review before taxonomy cleanup/), null);
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("submits a steering draft through rendered governed controls without local side effects", async () => {
  const dom = installDom();
  const [{ cleanup, render }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const requestedUrls: string[] = [];
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrls.push(String(input));
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (String(input).endsWith("/v1/concierge/chief-of-staff/descriptor")) {
        return new Response(
          JSON.stringify({
            descriptor: {
              schemaVersion: "napoleon/concierge/chief-of-staff-service/v1",
              serviceId: "napoleon.chief_of_staff",
              runtimeAuthority: false,
              commandExecution: false,
              cachePolicy: "fail_closed_to_review_required",
              blockedEffects: ["runtime_authority", "memory_write", "agent_dispatch"],
            },
            checksum: {
              expected: "sha256:local-static",
              actual: "sha256:local-static",
            },
            signature: {
              valid: true,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (String(input).endsWith("/v1/concierge/chief-of-staff/steering")) {
        assert.equal(body.requestKind, "chief_of_staff_steering_handoff");
        assert.equal(body.boundary.proposalOnly, true);
        assert.equal(body.boundary.agentDispatchAllowed, false);
        assert.ok(body.blockedEffects.includes("agent_dispatch"));
        return new Response(
          JSON.stringify({
            text: "Napoleon accepted the steering draft for review.",
            governanceDecision: {
              decision_id: "decision_steering_rendered",
              request_id: body.chiefOfStaffRequest.request_id,
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              rationale: "Capability changes require review before rollout.",
              blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
              trace_id: body.traceEnvelope.trace_id,
              audit_id: "audit_steering_rendered",
            },
            traceEnvelope: {
              trace_id: body.traceEnvelope.trace_id,
              parent_trace_id: body.traceEnvelope.parent_trace_id,
              actor_id: "napoleon.chief_of_staff",
              request_id: body.chiefOfStaffRequest.request_id,
              decision_id: "decision_steering_rendered",
              timestamp: "2026-06-14T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_steering_rendered",
              trace_id: body.traceEnvelope.trace_id,
              decision_id: "decision_steering_rendered",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              evidence_links: ["trace:steering-rendered"],
            },
            appliedLocally: false,
            memoryWritePerformed: false,
            approvalCaptured: false,
            agentDispatchPerformed: false,
            externalSendPerformed: false,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    const view = render(<App />);
    await user.click(view.getByRole("button", { name: "Use local harness" }));
    await view.findByText("Napoleon Chief of Staff descriptor is discovered, valid, and contract-only.");
    await user.click(view.getByRole("button", { name: "Draft Chief of Staff steering proposal" }));
    await view.findByText("Chief of Staff steering draft");
    await user.click(view.getByRole("button", { name: "Send steering draft to Napoleon review" }));

    await view.findByText("Napoleon accepted the steering draft for review.");
    assert.ok(view.getByText(/decision_steering_rendered/));
    assert.ok(view.getByText(/audit_steering_rendered/));
    assert.ok(view.getByText("not applied; no memory write; no approval captured; no agent dispatch; no external send."));
    assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/chief-of-staff/steering"));
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    dom.window.close();
  }
});

test("submits a memory proposal through rendered governed controls without local side effects", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const requestedUrls: string[] = [];
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrls.push(String(input));
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (String(input).endsWith("/v1/concierge/chief-of-staff/descriptor")) {
        return new Response(
          JSON.stringify({
            descriptor: {
              schemaVersion: "napoleon/concierge/chief-of-staff-service/v1",
              serviceId: "napoleon.chief_of_staff",
              runtimeAuthority: false,
              commandExecution: false,
              cachePolicy: "fail_closed_to_review_required",
              blockedEffects: ["runtime_authority", "memory_write", "agent_dispatch"],
            },
            checksum: {
              expected: "sha256:local-static",
              actual: "sha256:local-static",
            },
            signature: {
              valid: true,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (String(input).endsWith("/v1/concierge/turn")) {
        return new Response(
          JSON.stringify({
            text: "Napoleon prepared the preference note for review.",
            profileMode: body.profileMode,
            targetAgent: "napoleon.memory",
            governanceDecision: {
              decision_id: "decision_memory_turn_rendered",
              request_id: body.chiefOfStaffRequest.request_id,
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              rationale: "Memory-like requests require governed review.",
              blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
              trace_id: body.traceId,
              audit_id: "audit_memory_turn_rendered",
            },
            traceEnvelope: {
              trace_id: body.traceId,
              parent_trace_id: "rendered-memory",
              actor_id: "napoleon.chief_of_staff",
              request_id: body.chiefOfStaffRequest.request_id,
              decision_id: "decision_memory_turn_rendered",
              timestamp: "2026-06-14T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_memory_turn_rendered",
              trace_id: body.traceId,
              decision_id: "decision_memory_turn_rendered",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              evidence_links: ["trace:memory-turn-rendered"],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (String(input).endsWith("/v1/concierge/memory-proposals")) {
        assert.equal(body.requestKind, "memory_proposal_review_handoff");
        assert.equal(body.boundary.proposalOnly, true);
        assert.equal(body.boundary.agentDispatchAllowed, false);
        assert.ok(body.blockedEffects.includes("agent_dispatch"));
        return new Response(
          JSON.stringify({
            text: "Napoleon accepted the memory proposal for review.",
            governanceDecision: {
              decision_id: "decision_memory_review_rendered",
              request_id: body.chiefOfStaffRequest.request_id,
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              rationale: "Memory write remains blocked pending review.",
              blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
              trace_id: body.traceEnvelope.trace_id,
              audit_id: "audit_memory_review_rendered",
            },
            traceEnvelope: {
              trace_id: body.traceEnvelope.trace_id,
              parent_trace_id: body.traceEnvelope.parent_trace_id,
              actor_id: "napoleon.chief_of_staff",
              request_id: body.chiefOfStaffRequest.request_id,
              decision_id: "decision_memory_review_rendered",
              timestamp: "2026-06-14T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_memory_review_rendered",
              trace_id: body.traceEnvelope.trace_id,
              decision_id: "decision_memory_review_rendered",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              evidence_links: ["trace:memory-review-rendered"],
            },
            memoryWritePerformed: false,
            approvalCaptured: false,
            agentDispatchPerformed: false,
            externalSendPerformed: false,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    const view = render(<App />);
    await user.click(view.getByRole("button", { name: "Use local harness" }));
    await view.findByText("Napoleon Chief of Staff descriptor is discovered, valid, and contract-only.");
    const rehearsalCheckbox = view.getByLabelText("Rehearsal Mode") as HTMLInputElement;
    if (rehearsalCheckbox.checked) {
      await user.click(rehearsalCheckbox);
    }
    await waitFor(() => assert.equal((view.getByLabelText("Rehearsal Mode") as HTMLInputElement).checked, false));
    fireEvent.change(view.getByPlaceholderText("Ask Napoleon through Concierge..."), {
      target: { value: "Remember that I prefer concise updates" },
    });
    await user.click(view.getByRole("button", { name: "Send" }));
    await view.findByText("Napoleon prepared the preference note for review.");
    await user.click(view.getByRole("button", { name: "Send memory proposal to Napoleon review" }));

    await view.findByText("Napoleon accepted the memory proposal for review.");
    assert.ok(view.getByText(/decision_memory_review_rendered/));
    assert.ok(view.getByText(/audit_memory_review_rendered/));
    assert.ok(view.getByText("no memory write; no approval captured; no agent dispatch; no external send."));
    assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/memory-proposals"));
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    dom.window.close();
  }
});

test("blocks taxonomy review handoff visibly when no Napoleon endpoint is configured", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();

  try {
    const view = render(<App />);

    await user.click(view.getByRole("button", { name: "Draft taxonomy review" }));

    const heading = await view.findByText("Chief of Staff taxonomy review readiness");
    const readiness = heading.closest("section") as HTMLElement;
    assert.ok(readiness);
    assert.ok(within(readiness).getByText(/blocked until the review draft, endpoint, descriptor preflight, and Rehearsal Mode state are ready/));
    assert.ok(within(readiness).getByText("Endpoint configured"));
    assert.ok(within(readiness).getByText(/blocked: No Napoleon endpoint is configured/));
    assert.ok(within(readiness).getByText("Descriptor preflight"));
    assert.ok(within(readiness).getByText(/ready: Descriptor discovery and integrity checks/));
    assert.ok(within(readiness).getByText(/not Napoleon approval/));
    assert.equal(view.getByRole("button", { name: "Send taxonomy review to Napoleon review" }).hasAttribute("disabled"), true);
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("blocks taxonomy review handoff while Rehearsal Mode is active", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const requestedUrls: string[] = [];
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requestedUrls.push(String(input));
      if (String(input).endsWith("/v1/concierge/chief-of-staff/descriptor")) {
        return new Response(
          JSON.stringify({
            descriptor: {
              schemaVersion: "napoleon/concierge/chief-of-staff-service/v1",
              serviceId: "napoleon.chief_of_staff",
              runtimeAuthority: false,
              commandExecution: false,
              cachePolicy: "fail_closed_to_review_required",
              blockedEffects: ["runtime_authority", "memory_write", "external_send"],
            },
            checksum: {
              expected: "sha256:local-static",
              actual: "sha256:local-static",
            },
            signature: {
              valid: true,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("unexpected governed handoff", { status: 500 });
    }) as typeof fetch;

    const view = render(<App />);
    fireEvent.change(view.getByLabelText("Napoleon endpoint"), { target: { value: "http://127.0.0.1:8787" } });
    await user.click(view.getByRole("button", { name: "Discover descriptor" }));
    await view.findByText("Napoleon Chief of Staff descriptor is discovered, valid, and contract-only.");
    assert.equal((view.getByLabelText("Rehearsal Mode") as HTMLInputElement).checked, true);

    await user.click(view.getByRole("button", { name: "Draft taxonomy review" }));

    const heading = await view.findByText("Chief of Staff taxonomy review readiness");
    const readiness = heading.closest("section") as HTMLElement;
    assert.ok(readiness);
    assert.ok(within(readiness).getByText("Rehearsal Mode"));
    assert.ok(within(readiness).getByText(/blocked: Rehearsal Mode is active/));
    assert.equal(view.getByRole("button", { name: "Send taxonomy review to Napoleon review" }).hasAttribute("disabled"), true);
    assert.equal(
      requestedUrls.some((url) => url.endsWith("/v1/concierge/chief-of-staff/steering")),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    dom.window.close();
  }
});

test("submits a taxonomy review draft through rendered governed controls", async () => {
  const dom = installDom();
  const [{ cleanup, render }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const requestedUrls: string[] = [];
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrls.push(String(input));
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (String(input).endsWith("/v1/concierge/chief-of-staff/descriptor")) {
        return new Response(
          JSON.stringify({
            descriptor: {
              schemaVersion: "napoleon/concierge/chief-of-staff-service/v1",
              serviceId: "napoleon.chief_of_staff",
              runtimeAuthority: false,
              commandExecution: false,
              cachePolicy: "fail_closed_to_review_required",
              blockedEffects: ["runtime_authority", "memory_write"],
            },
            checksum: {
              expected: "sha256:local-static",
              actual: "sha256:local-static",
            },
            signature: {
              valid: true,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (String(input).endsWith("/v1/concierge/chief-of-staff/steering")) {
        assert.equal(body.requestKind, "chief_of_staff_steering_handoff");
        assert.equal(body.taxonomyReview.reviewType, "chief_of_staff_taxonomy_review");
        assert.equal(body.recommendation.capability, "capability_taxonomy_review");
        assert.equal(body.recommendation.proposalOnly, true);
        return new Response(
          JSON.stringify({
            text: "Napoleon accepted the taxonomy review packet for review.",
            governanceDecision: {
              decision_id: "decision_taxonomy_rendered",
              request_id: body.chiefOfStaffRequest.request_id,
              outcome: "requires_review",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              rationale: "Taxonomy cleanup requires review before application.",
              blocked_effects: ["memory_write", "agent_dispatch", "external_send", "approval_capture"],
              trace_id: body.traceEnvelope.trace_id,
              audit_id: "audit_taxonomy_rendered",
            },
            traceEnvelope: {
              trace_id: body.traceEnvelope.trace_id,
              parent_trace_id: body.traceEnvelope.parent_trace_id,
              actor_id: "napoleon.chief_of_staff",
              request_id: body.chiefOfStaffRequest.request_id,
              decision_id: "decision_taxonomy_rendered",
              timestamp: "2026-06-13T00:00:00.000Z",
            },
            auditEnvelope: {
              audit_id: "audit_taxonomy_rendered",
              trace_id: body.traceEnvelope.trace_id,
              decision_id: "decision_taxonomy_rendered",
              actor_id: "napoleon.chief_of_staff",
              authority_tier: "advisory_review",
              approval_requirement: "chief_of_staff_and_owner_review",
              evidence_links: ["trace:taxonomy-rendered"],
            },
            appliedLocally: false,
            memoryWritePerformed: false,
            approvalCaptured: false,
            agentDispatchPerformed: false,
            externalSendPerformed: false,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    const view = render(<App />);
    await user.click(view.getByRole("button", { name: "Use local harness" }));
    await view.findByText("Napoleon Chief of Staff descriptor is discovered, valid, and contract-only.");
    await user.click(view.getByRole("button", { name: "Draft taxonomy review" }));
    await user.click(view.getByRole("button", { name: "Send taxonomy review to Napoleon review" }));

    await view.findByText("Napoleon accepted the taxonomy review packet for review.");
    assert.ok(view.getByText(/decision_taxonomy_rendered/));
    assert.ok(view.getByText(/audit_taxonomy_rendered/));
    assert.ok(view.getByText("not applied; no memory write; no approval captured; no agent dispatch; no external send."));
    assert.ok(requestedUrls.includes("http://127.0.0.1:8787/v1/concierge/chief-of-staff/steering"));
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    dom.window.close();
  }
});

test("exposes collaborator profile in rendered app controls", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render }, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("../src/App.js"),
  ]);

  try {
    const view = render(<App />);
    const profileSelect = view.getByLabelText("User profile") as HTMLSelectElement;

    assert.ok(view.getByRole("option", { name: "Collaborator" }));
    fireEvent.change(profileSelect, { target: { value: "collaborator" } });

    assert.equal(profileSelect.value, "collaborator");
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("renders local privacy controls for telemetry camera and microphone", async () => {
  const dom = installDom();
  const [{ cleanup, render }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();

  try {
    const view = render(<App />);
    const telemetry = view.getByLabelText("Local telemetry") as HTMLInputElement;
    const camera = view.getByLabelText("Camera") as HTMLInputElement;
    const microphone = view.getByLabelText("Microphone") as HTMLInputElement;

    assert.equal(telemetry.checked, true);
    assert.equal(camera.checked, false);
    assert.equal(microphone.checked, false);
    assert.ok(view.getByText("Local telemetry on, camera off, microphone off"));

    await user.click(camera);
    await user.click(microphone);
    await user.click(telemetry);

    assert.equal(localStorage.getItem("concierge_camera_enabled"), "true");
    assert.equal(localStorage.getItem("concierge_microphone_enabled"), "true");
    assert.equal(localStorage.getItem("concierge_telemetry_enabled"), "false");
    assert.ok(view.getByText("Local telemetry off, camera on, microphone on"));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("keeps voice capture blocked until explicit microphone permission is granted", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  let permissionRequests = 0;
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        permissionRequests += 1;
        return {
          getTracks: () => [{ stop: () => undefined }],
        };
      },
    },
  });

  try {
    const view = render(<App />);

    await view.findByText("Voice readiness");
    const voiceReadiness = within(view.getByLabelText("Voice readiness"));
    assert.ok(voiceReadiness.getByText("Microphone setting off"));
    assert.ok(voiceReadiness.getByText("Permission not requested"));
    assert.ok(voiceReadiness.getByText("Voice capture blocked: microphone setting is off and OS permission is not granted."));

    await user.click(view.getByLabelText("Microphone"));

    assert.equal(permissionRequests, 0);
    assert.ok(voiceReadiness.getByText("Microphone setting on"));
    assert.ok(voiceReadiness.getByText("Voice capture blocked: OS microphone permission is not granted."));

    await user.click(view.getByRole("button", { name: "Request microphone permission" }));

    assert.equal(permissionRequests, 1);
    assert.ok(voiceReadiness.getByText("Permission granted"));
    assert.ok(voiceReadiness.getByText("Voice capture ready but stopped; voice mode is not active."));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("runs local voice activity sample without starting microphone capture", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  let permissionRequests = 0;
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        permissionRequests += 1;
        return {
          getTracks: () => [{ stop: () => undefined }],
        };
      },
    },
  });

  try {
    const view = render(<App />);

    await view.findByText("Voice activity detection");
    const vadReadiness = within(view.getByLabelText("Voice activity detection"));
    assert.ok(vadReadiness.getByText("VAD sample not run"));
    assert.ok(vadReadiness.getByText("Microphone capture stopped; local sample only."));

    await user.click(view.getByRole("button", { name: "Run local VAD sample" }));

    assert.equal(permissionRequests, 0);
    assert.ok(vadReadiness.getByText("Detected 2 local sample voice segments."));
    assert.ok(vadReadiness.getByText("40-160 ms, peak 0.09"));
    assert.ok(vadReadiness.getByText("280-400 ms, peak 0.07"));
    assert.ok(vadReadiness.getByText("Raw audio stored: no"));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("runs local speech transcription sample without starting microphone capture", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  let permissionRequests = 0;
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        permissionRequests += 1;
        return {
          getTracks: () => [{ stop: () => undefined }],
        };
      },
    },
  });

  try {
    const view = render(<App />);

    await view.findByText("Speech transcription");
    const sttReadiness = within(view.getByLabelText("Speech transcription"));
    assert.ok(sttReadiness.getByText("STT sample not run"));
    assert.ok(sttReadiness.getByText("Microphone capture stopped; local sample only."));

    await user.click(view.getByRole("button", { name: "Run local STT sample" }));

    assert.equal(permissionRequests, 0);
    assert.ok(sttReadiness.getByText("Concierge voice sample detected."));
    assert.ok(sttReadiness.getByText("Model: local-sample-stt"));
    assert.ok(sttReadiness.getByText("Raw audio stored: no"));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("runs local text to speech sample without starting audio playback", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  let permissionRequests = 0;
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        permissionRequests += 1;
        return {
          getTracks: () => [{ stop: () => undefined }],
        };
      },
    },
  });

  try {
    const view = render(<App />);

    await view.findByText("Text to speech");
    const ttsReadiness = within(view.getByLabelText("Text to speech"));
    assert.ok(ttsReadiness.getByText("TTS sample not run"));
    assert.ok(ttsReadiness.getByText("Audio playback stopped; local sample only."));

    await user.click(view.getByRole("button", { name: "Run local TTS sample" }));

    assert.equal(permissionRequests, 0);
    assert.ok(ttsReadiness.getByText("Prepared 32 characters for local sample speech."));
    assert.ok(ttsReadiness.getByText("Voice: local-sample-voice"));
    assert.ok(ttsReadiness.getByText("Audio playback started: no"));
    assert.ok(ttsReadiness.getByText("Raw audio stored: no"));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("runs local voice turn rehearsal without contacting Napoleon or starting media", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  let permissionRequests = 0;
  let fetchCalls = 0;
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        permissionRequests += 1;
        return {
          getTracks: () => [{ stop: () => undefined }],
        };
      },
    },
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () => {
      fetchCalls += 1;
      throw new Error("voice turn rehearsal must stay local");
    },
  });

  try {
    const view = render(<App />);

    await view.findByText("Voice turn rehearsal");
    const rehearsal = within(view.getByLabelText("Voice turn rehearsal"));
    assert.ok(rehearsal.getByText("Voice rehearsal not run"));
    assert.ok(rehearsal.getByText("Napoleon contact: no"));

    await user.click(view.getByRole("button", { name: "Run local voice rehearsal" }));

    assert.equal(permissionRequests, 0);
    assert.equal(fetchCalls, 0);
    assert.ok(rehearsal.getByText("VAD: 2 segments"));
    assert.ok(rehearsal.getByText("STT: Concierge voice sample detected."));
    assert.ok(rehearsal.getByText("Text boundary: Napoleon not contacted; no delegated agent response."));
    assert.ok(rehearsal.getByText("TTS: local-sample-voice prepared without playback."));
    assert.ok(rehearsal.getByText("Blocked effects: microphone_capture, audio_playback, raw_audio_storage, live_napoleon_contact, memory_write, approval_capture, external_send, agent_dispatch"));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("runs local barge-in rehearsal without contacting Napoleon or starting media", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  let permissionRequests = 0;
  let fetchCalls = 0;
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        permissionRequests += 1;
        return {
          getTracks: () => [{ stop: () => undefined }],
        };
      },
    },
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () => {
      fetchCalls += 1;
      throw new Error("barge-in rehearsal must stay local");
    },
  });

  try {
    const view = render(<App />);

    await view.findByText("Barge-in rehearsal");
    const rehearsal = within(view.getByLabelText("Barge-in rehearsal"));
    assert.ok(rehearsal.getByText("Barge-in rehearsal not run"));
    assert.ok(rehearsal.getByText("Playback state: stopped"));

    await user.click(view.getByRole("button", { name: "Run local barge-in rehearsal" }));

    assert.equal(permissionRequests, 0);
    assert.equal(fetchCalls, 0);
    assert.ok(rehearsal.getByText("Barge-in detected: yes"));
    assert.ok(rehearsal.getByText("Interrupted output: local-sample-voice at 480 ms"));
    assert.ok(rehearsal.getByText("Next turn prepared: yes"));
    assert.ok(rehearsal.getByText("Napoleon contact: no"));
    assert.ok(rehearsal.getByText("Blocked effects: audio_playback, microphone_capture, raw_audio_storage, live_napoleon_contact, memory_write, approval_capture, external_send, agent_dispatch"));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("shapes a local voice response preview without contacting Napoleon or starting media", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  let permissionRequests = 0;
  let fetchCalls = 0;
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        permissionRequests += 1;
        return {
          getTracks: () => [{ stop: () => undefined }],
        };
      },
    },
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () => {
      fetchCalls += 1;
      throw new Error("voice response shaping must stay local");
    },
  });

  try {
    const view = render(<App />);

    await view.findByText("Voice response shaping");
    const shaping = within(view.getByLabelText("Voice response shaping"));
    assert.ok(shaping.getByText("Voice response not shaped"));
    assert.ok(shaping.getByText("Audio playback state: stopped"));

    await user.click(view.getByRole("button", { name: "Shape sample response for voice" }));

    assert.equal(permissionRequests, 0);
    assert.equal(fetchCalls, 0);
    assert.ok(shaping.getByText("Shortened for speech: yes"));
    assert.ok(shaping.getByText("Spoken summary: Napoleon says: Prepare the bridge rollout plan for owner review. Passive Brain found that descriptor discovery is ready."));
    assert.ok(shaping.getByText("Authority boundary: Bridge-provided Napoleon provenance preserved for speech."));
    assert.ok(shaping.getByText("Audio playback started: no"));
    assert.ok(shaping.getByText("Blocked effects: audio_playback, microphone_capture, raw_audio_storage, live_napoleon_contact, memory_write, approval_capture, external_send, agent_dispatch"));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("uses stricter child protected voice shaping without contacting Napoleon or starting media", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  let permissionRequests = 0;
  let fetchCalls = 0;
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        permissionRequests += 1;
        return {
          getTracks: () => [{ stop: () => undefined }],
        };
      },
    },
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () => {
      fetchCalls += 1;
      throw new Error("child voice shaping must stay local");
    },
  });

  try {
    const view = render(<App />);

    fireEvent.change(view.getByLabelText("User profile"), { target: { value: "child_protected" } });
    await view.findByText("Voice response shaping");
    const shaping = within(view.getByLabelText("Voice response shaping"));

    await user.click(view.getByRole("button", { name: "Shape sample response for voice" }));

    assert.equal(permissionRequests, 0);
    assert.equal(fetchCalls, 0);
    assert.ok(shaping.getByText("Profile: child protected"));
    assert.ok(shaping.getByText("Pacing: slow"));
    assert.ok(shaping.getByText("Guardian review reminder: yes"));
    assert.ok(shaping.getByText("Spoken summary: Napoleon says: Prepare the bridge rollout plan for owner review. Please check this with your guardian review."));
    assert.ok(shaping.getByText("Authority boundary: Child protected speech preview is shortened, slower, and still requires guardian/owner review; it is not Napoleon approval."));
    assert.ok(shaping.getByText("Audio playback started: no"));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("keeps camera capture blocked until explicit camera permission is granted", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  let permissionRequests = 0;
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        permissionRequests += 1;
        return {
          getTracks: () => [{ stop: () => undefined }],
        };
      },
    },
  });

  try {
    const view = render(<App />);

    await view.findByText("Camera readiness");
    const cameraReadiness = within(view.getByLabelText("Camera readiness"));
    assert.ok(cameraReadiness.getByText("Camera setting off"));
    assert.ok(cameraReadiness.getByText("Permission not requested"));
    assert.ok(cameraReadiness.getByText("Camera capture blocked: camera setting is off and OS permission is not granted."));

    await user.click(view.getByLabelText("Camera"));

    assert.equal(permissionRequests, 0);
    assert.ok(cameraReadiness.getByText("Camera setting on"));
    assert.ok(cameraReadiness.getByText("Camera capture blocked: OS camera permission is not granted."));

    await user.click(view.getByRole("button", { name: "Request camera permission" }));

    assert.equal(permissionRequests, 1);
    assert.ok(cameraReadiness.getByText("Permission granted"));
    assert.ok(cameraReadiness.getByText("Camera capture ready but stopped; avatar/camera mode is not active."));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("builds local neutral avatar state without camera capture or Napoleon contact", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  let permissionRequests = 0;
  let fetchCalls = 0;
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        permissionRequests += 1;
        return {
          getTracks: () => [{ stop: () => undefined }],
        };
      },
    },
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () => {
      fetchCalls += 1;
      throw new Error("avatar state preview must stay local");
    },
  });

  try {
    const view = render(<App />);

    await view.findByText("Avatar state");
    const avatarState = within(view.getByLabelText("Avatar state"));
    assert.ok(avatarState.getByText("Avatar state not prepared"));
    assert.ok(avatarState.getByText("Camera capture: stopped"));

    await user.click(view.getByRole("button", { name: "Prepare neutral avatar state" }));

    assert.equal(permissionRequests, 0);
    assert.equal(fetchCalls, 0);
    assert.ok(avatarState.getByText("Avatar state: neutral_listening"));
    assert.ok(avatarState.getByText("Expression: neutral"));
    assert.ok(avatarState.getByText("Stance: direct_strategic"));
    assert.ok(avatarState.getByText("Provenance: Local preview without Napoleon provenance"));
    assert.ok(avatarState.getByText("Authority boundary: Avatar preview must not claim Napoleon or delegated-agent authority without bridge provenance."));
    assert.ok(avatarState.getByText("Face detection started: no"));
    assert.ok(avatarState.getByText("Affect inferred: no"));
    assert.ok(avatarState.getByText("Blocked effects: camera_capture, face_detection, affect_inference, avatar_animation, live_napoleon_contact, memory_write, approval_capture, external_send, agent_dispatch"));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("applies child protected avatar state constraints from rendered profile controls", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  let permissionRequests = 0;
  let fetchCalls = 0;
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        permissionRequests += 1;
        return {
          getTracks: () => [{ stop: () => undefined }],
        };
      },
    },
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () => {
      fetchCalls += 1;
      throw new Error("child avatar state preview must stay local");
    },
  });

  try {
    const view = render(<App />);
    fireEvent.change(view.getByLabelText("User profile"), { target: { value: "child_protected" } });

    await user.click(view.getByRole("button", { name: "Prepare neutral avatar state" }));

    const avatarState = within(view.getByLabelText("Avatar state"));
    assert.equal(permissionRequests, 0);
    assert.equal(fetchCalls, 0);
    assert.ok(avatarState.getByText("Profile: child_protected"));
    assert.ok(avatarState.getByText("Child protected: yes"));
    assert.ok(avatarState.getByText("Camera policy: disabled_until_guardian_review"));
    assert.ok(avatarState.getByText("Affect policy: disabled"));
    assert.ok(avatarState.getByText("Guardian reminder: Guardian review is required before child avatar camera or affect features."));
    assert.ok(avatarState.getByText("Guardian approval captured: no"));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("loads local avatar model metadata without renderer camera or Napoleon contact", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  let permissionRequests = 0;
  let fetchCalls = 0;
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        permissionRequests += 1;
        return {
          getTracks: () => [{ stop: () => undefined }],
        };
      },
    },
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () => {
      fetchCalls += 1;
      throw new Error("avatar model load must stay local");
    },
  });

  try {
    const view = render(<App />);

    await view.findByText("Avatar model");
    const avatarModel = within(view.getByLabelText("Avatar model"));
    assert.ok(avatarModel.getByText("Avatar model not loaded"));
    assert.ok(avatarModel.getByText("Renderer started: no"));

    await user.click(view.getByRole("button", { name: "Load local avatar model" }));

    assert.equal(permissionRequests, 0);
    assert.equal(fetchCalls, 0);
    assert.ok(avatarModel.getByText("Model loaded: Concierge Neutral"));
    assert.ok(avatarModel.getByText("Model format: vrm"));
    assert.ok(avatarModel.getByText("Model path: avatars/concierge-neutral.vrm"));
    assert.ok(avatarModel.getByText("Profile: adult_owner"));
    assert.ok(avatarModel.getByText("Camera capture started: no"));
    assert.ok(avatarModel.getByText("Affect inferred: no"));
    assert.ok(avatarModel.getByText("Live Napoleon contacted: no"));
    assert.ok(avatarModel.getByText("Blocked effects: renderer_start, camera_capture, face_detection, affect_inference, live_napoleon_contact, memory_write, approval_capture, external_send, agent_dispatch"));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("prepares avatar renderer readiness without starting rendering camera or Napoleon contact", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  let permissionRequests = 0;
  let fetchCalls = 0;
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        permissionRequests += 1;
        return {
          getTracks: () => [{ stop: () => undefined }],
        };
      },
    },
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () => {
      fetchCalls += 1;
      throw new Error("avatar renderer readiness must stay local");
    },
  });

  try {
    const view = render(<App />);

    await view.findByText("Avatar renderer");
    const avatarRenderer = within(view.getByLabelText("Avatar renderer"));
    assert.ok(avatarRenderer.getByText("Renderer readiness not prepared"));
    assert.ok(avatarRenderer.getByText("Renderer started: no"));

    await user.click(view.getByRole("button", { name: "Load local avatar model" }));
    await user.click(view.getByRole("button", { name: "Prepare renderer readiness" }));

    assert.equal(permissionRequests, 0);
    assert.equal(fetchCalls, 0);
    assert.ok(avatarRenderer.getByText("Renderer ready: yes"));
    assert.ok(avatarRenderer.getByText("Model: Concierge Neutral"));
    assert.ok(avatarRenderer.getByText("Render loop started: no"));
    assert.ok(avatarRenderer.getByText("Canvas allocated: no"));
    assert.ok(avatarRenderer.getByText("Camera capture started: no"));
    assert.ok(avatarRenderer.getByText("Live Napoleon contacted: no"));
    assert.ok(avatarRenderer.getByText("Blocked effects: renderer_start, render_loop, canvas_allocation, camera_capture, face_detection, affect_inference, live_napoleon_contact, memory_write, approval_capture, external_send, agent_dispatch"));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("maps avatar stance to expression metadata without animation or emotion inference", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  let permissionRequests = 0;
  let fetchCalls = 0;
  const telemetryPayloads: Array<{ event: string; attributes: Record<string, unknown> }> = [];
  const originalInfo = console.info;
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        permissionRequests += 1;
        return {
          getTracks: () => [{ stop: () => undefined }],
        };
      },
    },
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () => {
      fetchCalls += 1;
      throw new Error("avatar expression mapping must stay local");
    },
  });

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

    await view.findByText("Avatar expression");
    const avatarExpression = within(view.getByLabelText("Avatar expression"));
    assert.ok(avatarExpression.getByText("Expression not mapped"));
    assert.ok(avatarExpression.getByText("Avatar animation started: no"));

    await user.click(view.getByRole("button", { name: "Map sample stance to expression" }));

    assert.equal(permissionRequests, 0);
    assert.equal(fetchCalls, 0);
    const expressionEvent = telemetryPayloads.find((payload) => payload.event === "avatar_expression_set");
    assert.ok(expressionEvent);
    assert.equal(expressionEvent.attributes.localMetadataOnly, true);
    assert.equal(expressionEvent.attributes.bridgeProvidedProvenance, false);
    assert.ok(avatarExpression.getByText("Expression: focused_neutral"));
    assert.ok(avatarExpression.getByText("Stance: direct"));
    assert.ok(avatarExpression.getByText("Affect inferred: no"));
    assert.ok(avatarExpression.getByText("Authority boundary: Expression reflects local stance metadata only; it is not emotion inference, approval, or agent action."));
    assert.ok(avatarExpression.getByText("Blocked effects: avatar_animation, affect_inference, camera_capture, face_detection, live_napoleon_contact, memory_write, approval_capture, external_send, agent_dispatch"));
  } finally {
    console.info = originalInfo;
    cleanup();
    dom.window.close();
  }
});
