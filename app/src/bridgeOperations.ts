import {
  GENERATED_BRIDGE_CONTRACT_SOURCE,
  GENERATED_BRIDGE_OPERATIONS,
} from "./generatedBridgeOperations.js";

export type BridgeOperationId =
  | "text_turn"
  | "chief_of_staff_descriptor"
  | "chief_of_staff_steering"
  | "memory_proposal_review"
  | "evaluate";

export interface BridgeOperation {
  id: BridgeOperationId;
  path: `/v1/concierge/${string}`;
  requestKind:
    | "text_turn"
    | "chief_of_staff_descriptor"
    | "chief_of_staff_steering_handoff"
    | "memory_proposal_review_handoff"
    | "evaluator_prompt";
  transport: "http_post";
  governedBridgeOnly: true;
  tokenPlacement: "authorization_header_only";
}

export { GENERATED_BRIDGE_CONTRACT_SOURCE };

export const BRIDGE_OPERATIONS: BridgeOperation[] = [...GENERATED_BRIDGE_OPERATIONS];

export function getBridgeOperation(id: BridgeOperationId): BridgeOperation {
  const operation = BRIDGE_OPERATIONS.find((candidate) => candidate.id === id);
  if (!operation) {
    throw new Error(`Unknown Napoleon bridge operation: ${id}`);
  }
  return operation;
}

export function buildNapoleonBridgeUrl(configuredEndpoint: string, operationId: BridgeOperationId): string {
  const operation = getBridgeOperation(operationId);
  const trimmed = configuredEndpoint.trim().replace(/\/+$/, "");
  if (trimmed.endsWith(operation.path)) return trimmed;
  return `${trimmed}${operation.path}`;
}
