import { getBridgeOperation, type BridgeOperationId } from "./bridgeOperations.js";
import type { BridgeContractEvidence } from "./napoleonBridge.js";
import type { LiveBridgeEvidenceState } from "./presentation.js";

export interface BridgeEvidenceReadinessState {
  captureState: LiveBridgeEvidenceState;
  comparisonState: LiveBridgeEvidenceState;
  lastEvidenceStatus?: BridgeContractEvidence["status"];
  lastOperationId?: BridgeOperationId;
  lastTargetPath?: string;
  lastFailureReason?: string;
  failureReason?: string;
}

const FORBIDDEN_EVIDENCE_KEYS = new Set([
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
  "token",
]);

export function buildBridgeEvidenceReadinessState(): BridgeEvidenceReadinessState {
  return {
    captureState: "not_run",
    comparisonState: "not_run",
  };
}

function containsForbiddenEvidenceKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;

  return Object.entries(value).some(([key, nested]) => {
    if (FORBIDDEN_EVIDENCE_KEYS.has(key)) return true;
    if (Array.isArray(nested)) return nested.some((item) => containsForbiddenEvidenceKey(item));
    return containsForbiddenEvidenceKey(nested);
  });
}

function compareBridgeEvidence(record: BridgeContractEvidence): string | null {
  if (containsForbiddenEvidenceKey(record)) {
    return "Evidence contains a raw or secret field and cannot be used for readiness.";
  }

  const operation = getBridgeOperation(record.operationId);
  if (record.targetPath !== operation.path) {
    return `Evidence target path ${record.targetPath} does not match ${operation.path}.`;
  }
  if (record.requestKind !== operation.requestKind) {
    return `Evidence request kind ${record.requestKind} does not match ${operation.requestKind}.`;
  }
  if (record.status === "success" && !record.provenanceVerified) {
    return "Successful bridge evidence must have verified provenance.";
  }
  return null;
}

export function updateBridgeEvidenceReadinessState(
  _current: BridgeEvidenceReadinessState,
  record: BridgeContractEvidence,
): BridgeEvidenceReadinessState {
  const failureReason = compareBridgeEvidence(record);

  return {
    captureState: "passed",
    comparisonState: failureReason ? "failed" : "passed",
    lastEvidenceStatus: record.status,
    lastOperationId: record.operationId,
    lastTargetPath: record.targetPath,
    lastFailureReason: record.reason,
    failureReason: failureReason ?? undefined,
  };
}
