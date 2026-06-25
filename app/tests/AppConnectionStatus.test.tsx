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
