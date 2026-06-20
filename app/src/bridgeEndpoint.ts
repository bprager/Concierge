import {
  buildEvaluationReviewBridgeTarget,
  buildEvolutionProposalReviewBridgeTarget,
  buildGovernanceReviewBridgeTarget,
  buildNapoleonBridgeUrl,
  type BridgeOperationId,
  type EvaluationReviewBridgeTarget,
  type EvolutionProposalReviewBridgeTarget,
  type GovernanceReviewBridgeTarget,
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
