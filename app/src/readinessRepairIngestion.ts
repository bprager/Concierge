export interface ReadinessRepairChecklist {
  id: string;
  title: string;
  summary: string;
  handoffName: string;
  targetPath: string;
  requestKind: string;
  operationId: string;
  advertiseUsing: string[];
  blockingLivePromotion: boolean;
  implementationNextStep?: string;
  source: {
    generatedAt: string;
    requiredActionSource: string;
    runtimeValidationSource: string;
    promotionGate: string;
    descriptorState: string;
    descriptorChecksumState: string;
    descriptorSignatureState: string;
  };
}

export interface ReadinessRepairIngestionResult {
  status: "accepted" | "rejected";
  summary: string;
  checklist: ReadinessRepairChecklist[];
  rejectedProofCount: number;
  boundary: {
    proposalOnly: true;
    approvalCaptured: false;
    memoryWritePerformed: false;
    agentDispatchPerformed: false;
    externalSendPerformed: false;
    localApplicationPerformed: false;
  };
}

interface RepairActionRecord {
  id?: unknown;
  reason?: unknown;
  boundary?: unknown;
  handoffName?: unknown;
  targetPath?: unknown;
  requestKind?: unknown;
  operationId?: unknown;
  advertiseUsing?: unknown;
  blockingLivePromotion?: unknown;
  approvalCaptured?: unknown;
  memoryWritePerformed?: unknown;
  agentDispatchPerformed?: unknown;
  externalSendPerformed?: unknown;
  appliedLocally?: unknown;
}

interface GoalAuditBlockerRecord {
  nextAction?: unknown;
  napoleonRequiredAction?: unknown;
}

const FORBIDDEN_REPAIR_KEYS = new Set(
  [
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
  ].map((key) => key.toLocaleLowerCase()),
);

const FORBIDDEN_REPAIR_NORMALIZED_KEYS = new Set(
  [...FORBIDDEN_REPAIR_KEYS].map((key) => key.replace(/[_-]/g, "")),
);

const FORBIDDEN_REPAIR_VALUE_PATTERNS = [
  /\bhttps?:\/\//i,
  /\bwss?:\/\//i,
  /\blocalhost\b/i,
  /\b127\.0\.0\.1\b/,
  /\b0\.0\.0\.0\b/,
  /\bbearer\b/i,
  /\bauthorization\b/i,
  /\bsecret\b/i,
  /\bcredential\b/i,
];

const SIDE_EFFECT_KEYS = new Set([
  "approvalCaptured",
  "memoryWritePerformed",
  "agentDispatchPerformed",
  "externalSendPerformed",
  "localApplicationPerformed",
  "appliedLocally",
  "sideEffectsPerformed",
  "routingPerformed",
  "registryUpdatePerformed",
  "traceAppendPerformed",
]);

const LOCAL_ONLY_RUNTIME_SOURCES = new Set(["local_harness", "local_simulation", "unavailable"]);

const PROPOSAL_ONLY_BOUNDARY = {
  proposalOnly: true,
  approvalCaptured: false,
  memoryWritePerformed: false,
  agentDispatchPerformed: false,
  externalSendPerformed: false,
  localApplicationPerformed: false,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringField(value: unknown, fallback = "unavailable"): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stringListField(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "").map((item) => item.trim());
}

function generatedAtMillis(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function containsUnsafeRepairContent(value: unknown): boolean {
  if (typeof value === "string") {
    return FORBIDDEN_REPAIR_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  }
  if (Array.isArray(value)) return value.some((item) => containsUnsafeRepairContent(item));
  if (!isRecord(value)) return false;

  return Object.entries(value).some(([key, nested]) => {
    const lowerKey = key.toLocaleLowerCase();
    const normalizedKey = lowerKey.replace(/[_-]/g, "");
    if (FORBIDDEN_REPAIR_KEYS.has(lowerKey)) return true;
    if (FORBIDDEN_REPAIR_NORMALIZED_KEYS.has(normalizedKey)) return true;
    if (SIDE_EFFECT_KEYS.has(key) && nested === true) return true;
    return containsUnsafeRepairContent(nested);
  });
}

function hasValidTargetPath(value: string): boolean {
  return /^\/[A-Za-z0-9_{}./:-]+$/.test(value) && !value.includes("//") && !value.includes("..");
}

function isValidRepairAction(action: RepairActionRecord): boolean {
  return (
    typeof action.id === "string" &&
    typeof action.targetPath === "string" &&
    hasValidTargetPath(action.targetPath) &&
    typeof action.requestKind === "string" &&
    typeof action.operationId === "string"
  );
}

function parseEvidence(json: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!isRecord(parsed)) return null;
    if (parsed.kind !== "concierge_bridge_readiness_proof" && parsed.kind !== "concierge.goal-completion-audit.v1") {
      return null;
    }
    if (parsed.kind === "concierge_bridge_readiness_proof" && parsed.version !== 1) return null;
    if (containsUnsafeRepairContent(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function nestedRecord(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  return isRecord(value) ? value : {};
}

function proofClaimsLocalEvidenceAsRealRuntime(runtimeValidation: Record<string, unknown>): boolean {
  const source = stringField(runtimeValidation.source);
  const promotionGate = stringField(runtimeValidation.promotionGate);
  return (
    LOCAL_ONLY_RUNTIME_SOURCES.has(source) &&
    (promotionGate === "real_runtime_evidence_available" || promotionGate === "ready_for_human_review")
  );
}

function actionImplementationStep(
  action: RepairActionRecord,
  evaluator: Record<string, unknown>,
): string | undefined {
  const highestPriorityAction = nestedRecord(evaluator, "highestPriorityAction");
  const missingHandoffTarget = nestedRecord(evaluator, "missingHandoffTarget");
  const actionId = stringField(action.id);
  const matchesPrimaryAction =
    stringField(highestPriorityAction.id) === actionId || stringField(missingHandoffTarget.id) === actionId;
  const implementationNextStep = evaluator.implementationNextStep;
  return matchesPrimaryAction && typeof implementationNextStep === "string" ? implementationNextStep : undefined;
}

function checklistFromProof(proof: Record<string, unknown>): ReadinessRepairChecklist[] | null {
  const descriptor = nestedRecord(proof, "descriptor");
  const runtimeValidation = nestedRecord(proof, "runtimeValidation");
  const evaluator = nestedRecord(runtimeValidation, "evaluator");
  if (proofClaimsLocalEvidenceAsRealRuntime(runtimeValidation)) return null;

  const actions = Array.isArray(evaluator.napoleonRequiredActions) ? evaluator.napoleonRequiredActions : [];
  const generatedAt = stringField(proof.generatedAt);
  const source = {
    generatedAt,
    requiredActionSource: stringField(evaluator.requiredActionSource),
    runtimeValidationSource: stringField(runtimeValidation.source),
    promotionGate: stringField(runtimeValidation.promotionGate),
    descriptorState: stringField(descriptor.state),
    descriptorChecksumState: stringField(descriptor.checksumState),
    descriptorSignatureState: stringField(descriptor.signatureState),
  };

  const checklist = actions.flatMap((item): ReadinessRepairChecklist[] => {
    if (!isRecord(item)) return [];
    const action = item as RepairActionRecord;
    if (!isValidRepairAction(action)) return [];
    const handoffName = stringField(action.handoffName, stringField(action.operationId));
    const summary = stringField(action.reason, "Napoleon runtime repair is required.");
    return [
      {
        id: stringField(action.id),
        title: `Repair Napoleon handoff: ${handoffName}`,
        summary,
        handoffName,
        targetPath: stringField(action.targetPath),
        requestKind: stringField(action.requestKind),
        operationId: stringField(action.operationId),
        advertiseUsing: stringListField(action.advertiseUsing),
        blockingLivePromotion: action.blockingLivePromotion === true,
        ...(actionImplementationStep(action, evaluator)
          ? { implementationNextStep: actionImplementationStep(action, evaluator) }
          : {}),
        source,
      },
    ];
  });

  return checklist.length > 0 ? checklist : null;
}

function auditBoundaryIsLocalOnly(audit: Record<string, unknown>): boolean {
  const boundary = nestedRecord(audit, "boundary");
  return (
    boundary.localEvidenceOnly === true &&
    boundary.doesNotContactNapoleon === true &&
    boundary.doesNotApprove === true &&
    boundary.doesNotWriteMemory === true &&
    boundary.doesNotDispatchAgents === true &&
    boundary.doesNotSendExternally === true &&
    boundary.doesNotApplyEvolution === true
  );
}

function repairActionFalseFlagsAreExplicit(action: RepairActionRecord): boolean {
  return (
    action.approvalCaptured === false &&
    action.memoryWritePerformed === false &&
    action.agentDispatchPerformed === false &&
    action.externalSendPerformed === false &&
    action.appliedLocally === false
  );
}

function checklistFromGoalAudit(audit: Record<string, unknown>): ReadinessRepairChecklist[] | null {
  if (!auditBoundaryIsLocalOnly(audit)) return null;
  const blockers = Array.isArray(audit.blockers) ? audit.blockers : [];
  const generatedAt = stringField(audit.generatedAt);

  const checklist = blockers.flatMap((item): ReadinessRepairChecklist[] => {
    if (!isRecord(item)) return [];
    const blocker = item as GoalAuditBlockerRecord;
    if (item.external !== true || item.owner !== "napoleon_runtime") return [];
    if (!isRecord(blocker.napoleonRequiredAction)) return [];
    const action = blocker.napoleonRequiredAction as RepairActionRecord;
    if (!isValidRepairAction(action) || !repairActionFalseFlagsAreExplicit(action)) return [];
    const handoffName = stringField(action.handoffName, stringField(action.operationId));
    const summary = stringField(blocker.nextAction, stringField(action.reason, "Napoleon runtime repair is required."));
    return [
      {
        id: stringField(action.id),
        title: `Repair Napoleon handoff: ${handoffName}`,
        summary,
        handoffName,
        targetPath: stringField(action.targetPath),
        requestKind: stringField(action.requestKind),
        operationId: stringField(action.operationId),
        advertiseUsing: stringListField(action.advertiseUsing),
        blockingLivePromotion: action.blockingLivePromotion === true,
        implementationNextStep: summary,
        source: {
          generatedAt,
          requiredActionSource: "goal_completion_audit",
          runtimeValidationSource: "unavailable",
          promotionGate: "blocked_until_runtime_contract_actions_cleared",
          descriptorState: "unavailable",
          descriptorChecksumState: "unavailable",
          descriptorSignatureState: "unavailable",
        },
      },
    ];
  });

  return checklist.length > 0 ? checklist : null;
}

export function ingestReadinessRepairProofs(proofJsons: string[]): ReadinessRepairIngestionResult {
  const checklistById = new Map<string, ReadinessRepairChecklist>();
  let rejectedProofCount = 0;

  for (const proofJson of proofJsons) {
    const proof = parseEvidence(proofJson);
    const checklist =
      proof?.kind === "concierge_bridge_readiness_proof"
        ? checklistFromProof(proof)
        : proof?.kind === "concierge.goal-completion-audit.v1"
          ? checklistFromGoalAudit(proof)
          : null;
    if (!checklist) {
      rejectedProofCount += 1;
      continue;
    }

    for (const item of checklist) {
      const existing = checklistById.get(item.id);
      if (!existing || generatedAtMillis(item.source.generatedAt) >= generatedAtMillis(existing.source.generatedAt)) {
        checklistById.set(item.id, item);
      }
    }
  }

  const checklist = [...checklistById.values()].sort((left, right) => {
    if (left.blockingLivePromotion !== right.blockingLivePromotion) return left.blockingLivePromotion ? -1 : 1;
    return left.id.localeCompare(right.id);
  });

  return {
    status: checklist.length > 0 ? "accepted" : "rejected",
    summary:
      checklist.length > 0
        ? `Prepared ${checklist.length} proposal-only Napoleon repair checklist item${
            checklist.length === 1 ? "" : "s"
          }.`
        : "No safe readiness repair checklist items could be prepared.",
    checklist,
    rejectedProofCount,
    boundary: PROPOSAL_ONLY_BOUNDARY,
  };
}
