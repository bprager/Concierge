import { getBridgeOperation, type BridgeOperationId } from "./bridgeOperations.js";
import type { DescriptorConnectionState } from "./contractBridge.js";
import type { BridgeContractEvidence } from "./napoleonBridge.js";
import type { LiveBridgeEvidenceState } from "./presentation.js";

export interface BridgeEvidenceReadinessState {
  captureState: LiveBridgeEvidenceState;
  comparisonState: LiveBridgeEvidenceState;
  lastEvidenceStatus?: BridgeContractEvidence["status"];
  lastOperationId?: BridgeOperationId;
  lastTargetPath?: string;
  lastFailureReason?: string;
  lastBlockedEffects?: string[];
  failureReason?: string;
}

export interface BridgeReadinessProofInput {
  descriptorConnection: DescriptorConnectionState;
  readiness: BridgeEvidenceReadinessState;
  generatedAt?: string;
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
    lastBlockedEffects: record.blockedEffects,
    failureReason: failureReason ?? undefined,
  };
}

export function exportBridgeReadinessProofJson(input: BridgeReadinessProofInput): string {
  const descriptorStatus = input.descriptorConnection.descriptorStatus;
  const blockedEffects = input.readiness.lastBlockedEffects ?? descriptorStatus?.blockedEffects ?? [];

  return JSON.stringify(
    {
      kind: "concierge_bridge_readiness_proof",
      version: 1,
      generatedAt: input.generatedAt ?? new Date().toISOString(),
      caveat:
        "Local readiness proof only. It is not Napoleon approval and does not grant memory writes, approval capture, agent dispatch, or external sends.",
      descriptor: {
        state: input.descriptorConnection.state,
        checksumState: input.descriptorConnection.checksumState,
        signatureState: input.descriptorConnection.signatureState,
        canAttemptLiveBridge: input.descriptorConnection.canAttemptLiveBridge,
        serviceId: descriptorStatus?.serviceId,
        runtimeAuthority: descriptorStatus?.runtimeAuthority ?? false,
        cachePolicy: descriptorStatus?.cachePolicy,
        blockedEffects: descriptorStatus?.blockedEffects ?? [],
        failClosedReason: input.descriptorConnection.failClosedReason,
      },
      evidence: {
        captureState: input.readiness.captureState,
        comparisonState: input.readiness.comparisonState,
        lastEvidenceStatus: input.readiness.lastEvidenceStatus,
        lastOperationId: input.readiness.lastOperationId,
        lastTargetPath: input.readiness.lastTargetPath,
        lastFailureReason: input.readiness.lastFailureReason,
        failureReason: input.readiness.failureReason,
        blockedEffects,
      },
      boundary: {
        approvalCaptured: false,
        memoryWritePerformed: false,
        agentDispatchPerformed: false,
        externalSendPerformed: false,
        localApplicationPerformed: false,
        proposalOnly: true,
      },
    },
    null,
    2,
  );
}
