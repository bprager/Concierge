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

export const BRIDGE_OPERATIONS: BridgeOperation[] = [
  {
    id: "text_turn",
    path: "/v1/concierge/turn",
    requestKind: "text_turn",
    transport: "http_post",
    governedBridgeOnly: true,
    tokenPlacement: "authorization_header_only",
  },
  {
    id: "chief_of_staff_descriptor",
    path: "/v1/concierge/chief-of-staff/descriptor",
    requestKind: "chief_of_staff_descriptor",
    transport: "http_post",
    governedBridgeOnly: true,
    tokenPlacement: "authorization_header_only",
  },
  {
    id: "chief_of_staff_steering",
    path: "/v1/concierge/chief-of-staff/steering",
    requestKind: "chief_of_staff_steering_handoff",
    transport: "http_post",
    governedBridgeOnly: true,
    tokenPlacement: "authorization_header_only",
  },
  {
    id: "memory_proposal_review",
    path: "/v1/concierge/memory-proposals",
    requestKind: "memory_proposal_review_handoff",
    transport: "http_post",
    governedBridgeOnly: true,
    tokenPlacement: "authorization_header_only",
  },
  {
    id: "evaluate",
    path: "/v1/concierge/evaluate",
    requestKind: "evaluator_prompt",
    transport: "http_post",
    governedBridgeOnly: true,
    tokenPlacement: "authorization_header_only",
  },
];

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
