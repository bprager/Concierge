import type { GovernanceOutcome } from "./contractBridge.js";

export interface GovernanceDecisionViewInput {
  outcome: GovernanceOutcome;
  decisionId: string;
  auditId: string;
  blockedEffects: string[];
}

export interface GovernanceDecisionView {
  status: string;
  detail: string;
  requiresReview: boolean;
  blockedEffectsLabel: string;
}

export function describeGovernanceDecision(input: GovernanceDecisionViewInput): GovernanceDecisionView {
  const blockedEffectsLabel = input.blockedEffects.slice(0, 5).join(", ");

  if (input.outcome === "requires_review") {
    return {
      status: "Review required",
      detail: `Chief of Staff review is required before this can move beyond preparation. Decision ${input.decisionId}, audit ${input.auditId}.`,
      requiresReview: true,
      blockedEffectsLabel,
    };
  }

  if (input.outcome === "no_go") {
    return {
      status: "No-go",
      detail: `Napoleon governance marked this as non-executable. Decision ${input.decisionId}, audit ${input.auditId}.`,
      requiresReview: true,
      blockedEffectsLabel,
    };
  }

  if (input.outcome === "deny") {
    return {
      status: "Denied",
      detail: `Napoleon governance denied the requested action. Decision ${input.decisionId}, audit ${input.auditId}.`,
      requiresReview: false,
      blockedEffectsLabel,
    };
  }

  return {
    status: "Prepare only",
    detail: `Concierge can prepare an advisory response but cannot execute blocked effects. Decision ${input.decisionId}, audit ${input.auditId}.`,
    requiresReview: false,
    blockedEffectsLabel,
  };
}
