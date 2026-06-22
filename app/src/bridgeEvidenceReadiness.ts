import { getBridgeOperation, type BridgeOperationId } from "./bridgeOperations.js";
import { descriptorSupportsGovernedHandoff, type DescriptorConnectionState } from "./contractBridge.js";
import type { BridgeContractEvidence } from "./napoleonBridge.js";
import type { LiveBridgeEvidenceState } from "./presentation.js";

export interface BridgeEvidenceReadinessState {
  captureState: LiveBridgeEvidenceState;
  comparisonState: LiveBridgeEvidenceState;
  lastEvidenceStatus?: BridgeContractEvidence["status"];
  lastOperationId?: BridgeOperationId;
  lastTransport?: BridgeContractEvidence["transport"];
  lastTargetPath?: string;
  lastFailureReason?: string;
  lastBlockedEffects?: string[];
  failureReason?: string;
}

export interface BridgeReadinessProofInput {
  descriptorConnection: DescriptorConnectionState;
  readiness: BridgeEvidenceReadinessState;
  runtimeValidationSource?: "real_runtime" | "local_harness" | "local_simulation";
  evaluatorValidation?: {
    status: "not_run" | "passed" | "failed";
    failureReason?: string;
    targetPath?: string;
    requestKind?: string;
    operationId?: string;
  };
  generatedAt?: string;
  advisoryCapabilities?: {
    state: "not_fetched" | "blocked" | "ready";
    serviceId?: string | null;
    capabilityCount: number;
    capabilityIds: string[];
    authorityTiers: string[];
    runtimeAuthority: false;
    blockedEffects: string[];
    proposalOnly: true;
    responseApprovalCaptured?: boolean;
    responseMemoryWritePerformed?: boolean;
    responseAgentDispatchPerformed?: boolean;
    responseExternalSendPerformed?: boolean;
  };
  napoleonMetadata?: {
    state: "not_fetched" | "blocked" | "ready";
    agentCount: number;
    agentIds: string[];
    profileId?: string | null;
    profileMetadataReturned: boolean;
    runtimeAuthority: false;
    blockedEffects: string[];
    registryUpdatePerformed: false;
    agentDispatchPerformed: false;
    memoryWritePerformed: false;
    approvalCaptured: false;
    externalSendPerformed: false;
  };
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
  "token",
]);

const FORBIDDEN_EVIDENCE_KEY_NAMES = new Set([...FORBIDDEN_EVIDENCE_KEYS].map((key) => key.toLocaleLowerCase()));
const FORBIDDEN_EVIDENCE_NORMALIZED_KEY_NAMES = new Set(
  [...FORBIDDEN_EVIDENCE_KEYS].map((key) => key.replace(/[_-]/g, "").toLocaleLowerCase()),
);

const FORBIDDEN_EVIDENCE_VALUE_PATTERNS = [
  /\bhttps?:\/\//i,
  /\bwss?:\/\//i,
  /\blocalhost\b/i,
  /\b127\.0\.0\.1\b/,
  /\b0\.0\.0\.0\b/,
  /\bbearer\b/i,
  /\bauthorization\b/i,
];

function isAcceptedAdvisoryHarnessAlias(record: BridgeContractEvidence): boolean {
  return (
    record.operationId === "text_turn" &&
    record.requestKind === "text_turn" &&
    record.transport === "http_post" &&
    record.targetPath === "/cos/text-turn"
  );
}

function promotionGateForProof(input: BridgeReadinessProofInput): string {
  const source = input.runtimeValidationSource;
  if (source === undefined) {
    return "blocked_until_real_runtime_evidence_passes";
  }
  if (source === "local_harness" || source === "local_simulation") {
    return "blocked_until_real_runtime_evidence_passes";
  }
  if (!descriptorSupportsGovernedHandoff(input.descriptorConnection, "text_turn")) {
    return "blocked_until_text_turn_route_advertised";
  }
  if (input.readiness.captureState !== "passed" || input.readiness.comparisonState !== "passed") {
    return "blocked_until_evidence_capture_and_comparison_pass";
  }
  const evaluatorStatus = input.evaluatorValidation?.status ?? "not_run";
  if (evaluatorStatus === "failed" || evaluatorStatus === "not_run") {
    return "blocked_until_evaluator_http_passes";
  }
  return "real_runtime_evidence_available";
}

function runtimeValidationCaveat(input: BridgeReadinessProofInput): string {
  if (input.runtimeValidationSource === "local_harness") {
    return "Local harness validation is not real Napoleon runtime validation.";
  }
  if (input.runtimeValidationSource === "local_simulation") {
    return "Local simulation is not real Napoleon runtime validation.";
  }
  if (input.runtimeValidationSource === "real_runtime") {
    return descriptorSupportsGovernedHandoff(input.descriptorConnection, "text_turn")
      ? "Real Napoleon runtime validation source."
      : "Real Napoleon runtime validation source, but the descriptor has not advertised text_turn.";
  }
  return "Real Napoleon runtime validation has not been proven.";
}

export function buildBridgeEvidenceReadinessState(): BridgeEvidenceReadinessState {
  return {
    captureState: "not_run",
    comparisonState: "not_run",
  };
}

function containsForbiddenEvidenceContent(value: unknown): boolean {
  if (typeof value === "string") {
    return FORBIDDEN_EVIDENCE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  }
  if (Array.isArray(value)) return value.some((item) => containsForbiddenEvidenceContent(item));
  if (!value || typeof value !== "object") return false;

  return Object.entries(value).some(([key, nested]) => {
    const normalizedKey = key.replace(/[_-]/g, "").toLocaleLowerCase();
    if (FORBIDDEN_EVIDENCE_KEY_NAMES.has(key.toLocaleLowerCase())) return true;
    if (FORBIDDEN_EVIDENCE_NORMALIZED_KEY_NAMES.has(normalizedKey)) return true;
    return containsForbiddenEvidenceContent(nested);
  });
}

function sanitizeReadinessProofString(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (FORBIDDEN_EVIDENCE_VALUE_PATTERNS.some((pattern) => pattern.test(trimmed))) return "redacted";
  return trimmed;
}

function sanitizeReadinessProofList(values: string[]): string[] {
  return values.map((value) => sanitizeReadinessProofString(value) ?? "unavailable");
}

function compareBridgeEvidence(record: BridgeContractEvidence): string | null {
  if (containsForbiddenEvidenceContent(record)) {
    return "Evidence contains a raw or secret field and cannot be used for readiness.";
  }

  const operation = getBridgeOperation(record.operationId);
  const advisoryHarnessAlias = isAcceptedAdvisoryHarnessAlias(record);
  if (record.targetPath !== operation.path && !advisoryHarnessAlias) {
    return `Evidence target path ${record.targetPath} does not match ${operation.path}.`;
  }
  if (record.requestKind !== operation.requestKind) {
    return `Evidence request kind ${record.requestKind} does not match ${operation.requestKind}.`;
  }
  if (record.transport !== operation.transport) {
    return `Evidence transport ${record.transport} does not match ${operation.transport}.`;
  }
  if (record.status === "success" && !record.provenanceVerified) {
    return "Successful bridge evidence must have verified provenance.";
  }
  if (
    record.status === "success" &&
    advisoryHarnessAlias &&
    (record.traceEnvelopeObserved !== true ||
      record.traceEnvelopeMatched !== true ||
      record.traceTargetPath !== "/cos/trace/{trace_id}")
  ) {
    return "Advisory harness evidence must include a matching observed trace envelope.";
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
    lastTransport: record.transport,
    lastTargetPath: record.targetPath,
    lastFailureReason: record.reason,
    lastBlockedEffects: record.blockedEffects,
    failureReason: failureReason ?? undefined,
  };
}

export function exportBridgeReadinessProofJson(input: BridgeReadinessProofInput): string {
  const descriptorStatus = input.descriptorConnection.descriptorStatus;
  const blockedEffects = sanitizeReadinessProofList(input.readiness.lastBlockedEffects ?? descriptorStatus?.blockedEffects ?? []);
  const descriptorBlockedEffects = sanitizeReadinessProofList(descriptorStatus?.blockedEffects ?? []);

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
        supportedHandoffs: sanitizeReadinessProofList(descriptorStatus?.supportedHandoffs ?? []),
        blockedEffects: descriptorBlockedEffects,
        failClosedReason: input.descriptorConnection.failClosedReason,
      },
      evidence: {
        captureState: input.readiness.captureState,
        comparisonState: input.readiness.comparisonState,
        lastEvidenceStatus: input.readiness.lastEvidenceStatus,
        lastOperationId: input.readiness.lastOperationId,
        lastTransport: input.readiness.lastTransport,
        lastTargetPath: sanitizeReadinessProofString(input.readiness.lastTargetPath),
        lastFailureReason: sanitizeReadinessProofString(input.readiness.lastFailureReason),
        failureReason: sanitizeReadinessProofString(input.readiness.failureReason),
        blockedEffects,
      },
      advisoryCapabilities: {
        state: input.advisoryCapabilities?.state ?? "not_fetched",
        serviceId: sanitizeReadinessProofString(input.advisoryCapabilities?.serviceId ?? undefined),
        capabilityCount: input.advisoryCapabilities?.capabilityCount ?? 0,
        capabilityIds: sanitizeReadinessProofList(input.advisoryCapabilities?.capabilityIds ?? []),
        authorityTiers: sanitizeReadinessProofList(input.advisoryCapabilities?.authorityTiers ?? []),
        runtimeAuthority: false,
        blockedEffects: sanitizeReadinessProofList(input.advisoryCapabilities?.blockedEffects ?? []),
        proposalOnly: true,
        responseApprovalCaptured: input.advisoryCapabilities?.responseApprovalCaptured === true,
        responseMemoryWritePerformed: input.advisoryCapabilities?.responseMemoryWritePerformed === true,
        responseAgentDispatchPerformed: input.advisoryCapabilities?.responseAgentDispatchPerformed === true,
        responseExternalSendPerformed: input.advisoryCapabilities?.responseExternalSendPerformed === true,
      },
      napoleonMetadata: {
        state: input.napoleonMetadata?.state ?? "not_fetched",
        agentCount: input.napoleonMetadata?.agentCount ?? 0,
        agentIds: sanitizeReadinessProofList(input.napoleonMetadata?.agentIds ?? []),
        profileId: sanitizeReadinessProofString(input.napoleonMetadata?.profileId ?? undefined),
        profileMetadataReturned: input.napoleonMetadata?.profileMetadataReturned === true,
        runtimeAuthority: false,
        blockedEffects: sanitizeReadinessProofList(input.napoleonMetadata?.blockedEffects ?? []),
        registryUpdatePerformed: false,
        agentDispatchPerformed: false,
        memoryWritePerformed: false,
        approvalCaptured: false,
        externalSendPerformed: false,
      },
      runtimeValidation: {
        source: input.runtimeValidationSource ?? "unavailable",
        promotionGate: promotionGateForProof(input),
        caveat: runtimeValidationCaveat(input),
        evaluator: {
          status: input.evaluatorValidation?.status ?? "not_run",
          failureReason: sanitizeReadinessProofString(input.evaluatorValidation?.failureReason) ?? "none",
          targetPath: sanitizeReadinessProofString(input.evaluatorValidation?.targetPath) ?? "unavailable",
          requestKind: sanitizeReadinessProofString(input.evaluatorValidation?.requestKind) ?? "unavailable",
          operationId: sanitizeReadinessProofString(input.evaluatorValidation?.operationId) ?? "unavailable",
          connectionValueStored: false,
          credentialValueStored: false,
          requestPayloadStored: false,
          responsePayloadStored: false,
          approvalCaptured: false,
          memoryWritePerformed: false,
          agentDispatchPerformed: false,
          externalSendPerformed: false,
        },
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
    if (containsForbiddenEvidenceContent(proof)) return null;
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
    { label: "Supported handoffs", path: ["descriptor", "supportedHandoffs"] },
    { label: "Evidence capture", path: ["evidence", "captureState"] },
    { label: "Evidence comparison", path: ["evidence", "comparisonState"] },
    { label: "Last evidence status", path: ["evidence", "lastEvidenceStatus"] },
    { label: "Last transport", path: ["evidence", "lastTransport"] },
    { label: "Last operation path", path: ["evidence", "lastTargetPath"] },
    { label: "Last failure reason", path: ["evidence", "lastFailureReason"] },
    { label: "Evidence blocked effects", path: ["evidence", "blockedEffects"] },
    { label: "Napoleon metadata state", path: ["napoleonMetadata", "state"] },
    { label: "Napoleon metadata agent IDs", path: ["napoleonMetadata", "agentIds"] },
    { label: "Napoleon metadata profile ID", path: ["napoleonMetadata", "profileId"] },
    { label: "Napoleon metadata blocked effects", path: ["napoleonMetadata", "blockedEffects"] },
    { label: "Runtime validation source", path: ["runtimeValidation", "source"] },
    { label: "Promotion gate", path: ["runtimeValidation", "promotionGate"] },
    { label: "Evaluator HTTP status", path: ["runtimeValidation", "evaluator", "status"] },
    { label: "Evaluator HTTP failure reason", path: ["runtimeValidation", "evaluator", "failureReason"] },
    { label: "Evaluator HTTP target path", path: ["runtimeValidation", "evaluator", "targetPath"] },
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
