import assert from "node:assert/strict";
import test from "node:test";
import { createDesktopRuntimeFetch, hasPackagedDesktopRuntime } from "../src/desktopRuntimeTransport.js";

test("desktop runtime fetch sends Napoleon HTTP through Tauri invoke without webview auth by default", async () => {
  const invoked: Array<{ command: string; args: Record<string, unknown> | undefined }> = [];
  const fetcher = createDesktopRuntimeFetch(async (command, args) => {
    invoked.push({ command, args });
    return {
      ok: true,
      status: 202,
      bodyJson: {
        accepted: true,
      },
    };
  });

  const response = await fetcher("https://napoleon.example/cos/text-turn", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Napoleon-Auth": "secret_token",
    },
    body: JSON.stringify({ requestKind: "text_turn" }),
  });

  assert.equal(response.ok, true);
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { accepted: true });
  assert.equal(invoked.length, 1);
  assert.equal(invoked[0]?.command, "napoleon_runtime_http_request");
  assert.deepEqual(invoked[0]?.args, {
    request: {
      url: "https://napoleon.example/cos/text-turn",
      method: "POST",
      nativeAuth: true,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requestKind: "text_turn" }),
    },
  });
});

test("desktop runtime fetch can preserve explicit webview auth when native auth is disabled", async () => {
  const invoked: Array<{ command: string; args: Record<string, unknown> | undefined }> = [];
  const fetcher = createDesktopRuntimeFetch(
    async (command, args) => {
      invoked.push({ command, args });
      return {
        ok: true,
        status: 200,
        bodyJson: {
          accepted: true,
        },
      };
    },
    { nativeAuth: false },
  );

  await fetcher("https://napoleon.example/cos/descriptor", {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Napoleon-Auth": "secret_token",
    },
  });

  assert.equal(invoked.length, 1);
  assert.deepEqual(invoked[0]?.args, {
    request: {
      url: "https://napoleon.example/cos/descriptor",
      method: "GET",
      nativeAuth: false,
      headers: {
        Accept: "application/json",
        "X-Napoleon-Auth": "secret_token",
      },
      body: undefined,
    },
  });
});

test("desktop runtime availability only reports true inside packaged Tauri", () => {
  assert.equal(hasPackagedDesktopRuntime({}), false);
  assert.equal(hasPackagedDesktopRuntime({ __TAURI_INTERNALS__: {} }), true);
});
