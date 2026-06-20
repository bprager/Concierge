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

export type NapoleonReviewOperationId =
  | "chief_of_staff_request"
  | "evaluation_review"
  | "evolution_proposal_review"
  | "governance_evaluation"
  | "governance_review"
  | "new_agent_proposal_review";

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
  id: BridgeOperationId | NapoleonReviewOperationId | "chief_of_staff_taxonomy_review";
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

interface NapoleonReviewOperation {
  id: NapoleonReviewOperationId;
  path: `/chief-of-staff/${string}` | `/governance/${string}`;
  requestKind:
    | "chief_of_staff_request_handoff"
    | "evaluation_review_handoff"
    | "evolution_proposal_review_handoff"
    | "governance_evaluation_handoff"
    | "governance_review_handoff"
    | "new_agent_proposal_review_handoff";
  transport: "http_post";
  responseRequired: readonly string[];
  governedBridgeOnly: true;
  tokenPlacement: "authorization_header_only";
}

export { GENERATED_BRIDGE_CONTRACT_SOURCE };

export const BRIDGE_OPERATIONS: BridgeOperation[] = [...GENERATED_BRIDGE_OPERATIONS];

export const NAPOLEON_REVIEW_OPERATIONS: NapoleonReviewOperation[] = [
  {
    id: "chief_of_staff_request",
    path: "/chief-of-staff/requests",
    requestKind: "chief_of_staff_request_handoff",
    transport: "http_post",
    responseRequired: [
      "text",
      "governanceDecision",
      "traceEnvelope",
      "auditEnvelope",
      "appliedLocally",
      "memoryWritePerformed",
      "approvalCaptured",
      "agentDispatchPerformed",
      "externalSendPerformed",
    ],
    governedBridgeOnly: true,
    tokenPlacement: "authorization_header_only",
  },
  {
    id: "evaluation_review",
    path: "/chief-of-staff/reviews/evaluation",
    requestKind: "evaluation_review_handoff",
    transport: "http_post",
    responseRequired: ["text"],
    governedBridgeOnly: true,
    tokenPlacement: "authorization_header_only",
  },
  {
    id: "evolution_proposal_review",
    path: "/chief-of-staff/reviews/evolution-proposals",
    requestKind: "evolution_proposal_review_handoff",
    transport: "http_post",
    responseRequired: [
      "text",
      "governanceDecision",
      "traceEnvelope",
      "auditEnvelope",
      "appliedLocally",
      "memoryWritePerformed",
      "approvalCaptured",
      "agentDispatchPerformed",
      "externalSendPerformed",
    ],
    governedBridgeOnly: true,
    tokenPlacement: "authorization_header_only",
  },
  {
    id: "governance_review",
    path: "/chief-of-staff/reviews/governance",
    requestKind: "governance_review_handoff",
    transport: "http_post",
    responseRequired: [
      "text",
      "governanceDecision",
      "traceEnvelope",
      "auditEnvelope",
      "appliedLocally",
      "memoryWritePerformed",
      "approvalCaptured",
      "agentDispatchPerformed",
      "externalSendPerformed",
    ],
    governedBridgeOnly: true,
    tokenPlacement: "authorization_header_only",
  },
  {
    id: "governance_evaluation",
    path: "/governance/evaluate",
    requestKind: "governance_evaluation_handoff",
    transport: "http_post",
    responseRequired: [
      "governanceDecision",
      "traceEnvelope",
      "auditEnvelope",
      "appliedLocally",
      "memoryWritePerformed",
      "approvalCaptured",
      "agentDispatchPerformed",
      "externalSendPerformed",
    ],
    governedBridgeOnly: true,
    tokenPlacement: "authorization_header_only",
  },
  {
    id: "new_agent_proposal_review",
    path: "/chief-of-staff/reviews/new-agent-proposals",
    requestKind: "new_agent_proposal_review_handoff",
    transport: "http_post",
    responseRequired: [
      "text",
      "governanceDecision",
      "traceEnvelope",
      "auditEnvelope",
      "appliedLocally",
      "memoryWritePerformed",
      "approvalCaptured",
      "agentDispatchPerformed",
      "externalSendPerformed",
    ],
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

export function getNapoleonReviewOperation(id: NapoleonReviewOperationId): NapoleonReviewOperation {
  const operation = NAPOLEON_REVIEW_OPERATIONS.find((candidate) => candidate.id === id);
  if (!operation) {
    throw new Error(`Unknown Napoleon review operation: ${id}`);
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
  for (const operation of NAPOLEON_REVIEW_OPERATIONS) {
    if (trimmed.endsWith(operation.path)) {
      return trimmed.slice(0, -operation.path.length).replace(/\/+$/, "");
    }
  }
  return trimmed;
}

function isGeneratedConciergeEndpoint(configuredEndpoint: string): boolean {
  const trimmed = configuredEndpoint.trim().split(/[?#]/, 1)[0].replace(/\/+$/, "");
  if (/\/v1\/concierge(?:\/|$)/.test(trimmed) || /\/concierge$/.test(trimmed)) return true;
  try {
    const parsed = new URL(trimmed);
    return (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") && parsed.port === "8787";
  } catch {
    return false;
  }
}

export function buildNapoleonBridgeUrl(configuredEndpoint: string, operationId: BridgeOperationId): string {
  const operation = getBridgeOperation(operationId);
  const trimmed = configuredEndpoint.trim().split(/[?#]/, 1)[0].replace(/\/+$/, "");
  if (trimmed.endsWith(operation.path)) return trimmed;
  return `${stripKnownBridgeOperationPath(trimmed)}${operation.path}`;
}

export function buildNapoleonReviewUrl(configuredEndpoint: string, operationId: NapoleonReviewOperationId): string {
  const operation = getNapoleonReviewOperation(operationId);
  const trimmed = configuredEndpoint.trim().split(/[?#]/, 1)[0].replace(/\/+$/, "");
  if (trimmed.endsWith(operation.path)) return trimmed;
  return `${stripKnownBridgeOperationPath(trimmed)}${operation.path}`;
}

export interface EvolutionProposalReviewBridgeTarget {
  url: string;
  path: "/v1/concierge/chief-of-staff/steering" | "/chief-of-staff/reviews/evolution-proposals";
  requestKind: "chief_of_staff_steering_handoff" | "evolution_proposal_review_handoff";
  operationId: "chief_of_staff_steering" | "evolution_proposal_review";
}

export interface EvaluationReviewBridgeTarget {
  url: string;
  path: "/v1/concierge/evaluate" | "/chief-of-staff/reviews/evaluation";
  requestKind: "evaluator_prompt" | "evaluation_review_handoff";
  operationId: "evaluate" | "evaluation_review";
}

export function buildEvaluationReviewBridgeTarget(configuredEndpoint: string): EvaluationReviewBridgeTarget {
  if (isGeneratedConciergeEndpoint(configuredEndpoint)) {
    return {
      url: buildNapoleonBridgeUrl(configuredEndpoint, "evaluate"),
      path: "/v1/concierge/evaluate",
      requestKind: "evaluator_prompt",
      operationId: "evaluate",
    };
  }
  return {
    url: buildNapoleonReviewUrl(configuredEndpoint, "evaluation_review"),
    path: "/chief-of-staff/reviews/evaluation",
    requestKind: "evaluation_review_handoff",
    operationId: "evaluation_review",
  };
}

export function buildEvolutionProposalReviewBridgeTarget(configuredEndpoint: string): EvolutionProposalReviewBridgeTarget {
  if (isGeneratedConciergeEndpoint(configuredEndpoint)) {
    return {
      url: buildNapoleonBridgeUrl(configuredEndpoint, "chief_of_staff_steering"),
      path: "/v1/concierge/chief-of-staff/steering",
      requestKind: "chief_of_staff_steering_handoff",
      operationId: "chief_of_staff_steering",
    };
  }
  return {
    url: buildNapoleonReviewUrl(configuredEndpoint, "evolution_proposal_review"),
    path: "/chief-of-staff/reviews/evolution-proposals",
    requestKind: "evolution_proposal_review_handoff",
    operationId: "evolution_proposal_review",
  };
}

export interface GovernanceReviewBridgeTarget {
  url: string;
  path: "/v1/concierge/chief-of-staff/steering" | "/chief-of-staff/reviews/governance";
  requestKind: "chief_of_staff_steering_handoff" | "governance_review_handoff";
  operationId: "chief_of_staff_steering" | "governance_review";
}

export function buildGovernanceReviewBridgeTarget(configuredEndpoint: string): GovernanceReviewBridgeTarget {
  if (isGeneratedConciergeEndpoint(configuredEndpoint)) {
    return {
      url: buildNapoleonBridgeUrl(configuredEndpoint, "chief_of_staff_steering"),
      path: "/v1/concierge/chief-of-staff/steering",
      requestKind: "chief_of_staff_steering_handoff",
      operationId: "chief_of_staff_steering",
    };
  }
  return {
    url: buildNapoleonReviewUrl(configuredEndpoint, "governance_review"),
    path: "/chief-of-staff/reviews/governance",
    requestKind: "governance_review_handoff",
    operationId: "governance_review",
  };
}

export interface NewAgentProposalReviewBridgeTarget {
  url: string;
  path: "/chief-of-staff/reviews/new-agent-proposals";
  requestKind: "new_agent_proposal_review_handoff";
  operationId: "new_agent_proposal_review";
}

export function buildNewAgentProposalReviewBridgeTarget(
  configuredEndpoint: string,
): NewAgentProposalReviewBridgeTarget {
  return {
    url: buildNapoleonReviewUrl(configuredEndpoint, "new_agent_proposal_review"),
    path: "/chief-of-staff/reviews/new-agent-proposals",
    requestKind: "new_agent_proposal_review_handoff",
    operationId: "new_agent_proposal_review",
  };
}

export interface ChiefOfStaffRequestBridgeTarget {
  url: string;
  path: "/chief-of-staff/requests";
  requestKind: "chief_of_staff_request_handoff";
  operationId: "chief_of_staff_request";
}

export function buildChiefOfStaffRequestBridgeTarget(configuredEndpoint: string): ChiefOfStaffRequestBridgeTarget {
  return {
    url: buildNapoleonReviewUrl(configuredEndpoint, "chief_of_staff_request"),
    path: "/chief-of-staff/requests",
    requestKind: "chief_of_staff_request_handoff",
    operationId: "chief_of_staff_request",
  };
}

export interface GovernanceEvaluationBridgeTarget {
  url: string;
  path: "/governance/evaluate";
  requestKind: "governance_evaluation_handoff";
  operationId: "governance_evaluation";
}

export function buildGovernanceEvaluationBridgeTarget(configuredEndpoint: string): GovernanceEvaluationBridgeTarget {
  return {
    url: buildNapoleonReviewUrl(configuredEndpoint, "governance_evaluation"),
    path: "/governance/evaluate",
    requestKind: "governance_evaluation_handoff",
    operationId: "governance_evaluation",
  };
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
