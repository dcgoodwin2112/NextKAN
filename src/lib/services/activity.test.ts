import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

import { logActivity, computeDiff } from "./activity";

describe("logActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an activity log record", async () => {
    prismaMock.activityLog.create.mockResolvedValue({} as any);

    await logActivity({
      action: "dataset:created",
      entityType: "dataset",
      entityId: "ds-1",
      entityName: "Test Dataset",
      userId: "user-1",
      userName: "Admin",
    });

    expect(prismaMock.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "dataset:created",
        entityType: "dataset",
        entityId: "ds-1",
        entityName: "Test Dataset",
        userId: "user-1",
        userName: "Admin",
      }),
    });
  });

  it("stringifies details as JSON", async () => {
    prismaMock.activityLog.create.mockResolvedValue({} as any);

    await logActivity({
      action: "dataset:updated",
      entityType: "dataset",
      entityId: "ds-1",
      entityName: "Test",
      details: { title: { from: "Old", to: "New" } },
    });

    expect(prismaMock.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        details: JSON.stringify({ title: { from: "Old", to: "New" } }),
      }),
    });
  });

  it("handles null userId and userName", async () => {
    prismaMock.activityLog.create.mockResolvedValue({} as any);

    await logActivity({
      action: "dataset:created",
      entityType: "dataset",
      entityId: "ds-1",
      entityName: "Test",
    });

    expect(prismaMock.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: null,
        userName: null,
        details: null,
      }),
    });
  });
});

describe("computeDiff", () => {
  it("returns changed fields", () => {
    const before = { title: "Old Title", description: "Same" };
    const after = { title: "New Title", description: "Same" };

    const diff = computeDiff(before, after);
    expect(diff).toEqual({
      title: { from: "Old Title", to: "New Title" },
    });
  });

  it("returns null when objects are equal", () => {
    const obj = { title: "Same", description: "Same" };
    const diff = computeDiff(obj, { ...obj });
    expect(diff).toBeNull();
  });

  it("detects multiple changes", () => {
    const before = { a: 1, b: 2, c: 3 };
    const after = { a: 10, b: 2, c: 30 };

    const diff = computeDiff(before, after);
    expect(diff).toEqual({
      a: { from: 1, to: 10 },
      c: { from: 3, to: 30 },
    });
  });

  it("handles nested objects via JSON comparison", () => {
    const before = { refs: [1, 2] };
    const after = { refs: [1, 3] };

    const diff = computeDiff(before, after);
    expect(diff).toEqual({
      refs: { from: [1, 2], to: [1, 3] },
    });
  });
});
