import type { ChiefOfStaffCapabilityDiscoveryResult } from "./chiefOfStaffCapabilities.js";

export interface NapoleonMetadataAnswer {
  content: string;
  metadataReturned: boolean;
  agentCount: number;
  profileMetadataReturned: boolean;
  blockedEffectCount: number;
  responseSideEffectClaimCount: number;
}

export interface NapoleonCapabilityAnswer {
  content: string;
  capabilitiesReturned: boolean;
  capabilityCount: number;
  agentCount: number;
  blockedEffectCount: number;
  responseSideEffectClaimCount: number;
}

const DEFAULT_BLOCKED_EFFECTS = ["runtime_authority", "memory_write", "approval_capture", "agent_dispatch", "external_send"];

export function isNapoleonMetadataQuestion(content: string): boolean {
  const lower = content.toLocaleLowerCase();
  if (!lower.includes("napoleon")) return false;
  const asksAboutMetadata =
    /\bmetadata\b/.test(lower) ||
    /\bavailable agents?\b/.test(lower) ||
    /\bagents?\b.*\bavailable\b/.test(lower) ||
    /\bdiscovered agents?\b/.test(lower) ||
    /\bagents?\b.*\bdiscovered\b/.test(lower) ||
    /\bagent manifests?\b/.test(lower) ||
    /\bprofile metadata\b/.test(lower);
  const asksAboutLastTurn =
    /\bwho\b.*\b(handled|answered|responded|replied)\b/.test(lower) ||
    /\bwhich\b.*\bagents?\b.*\b(handled|answered|responded|replied)\b/.test(lower);
  return asksAboutMetadata && !asksAboutLastTurn;
}

export function isNapoleonCapabilityQuestion(content: string): boolean {
  const lower = content.toLocaleLowerCase();
  if (!lower.includes("napoleon")) return false;
  const asksAboutCapabilities =
    /\bwhat\b.*\bcan\b.*\bnapoleon\b.*\bdo\b/.test(lower) ||
    /\bwhat\b.*\bnapoleon\b.*\bcan\b.*\bdo\b/.test(lower) ||
    /\bnapoleon\b.*\bcapabil(?:ity|ities|ites|ties)\b/.test(lower) ||
    /\bcapabil(?:ity|ities|ites|ties)\b.*\bnapoleon\b/.test(lower) ||
    /\bavailable\b.*\bnapoleon\b.*\bcapabil/.test(lower) ||
    /\bnapoleon\b.*\bavailable\b.*\bcapabil/.test(lower);
  const asksAboutLastTurn =
    /\bwhat\b.*\b(did|does)\b.*\bnapoleon\b.*\b(do|did|handle|return|say)\b/.test(lower) ||
    /\bwho\b.*\b(handled|answered|responded|replied)\b/.test(lower);
  return asksAboutCapabilities && !asksAboutLastTurn;
}

function responseSideEffectClaimCount(metadata: ChiefOfStaffCapabilityDiscoveryResult): number {
  return [
    metadata.responseApprovalCaptured,
    metadata.responseMemoryWritePerformed,
    metadata.responseAgentDispatchPerformed,
    metadata.responseExternalSendPerformed,
  ].filter(Boolean).length;
}

export function formatNapoleonCapabilityAnswer(
  metadata: ChiefOfStaffCapabilityDiscoveryResult | null,
): NapoleonCapabilityAnswer {
  if (!metadata || metadata.state !== "ready") {
    return {
      content:
        "Napoleon capability metadata has not been discovered in this UI session.\n\nNext step: Discover the descriptor, then explicitly fetch advisory capabilities.\n\nBoundary: No capability, routing, agent, registry, memory, or approval authority is inferred locally.",
      capabilitiesReturned: false,
      capabilityCount: 0,
      agentCount: 0,
      blockedEffectCount: DEFAULT_BLOCKED_EFFECTS.length,
      responseSideEffectClaimCount: 0,
    };
  }

  const capabilities = metadata.capabilities.length
    ? metadata.capabilities
        .map((capability) =>
          `${capability.label} (${capability.id}), tier ${capability.authorityTier}, ${
            capability.proposalOnly ? "proposal-only" : "not proposal-only"
          }`,
        )
        .join(", ")
    : "not returned";
  const agents = metadata.agents.length
    ? metadata.agents.map((agent) => `${agent.displayName} (${agent.agentId})`).join(", ")
    : "not returned";
  const blockedEffects = Array.from(
    new Set([...DEFAULT_BLOCKED_EFFECTS, ...metadata.blockedEffects, ...metadata.agents.flatMap((agent) => agent.blockedEffects)]),
  );

  return {
    content: [
      "Napoleon capability discovery is available as local connection metadata.",
      "",
      `Capabilities: ${capabilities}`,
      `Agent manifests: ${agents}`,
      `Blocked effects: ${blockedEffects.join(", ")}`,
      "",
      "Boundary: local discovery only; no agent dispatch, routing, registry update, memory write, approval capture, external send, or local application.",
    ].join("\n"),
    capabilitiesReturned: true,
    capabilityCount: metadata.capabilities.length,
    agentCount: metadata.agents.length,
    blockedEffectCount: blockedEffects.length,
    responseSideEffectClaimCount: responseSideEffectClaimCount(metadata),
  };
}

export function formatNapoleonMetadataAnswer(
  metadata: ChiefOfStaffCapabilityDiscoveryResult | null,
): NapoleonMetadataAnswer {
  if (!metadata || metadata.state !== "ready") {
    return {
      content:
        "Napoleon metadata has not been discovered in this UI session.\n\nNext step: Discover the descriptor, then explicitly fetch advisory capabilities and metadata.\n\nBoundary: No agent, profile, registry, memory, or approval authority is inferred locally.",
      metadataReturned: false,
      agentCount: 0,
      profileMetadataReturned: false,
      blockedEffectCount: DEFAULT_BLOCKED_EFFECTS.length,
      responseSideEffectClaimCount: 0,
    };
  }

  const agents = metadata.agents.length
    ? metadata.agents.map((agent) => `${agent.displayName} (${agent.agentId})`).join(", ")
    : "not returned";
  const profile = metadata.profileMetadata
    ? `${metadata.profileMetadata.label} (${metadata.profileMetadata.profileId}), retention ${metadata.profileMetadata.retentionMode}`
    : "not returned";
  const blockedEffects = Array.from(
    new Set([...DEFAULT_BLOCKED_EFFECTS, ...metadata.blockedEffects, ...metadata.agents.flatMap((agent) => agent.blockedEffects)]),
  );
  if (metadata.profileMetadata) {
    for (const effect of metadata.profileMetadata.blockedEffects) blockedEffects.push(effect);
  }
  const uniqueBlockedEffects = Array.from(new Set(blockedEffects));

  return {
    content: [
      "Napoleon metadata discovery is available as local connection metadata.",
      "",
      `Agent manifests: ${agents}`,
      `Profile metadata: ${profile}`,
      `Blocked effects: ${uniqueBlockedEffects.join(", ")}`,
      "",
      "Boundary: metadata only; no agent dispatch, registry update, memory write, approval capture, external send, or local application.",
    ].join("\n"),
    metadataReturned: true,
    agentCount: metadata.agents.length,
    profileMetadataReturned: Boolean(metadata.profileMetadata),
    blockedEffectCount: uniqueBlockedEffects.length,
    responseSideEffectClaimCount: responseSideEffectClaimCount(metadata),
  };
}
