import type {
  AuditEnvelope,
  DescriptorFailClosedReason,
  GovernanceDecision,
  LocalProfile,
  NapoleonProfileMode,
  TraceEnvelope,
} from "./contractBridge.js";

export type ConciergeRole = "user" | "assistant";

export interface ConciergeMessage {
  role: ConciergeRole;
  content: string;
  metadata?: {
    source?: string;
    attributionBoundary?: string;
    targetCapability?: string;
    governanceOutcome?: string;
    decisionId?: string;
    auditId?: string;
    profileMode?: NapoleonProfileMode;
    descriptorFailureReason?: DescriptorFailClosedReason;
    blockedEffects?: string[];
  };
}

export interface NapoleonRequest {
  traceId: string;
  conversationId: string;
  turnId: string;
  profile: LocalProfile;
  channel: "text" | "voice" | "avatar";
  message: string;
}

export interface NapoleonDelegationAgent {
  agentId: string;
  displayName: string;
  selectionReason: string;
  contributionSummary?: string;
}

export interface NapoleonDelegation {
  selectedAgents: NapoleonDelegationAgent[];
  allowedEffects: string[];
  blockedEffects: string[];
  governanceState: string;
  traceId: string;
  auditId: string;
}

export interface NapoleonRecommendationProvenance {
  summary: string;
  traceId: string;
  auditId: string;
}

export interface NapoleonResponse {
  text: string;
  profileMode: NapoleonProfileMode;
  governanceDecision: GovernanceDecision;
  traceEnvelope: TraceEnvelope;
  auditEnvelope: AuditEnvelope;
  requiresReview: boolean;
  targetAgent?: string;
  delegation?: NapoleonDelegation;
  recommendationProvenance?: NapoleonRecommendationProvenance;
  stance?: string;
}
