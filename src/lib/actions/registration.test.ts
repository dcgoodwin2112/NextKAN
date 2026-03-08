import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

const mockSettingsState = vi.hoisted(() => ({
  mode: "open" as string,
  defaultRole: "viewer" as string,
  siteUrl: "http://localhost:3000",
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/services/settings", () => ({
  getUserRegistrationMode: () => mockSettingsState.mode,
  getUserDefaultRole: () => mockSettingsState.defaultRole,
  getSetting: (key: string, fallback: string) => {
    if (key === "SITE_URL") return mockSettingsState.siteUrl;
    return fallback;
  },
}));

const mockSend = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/services/email", () => ({
  getEmailService: () => ({ send: mockSend }),
}));

const mockCreateEmailVerification = vi.fn().mockResolvedValue("mock-token-hex");
vi.mock("@/lib/services/email-verification", () => ({
  createEmailVerification: (...args: unknown[]) =>
    mockCreateEmailVerification(...args),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
}));

const mockLogActivity = vi.fn().mockReturnValue(Promise.resolve());
vi.mock("@/lib/services/activity", () => ({
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
}));

import { registerUser } from "./registration";

beforeEach(() => {
  vi.clearAllMocks();
  mockSettingsState.mode = "open";
  mockSettingsState.defaultRole = "viewer";
  mockCreateEmailVerification.mockResolvedValue("mock-token-hex");
  mockSend.mockResolvedValue(undefined);
  mockLogActivity.mockReturnValue(Promise.resolve());
});

describe("registerUser", () => {
  it("throws when registration is disabled", async () => {
    mockSettingsState.mode = "disabled";
    await expect(
      registerUser({ email: "a@b.com", password: "12345678", name: "Test" })
    ).rejects.toThrow("Registration is disabled");
  });

  it("throws on duplicate email", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });
    await expect(
      registerUser({ email: "dup@b.com", password: "12345678", name: "Test" })
    ).rejects.toThrow("A user with this email already exists");
  });

  it("creates user in open mode with pending status", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "new-user",
      email: "new@test.com",
      name: "New User",
    });

    const result = await registerUser({
      email: "new@test.com",
      password: "password123",
      name: "New User",
    });
    expect(result).toEqual({ success: true });
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "new@test.com",
        name: "New User",
        role: "viewer",
        status: "pending",
        emailVerified: false,
      }),
      select: expect.any(Object),
    });
  });

  it("sends verification email", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "u1",
      email: "new@test.com",
      name: "Test",
    });

    await registerUser({
      email: "new@test.com",
      password: "password123",
      name: "Test",
    });
    expect(mockSend).toHaveBeenCalled();
    const sentEmail = mockSend.mock.calls[0][0];
    expect(sentEmail.to).toBe("new@test.com");
    expect(sentEmail.subject).toContain("Verify");
  });

  it("notifies admins in approval mode", async () => {
    mockSettingsState.mode = "approval";
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "u1",
      email: "new@test.com",
      name: "Test",
    });
    mockPrisma.user.findMany.mockResolvedValue([
      { email: "admin@test.com" },
    ]);

    await registerUser({
      email: "new@test.com",
      password: "password123",
      name: "Test",
    });

    // Should send both verification email and admin notification
    expect(mockSend).toHaveBeenCalledTimes(2);
    const adminEmail = mockSend.mock.calls[1][0];
    expect(adminEmail.to).toEqual(["admin@test.com"]);
    expect(adminEmail.subject).toContain("pending approval");
  });

  it("uses default role from settings", async () => {
    mockSettingsState.defaultRole = "editor";
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "u1",
      email: "new@test.com",
      name: "Test",
    });

    await registerUser({
      email: "new@test.com",
      password: "password123",
      name: "Test",
    });

    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ role: "editor" }),
      select: expect.any(Object),
    });
  });
});
