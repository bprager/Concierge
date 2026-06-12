export const LOCAL_BRIDGE_HARNESS_ENDPOINT = "http://127.0.0.1:8787";

export interface LocalHarnessEndpointPreset {
  endpoint: typeof LOCAL_BRIDGE_HARNESS_ENDPOINT;
  descriptorMode: "live";
  rehearsalMode: false;
  startsService: false;
  boundary: string;
}

export function buildLocalHarnessEndpointPreset(): LocalHarnessEndpointPreset {
  return {
    endpoint: LOCAL_BRIDGE_HARNESS_ENDPOINT,
    descriptorMode: "live",
    rehearsalMode: false,
    startsService: false,
    boundary:
      "This preset does not start or control the harness and does not grant authority. It only points Concierge at the local governed bridge endpoint.",
  };
}

export function isLocalHarnessEndpoint(endpoint: string): boolean {
  return endpoint.trim().replace(/\/+$/, "") === LOCAL_BRIDGE_HARNESS_ENDPOINT;
}
