import type { DelegationView, NapoleonResponseProofView } from "./presentation.js";
import { describeDelegation, describeNapoleonResponseProof } from "./presentation.js";
import type { NapoleonResponse } from "./types.js";

export interface NapoleonResponsePresentationState {
  delegation: DelegationView | null;
  proof: NapoleonResponseProofView | null;
  proofMetadata?: NapoleonResponseProofMetadata;
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

export interface NapoleonResponseProofComparison {
  status: "not_available" | "unchanged" | "changed" | "invalid_previous" | "invalid_current";
  summary: string;
  changes: NapoleonResponseProofChange[];
}

interface NapoleonResponseProofMetadata {
  handledBy: string;
  targetCapability: string;
  recommendation: string;
  selectedAgents: string[];
  selectedAgentReasons: string[];
  allowedEffects: string[];
  blockedEffects: string[];
}

const FORBIDDEN_RESPONSE_PROOF_KEYS = new Set([
  "authToken",
  "authorization",
  "bearerToken",
  "endpoint",
  "host",
  "message",
  "prompt",
  "rawPrompt",
  "requestBody",
  "responseBody",
  "responseText",
  "text",
  "token",
]);

const FORBIDDEN_RESPONSE_PROOF_KEY_NAMES = new Set(
  [...FORBIDDEN_RESPONSE_PROOF_KEYS].map((key) => key.toLocaleLowerCase()),
);

const FORBIDDEN_RESPONSE_PROOF_VALUE_PATTERNS = [
  /\bhttps?:\/\//i,
  /\bwss?:\/\//i,
  /\blocalhost\b/i,
  /\b127\.0\.0\.1\b/,
  /\b0\.0\.0\.0\b/,
  /\bbearer\b/i,
  /\bauthorization\b/i,
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

export function buildSuccessfulNapoleonResponsePresentation(
  response: NapoleonResponse,
): NapoleonResponsePresentationState {
  const selectedAgents = response.delegation?.selectedAgents ?? [];
  const agentNames = selectedAgents.map((agent) => agent.displayName);
  const targetCapability = response.targetAgent ?? "unavailable";
  const recommendation = response.recommendationProvenance?.summary ?? "unavailable";

  return {
    delegation: describeDelegation(response.delegation, response.targetAgent),
    proof: describeNapoleonResponseProof(response),
    proofMetadata: {
      handledBy: agentNames.join(", ") || targetCapability || "unavailable",
      targetCapability,
      recommendation,
      selectedAgents: agentNames,
      selectedAgentReasons: selectedAgents.map((agent) => `${agent.displayName}: ${agent.selectionReason}`),
      allowedEffects: response.delegation?.allowedEffects ?? ["prepare_advisory_response"],
      blockedEffects: response.delegation?.blockedEffects ?? response.governanceDecision.blocked_effects,
    },
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

  const metadata: NapoleonResponseProofMetadata = state.proofMetadata ?? {
    handledBy: optionalProofDetailValue(proof, "Capability or agents"),
    targetCapability: optionalProofDetailValue(proof, "Target capability"),
    recommendation: optionalProofDetailValue(proof, "Napoleon recommendation"),
    selectedAgents: splitList(proofDetailValue(proof, "Selected agents")),
    selectedAgentReasons: splitList(proofDetailValue(proof, "Why selected")),
    allowedEffects: splitList(proofDetailValue(proof, "Allowed effects")),
    blockedEffects: splitList(proofDetailValue(proof, "Blocked effects")),
  };

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
        attributionBoundary: "Returned bridge provenance only; not local authority.",
        governance: proofDetailValue(proof, "Governance"),
        profileMode: proofDetailValue(proof, "Profile mode"),
        decisionId: proofDetailValue(proof, "Decision"),
        traceId: proofDetailValue(proof, "Trace"),
        auditId: proofDetailValue(proof, "Audit"),
        targetCapability: metadata.targetCapability,
        recommendation: metadata.recommendation,
        selectedAgents: metadata.selectedAgents,
        selectedAgentReasons: metadata.selectedAgentReasons,
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
    if (FORBIDDEN_RESPONSE_PROOF_KEY_NAMES.has(key.toLocaleLowerCase())) return true;
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
      changes: [],
    };
  }

  const previousProof = parseNapoleonResponseProof(previousJson);
  if (!previousProof) {
    return {
      status: "invalid_previous",
      summary: "The previous Napoleon response proof is not valid sanitized proof JSON.",
      changes: [],
    };
  }

  const comparedFields: Array<{ label: string; path: string[] }> = [
    { label: "Proof status", path: ["responseProof", "status"] },
    { label: "Handled by", path: ["responseProof", "handledBy"] },
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
    return previous === current ? [] : [{ label, previous, current }];
  });

  const responseProof = nestedRecord(currentProof, "responseProof");
  const status = changes.length === 0 ? "unchanged" : "changed";
  const summary =
    status === "unchanged"
      ? "Napoleon response proof is unchanged from the previous export in this app session."
      : `Napoleon response proof changed in ${changes.length} sanitized field${changes.length === 1 ? "" : "s"}.`;

  return {
    status,
    summary: `${summary} Governance ${String(responseProof.governance ?? "unavailable")}; trace ${String(
      responseProof.traceId ?? "unavailable",
    )}.`,
    changes,
  };
}
