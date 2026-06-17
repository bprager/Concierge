import { resolveNapoleonBridgeOperation } from "./bridgeEndpoint.js";
import {
  buildDescriptorConnectionState,
  type ChiefOfStaffDescriptor,
  type DescriptorFailClosedReason,
  type DescriptorConnectionInput,
  type DescriptorConnectionState,
} from "./contractBridge.js";

type DescriptorFetch = (url: string, init?: { method?: string; headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}>;

export interface DescriptorDiscoveryDependencies {
  getEndpoint?: () => string | null;
  getAuthToken?: () => string | null;
  now?: () => string;
  fetch?: DescriptorFetch;
}

export interface DescriptorDiscoveryResult {
  input: DescriptorConnectionInput;
  connection: DescriptorConnectionState;
  source: "none" | "live";
}

function getConfiguredEndpoint(dependencies: DescriptorDiscoveryDependencies): string | null {
  if (dependencies.getEndpoint) return dependencies.getEndpoint();
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("napoleon_endpoint");
}

function getConfiguredAuthToken(dependencies: DescriptorDiscoveryDependencies): string | null {
  if (dependencies.getAuthToken) return dependencies.getAuthToken();
  if (dependencies.getEndpoint) return null;
  if (typeof localStorage === "undefined") return null;
  const token = localStorage.getItem("napoleon_auth_token");
  return token?.trim() ? token.trim() : null;
}

function buildDescriptorHeaders(authToken: string | null): Record<string, string> {
  return authToken ? { Accept: "application/json", Authorization: `Bearer ${authToken}` } : { Accept: "application/json" };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function stringArrayValue(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;
}

function parseDescriptor(value: unknown): ChiefOfStaffDescriptor | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ChiefOfStaffDescriptor>;
  const schemaVersion = stringValue(candidate.schemaVersion);
  const blockedEffects = stringArrayValue(candidate.blockedEffects);
  if (
    schemaVersion &&
    candidate.serviceId === "napoleon.chief_of_staff" &&
    typeof candidate.runtimeAuthority === "boolean" &&
    typeof candidate.commandExecution === "boolean" &&
    candidate.cachePolicy === "fail_closed_to_review_required" &&
    blockedEffects
  ) {
    return {
      schemaVersion,
      serviceId: candidate.serviceId,
      runtimeAuthority: candidate.runtimeAuthority as false,
      commandExecution: candidate.commandExecution as false,
      cachePolicy: candidate.cachePolicy,
      blockedEffects,
    };
  }
  return null;
}

function buildInputFromPayload(endpointConfigured: boolean, payload: unknown, discoveredAt: string): DescriptorConnectionInput {
  if (!payload || typeof payload !== "object") {
    return { endpointConfigured, descriptor: null };
  }
  const record = payload as Record<string, unknown>;
  const checksum = record.checksum && typeof record.checksum === "object" ? record.checksum as Record<string, unknown> : {};
  const signature = record.signature && typeof record.signature === "object" ? record.signature as Record<string, unknown> : {};
  const cache = record.cache && typeof record.cache === "object" ? record.cache as Record<string, unknown> : {};
  return {
    endpointConfigured,
    descriptor: parseDescriptor(record.descriptor ?? record),
    expectedChecksum: stringValue(record.expectedChecksum) ?? stringValue(checksum.expected),
    actualChecksum: stringValue(record.actualChecksum) ?? stringValue(checksum.actual),
    signatureValid: booleanValue(record.signatureValid) ?? booleanValue(signature.valid),
    discoveredAt,
    maxAgeSeconds: numberValue(record.maxAgeSeconds) ?? numberValue(cache.maxAgeSeconds) ?? 300,
  };
}

function failureInput(endpointConfigured: boolean, failClosedReason: DescriptorFailClosedReason): DescriptorConnectionInput {
  return { endpointConfigured, descriptor: null, failClosedReason };
}

function httpFailureReason(status?: number): DescriptorFailClosedReason {
  return status === 401 || status === 403 ? "auth_failure" : "http_failure";
}

export async function discoverNapoleonDescriptor(
  dependencies: DescriptorDiscoveryDependencies = {},
): Promise<DescriptorDiscoveryResult> {
  const endpoint = getConfiguredEndpoint(dependencies);
  if (!endpoint) {
    const input = { endpointConfigured: false, descriptor: null };
    return { input, connection: buildDescriptorConnectionState(input), source: "none" };
  }

  const fetcher = dependencies.fetch ?? globalThis.fetch.bind(globalThis);
  let response: Awaited<ReturnType<DescriptorFetch>>;
  try {
    response = await fetcher(resolveNapoleonBridgeOperation(endpoint, "chief_of_staff_descriptor"), {
      method: "GET",
      headers: buildDescriptorHeaders(getConfiguredAuthToken(dependencies)),
    });
  } catch (error) {
    const input = failureInput(true, error instanceof Error && error.name === "AbortError" ? "bridge_timeout" : "http_failure");
    return { input, connection: buildDescriptorConnectionState(input), source: "live" };
  }
  if (!response.ok) {
    const input = failureInput(true, httpFailureReason(response.status));
    return { input, connection: buildDescriptorConnectionState(input), source: "live" };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    const input = failureInput(true, "http_failure");
    return { input, connection: buildDescriptorConnectionState(input), source: "live" };
  }
  const input = buildInputFromPayload(true, payload, dependencies.now?.() ?? new Date().toISOString());
  return { input, connection: buildDescriptorConnectionState(input), source: "live" };
}
