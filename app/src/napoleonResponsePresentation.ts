import type { DelegationView, NapoleonResponseProofView } from "./presentation.js";
import { describeDelegation, describeNapoleonResponseProof } from "./presentation.js";
import type { NapoleonResponse } from "./types.js";

export interface NapoleonResponsePresentationState {
  delegation: DelegationView | null;
  proof: NapoleonResponseProofView | null;
}

export interface NapoleonResponseProofExportInput {
  generatedAt?: string;
  conversationId?: string;
}

function proofDetailValue(proof: NapoleonResponseProofView, label: string): string {
  return proof.details.find((detail) => detail.label === label)?.value ?? "unavailable";
}

function splitList(value: string): string[] {
  if (!value || value === "unavailable") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildSuccessfulNapoleonResponsePresentation(
  response: NapoleonResponse,
): NapoleonResponsePresentationState {
  return {
    delegation: describeDelegation(response.delegation),
    proof: describeNapoleonResponseProof(response),
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
          governance: "unavailable",
          decisionId: "unavailable",
          traceId: "unavailable",
          auditId: "unavailable",
          selectedAgents: [],
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
        governance: proofDetailValue(proof, "Governance"),
        decisionId: proofDetailValue(proof, "Decision"),
        traceId: proofDetailValue(proof, "Trace"),
        auditId: proofDetailValue(proof, "Audit"),
        selectedAgents: splitList(proofDetailValue(proof, "Capability or agents")).filter(
          (agent) => agent !== "No selected-agent provenance returned",
        ),
        allowedEffects: splitList(proofDetailValue(proof, "Allowed effects")),
        blockedEffects: splitList(proofDetailValue(proof, "Blocked effects")),
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
