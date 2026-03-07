import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    apiToken: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockLogActivity = vi.fn();
vi.mock("@/lib/services/activity", () => ({
  logActivity: (...args: any[]) => mockLogActivity(...args),
}));

const mockGenerateToken = vi.fn();
vi.mock("@/lib/services/api-tokens", () => ({
  generateToken: () => mockGenerateToken(),
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const { prisma } = await import("@/lib/db");
const mockPrisma = vi.mocked(prisma);

import { createToken, listTokens, revokeToken } from "./api-tokens";

const adminSession = {
  user: { id: "admin-1", name: "Admin", role: "admin", organizationId: null },
};

const editorSession = {
  user: { id: "editor-1", name: "Editor", role: "editor", organizationId: null },
};

beforeEach(() => {
  vi.resetAllMocks();
  mockAuth.mockResolvedValue(adminSession);
  mockGenerateToken.mockReturnValue({
    plaintext: "nkan_abc123",
    hash: "hashed",
    prefix: "nkan_abc1",
  });
  mockLogActivity.mockReturnValue(Promise.resolve());
});

describe("createToken", () => {
  it("creates a token for self", async () => {
    mockAuth.mockResolvedValue(editorSession);
    mockPrisma.apiToken.create.mockResolvedValue({
      id: "token-1",
      userId: "editor-1",
      name: "My Token",
      tokenHash: "hashed",
      prefix: "nkan_abc1",
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date("2024-01-01"),
    });

    const result = await createToken("editor-1", { name: "My Token" });
    expect(result.plaintext).toBe("nkan_abc123");
    expect(result.name).toBe("My Token");
    expect(result.prefix).toBe("nkan_abc1");
  });

  it("admin can create token for another user", async () => {
    mockPrisma.apiToken.create.mockResolvedValue({
      id: "token-2",
      userId: "editor-1",
      name: "Admin Created",
      tokenHash: "hashed",
      prefix: "nkan_abc1",
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date("2024-01-01"),
    });

    const result = await createToken("editor-1", { name: "Admin Created" });
    expect(result.id).toBe("token-2");
  });

  it("editor cannot create token for another user", async () => {
    mockAuth.mockResolvedValue(editorSession);
    await expect(createToken("other-user", { name: "Nope" })).rejects.toThrow("Unauthorized");
  });

  it("rejects unauthenticated requests", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(createToken("user-1", { name: "test" })).rejects.toThrow("Unauthorized");
  });

  it("validates input with Zod", async () => {
    await expect(createToken("admin-1", { name: "" })).rejects.toThrow();
  });
});

describe("listTokens", () => {
  it("returns tokens for self", async () => {
    mockAuth.mockResolvedValue(editorSession);
    const tokens = [{ id: "t1", name: "Token 1", prefix: "nkan_abc1" }];
    mockPrisma.apiToken.findMany.mockResolvedValue(tokens as any);

    const result = await listTokens("editor-1");
    expect(result).toEqual(tokens);
  });

  it("admin can list another user's tokens", async () => {
    mockPrisma.apiToken.findMany.mockResolvedValue([]);
    const result = await listTokens("editor-1");
    expect(result).toEqual([]);
  });

  it("editor cannot list another user's tokens", async () => {
    mockAuth.mockResolvedValue(editorSession);
    await expect(listTokens("other-user")).rejects.toThrow("Unauthorized");
  });
});

describe("revokeToken", () => {
  it("revokes own token", async () => {
    mockAuth.mockResolvedValue(editorSession);
    mockPrisma.apiToken.findUnique.mockResolvedValue({
      id: "token-1",
      userId: "editor-1",
      name: "My Token",
    } as any);
    mockPrisma.apiToken.delete.mockResolvedValue({} as any);

    await revokeToken("token-1");
    expect(mockPrisma.apiToken.delete).toHaveBeenCalledWith({ where: { id: "token-1" } });
  });

  it("admin can revoke another user's token", async () => {
    mockPrisma.apiToken.findUnique.mockResolvedValue({
      id: "token-1",
      userId: "editor-1",
      name: "Token",
    } as any);
    mockPrisma.apiToken.delete.mockResolvedValue({} as any);

    await revokeToken("token-1");
    expect(mockPrisma.apiToken.delete).toHaveBeenCalled();
  });

  it("editor cannot revoke another user's token", async () => {
    mockAuth.mockResolvedValue(editorSession);
    mockPrisma.apiToken.findUnique.mockResolvedValue({
      id: "token-1",
      userId: "other-user",
      name: "Token",
    } as any);

    await expect(revokeToken("token-1")).rejects.toThrow("Unauthorized");
  });

  it("throws for nonexistent token", async () => {
    mockPrisma.apiToken.findUnique.mockResolvedValue(null);
    await expect(revokeToken("nope")).rejects.toThrow("Token not found");
  });
});
