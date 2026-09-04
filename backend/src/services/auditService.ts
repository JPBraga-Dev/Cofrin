import { createHash, randomUUID } from "node:crypto";
import { mockDatabase } from "../data/mockDatabase.js";
import type { AuditEventType } from "../domain/types.js";
import { redactSensitiveFields } from "../utils/redaction.js";

export const pseudonymize = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 16);
export function audit(eventType: AuditEventType, userId?: string, metadata?: Record<string, unknown>) {
  mockDatabase.auditLogs.push({
    id: randomUUID(),
    eventType,
    userId,
    timestamp: new Date().toISOString(),
    metadata: metadata ? redactSensitiveFields(metadata) as Record<string, unknown> : undefined,
  });
}
