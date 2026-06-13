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
    const rehearsalCheckbox = screen.getByLabelText("Rehearsal Mode");
    if ((rehearsalCheckbox as HTMLInputElement).checked) {
      await user.click(rehearsalCheckbox);
    }
    await user.type(screen.getByPlaceholderText("Ask Napoleon through Concierge..."), "Draft a bridge readiness summary");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await screen.findByText("Last successful Napoleon proof");
    await user.click(screen.getByRole("button", { name: "Export Napoleon proof" }));
    await screen.findByText("No previous Napoleon response proof is available in this app session.");
    await user.click(screen.getByRole("button", { name: "Export Napoleon proof" }));
    await screen.findByText(/Napoleon response proof is unchanged/);

    const exportBlock = screen.getByLabelText("Exported Napoleon response proof");
    assert.ok(exportBlock.textContent?.includes("concierge_napoleon_response_proof"));
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
