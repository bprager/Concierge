import {
  GENERATED_BRIDGE_CONTRACT_SOURCE,
  GENERATED_BRIDGE_OPERATIONS,
} from "./generatedBridgeOperations.js";

export type BridgeOperationId =
  | "text_turn"
  | "chief_of_staff_capabilities"
  | "chief_of_staff_descriptor"
  | "chief_of_staff_steering"
  | "memory_proposal_review"
  | "evaluate";

export interface BridgeOperation {
  id: BridgeOperationId;
  path: `/v1/concierge/${string}`;
  requestKind:
    | "text_turn"
    | "chief_of_staff_capabilities"
    | "chief_of_staff_descriptor"
    | "chief_of_staff_steering_handoff"
    | "memory_proposal_review_handoff"
    | "evaluator_prompt";
  transport: "http_get" | "http_post";
  responseRequired: readonly string[];
  governedBridgeOnly: true;
  tokenPlacement: "authorization_header_only";
}

export interface BridgeOperationSummary {
  id: BridgeOperationId | "chief_of_staff_taxonomy_review";
  operationId: BridgeOperationId;
  label: string;
  path: string;
  requestKind: BridgeOperation["requestKind"];
  transport: "HTTP GET" | "HTTP POST";
  boundary: string;
  tokenHandling: string;
  sideEffects: string;
  requiredResponseFields: readonly string[];
  requiredResponseSummary: string;
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

function stripKnownBridgeOperationPath(configuredEndpoint: string): string {
  const trimmed = configuredEndpoint.trim().split(/[?#]/, 1)[0].replace(/\/+$/, "");
  for (const operation of BRIDGE_OPERATIONS) {
    if (trimmed.endsWith(operation.path)) {
      return trimmed.slice(0, -operation.path.length).replace(/\/+$/, "");
    }
  }
  return trimmed;
}

export function buildNapoleonBridgeUrl(configuredEndpoint: string, operationId: BridgeOperationId): string {
  const operation = getBridgeOperation(operationId);
  const trimmed = configuredEndpoint.trim().split(/[?#]/, 1)[0].replace(/\/+$/, "");
  if (trimmed.endsWith(operation.path)) return trimmed;
  return `${stripKnownBridgeOperationPath(trimmed)}${operation.path}`;
}

const BRIDGE_OPERATION_LABELS: Record<BridgeOperationId, string> = {
  chief_of_staff_capabilities: "Chief of Staff capabilities",
  chief_of_staff_descriptor: "Descriptor discovery",
  chief_of_staff_steering: "Chief of Staff steering",
  evaluate: "Evaluator request",
  memory_proposal_review: "Memory proposal review",
  text_turn: "Text turn",
};

const BRIDGE_OPERATION_TRANSPORT_LABELS: Record<BridgeOperation["transport"], BridgeOperationSummary["transport"]> = {
  http_get: "HTTP GET",
  http_post: "HTTP POST",
};

export function describeBridgeOperationSummary(id: BridgeOperationId): BridgeOperationSummary {
  const operation = getBridgeOperation(id);
  return {
    id: operation.id,
    operationId: operation.id,
    label: BRIDGE_OPERATION_LABELS[operation.id],
    path: operation.path,
    requestKind: operation.requestKind,
    transport: BRIDGE_OPERATION_TRANSPORT_LABELS[operation.transport],
    boundary: "Governed Napoleon bridge only",
    tokenHandling: "Bearer token is sent only in the Authorization header",
    sideEffects: "No memory write, approval capture, agent dispatch, or external send is performed by Concierge",
    requiredResponseFields: operation.responseRequired,
    requiredResponseSummary: operation.responseRequired.join(", "),
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
