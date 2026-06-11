import {
  answerCapabilityQuestion,
  type CapabilityArchitectureArea,
  type CapabilityLedger,
  type RecommendationBoundary,
} from "./capabilityLedger.js";

interface SteeringDraftOptions {
  conversationId: string;
  traceId: string;
  endpointConfigured: boolean;
}

interface SteeringRecommendation {
  capabilityLabel: string;
  architectureArea: CapabilityArchitectureArea;
  evidenceCount: number;
  confidence: number;
  suggestedNextStep: string;
  rationale: string;
}

interface EvaluatorCaseCandidate {
  caseId: string;
  scenarioType: "capability_gap_regression";
  capabilityLabel: string;
  architectureArea: CapabilityArchitectureArea;
  expectedBehavior: string;
}

interface EvolutionProposalDraft {
  proposal_id: string;
  summary: string;
  risk_level: "low" | "medium" | "high" | "very_high";
  evidence: string[];
  change: {
    capability: string;
    architecture_area: CapabilityArchitectureArea;
    requested_action: string;
  };
  affected_profiles: string[];
  affected_channels: string[];
  evaluator_cases: string[];
  approval_required: string;
  rollback_plan: string;
}

export interface ChiefOfStaffSteeringDraft {
  recommendation: SteeringRecommendation;
  evaluatorCaseCandidate: EvaluatorCaseCandidate;
  evolutionProposal: EvolutionProposalDraft;
  sendState: {
    canSendToNapoleon: boolean;
    reason: string;
  };
  boundary: RecommendationBoundary;
}

const PROPOSAL_BOUNDARY: RecommendationBoundary = {
  proposalOnly: true,
  approvalCaptured: false,
  memoryWriteAllowed: false,
  agentDispatchAllowed: false,
  externalSendAllowed: false,
};

function riskForArchitecture(area: CapabilityArchitectureArea): EvolutionProposalDraft["risk_level"] {
  if (area === "napoleon_runtime" || area === "agent_registry" || area === "memory_review") return "high";
  if (area === "governance_ux" || area === "settings_privacy" || area === "bridge") return "medium";
  return "low";
}

export function draftChiefOfStaffSteering(
  ledger: CapabilityLedger,
  options: SteeringDraftOptions,
): ChiefOfStaffSteeringDraft {
  const answer = answerCapabilityQuestion("What capabilities should be implemented next?", ledger);
  const top = answer?.rows[0];
  const capabilityLabel = top?.label ?? "no_local_capability_gap";
  const architectureArea = top?.architectureArea ?? "observability";
  const confidence = top?.confidence ?? 0;
  const evidenceRefs = ledger
    .listRecent()
    .filter((signal) => signal.capabilityLabel === capabilityLabel)
    .flatMap((signal) => signal.evidenceRefs)
    .slice(0, 8);
  const caseId = `capability_gap_${capabilityLabel.replace(/[^a-z0-9_]+/gi, "_").toLowerCase()}`;

  const recommendation: SteeringRecommendation = {
    capabilityLabel,
    architectureArea,
    evidenceCount: top?.count ?? 0,
    confidence,
    suggestedNextStep: top?.suggestedNextStep ?? "needs_human_review",
    rationale:
      top?.scoreExplanation ??
      "No strong local capability recommendation exists yet; keep gathering metadata-only signals.",
  };
  const evaluatorCaseCandidate: EvaluatorCaseCandidate = {
    caseId,
    scenarioType: "capability_gap_regression",
    capabilityLabel,
    architectureArea,
    expectedBehavior:
      "Concierge should fail closed where authority is missing, show blocked effects, and keep the recommendation proposal-only.",
  };

  return {
    recommendation,
    evaluatorCaseCandidate,
    evolutionProposal: {
      proposal_id: `evo_${caseId}_${options.traceId}`,
      summary: `Improve ${capabilityLabel} in ${architectureArea} based on local capability signals.`,
      risk_level: riskForArchitecture(architectureArea),
      evidence: evidenceRefs,
      change: {
        capability: capabilityLabel,
        architecture_area: architectureArea,
        requested_action: recommendation.suggestedNextStep,
      },
      affected_profiles: ["adult_owner"],
      affected_channels: ["text"],
      evaluator_cases: [caseId],
      approval_required: "Napoleon Chief of Staff and owner review before implementation or rollout.",
      rollback_plan: "Keep the current Concierge behavior as last known good and disable the proposed capability path if evaluator or governance checks regress.",
    },
    sendState: {
      canSendToNapoleon: options.endpointConfigured,
      reason: options.endpointConfigured
        ? "A governed Napoleon endpoint is configured; sending still requires bridge permission."
        : "No governed Napoleon endpoint is configured, so this draft remains local.",
    },
    boundary: PROPOSAL_BOUNDARY,
  };
}
