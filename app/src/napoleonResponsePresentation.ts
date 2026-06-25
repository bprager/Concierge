import type { DelegationView, NapoleonResponseProofView } from "./presentation.js";
import { describeDelegation, describeNapoleonResponseProof } from "./presentation.js";
import type { NapoleonResponse } from "./types.js";

export interface NapoleonResponsePresentationState {
  delegation: DelegationView | null;
  proof: NapoleonResponseProofView | null;
  proofMetadata?: NapoleonResponseProofMetadata;
}

export interface NapoleonResponsePresentationOptions {
  capabilityLabelsById?: Record<string, string>;
}

export interface NapoleonResponseProofExportInput {
  generatedAt?: string;
  conversationId?: string;
}

export interface NapoleonResponseProofChange {
  label: string;
  previous: string;
  current: string;
}

export interface NapoleonResponseProofReviewSummary {
  handledBy: string;
  governance: string;
  trace: string;
  blockedEffects: string;
  boundary: string;
  proofAlignment: string;
}

export interface NapoleonResponseProofComparison {
  status: "not_available" | "unchanged" | "changed" | "invalid_previous" | "invalid_current";
  summary: string;
  reviewSummary?: NapoleonResponseProofReviewSummary;
  changes: NapoleonResponseProofChange[];
}

interface NapoleonResponseProofMetadata {
  handledBy: string;
  proofAlignment: string;
  targetCapability: string;
  recommendation: string;
  selectedAgents: string[];
  selectedAgentReasons: string[];
  selectedAgentContributions: string[];
  allowedEffects: string[];
  blockedEffects: string[];
}

const FORBIDDEN_RESPONSE_PROOF_KEYS = new Set([
  "authToken",
  "authorization",
  "bearerToken",
  "bearer_token",
  "endpoint",
  "host",
  "message",
  "prompt",
  "rawPrompt",
  "raw_prompt",
  "requestBody",
  "request_body",
  "responseBody",
  "response_body",
  "responseText",
  "response_text",
  "text",
  "token",
]);

const FORBIDDEN_RESPONSE_PROOF_KEY_NAMES = new Set(
  [...FORBIDDEN_RESPONSE_PROOF_KEYS].map((key) => key.toLocaleLowerCase()),
);
const FORBIDDEN_RESPONSE_PROOF_NORMALIZED_KEY_NAMES = new Set(
  [...FORBIDDEN_RESPONSE_PROOF_KEYS].map((key) => key.replace(/[_-]/g, "").toLocaleLowerCase()),
);

const FORBIDDEN_RESPONSE_PROOF_VALUE_PATTERNS = [
  /\bhttps?:\/\//i,
  /\bwss?:\/\//i,
  /\blocalhost\b/i,
  /\b127\.0\.0\.1\b/,
  /\b0\.0\.0\.0\b/,
  /\bbearer\b/i,
  /\bauthorization\b/i,
  /\btoken\b/i,
  /\bsecret\b/i,
];

function proofDetailValue(proof: NapoleonResponseProofView, label: string): string {
  return proof.details.find((detail) => detail.label === label)?.value ?? "unavailable";
}

function splitList(value: string): string[] {
  if (!value || value === "unavailable" || value === "not returned") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item && item !== "not returned" && item !== "No selected-agent provenance returned");
}

function optionalProofDetailValue(proof: NapoleonResponseProofView, label: string): string {
  const value = proofDetailValue(proof, label);
  return value === "not returned" || value === "No selected-agent provenance returned" ? "unavailable" : value;
}

function sanitizeResponseProofString(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "unavailable";
  if (FORBIDDEN_RESPONSE_PROOF_VALUE_PATTERNS.some((pattern) => pattern.test(trimmed))) return "redacted";
  return trimmed;
}

function sanitizeResponseProofList(values: string[]): string[] {
  return values.map((value) => sanitizeResponseProofString(value));
}

function sanitizeResponseProofEffectList(values: string[]): string[] {
  return sanitizeResponseProofList(values).map((value) => {
    if (value === "redacted" || value === "unavailable") return value;
    return value.toLocaleLowerCase().replace(/[\s-]+/g, "_");
  });
}

function sanitizeResponseProofMetadata(metadata: NapoleonResponseProofMetadata): NapoleonResponseProofMetadata {
  return {
    handledBy: sanitizeResponseProofString(metadata.handledBy),
    proofAlignment: sanitizeResponseProofString(metadata.proofAlignment),
    targetCapability: sanitizeResponseProofString(metadata.targetCapability),
    recommendation: sanitizeResponseProofString(metadata.recommendation),
    selectedAgents: sanitizeResponseProofList(metadata.selectedAgents),
    selectedAgentReasons: sanitizeResponseProofList(metadata.selectedAgentReasons),
    selectedAgentContributions: sanitizeResponseProofList(metadata.selectedAgentContributions),
    allowedEffects: sanitizeResponseProofEffectList(metadata.allowedEffects),
    blockedEffects: sanitizeResponseProofEffectList(metadata.blockedEffects),
  };
}

export function buildSuccessfulNapoleonResponsePresentation(
  response: NapoleonResponse,
  options: NapoleonResponsePresentationOptions = {},
): NapoleonResponsePresentationState {
  const selectedAgents = response.delegation?.selectedAgents ?? [];
  const agentNames = selectedAgents.map((agent) => agent.displayName);
  const targetCapability = response.targetAgent ?? "unavailable";
  const recommendation = response.recommendationProvenance?.summary ?? "unavailable";
  const targetCapabilityLabel = response.targetAgent ? options.capabilityLabelsById?.[response.targetAgent] : undefined;
  const proof = describeNapoleonResponseProof(response, { targetCapabilityLabel });

  const proofMetadata = sanitizeResponseProofMetadata({
    handledBy: agentNames.join(", ") || targetCapability || "unavailable",
    proofAlignment: proofDetailValue(proof, "Proof alignment"),
    targetCapability,
    recommendation,
    selectedAgents: agentNames,
    selectedAgentReasons: selectedAgents.map((agent) => `${agent.displayName}: ${agent.selectionReason}`),
    selectedAgentContributions: selectedAgents
      .filter((agent) => agent.contributionSummary?.trim())
      .map((agent) => `${agent.displayName}: ${agent.contributionSummary}`),
    allowedEffects: response.delegation?.allowedEffects ?? ["prepare_advisory_response"],
    blockedEffects: response.delegation?.blockedEffects ?? response.governanceDecision.blocked_effects,
  });

  return {
    delegation: describeDelegation(response.delegation, response.targetAgent, {
      blockedEffects: response.governanceDecision.blocked_effects,
      governanceState: response.governanceDecision.outcome,
      traceId: response.traceEnvelope.trace_id,
      auditId: response.auditEnvelope.audit_id,
      targetCapabilityLabel,
    }),
    proof,
    proofMetadata,
  };
}

export function clearNapoleonResponsePresentation(): NapoleonResponsePresentationState {
  return {
    delegation: null,
    proof: null,
  };
}

export function exportNapoleonResponseProofJson(
  state: NapoleonResponsePresentationState,
  input: NapoleonResponseProofExportInput = {},
): string {
  const proof = state.proof;
  if (!proof) {
    return JSON.stringify(
      {
        kind: "concierge_napoleon_response_proof",
        version: 1,
        generatedAt: input.generatedAt ?? new Date().toISOString(),
        conversationId: input.conversationId,
        caveat:
          "No successful Napoleon response proof is available. This export is local metadata only and is not Napoleon approval.",
        responseProof: {
          status: "not_available",
          heading: "No successful Napoleon proof",
          handledBy: "unavailable",
          proofAlignment: "unavailable",
          attributionBoundary: "No accepted Napoleon response provenance is available.",
          governance: "unavailable",
          profileMode: "unavailable",
          decisionId: "unavailable",
          traceId: "unavailable",
          auditId: "unavailable",
          targetCapability: "unavailable",
          recommendation: "unavailable",
          selectedAgents: [],
          selectedAgentReasons: [],
          selectedAgentContributions: [],
          allowedEffects: [],
          blockedEffects: [],
        },
        boundary: {
          approvalCaptured: false,
          memoryWritePerformed: false,
          agentDispatchPerformed: false,
          externalSendPerformed: false,
          localApplicationPerformed: false,
        },
      },
      null,
      2,
    );
  }

  const metadata: NapoleonResponseProofMetadata = sanitizeResponseProofMetadata(state.proofMetadata ?? {
    handledBy: optionalProofDetailValue(proof, "Handled by"),
    proofAlignment: optionalProofDetailValue(proof, "Proof alignment"),
    targetCapability: optionalProofDetailValue(proof, "Target capability"),
    recommendation: optionalProofDetailValue(proof, "Napoleon recommendation"),
    selectedAgents: splitList(proofDetailValue(proof, "Selected agents")),
    selectedAgentReasons: splitList(proofDetailValue(proof, "Why selected")),
    selectedAgentContributions: [],
    allowedEffects: splitList(proofDetailValue(proof, "Allowed effects")),
    blockedEffects: splitList(proofDetailValue(proof, "Blocked effects")),
  });

  return JSON.stringify(
    {
      kind: "concierge_napoleon_response_proof",
      version: 1,
      generatedAt: input.generatedAt ?? new Date().toISOString(),
      conversationId: input.conversationId,
      caveat:
        "Local returned-provenance proof only. It is not Napoleon approval and does not grant memory writes, approval capture, agent dispatch, or external sends.",
      responseProof: {
        status: proof.status,
        heading: proof.heading,
        handledBy: metadata.handledBy,
        proofAlignment: metadata.proofAlignment,
        attributionBoundary: "Returned bridge provenance only; not local authority.",
        governance: sanitizeResponseProofString(proofDetailValue(proof, "Governance")),
        profileMode: sanitizeResponseProofString(proofDetailValue(proof, "Profile mode")),
        decisionId: sanitizeResponseProofString(proofDetailValue(proof, "Decision")),
        traceId: sanitizeResponseProofString(proofDetailValue(proof, "Trace")),
        auditId: sanitizeResponseProofString(proofDetailValue(proof, "Audit")),
        targetCapability: metadata.targetCapability,
        recommendation: metadata.recommendation,
        selectedAgents: metadata.selectedAgents,
        selectedAgentReasons: metadata.selectedAgentReasons,
        selectedAgentContributions: metadata.selectedAgentContributions,
        allowedEffects: metadata.allowedEffects,
        blockedEffects: metadata.blockedEffects,
      },
      boundary: {
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        localApplicationPerformed: false,
      },
    },
    null,
    2,
  );
}

function containsForbiddenResponseProofContent(value: unknown): boolean {
  if (typeof value === "string") {
    return FORBIDDEN_RESPONSE_PROOF_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  }
  if (Array.isArray(value)) return value.some((item) => containsForbiddenResponseProofContent(item));
  if (!value || typeof value !== "object") return false;

  return Object.entries(value).some(([key, nested]) => {
    const normalizedKey = key.replace(/[_-]/g, "").toLocaleLowerCase();
    if (FORBIDDEN_RESPONSE_PROOF_KEY_NAMES.has(key.toLocaleLowerCase())) return true;
    if (FORBIDDEN_RESPONSE_PROOF_NORMALIZED_KEY_NAMES.has(normalizedKey)) return true;
    return containsForbiddenResponseProofContent(nested);
  });
}

function parseNapoleonResponseProof(json: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const proof = parsed as Record<string, unknown>;
    if (proof.kind !== "concierge_napoleon_response_proof") return null;
    if (containsForbiddenResponseProofContent(proof)) return null;
    return proof;
  } catch {
    return null;
  }
}

function nestedRecord(value: unknown, key: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const nested = (value as Record<string, unknown>)[key];
  if (!nested || typeof nested !== "object" || Array.isArray(nested)) return {};
  return nested as Record<string, unknown>;
}

function proofField(proof: Record<string, unknown>, path: string[]): string {
  let current: unknown = proof;
  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return "unavailable";
    current = (current as Record<string, unknown>)[key];
  }
  if (Array.isArray(current)) return current.map(String).sort().join(", ") || "none";
  if (current === undefined || current === null || current === "") return "unavailable";
  return String(current);
}

function proofComparisonValue(value: string): string {
  if (value === "redacted") return "redacted metadata";
  if (value === "unavailable") return "unavailable metadata";
  if (value === "none") return "not returned metadata";
  if (value.includes(", ")) {
    const parts = value.split(", ");
    const mapped = parts.map((part) => proofComparisonValue(part));
    if (mapped.some((part, index) => part !== parts[index])) return mapped.join(", ");
  }
  return value;
}

function buildNapoleonResponseProofReviewSummary(
  proof: Record<string, unknown>,
): NapoleonResponseProofReviewSummary {
  return {
    handledBy: proofComparisonValue(proofField(proof, ["responseProof", "handledBy"])),
    governance: proofComparisonValue(proofField(proof, ["responseProof", "governance"])),
    trace: proofComparisonValue(proofField(proof, ["responseProof", "traceId"])),
    blockedEffects: proofComparisonValue(proofField(proof, ["responseProof", "blockedEffects"])),
    boundary: proofComparisonValue(proofField(proof, ["responseProof", "attributionBoundary"])),
    proofAlignment: proofComparisonValue(proofField(proof, ["responseProof", "proofAlignment"])),
  };
}

export function compareNapoleonResponseProofs(
  previousJson: string | null,
  currentJson: string,
): NapoleonResponseProofComparison {
  const currentProof = parseNapoleonResponseProof(currentJson);
  if (!currentProof) {
    return {
      status: "invalid_current",
      summary: "The current Napoleon response proof is not valid sanitized proof JSON.",
      changes: [],
    };
  }
  if (!previousJson) {
    return {
      status: "not_available",
      summary: "No previous Napoleon response proof is available in this app session.",
      reviewSummary: buildNapoleonResponseProofReviewSummary(currentProof),
      changes: [],
    };
  }

  const previousProof = parseNapoleonResponseProof(previousJson);
  if (!previousProof) {
    return {
      status: "invalid_previous",
      summary: "The previous Napoleon response proof is not valid sanitized proof JSON.",
      reviewSummary: buildNapoleonResponseProofReviewSummary(currentProof),
      changes: [],
    };
  }

  const comparedFields: Array<{ label: string; path: string[] }> = [
    { label: "Proof status", path: ["responseProof", "status"] },
    { label: "Handled by", path: ["responseProof", "handledBy"] },
    { label: "Proof alignment", path: ["responseProof", "proofAlignment"] },
    { label: "Attribution boundary", path: ["responseProof", "attributionBoundary"] },
    { label: "Governance", path: ["responseProof", "governance"] },
    { label: "Profile mode", path: ["responseProof", "profileMode"] },
    { label: "Decision", path: ["responseProof", "decisionId"] },
    { label: "Trace", path: ["responseProof", "traceId"] },
    { label: "Audit", path: ["responseProof", "auditId"] },
    { label: "Target capability", path: ["responseProof", "targetCapability"] },
    { label: "Napoleon recommendation", path: ["responseProof", "recommendation"] },
    { label: "Selected agents", path: ["responseProof", "selectedAgents"] },
    { label: "Why selected", path: ["responseProof", "selectedAgentReasons"] },
    { label: "Allowed effects", path: ["responseProof", "allowedEffects"] },
    { label: "Blocked effects", path: ["responseProof", "blockedEffects"] },
  ];

  const changes = comparedFields.flatMap(({ label, path }) => {
    const previous = proofField(previousProof, path);
    const current = proofField(currentProof, path);
    return previous === current
      ? []
      : [{ label, previous: proofComparisonValue(previous), current: proofComparisonValue(current) }];
  });

  const responseProof = nestedRecord(currentProof, "responseProof");
  const status = changes.length === 0 ? "unchanged" : "changed";
  const summary =
    status === "unchanged"
      ? "Napoleon response proof is unchanged from the previous export in this app session."
      : `Napoleon response proof changed in ${changes.length} sanitized field${changes.length === 1 ? "" : "s"}.`;

  const governance = proofComparisonValue(String(responseProof.governance ?? "unavailable"));
  const trace = proofComparisonValue(String(responseProof.traceId ?? "unavailable"));

  return {
    status,
    summary: `${summary} Governance ${governance}; trace ${trace}.`,
    reviewSummary: buildNapoleonResponseProofReviewSummary(currentProof),
    changes,
  };
}
