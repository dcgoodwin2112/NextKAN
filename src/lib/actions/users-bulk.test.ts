import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/services/activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

const sessionUserId = "d4e5f6a7-b8c9-1234-a567-abcdef123456";
const mockSession = vi.hoisted(() => ({
  user: { id: "d4e5f6a7-b8c9-1234-a567-abcdef123456", name: "Admin", role: "admin" },
}));

vi.mock("@/lib/auth/check-permission", () => ({
  requirePermission: vi.fn().mockResolvedValue(mockSession),
}));

import { bulkUpdateUsers, bulkDeleteUsers } from "./users";
import { logActivity } from "@/lib/services/activity";

const id1 = "a1b2c3d4-e5f6-1234-a567-123456789abc";
const id2 = "b2c3d4e5-f6a7-2345-b678-234567890bcd";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
});

describe("bulkUpdateUsers", () => {
  it("changes role for multiple users", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ id: id1, email: "a@test.com", role: "editor" } as any)
      .mockResolvedValueOnce({ id: id2, email: "b@test.com", role: "editor" } as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    const result = await bulkUpdateUsers([id1, id2], { role: "viewer" });

    expect(result.success).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(logActivity).toHaveBeenCalledTimes(2);
  });

  it("skips self for role change", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: id1, email: "other@test.com", role: "editor",
    } as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    const result = await bulkUpdateUsers([sessionUserId, id1], { role: "viewer" });

    expect(result.success).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Cannot change your own role");
  });

  it("guards last admin from demotion", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: id1, email: "admin@test.com", role: "admin",
    } as any);
    prismaMock.user.count.mockResolvedValue(1);

    const result = await bulkUpdateUsers([id1], { role: "editor" });

    expect(result.success).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("last admin");
  });
});

describe("bulkDeleteUsers", () => {
  it("deletes multiple users", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ id: id1, email: "a@test.com", role: "editor" } as any)
      .mockResolvedValueOnce({ id: id2, email: "b@test.com", role: "editor" } as any);
    prismaMock.user.delete.mockResolvedValue({} as any);

    const result = await bulkDeleteUsers([id1, id2]);

    expect(result.success).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(logActivity).toHaveBeenCalledTimes(2);
  });

  it("guards last admin from deletion", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: id1, email: "admin@test.com", role: "admin",
    } as any);
    prismaMock.user.count.mockResolvedValue(1);

    const result = await bulkDeleteUsers([id1]);

    expect(result.success).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("last admin");
  });

  it("skips not-found users", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const result = await bulkDeleteUsers([id1]);

    expect(result.success).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("not found");
  });
});
