import { describe, it, expect, vi, beforeEach } from "vitest";
import { asMock } from "@/__mocks__/prisma";
import {
  generateToken,
  hashToken,
  validateMcpToken,
  validateTokenFromHeader,
} from "./api-tokens";

vi.mock("@/lib/db", () => ({
  prisma: {
    apiToken: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/lib/db");
const mockPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("generateToken", () => {
  it("returns plaintext with nkan_ prefix", () => {
    const { plaintext } = generateToken();
    expect(plaintext).toMatch(/^nkan_[0-9a-f]{64}$/);
  });

  it("returns a 9-char prefix", () => {
    const { prefix } = generateToken();
    expect(prefix).toHaveLength(9);
    expect(prefix).toMatch(/^nkan_[0-9a-f]{4}$/);
  });

  it("generates deterministic hash from plaintext", () => {
    const { plaintext, hash } = generateToken();
    expect(hashToken(plaintext)).toBe(hash);
  });

  it("generates unique tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a.plaintext).not.toBe(b.plaintext);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe("hashToken", () => {
  it("returns a 64-char hex string", () => {
    const hash = hashToken("nkan_test");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    expect(hashToken("nkan_abc")).toBe(hashToken("nkan_abc"));
  });
});

describe("validateTokenFromHeader", () => {
  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
    role: "admin",
    organizationId: null,
    password: "hashed",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("returns null for missing header", async () => {
    expect(await validateTokenFromHeader(null)).toBeNull();
  });

  it("returns null for non-Bearer header", async () => {
    expect(await validateTokenFromHeader("Basic abc")).toBeNull();
  });

  it("returns null for non-nkan_ token", async () => {
    expect(await validateTokenFromHeader("Bearer abc123")).toBeNull();
  });

  it("returns null when token not found in DB", async () => {
    asMock(mockPrisma.apiToken.findUnique).mockResolvedValue(null);
    expect(await validateTokenFromHeader("Bearer nkan_abc")).toBeNull();
  });

  it("returns null for expired token", async () => {
    asMock(mockPrisma.apiToken.findUnique).mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      name: "test",
      tokenHash: "hash",
      prefix: "nkan_abcd",
      scope: "read",
      rateLimitMultiplier: 1,
      expiresAt: new Date("2020-01-01"),
      lastUsedAt: null,
      createdAt: new Date(),
      user: mockUser,
    } as any);
    expect(await validateTokenFromHeader("Bearer nkan_abc")).toBeNull();
  });

  it("returns user for valid token", async () => {
    asMock(mockPrisma.apiToken.findUnique).mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      name: "test",
      tokenHash: "hash",
      prefix: "nkan_abcd",
      scope: "read",
      rateLimitMultiplier: 1,
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
      user: mockUser,
    } as any);
    asMock(mockPrisma.apiToken.update).mockResolvedValue({} as any);

    const result = await validateTokenFromHeader("Bearer nkan_abc");
    expect(result).toEqual({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      role: "admin",
      organizationId: null,
    });
  });

  it("does not leak token-level fields to REST callers", async () => {
    asMock(mockPrisma.apiToken.findUnique).mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      name: "test",
      tokenHash: "hash",
      prefix: "nkan_abcd",
      scope: "admin",
      rateLimitMultiplier: 5,
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
      user: mockUser,
    } as any);
    asMock(mockPrisma.apiToken.update).mockResolvedValue({} as any);

    const result = await validateTokenFromHeader("Bearer nkan_abc");
    expect(result).not.toHaveProperty("scope");
    expect(result).not.toHaveProperty("rateLimitMultiplier");
  });

  it("updates lastUsedAt on valid token", async () => {
    asMock(mockPrisma.apiToken.findUnique).mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      name: "test",
      tokenHash: "hash",
      prefix: "nkan_abcd",
      scope: "read",
      rateLimitMultiplier: 1,
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
      user: mockUser,
    } as any);
    asMock(mockPrisma.apiToken.update).mockResolvedValue({} as any);

    await validateTokenFromHeader("Bearer nkan_abc");

    expect(mockPrisma.apiToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "token-1" },
        data: expect.objectContaining({ lastUsedAt: expect.any(Date) }),
      })
    );
  });
});

describe("validateMcpToken", () => {
  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
    role: "admin",
    organizationId: null,
    password: "hashed",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function mockToken(overrides: Record<string, unknown> = {}) {
    return {
      id: "token-1",
      userId: "user-1",
      name: "test",
      tokenHash: "hash",
      prefix: "nkan_abcd",
      scope: "read",
      rateLimitMultiplier: 1,
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
      user: mockUser,
      ...overrides,
    };
  }

  it("returns null for missing header", async () => {
    expect(await validateMcpToken(null)).toBeNull();
  });

  it("returns null for non-Bearer header", async () => {
    expect(await validateMcpToken("Basic abc")).toBeNull();
  });

  it("returns null for non-nkan_ token", async () => {
    expect(await validateMcpToken("Bearer abc123")).toBeNull();
  });

  it("returns null when token not found in DB", async () => {
    asMock(mockPrisma.apiToken.findUnique).mockResolvedValue(null);
    expect(await validateMcpToken("Bearer nkan_abc")).toBeNull();
  });

  it("returns null for expired token", async () => {
    asMock(mockPrisma.apiToken.findUnique).mockResolvedValue(
      mockToken({ expiresAt: new Date("2020-01-01") }) as any,
    );
    expect(await validateMcpToken("Bearer nkan_abc")).toBeNull();
  });

  it("returns default scope='read' and multiplier=1 for a vanilla token", async () => {
    asMock(mockPrisma.apiToken.findUnique).mockResolvedValue(mockToken() as any);
    asMock(mockPrisma.apiToken.update).mockResolvedValue({} as any);

    const result = await validateMcpToken("Bearer nkan_abc");
    expect(result).toEqual({
      user: {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        role: "admin",
        organizationId: null,
      },
      scope: "read",
      rateLimitMultiplier: 1,
    });
  });

  it("returns scope='admin' and custom multiplier when set on the token", async () => {
    asMock(mockPrisma.apiToken.findUnique).mockResolvedValue(
      mockToken({ scope: "admin", rateLimitMultiplier: 5 }) as any,
    );
    asMock(mockPrisma.apiToken.update).mockResolvedValue({} as any);

    const result = await validateMcpToken("Bearer nkan_abc");
    expect(result?.scope).toBe("admin");
    expect(result?.rateLimitMultiplier).toBe(5);
  });

  it("updates lastUsedAt on valid token", async () => {
    asMock(mockPrisma.apiToken.findUnique).mockResolvedValue(mockToken() as any);
    asMock(mockPrisma.apiToken.update).mockResolvedValue({} as any);

    await validateMcpToken("Bearer nkan_abc");

    expect(mockPrisma.apiToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "token-1" },
        data: expect.objectContaining({ lastUsedAt: expect.any(Date) }),
      }),
    );
  });
});
