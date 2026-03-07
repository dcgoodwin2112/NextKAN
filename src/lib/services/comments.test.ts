import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/db", async () => ({
  prisma: (await import("@/__mocks__/prisma")).default,
}));

import { prismaMock } from "@/__mocks__/prisma";
import {
  isCommentsEnabled,
  isModerationEnabled,
  submitComment,
  getApprovedComments,
  moderateComment,
  getPendingComments,
  deleteComment,
  searchComments,
} from "./comments";

const COMMENT_ID = "a1b2c3d4-e5f6-1234-a567-123456789abc";
const DATASET_ID = "d1d2d3d4-e5f6-1234-a567-123456789abc";

const baseComment = {
  id: COMMENT_ID,
  datasetId: DATASET_ID,
  authorName: "Test User",
  authorEmail: "test@example.com",
  content: "Great dataset!",
  approved: false,
  parentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("comments service", () => {
  beforeEach(() => {
    delete process.env.ENABLE_COMMENTS;
    delete process.env.COMMENT_MODERATION;
  });

  afterEach(() => {
    delete process.env.ENABLE_COMMENTS;
    delete process.env.COMMENT_MODERATION;
    vi.restoreAllMocks();
  });

  describe("isCommentsEnabled", () => {
    it("returns false by default", () => {
      expect(isCommentsEnabled()).toBe(false);
    });

    it("returns true when ENABLE_COMMENTS is true", () => {
      process.env.ENABLE_COMMENTS = "true";
      expect(isCommentsEnabled()).toBe(true);
    });
  });

  describe("isModerationEnabled", () => {
    it("returns true by default", () => {
      expect(isModerationEnabled()).toBe(true);
    });

    it("returns false when COMMENT_MODERATION is false", () => {
      process.env.COMMENT_MODERATION = "false";
      expect(isModerationEnabled()).toBe(false);
    });
  });

  describe("submitComment", () => {
    it("creates comment with approved=false when moderation enabled", async () => {
      process.env.COMMENT_MODERATION = "true";
      prismaMock.comment.create.mockResolvedValue({ ...baseComment, approved: false });

      const result = await submitComment({
        datasetId: DATASET_ID,
        authorName: "Test User",
        authorEmail: "test@example.com",
        content: "Great dataset!",
      });

      expect(result.approved).toBe(false);
      expect(prismaMock.comment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ approved: false }),
      });
    });

    it("creates comment with approved=true when moderation disabled", async () => {
      process.env.COMMENT_MODERATION = "false";
      prismaMock.comment.create.mockResolvedValue({ ...baseComment, approved: true });

      const result = await submitComment({
        datasetId: DATASET_ID,
        authorName: "Test User",
        authorEmail: "test@example.com",
        content: "Great dataset!",
      });

      expect(result.approved).toBe(true);
      expect(prismaMock.comment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ approved: true }),
      });
    });

    it("passes parentId when provided", async () => {
      process.env.COMMENT_MODERATION = "false";
      const parentId = "p1p2p3p4-e5f6-1234-a567-123456789abc";
      prismaMock.comment.create.mockResolvedValue({
        ...baseComment,
        parentId,
        approved: true,
      });

      await submitComment({
        datasetId: DATASET_ID,
        authorName: "Test User",
        authorEmail: "test@example.com",
        content: "Reply",
        parentId,
      });

      expect(prismaMock.comment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ parentId }),
      });
    });
  });

  describe("getApprovedComments", () => {
    it("only returns approved top-level comments with approved replies", async () => {
      prismaMock.comment.findMany.mockResolvedValue([
        { ...baseComment, approved: true, replies: [] },
      ] as any);

      await getApprovedComments(DATASET_ID);

      expect(prismaMock.comment.findMany).toHaveBeenCalledWith({
        where: {
          datasetId: DATASET_ID,
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
    });
  });

  describe("moderateComment", () => {
    it("updates approved status", async () => {
      prismaMock.comment.update.mockResolvedValue({
        ...baseComment,
        approved: true,
      });

      const result = await moderateComment(COMMENT_ID, true);

      expect(result.approved).toBe(true);
      expect(prismaMock.comment.update).toHaveBeenCalledWith({
        where: { id: COMMENT_ID },
        data: { approved: true },
      });
    });
  });

  describe("deleteComment", () => {
    it("deletes the comment", async () => {
      prismaMock.comment.delete.mockResolvedValue(baseComment as any);

      await deleteComment(COMMENT_ID);

      expect(prismaMock.comment.delete).toHaveBeenCalledWith({
        where: { id: COMMENT_ID },
      });
    });
  });

  describe("searchComments", () => {
    it("returns {comments, total} with pagination", async () => {
      prismaMock.comment.findMany.mockResolvedValue([baseComment] as any);
      prismaMock.comment.count.mockResolvedValue(1);

      const result = await searchComments({ page: 1, limit: 10 });
      expect(result).toEqual({ comments: [baseComment], total: 1 });
      expect(prismaMock.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 })
      );
    });

    it("defaults to pending status filter", async () => {
      prismaMock.comment.findMany.mockResolvedValue([]);
      prismaMock.comment.count.mockResolvedValue(0);

      await searchComments();
      expect(prismaMock.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ approved: false }),
        })
      );
    });

    it("filters by approved status", async () => {
      prismaMock.comment.findMany.mockResolvedValue([]);
      prismaMock.comment.count.mockResolvedValue(0);

      await searchComments({ status: "approved" });
      expect(prismaMock.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ approved: true }),
        })
      );
    });

    it("shows all comments when status is all", async () => {
      prismaMock.comment.findMany.mockResolvedValue([]);
      prismaMock.comment.count.mockResolvedValue(0);

      await searchComments({ status: "all" });
      const call = prismaMock.comment.findMany.mock.calls[0][0] as any;
      expect(call.where).not.toHaveProperty("approved");
    });

    it("applies search filter", async () => {
      prismaMock.comment.findMany.mockResolvedValue([]);
      prismaMock.comment.count.mockResolvedValue(0);

      await searchComments({ search: "john" });
      expect(prismaMock.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: [
              {
                OR: [
                  { authorName: { contains: "john" } },
                  { authorEmail: { contains: "john" } },
                  { content: { contains: "john" } },
                ],
              },
            ],
          }),
        })
      );
    });
  });

  describe("getPendingComments", () => {
    it("returns only unapproved comments with dataset info", async () => {
      prismaMock.comment.findMany.mockResolvedValue([baseComment] as any);

      await getPendingComments();

      expect(prismaMock.comment.findMany).toHaveBeenCalledWith({
        where: { approved: false },
        include: {
          dataset: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    });
  });
});
