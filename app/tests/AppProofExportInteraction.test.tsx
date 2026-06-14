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

test("blocks taxonomy review handoff visibly when no Napoleon endpoint is configured", async () => {
  const dom = installDom();
  const [{ cleanup, render, within }, userEventModule, { App }] = await Promise.all([
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
    assert.ok(within(readiness).getByText(/blocked until the review draft, endpoint, and descriptor preflight are ready/));
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
    assert.ok(view.getByText("not applied; no memory write; no approval captured; no external send."));
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
