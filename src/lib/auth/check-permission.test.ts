import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("./token-context", () => ({
  tokenAuthContext: { getStore: vi.fn().mockReturnValue(null) },
}));

import {
  requirePermission,
  requireDatasetPermission,
  requireOrgPermission,
  PermissionError,
} from "./check-permission";

describe("requirePermission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns session for authorized user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    const session = await requirePermission("admin:access");
    expect(session.user.id).toBe("u1");
  });

  it("throws PermissionError for unauthorized", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "viewer" } });
    await expect(requirePermission("admin:access")).rejects.toThrow(PermissionError);
  });

  it("throws when no session", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(requirePermission("admin:access")).rejects.toThrow(PermissionError);
  });
});

describe("requireDatasetPermission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows admin for any dataset", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    const session = await requireDatasetPermission("dataset:update", "ds-1");
    expect(session.user.role).toBe("admin");
  });

  it("allows editor who created the dataset", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "editor", organizationId: "org-1" } });
    prismaMock.dataset.findUnique.mockResolvedValue({
      createdById: "u1",
      publisherId: "org-2",
    } as any);

    const session = await requireDatasetPermission("dataset:update", "ds-1");
    expect(session.user.id).toBe("u1");
  });

  it("rejects editor who did not create the dataset", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "editor", organizationId: "org-1" } });
    prismaMock.dataset.findUnique.mockResolvedValue({
      createdById: "u2",
      publisherId: "org-1",
    } as any);

    await expect(requireDatasetPermission("dataset:update", "ds-1")).rejects.toThrow(PermissionError);
  });

  it("allows orgAdmin for dataset in their org", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "orgAdmin", organizationId: "org-1" } });
    prismaMock.dataset.findUnique.mockResolvedValue({
      createdById: "u2",
      publisherId: "org-1",
    } as any);

    const session = await requireDatasetPermission("dataset:update", "ds-1");
    expect(session.user.id).toBe("u1");
  });

  it("rejects orgAdmin for dataset in different org", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "orgAdmin", organizationId: "org-1" } });
    prismaMock.dataset.findUnique.mockResolvedValue({
      createdById: "u2",
      publisherId: "org-2",
    } as any);

    await expect(requireDatasetPermission("dataset:update", "ds-1")).rejects.toThrow(PermissionError);
  });
});
