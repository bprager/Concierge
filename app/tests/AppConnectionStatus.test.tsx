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
