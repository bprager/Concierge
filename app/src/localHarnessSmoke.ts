import {
  buildBridgeEvidenceReadinessState,
  updateBridgeEvidenceReadinessState,
  type BridgeEvidenceReadinessState,
} from "./bridgeEvidenceReadiness.js";
import { discoverNapoleonDescriptor } from "./descriptorDiscovery.js";
import { NapoleonBridgeError, sendToNapoleon, type BridgeContractEvidence } from "./napoleonBridge.js";
import {
  describeDelegation,
  describeBridgeFailureTranscriptMessage,
  describeLiveBridgeReadiness,
  type DelegationView,
  type LiveBridgeReadinessView,
} from "./presentation.js";
import type { DescriptorConnectionState, LocalProfile } from "./contractBridge.js";
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
  const liveBridgeReadiness = describeLiveBridgeReadiness({
    descriptorConnection: descriptor.connection,
    evidenceCaptureState: readiness.captureState,
    evidenceComparisonState: readiness.comparisonState,
  });

  return {
    status: "success",
    descriptorConnection: descriptor.connection,
    response,
    delegationView,
    readiness,
    liveBridgeReadiness,
  };
}
