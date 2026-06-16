import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import {
  clearTelemetryBuffer,
  emitCapabilitySignal,
  emitEvent,
  exportTelemetryBufferJson,
  loadTelemetryBufferRetentionLimit,
  loadTelemetryBufferFromStorage,
  setTelemetryBufferRetentionLimit,
  TELEMETRY_BUFFER_RETENTION_OPTIONS,
  TELEMETRY_BUFFER_MAX_EVENTS,
  TELEMETRY_BUFFER_RETENTION_STORAGE_KEY,
  TELEMETRY_BUFFER_STORAGE_KEY,
} from "../src/telemetry.js";

test("telemetry emits capability signals for tracked text concierge events", () => {
  const signal = emitCapabilitySignal("response_generated", {
    traceId: "trace_response",
    conversationId: "conv_response",
    turnId: "turn_response",
    profile: "adult_owner",
  });

  assert.ok(signal);
  if (!signal) throw new Error("expected capability signal");
  assert.equal(signal.eventName, "conversation_capability_signal");
  assert.equal(signal.capabilityLabel, "text_response_generation");
  assert.equal(signal.capabilityStatus, "working");
  assert.equal(signal.outcomeSignal, "answered");
});

test("telemetry capability signals preserve child protected minimization", () => {
  const signal = emitCapabilitySignal("memory_proposal_review_created", {
    traceId: "trace_child_memory_signal",
    conversationId: "conv_child_memory_signal",
    turnId: "turn_child_memory_signal",
    profile: "child_protected",
    rawMessage: "do not store this child text",
  });

  assert.ok(signal);
  if (!signal) throw new Error("expected capability signal");
  assert.equal(signal.profileMode, "child_protected_user");
  assert.equal(signal.privacyClass, "child_sensitive");
  assert.equal(JSON.stringify(signal).includes("do not store this child text"), false);
});

test("untracked telemetry events do not create capability signals", () => {
  const signal = emitCapabilitySignal("settings_changed", {
    traceId: "trace_settings",
    conversationId: "conv_settings",
    turnId: "turn_settings",
  });

  assert.equal(signal, null);
});

test("telemetry off setting suppresses ordinary local telemetry events", () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://127.0.0.1:5173/",
  });
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousInfo = console.info;
  const payloads: unknown[] = [];
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.localStorage = dom.window.localStorage;
  localStorage.setItem("concierge_telemetry_enabled", "false");
  console.info = (...args: unknown[]) => {
    payloads.push(args);
  };

  try {
    emitEvent("response_generated", {
      traceId: "trace_suppressed",
      conversationId: "conv_suppressed",
      turnId: "turn_suppressed",
    });

    assert.equal(payloads.length, 0);
  } finally {
    console.info = previousInfo;
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      globalThis.window = previousWindow;
    }
    if (previousLocalStorage === undefined) {
      Reflect.deleteProperty(globalThis, "localStorage");
    } else {
      globalThis.localStorage = previousLocalStorage;
    }
    dom.window.close();
  }
});

test("telemetry off setting still allows microphone permission audit events", () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://127.0.0.1:5173/",
  });
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousInfo = console.info;
  const payloads: unknown[][] = [];
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.localStorage = dom.window.localStorage;
  localStorage.setItem("concierge_telemetry_enabled", "false");
  console.info = (...args: unknown[]) => {
    payloads.push(args);
  };

  try {
    emitEvent("mic_permission_result", {
      traceId: "trace_mic",
      conversationId: "conv_mic",
      result: "granted",
      captureStarted: false,
      rawAudioStored: false,
    });

    assert.equal(payloads.length, 1);
    assert.equal((payloads[0][1] as { event: string }).event, "mic_permission_result");
  } finally {
    console.info = previousInfo;
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      globalThis.window = previousWindow;
    }
    if (previousLocalStorage === undefined) {
      Reflect.deleteProperty(globalThis, "localStorage");
    } else {
      globalThis.localStorage = previousLocalStorage;
    }
    dom.window.close();
  }
});

test("telemetry off setting still allows camera permission audit events", () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://127.0.0.1:5173/",
  });
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousInfo = console.info;
  const payloads: unknown[][] = [];
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.localStorage = dom.window.localStorage;
  localStorage.setItem("concierge_telemetry_enabled", "false");
  console.info = (...args: unknown[]) => {
    payloads.push(args);
  };

  try {
    emitEvent("camera_permission_result", {
      traceId: "trace_camera",
      conversationId: "conv_camera",
      result: "granted",
      captureStarted: false,
      rawVideoStored: false,
    });

    assert.equal(payloads.length, 1);
    assert.equal((payloads[0][1] as { event: string }).event, "camera_permission_result");
  } finally {
    console.info = previousInfo;
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      globalThis.window = previousWindow;
    }
    if (previousLocalStorage === undefined) {
      Reflect.deleteProperty(globalThis, "localStorage");
    } else {
      globalThis.localStorage = previousLocalStorage;
    }
    dom.window.close();
  }
});

test("emitted telemetry is buffered locally with sensitive attributes redacted", () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://127.0.0.1:5173/",
  });
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousInfo = console.info;
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.localStorage = dom.window.localStorage;
  console.info = () => undefined;

  try {
    emitEvent("response_failed", {
      traceId: "trace_buffered",
      conversationId: "conv_buffered",
      turnId: "turn_buffered",
      prompt: "private prompt",
      responseText: "private response",
      endpoint: "https://napoleon.example.test/v1/concierge/turn",
      bearerToken: "secret-token",
      blockedEffects: ["memory_write"],
    });

    const buffer = loadTelemetryBufferFromStorage(localStorage);
    assert.equal(buffer.events.length, 1);
    assert.equal(buffer.events[0].event, "response_failed");
    assert.equal(buffer.events[0].attributes.traceId, "trace_buffered");
    assert.equal(buffer.events[0].attributes.prompt, "[redacted]");
    assert.equal(buffer.events[0].attributes.responseText, "[redacted]");
    assert.equal(buffer.events[0].attributes.endpoint, "[redacted]");
    assert.equal(buffer.events[0].attributes.bearerToken, "[redacted]");
    assert.deepEqual(buffer.events[0].attributes.blockedEffects, ["memory_write"]);
  } finally {
    console.info = previousInfo;
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      globalThis.window = previousWindow;
    }
    if (previousLocalStorage === undefined) {
      Reflect.deleteProperty(globalThis, "localStorage");
    } else {
      globalThis.localStorage = previousLocalStorage;
    }
    dom.window.close();
  }
});

test("local telemetry buffer is count bounded", () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://127.0.0.1:5173/",
  });
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousInfo = console.info;
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.localStorage = dom.window.localStorage;
  console.info = () => undefined;

  try {
    for (let index = 0; index < TELEMETRY_BUFFER_MAX_EVENTS + 5; index += 1) {
      emitEvent("settings_changed", {
        traceId: `trace_buffer_${index}`,
        conversationId: "conv_buffer",
        turnId: `turn_buffer_${index}`,
      });
    }

    const buffer = loadTelemetryBufferFromStorage(localStorage);
    assert.equal(buffer.events.length, TELEMETRY_BUFFER_MAX_EVENTS);
    assert.equal(buffer.events[0].attributes.traceId, "trace_buffer_5");
    assert.equal(buffer.events.at(-1)?.attributes.traceId, `trace_buffer_${TELEMETRY_BUFFER_MAX_EVENTS + 4}`);
  } finally {
    console.info = previousInfo;
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      globalThis.window = previousWindow;
    }
    if (previousLocalStorage === undefined) {
      Reflect.deleteProperty(globalThis, "localStorage");
    } else {
      globalThis.localStorage = previousLocalStorage;
    }
    dom.window.close();
  }
});

test("telemetry off suppresses ordinary buffering but preserves privacy audit buffer", () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://127.0.0.1:5173/",
  });
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousInfo = console.info;
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.localStorage = dom.window.localStorage;
  localStorage.setItem("concierge_telemetry_enabled", "false");
  console.info = () => undefined;

  try {
    emitEvent("settings_changed", {
      traceId: "trace_suppressed_buffer",
      conversationId: "conv_suppressed_buffer",
      turnId: "turn_suppressed_buffer",
    });
    emitEvent("privacy_setting_changed", {
      traceId: "trace_privacy_buffer",
      conversationId: "conv_privacy_buffer",
      setting: "microphone",
      enabled: false,
      localOnly: true,
      approvalCaptured: false,
      memoryWritePerformed: false,
      externalSendPerformed: false,
    });

    const buffer = loadTelemetryBufferFromStorage(localStorage);
    assert.equal(localStorage.getItem(TELEMETRY_BUFFER_STORAGE_KEY)?.includes("trace_suppressed_buffer"), false);
    assert.equal(buffer.events.length, 1);
    assert.equal(buffer.events[0].event, "privacy_setting_changed");
    assert.equal(buffer.events[0].attributes.traceId, "trace_privacy_buffer");
  } finally {
    console.info = previousInfo;
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      globalThis.window = previousWindow;
    }
    if (previousLocalStorage === undefined) {
      Reflect.deleteProperty(globalThis, "localStorage");
    } else {
      globalThis.localStorage = previousLocalStorage;
    }
    dom.window.close();
  }
});

test("telemetry buffer export is local redacted metadata only", () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://127.0.0.1:5173/",
  });
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousInfo = console.info;
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.localStorage = dom.window.localStorage;
  console.info = () => undefined;

  try {
    emitEvent("response_failed", {
      traceId: "trace_exported_buffer",
      conversationId: "conv_exported_buffer",
      turnId: "turn_exported_buffer",
      rawPrompt: "raw prompt must not export",
      responseBody: { responseText: "raw response must not export" },
      endpointUrl: "https://napoleon.example.test",
      authorization: "Bearer secret",
    });

    const exported = JSON.parse(exportTelemetryBufferJson(localStorage)) as {
      schemaVersion: string;
      caveat: string;
      eventCount: number;
      events: Array<{ event: string; attributes: Record<string, unknown> }>;
    };

    assert.equal(exported.schemaVersion, "concierge.telemetry-buffer.export.v1");
    assert.equal(exported.eventCount, 1);
    assert.equal(exported.events[0].event, "response_failed");
    assert.equal(exported.events[0].attributes.rawPrompt, "[redacted]");
    assert.equal(exported.events[0].attributes.responseBody, "[redacted]");
    assert.equal(exported.events[0].attributes.endpointUrl, "[redacted]");
    assert.equal(exported.events[0].attributes.authorization, "[redacted]");
    assert.equal(JSON.stringify(exported).includes("raw prompt must not export"), false);
    assert.equal(JSON.stringify(exported).includes("raw response must not export"), false);
    assert.match(exported.caveat, /not Napoleon approval/);
  } finally {
    console.info = previousInfo;
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      globalThis.window = previousWindow;
    }
    if (previousLocalStorage === undefined) {
      Reflect.deleteProperty(globalThis, "localStorage");
    } else {
      globalThis.localStorage = previousLocalStorage;
    }
    dom.window.close();
  }
});

test("telemetry buffer clear removes persisted local events", () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://127.0.0.1:5173/",
  });
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousInfo = console.info;
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.localStorage = dom.window.localStorage;
  console.info = () => undefined;

  try {
    emitEvent("settings_changed", {
      traceId: "trace_clear_buffer",
      conversationId: "conv_clear_buffer",
      turnId: "turn_clear_buffer",
    });

    assert.equal(loadTelemetryBufferFromStorage(localStorage).events.length, 1);
    clearTelemetryBuffer(localStorage);

    assert.equal(localStorage.getItem(TELEMETRY_BUFFER_STORAGE_KEY), null);
    assert.equal(loadTelemetryBufferFromStorage(localStorage).events.length, 0);
  } finally {
    console.info = previousInfo;
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      globalThis.window = previousWindow;
    }
    if (previousLocalStorage === undefined) {
      Reflect.deleteProperty(globalThis, "localStorage");
    } else {
      globalThis.localStorage = previousLocalStorage;
    }
    dom.window.close();
  }
});

test("telemetry buffer retention setting prunes persisted local events", () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://127.0.0.1:5173/",
  });
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousInfo = console.info;
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.localStorage = dom.window.localStorage;
  console.info = () => undefined;

  try {
    assert.deepEqual(TELEMETRY_BUFFER_RETENTION_OPTIONS, [25, 50, 100, 200]);
    assert.equal(loadTelemetryBufferRetentionLimit(localStorage), TELEMETRY_BUFFER_MAX_EVENTS);

    for (let index = 0; index < 30; index += 1) {
      emitEvent("settings_changed", {
        traceId: `trace_retention_${index}`,
        conversationId: "conv_retention",
        turnId: `turn_retention_${index}`,
      });
    }

    const pruned = setTelemetryBufferRetentionLimit(localStorage, 25);

    assert.equal(localStorage.getItem(TELEMETRY_BUFFER_RETENTION_STORAGE_KEY), "25");
    assert.equal(loadTelemetryBufferRetentionLimit(localStorage), 25);
    assert.equal(pruned.maxEvents, 25);
    assert.equal(pruned.events.length, 25);
    assert.equal(pruned.events[0].attributes.traceId, "trace_retention_5");
    assert.equal(loadTelemetryBufferFromStorage(localStorage).events.length, 25);
    assert.equal(JSON.parse(exportTelemetryBufferJson(localStorage)).maxEvents, 25);

    clearTelemetryBuffer(localStorage);

    assert.equal(loadTelemetryBufferFromStorage(localStorage).maxEvents, 25);
    assert.equal(JSON.parse(exportTelemetryBufferJson(localStorage)).maxEvents, 25);
  } finally {
    console.info = previousInfo;
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      globalThis.window = previousWindow;
    }
    if (previousLocalStorage === undefined) {
      Reflect.deleteProperty(globalThis, "localStorage");
    } else {
      globalThis.localStorage = previousLocalStorage;
    }
    dom.window.close();
  }
});
