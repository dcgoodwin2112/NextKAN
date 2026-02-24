import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/services/activity";

export const WORKFLOW_STATUSES = [
  "draft",
  "pending_review",
  "approved",
  "published",
  "rejected",
  "archived",
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

interface TransitionRule {
  allowedNext: WorkflowStatus[];
  requiredRole: string[];
}

export const WORKFLOW_TRANSITIONS: Record<WorkflowStatus, TransitionRule> = {
  draft: {
    allowedNext: ["pending_review"],
    requiredRole: ["editor", "orgAdmin", "admin"],
  },
  pending_review: {
    allowedNext: ["approved", "rejected", "draft"],
    requiredRole: ["orgAdmin", "admin"],
  },
  approved: {
    allowedNext: ["published", "draft"],
    requiredRole: ["orgAdmin", "admin"],
  },
  published: {
    allowedNext: ["archived", "draft"],
    requiredRole: ["orgAdmin", "admin"],
  },
  rejected: {
    allowedNext: ["draft"],
    requiredRole: ["editor", "orgAdmin", "admin"],
  },
  archived: {
    allowedNext: ["draft"],
    requiredRole: ["admin"],
  },
};

export function isWorkflowEnabled(): boolean {
  return process.env.ENABLE_WORKFLOW === "true";
}

export function canTransition(
  fromStatus: string,
  toStatus: string,
  userRole: string
): { allowed: boolean; reason?: string } {
  const rule = WORKFLOW_TRANSITIONS[fromStatus as WorkflowStatus];
  if (!rule) {
    return { allowed: false, reason: `Invalid current status: ${fromStatus}` };
  }

  if (!rule.allowedNext.includes(toStatus as WorkflowStatus)) {
    return { allowed: false, reason: `Cannot transition from ${fromStatus} to ${toStatus}` };
  }

  if (!rule.requiredRole.includes(userRole)) {
    return { allowed: false, reason: `Role ${userRole} cannot perform this transition` };
  }

  return { allowed: true };
}

export function getAvailableTransitions(
  currentStatus: string,
  userRole: string
): WorkflowStatus[] {
  const rule = WORKFLOW_TRANSITIONS[currentStatus as WorkflowStatus];
  if (!rule) return [];
  if (!rule.requiredRole.includes(userRole)) return [];
  return rule.allowedNext;
}

export async function transitionWorkflow(
  datasetId: string,
  toStatus: string,
  userId: string,
  userRole: string,
  userName?: string,
  note?: string
) {
  const dataset = await prisma.dataset.findUnique({ where: { id: datasetId } });
  if (!dataset) {
    throw new Error("Dataset not found");
  }

  const fromStatus = dataset.workflowStatus;
  const check = canTransition(fromStatus, toStatus, userRole);
  if (!check.allowed) {
    throw new Error(check.reason);
  }

  const updateData: Record<string, unknown> = {
    workflowStatus: toStatus,
    reviewNote: note ?? null,
  };

  // Update timestamps based on transition
  if (toStatus === "pending_review") {
    updateData.submittedAt = new Date();
  }
  if (toStatus === "approved" || toStatus === "rejected") {
    updateData.reviewedAt = new Date();
    updateData.reviewerId = userId;
  }
  if (toStatus === "published") {
    updateData.publishedAt = new Date();
    // Also update the legacy status field for compatibility
    updateData.status = "published";
  }
  if (toStatus === "draft") {
    // Reset review fields when returning to draft
    updateData.reviewerId = null;
    updateData.reviewNote = null;
    // Also update legacy status
    updateData.status = "draft";
  }
  if (toStatus === "archived") {
    updateData.status = "archived";
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.dataset.update({
      where: { id: datasetId },
      data: updateData,
    });

    await tx.workflowTransition.create({
      data: {
        datasetId,
        fromStatus,
        toStatus,
        userId,
        userName: userName || null,
        note: note || null,
      },
    });

    return updated;
  });

  // Fire-and-forget: activity log
  logActivity({
    action: `workflow:${toStatus}`,
    entityType: "dataset",
    entityId: datasetId,
    entityName: result.title,
    userId,
    userName,
    details: { fromStatus, toStatus, note },
  }).catch(() => {});

  return result;
}

export async function getWorkflowHistory(datasetId: string) {
  return prisma.workflowTransition.findMany({
    where: { datasetId },
    orderBy: { createdAt: "desc" },
  });
}
