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

test("renders central media session state without starting capture or playback", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();

  try {
    const view = render(<App />);
    const panel = within(view.getByLabelText("Media session controller"));
    panel.getByText("Microphone session: blocked");
    panel.getByText("Camera session: blocked");
    panel.getByText("Playback session: stopped");
    panel.getByText("Microphone capture started: no");
    panel.getByText("Camera capture started: no");
    panel.getByText("Audio playback started: no");

    await user.click(view.getByLabelText("Microphone"));
    await user.click(view.getByLabelText("Camera"));

    panel.getByText("Microphone session: permission_needed");
    panel.getByText("Camera session: permission_needed");
    panel.getByText("Audio playback started: no");
    panel.getByText("Authority boundary: Media session summary is local preflight only; it is not Napoleon approval, guardian approval, live voice, live avatar capture, memory, agent dispatch, or external send permission.");
  } finally {
    await new Promise((resolve) => setTimeout(resolve, 20));
    cleanup();
    dom.window.close();
  }
});

test("keeps child protected media session blocked with guardian review visible", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, userEventModule, { App }] = await Promise.all([
    import("@testing-library/react"),
    import("@testing-library/user-event"),
    import("../src/App.js"),
  ]);
  const user = userEventModule.default.setup();

  try {
    const view = render(<App initialProfile="child_protected" />);
    await user.click(view.getByLabelText("Microphone"));
    await user.click(view.getByLabelText("Camera"));

    const panel = within(view.getByLabelText("Media session controller"));
    panel.getByText("Microphone session: blocked");
    panel.getByText("Camera session: blocked");
    panel.getByText("Guardian approval captured: no");
    panel.getByText("Guardian review is required before child microphone, camera, playback, avatar, or voice features can become active.");
  } finally {
    await new Promise((resolve) => setTimeout(resolve, 20));
    cleanup();
    dom.window.close();
  }
});
