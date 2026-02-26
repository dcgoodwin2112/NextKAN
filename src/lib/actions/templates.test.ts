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
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  listAvailableTemplates,
} from "./templates";

const mockFields = {
  publisherId: "a1b2c3d4-e5f6-1234-a567-123456789abc",
  accessLevel: "public" as const,
  keywords: ["open-data"],
  language: "en-us",
};

describe("templates actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTemplate", () => {
    it("creates a template with JSON-serialized fields", async () => {
      (prismaMock.datasetTemplate.create as any).mockResolvedValue({
        id: "tpl-1",
        name: "Federal Template",
        fields: JSON.stringify(mockFields),
      });

      const result = await createTemplate({
        name: "Federal Template",
        fields: mockFields,
      });

      expect(prismaMock.datasetTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Federal Template",
          description: null,
          organizationId: null,
          createdById: null,
        }),
      });
      // Verify fields are JSON-serialized (key order may vary)
      const call = (prismaMock.datasetTemplate.create as any).mock.calls[0][0];
      expect(JSON.parse(call.data.fields)).toEqual(mockFields);
      expect(result.name).toBe("Federal Template");
    });

    it("stores organizationId for scoped templates", async () => {
      const orgId = "b2c3d4e5-f6a7-2345-b678-234567890bcd";
      (prismaMock.datasetTemplate.create as any).mockResolvedValue({
        id: "tpl-2",
        name: "Org Template",
        organizationId: orgId,
        fields: JSON.stringify(mockFields),
      });

      await createTemplate({
        name: "Org Template",
        organizationId: orgId,
        fields: mockFields,
      });

      expect(prismaMock.datasetTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ organizationId: orgId }),
      });
    });

    it("logs activity on create", async () => {
      (prismaMock.datasetTemplate.create as any).mockResolvedValue({
        id: "tpl-1",
        name: "Test",
        fields: "{}",
      });

      await createTemplate(
        { name: "Test", fields: {} },
        "user-1"
      );

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "create",
          entityType: "template",
          entityId: "tpl-1",
          userId: "user-1",
        })
      );
    });

    it("rejects missing name", async () => {
      await expect(
        createTemplate({ name: "", fields: {} })
      ).rejects.toThrow();
    });
  });

  describe("updateTemplate", () => {
    it("updates name and fields", async () => {
      (prismaMock.datasetTemplate.update as any).mockResolvedValue({
        id: "tpl-1",
        name: "Updated",
        fields: JSON.stringify({ language: "fr" }),
      });

      await updateTemplate("tpl-1", {
        name: "Updated",
        fields: { language: "fr" },
      });

      expect(prismaMock.datasetTemplate.update).toHaveBeenCalledWith({
        where: { id: "tpl-1" },
        data: {
          name: "Updated",
          fields: JSON.stringify({ language: "fr" }),
        },
      });
    });

    it("clears organizationId with empty string", async () => {
      (prismaMock.datasetTemplate.update as any).mockResolvedValue({
        id: "tpl-1",
        name: "T",
        organizationId: null,
        fields: "{}",
      });

      await updateTemplate("tpl-1", { organizationId: "" });

      expect(prismaMock.datasetTemplate.update).toHaveBeenCalledWith({
        where: { id: "tpl-1" },
        data: { organizationId: null },
      });
    });

    it("logs activity on update", async () => {
      (prismaMock.datasetTemplate.update as any).mockResolvedValue({
        id: "tpl-1",
        name: "Updated",
        fields: "{}",
      });

      await updateTemplate("tpl-1", { name: "Updated" });

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "update",
          entityType: "template",
        })
      );
    });
  });

  describe("deleteTemplate", () => {
    it("deletes template and logs activity", async () => {
      (prismaMock.datasetTemplate.delete as any).mockResolvedValue({
        id: "tpl-1",
        name: "Deleted",
      });

      await deleteTemplate("tpl-1");

      expect(prismaMock.datasetTemplate.delete).toHaveBeenCalledWith({
        where: { id: "tpl-1" },
      });
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "delete",
          entityType: "template",
          entityId: "tpl-1",
        })
      );
    });
  });

  describe("getTemplate", () => {
    it("returns template with parsed fields", async () => {
      (prismaMock.datasetTemplate.findUnique as any).mockResolvedValue({
        id: "tpl-1",
        name: "Test",
        fields: JSON.stringify(mockFields),
        organization: null,
      });

      const result = await getTemplate("tpl-1");

      expect(result?.fields).toEqual(mockFields);
      expect(prismaMock.datasetTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: "tpl-1" },
        include: { organization: true },
      });
    });

    it("returns null for non-existent template", async () => {
      (prismaMock.datasetTemplate.findUnique as any).mockResolvedValue(null);

      const result = await getTemplate("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("listTemplates", () => {
    it("returns all templates with parsed fields", async () => {
      (prismaMock.datasetTemplate.findMany as any).mockResolvedValue([
        { id: "tpl-1", name: "A", fields: "{}", organization: null },
        {
          id: "tpl-2",
          name: "B",
          fields: JSON.stringify(mockFields),
          organization: { id: "org-1", name: "Org" },
        },
      ]);

      const result = await listTemplates();

      expect(result).toHaveLength(2);
      expect(result[0].fields).toEqual({});
      expect(result[1].fields).toEqual(mockFields);
    });
  });

  describe("listAvailableTemplates", () => {
    it("returns global + org templates for user with org", async () => {
      const orgId = "b2c3d4e5-f6a7-2345-b678-234567890bcd";
      (prismaMock.datasetTemplate.findMany as any).mockResolvedValue([
        { id: "tpl-1", name: "Global", fields: "{}", organization: null },
        {
          id: "tpl-2",
          name: "Org",
          fields: "{}",
          organization: { id: orgId, name: "Org" },
        },
      ]);

      await listAvailableTemplates(orgId);

      expect(prismaMock.datasetTemplate.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ organizationId: null }, { organizationId: orgId }],
        },
        orderBy: { name: "asc" },
        include: { organization: true },
      });
    });

    it("returns only global templates for user without org", async () => {
      (prismaMock.datasetTemplate.findMany as any).mockResolvedValue([]);

      await listAvailableTemplates(null);

      expect(prismaMock.datasetTemplate.findMany).toHaveBeenCalledWith({
        where: { organizationId: null },
        orderBy: { name: "asc" },
        include: { organization: true },
      });
    });

    it("returns only global templates when no orgId passed", async () => {
      (prismaMock.datasetTemplate.findMany as any).mockResolvedValue([]);

      await listAvailableTemplates();

      expect(prismaMock.datasetTemplate.findMany).toHaveBeenCalledWith({
        where: { organizationId: null },
        orderBy: { name: "asc" },
        include: { organization: true },
      });
    });
  });
});
