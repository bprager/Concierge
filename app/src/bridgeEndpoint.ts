import { buildNapoleonBridgeUrl, getBridgeOperation, type BridgeOperationId } from "./bridgeOperations.js";

export const TEXT_TURN_PATH = getBridgeOperation("text_turn").path;
export const CHIEF_OF_STAFF_STEERING_PATH = getBridgeOperation("chief_of_staff_steering").path;
export const CHIEF_OF_STAFF_DESCRIPTOR_PATH = getBridgeOperation("chief_of_staff_descriptor").path;
export const MEMORY_PROPOSAL_REVIEW_PATH = getBridgeOperation("memory_proposal_review").path;

export function resolveNapoleonBridgeOperation(configuredEndpoint: string, operationId: BridgeOperationId): string {
  return buildNapoleonBridgeUrl(configuredEndpoint, operationId);
}

export function resolveNapoleonBridgeEndpoint(configuredEndpoint: string, path: string): string {
  const trimmed = configuredEndpoint.trim().replace(/\/+$/, "");
  if (trimmed.endsWith(path)) return trimmed;
  return `${trimmed}${path}`;
}
