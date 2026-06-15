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

export interface BridgeOperationSummary {
  id: BridgeOperationId | "chief_of_staff_taxonomy_review";
  operationId: BridgeOperationId;
  label: string;
  path: string;
  requestKind: BridgeOperation["requestKind"];
  transport: "HTTP POST";
  boundary: string;
  tokenHandling: string;
  sideEffects: string;
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

const BRIDGE_OPERATION_LABELS: Record<BridgeOperationId, string> = {
  chief_of_staff_descriptor: "Descriptor discovery",
  chief_of_staff_steering: "Chief of Staff steering",
  evaluate: "Evaluator request",
  memory_proposal_review: "Memory proposal review",
  text_turn: "Text turn",
};

export function describeBridgeOperationSummary(id: BridgeOperationId): BridgeOperationSummary {
  const operation = getBridgeOperation(id);
  return {
    id: operation.id,
    operationId: operation.id,
    label: BRIDGE_OPERATION_LABELS[operation.id],
    path: operation.path,
    requestKind: operation.requestKind,
    transport: "HTTP POST",
    boundary: "Governed Napoleon bridge only",
    tokenHandling: "Bearer token is sent only in the Authorization header",
    sideEffects: "No memory write, approval capture, agent dispatch, or external send is performed by Concierge",
  };
}

export function describeTaxonomyReviewBridgeSummary(): BridgeOperationSummary {
  const summary = describeBridgeOperationSummary("chief_of_staff_steering");
  return {
    ...summary,
    id: "chief_of_staff_taxonomy_review",
    label: "Chief of Staff taxonomy review",
  };
}
