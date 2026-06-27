import type { GovernanceDecision, NapoleonProfileMode } from "./contractBridge.js";
import type { NapoleonResponse } from "./types.js";

type FixtureFetchResponse = {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
};

type FixtureFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<FixtureFetchResponse>;

export type NapoleonBridgeFixture =
  | {
      kind: "response";
      status: number;
      payload: Partial<NapoleonResponse> | Record<string, unknown>;
    }
  | {
      kind: "timeout";
    };

const blockedRuntimeEffects = [
  "runtime_write",
  "graph_write",
  "memory_write",
  "external_send",
  "service_control",
  "approval_capture",
  "remediation",
  "credential_access",
  "nats_discovery_publication",
  "scheduler_change",
  "command_execution",
  "task_dispatch",
  "agent_dispatch",
  "runtime_authority",
];

function fixtureResponse(input: {
  text: string;
  profileMode: NapoleonProfileMode;
  traceId: string;
  auditId: string;
  decisionId: string;
  outcome: GovernanceDecision["outcome"];
  approvalRequirement: GovernanceDecision["approval_requirement"];
  rationale: string;
  evidenceLink: string;
  targetAgent?: string;
  stance?: string;
}): NapoleonResponse & Record<string, unknown> {
  return {
    text: input.text,
    profileMode: input.profileMode,
    governanceDecision: {
      decision_id: input.decisionId,
      request_id: "cos_turn_fixture",
      outcome: input.outcome,
      authority_tier: "prepare_only",
      approval_requirement: input.approvalRequirement,
      rationale: input.rationale,
      blocked_effects: blockedRuntimeEffects,
      trace_id: input.traceId,
      audit_id: input.auditId,
    },
    traceEnvelope: {
      trace_id: input.traceId,
      parent_trace_id: "conv_fixture",
      actor_id: "napoleon.chief_of_staff",
      request_id: "cos_turn_fixture",
      decision_id: input.decisionId,
      timestamp: "2026-06-11T00:00:00.000Z",
    },
    auditEnvelope: {
      audit_id: input.auditId,
      trace_id: input.traceId,
      decision_id: input.decisionId,
      actor_id: "napoleon.chief_of_staff",
      authority_tier: "prepare_only",
      approval_requirement: input.approvalRequirement,
      evidence_links: [`trace:${input.traceId}`, input.evidenceLink],
    },
    requiresReview: input.outcome === "requires_review" || input.outcome === "no_go",
    targetAgent: input.targetAgent ?? "napoleon.chief_of_staff",
    stance: input.stance ?? "direct_strategic",
    memoryWritePerformed: false,
    approvalCaptured: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    appliedLocally: false,
  };
}

export const napoleonBridgeFixtures = {
  delegatedSuccess: {
    kind: "response",
    status: 200,
    payload: {
      text: "Napoleon recommends preparing the bridge rollout plan for review.",
      profileMode: "adult_owner",
      governanceDecision: {
        decision_id: "decision_fixture_delegate",
        request_id: "cos_turn_fixture",
        outcome: "requires_review",
        authority_tier: "prepare_only",
        approval_requirement: "explicit_owner_approval",
        rationale: "External sends and memory writes require governed Napoleon review.",
        blocked_effects: ["external_send", "memory_write", "agent_dispatch"],
        trace_id: "trace_fixture",
        audit_id: "audit_fixture_delegate",
      },
      traceEnvelope: {
        trace_id: "trace_fixture",
        parent_trace_id: "conv_fixture",
        actor_id: "napoleon.chief_of_staff",
        request_id: "cos_turn_fixture",
        decision_id: "decision_fixture_delegate",
        timestamp: "2026-06-11T00:00:00.000Z",
      },
      auditEnvelope: {
        audit_id: "audit_fixture_delegate",
        trace_id: "trace_fixture",
        decision_id: "decision_fixture_delegate",
        actor_id: "napoleon.chief_of_staff",
        authority_tier: "prepare_only",
        approval_requirement: "explicit_owner_approval",
        evidence_links: ["trace:trace_fixture", "fixture:delegated_success"],
      },
      delegation: {
        selectedAgents: [
          {
            agentId: "napoleon.passive_brain",
            displayName: "Passive Brain",
            selectionReason: "Prior rollout memory was relevant to the requested bridge plan.",
            contributionSummary: "Recovered the prior bridge rollout note.",
          },
        ],
        allowedEffects: ["prepare_advisory_response"],
        blockedEffects: ["external_send", "memory_write", "agent_dispatch"],
        governanceState: "requires_review",
        traceId: "trace_fixture",
        auditId: "audit_fixture_delegate",
      },
      recommendationProvenance: {
        summary: "preparing the bridge rollout plan for review",
        traceId: "trace_fixture",
        auditId: "audit_fixture_delegate",
      },
      stance: "direct_strategic",
    },
  },
  authFailure: {
    kind: "response",
    status: 401,
    payload: {
      error: "unauthorized",
    },
  },
  contractMismatch: {
    kind: "response",
    status: 200,
    payload: {
      text: "This fixture intentionally omits governanceDecision.",
    },
  },
  deniedAction: {
    kind: "response",
    status: 200,
    payload: fixtureResponse({
      text: "Napoleon blocked the requested effect before any runtime action.",
      profileMode: "adult_owner",
      traceId: "trace_fixture_denied_action",
      auditId: "audit_fixture_denied_action",
      decisionId: "decision_fixture_denied_action",
      outcome: "deny",
      approvalRequirement: "chief_of_staff_and_owner_review",
      rationale: "A blocked effect such as graph_write was requested.",
      evidenceLink: "fixture:denied_action",
    }),
  },
  memoryProposal: {
    kind: "response",
    status: 200,
    payload: {
      ...fixtureResponse({
        text: "Napoleon prepared a memory proposal for manual review only.",
        profileMode: "adult_owner",
        traceId: "trace_fixture_memory_proposal",
        auditId: "audit_fixture_memory_proposal",
        decisionId: "decision_fixture_memory_proposal",
        outcome: "requires_review",
        approvalRequirement: "explicit_owner_approval",
        rationale: "Memory proposal review is required before any memory write.",
        evidenceLink: "fixture:memory_proposal",
        targetAgent: "napoleon.memory_review",
      }),
      memoryProposalStatus: "manual_review_required",
      writeRequested: false,
      writeAuthorized: false,
    },
  },
  childProfile: {
    kind: "response",
    status: 200,
    payload: fixtureResponse({
      text: "Napoleon requires guardian appropriate review before continuing.",
      profileMode: "child_protected_user",
      traceId: "trace_fixture_child_profile",
      auditId: "audit_fixture_child_profile",
      decisionId: "decision_fixture_child_profile",
      outcome: "deny",
      approvalRequirement: "guardian_and_owner_review",
      rationale: "Child protected requests require manual guardian appropriate review.",
      evidenceLink: "fixture:child_profile",
    }),
  },
  evolutionRecommendation: {
    kind: "response",
    status: 200,
    payload: {
      ...fixtureResponse({
        text: "Napoleon prepared an evolution recommendation for manual review only.",
        profileMode: "adult_owner",
        traceId: "trace_fixture_evolution_recommendation",
        auditId: "audit_fixture_evolution_recommendation",
        decisionId: "decision_fixture_evolution_recommendation",
        outcome: "requires_review",
        approvalRequirement: "chief_of_staff_and_owner_review",
        rationale: "Evolution recommendations must stay proposal only until governed review completes.",
        evidenceLink: "fixture:evolution_recommendation",
        targetAgent: "napoleon.evolution_review",
      }),
      evolutionProposalStatus: "manual_review_required",
      registryUpdatePerformed: false,
    },
  },
  timeout: {
    kind: "timeout",
  },
} satisfies Record<string, NapoleonBridgeFixture>;

export function createNapoleonBridgeFixtureFetch(fixture: NapoleonBridgeFixture): FixtureFetch {
  return async () => {
    if (fixture.kind === "timeout") {
      const error = new Error("Fixture bridge timeout");
      error.name = "AbortError";
      throw error;
    }

    return {
      ok: fixture.status >= 200 && fixture.status < 300,
      status: fixture.status,
      json: async () => fixture.payload,
    };
  };
}
