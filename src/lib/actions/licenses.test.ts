import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", async () => {
  const mock = await import("@/__mocks__/prisma");
  return { prisma: mock.default };
});

vi.mock("@/lib/services/activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

import { prismaMock } from "@/__mocks__/prisma";
import { logActivity } from "@/lib/services/activity";
import {
  createLicense,
  updateLicense,
  deleteLicense,
  getLicense,
  listLicenses,
} from "./licenses";

describe("licenses actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createLicense", () => {
    it("creates a license", async () => {
      (prismaMock.license.create as any).mockResolvedValue({
        id: "lic-1",
        name: "CC0",
        url: "https://creativecommons.org/publicdomain/zero/1.0/",
        isDefault: false,
        sortOrder: 0,
      });

      const result = await createLicense({
        name: "CC0",
        url: "https://creativecommons.org/publicdomain/zero/1.0/",
      });

      expect(prismaMock.license.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "CC0",
          url: "https://creativecommons.org/publicdomain/zero/1.0/",
          isDefault: false,
          sortOrder: 0,
        }),
      });
      expect(result.name).toBe("CC0");
    });

    it("unsets other defaults when creating a default license", async () => {
      (prismaMock.license.create as any).mockResolvedValue({
        id: "lic-1",
        name: "CC0",
        isDefault: true,
      });
      (prismaMock.license.updateMany as any).mockResolvedValue({ count: 1 });

      await createLicense({ name: "CC0", isDefault: true });

      expect(prismaMock.license.updateMany).toHaveBeenCalledWith({
        where: { id: { not: "lic-1" }, isDefault: true },
        data: { isDefault: false },
      });
    });

    it("logs activity on create", async () => {
      (prismaMock.license.create as any).mockResolvedValue({
        id: "lic-1",
        name: "CC0",
        isDefault: false,
      });

      await createLicense({ name: "CC0" });

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "create",
          entityType: "license",
          entityId: "lic-1",
        })
      );
    });

    it("rejects missing name", async () => {
      await expect(createLicense({ name: "" })).rejects.toThrow();
    });
  });

  describe("updateLicense", () => {
    it("updates license fields", async () => {
      (prismaMock.license.update as any).mockResolvedValue({
        id: "lic-1",
        name: "Updated",
        url: null,
        isDefault: false,
      });

      await updateLicense("lic-1", { name: "Updated" });

      expect(prismaMock.license.update).toHaveBeenCalledWith({
        where: { id: "lic-1" },
        data: { name: "Updated" },
      });
    });

    it("clears url with empty string", async () => {
      (prismaMock.license.update as any).mockResolvedValue({
        id: "lic-1",
        name: "Test",
        url: null,
        isDefault: false,
      });

      await updateLicense("lic-1", { url: "" });

      expect(prismaMock.license.update).toHaveBeenCalledWith({
        where: { id: "lic-1" },
        data: { url: null },
      });
    });

    it("unsets other defaults when setting isDefault", async () => {
      (prismaMock.license.update as any).mockResolvedValue({
        id: "lic-1",
        name: "Test",
        isDefault: true,
      });
      (prismaMock.license.updateMany as any).mockResolvedValue({ count: 1 });

      await updateLicense("lic-1", { isDefault: true });

      expect(prismaMock.license.updateMany).toHaveBeenCalledWith({
        where: { id: { not: "lic-1" }, isDefault: true },
        data: { isDefault: false },
      });
    });

    it("logs activity on update", async () => {
      (prismaMock.license.update as any).mockResolvedValue({
        id: "lic-1",
        name: "Updated",
        isDefault: false,
      });

      await updateLicense("lic-1", { name: "Updated" });

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "update",
          entityType: "license",
        })
      );
    });
  });

  describe("deleteLicense", () => {
    it("deletes license and logs activity", async () => {
      (prismaMock.license.delete as any).mockResolvedValue({
        id: "lic-1",
        name: "Deleted",
      });

      await deleteLicense("lic-1");

      expect(prismaMock.license.delete).toHaveBeenCalledWith({
        where: { id: "lic-1" },
      });
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "delete",
          entityType: "license",
          entityId: "lic-1",
        })
      );
    });
  });

  describe("getLicense", () => {
    it("returns license by id", async () => {
      (prismaMock.license.findUnique as any).mockResolvedValue({
        id: "lic-1",
        name: "CC0",
      });

      const result = await getLicense("lic-1");

      expect(result?.name).toBe("CC0");
      expect(prismaMock.license.findUnique).toHaveBeenCalledWith({
        where: { id: "lic-1" },
      });
    });

    it("returns null for non-existent license", async () => {
      (prismaMock.license.findUnique as any).mockResolvedValue(null);

      const result = await getLicense("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("listLicenses", () => {
    it("returns licenses ordered by sortOrder then name", async () => {
      (prismaMock.license.findMany as any).mockResolvedValue([
        { id: "lic-1", name: "A", sortOrder: 0 },
        { id: "lic-2", name: "B", sortOrder: 1 },
      ]);

      const result = await listLicenses();

      expect(result).toHaveLength(2);
      expect(prismaMock.license.findMany).toHaveBeenCalledWith({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
    });
  });
});
