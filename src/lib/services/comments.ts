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
