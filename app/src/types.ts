import type {
  AuditEnvelope,
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
    governanceOutcome?: string;
    decisionId?: string;
    auditId?: string;
    profileMode?: NapoleonProfileMode;
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

export interface NapoleonResponse {
  text: string;
  profileMode: NapoleonProfileMode;
  governanceDecision: GovernanceDecision;
  traceEnvelope: TraceEnvelope;
  auditEnvelope: AuditEnvelope;
  requiresReview: boolean;
  targetAgent?: string;
  stance?: string;
}
