import type { DelegationView, NapoleonResponseProofView } from "./presentation.js";
import { describeDelegation, describeNapoleonResponseProof } from "./presentation.js";
import type { NapoleonResponse } from "./types.js";

export interface NapoleonResponsePresentationState {
  delegation: DelegationView | null;
  proof: NapoleonResponseProofView | null;
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
