import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  emailVerification: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  user: {
    update: vi.fn(),
    findUnique: vi.fn(),
  },
}));

const mockSettings = vi.hoisted(() => ({
  mode: "open" as string,
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/services/settings", () => ({
  getUserRegistrationMode: () => mockSettings.mode,
}));

import {
  generateVerificationToken,
  hashVerificationToken,
  createEmailVerification,
  verifyEmail,
  resendVerification,
} from "./email-verification";

beforeEach(() => {
  vi.resetAllMocks();
  mockSettings.mode = "open";
});

describe("generateVerificationToken", () => {
  it("returns plaintext and hash pair", () => {
    const { plaintext, hash } = generateVerificationToken();
    expect(plaintext).toHaveLength(64); // 32 bytes hex
    expect(hash).toHaveLength(64); // sha256 hex
    expect(hashVerificationToken(plaintext)).toBe(hash);
  });
});

describe("createEmailVerification", () => {
  it("deletes existing verifications and creates new one", async () => {
    mockPrisma.emailVerification.create.mockResolvedValue({ id: "ev1" });

    const token = await createEmailVerification("user1");
    expect(token).toHaveLength(64);
    expect(mockPrisma.emailVerification.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user1" },
    });
    expect(mockPrisma.emailVerification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user1",
        tokenHash: expect.any(String),
      }),
    });
  });
});

describe("verifyEmail", () => {
  it("returns invalid for unknown token", async () => {
    mockPrisma.emailVerification.findUnique.mockResolvedValue(null);
    const result = await verifyEmail("badtoken");
    expect(result).toEqual({ success: false, mode: "invalid" });
  });

  it("returns expired for expired token", async () => {
    mockPrisma.emailVerification.findUnique.mockResolvedValue({
      id: "ev1",
      userId: "u1",
      expiresAt: new Date("2020-01-01"),
      user: { id: "u1", status: "pending" },
    });
    mockPrisma.emailVerification.delete.mockResolvedValue({});

    const result = await verifyEmail("sometoken");
    expect(result).toEqual({ success: false, mode: "expired" });
  });

  it("activates user in open mode", async () => {
    mockSettings.mode = "open";
    const future = new Date(Date.now() + 86400000);
    mockPrisma.emailVerification.findUnique.mockResolvedValue({
      id: "ev1",
      userId: "u1",
      expiresAt: future,
      user: { id: "u1", status: "pending" },
    });
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.emailVerification.delete.mockResolvedValue({});

    const result = await verifyEmail("validtoken");
    expect(result).toEqual({ success: true, mode: "open", userId: "u1" });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { emailVerified: true, status: "active" },
    });
  });

  it("keeps user pending in approval mode", async () => {
    mockSettings.mode = "approval";
    const future = new Date(Date.now() + 86400000);
    mockPrisma.emailVerification.findUnique.mockResolvedValue({
      id: "ev1",
      userId: "u1",
      expiresAt: future,
      user: { id: "u1", status: "pending" },
    });
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.emailVerification.delete.mockResolvedValue({});

    const result = await verifyEmail("validtoken");
    expect(result).toEqual({ success: true, mode: "approval", userId: "u1" });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { emailVerified: true, status: "pending" },
    });
  });
});

describe("resendVerification", () => {
  it("returns null if user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await resendVerification("noone@test.com");
    expect(result).toBeNull();
  });

  it("returns null if email already verified", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      emailVerified: true,
    });
    const result = await resendVerification("verified@test.com");
    expect(result).toBeNull();
  });

  it("creates new verification for unverified user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      emailVerified: false,
    });
    mockPrisma.emailVerification.deleteMany.mockResolvedValue({});
    mockPrisma.emailVerification.create.mockResolvedValue({ id: "ev1" });

    const result = await resendVerification("unverified@test.com");
    expect(result).toBeTruthy();
    expect(result!.userId).toBe("u1");
    expect(result!.token).toHaveLength(64);
  });
});
