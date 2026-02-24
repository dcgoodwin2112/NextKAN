import { prisma } from "@/lib/db";

export interface ActivityParams {
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  userId?: string | null;
  userName?: string | null;
  details?: Record<string, unknown> | null;
}

/** Creates an ActivityLog record. Fire-and-forget — never throws. */
export async function logActivity(params: ActivityParams): Promise<void> {
  await prisma.activityLog.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      entityName: params.entityName,
      userId: params.userId || null,
      userName: params.userName || null,
      details: params.details ? JSON.stringify(params.details) : null,
    },
  });
}

/** Computes a diff between two objects, returning changed fields or null if equal. */
export function computeDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { from: unknown; to: unknown }> | null {
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  for (const key of Object.keys(after)) {
    const oldVal = before[key];
    const newVal = after[key];

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { from: oldVal, to: newVal };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
