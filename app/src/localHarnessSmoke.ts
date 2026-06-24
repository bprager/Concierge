import {
  buildBridgeEvidenceReadinessState,
  updateBridgeEvidenceReadinessState,
  type BridgeEvidenceReadinessState,
} from "./bridgeEvidenceReadiness.js";
import { discoverNapoleonDescriptor } from "./descriptorDiscovery.js";
import { NapoleonBridgeError, sendToNapoleon, type BridgeContractEvidence } from "./napoleonBridge.js";
import {
  buildSuccessfulNapoleonResponsePresentation,
  compareNapoleonResponseProofs,
  exportNapoleonResponseProofJson,
  type NapoleonResponseProofComparison,
} from "./napoleonResponsePresentation.js";
import {
  describeDelegation,
  describeBridgeFailureTranscriptMessage,
  describeLiveBridgeReadiness,
  describeNapoleonResponseProof,
  type DelegationView,
  type LiveBridgeReadinessView,
  type NapoleonResponseProofView,
} from "./presentation.js";
import { buildTextTurnContract, type DescriptorConnectionState, type LocalProfile } from "./contractBridge.js";
import {
  submitChiefOfStaffRequestPacket,
  submitGovernanceEvaluationPacket,
  type ChiefOfStaffRequestPacket,
  type ContractPacketSubmissionResult,
  type GovernanceEvaluationPacket,
} from "./contractPacketSubmission.js";
import type { NapoleonResponse } from "./types.js";

type SmokeFetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}>;

export interface LocalHarnessTextSmokeInput {
  endpoint: string;
  message: string;
  profile: LocalProfile;
  conversationId?: string;
  turnId?: string;
  traceId?: string;
  fetch?: SmokeFetch;
}

export interface LocalHarnessTextSmokeResult {
  status: "success";
  descriptorConnection: DescriptorConnectionState;
  response: NapoleonResponse;
  delegationView: DelegationView;
  proofView: NapoleonResponseProofView;
  proofExportJson: string;
  firstProofComparison: NapoleonResponseProofComparison;
  secondProofComparison: NapoleonResponseProofComparison;
  readiness: BridgeEvidenceReadinessState;
  liveBridgeReadiness: LiveBridgeReadinessView;
}

export interface LocalHarnessTextSmokeFailureResult {
  status: "fail_closed";
  descriptorConnection: DescriptorConnectionState;
  failureReason: string;
  failureMessage: string;
  readiness: BridgeEvidenceReadinessState;
  liveBridgeReadiness: LiveBridgeReadinessView;
}

export interface LocalHarnessContractPacketSmokeInput {
  endpoint: string;
  message: string;
  profile: LocalProfile;
  conversationId?: string;
  turnId?: string;
  traceId?: string;
  fetch?: SmokeFetch;
}

export interface LocalHarnessContractPacketSmokeResult {
  status: "success";
  descriptorConnection: DescriptorConnectionState;
  chiefOfStaffRequestPacket: ChiefOfStaffRequestPacket;
  governanceEvaluationPacket: GovernanceEvaluationPacket;
  chiefOfStaffRequestResult: ContractPacketSubmissionResult;
  governanceEvaluationResult: ContractPacketSubmissionResult;
}

export interface LocalHarnessContractPacketSmokeFailureResult {
  status: "fail_closed";
  descriptorConnection: DescriptorConnectionState;
  failureReason: string;
  failureMessage: string;
}

export async function runLocalHarnessTextSmoke(
  input: LocalHarnessTextSmokeInput,
): Promise<LocalHarnessTextSmokeResult | LocalHarnessTextSmokeFailureResult> {
  const endpoint = input.endpoint.trim();
  const descriptor = await discoverNapoleonDescriptor({
    getEndpoint: () => endpoint,
    fetch: input.fetch,
  });
  let readiness = buildBridgeEvidenceReadinessState();
  const request = {
    traceId: input.traceId ?? "trace_local_harness_smoke",
    conversationId: input.conversationId ?? "conv_local_harness_smoke",
    turnId: input.turnId ?? "turn_local_harness_smoke",
    profile: input.profile,
    channel: "text" as const,
    message: input.message,
  };
  const dependencies = {
    getEndpoint: () => endpoint,
    descriptorConnection: descriptor.input,
    fetch: input.fetch,
    captureEvidence: (record: BridgeContractEvidence) => {
      readiness = updateBridgeEvidenceReadinessState(readiness, record);
    },
  };
  let response: NapoleonResponse;
  try {
    response = await sendToNapoleon(request, dependencies);
  } catch (error) {
    if (!(error instanceof NapoleonBridgeError)) {
      throw error;
    }
    const liveBridgeReadiness = describeLiveBridgeReadiness({
      descriptorConnection: descriptor.connection,
      evidenceCaptureState: readiness.captureState,
      evidenceComparisonState: readiness.comparisonState,
      lastEvidenceStatus: readiness.lastEvidenceStatus,
      lastFailureReason: readiness.lastFailureReason,
      runtimeValidationSource: "local_harness",
    });
    return {
      status: "fail_closed",
      descriptorConnection: descriptor.connection,
      failureReason: error.reason,
      failureMessage: describeBridgeFailureTranscriptMessage(error),
      readiness,
      liveBridgeReadiness,
    };
  }
  const delegationView = describeDelegation(response.delegation);
  const proofView = describeNapoleonResponseProof(response);
  const presentation = buildSuccessfulNapoleonResponsePresentation(response);
  const proofExportJson = exportNapoleonResponseProofJson(presentation, {
    conversationId: request.conversationId,
  });
  const firstProofComparison = compareNapoleonResponseProofs(null, proofExportJson);
  const secondProofComparison = compareNapoleonResponseProofs(proofExportJson, proofExportJson);
  const liveBridgeReadiness = describeLiveBridgeReadiness({
    descriptorConnection: descriptor.connection,
    evidenceCaptureState: readiness.captureState,
    evidenceComparisonState: readiness.comparisonState,
    lastEvidenceStatus: readiness.lastEvidenceStatus,
    lastFailureReason: readiness.lastFailureReason,
    runtimeValidationSource: "local_harness",
  });

  return {
    status: "success",
    descriptorConnection: descriptor.connection,
    response,
    delegationView,
    proofView,
    proofExportJson,
    firstProofComparison,
    secondProofComparison,
    readiness,
    liveBridgeReadiness,
  };
}

export async function runLocalHarnessContractPacketSmoke(
  input: LocalHarnessContractPacketSmokeInput,
): Promise<LocalHarnessContractPacketSmokeResult | LocalHarnessContractPacketSmokeFailureResult> {
  const endpoint = input.endpoint.trim();
  const descriptor = await discoverNapoleonDescriptor({
    getEndpoint: () => endpoint,
    fetch: input.fetch,
  });
  const conversationId = input.conversationId ?? "conv_local_harness_packet_smoke";
  const turnId = input.turnId ?? "turn_local_harness_packet_smoke";
  const traceId = input.traceId ?? "trace_local_harness_packet_smoke";
  const contract = buildTextTurnContract({
    message: input.message,
    profile: input.profile,
    conversationId,
    turnId,
    traceId,
    timestamp: "2026-06-24T00:00:00.000Z",
  });
  const commonReadiness = {
    status: "ready",
    summary: "Local harness contract packet smoke is ready to submit through the governed bridge.",
    nextStepSummary: "Submit to Napoleon only as evidence-only governed proof.",
    blockedEffects: ["memory_write", "approval_capture", "external_send", "agent_dispatch"],
  };
  const chiefOfStaffRequestPacket: ChiefOfStaffRequestPacket = {
    schemaVersion: "concierge/napoleon-contract-packet-export/v1",
    packetType: "chief_of_staff_request_handoff",
    generatedBy: "concierge.text",
    conversationId,
    profileMode: contract.profileMode,
    bridgeTarget: {
      operationId: "chief_of_staff_request",
      path: "/chief-of-staff/requests",
      requestKind: "chief_of_staff_request_handoff",
      transport: "HTTP POST",
    },
    request: contract.chiefOfStaffRequest,
    traceEnvelope: contract.traceEnvelope,
    auditEnvelope: contract.auditEnvelope,
    handoffReadiness: commonReadiness,
    boundary: {
      localExportOnly: true,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      routingPerformed: false,
      registryUpdatePerformed: false,
      traceAppendPerformed: false,
      appliedLocally: false,
    },
  };
  const governanceEvaluationPacket: GovernanceEvaluationPacket = {
    schemaVersion: "concierge/napoleon-contract-packet-export/v1",
    packetType: "governance_evaluation_handoff",
    generatedBy: "concierge.text",
    conversationId,
    profileMode: contract.profileMode,
    bridgeTarget: {
      operationId: "governance_evaluation",
      path: "/governance/evaluate",
      requestKind: "governance_evaluation_handoff",
      transport: "HTTP POST",
    },
    request: contract.governanceRequest,
    localPreflightDecision: contract.governanceDecision,
    traceEnvelope: contract.traceEnvelope,
    auditEnvelope: contract.auditEnvelope,
    handoffReadiness: commonReadiness,
    boundary: {
      localExportOnly: true,
      governanceOverrideApplied: false,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      routingPerformed: false,
      registryUpdatePerformed: false,
      traceAppendPerformed: false,
      appliedLocally: false,
    },
  };
  const dependencies = {
    conversationId,
    profile: input.profile,
    rehearsalMode: false,
    descriptorConnection: descriptor.input,
    getEndpoint: () => endpoint,
    fetch: input.fetch,
  };

  try {
    const chiefOfStaffRequestResult = await submitChiefOfStaffRequestPacket(chiefOfStaffRequestPacket, dependencies);
    const governanceEvaluationResult = await submitGovernanceEvaluationPacket(governanceEvaluationPacket, dependencies);
    return {
      status: "success",
      descriptorConnection: descriptor.connection,
      chiefOfStaffRequestPacket,
      governanceEvaluationPacket,
      chiefOfStaffRequestResult,
      governanceEvaluationResult,
    };
  } catch (error) {
    if (!(error instanceof NapoleonBridgeError)) {
      throw error;
    }
    return {
      status: "fail_closed",
      descriptorConnection: descriptor.connection,
      failureReason: error.reason,
      failureMessage: describeBridgeFailureTranscriptMessage(error),
    };
  }
}
