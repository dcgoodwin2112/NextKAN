// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";
import { NextRequest } from "next/server";

const { mockSession } = vi.hoisted(() => ({
  mockSession: { value: { user: { id: "user-1", role: "admin" } } as unknown },
}));

vi.mock("@/lib/auth", () => ({
  auth: () => Promise.resolve(mockSession.value),
}));

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

import { GET } from "./route";

const mockActivities = [
  {
    id: "act-1",
    action: "dataset:created",
    entityType: "dataset",
    entityId: "ds-1",
    entityName: "Test Dataset",
    userId: "user-1",
    userName: "Admin",
    details: null,
    createdAt: new Date(),
  },
];

describe("GET /api/activity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.value = { user: { id: "user-1", role: "admin" } };
  });

  it("returns activities with pagination", async () => {
    prismaMock.activityLog.findMany.mockResolvedValue(mockActivities as any);
    prismaMock.activityLog.count.mockResolvedValue(1);

    const req = new NextRequest("http://localhost:3000/api/activity");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.activities).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("filters by entityType and entityId", async () => {
    prismaMock.activityLog.findMany.mockResolvedValue([]);
    prismaMock.activityLog.count.mockResolvedValue(0);

    const req = new NextRequest(
      "http://localhost:3000/api/activity?entityType=dataset&entityId=ds-1"
    );
    await GET(req);

    expect(prismaMock.activityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entityType: "dataset", entityId: "ds-1" },
      })
    );
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockSession.value = null;
    const req = new NextRequest("http://localhost:3000/api/activity");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 for non-admin users", async () => {
    mockSession.value = { user: { id: "user-1", role: "editor" } };
    const req = new NextRequest("http://localhost:3000/api/activity");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("allows orgAdmin access", async () => {
    mockSession.value = { user: { id: "user-1", role: "orgAdmin" } };
    prismaMock.activityLog.findMany.mockResolvedValue([]);
    prismaMock.activityLog.count.mockResolvedValue(0);

    const req = new NextRequest("http://localhost:3000/api/activity");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("respects limit and offset parameters", async () => {
    prismaMock.activityLog.findMany.mockResolvedValue([]);
    prismaMock.activityLog.count.mockResolvedValue(0);

    const req = new NextRequest(
      "http://localhost:3000/api/activity?limit=5&offset=10"
    );
    await GET(req);

    expect(prismaMock.activityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
        skip: 10,
      })
    );
  });
});
