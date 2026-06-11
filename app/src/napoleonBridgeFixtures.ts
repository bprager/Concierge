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
