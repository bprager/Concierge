import type { AuditEnvelope, GovernanceDecision, TraceEnvelope } from "./contractBridge.js";

const SAFE_PROOF_IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9_.:-]{0,95}$/i;
const UNSAFE_PROOF_IDENTIFIER_TEXT_PATTERN =
  /\b(?:https?:\/\/|bearer|authorization|token|secret|password|credential)\b/i;

export function isUnsafeProofIdentifier(value: string): boolean {
  const identifier = value.trim();
  return !SAFE_PROOF_IDENTIFIER_PATTERN.test(identifier) || UNSAFE_PROOF_IDENTIFIER_TEXT_PATTERN.test(identifier);
}

export function hasUnsafeReturnedProofIdentifier(
  decision: GovernanceDecision,
  traceEnvelope: TraceEnvelope,
  auditEnvelope: AuditEnvelope,
): boolean {
  return [
    decision.decision_id,
    decision.request_id,
    decision.trace_id,
    decision.audit_id,
    traceEnvelope.trace_id,
    traceEnvelope.parent_trace_id,
    traceEnvelope.request_id,
    traceEnvelope.decision_id,
    auditEnvelope.audit_id,
    auditEnvelope.trace_id,
    auditEnvelope.decision_id,
    ...auditEnvelope.evidence_links,
  ].some((identifier) => isUnsafeProofIdentifier(identifier));
}
