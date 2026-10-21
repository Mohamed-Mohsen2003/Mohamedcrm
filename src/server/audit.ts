import type { Database } from "@/lib/db";
import { auditLogs, type EntityType } from "@/lib/db/schema";

export async function recordAudit(
  db: Database,
  entry: {
    orgId: string;
    actorId: string;
    action: string;
    entityType: EntityType;
    entityId?: string | null;
    entityLabel?: string | null;
    meta?: Record<string, unknown>;
  },
) {
  await db.insert(auditLogs).values({
    orgId: entry.orgId,
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    entityLabel: entry.entityLabel ?? null,
    meta: entry.meta ?? null,
  });
}
