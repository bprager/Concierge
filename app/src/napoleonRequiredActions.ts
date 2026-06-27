import type { NapoleonRequiredAction } from "./bridgeEvidenceReadiness.js";
import type { NapoleonProfileMode } from "./contractBridge.js";

export interface NapoleonRequiredActionPriority {
  id: string;
  reason: string;
  targetPath?: string;
  requestKind?: string;
  operationId?: string;
  blockingLivePromotion: true;
  sideEffectsPerformed: false;
  approvalCaptured: false;
  memoryWritePerformed: false;
  agentDispatchPerformed: false;
  externalSendPerformed: false;
  appliedLocally: false;
}

export interface MinimizedNapoleonRequiredActionAnswer {
  content: string;
  actionCount: number;
  status: string;
  runtimeValidationSource: string;
}

function priorityRank(action: NapoleonRequiredAction): number {
  if (action.handoffName === "evaluation_review" || action.operationId === "evaluation_review") return 10;
  if (action.handoffName === "text_turn" || action.operationId === "text_turn") return 20;
  if (action.handoffName === "chief_of_staff_request" || action.operationId === "chief_of_staff_request") return 30;
  if (action.handoffName === "governance_evaluation" || action.operationId === "governance_evaluation") return 40;
  if (action.handoffName === "evolution_proposal_status" || action.operationId === "evolution_proposal_status") return 50;
  if (action.reason === "real_runtime_promotion_blocker") return 60;
  return 90;
}

function priorityReason(action: NapoleonRequiredAction, actionCount: number): string {
  if (action.handoffName === "evaluation_review" || action.operationId === "evaluation_review") {
    return actionCount > 1
      ? "Fix this first because live promotion still cannot prove evaluator review against Napoleon until this handoff is advertised."
      : "Fix this because live promotion cannot prove evaluator review against Napoleon until this handoff is advertised.";
  }
  if (action.handoffName === "text_turn" || action.operationId === "text_turn") {
    return "Fix this first because Concierge cannot send a governed text request until Napoleon advertises the text-turn handoff.";
  }
  if (action.handoffName === "chief_of_staff_request" || action.operationId === "chief_of_staff_request") {
    return "Fix this because governed Chief-of-Staff request packets cannot be validated until Napoleon advertises this handoff.";
  }
  if (action.handoffName === "governance_evaluation" || action.operationId === "governance_evaluation") {
    return "Fix this because governed evaluation packets cannot be validated until Napoleon advertises this handoff.";
  }
  if (action.handoffName === "evolution_proposal_status" || action.operationId === "evolution_proposal_status") {
    return "Fix this because Concierge cannot refresh proposal status against live Napoleon until this read-only target is exposed and advertised.";
  }
  return "Fix this before promotion because Napoleon still owns this missing runtime handoff.";
}

export function prioritizeNapoleonRequiredAction(
  actions: readonly NapoleonRequiredAction[],
): NapoleonRequiredActionPriority | null {
  const ranked = [...actions].sort((left, right) => {
    const rankDelta = priorityRank(left) - priorityRank(right);
    if (rankDelta !== 0) return rankDelta;
    return left.id.localeCompare(right.id);
  });
  const action = ranked[0];
  if (!action) return null;
  return {
    id: action.id,
    reason: priorityReason(action, actions.length),
    ...(action.targetPath ? { targetPath: action.targetPath } : {}),
    ...(action.requestKind ? { requestKind: action.requestKind } : {}),
    ...(action.operationId ? { operationId: action.operationId } : {}),
    blockingLivePromotion: true,
    sideEffectsPerformed: false,
    approvalCaptured: false,
    memoryWritePerformed: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    appliedLocally: false,
  };
}

export function formatNapoleonRequiredActionPriority(
  priority: NapoleonRequiredActionPriority | null,
): string {
  if (!priority) return "Highest priority Napoleon fix: none.";
  const target = priority.targetPath ? ` Target: ${priority.targetPath}.` : "";
  const requestKind = priority.requestKind ? ` Request kind: ${priority.requestKind}.` : "";
  return `Highest priority Napoleon fix: ${priority.id}.${target}${requestKind} ${priority.reason}`;
}

export function formatMinimizedNapoleonRequiredActionAnswer(input: {
  actionCount: number;
  status: string;
  runtimeValidationSource: string;
  sourceLabel: string;
  profileMode: NapoleonProfileMode;
}): MinimizedNapoleonRequiredActionAnswer {
  return {
    content: [
      `Napoleon has ${input.actionCount} required action${input.actionCount === 1 ? "" : "s"} from ${input.sourceLabel}.`,
      "Child protected summary: a trusted adult/operator needs to fix a Napoleon runtime connection before this can be used live.",
      `Evaluator status: ${input.status}. Runtime validation source: ${input.runtimeValidationSource}.`,
      `Profile scope: ${input.profileMode}. This is minimized child-protected local review evidence only; Concierge did not contact Napoleon for this answer, and it is not Napoleon approval, not local approval, not implementation, not memory, not agent dispatch, and not external send authority.`,
    ].join("\n\n"),
    actionCount: input.actionCount,
    status: input.status,
    runtimeValidationSource: input.runtimeValidationSource,
  };
}
