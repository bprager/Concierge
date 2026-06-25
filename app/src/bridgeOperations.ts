import {
  GENERATED_BRIDGE_CONTRACT_SOURCE,
  GENERATED_BRIDGE_OPERATIONS,
  GENERATED_NAPOLEON_DISCOVERY_OPERATIONS,
  GENERATED_NAPOLEON_REVIEW_OPERATIONS,
} from "./generatedBridgeOperations.js";

type GeneratedBridgeOperation = (typeof GENERATED_BRIDGE_OPERATIONS)[number];
type GeneratedNapoleonReviewOperation = (typeof GENERATED_NAPOLEON_REVIEW_OPERATIONS)[number];
type GeneratedNapoleonDiscoveryOperation = (typeof GENERATED_NAPOLEON_DISCOVERY_OPERATIONS)[number];

export type BridgeOperationId = GeneratedBridgeOperation["id"];
export type BridgeOperation = GeneratedBridgeOperation;

export type NapoleonReviewOperationId = GeneratedNapoleonReviewOperation["id"];

export type NapoleonDiscoveryOperationId = GeneratedNapoleonDiscoveryOperation["id"];

export interface BridgeOperationSummary {
  id: BridgeOperationId | NapoleonReviewOperationId | "chief_of_staff_taxonomy_review";
  operationId: BridgeOperationId | NapoleonReviewOperationId;
  label: string;
  path: string;
  requestKind: BridgeOperation["requestKind"] | NapoleonReviewOperation["requestKind"];
  transport: "HTTP GET" | "HTTP POST";
  boundary: string;
  tokenHandling: string;
  sideEffects: string;
  requiredResponseFields: readonly string[];
  requiredResponseSummary: string;
  acceptedEndpointForms?: readonly string[];
  acceptedEndpointSummary?: string;
  requiredProofSummary?: string;
  sourceSummary?: string;
}

export interface RuntimeContractAlignmentSummary {
  status: "runtime_mapped_with_local_contract_paths";
  aligned: false;
  runtimeAligned: true;
  summary: string;
  detail: string;
  unmappedNapoleonRuntimePaths: readonly string[];
  boundary: string;
}

type NapoleonReviewOperation = GeneratedNapoleonReviewOperation;
type NapoleonDiscoveryOperation = GeneratedNapoleonDiscoveryOperation;

export {
  GENERATED_BRIDGE_CONTRACT_SOURCE,
  GENERATED_NAPOLEON_DISCOVERY_OPERATIONS,
  GENERATED_NAPOLEON_REVIEW_OPERATIONS,
};

export const BRIDGE_OPERATIONS: BridgeOperation[] = [...GENERATED_BRIDGE_OPERATIONS];

export const NAPOLEON_REVIEW_OPERATIONS: NapoleonReviewOperation[] = [...GENERATED_NAPOLEON_REVIEW_OPERATIONS];

export const NAPOLEON_DISCOVERY_OPERATIONS: NapoleonDiscoveryOperation[] = [...GENERATED_NAPOLEON_DISCOVERY_OPERATIONS];

export const RUNTIME_CONTRACT_ALIGNMENT_SUMMARY: RuntimeContractAlignmentSummary = {
  status: "runtime_mapped_with_local_contract_paths",
  aligned: false,
  runtimeAligned: true,
  summary: "Runtime mapped; exact Concierge and Napoleon path sets differ.",
  detail:
    "Concierge keeps local /v1/concierge/... packaging paths while named Napoleon /cos, review, evidence, and metadata targets are explicitly mapped.",
  unmappedNapoleonRuntimePaths: [],
  boundary:
    "Local contract metadata only; this is not Napoleon approval, runtime validation, memory permission, agent dispatch, external send, or local application.",
};

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

export function getNapoleonDiscoveryOperation(id: NapoleonDiscoveryOperationId): NapoleonDiscoveryOperation {
  const operation = NAPOLEON_DISCOVERY_OPERATIONS.find((candidate) => candidate.id === id);
  if (!operation) {
    throw new Error(`Unknown Napoleon discovery operation: ${id}`);
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
  if (trimmed.endsWith("/agents")) {
    return trimmed.slice(0, -"/agents".length).replace(/\/+$/, "");
  }
  if (/\/agents\/[^/]+$/.test(trimmed)) {
    return trimmed.replace(/\/agents\/[^/]+$/, "").replace(/\/+$/, "");
  }
  if (/\/profiles\/[^/]+$/.test(trimmed)) {
    return trimmed.replace(/\/profiles\/[^/]+$/, "").replace(/\/+$/, "");
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

export function buildNapoleonDiscoveryUrl(
  configuredEndpoint: string,
  operationId: NapoleonDiscoveryOperationId,
  pathParams: { agentId?: string; profileId?: string } = {},
): string {
  const operation = getNapoleonDiscoveryOperation(operationId);
  const trimmed = configuredEndpoint.trim().split(/[?#]/, 1)[0].replace(/\/+$/, "");
  if (operation.id === "agent_manifest_list") {
    if (trimmed.endsWith("/agents")) return trimmed;
    return `${stripKnownBridgeOperationPath(trimmed)}/agents`;
  }
  if (operation.id === "agent_manifest") {
    if (!pathParams.agentId) throw new Error("Napoleon agent manifest discovery requires agentId");
    return `${stripKnownBridgeOperationPath(trimmed)}/agents/${encodeURIComponent(pathParams.agentId)}`;
  }
  if (!pathParams.profileId) throw new Error("Napoleon profile discovery requires profileId");
  return `${stripKnownBridgeOperationPath(trimmed)}/profiles/${encodeURIComponent(pathParams.profileId)}`;
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

export interface EvolutionProposalSubmissionBridgeTarget {
  url: string;
  path: "/evolution/proposals";
  requestKind: "evolution_proposal_submission_handoff";
  operationId: "evolution_proposal_submission";
}

export function buildEvolutionProposalSubmissionBridgeTarget(
  configuredEndpoint: string,
): EvolutionProposalSubmissionBridgeTarget {
  return {
    url: buildNapoleonReviewUrl(configuredEndpoint, "evolution_proposal_submission"),
    path: "/evolution/proposals",
    requestKind: "evolution_proposal_submission_handoff",
    operationId: "evolution_proposal_submission",
  };
}

export interface EvolutionProposalStatusBridgeTarget {
  url: string;
  path: "/evolution/proposals/{proposal_id}/status";
  requestKind: "evolution_proposal_status_handoff";
  operationId: "evolution_proposal_status";
}

export function buildEvolutionProposalStatusBridgeTarget(
  configuredEndpoint: string,
  proposalId: string,
): EvolutionProposalStatusBridgeTarget {
  getNapoleonReviewOperation("evolution_proposal_status");
  return {
    url: `${stripKnownBridgeOperationPath(configuredEndpoint)}/evolution/proposals/${encodeURIComponent(proposalId)}/status`,
    path: "/evolution/proposals/{proposal_id}/status",
    requestKind: "evolution_proposal_status_handoff",
    operationId: "evolution_proposal_status",
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

export interface ObservabilityTraceBridgeTarget {
  url: string;
  path: "/observability/traces";
  requestKind: "observability_trace_handoff";
  operationId: "observability_trace";
}

export function buildObservabilityTraceBridgeTarget(configuredEndpoint: string): ObservabilityTraceBridgeTarget {
  return {
    url: buildNapoleonReviewUrl(configuredEndpoint, "observability_trace"),
    path: "/observability/traces",
    requestKind: "observability_trace_handoff",
    operationId: "observability_trace",
  };
}

export interface AgentManifestListBridgeTarget {
  url: string;
  path: "/agents";
  requestKind: "agent_manifest_discovery";
  operationId: "agent_manifest_list";
}

export function buildAgentManifestListBridgeTarget(configuredEndpoint: string): AgentManifestListBridgeTarget {
  return {
    url: buildNapoleonDiscoveryUrl(configuredEndpoint, "agent_manifest_list"),
    path: "/agents",
    requestKind: "agent_manifest_discovery",
    operationId: "agent_manifest_list",
  };
}

export interface AgentManifestBridgeTarget {
  url: string;
  path: "/agents/{agent_id}";
  requestKind: "agent_manifest_discovery";
  operationId: "agent_manifest";
}

export function buildAgentManifestBridgeTarget(configuredEndpoint: string, agentId: string): AgentManifestBridgeTarget {
  return {
    url: buildNapoleonDiscoveryUrl(configuredEndpoint, "agent_manifest", { agentId }),
    path: "/agents/{agent_id}",
    requestKind: "agent_manifest_discovery",
    operationId: "agent_manifest",
  };
}

export interface ProfileBridgeTarget {
  url: string;
  path: "/profiles/{profile_id}";
  requestKind: "profile_metadata_discovery";
  operationId: "profile";
}

export function buildProfileBridgeTarget(configuredEndpoint: string, profileId: string): ProfileBridgeTarget {
  return {
    url: buildNapoleonDiscoveryUrl(configuredEndpoint, "profile", { profileId }),
    path: "/profiles/{profile_id}",
    requestKind: "profile_metadata_discovery",
    operationId: "profile",
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

const NAPOLEON_REVIEW_OPERATION_LABELS: Record<NapoleonReviewOperationId, string> = {
  chief_of_staff_request: "Chief of Staff request handoff",
  evaluation_review: "Evaluation review handoff",
  evolution_proposal_review: "Evolution proposal review",
  evolution_proposal_submission: "Evolution proposal submission",
  evolution_proposal_status: "Evolution proposal status",
  governance_evaluation: "Governance evaluation handoff",
  governance_review: "Governance review handoff",
  new_agent_proposal_review: "New agent proposal review",
  observability_trace: "Observability trace handoff",
};

const ADVISORY_HARNESS_ENDPOINT_FORMS: Partial<Record<BridgeOperationId, readonly string[]>> = {
  chief_of_staff_capabilities: ["/cos", "/cos/descriptor", "/cos/capabilities", "/cos/text-turn"],
  chief_of_staff_descriptor: ["/cos", "/cos/descriptor", "/cos/capabilities", "/cos/text-turn"],
  text_turn: ["/cos", "/cos/descriptor", "/cos/capabilities", "/cos/text-turn"],
};

const ADVISORY_HARNESS_ENDPOINT_SUMMARIES: Partial<Record<BridgeOperationId, string>> = {
  chief_of_staff_capabilities:
    "Accepted explicit advisory forms: /cos, /cos/descriptor, /cos/capabilities, /cos/text-turn; capability discovery resolves to /cos/capabilities after descriptor preflight.",
  chief_of_staff_descriptor:
    "Accepted explicit advisory forms: /cos, /cos/descriptor, /cos/capabilities, /cos/text-turn; descriptor discovery resolves to /cos/descriptor.",
  text_turn:
    "Accepted explicit advisory forms: /cos, /cos/descriptor, /cos/capabilities, /cos/text-turn; live sends normalize to /cos/text-turn and require matching /cos/trace/{trace_id} proof.",
};

const BRIDGE_OPERATION_REQUIRED_PROOF_SUMMARIES: Partial<Record<BridgeOperationId, string>> = {
  text_turn: "/cos/trace/{trace_id}",
};

const BRIDGE_OPERATION_BOUNDARIES: Record<BridgeOperationId, string> = {
  chief_of_staff_capabilities:
    "capability-discovery Napoleon bridge target; no local approval, runtime authority grant, registry update, memory write, agent dispatch, external send, trace append, routing, or local application.",
  chief_of_staff_descriptor:
    "descriptor-discovery Napoleon bridge target; no local approval, runtime authority grant, registry update, memory write, agent dispatch, external send, trace append, routing, or local application.",
  chief_of_staff_steering:
    "Chief of Staff steering Napoleon bridge target; no local evolution application, approval capture, registry update, memory write, agent dispatch, external send, trace append, routing, or local application.",
  evaluate:
    "evaluator Napoleon bridge target; no local evaluator approval, release approval, memory write, agent dispatch, external send, registry update, trace append, routing, or local application.",
  memory_proposal_review:
    "proposal-review Napoleon bridge target; no local memory write, approval capture, agent dispatch, external send, registry update, trace append, task routing, or local application.",
  text_turn:
    "text-turn Napoleon bridge target; no local approval capture, memory write, agent dispatch, external send, registry update, trace append, task routing, or local application.",
};

const BRIDGE_OPERATION_SIDE_EFFECT_SUMMARIES: Record<BridgeOperationId, string> = {
  chief_of_staff_capabilities:
    "No approval, runtime authority grant, registry update, memory write, agent dispatch, external send, trace append, routing, or application is performed by Concierge",
  chief_of_staff_descriptor:
    "No approval, runtime authority grant, registry update, memory write, agent dispatch, external send, trace append, routing, or application is performed by Concierge",
  chief_of_staff_steering:
    "No evolution application, approval capture, registry update, memory write, agent dispatch, external send, trace append, routing, or application is performed by Concierge",
  evaluate:
    "No evaluator approval, release approval, memory write, agent dispatch, external send, registry update, trace append, routing, or application is performed by Concierge",
  memory_proposal_review:
    "No memory write, approval capture, agent dispatch, external send, registry update, trace append, task routing, or application is performed by Concierge",
  text_turn:
    "No approval capture, memory write, agent dispatch, external send, registry update, trace append, task routing, or application is performed by Concierge",
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
    boundary: BRIDGE_OPERATION_BOUNDARIES[operation.id],
    tokenHandling:
      ADVISORY_HARNESS_ENDPOINT_FORMS[operation.id] !== undefined
        ? "Bearer token is sent only in the Authorization header for generated routes or X-Napoleon-Auth for explicit /cos advisory routes"
        : "Bearer token is sent only in the Authorization header",
    sideEffects: BRIDGE_OPERATION_SIDE_EFFECT_SUMMARIES[operation.id],
    requiredResponseFields: operation.responseRequired,
    requiredResponseSummary: operation.responseRequired.join(", "),
    acceptedEndpointForms: ADVISORY_HARNESS_ENDPOINT_FORMS[operation.id],
    acceptedEndpointSummary: ADVISORY_HARNESS_ENDPOINT_SUMMARIES[operation.id],
    requiredProofSummary: BRIDGE_OPERATION_REQUIRED_PROOF_SUMMARIES[operation.id],
  };
}

export function describeNapoleonReviewOperationSummary(id: NapoleonReviewOperationId): BridgeOperationSummary {
  const operation = getNapoleonReviewOperation(id);
  const isEvaluationReview = operation.id === "evaluation_review";
  const isEvolutionReview = operation.id === "evolution_proposal_review";
  const isNewAgentReview = operation.id === "new_agent_proposal_review";
  const isEvolutionSubmission = operation.id === "evolution_proposal_submission";
  const isEvolutionStatus = operation.id === "evolution_proposal_status";
  const isGovernanceEvaluation = operation.id === "governance_evaluation";
  const isChiefOfStaffRequest = operation.id === "chief_of_staff_request";
  const isGovernanceReview = operation.id === "governance_review";
  const isObservabilityTrace = operation.id === "observability_trace";
  let boundary =
    "review-only or evidence-only Napoleon target; no local approval, memory write, agent dispatch, external send, registry update, trace append, routing, or local application.";
  let sideEffects =
    "No local approval, memory write, agent dispatch, external send, registry update, trace append, routing, or application is performed by Concierge";
  if (isEvaluationReview) {
    boundary =
      "evaluator-review Napoleon target; no local evaluator approval, release approval, memory write, agent dispatch, external send, registry update, trace append, routing, or local application.";
    sideEffects =
      "No evaluator approval, release approval, memory write, agent dispatch, external send, registry update, trace append, routing, or application is performed by Concierge";
  } else if (isEvolutionReview) {
    boundary =
      "evolution-review Napoleon target; no local evolution application, approval capture, registry update, memory write, agent dispatch, external send, trace append, routing, or local application.";
    sideEffects =
      "No evolution application, approval capture, registry update, memory write, agent dispatch, external send, trace append, routing, or application is performed by Concierge";
  } else if (isNewAgentReview) {
    boundary =
      "review-only Napoleon target; no local approval, agent activation, registry update, memory write, agent dispatch, external send, trace append, routing, or local application.";
    sideEffects =
      "No agent activation, registry update, local approval, memory write, agent dispatch, external send, trace append, routing, or application is performed by Concierge";
  } else if (isEvolutionSubmission) {
    boundary =
      "proposal-submission Napoleon target; no local evolution application, registry update, approval capture, memory write, agent dispatch, external send, trace append, routing, or local application.";
    sideEffects =
      "No evolution application, registry update, approval capture, memory write, agent dispatch, external send, trace append, routing, or application is performed by Concierge";
  } else if (isEvolutionStatus) {
    boundary =
      "proposal-status Napoleon target; read-only status metadata only, with no local approval, evolution application, registry update, memory write, agent dispatch, external send, trace append, routing, or local application.";
    sideEffects =
      "No approval, evolution application, registry update, memory write, agent dispatch, external send, trace append, routing, or application is performed by Concierge";
  } else if (isGovernanceEvaluation) {
    boundary =
      "governance-evaluation Napoleon target; no local governance override, approval capture, memory write, agent dispatch, external send, registry update, trace append, routing, or local application.";
    sideEffects =
      "No governance override, approval capture, memory write, agent dispatch, external send, registry update, trace append, routing, or application is performed by Concierge";
  } else if (isChiefOfStaffRequest) {
    boundary =
      "request-handoff Napoleon target; no local task routing, registry update, trace append, approval capture, memory write, agent dispatch, external send, or local application.";
    sideEffects =
      "No task routing, registry update, trace append, approval capture, memory write, agent dispatch, external send, or application is performed by Concierge";
  } else if (isGovernanceReview) {
    boundary =
      "governance-review Napoleon target; no local approval capture, governance override, memory write, agent dispatch, external send, registry update, trace append, routing, or local application.";
    sideEffects =
      "No approval capture, governance override, memory write, agent dispatch, external send, registry update, trace append, routing, or application is performed by Concierge";
  } else if (isObservabilityTrace) {
    boundary =
      "trace-evidence Napoleon target; no local trace append, audit authority, approval capture, memory write, task routing, agent dispatch, external send, or local application.";
    sideEffects =
      "No trace append, audit authority, approval capture, memory write, task routing, agent dispatch, external send, or application is performed by Concierge";
  }
  return {
    id: operation.id,
    operationId: operation.id,
    label: NAPOLEON_REVIEW_OPERATION_LABELS[operation.id],
    path: operation.path,
    requestKind: operation.requestKind,
    transport: BRIDGE_OPERATION_TRANSPORT_LABELS[operation.transport],
    boundary,
    tokenHandling: "Bearer token is sent only in the Authorization header",
    sideEffects,
    requiredResponseFields: operation.responseRequired,
    requiredResponseSummary: operation.responseRequired.join(", "),
    sourceSummary: "Generated from api/napoleon_bridge.openapi.yaml review/evidence metadata",
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
