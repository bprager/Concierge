import type { BridgeReadinessProofInput, NapoleonRequiredAction } from "./bridgeEvidenceReadiness.js";

export type EvaluatorValidationStatus = "not_run" | "passed" | "failed";
export type RuntimeValidationSource = "real_runtime" | "local_harness" | "local_simulation";

export interface EvaluatorValidationImport {
  status: "accepted" | "rejected" | "stale";
  summary: string;
  validation: NonNullable<BridgeReadinessProofInput["evaluatorValidation"]>;
  runtimeValidationSource?: RuntimeValidationSource;
}

export interface EvaluatorValidationImportOptions {
  expectedTargetPath?: string;
}

const DEFAULT_TARGET_PATH = "/chief-of-staff/reviews/evaluation";

const FORBIDDEN_ARTIFACT_KEY_NAMES = new Set([
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
].map((key) => key.toLocaleLowerCase()));

const FORBIDDEN_ARTIFACT_NORMALIZED_KEY_NAMES = new Set(
  [...FORBIDDEN_ARTIFACT_KEY_NAMES].map((key) => key.replace(/[_-]/g, "")),
);

const FORBIDDEN_ARTIFACT_VALUE_PATTERNS = [
  /\bhttps?:\/\//i,
  /\bwss?:\/\//i,
  /\blocalhost\b/i,
  /\b127\.0\.0\.1\b/,
  /\b0\.0\.0\.0\b/,
  /\bbearer\b/i,
  /\bauthorization\b/i,
];

const RETENTION_FLAGS = [
  "endpointHostRetained",
  "tokenRetained",
  "requestBodyRetained",
  "responseBodyRetained",
] as const;

const SIDE_EFFECT_FLAGS = [
  "approvalCaptured",
  "memoryWritePerformed",
  "agentDispatchPerformed",
  "externalSendPerformed",
] as const;

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function cleanStatus(value: unknown): EvaluatorValidationStatus | null {
  if (value === "not_run" || value === "passed" || value === "failed") return value;
  return null;
}

function cleanRuntimeSource(value: unknown): RuntimeValidationSource | undefined {
  if (value === "real_runtime" || value === "local_harness" || value === "local_simulation") return value;
  return undefined;
}

function cleanOptionalBoolean(value: unknown): boolean | null | undefined {
  if (value === true || value === false) return value;
  if (value === null) return null;
  return undefined;
}

function containsForbiddenArtifactContent(value: unknown): boolean {
  if (typeof value === "string") {
    return FORBIDDEN_ARTIFACT_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  }
  if (Array.isArray(value)) return value.some((item) => containsForbiddenArtifactContent(item));
  const record = objectRecord(value);
  if (!record) return false;

  return Object.entries(record).some(([key, nested]) => {
    const keyName = key.toLocaleLowerCase();
    const normalizedKeyName = keyName.replace(/[_-]/g, "");
    if (FORBIDDEN_ARTIFACT_KEY_NAMES.has(keyName)) return true;
    if (FORBIDDEN_ARTIFACT_NORMALIZED_KEY_NAMES.has(normalizedKeyName)) return true;
    return containsForbiddenArtifactContent(nested);
  });
}

function rejected(reason: string): EvaluatorValidationImport {
  return {
    status: "rejected",
    summary: reason,
    validation: {
      status: "failed",
      failureReason: reason,
      targetPath: "unavailable",
      requestKind: "unavailable",
      operationId: "unavailable",
    },
  };
}

function retainedFlagReason(evaluator: Record<string, unknown>): string | null {
  const retainedFlags = RETENTION_FLAGS.filter((flag) => evaluator[flag] === true);
  if (retainedFlags.length) {
    return `Evaluator artifact retained endpoint, token, request, or response data (${retainedFlags.join(", ")}).`;
  }
  const sideEffectFlags = SIDE_EFFECT_FLAGS.filter((flag) => evaluator[flag] === true);
  if (sideEffectFlags.length) {
    return `Evaluator artifact claims forbidden side effects (${sideEffectFlags.join(", ")}).`;
  }
  return null;
}

function cleanStringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const cleaned = value.map((item) => cleanString(item)).filter((item): item is string => item !== undefined);
  return cleaned.length === value.length ? cleaned : null;
}

function sanitizeNapoleonRequiredActions(value: unknown): NapoleonRequiredAction[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const actions: NapoleonRequiredAction[] = [];
  for (const item of value) {
    const action = objectRecord(item);
    if (!action) return null;
    const id = cleanString(action.id);
    const owner = cleanString(action.owner);
    if (!id || !owner) return null;
    const sideEffectFlags = [
      "sideEffectsPerformed",
      "approvalCaptured",
      "memoryWritePerformed",
      "agentDispatchPerformed",
      "externalSendPerformed",
      "appliedLocally",
    ] as const;
    if (sideEffectFlags.some((flag) => action[flag] === true)) return null;
    const advertiseUsing = cleanStringList(action.advertiseUsing);
    if (action.advertiseUsing !== undefined && advertiseUsing === null) return null;
    actions.push({
      id,
      owner,
      ...(cleanString(action.reason) ? { reason: cleanString(action.reason) } : {}),
      ...(cleanString(action.handoffName) ? { handoffName: cleanString(action.handoffName) } : {}),
      ...(cleanString(action.targetPath) ? { targetPath: cleanString(action.targetPath) } : {}),
      ...(cleanString(action.requestKind) ? { requestKind: cleanString(action.requestKind) } : {}),
      ...(cleanString(action.operationId) ? { operationId: cleanString(action.operationId) } : {}),
      ...(advertiseUsing ? { advertiseUsing } : {}),
      ...(cleanString(action.requiredAction) ? { requiredAction: cleanString(action.requiredAction) } : {}),
      sideEffectsPerformed: false,
      approvalCaptured: false,
      memoryWritePerformed: false,
      agentDispatchPerformed: false,
      externalSendPerformed: false,
      appliedLocally: false,
    });
  }
  return actions;
}

export function parseEvaluatorValidationArtifact(
  artifactJson: string,
  options: EvaluatorValidationImportOptions = {},
): EvaluatorValidationImport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(artifactJson);
  } catch {
    return rejected("Evaluator validation artifact is not valid JSON.");
  }

  if (containsForbiddenArtifactContent(parsed)) {
    return rejected("Evaluator validation artifact contains raw endpoint, token, prompt, request, or response data.");
  }

  const root = objectRecord(parsed);
  if (!root) return rejected("Evaluator validation artifact must be a JSON object.");

  const runtime = objectRecord(root.runtimeValidation);
  const evaluator = objectRecord(root.httpEvaluator);
  if (!evaluator) {
    return rejected("Evaluator validation artifact is missing httpEvaluator metadata.");
  }

  const retainedReason = retainedFlagReason(evaluator);
  if (retainedReason) return rejected(retainedReason);

  const status = cleanStatus(evaluator.status);
  if (!status) return rejected("Evaluator validation artifact has an unsupported status.");

  const targetPath = cleanString(evaluator.targetPath);
  const requestKind = cleanString(evaluator.targetRequestKind) ?? cleanString(evaluator.requestKind);
  const operationId = cleanString(evaluator.targetOperationId) ?? cleanString(evaluator.operationId);
  if (!targetPath || !requestKind || !operationId) {
    return rejected("Evaluator validation artifact is missing sanitized target metadata.");
  }

  const expectedTargetPath = options.expectedTargetPath ?? DEFAULT_TARGET_PATH;
  if (targetPath !== expectedTargetPath) {
    const reason = `Evaluator target path ${targetPath} does not match ${expectedTargetPath}.`;
    return {
      status: "stale",
      summary: reason,
      runtimeValidationSource: cleanRuntimeSource(runtime?.source),
      validation: {
        status: "failed",
        failureReason: reason,
        targetPath,
        requestKind,
        operationId,
      },
    };
  }
  const descriptorHandoffAdvertised = cleanOptionalBoolean(evaluator.descriptorHandoffAdvertised);
  const descriptorHandoffSource = cleanString(evaluator.descriptorHandoffSource);
  const descriptorHandoffFailureReason = cleanString(evaluator.descriptorHandoffFailureReason);
  const descriptorHandoffRequiredAction = cleanString(evaluator.descriptorHandoffRequiredAction);
  const napoleonRequiredActions = sanitizeNapoleonRequiredActions(evaluator.napoleonRequiredActions);
  if (napoleonRequiredActions === null) {
    return rejected("Evaluator validation artifact contains invalid Napoleon required-action metadata.");
  }

  return {
    status: "accepted",
    summary:
      status === "passed"
        ? "Evaluator HTTP validation passed."
        : status === "failed" && cleanString(evaluator.failureReason) === "http_evaluator_handoff_not_advertised"
          ? descriptorHandoffRequiredAction
            ? `Evaluator HTTP validation failed because the Napoleon descriptor does not advertise evaluation review. ${descriptorHandoffRequiredAction}`
            : "Evaluator HTTP validation failed because the Napoleon descriptor does not advertise evaluation review."
          : status === "failed"
            ? "Evaluator HTTP validation failed."
            : "Evaluator HTTP validation has not run.",
    runtimeValidationSource: cleanRuntimeSource(runtime?.source),
    validation: {
      status,
      failureReason: cleanString(evaluator.failureReason) ?? (status === "passed" ? "none" : "unavailable"),
      targetPath,
      requestKind,
      operationId,
      ...(descriptorHandoffAdvertised !== undefined ? { descriptorHandoffAdvertised } : {}),
      ...(descriptorHandoffSource ? { descriptorHandoffSource } : {}),
      ...(descriptorHandoffFailureReason ? { descriptorHandoffFailureReason } : {}),
      ...(descriptorHandoffRequiredAction ? { descriptorHandoffRequiredAction } : {}),
      ...(napoleonRequiredActions.length ? { napoleonRequiredActions } : {}),
    },
  };
}
