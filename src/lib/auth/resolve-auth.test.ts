import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { resolveAuth } from "./resolve-auth";

vi.mock("@/lib/db", () => ({
  prisma: {
    apiToken: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

const mockValidateToken = vi.fn();
vi.mock("@/lib/services/api-tokens", () => ({
  validateTokenFromHeader: (...args: any[]) => mockValidateToken(...args),
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/test", { headers });
}

describe("resolveAuth", () => {
  it("returns token user when valid bearer token", async () => {
    const user = { id: "u1", role: "admin", email: "a@b.com", name: "A", organizationId: null };
    mockValidateToken.mockResolvedValue(user);

    const result = await resolveAuth(makeRequest({ authorization: "Bearer nkan_abc" }));
    expect(result).toEqual({ user, fromToken: true });
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it("returns null for invalid bearer token (no session fallback)", async () => {
    mockValidateToken.mockResolvedValue(null);

    const result = await resolveAuth(makeRequest({ authorization: "Bearer nkan_invalid" }));
    expect(result).toBeNull();
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it("falls back to session auth when no Authorization header", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u2", email: "b@c.com", name: "B", role: "editor", organizationId: "org-1" },
    });

    const result = await resolveAuth(makeRequest());
    expect(result).toEqual({
      user: { id: "u2", email: "b@c.com", name: "B", role: "editor", organizationId: "org-1" },
      fromToken: false,
    });
  });

  it("returns null when no auth at all", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await resolveAuth(makeRequest());
    expect(result).toBeNull();
  });
});
