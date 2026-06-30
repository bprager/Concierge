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

export interface DesktopRuntimeFetchOptions {
  nativeAuth?: boolean;
  nativeEndpoint?: boolean;
}

interface DesktopRuntimeHttpResponse {
  ok?: unknown;
  status?: unknown;
  bodyJson?: unknown;
  bodyText?: unknown;
}

export function hasPackagedDesktopRuntime(scope: object = globalThis): boolean {
  return "__TAURI_INTERNALS__" in scope;
}

function headersForDesktopRuntime(
  headers: Record<string, string> | undefined,
  options: DesktopRuntimeFetchOptions,
): Record<string, string> {
  if (options.nativeAuth === false) return headers ?? {};
  const sanitized: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers ?? {})) {
    if (name.toLocaleLowerCase() === "authorization" || name.toLocaleLowerCase() === "x-napoleon-auth") {
      continue;
    }
    sanitized[name] = value;
  }
  return sanitized;
}

function requestTargetForDesktopRuntime(url: string, options: DesktopRuntimeFetchOptions): { url?: string; path?: string } {
  if (options.nativeEndpoint === false) return { url };
  const parsed = new URL(url);
  return { path: `${parsed.pathname}${parsed.search}` };
}

export function createDesktopRuntimeFetch(
  invoke: DesktopRuntimeInvoke,
  options: DesktopRuntimeFetchOptions = {},
): RuntimeFetch {
  return async (url, init = {}) => {
    const payload = await invoke("napoleon_runtime_http_request", {
      request: {
        ...requestTargetForDesktopRuntime(url, options),
        method: init.method ?? "GET",
        nativeAuth: options.nativeAuth !== false,
        headers: headersForDesktopRuntime(init.headers, options),
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
