type RuntimeFetchResponse = {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
};

export type RuntimeFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<RuntimeFetchResponse>;

export type DesktopRuntimeInvoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

interface DesktopRuntimeHttpResponse {
  ok?: unknown;
  status?: unknown;
  bodyJson?: unknown;
  bodyText?: unknown;
}

export function hasPackagedDesktopRuntime(scope: object = globalThis): boolean {
  return "__TAURI_INTERNALS__" in scope;
}

export function createDesktopRuntimeFetch(invoke: DesktopRuntimeInvoke): RuntimeFetch {
  return async (url, init = {}) => {
    const payload = await invoke("napoleon_runtime_http_request", {
      request: {
        url,
        method: init.method ?? "GET",
        headers: init.headers ?? {},
        body: init.body,
      },
    });
    const response = (payload && typeof payload === "object" ? payload : {}) as DesktopRuntimeHttpResponse;
    const status = typeof response.status === "number" ? response.status : undefined;
    const ok = typeof response.ok === "boolean" ? response.ok : Boolean(status && status >= 200 && status < 300);
    return {
      ok,
      status,
      json: async () => {
        if ("bodyJson" in response) return response.bodyJson;
        if (typeof response.bodyText !== "string" || response.bodyText.trim() === "") return null;
        return JSON.parse(response.bodyText);
      },
    };
  };
}

export function createPackagedDesktopRuntimeFetch(scope: object = globalThis): RuntimeFetch | null {
  if (!hasPackagedDesktopRuntime(scope)) return null;
  return createDesktopRuntimeFetch(async (command, args) => {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke(command, args);
  });
}
