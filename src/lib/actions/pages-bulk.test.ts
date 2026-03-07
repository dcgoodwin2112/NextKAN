import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/services/activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

import { bulkUpdatePages, bulkDeletePages } from "./pages";
import { logActivity } from "@/lib/services/activity";

const id1 = "a1b2c3d4-e5f6-1234-a567-123456789abc";
const id2 = "b2c3d4e5-f6a7-2345-b678-234567890bcd";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("bulkUpdatePages", () => {
  it("publishes multiple pages", async () => {
    prismaMock.page.updateMany.mockResolvedValue({ count: 2 });
    prismaMock.page.findMany.mockResolvedValue([
      { id: id1, title: "Page A" },
      { id: id2, title: "Page B" },
    ] as any);

    const result = await bulkUpdatePages([id1, id2], { published: true });

    expect(result.success).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(prismaMock.page.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { published: true },
      })
    );
    expect(logActivity).toHaveBeenCalledTimes(2);
  });

  it("unpublishes multiple pages", async () => {
    prismaMock.page.updateMany.mockResolvedValue({ count: 2 });
    prismaMock.page.findMany.mockResolvedValue([
      { id: id1, title: "Page A" },
      { id: id2, title: "Page B" },
    ] as any);

    const result = await bulkUpdatePages([id1, id2], { published: false });

    expect(result.success).toBe(2);
    expect(prismaMock.page.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { published: false },
      })
    );
  });
});

describe("bulkDeletePages", () => {
  it("orphans children and deletes pages", async () => {
    prismaMock.page.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.page.findMany.mockResolvedValue([
      { id: id1, title: "Page A" },
      { id: id2, title: "Page B" },
    ] as any);
    prismaMock.page.deleteMany.mockResolvedValue({ count: 2 });

    const result = await bulkDeletePages([id1, id2]);

    expect(result.success).toBe(2);
    expect(result.errors).toHaveLength(0);

    // Should orphan children first
    expect(prismaMock.page.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { parentId: { in: [id1, id2] } },
        data: { parentId: null },
      })
    );

    // Then delete
    expect(prismaMock.page.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [id1, id2] } },
      })
    );

    expect(logActivity).toHaveBeenCalledTimes(2);
  });
});
