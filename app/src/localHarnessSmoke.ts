import {
  buildBridgeEvidenceReadinessState,
  updateBridgeEvidenceReadinessState,
  type BridgeEvidenceReadinessState,
} from "./bridgeEvidenceReadiness.js";
import { discoverNapoleonDescriptor } from "./descriptorDiscovery.js";
import { sendToNapoleon, type BridgeContractEvidence } from "./napoleonBridge.js";
import {
  describeDelegation,
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
  descriptorConnection: DescriptorConnectionState;
  response: NapoleonResponse;
  delegationView: DelegationView;
  readiness: BridgeEvidenceReadinessState;
  liveBridgeReadiness: LiveBridgeReadinessView;
}

export async function runLocalHarnessTextSmoke(
  input: LocalHarnessTextSmokeInput,
): Promise<LocalHarnessTextSmokeResult> {
  const endpoint = input.endpoint.trim();
  const descriptor = await discoverNapoleonDescriptor({
    getEndpoint: () => endpoint,
    fetch: input.fetch,
  });
  let readiness = buildBridgeEvidenceReadinessState();
  const response = await sendToNapoleon(
    {
      traceId: input.traceId ?? "trace_local_harness_smoke",
      conversationId: input.conversationId ?? "conv_local_harness_smoke",
      turnId: input.turnId ?? "turn_local_harness_smoke",
      profile: input.profile,
      channel: "text",
      message: input.message,
    },
    {
      getEndpoint: () => endpoint,
      descriptorConnection: descriptor.input,
      fetch: input.fetch,
      captureEvidence: (record: BridgeContractEvidence) => {
        readiness = updateBridgeEvidenceReadinessState(readiness, record);
      },
    },
  );
  const delegationView = describeDelegation(response.delegation);
  const liveBridgeReadiness = describeLiveBridgeReadiness({
    descriptorConnection: descriptor.connection,
    evidenceCaptureState: readiness.captureState,
    evidenceComparisonState: readiness.comparisonState,
  });

  return {
    descriptorConnection: descriptor.connection,
    response,
    delegationView,
    readiness,
    liveBridgeReadiness,
  };
}
