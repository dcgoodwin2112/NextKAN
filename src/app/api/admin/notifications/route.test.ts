// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSession } = vi.hoisted(() => ({
  mockSession: { value: { user: { id: "user-1", role: "admin" } } as unknown },
}));

vi.mock("@/lib/auth", () => ({
  auth: () => Promise.resolve(mockSession.value),
}));

const mockNotifications = vi.hoisted(() => ({
  getNotificationItems: vi.fn(),
}));

vi.mock("@/lib/services/notifications", () => mockNotifications);

import { GET } from "./route";

const mockData = {
  items: [
    {
      id: "review:ds1",
      type: "review",
      title: "Test",
      description: "Pending review",
      href: "/admin/datasets/ds1/edit",
      timestamp: new Date(),
    },
  ],
  totalCount: 1,
};

describe("GET /api/admin/notifications", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockSession.value = { user: { id: "user-1", role: "admin" } };
    mockNotifications.getNotificationItems.mockResolvedValue(mockData);
  });

  it("returns notifications for admin", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalCount).toBe(1);
    expect(body.items).toHaveLength(1);
  });

  it("returns notifications for editor (has admin:access)", async () => {
    mockSession.value = { user: { id: "user-2", role: "editor" } };
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockSession.value = null;
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 for viewer role", async () => {
    mockSession.value = { user: { id: "user-3", role: "viewer" } };
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
