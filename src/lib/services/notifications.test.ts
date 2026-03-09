import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getNotificationItems, formatRelativeDate } from "./notifications";

const mockPrisma = vi.hoisted(() => ({
  dataset: { findMany: vi.fn() },
  comment: { count: vi.fn(), findFirst: vi.fn() },
  harvestJob: { findMany: vi.fn() },
  user: { count: vi.fn(), findFirst: vi.fn() },
}));

const mockSettings = vi.hoisted(() => ({
  workflowEnabled: false,
  commentsEnabled: false,
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/services/workflow", () => ({
  isWorkflowEnabled: () => mockSettings.workflowEnabled,
}));

vi.mock("@/lib/services/comments", () => ({
  isCommentsEnabled: () => mockSettings.commentsEnabled,
}));

beforeEach(() => {
  vi.resetAllMocks();
  mockSettings.workflowEnabled = false;
  mockSettings.commentsEnabled = false;
  mockPrisma.dataset.findMany.mockResolvedValue([]);
  mockPrisma.comment.count.mockResolvedValue(0);
  mockPrisma.comment.findFirst.mockResolvedValue(null);
  mockPrisma.harvestJob.findMany.mockResolvedValue([]);
  mockPrisma.user.count.mockResolvedValue(0);
  mockPrisma.user.findFirst.mockResolvedValue(null);
});

describe("getNotificationItems", () => {
  it("returns empty items when no notifications exist", async () => {
    const result = await getNotificationItems();
    expect(result).toEqual({ items: [], totalCount: 0 });
  });

  it("skips review notifications when workflow disabled", async () => {
    mockSettings.workflowEnabled = false;
    await getNotificationItems();
    expect(mockPrisma.dataset.findMany).not.toHaveBeenCalled();
  });

  it("returns review items when workflow enabled", async () => {
    mockSettings.workflowEnabled = true;
    const now = new Date();
    mockPrisma.dataset.findMany.mockResolvedValue([
      { id: "ds1", title: "Test Dataset", submittedAt: now, updatedAt: now },
    ]);

    const result = await getNotificationItems();
    expect(result.totalCount).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: "review:ds1",
      type: "review",
      title: "Test Dataset",
      href: "/admin/datasets/ds1/edit",
    });
  });

  it("skips comment notifications when comments disabled", async () => {
    mockSettings.commentsEnabled = false;
    await getNotificationItems();
    expect(mockPrisma.comment.count).not.toHaveBeenCalled();
  });

  it("returns aggregate comment item when pending comments exist", async () => {
    mockSettings.commentsEnabled = true;
    const oldest = new Date("2025-01-01");
    mockPrisma.comment.count.mockResolvedValue(5);
    mockPrisma.comment.findFirst.mockResolvedValue({ createdAt: oldest });

    const result = await getNotificationItems();
    expect(result.totalCount).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: "comment:pending",
      type: "comment",
      title: "5 pending comments",
      href: "/admin/comments",
    });
  });

  it("deduplicates harvest errors by sourceId", async () => {
    const t1 = new Date("2025-06-02");
    const t2 = new Date("2025-06-01");
    mockPrisma.harvestJob.findMany.mockResolvedValue([
      { id: "j1", sourceId: "s1", errors: null, startedAt: t1, source: { name: "Source A" } },
      { id: "j2", sourceId: "s1", errors: null, startedAt: t2, source: { name: "Source A" } },
      { id: "j3", sourceId: "s2", errors: null, startedAt: t2, source: { name: "Source B" } },
    ]);

    const result = await getNotificationItems();
    expect(result.totalCount).toBe(2);
    expect(result.items.map((i) => i.id)).toContain("harvest:s1");
    expect(result.items.map((i) => i.id)).toContain("harvest:s2");
  });

  it("returns registration notification when pending users exist", async () => {
    const oldest = new Date("2025-01-15");
    mockPrisma.user.count.mockResolvedValue(3);
    mockPrisma.user.findFirst.mockResolvedValue({ createdAt: oldest });

    const result = await getNotificationItems();
    expect(result.totalCount).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: "registration:pending",
      type: "registration",
      title: "3 pending registrations",
      href: "/admin/users?status=pending",
    });
  });

  it("sorts all items by timestamp descending", async () => {
    mockSettings.workflowEnabled = true;
    mockSettings.commentsEnabled = true;

    const oldest = new Date("2025-01-01");
    const middle = new Date("2025-03-01");
    const newest = new Date("2025-06-01");

    mockPrisma.dataset.findMany.mockResolvedValue([
      { id: "ds1", title: "Dataset", submittedAt: middle, updatedAt: middle },
    ]);
    mockPrisma.comment.count.mockResolvedValue(1);
    mockPrisma.comment.findFirst.mockResolvedValue({ createdAt: oldest });
    mockPrisma.harvestJob.findMany.mockResolvedValue([
      { id: "j1", sourceId: "s1", errors: null, startedAt: newest, source: { name: "Src" } },
    ]);

    const result = await getNotificationItems();
    expect(result.items[0].type).toBe("harvest");
    expect(result.items[1].type).toBe("review");
    expect(result.items[2].type).toBe("comment");
  });
});

describe("formatRelativeDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Today' for same-day dates", () => {
    expect(formatRelativeDate(new Date())).toBe("Today");
  });

  it("returns 'Yesterday' for one-day-old dates", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatRelativeDate(yesterday)).toBe("Yesterday");
  });

  it("returns 'Xd ago' for recent dates", () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    expect(formatRelativeDate(threeDaysAgo)).toBe("3d ago");
  });
});
