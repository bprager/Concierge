import assert from "node:assert/strict";
import test from "node:test";
import {
  LOCAL_BRIDGE_HARNESS_ENDPOINT,
  buildLocalHarnessEndpointPreset,
  isLocalHarnessEndpoint,
} from "../src/localHarnessEndpoint.js";

test("defines the local governed bridge harness endpoint preset", () => {
  const preset = buildLocalHarnessEndpointPreset();

  assert.equal(preset.endpoint, LOCAL_BRIDGE_HARNESS_ENDPOINT);
  assert.equal(preset.descriptorMode, "live");
  assert.equal(preset.rehearsalMode, false);
  assert.equal(preset.startsService, false);
  assert.ok(preset.boundary.includes("does not start"));
  assert.ok(preset.boundary.includes("does not grant authority"));
});

test("recognizes the local harness endpoint with or without trailing slash", () => {
  assert.equal(isLocalHarnessEndpoint("http://127.0.0.1:8787"), true);
  assert.equal(isLocalHarnessEndpoint("http://127.0.0.1:8787/"), true);
  assert.equal(isLocalHarnessEndpoint("http://localhost:8787"), false);
});
