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
  runtimeValidationSource?: "real_runtime" | "local_harness" | "local_simulation";
  generatedAt?: string;
}

export interface BridgeReadinessProofChange {
  label: string;
  previous: string;
  current: string;
}

export interface BridgeReadinessProofComparison {
  status: "not_available" | "unchanged" | "changed" | "invalid_previous" | "invalid_current";
  summary: string;
  changes: BridgeReadinessProofChange[];
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
      runtimeValidation: {
        source: input.runtimeValidationSource ?? "real_runtime",
        caveat:
          input.runtimeValidationSource === "local_harness"
            ? "Local harness validation is not real Napoleon runtime validation."
            : input.runtimeValidationSource === "local_simulation"
              ? "Local simulation is not real Napoleon runtime validation."
              : "Real Napoleon runtime validation source.",
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

function parseBridgeReadinessProof(json: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const proof = parsed as Record<string, unknown>;
    if (proof.kind !== "concierge_bridge_readiness_proof") return null;
    if (containsForbiddenEvidenceKey(proof)) return null;
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

export function compareBridgeReadinessProofs(
  previousJson: string | null,
  currentJson: string,
): BridgeReadinessProofComparison {
  const currentProof = parseBridgeReadinessProof(currentJson);
  if (!currentProof) {
    return {
      status: "invalid_current",
      summary: "The current bridge readiness proof is not valid JSON for comparison.",
      changes: [],
    };
  }
  if (!previousJson) {
    return {
      status: "not_available",
      summary: "No previous bridge readiness proof is available in this app session.",
      changes: [],
    };
  }

  const previousProof = parseBridgeReadinessProof(previousJson);
  if (!previousProof) {
    return {
      status: "invalid_previous",
      summary: "The previous bridge readiness proof is not valid JSON for comparison.",
      changes: [],
    };
  }

  const comparedFields: Array<{ label: string; path: string[] }> = [
    { label: "Descriptor state", path: ["descriptor", "state"] },
    { label: "Checksum state", path: ["descriptor", "checksumState"] },
    { label: "Signature state", path: ["descriptor", "signatureState"] },
    { label: "Can attempt live bridge", path: ["descriptor", "canAttemptLiveBridge"] },
    { label: "Service ID", path: ["descriptor", "serviceId"] },
    { label: "Evidence capture", path: ["evidence", "captureState"] },
    { label: "Evidence comparison", path: ["evidence", "comparisonState"] },
    { label: "Last evidence status", path: ["evidence", "lastEvidenceStatus"] },
    { label: "Last operation path", path: ["evidence", "lastTargetPath"] },
    { label: "Last failure reason", path: ["evidence", "lastFailureReason"] },
    { label: "Evidence blocked effects", path: ["evidence", "blockedEffects"] },
    { label: "Runtime validation source", path: ["runtimeValidation", "source"] },
  ];

  const changes = comparedFields.flatMap(({ label, path }) => {
    const previous = proofField(previousProof, path);
    const current = proofField(currentProof, path);
    return previous === current ? [] : [{ label, previous, current }];
  });

  const descriptor = nestedRecord(currentProof, "descriptor");
  const evidence = nestedRecord(currentProof, "evidence");
  const status = changes.length === 0 ? "unchanged" : "changed";
  const summary =
    status === "unchanged"
      ? "Bridge readiness proof is unchanged from the previous export in this app session."
      : `Bridge readiness proof changed in ${changes.length} sanitized field${changes.length === 1 ? "" : "s"}.`;

  return {
    status,
    summary: `${summary} Descriptor ${String(descriptor.state ?? "unavailable")}; evidence ${String(
      evidence.comparisonState ?? "unavailable",
    )}.`,
    changes,
  };
}
