import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";

const mockSession = vi.hoisted(() => ({
  user: {
    id: "admin-user-1",
    name: "Admin",
    email: "admin@example.com",
    role: "admin",
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/auth/check-permission", () => ({
  requirePermission: vi.fn().mockResolvedValue(mockSession),
  PermissionError: class PermissionError extends Error {
    constructor(p: string) {
      super(`Insufficient permissions: ${p} required`);
      this.name = "PermissionError";
    }
  },
}));

vi.mock("@/lib/services/activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn(),
  },
}));

import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
  searchUsers,
} from "./users";

describe("user actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listUsers", () => {
    it("returns all users", async () => {
      const mockUsers = [
        { id: "u1", email: "a@b.com", name: "A", role: "admin", organizationId: null, organization: null, createdAt: new Date() },
      ];
      (prismaMock.user.findMany as any).mockResolvedValue(mockUsers);

      const result = await listUsers();
      expect(result).toEqual(mockUsers);
      expect(prismaMock.user.findMany).toHaveBeenCalled();
    });
  });

  describe("getUser", () => {
    it("returns user by ID", async () => {
      const mockUser = {
        id: "u1",
        email: "user@example.com",
        name: "User",
        role: "editor",
        organizationId: null,
        organization: null,
        createdAt: new Date(),
      };
      (prismaMock.user.findUnique as any).mockResolvedValue(mockUser);

      const result = await getUser("u1");
      expect(result).toEqual(mockUser);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: "u1" },
        select: expect.objectContaining({ id: true, email: true }),
      });
    });

    it("returns null for missing user", async () => {
      (prismaMock.user.findUnique as any).mockResolvedValue(null);

      const result = await getUser("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("createUser", () => {
    it("creates user with hashed password", async () => {
      const mockUser = {
        id: "u2",
        email: "new@example.com",
        name: "New",
        role: "editor",
        organizationId: null,
      };
      (prismaMock.user.create as any).mockResolvedValue(mockUser);

      const result = await createUser({
        email: "new@example.com",
        password: "password123",
        name: "New",
        role: "editor",
      });

      expect(result.email).toBe("new@example.com");
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "new@example.com",
            password: "hashed-password",
          }),
        })
      );
    });

    it("rejects invalid email", async () => {
      await expect(
        createUser({ email: "not-email", password: "password123" })
      ).rejects.toThrow();
    });

    it("rejects short password", async () => {
      await expect(
        createUser({ email: "a@b.com", password: "short" })
      ).rejects.toThrow();
    });
  });

  describe("updateUser", () => {
    it("updates user fields", async () => {
      const mockUser = {
        id: "u1",
        email: "updated@example.com",
        name: "Updated",
        role: "editor",
        organizationId: null,
      };
      (prismaMock.user.findUnique as any).mockResolvedValue(null); // email uniqueness check
      (prismaMock.user.update as any).mockResolvedValue(mockUser);

      const result = await updateUser("u1", {
        name: "Updated",
        email: "updated@example.com",
      });

      expect(result.name).toBe("Updated");
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "u1" },
          data: expect.objectContaining({
            name: "Updated",
            email: "updated@example.com",
          }),
        })
      );
    });

    it("rejects duplicate email", async () => {
      (prismaMock.user.findUnique as any).mockResolvedValue({
        id: "other-user",
        email: "taken@example.com",
      });

      await expect(
        updateUser("u1", { email: "taken@example.com" })
      ).rejects.toThrow("A user with this email already exists");
    });

    it("prevents changing own role", async () => {
      await expect(
        updateUser("admin-user-1", { role: "viewer" })
      ).rejects.toThrow("Cannot change your own role");
    });

    it("prevents demoting the last admin", async () => {
      (prismaMock.user.findUnique as any).mockResolvedValue({
        id: "u1",
        role: "admin",
      });
      (prismaMock.user.count as any).mockResolvedValue(1);

      await expect(
        updateUser("u1", { role: "editor" })
      ).rejects.toThrow("Cannot demote the last admin user");
    });

    it("allows demoting an admin when others exist", async () => {
      (prismaMock.user.findUnique as any).mockResolvedValue(null); // email check returns null
      // Override for the role check: first call returns the target user, second returns null (email)
      (prismaMock.user.findUnique as any)
        .mockResolvedValueOnce({ id: "u1", role: "admin" }) // role check
        .mockResolvedValueOnce(null); // no email conflict (not called since role change triggers first)

      // Actually the findUnique calls are ordered: first for role check, then for email.
      // But since we only pass role (not email), email check is skipped.
      (prismaMock.user.findUnique as any).mockReset();
      (prismaMock.user.findUnique as any).mockResolvedValue({ id: "u1", role: "admin" });
      (prismaMock.user.count as any).mockResolvedValue(2);
      (prismaMock.user.update as any).mockResolvedValue({
        id: "u1",
        email: "a@b.com",
        name: "A",
        role: "editor",
        organizationId: null,
      });

      const result = await updateUser("u1", { role: "editor" });
      expect(result.role).toBe("editor");
    });
  });

  describe("resetPassword", () => {
    it("hashes and updates password", async () => {
      (prismaMock.user.update as any).mockResolvedValue({});

      await resetPassword("u1", { password: "newpassword123" });

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { password: "hashed-password" },
      });
    });

    it("rejects short password", async () => {
      await expect(
        resetPassword("u1", { password: "short" })
      ).rejects.toThrow();
    });
  });

  describe("searchUsers", () => {
    it("returns {users, total} with pagination", async () => {
      const mockUsers = [
        { id: "u1", email: "a@b.com", name: "A", role: "admin", organizationId: null, organization: null, createdAt: new Date() },
      ];
      (prismaMock.user.findMany as any).mockResolvedValue(mockUsers);
      (prismaMock.user.count as any).mockResolvedValue(1);

      const result = await searchUsers({ page: 1, limit: 10 });
      expect(result).toEqual({ users: mockUsers, total: 1 });
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 })
      );
    });

    it("applies search filter on name/email", async () => {
      (prismaMock.user.findMany as any).mockResolvedValue([]);
      (prismaMock.user.count as any).mockResolvedValue(0);

      await searchUsers({ search: "john" });
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { OR: [{ name: { contains: "john" } }, { email: { contains: "john" } }] },
            ],
          },
        })
      );
    });

    it("applies role filter", async () => {
      (prismaMock.user.findMany as any).mockResolvedValue([]);
      (prismaMock.user.count as any).mockResolvedValue(0);

      await searchUsers({ role: "editor" });
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: "editor" },
        })
      );
    });

    it("applies org filter", async () => {
      (prismaMock.user.findMany as any).mockResolvedValue([]);
      (prismaMock.user.count as any).mockResolvedValue(0);

      await searchUsers({ organizationId: "org-1" });
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: "org-1" },
        })
      );
    });

    it("applies sort parameter", async () => {
      (prismaMock.user.findMany as any).mockResolvedValue([]);
      (prismaMock.user.count as any).mockResolvedValue(0);

      await searchUsers({ sort: "name_asc" });
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: "asc" },
        })
      );
    });

    it("defaults to created_desc sort", async () => {
      (prismaMock.user.findMany as any).mockResolvedValue([]);
      (prismaMock.user.count as any).mockResolvedValue(0);

      await searchUsers();
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );
    });
  });

  describe("deleteUser", () => {
    it("deletes user", async () => {
      (prismaMock.user.findUnique as any).mockResolvedValue({
        role: "editor",
        email: "user@example.com",
      });
      (prismaMock.user.delete as any).mockResolvedValue({});

      await deleteUser("some-other-user");
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: "some-other-user" },
      });
    });

    it("prevents self-deletion", async () => {
      await expect(deleteUser("admin-user-1")).rejects.toThrow(
        "Cannot delete your own account"
      );
    });

    it("prevents deleting the last admin", async () => {
      (prismaMock.user.findUnique as any).mockResolvedValue({
        role: "admin",
        email: "admin@example.com",
      });
      (prismaMock.user.count as any).mockResolvedValue(1);

      await expect(deleteUser("some-admin")).rejects.toThrow(
        "Cannot delete the last admin user"
      );
    });

    it("allows deleting an admin when others exist", async () => {
      (prismaMock.user.findUnique as any).mockResolvedValue({
        role: "admin",
        email: "admin2@example.com",
      });
      (prismaMock.user.count as any).mockResolvedValue(2);
      (prismaMock.user.delete as any).mockResolvedValue({});

      await deleteUser("other-admin");
      expect(prismaMock.user.delete).toHaveBeenCalled();
    });
  });
});
