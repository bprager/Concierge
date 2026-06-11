export const TEXT_TURN_PATH = "/v1/concierge/turn";
export const CHIEF_OF_STAFF_STEERING_PATH = "/v1/concierge/chief-of-staff/steering";
export const CHIEF_OF_STAFF_DESCRIPTOR_PATH = "/v1/concierge/chief-of-staff/descriptor";
export const MEMORY_PROPOSAL_REVIEW_PATH = "/v1/concierge/memory-proposals";

export function resolveNapoleonBridgeEndpoint(configuredEndpoint: string, path: string): string {
  const trimmed = configuredEndpoint.trim().replace(/\/+$/, "");
  if (trimmed.endsWith(path)) return trimmed;
  return `${trimmed}${path}`;
}
