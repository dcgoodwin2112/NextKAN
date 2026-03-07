import { prisma } from "@/lib/db";
import type { Comment } from "@/generated/prisma/client";
import { getSetting } from "@/lib/services/settings";

export function isCommentsEnabled(): boolean {
  return getSetting("ENABLE_COMMENTS", "false") === "true";
}

export function isModerationEnabled(): boolean {
  return getSetting("COMMENT_MODERATION", "true") !== "false";
}

export async function getApprovedComments(datasetId: string): Promise<Comment[]> {
  return prisma.comment.findMany({
    where: {
      datasetId,
      approved: true,
      parentId: null,
    },
    include: {
      replies: {
        where: { approved: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function submitComment(params: {
  datasetId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  parentId?: string;
}): Promise<Comment> {
  const approved = !isModerationEnabled();
  return prisma.comment.create({
    data: {
      datasetId: params.datasetId,
      authorName: params.authorName,
      authorEmail: params.authorEmail,
      content: params.content,
      parentId: params.parentId ?? null,
      approved,
    },
  });
}

export async function moderateComment(
  commentId: string,
  approved: boolean
): Promise<Comment> {
  return prisma.comment.update({
    where: { id: commentId },
    data: { approved },
  });
}

export async function deleteComment(commentId: string): Promise<void> {
  await prisma.comment.delete({
    where: { id: commentId },
  });
}

export async function getPendingComments(): Promise<Comment[]> {
  return prisma.comment.findMany({
    where: { approved: false },
    include: {
      dataset: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function searchComments(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sort?: string;
}) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  // Status filter: default to pending
  const status = params?.status ?? "pending";
  if (status === "pending") {
    where.approved = false;
  } else if (status === "approved") {
    where.approved = true;
  }
  // "all" = no approved filter

  if (params?.search?.trim()) {
    const terms = params.search.trim().split(/\s+/);
    where.AND = terms.map((term) => ({
      OR: [
        { authorName: { contains: term } },
        { authorEmail: { contains: term } },
        { content: { contains: term } },
      ],
    }));
  }

  const orderBy =
    params?.sort === "created_asc"
      ? { createdAt: "asc" as const }
      : { createdAt: "desc" as const };

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      include: {
        dataset: { select: { title: true } },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.comment.count({ where }),
  ]);

  return { comments, total };
}
