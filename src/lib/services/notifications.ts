import { prisma } from "@/lib/db";
import { isWorkflowEnabled } from "@/lib/services/workflow";
import { isCommentsEnabled } from "@/lib/services/comments";

export interface NotificationItem {
  id: string;
  type: "review" | "comment" | "harvest";
  title: string;
  description: string;
  href: string;
  timestamp: Date;
}

export interface NotificationData {
  items: NotificationItem[];
  totalCount: number;
}

/** Lightweight notification queries — no quality scoring or heavy joins. */
export async function getNotificationItems(): Promise<NotificationData> {
  const [reviewItems, commentItems, harvestItems] = await Promise.all([
    getReviewNotifications(),
    getCommentNotifications(),
    getHarvestNotifications(),
  ]);

  const items = [...reviewItems, ...commentItems, ...harvestItems].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  return { items, totalCount: items.length };
}

async function getReviewNotifications(): Promise<NotificationItem[]> {
  if (!isWorkflowEnabled()) return [];

  const pending = await prisma.dataset.findMany({
    where: { workflowStatus: "pending_review" },
    select: { id: true, title: true, submittedAt: true, updatedAt: true },
    orderBy: { submittedAt: "desc" },
  });

  return pending.map((d) => ({
    id: `review:${d.id}`,
    type: "review" as const,
    title: d.title,
    description: "Pending review",
    href: `/admin/datasets/${d.id}/edit`,
    timestamp: d.submittedAt ?? d.updatedAt,
  }));
}

async function getCommentNotifications(): Promise<NotificationItem[]> {
  if (!isCommentsEnabled()) return [];

  const [count, oldest] = await Promise.all([
    prisma.comment.count({ where: { approved: false } }),
    prisma.comment.findFirst({
      where: { approved: false },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  if (count === 0) return [];

  return [
    {
      id: "comment:pending",
      type: "comment" as const,
      title: `${count} pending comment${count === 1 ? "" : "s"}`,
      description: "Awaiting moderation",
      href: "/admin/comments",
      timestamp: oldest!.createdAt,
    },
  ];
}

async function getHarvestNotifications(): Promise<NotificationItem[]> {
  const errorJobs = await prisma.harvestJob.findMany({
    where: { status: "error" },
    select: {
      id: true,
      sourceId: true,
      errors: true,
      startedAt: true,
      source: { select: { name: true } },
    },
    orderBy: { startedAt: "desc" },
  });

  // Deduplicate by sourceId — keep most recent per source
  const seen = new Set<string>();
  const items: NotificationItem[] = [];

  for (const job of errorJobs) {
    if (seen.has(job.sourceId)) continue;
    seen.add(job.sourceId);
    items.push({
      id: `harvest:${job.sourceId}`,
      type: "harvest" as const,
      title: job.source.name,
      description: "Harvest failed",
      href: "/admin/harvest",
      timestamp: job.startedAt,
    });
  }

  return items;
}

/** Format a date relative to now. */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}
