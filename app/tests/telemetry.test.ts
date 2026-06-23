import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import {
  clearTelemetryBuffer,
  emitCapabilitySignal,
  emitEvent,
  exportInteractionTraceJson,
  exportTelemetryBufferJson,
  findLatestInteractionTraceId,
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

test("telemetry emits voice capability signal for local STT completion", () => {
  const signal = emitCapabilitySignal("stt_completed", {
    traceId: "trace_stt_signal",
    conversationId: "conv_stt_signal",
    profile: "adult_owner",
    model: "local-sample-stt",
    localSampleOnly: true,
    captureStarted: false,
    rawAudioStored: false,
    rawAudio: "must not be retained",
  });

  assert.ok(signal);
  if (!signal) throw new Error("expected capability signal");
  assert.equal(signal.channel, "voice");
  assert.equal(signal.topicLabel, "voice");
  assert.equal(signal.intentLabel, "transcribe_local_sample");
  assert.equal(signal.capabilityLabel, "speech_transcription_sample");
  assert.equal(signal.capabilityStatus, "working");
  assert.equal(signal.outcomeSignal, "rehearsed");
  assert.equal(signal.architectureArea, "voice");
  assert.equal(signal.privacyClass, "metadata_only");
  assert.equal(JSON.stringify(signal).includes("must not be retained"), false);
});

test("telemetry emits voice capability signal for local TTS completion", () => {
  const signal = emitCapabilitySignal("tts_completed", {
    traceId: "trace_tts_signal",
    conversationId: "conv_tts_signal",
    profile: "adult_owner",
    voiceId: "local-neutral",
    localSampleOnly: true,
    audioPlaybackStarted: false,
    rawAudioStored: false,
    rawAudio: "must not be retained",
  });

  assert.ok(signal);
  if (!signal) throw new Error("expected capability signal");
  assert.equal(signal.channel, "voice");
  assert.equal(signal.topicLabel, "voice");
  assert.equal(signal.intentLabel, "prepare_local_speech");
  assert.equal(signal.capabilityLabel, "speech_synthesis_sample");
  assert.equal(signal.capabilityStatus, "working");
  assert.equal(signal.outcomeSignal, "rehearsed");
  assert.equal(signal.architectureArea, "voice");
  assert.equal(signal.privacyClass, "metadata_only");
  assert.equal(JSON.stringify(signal).includes("must not be retained"), false);
});

test("telemetry emits voice capability signal for local voice turn rehearsal", () => {
  const signal = emitCapabilitySignal("voice_turn_rehearsed", {
    traceId: "trace_voice_turn_signal",
    conversationId: "conv_voice_turn_signal",
    profile: "adult_owner",
    localRehearsalOnly: true,
    liveNapoleonContacted: false,
    microphoneCaptureStarted: false,
    audioPlaybackStarted: false,
    rawAudioStored: false,
    rawAudio: "must not be retained",
  });

  assert.ok(signal);
  if (!signal) throw new Error("expected capability signal");
  assert.equal(signal.channel, "voice");
  assert.equal(signal.topicLabel, "voice");
  assert.equal(signal.intentLabel, "rehearse_local_voice_turn");
  assert.equal(signal.capabilityLabel, "voice_turn_rehearsal");
  assert.equal(signal.capabilityStatus, "working");
  assert.equal(signal.outcomeSignal, "rehearsed");
  assert.equal(signal.architectureArea, "voice");
  assert.equal(signal.privacyClass, "metadata_only");
  assert.equal(JSON.stringify(signal).includes("must not be retained"), false);
});

test("telemetry emits child-protected voice capability signals with separate labels", () => {
  const speechSignal = emitCapabilitySignal("stt_completed", {
    traceId: "trace_child_stt_signal",
    conversationId: "conv_child_voice_signal",
    profile: "child_protected",
    localSampleOnly: true,
    captureStarted: false,
    rawAudioStored: false,
    rawAudio: "must not be retained",
  });
  const synthesisSignal = emitCapabilitySignal("tts_completed", {
    traceId: "trace_child_tts_signal",
    conversationId: "conv_child_voice_signal",
    profile: "child_protected",
    localSampleOnly: true,
    audioPlaybackStarted: false,
    rawAudioStored: false,
    rawAudio: "must not be retained",
  });
  const voiceTurnSignal = emitCapabilitySignal("voice_turn_rehearsed", {
    traceId: "trace_child_voice_turn_signal",
    conversationId: "conv_child_voice_signal",
    profile: "child_protected",
    localRehearsalOnly: true,
    liveNapoleonContacted: false,
    microphoneCaptureStarted: false,
    audioPlaybackStarted: false,
    rawAudioStored: false,
    rawAudio: "must not be retained",
  });

  assert.ok(speechSignal);
  assert.ok(synthesisSignal);
  assert.ok(voiceTurnSignal);
  if (!speechSignal || !synthesisSignal || !voiceTurnSignal) throw new Error("expected child voice capability signals");
  assert.equal(speechSignal.profileMode, "child_protected_user");
  assert.equal(synthesisSignal.profileMode, "child_protected_user");
  assert.equal(voiceTurnSignal.profileMode, "child_protected_user");
  assert.equal(speechSignal.privacyClass, "child_sensitive");
  assert.equal(synthesisSignal.privacyClass, "child_sensitive");
  assert.equal(voiceTurnSignal.privacyClass, "child_sensitive");
  assert.equal(speechSignal.capabilityLabel, "child_safe_speech_transcription_sample");
  assert.equal(synthesisSignal.capabilityLabel, "child_safe_speech_synthesis_sample");
  assert.equal(voiceTurnSignal.capabilityLabel, "child_safe_voice_turn_rehearsal");
  assert.equal(JSON.stringify([speechSignal, synthesisSignal, voiceTurnSignal]).includes("must not be retained"), false);
});

test("telemetry emits avatar capability signals for local avatar preparation", () => {
  const stateSignal = emitCapabilitySignal("avatar_state_changed", {
    traceId: "trace_avatar_state_signal",
    conversationId: "conv_avatar_signal",
    profile: "adult_owner",
    localDisplayOnly: true,
    cameraCaptureStarted: false,
    faceDetectionStarted: false,
    rawVideo: "must not be retained",
  });
  const expressionSignal = emitCapabilitySignal("avatar_expression_set", {
    traceId: "trace_avatar_expression_signal",
    conversationId: "conv_avatar_signal",
    profile: "adult_owner",
    localMetadataOnly: true,
    avatarAnimationStarted: false,
    rawVideo: "must not be retained",
  });
  const modelSignal = emitCapabilitySignal("avatar_model_loaded", {
    traceId: "trace_avatar_model_signal",
    conversationId: "conv_avatar_signal",
    profile: "adult_owner",
    localReferenceOnly: true,
    rendererStarted: false,
    rawVideo: "must not be retained",
  });
  const rendererSignal = emitCapabilitySignal("avatar_renderer_readiness_prepared", {
    traceId: "trace_avatar_renderer_signal",
    conversationId: "conv_avatar_signal",
    profile: "adult_owner",
    localReadinessOnly: true,
    rendererStarted: false,
    renderLoopStarted: false,
    rawVideo: "must not be retained",
  });

  assert.ok(stateSignal);
  assert.ok(expressionSignal);
  assert.ok(modelSignal);
  assert.ok(rendererSignal);
  if (!stateSignal || !expressionSignal || !modelSignal || !rendererSignal) {
    throw new Error("expected avatar capability signals");
  }
  assert.equal(stateSignal.channel, "avatar");
  assert.equal(stateSignal.topicLabel, "avatar");
  assert.equal(stateSignal.intentLabel, "prepare_local_avatar_state");
  assert.equal(stateSignal.capabilityLabel, "avatar_state_preview");
  assert.equal(expressionSignal.capabilityLabel, "avatar_expression_mapping");
  assert.equal(modelSignal.capabilityLabel, "avatar_model_reference");
  assert.equal(rendererSignal.capabilityLabel, "avatar_renderer_readiness");
  assert.equal(rendererSignal.architectureArea, "avatar");
  assert.equal(rendererSignal.privacyClass, "metadata_only");
  assert.equal(JSON.stringify([stateSignal, expressionSignal, modelSignal, rendererSignal]).includes("must not be retained"), false);
});

test("telemetry emits child-protected avatar capability signals with separate labels", () => {
  const stateSignal = emitCapabilitySignal("avatar_state_changed", {
    traceId: "trace_child_avatar_state_signal",
    conversationId: "conv_child_avatar_signal",
    profile: "child_protected",
    localDisplayOnly: true,
    cameraCaptureStarted: false,
    faceDetectionStarted: false,
    rawVideo: "must not be retained",
  });
  const expressionSignal = emitCapabilitySignal("avatar_expression_set", {
    traceId: "trace_child_avatar_expression_signal",
    conversationId: "conv_child_avatar_signal",
    profile: "child_protected",
    localMetadataOnly: true,
    avatarAnimationStarted: false,
    rawVideo: "must not be retained",
  });
  const modelSignal = emitCapabilitySignal("avatar_model_loaded", {
    traceId: "trace_child_avatar_model_signal",
    conversationId: "conv_child_avatar_signal",
    profile: "child_protected",
    localReferenceOnly: true,
    rendererStarted: false,
    rawVideo: "must not be retained",
  });
  const rendererSignal = emitCapabilitySignal("avatar_renderer_readiness_prepared", {
    traceId: "trace_child_avatar_renderer_signal",
    conversationId: "conv_child_avatar_signal",
    profile: "child_protected",
    localReadinessOnly: true,
    rendererStarted: false,
    renderLoopStarted: false,
    rawVideo: "must not be retained",
  });

  assert.ok(stateSignal);
  assert.ok(expressionSignal);
  assert.ok(modelSignal);
  assert.ok(rendererSignal);
  if (!stateSignal || !expressionSignal || !modelSignal || !rendererSignal) {
    throw new Error("expected child avatar capability signals");
  }
  assert.equal(stateSignal.profileMode, "child_protected_user");
  assert.equal(expressionSignal.profileMode, "child_protected_user");
  assert.equal(modelSignal.profileMode, "child_protected_user");
  assert.equal(rendererSignal.profileMode, "child_protected_user");
  assert.equal(stateSignal.privacyClass, "child_sensitive");
  assert.equal(expressionSignal.privacyClass, "child_sensitive");
  assert.equal(modelSignal.privacyClass, "child_sensitive");
  assert.equal(rendererSignal.privacyClass, "child_sensitive");
  assert.equal(stateSignal.capabilityLabel, "child_safe_avatar_state_preview");
  assert.equal(expressionSignal.capabilityLabel, "child_safe_avatar_expression_mapping");
  assert.equal(modelSignal.capabilityLabel, "child_safe_avatar_model_reference");
  assert.equal(rendererSignal.capabilityLabel, "child_safe_avatar_renderer_readiness");
  assert.equal(JSON.stringify([stateSignal, expressionSignal, modelSignal, rendererSignal]).includes("must not be retained"), false);
});

test("telemetry emits avatar capability signals for local avatar perception dry runs", () => {
  const gazeSignal = emitCapabilitySignal("gaze_target_updated", {
    traceId: "trace_avatar_gaze_signal",
    conversationId: "conv_avatar_perception_signal",
    profile: "adult_owner",
    localMetadataOnly: true,
    cameraCaptureStarted: false,
    faceDetectionStarted: false,
    gazeTrackingStarted: false,
    rawVideo: "must not be retained",
  });
  const facePoseSignal = emitCapabilitySignal("camera_state_estimated", {
    traceId: "trace_avatar_face_pose_signal",
    conversationId: "conv_avatar_perception_signal",
    profile: "adult_owner",
    localMetadataOnly: true,
    cameraCaptureStarted: false,
    faceDetectionStarted: false,
    rawVideoStored: false,
    rawVideo: "must not be retained",
  });
  const affectSignal = emitCapabilitySignal("affect_signal_fused", {
    traceId: "trace_avatar_affect_signal",
    conversationId: "conv_avatar_perception_signal",
    profile: "adult_owner",
    localMetadataOnly: true,
    emotionClaimedAsFact: false,
    cameraCaptureStarted: false,
    microphoneCaptureStarted: false,
    rawVideoStored: false,
    rawAudioStored: false,
    rawVideo: "must not be retained",
    rawAudio: "must not be retained",
  });

  assert.ok(gazeSignal);
  assert.ok(facePoseSignal);
  assert.ok(affectSignal);
  if (!gazeSignal || !facePoseSignal || !affectSignal) {
    throw new Error("expected avatar perception capability signals");
  }
  assert.equal(gazeSignal.channel, "avatar");
  assert.equal(gazeSignal.topicLabel, "avatar");
  assert.equal(gazeSignal.capabilityLabel, "avatar_gaze_simulation");
  assert.equal(facePoseSignal.capabilityLabel, "avatar_face_pose_sample");
  assert.equal(affectSignal.capabilityLabel, "avatar_affect_uncertainty_sample");
  assert.equal(affectSignal.intentLabel, "sample_local_avatar_affect_uncertainty");
  assert.equal(affectSignal.architectureArea, "avatar");
  assert.equal(affectSignal.privacyClass, "metadata_only");
  assert.equal(JSON.stringify([gazeSignal, facePoseSignal, affectSignal]).includes("must not be retained"), false);
});

test("telemetry emits child-protected avatar perception signals with separate labels", () => {
  const gazeSignal = emitCapabilitySignal("gaze_target_updated", {
    traceId: "trace_child_avatar_gaze_signal",
    conversationId: "conv_child_avatar_perception_signal",
    profile: "child_protected",
    localMetadataOnly: true,
    cameraCaptureStarted: false,
    faceDetectionStarted: false,
    gazeTrackingStarted: false,
    rawVideo: "must not be retained",
  });
  const facePoseSignal = emitCapabilitySignal("camera_state_estimated", {
    traceId: "trace_child_avatar_face_pose_signal",
    conversationId: "conv_child_avatar_perception_signal",
    profile: "child_protected",
    localMetadataOnly: true,
    cameraCaptureStarted: false,
    faceDetectionStarted: false,
    rawVideoStored: false,
    rawVideo: "must not be retained",
  });
  const affectSignal = emitCapabilitySignal("affect_signal_fused", {
    traceId: "trace_child_avatar_affect_signal",
    conversationId: "conv_child_avatar_perception_signal",
    profile: "child_protected",
    localMetadataOnly: true,
    emotionClaimedAsFact: false,
    cameraCaptureStarted: false,
    microphoneCaptureStarted: false,
    rawVideoStored: false,
    rawAudioStored: false,
    rawVideo: "must not be retained",
    rawAudio: "must not be retained",
  });

  assert.ok(gazeSignal);
  assert.ok(facePoseSignal);
  assert.ok(affectSignal);
  if (!gazeSignal || !facePoseSignal || !affectSignal) {
    throw new Error("expected child avatar perception capability signals");
  }
  assert.equal(gazeSignal.profileMode, "child_protected_user");
  assert.equal(facePoseSignal.profileMode, "child_protected_user");
  assert.equal(affectSignal.profileMode, "child_protected_user");
  assert.equal(gazeSignal.privacyClass, "child_sensitive");
  assert.equal(facePoseSignal.privacyClass, "child_sensitive");
  assert.equal(affectSignal.privacyClass, "child_sensitive");
  assert.equal(gazeSignal.capabilityLabel, "child_safe_avatar_gaze_simulation");
  assert.equal(facePoseSignal.capabilityLabel, "child_safe_avatar_face_pose_sample");
  assert.equal(affectSignal.capabilityLabel, "child_safe_avatar_affect_uncertainty_sample");
  assert.equal(JSON.stringify([gazeSignal, facePoseSignal, affectSignal]).includes("must not be retained"), false);
});

test("telemetry emits avatar capability signal for local lip-sync rehearsal", () => {
  const signal = emitCapabilitySignal("lip_sync_completed", {
    traceId: "trace_avatar_lip_sync_signal",
    conversationId: "conv_avatar_lip_sync_signal",
    profile: "adult_owner",
    localMetadataOnly: true,
    cueCount: 4,
    audioPlaybackStarted: false,
    microphoneCaptureStarted: false,
    rawAudioStored: false,
    avatarAnimationStarted: false,
    liveNapoleonContacted: false,
    rawAudio: "must not be retained",
  });

  assert.ok(signal);
  if (!signal) throw new Error("expected avatar lip-sync capability signal");
  assert.equal(signal.channel, "avatar");
  assert.equal(signal.topicLabel, "avatar");
  assert.equal(signal.intentLabel, "rehearse_local_avatar_lip_sync");
  assert.equal(signal.capabilityLabel, "avatar_lip_sync_rehearsal");
  assert.equal(signal.capabilityStatus, "working");
  assert.equal(signal.outcomeSignal, "rehearsed");
  assert.equal(signal.architectureArea, "avatar");
  assert.equal(signal.privacyClass, "metadata_only");
  assert.equal(JSON.stringify(signal).includes("must not be retained"), false);
});

test("telemetry emits child-protected avatar lip-sync signal with separate label", () => {
  const signal = emitCapabilitySignal("lip_sync_completed", {
    traceId: "trace_child_avatar_lip_sync_signal",
    conversationId: "conv_child_avatar_lip_sync_signal",
    profile: "child_protected",
    localMetadataOnly: true,
    cueCount: 4,
    audioPlaybackStarted: false,
    microphoneCaptureStarted: false,
    rawAudioStored: false,
    avatarAnimationStarted: false,
    liveNapoleonContacted: false,
    rawAudio: "must not be retained",
  });

  assert.ok(signal);
  if (!signal) throw new Error("expected child avatar lip-sync capability signal");
  assert.equal(signal.profileMode, "child_protected_user");
  assert.equal(signal.channel, "avatar");
  assert.equal(signal.privacyClass, "child_sensitive");
  assert.equal(signal.capabilityLabel, "child_safe_avatar_lip_sync_rehearsal");
  assert.equal(JSON.stringify(signal).includes("must not be retained"), false);
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

test("interaction trace export reconstructs one sanitized trace from buffered events", () => {
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
    emitEvent("user_message_received", {
      traceId: "trace_export_trace",
      conversationId: "conv_export_trace",
      turnId: "turn_export_trace",
      channel: "text",
      profile: "adult_owner",
      rawPrompt: "do not export this prompt",
      endpoint: "https://napoleon.example.test/v1/concierge/turn",
    });
    emitEvent("bridge_request_completed", {
      traceId: "trace_export_trace",
      conversationId: "conv_export_trace",
      turnId: "turn_export_trace",
      requestId: "cos_turn_export_trace",
      outcome: "requires_review",
      decisionId: "decision_export_trace",
      auditId: "audit_export_trace",
      bearerToken: "secret-token",
    });
    emitEvent("stance_selected", {
      traceId: "trace_export_trace",
      conversationId: "conv_export_trace",
      turnId: "turn_export_trace",
      stance: "owner_prepare_only",
      reason: "successful turns must not convert generic reasons into bridge failures",
    });
    emitEvent("response_generated", {
      traceId: "trace_export_trace",
      conversationId: "conv_export_trace",
      turnId: "turn_export_trace",
      profile: "adult_owner",
      profileMode: "adult_owner",
      responseType: "text",
      governanceOutcome: "requires_review",
      decisionId: "decision_export_trace",
      auditId: "audit_export_trace",
      responseText: "do not export this response",
    });
    emitEvent("response_generated", {
      traceId: "trace_other",
      conversationId: "conv_other",
      turnId: "turn_other",
      profile: "guest",
    });

    const trace = JSON.parse(exportInteractionTraceJson(localStorage, "trace_export_trace")) as {
      schemaVersion: string;
      trace_id: string;
      conversation_id: string;
      turn_id: string;
      user_profile: string;
      channel: string;
      governance_decision: string;
      napoleon_references: {
        request_id: string;
        decision_id: string;
        audit_id: string;
        governance_outcome: string;
        blocked_effects: string[];
      };
      caveat: string;
      events: Array<{ event: string; attributes: Record<string, unknown> }>;
    };

    assert.equal(trace.schemaVersion, "concierge.interaction-trace.export.v1");
    assert.equal(trace.trace_id, "trace_export_trace");
    assert.equal(trace.conversation_id, "conv_export_trace");
    assert.equal(trace.turn_id, "turn_export_trace");
    assert.equal(trace.user_profile, "adult_owner");
    assert.equal(trace.channel, "text");
    assert.equal(trace.governance_decision, "requires_review");
    assert.deepEqual(trace.napoleon_references, {
      request_id: "cos_turn_export_trace",
      decision_id: "decision_export_trace",
      audit_id: "audit_export_trace",
      governance_outcome: "requires_review",
      blocked_effects: ["not_returned"],
    });
    assert.equal("bridge_failure_reason" in trace.napoleon_references, false);
    assert.deepEqual(trace.events.map((event) => event.event), [
      "user_message_received",
      "bridge_request_completed",
      "stance_selected",
      "response_generated",
    ]);
    assert.equal(trace.events[0].attributes.rawPrompt, "[redacted]");
    assert.equal(trace.events[0].attributes.endpoint, "[redacted]");
    assert.equal(trace.events[1].attributes.bearerToken, "[redacted]");
    assert.equal(trace.events[3].attributes.responseText, "[redacted]");
    assert.equal(JSON.stringify(trace).includes("do not export this prompt"), false);
    assert.equal(JSON.stringify(trace).includes("do not export this response"), false);
    assert.equal(JSON.stringify(trace).includes("napoleon.example.test"), false);
    assert.equal(JSON.stringify(trace).includes("secret-token"), false);
    assert.match(trace.caveat, /not Napoleon approval/);
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

test("interaction trace export redacts malformed blocked-effect references consistently", () => {
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
    emitEvent("user_message_received", {
      traceId: "trace_malformed_blocked_effects",
      conversationId: "conv_malformed_blocked_effects",
      turnId: "turn_malformed_blocked_effects",
      channel: "text",
      profile: "adult_owner",
    });
    emitEvent("response_failed", {
      traceId: "trace_malformed_blocked_effects",
      conversationId: "conv_malformed_blocked_effects",
      turnId: "turn_malformed_blocked_effects",
      profile: "adult_owner",
      governanceOutcome: "no_go",
      blockedEffects: ["memory_write", { value: "agent_dispatch" }, 7],
    });

    const trace = JSON.parse(exportInteractionTraceJson(localStorage, "trace_malformed_blocked_effects")) as {
      napoleon_references: {
        blocked_effects: string[];
      };
    };

    assert.deepEqual(trace.napoleon_references.blocked_effects, ["memory_write", "[redacted]", "[redacted]"]);
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

test("latest interaction trace ignores local proof export event traces", () => {
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
    emitEvent("user_message_received", {
      traceId: "trace_real_turn",
      conversationId: "conv_real_turn",
      turnId: "turn_real_turn",
      channel: "text",
      profile: "adult_owner",
    });
    emitEvent("response_generated", {
      traceId: "trace_real_turn",
      conversationId: "conv_real_turn",
      turnId: "turn_real_turn",
      profile: "adult_owner",
      governanceOutcome: "requires_review",
    });
    emitEvent("napoleon_response_proof_exported", {
      traceId: "trace_local_proof_export",
      conversationId: "conv_real_turn",
      responseTraceId: "trace_real_turn",
      responseAuditId: "audit_real_turn",
    });

    assert.equal(findLatestInteractionTraceId(localStorage), "trace_real_turn");
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
