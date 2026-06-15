import { getBridgeOperation, type BridgeOperationId } from "./bridgeOperations.js";

export function hasRequiredBridgeResponseFields(payload: unknown, operationId: BridgeOperationId): boolean {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  return getBridgeOperation(operationId).responseRequired.every((field) => record[field] !== undefined);
}
