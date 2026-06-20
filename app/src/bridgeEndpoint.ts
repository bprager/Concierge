import {
  buildEvaluationReviewBridgeTarget,
  buildEvolutionProposalReviewBridgeTarget,
  buildGovernanceReviewBridgeTarget,
  buildNewAgentProposalReviewBridgeTarget,
  buildNapoleonBridgeUrl,
  type BridgeOperationId,
  type EvaluationReviewBridgeTarget,
  type EvolutionProposalReviewBridgeTarget,
  type GovernanceReviewBridgeTarget,
  type NewAgentProposalReviewBridgeTarget,
} from "./bridgeOperations.js";

export function resolveNapoleonBridgeOperation(configuredEndpoint: string, operationId: BridgeOperationId): string {
  return buildNapoleonBridgeUrl(configuredEndpoint, operationId);
}

export function resolveNapoleonGovernanceReviewOperation(configuredEndpoint: string): GovernanceReviewBridgeTarget {
  return buildGovernanceReviewBridgeTarget(configuredEndpoint);
}

export function resolveNapoleonEvolutionProposalReviewOperation(
  configuredEndpoint: string,
): EvolutionProposalReviewBridgeTarget {
  return buildEvolutionProposalReviewBridgeTarget(configuredEndpoint);
}

export function resolveNapoleonEvaluationReviewOperation(configuredEndpoint: string): EvaluationReviewBridgeTarget {
  return buildEvaluationReviewBridgeTarget(configuredEndpoint);
}

export function resolveNapoleonNewAgentProposalReviewOperation(
  configuredEndpoint: string,
): NewAgentProposalReviewBridgeTarget {
  return buildNewAgentProposalReviewBridgeTarget(configuredEndpoint);
}
