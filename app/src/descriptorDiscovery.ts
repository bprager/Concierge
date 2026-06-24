import { resolveNapoleonBridgeOperation } from "./bridgeEndpoint.js";
import { readConfiguredAuthTokenFromStorage, readConfiguredEndpointFromStorage } from "./connectionStorage.js";
import {
  buildDescriptorConnectionState,
  type ChiefOfStaffDescriptor,
  type DescriptorFailClosedReason,
  type DescriptorConnectionInput,
  type DescriptorConnectionState,
  type GovernedHandoffCapability,
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

const INVALID_DESCRIPTOR = Symbol("invalid_descriptor");

function getConfiguredEndpoint(dependencies: DescriptorDiscoveryDependencies): string | null {
  if (dependencies.getEndpoint) return dependencies.getEndpoint();
  return readConfiguredEndpointFromStorage();
}

function getConfiguredAuthToken(dependencies: DescriptorDiscoveryDependencies): string | null {
  if (dependencies.getAuthToken) return dependencies.getAuthToken();
  if (dependencies.getEndpoint) return null;
  return readConfiguredAuthTokenFromStorage();
}

function buildDescriptorHeaders(authToken: string | null): Record<string, string> {
  return authToken ? { Accept: "application/json", Authorization: `Bearer ${authToken}` } : { Accept: "application/json" };
}

function buildCosDescriptorHeaders(authToken: string | null): Record<string, string> {
  return authToken ? { Accept: "application/json", "X-Napoleon-Auth": authToken } : { Accept: "application/json" };
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.trim().split(/[?#]/, 1)[0].replace(/\/+$/, "");
}

function resolveCosDescriptorEndpoint(endpoint: string): string | null {
  const normalized = normalizeEndpoint(endpoint);
  if (normalized.endsWith("/cos/descriptor")) return normalized;
  if (normalized.endsWith("/cos/text-turn") || normalized.endsWith("/cos/capabilities")) {
    return normalized.replace(/\/cos\/(?:text-turn|capabilities)$/, "/cos/descriptor");
  }
  if (normalized.endsWith("/cos")) return `${normalized}/descriptor`;
  return null;
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

const GOVERNED_HANDOFF_CAPABILITIES = new Set<GovernedHandoffCapability>([
  "text_turn",
  "evaluation_review",
  "memory_proposal_review",
  "chief_of_staff_steering",
  "chief_of_staff_request",
  "governance_review",
  "governance_evaluation",
  "evolution_proposal_review",
  "evolution_proposal_submission",
  "evolution_proposal_status",
  "new_agent_proposal_review",
  "taxonomy_review",
  "observability_trace",
]);

function hasOwnRecordValue(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function supportedHandoffsValue(value: unknown): GovernedHandoffCapability[] | null | undefined {
  if (value === undefined) return undefined;
  const values = stringArrayValue(value);
  if (!values) return null;
  const governedHandoffs: GovernedHandoffCapability[] = [];
  for (const item of values) {
    if (!GOVERNED_HANDOFF_CAPABILITIES.has(item as GovernedHandoffCapability)) return null;
    governedHandoffs.push(item as GovernedHandoffCapability);
  }
  return governedHandoffs;
}

function pushUniqueHandoff(supported: GovernedHandoffCapability[], capability: GovernedHandoffCapability): void {
  if (!supported.includes(capability)) supported.push(capability);
}

function supportedHandoffsFromRequiredFor(value: unknown): GovernedHandoffCapability[] {
  const values = stringArrayValue(value) ?? [];
  const supported: GovernedHandoffCapability[] = [];
  for (const item of values) {
    if (item === "evaluation_review") pushUniqueHandoff(supported, "evaluation_review");
    if (item === "governance_review") pushUniqueHandoff(supported, "governance_review");
    if (item === "governance_evaluation") pushUniqueHandoff(supported, "governance_evaluation");
    if (item === "evolution_proposal_review") pushUniqueHandoff(supported, "evolution_proposal_review");
    if (item === "evolution_proposal_submission") pushUniqueHandoff(supported, "evolution_proposal_submission");
    if (item === "evolution_proposal_status") pushUniqueHandoff(supported, "evolution_proposal_status");
    if (item === "new_agent_proposal_review") pushUniqueHandoff(supported, "new_agent_proposal_review");
    if (item === "memory_proposal_review") pushUniqueHandoff(supported, "memory_proposal_review");
    if (item === "chief_of_staff_steering") pushUniqueHandoff(supported, "chief_of_staff_steering");
    if (item === "chief_of_staff_request") pushUniqueHandoff(supported, "chief_of_staff_request");
    if (item === "taxonomy_review") pushUniqueHandoff(supported, "taxonomy_review");
    if (item === "observability_trace") pushUniqueHandoff(supported, "observability_trace");
  }
  return supported;
}

function supportedHandoffsFromRuntimeEndpoints(endpoints: Record<string, unknown>): GovernedHandoffCapability[] {
  const supported: GovernedHandoffCapability[] = [];
  if (endpoints.text_turn === "POST /cos/text-turn") pushUniqueHandoff(supported, "text_turn");
  if (typeof endpoints.evaluation_review === "string" || typeof endpoints.evaluation_reviews === "string") {
    pushUniqueHandoff(supported, "evaluation_review");
  }
  if (typeof endpoints.chief_of_staff_request === "string" || typeof endpoints.chief_of_staff_requests === "string") {
    pushUniqueHandoff(supported, "chief_of_staff_request");
  }
  if (typeof endpoints.memory_proposal_review === "string" || typeof endpoints.memory_proposal_reviews === "string") {
    pushUniqueHandoff(supported, "memory_proposal_review");
  }
  if (typeof endpoints.chief_of_staff_steering === "string") pushUniqueHandoff(supported, "chief_of_staff_steering");
  if (typeof endpoints.governance_evaluation === "string" || typeof endpoints.governance_evaluations === "string") {
    pushUniqueHandoff(supported, "governance_evaluation");
  }
  if (typeof endpoints.governance_review === "string" || typeof endpoints.governance_reviews === "string") {
    pushUniqueHandoff(supported, "governance_review");
  }
  if (typeof endpoints.evolution_proposal_submission === "string" || typeof endpoints.evolution_proposal_submissions === "string") {
    pushUniqueHandoff(supported, "evolution_proposal_submission");
  }
  if (typeof endpoints.evolution_proposal_status === "string" || typeof endpoints.evolution_proposal_statuses === "string") {
    pushUniqueHandoff(supported, "evolution_proposal_status");
  }
  if (typeof endpoints.evolution_proposal_review === "string" || typeof endpoints.evolution_proposal_reviews === "string") {
    pushUniqueHandoff(supported, "evolution_proposal_review");
  }
  if (typeof endpoints.new_agent_proposal_review === "string" || typeof endpoints.new_agent_proposal_reviews === "string") {
    pushUniqueHandoff(supported, "new_agent_proposal_review");
  }
  if (typeof endpoints.taxonomy_review === "string" || typeof endpoints.taxonomy_reviews === "string") {
    pushUniqueHandoff(supported, "taxonomy_review");
  }
  if (typeof endpoints.observability_trace === "string" || typeof endpoints.observability_traces === "string") {
    pushUniqueHandoff(supported, "observability_trace");
  }
  return supported;
}

function mergeSupportedHandoffs(
  ...groups: Array<GovernedHandoffCapability[] | null | undefined>
): GovernedHandoffCapability[] | undefined {
  const merged: GovernedHandoffCapability[] = [];
  for (const group of groups) {
    for (const capability of group ?? []) {
      pushUniqueHandoff(merged, capability);
    }
  }
  return merged.length ? merged : undefined;
}

function parseDescriptor(value: unknown): ChiefOfStaffDescriptor | null | typeof INVALID_DESCRIPTOR {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ChiefOfStaffDescriptor> & Record<string, unknown>;
  const schemaVersion = stringValue(candidate.schemaVersion) ?? stringValue(candidate.schema_version);
  const serviceId = stringValue(candidate.serviceId) ?? stringValue(candidate.service_id);
  const runtimeAuthority = booleanValue(candidate.runtimeAuthority) ?? booleanValue(candidate.runtime_authority);
  const commandExecution = booleanValue(candidate.commandExecution) ?? booleanValue(candidate.command_execution);
  const endpoints = candidate.endpoints && typeof candidate.endpoints === "object"
    ? candidate.endpoints as Record<string, unknown>
    : {};
  const supportedAuthorityTiers =
    stringArrayValue(candidate.supportedAuthorityTiers) ?? stringArrayValue(candidate.supported_authority_tiers);
  const cachePolicyValue =
    typeof candidate.cache_policy === "object" && candidate.cache_policy
      ? (candidate.cache_policy as Record<string, unknown>).stale_descriptor_action
      : candidate.cachePolicy;
  const cachePolicy = stringValue(cachePolicyValue);
  const blockedEffects = stringArrayValue(candidate.blockedEffects) ?? stringArrayValue(candidate.blocked_effects);
  const supportedHandoffs = hasOwnRecordValue(candidate, "supportedHandoffs")
    ? supportedHandoffsValue(candidate.supportedHandoffs)
    : supportedHandoffsValue(candidate.supported_handoffs);
  if (supportedHandoffs === null) return INVALID_DESCRIPTOR;
  const derivedSupportedHandoffs =
    supportedHandoffs ??
    mergeSupportedHandoffs(
      supportedHandoffsFromRequiredFor(candidate.required_for),
      supportedHandoffsFromRuntimeEndpoints(endpoints),
    );
  const liveRuntimeDescriptor =
    schemaVersion === "napoleon/concierge/runtime-descriptor/v1" &&
    serviceId === "napoleon.chief_of_staff" &&
    runtimeAuthority === false &&
    commandExecution === false &&
    endpoints.descriptor === "GET /cos/descriptor" &&
    endpoints.text_turn === "POST /cos/text-turn" &&
    supportedAuthorityTiers !== undefined &&
    supportedAuthorityTiers.every((tier) => tier === "advisory_prepare_only") &&
    blockedEffects !== undefined;
  if (liveRuntimeDescriptor) {
    return {
      schemaVersion,
      serviceId,
      runtimeAuthority,
      commandExecution,
      cachePolicy: "runtime_descriptor_live_response",
      blockedEffects,
      supportedHandoffs: derivedSupportedHandoffs ?? [],
    };
  }
  if (
    schemaVersion &&
    serviceId === "napoleon.chief_of_staff" &&
    runtimeAuthority !== undefined &&
    commandExecution !== undefined &&
    cachePolicy === "fail_closed_to_review_required" &&
    blockedEffects
  ) {
    return {
      schemaVersion,
      serviceId,
      runtimeAuthority: runtimeAuthority as false,
      commandExecution: commandExecution as false,
      cachePolicy,
      blockedEffects,
      supportedHandoffs: derivedSupportedHandoffs,
    };
  }
  return null;
}

async function fetchDescriptorFrom(
  fetcher: DescriptorFetch,
  url: string,
  authToken: string | null,
  cosMode: boolean,
): Promise<Awaited<ReturnType<DescriptorFetch>>> {
  return fetcher(url, {
    method: "GET",
    headers: cosMode ? buildCosDescriptorHeaders(authToken) : buildDescriptorHeaders(authToken),
  });
}

function buildInputFromPayload(endpointConfigured: boolean, payload: unknown, discoveredAt: string): DescriptorConnectionInput {
  if (!payload || typeof payload !== "object") {
    return { endpointConfigured, descriptor: null };
  }
  const record = payload as Record<string, unknown>;
  const checksum = record.checksum && typeof record.checksum === "object" ? record.checksum as Record<string, unknown> : {};
  const signature = record.signature && typeof record.signature === "object" ? record.signature as Record<string, unknown> : {};
  const cache = record.cache && typeof record.cache === "object" ? record.cache as Record<string, unknown> : {};
  const cachePolicy = record.cache_policy && typeof record.cache_policy === "object" ? record.cache_policy as Record<string, unknown> : {};
  const descriptor = parseDescriptor(record.descriptor ?? record);
  return {
    endpointConfigured,
    descriptor: descriptor === INVALID_DESCRIPTOR ? null : descriptor,
    failClosedReason: descriptor === INVALID_DESCRIPTOR ? "descriptor_invalid" : undefined,
    expectedChecksum: stringValue(record.expectedChecksum) ?? stringValue(checksum.expected),
    actualChecksum: stringValue(record.actualChecksum) ?? stringValue(checksum.actual),
    signatureValid: booleanValue(record.signatureValid) ?? booleanValue(signature.valid),
    discoveredAt,
    maxAgeSeconds:
      numberValue(record.maxAgeSeconds) ??
      numberValue(cache.maxAgeSeconds) ??
      numberValue(cachePolicy.ttl_seconds) ??
      300,
    now: discoveredAt,
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
  const cosDescriptorEndpoint = resolveCosDescriptorEndpoint(endpoint);
  const authToken = getConfiguredAuthToken(dependencies);
  let response: Awaited<ReturnType<DescriptorFetch>>;
  try {
    const generatedDescriptorEndpoint = resolveNapoleonBridgeOperation(endpoint, "chief_of_staff_descriptor");
    response = await fetchDescriptorFrom(fetcher, cosDescriptorEndpoint ?? generatedDescriptorEndpoint, authToken, Boolean(cosDescriptorEndpoint));
    if (!cosDescriptorEndpoint && response.status === 404) {
      response = await fetchDescriptorFrom(fetcher, `${normalizeEndpoint(endpoint)}/cos/descriptor`, authToken, true);
    }
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
