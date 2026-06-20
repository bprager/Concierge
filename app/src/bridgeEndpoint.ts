import {
  buildAgentManifestBridgeTarget,
  buildAgentManifestListBridgeTarget,
  buildEvaluationReviewBridgeTarget,
  buildEvolutionProposalSubmissionBridgeTarget,
  buildEvolutionProposalReviewBridgeTarget,
  buildGovernanceEvaluationBridgeTarget,
  buildGovernanceReviewBridgeTarget,
  buildChiefOfStaffRequestBridgeTarget,
  buildNewAgentProposalReviewBridgeTarget,
  buildNapoleonBridgeUrl,
  buildObservabilityTraceBridgeTarget,
  buildProfileBridgeTarget,
  type AgentManifestBridgeTarget,
  type AgentManifestListBridgeTarget,
  type BridgeOperationId,
  type ChiefOfStaffRequestBridgeTarget,
  type EvaluationReviewBridgeTarget,
  type EvolutionProposalSubmissionBridgeTarget,
  type EvolutionProposalReviewBridgeTarget,
  type GovernanceEvaluationBridgeTarget,
  type GovernanceReviewBridgeTarget,
  type NewAgentProposalReviewBridgeTarget,
  type ObservabilityTraceBridgeTarget,
  type ProfileBridgeTarget,
} from "./bridgeOperations.js";

export function resolveNapoleonBridgeOperation(configuredEndpoint: string, operationId: BridgeOperationId): string {
  return buildNapoleonBridgeUrl(configuredEndpoint, operationId);
}

export function resolveNapoleonChiefOfStaffRequestOperation(
  configuredEndpoint: string,
): ChiefOfStaffRequestBridgeTarget {
  return buildChiefOfStaffRequestBridgeTarget(configuredEndpoint);
}

export function resolveNapoleonGovernanceReviewOperation(configuredEndpoint: string): GovernanceReviewBridgeTarget {
  return buildGovernanceReviewBridgeTarget(configuredEndpoint);
}

export function resolveNapoleonGovernanceEvaluationOperation(
  configuredEndpoint: string,
): GovernanceEvaluationBridgeTarget {
  return buildGovernanceEvaluationBridgeTarget(configuredEndpoint);
}

export function resolveNapoleonEvolutionProposalReviewOperation(
  configuredEndpoint: string,
): EvolutionProposalReviewBridgeTarget {
  return buildEvolutionProposalReviewBridgeTarget(configuredEndpoint);
}

export function resolveNapoleonEvolutionProposalSubmissionOperation(
  configuredEndpoint: string,
): EvolutionProposalSubmissionBridgeTarget {
  return buildEvolutionProposalSubmissionBridgeTarget(configuredEndpoint);
}

export function resolveNapoleonEvaluationReviewOperation(configuredEndpoint: string): EvaluationReviewBridgeTarget {
  return buildEvaluationReviewBridgeTarget(configuredEndpoint);
}

export function resolveNapoleonNewAgentProposalReviewOperation(
  configuredEndpoint: string,
): NewAgentProposalReviewBridgeTarget {
  return buildNewAgentProposalReviewBridgeTarget(configuredEndpoint);
}

export function resolveNapoleonObservabilityTraceOperation(
  configuredEndpoint: string,
): ObservabilityTraceBridgeTarget {
  return buildObservabilityTraceBridgeTarget(configuredEndpoint);
}

export function resolveNapoleonAgentManifestListOperation(
  configuredEndpoint: string,
): AgentManifestListBridgeTarget {
  return buildAgentManifestListBridgeTarget(configuredEndpoint);
}

export function resolveNapoleonAgentManifestOperation(
  configuredEndpoint: string,
  agentId: string,
): AgentManifestBridgeTarget {
  return buildAgentManifestBridgeTarget(configuredEndpoint, agentId);
}

export function resolveNapoleonProfileOperation(configuredEndpoint: string, profileId: string): ProfileBridgeTarget {
  return buildProfileBridgeTarget(configuredEndpoint, profileId);
}
