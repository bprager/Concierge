import {
  resolveNapoleonAgentManifestListOperation,
  resolveNapoleonBridgeOperation,
  resolveNapoleonProfileOperation,
} from "./bridgeEndpoint.js";

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

export interface NapoleonAgentMetadata {
  agentId: string;
  displayName: string;
  description: string;
  allowedEffects: string[];
  blockedEffects: string[];
  runtimeAuthority: false;
  agentDispatchPerformed: false;
}

export interface NapoleonProfileMetadata {
  profileId: string;
  label: string;
  retentionMode: string;
  runtimeAuthority: false;
  memoryWritePerformed: false;
  approvalCaptured: false;
  blockedEffects: string[];
}

export interface ChiefOfStaffCapabilityDiscoveryInput {
  endpoint: string | null;
  authToken?: string | null;
  descriptorReady: boolean;
  profileId?: string | null;
  fetch?: CapabilityFetch;
}

export interface ChiefOfStaffCapabilityDiscoveryResult {
  state: "blocked" | "ready";
  message: string;
  serviceId: string | null;
  capabilities: ChiefOfStaffCapability[];
  agents: NapoleonAgentMetadata[];
  profileMetadata: NapoleonProfileMetadata | null;
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
    agents: [],
    profileMetadata: null,
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

function sideEffectBoundaryClear(record: Record<string, unknown>): boolean {
  const approvalCaptured = booleanValue(record.approvalCaptured) ?? booleanValue(record.approval_captured);
  const memoryWritePerformed = booleanValue(record.memoryWritePerformed) ?? booleanValue(record.memory_write_performed);
  const agentDispatchPerformed = booleanValue(record.agentDispatchPerformed) ?? booleanValue(record.agent_dispatch_performed);
  const externalSendPerformed = booleanValue(record.externalSendPerformed) ?? booleanValue(record.external_send_performed);
  return (
    approvalCaptured !== true &&
    memoryWritePerformed !== true &&
    agentDispatchPerformed !== true &&
    externalSendPerformed !== true
  );
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

function parseAgents(value: unknown): NapoleonAgentMetadata[] | null {
  if (!Array.isArray(value)) return null;
  const agents: NapoleonAgentMetadata[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    const agentId = stringValue(record.agentId) ?? stringValue(record.agent_id);
    const displayName = stringValue(record.displayName) ?? stringValue(record.display_name);
    const description = stringValue(record.description);
    const allowedEffects = stringArrayValue(record.allowedEffects) ?? stringArrayValue(record.allowed_effects);
    const blockedEffects = stringArrayValue(record.blockedEffects) ?? stringArrayValue(record.blocked_effects);
    const runtimeAuthority = booleanValue(record.runtimeAuthority) ?? booleanValue(record.runtime_authority);
    const agentDispatchPerformed =
      booleanValue(record.agentDispatchPerformed) ?? booleanValue(record.agent_dispatch_performed);
    if (
      !agentId ||
      !displayName ||
      !description ||
      !allowedEffects ||
      !blockedEffects ||
      runtimeAuthority !== false ||
      agentDispatchPerformed !== false
    ) {
      return null;
    }
    agents.push({
      agentId,
      displayName,
      description,
      allowedEffects,
      blockedEffects,
      runtimeAuthority: false,
      agentDispatchPerformed: false,
    });
  }
  return agents;
}

function parseProfileMetadata(value: unknown): NapoleonProfileMetadata | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const profileId = stringValue(record.profileId) ?? stringValue(record.profile_id);
  const label = stringValue(record.label);
  const retentionMode = stringValue(record.retentionMode) ?? stringValue(record.retention_mode);
  const runtimeAuthority = booleanValue(record.runtimeAuthority) ?? booleanValue(record.runtime_authority);
  const memoryWritePerformed = booleanValue(record.memoryWritePerformed) ?? booleanValue(record.memory_write_performed);
  const approvalCaptured = booleanValue(record.approvalCaptured) ?? booleanValue(record.approval_captured);
  const blockedEffects = stringArrayValue(record.blockedEffects) ?? stringArrayValue(record.blocked_effects);
  if (
    !profileId ||
    !label ||
    !retentionMode ||
    runtimeAuthority !== false ||
    memoryWritePerformed !== false ||
    approvalCaptured !== false ||
    !blockedEffects
  ) {
    return null;
  }
  return {
    profileId,
    label,
    retentionMode,
    runtimeAuthority: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    blockedEffects,
  };
}

async function fetchJson(
  fetcher: CapabilityFetch,
  target: string,
  authToken?: string | null,
): Promise<unknown | null> {
  const response = await fetcher(target, {
    method: "GET",
    headers: generatedHeaders(authToken),
  });
  if (!response.ok) return null;
  return response.json();
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
  if (
    serviceId !== "napoleon.chief_of_staff" ||
    runtimeAuthority !== false ||
    !sideEffectBoundaryClear(record) ||
    !blockedEffects ||
    !capabilities
  ) {
    return blocked("Capability discovery blocked: response contract mismatch.");
  }

  let agents: NapoleonAgentMetadata[] = [];
  let profileMetadata: NapoleonProfileMetadata | null = null;
  if (input.profileId) {
    try {
      const agentsPayload = await fetchJson(
        fetcher,
        resolveNapoleonAgentManifestListOperation(input.endpoint).url,
        input.authToken,
      );
      if (!agentsPayload || typeof agentsPayload !== "object") {
        return blocked("Capability discovery blocked: agent metadata response contract mismatch.");
      }
      const agentsRecord = agentsPayload as Record<string, unknown>;
      const agentRuntimeAuthority =
        booleanValue(agentsRecord.runtimeAuthority) ?? booleanValue(agentsRecord.runtime_authority);
      const agentDispatchPerformed =
        booleanValue(agentsRecord.agentDispatchPerformed) ?? booleanValue(agentsRecord.agent_dispatch_performed);
      const parsedAgents = parseAgents(agentsRecord.agents);
      if (agentRuntimeAuthority !== false || agentDispatchPerformed !== false || !parsedAgents) {
        return blocked("Capability discovery blocked: agent metadata response contract mismatch.");
      }
      agents = parsedAgents;

      const profilePayload = await fetchJson(
        fetcher,
        resolveNapoleonProfileOperation(input.endpoint, input.profileId).url,
        input.authToken,
      );
      profileMetadata = parseProfileMetadata(profilePayload);
      if (!profileMetadata) {
        return blocked("Capability discovery blocked: profile metadata response contract mismatch.");
      }
    } catch {
      return blocked("Capability discovery blocked: Napoleon metadata endpoint could not be reached.");
    }
  }

  return {
    state: "ready",
    message: "Advisory Chief of Staff capabilities discovered. This is not Napoleon approval.",
    serviceId,
    capabilities,
    agents,
    profileMetadata,
    runtimeAuthority: false,
    blockedEffects,
    approvalCaptured: false,
    memoryWritePerformed: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
  };
}
