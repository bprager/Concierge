import { resolveNapoleonBridgeOperation } from "./bridgeEndpoint.js";

type CapabilityFetch = (url: string, init?: { method?: string; headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}>;

export interface ChiefOfStaffCapability {
  id: string;
  label: string;
  description: string;
  authorityTier: string;
  proposalOnly: boolean;
}

export interface ChiefOfStaffCapabilityDiscoveryInput {
  endpoint: string | null;
  authToken?: string | null;
  descriptorReady: boolean;
  fetch?: CapabilityFetch;
}

export interface ChiefOfStaffCapabilityDiscoveryResult {
  state: "blocked" | "ready";
  message: string;
  serviceId: string | null;
  capabilities: ChiefOfStaffCapability[];
  runtimeAuthority: false;
  blockedEffects: string[];
  approvalCaptured: false;
  memoryWritePerformed: false;
  agentDispatchPerformed: false;
  externalSendPerformed: false;
}

const DEFAULT_BLOCKED_EFFECTS = ["memory_write", "approval_capture", "agent_dispatch", "external_send"];

function blocked(message: string, blockedEffects = DEFAULT_BLOCKED_EFFECTS): ChiefOfStaffCapabilityDiscoveryResult {
  return {
    state: "blocked",
    message,
    serviceId: null,
    capabilities: [],
    runtimeAuthority: false,
    blockedEffects,
    approvalCaptured: false,
    memoryWritePerformed: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
  };
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.trim().split(/[?#]/, 1)[0].replace(/\/+$/, "");
}

function resolveCosCapabilitiesEndpoint(endpoint: string): string | null {
  const normalized = normalizeEndpoint(endpoint);
  if (normalized.endsWith("/cos/capabilities")) return normalized;
  if (normalized.endsWith("/cos/descriptor") || normalized.endsWith("/cos/text-turn")) {
    return normalized.replace(/\/cos\/(?:descriptor|text-turn)$/, "/cos/capabilities");
  }
  if (normalized.endsWith("/cos")) return `${normalized}/capabilities`;
  return null;
}

function generatedHeaders(authToken?: string | null): Record<string, string> {
  return authToken ? { Accept: "application/json", Authorization: `Bearer ${authToken}` } : { Accept: "application/json" };
}

function cosHeaders(authToken?: string | null): Record<string, string> {
  return authToken ? { Accept: "application/json", "X-Napoleon-Auth": authToken } : { Accept: "application/json" };
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function stringArrayValue(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null;
}

function parseCapabilities(value: unknown): ChiefOfStaffCapability[] | null {
  if (!Array.isArray(value)) return null;
  const capabilities: ChiefOfStaffCapability[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    const id = stringValue(record.id);
    const label = stringValue(record.label);
    const description = stringValue(record.description);
    const authorityTier = stringValue(record.authorityTier) ?? stringValue(record.authority_tier);
    const proposalOnly = booleanValue(record.proposalOnly) ?? booleanValue(record.proposal_only);
    if (!id || !label || !description || !authorityTier || proposalOnly !== true) return null;
    capabilities.push({ id, label, description, authorityTier, proposalOnly });
  }
  return capabilities;
}

export async function discoverChiefOfStaffCapabilities(
  input: ChiefOfStaffCapabilityDiscoveryInput,
): Promise<ChiefOfStaffCapabilityDiscoveryResult> {
  if (!input.endpoint) return blocked("Capability discovery blocked: no Napoleon endpoint is configured.");
  if (!input.descriptorReady) {
    return blocked("Capability discovery blocked: descriptor discovery must pass before advisory capabilities are fetched.");
  }

  const fetcher = input.fetch ?? globalThis.fetch.bind(globalThis);
  const cosEndpoint = resolveCosCapabilitiesEndpoint(input.endpoint);
  const target = cosEndpoint ?? resolveNapoleonBridgeOperation(input.endpoint, "chief_of_staff_capabilities");
  let response: Awaited<ReturnType<CapabilityFetch>>;
  try {
    response = await fetcher(target, {
      method: "GET",
      headers: cosEndpoint ? cosHeaders(input.authToken) : generatedHeaders(input.authToken),
    });
  } catch {
    return blocked("Capability discovery blocked: Napoleon capability endpoint could not be reached.");
  }
  if (!response.ok) return blocked("Capability discovery blocked: Napoleon capability endpoint rejected the request.");

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return blocked("Capability discovery blocked: Napoleon capability response was unreadable.");
  }
  if (!payload || typeof payload !== "object") return blocked("Capability discovery blocked: response contract mismatch.");
  const record = payload as Record<string, unknown>;
  const serviceId = stringValue(record.serviceId) ?? stringValue(record.service_id);
  const runtimeAuthority = booleanValue(record.runtimeAuthority) ?? booleanValue(record.runtime_authority);
  const blockedEffects = stringArrayValue(record.blockedEffects) ?? stringArrayValue(record.blocked_effects);
  const capabilities = parseCapabilities(record.capabilities);
  if (serviceId !== "napoleon.chief_of_staff" || runtimeAuthority !== false || !blockedEffects || !capabilities) {
    return blocked("Capability discovery blocked: response contract mismatch.");
  }
  return {
    state: "ready",
    message: "Advisory Chief of Staff capabilities discovered. This is not Napoleon approval.",
    serviceId,
    capabilities,
    runtimeAuthority: false,
    blockedEffects,
    approvalCaptured: false,
    memoryWritePerformed: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
  };
}
