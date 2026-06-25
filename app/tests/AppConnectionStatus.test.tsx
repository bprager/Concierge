import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

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

test("connection state card exposes fail-closed reason and blocked effects before live send", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("../src/App.js"),
  ]);

  try {
    const view = render(<App />);
    const connection = within(view.getByLabelText("Napoleon connection state"));

    assert.ok(connection.getByText("Connection state"));
    assert.ok(connection.getByText("Fail-closed reason"));
    assert.equal(connection.getAllByText("no_endpoint").length, 2);
    assert.ok(connection.getByText("Descriptor freshness"));
    assert.ok(connection.getByText("not timestamped"));
    assert.ok(connection.getByText("Blocked effects"));
    assert.ok(connection.getByText(/runtime_authority/));
    assert.ok(connection.getByText(/memory_write/));
    assert.ok(connection.getByText(/approval_capture/));
    assert.ok(connection.getByText(/external_send/));
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("connection guide shows the first-run next step before live send", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, within }, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("../src/App.js"),
  ]);

  try {
    const view = render(<App />);
    const guide = within(view.getByLabelText("Napoleon connection guide"));

    assert.ok(guide.getByText("First-run path"));
    assert.ok(guide.getByText("configure endpoint"));
    assert.ok(guide.getByText("Next step: add the governed Napoleon endpoint in settings, then run descriptor discovery."));
    assert.ok(guide.getByText("Live send ready: no"));
    assert.ok(guide.getByText("Authority boundary: local readiness only; not Napoleon approval."));

    fireEvent.click(view.getByRole("button", { name: "Export readiness proof" }));
    const proof = JSON.parse(view.getByLabelText("Exported bridge readiness proof").textContent ?? "{}") as {
      connectionGuide?: {
        currentStep?: string;
        nextLocalAction?: string;
        liveSendReady?: boolean;
        endpointConfigured?: boolean;
        descriptorDiscovered?: boolean;
        descriptorFreshnessState?: string;
        textTurnRouteAdvertised?: boolean;
        authorityBoundary?: string;
        approvalCaptured?: boolean;
        memoryWritePerformed?: boolean;
        agentDispatchPerformed?: boolean;
        externalSendPerformed?: boolean;
      };
    };

    assert.equal(proof.connectionGuide?.currentStep, "configure_endpoint");
    assert.equal(
      proof.connectionGuide?.nextLocalAction,
      "Next step: add the governed Napoleon endpoint in settings, then run descriptor discovery.",
    );
    assert.equal(proof.connectionGuide?.liveSendReady, false);
    assert.equal(proof.connectionGuide?.endpointConfigured, false);
    assert.equal(proof.connectionGuide?.descriptorDiscovered, false);
    assert.equal(proof.connectionGuide?.descriptorFreshnessState, "not_timestamped");
    assert.equal(proof.connectionGuide?.textTurnRouteAdvertised, false);
    assert.equal(proof.connectionGuide?.authorityBoundary, "local readiness only; not Napoleon approval");
    assert.equal(proof.connectionGuide?.approvalCaptured, false);
    assert.equal(proof.connectionGuide?.memoryWritePerformed, false);
    assert.equal(proof.connectionGuide?.agentDispatchPerformed, false);
    assert.equal(proof.connectionGuide?.externalSendPerformed, false);
    assert.equal(view.getByLabelText("Exported bridge readiness proof").textContent?.includes("127.0.0.1"), false);
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("text concierge answers Napoleon connection setup questions locally without network calls", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;

  try {
    globalThis.fetch = (async () => {
      fetchCalled = true;
      throw new Error("connection setup local answer must not contact Napoleon");
    }) as typeof fetch;

    const view = render(<App />);
    const composer = view.getByPlaceholderText("Ask Napoleon through Concierge...") as HTMLTextAreaElement;
    fireEvent.change(composer, { target: { value: "How do I connect to Napoleon?" } });
    await waitFor(() => assert.equal(composer.value, "How do I connect to Napoleon?"));
    await user.click(view.getByRole("button", { name: "Rehearse" }));

    let answer: HTMLElement | undefined;
    await waitFor(() => {
      answer = Array.from(document.querySelectorAll("article.assistant")).find((article) =>
        article.textContent?.includes("Napoleon connection setup from local readiness:")
      ) as HTMLElement | undefined;
      assert.ok(answer);
    });
    assert.ok(answer);
    const answerText = answer.textContent ?? "";
    assert.ok(answerText.includes("Current step: configure endpoint."));
    assert.ok(answerText.includes("Live send ready: no."));
    assert.ok(
      answerText.includes("Next step: add the governed Napoleon endpoint in settings, then run descriptor discovery."),
    );
    assert.ok(answerText.includes("Authority boundary: local readiness only; not Napoleon approval."));
    assert.ok(
      answerText.includes(
        "This local answer did not contact Napoleon, approve, write memory, dispatch agents, capture approval, or send externally.",
      ),
    );
    assert.equal(fetchCalled, false);

    fireEvent.click(view.getByRole("button", { name: "Export telemetry buffer" }));
    const telemetryBuffer = JSON.parse(view.getByLabelText("Telemetry buffer export").textContent ?? "{}") as {
      events?: Array<{ event: string; attributes: Record<string, unknown> }>;
    };
    const answerEvent = telemetryBuffer.events
      ?.filter((event) => event.event === "napoleon_connection_setup_answered")
      .at(-1);
    assert.equal(answerEvent?.attributes.localAnswerOnly, true);
    assert.equal(answerEvent?.attributes.currentStep, "configure_endpoint");
    assert.equal(answerEvent?.attributes.liveSendReady, false);
    assert.equal(answerEvent?.attributes.endpointConfigured, false);
    assert.equal(answerEvent?.attributes.descriptorDiscovered, false);
    assert.equal(answerEvent?.attributes.textTurnRouteAdvertised, false);
    assert.equal(answerEvent?.attributes.approvalCaptured, false);
    assert.equal(answerEvent?.attributes.memoryWritePerformed, false);
    assert.equal(answerEvent?.attributes.agentDispatchPerformed, false);
    assert.equal(answerEvent?.attributes.externalSendPerformed, false);
    assert.equal(JSON.stringify(answerEvent).includes("How do I connect to Napoleon?"), false);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    dom.window.close();
  }
});

test("text concierge answers Napoleon connection repair questions with blocker and next action", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;

  try {
    globalThis.fetch = (async () => {
      fetchCalled = true;
      throw new Error("connection repair local answer must not contact Napoleon");
    }) as typeof fetch;

    const view = render(<App />);
    const composer = view.getByPlaceholderText("Ask Napoleon through Concierge...") as HTMLTextAreaElement;
    fireEvent.change(composer, { target: { value: "Why can't I connect to Napoleon?" } });
    await waitFor(() => assert.equal(composer.value, "Why can't I connect to Napoleon?"));
    await user.click(view.getByRole("button", { name: "Rehearse" }));

    let answer: HTMLElement | undefined;
    await waitFor(() => {
      answer = Array.from(document.querySelectorAll("article.assistant")).find((article) =>
        article.textContent?.includes("Napoleon connection repair from local readiness:")
      ) as HTMLElement | undefined;
      assert.ok(answer);
    });
    assert.ok(answer);
    const answerText = answer.textContent ?? "";
    assert.ok(answerText.includes("Blocking reason: no_endpoint."));
    assert.ok(answerText.includes("Next local action: add the governed Napoleon endpoint in settings, then run descriptor discovery."));
    assert.ok(answerText.includes("Live send ready: no."));
    assert.ok(answerText.includes("Authority boundary: local readiness guidance only; not Napoleon approval."));
    assert.ok(
      answerText.includes(
        "This local answer did not contact Napoleon, approve, write memory, dispatch agents, capture approval, or send externally.",
      ),
    );
    assert.equal(fetchCalled, false);

    fireEvent.click(view.getByRole("button", { name: "Export telemetry buffer" }));
    const telemetryBuffer = JSON.parse(view.getByLabelText("Telemetry buffer export").textContent ?? "{}") as {
      events?: Array<{ event: string; attributes: Record<string, unknown> }>;
    };
    const answerEvent = telemetryBuffer.events
      ?.filter((event) => event.event === "napoleon_connection_repair_answered")
      .at(-1);
    assert.equal(answerEvent?.attributes.localAnswerOnly, true);
    assert.equal(answerEvent?.attributes.blockingReason, "no_endpoint");
    assert.equal(answerEvent?.attributes.nextAction, "configure_endpoint");
    assert.equal(answerEvent?.attributes.liveSendReady, false);
    assert.equal(answerEvent?.attributes.endpointConfigured, false);
    assert.equal(answerEvent?.attributes.approvalCaptured, false);
    assert.equal(answerEvent?.attributes.memoryWritePerformed, false);
    assert.equal(answerEvent?.attributes.agentDispatchPerformed, false);
    assert.equal(answerEvent?.attributes.externalSendPerformed, false);
    assert.equal(JSON.stringify(answerEvent).includes("Why can't I connect to Napoleon?"), false);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    dom.window.close();
  }
});

test("text concierge answers Napoleon descriptor validity questions locally without network calls", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;

  try {
    globalThis.fetch = (async () => {
      fetchCalled = true;
      throw new Error("descriptor validity local answer must not contact Napoleon");
    }) as typeof fetch;

    const view = render(<App />);
    fireEvent.change(view.getByLabelText("Napoleon endpoint"), { target: { value: "http://127.0.0.1:8787" } });
    fireEvent.change(view.getByLabelText("Descriptor"), { target: { value: "checksum_mismatch" } });

    const composer = view.getByPlaceholderText("Ask Napoleon through Concierge...") as HTMLTextAreaElement;
    fireEvent.change(composer, { target: { value: "Is the Napoleon descriptor valid?" } });
    await waitFor(() => assert.equal(composer.value, "Is the Napoleon descriptor valid?"));
    await user.click(view.getByRole("button", { name: "Rehearse" }));

    let answer: HTMLElement | undefined;
    await waitFor(() => {
      answer = Array.from(document.querySelectorAll("article.assistant")).find((article) =>
        article.textContent?.includes("Napoleon descriptor validity from local connection state:")
      ) as HTMLElement | undefined;
      assert.ok(answer);
    });
    assert.ok(answer);
    const answerText = answer.textContent ?? "";
    assert.ok(answerText.includes("Descriptor valid for live send: no."));
    assert.ok(answerText.includes("Descriptor state: descriptor_mismatch."));
    assert.ok(answerText.includes("Checksum state: mismatch."));
    assert.ok(answerText.includes("Signature state: invalid."));
    assert.ok(answerText.includes("Text-turn route advertised: no."));
    assert.ok(answerText.includes("Fail-closed reason: descriptor_signature_or_checksum_mismatch."));
    assert.ok(answerText.includes("Next local action: fix descriptor checksum/signature before live send."));
    assert.ok(answerText.includes("Authority boundary: local descriptor readiness only; not Napoleon approval."));
    assert.ok(
      answerText.includes(
        "This local answer did not contact Napoleon, approve, write memory, dispatch agents, capture approval, or send externally.",
      ),
    );
    assert.equal(fetchCalled, false);

    fireEvent.click(view.getByRole("button", { name: "Export telemetry buffer" }));
    const telemetryBuffer = JSON.parse(view.getByLabelText("Telemetry buffer export").textContent ?? "{}") as {
      events?: Array<{ event: string; attributes: Record<string, unknown> }>;
    };
    const answerEvent = telemetryBuffer.events
      ?.filter((event) => event.event === "napoleon_descriptor_validity_answered")
      .at(-1);
    assert.equal(answerEvent?.attributes.localAnswerOnly, true);
    assert.equal(answerEvent?.attributes.descriptorValidForLiveSend, false);
    assert.equal(answerEvent?.attributes.endpointConfigured, true);
    assert.equal(answerEvent?.attributes.descriptorState, "descriptor_mismatch");
    assert.equal(answerEvent?.attributes.checksumState, "mismatch");
    assert.equal(answerEvent?.attributes.signatureState, "invalid");
    assert.equal(answerEvent?.attributes.textTurnRouteAdvertised, false);
    assert.equal(answerEvent?.attributes.failClosedReason, "descriptor_signature_or_checksum_mismatch");
    assert.equal(answerEvent?.attributes.approvalCaptured, false);
    assert.equal(answerEvent?.attributes.memoryWritePerformed, false);
    assert.equal(answerEvent?.attributes.agentDispatchPerformed, false);
    assert.equal(answerEvent?.attributes.externalSendPerformed, false);
    assert.equal(JSON.stringify(answerEvent).includes("Is the Napoleon descriptor valid?"), false);
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    dom.window.close();
  }
});

test("connection state card shows when descriptor omits the text-turn route", async () => {
  const dom = installDom();
  const [{ cleanup, fireEvent, render, waitFor, within }, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("../src/App.js"),
  ]);
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async (input: string | URL | Request) => {
      assert.equal(String(input), "http://127.0.0.1:8787/v1/concierge/chief-of-staff/descriptor");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          descriptor: {
            schemaVersion: "napoleon/concierge/chief-of-staff-service/v1",
            serviceId: "napoleon.chief_of_staff",
            runtimeAuthority: false,
            commandExecution: false,
            cachePolicy: "fail_closed_to_review_required",
            blockedEffects: ["runtime_authority", "memory_write", "approval_capture", "external_send"],
            supportedHandoffs: ["evaluation_review"],
          },
          checksum: { expected: "sha256:connection", actual: "sha256:connection" },
          signature: { valid: true },
        }),
      };
    }) as typeof fetch;

    const view = render(<App />);
    fireEvent.change(view.getByLabelText("Napoleon endpoint"), { target: { value: "http://127.0.0.1:8787" } });
    fireEvent.click(view.getByRole("button", { name: "Discover descriptor" }));
    await waitFor(() => {
      const connection = within(view.getByLabelText("Napoleon connection state"));
      assert.ok(connection.getByText("Text-turn route"));
      assert.ok(connection.getByText("not advertised"));
    });
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    dom.window.close();
  }
});
