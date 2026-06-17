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
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });
  return dom;
}

test("renders wake word as a local option that does not start listening", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();

  try {
    const view = render(<App />);
    const settings = within(view.getByRole("main")).getByLabelText("Wake word") as HTMLInputElement;
    assert.equal(settings.checked, false);

    const panel = within(view.getByLabelText("Wake word readiness"));
    panel.getByText("Wake word disabled");
    panel.getByText("Listening started: no");
    panel.getByText("Microphone capture started: no");

    await user.click(settings);
    assert.equal(settings.checked, true);
    panel.getByText("Wake word option enabled; capture stopped.");
    panel.getByText("Listening started: no");
    panel.getByText("Microphone capture started: no");
    panel.getByText("Authority boundary: Wake word is a local option only; no always-on listening has started.");

    await user.click(view.getByRole("button", { name: "Run local wake word sample" }));
    panel.getByText("Sample detection: detected at 320 ms, confidence 0.91");
    panel.getByText("Local sample only: yes");
    panel.getByText("Listening started: no");
    panel.getByText("Microphone capture started: no");
    panel.getByText("Authority boundary: Local sample detection only; no always-on listening or live wake-word service is active.");
  } finally {
    cleanup();
    dom.window.close();
  }
});

test("renders child protected wake word boundaries with guardian approval capture blocked", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();

  try {
    const view = render(<App initialProfile="child_protected" />);
    const panel = within(view.getByLabelText("Wake word readiness"));

    panel.getByText(/Blocked effects: .*guardian_approval_capture/);

    await user.click(view.getByRole("button", { name: "Run local wake word sample" }));

    const telemetryBuffer = JSON.parse(localStorage.getItem("concierge_telemetry_buffer_v1") ?? "{}") as {
      events?: Array<{ event: string; attributes: Record<string, unknown> }>;
    };
    const sampleEvent = telemetryBuffer.events?.find((event) => event.event === "wake_word_sample_detected");

    assert.ok(sampleEvent);
    assert.equal(sampleEvent.attributes.childProtected, true);
    assert.equal(sampleEvent.attributes.guardianReviewReminder, true);
    assert.deepEqual(sampleEvent.attributes.blockedEffects, [
      "always_on_listening",
      "microphone_capture",
      "raw_audio_storage",
      "live_napoleon_contact",
      "memory_write",
      "approval_capture",
      "guardian_approval_capture",
      "external_send",
      "agent_dispatch",
    ]);
  } finally {
    cleanup();
    dom.window.close();
  }
});
