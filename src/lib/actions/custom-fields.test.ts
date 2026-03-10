import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/services/activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

import {
  createCustomFieldDefinition,
  updateCustomFieldDefinition,
  deleteCustomFieldDefinition,
  getCustomFieldDefinition,
  listCustomFieldDefinitions,
  getCustomFieldsForDataset,
} from "./custom-fields";

const mockDefinition = {
  id: "cfd-1",
  name: "department_code",
  label: "Department Code",
  type: "text",
  required: false,
  options: null,
  sortOrder: 0,
  organizationId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("createCustomFieldDefinition", () => {
  it("creates a definition with valid input", async () => {
    prismaMock.customFieldDefinition.create.mockResolvedValue(mockDefinition as any);

    const result = await createCustomFieldDefinition({
      name: "department_code",
      label: "Department Code",
      type: "text",
    });

    expect(result.name).toBe("department_code");
    expect(prismaMock.customFieldDefinition.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "department_code",
        label: "Department Code",
        type: "text",
        required: false,
        options: null,
        sortOrder: 0,
        organizationId: null,
      }),
    });
  });

  it("stores options as JSON string", async () => {
    prismaMock.customFieldDefinition.create.mockResolvedValue({
      ...mockDefinition,
      type: "select",
      options: '["a","b"]',
    } as any);

    await createCustomFieldDefinition({
      name: "status_field",
      label: "Status",
      type: "select",
      options: ["a", "b"],
    });

    expect(prismaMock.customFieldDefinition.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        options: '["a","b"]',
      }),
    });
  });

  it("rejects invalid name format", async () => {
    await expect(
      createCustomFieldDefinition({
        name: "Invalid Name",
        label: "Test",
        type: "text",
      })
    ).rejects.toThrow();
  });
});

describe("updateCustomFieldDefinition", () => {
  it("updates a definition", async () => {
    prismaMock.customFieldDefinition.update.mockResolvedValue({
      ...mockDefinition,
      label: "Updated Label",
    } as any);

    const result = await updateCustomFieldDefinition("cfd-1", { label: "Updated Label" });
    expect(result.label).toBe("Updated Label");
  });
});

describe("deleteCustomFieldDefinition", () => {
  it("deletes a definition", async () => {
    prismaMock.customFieldDefinition.findUnique.mockResolvedValue(mockDefinition as any);
    prismaMock.customFieldDefinition.delete.mockResolvedValue(mockDefinition as any);

    await deleteCustomFieldDefinition("cfd-1");
    expect(prismaMock.customFieldDefinition.delete).toHaveBeenCalledWith({
      where: { id: "cfd-1" },
    });
  });

  it("throws if definition not found", async () => {
    prismaMock.customFieldDefinition.findUnique.mockResolvedValue(null);
    await expect(deleteCustomFieldDefinition("nonexistent")).rejects.toThrow("not found");
  });
});

describe("getCustomFieldDefinition", () => {
  it("returns definition by id", async () => {
    prismaMock.customFieldDefinition.findUnique.mockResolvedValue(mockDefinition as any);
    const result = await getCustomFieldDefinition("cfd-1");
    expect(result?.name).toBe("department_code");
  });
});

describe("listCustomFieldDefinitions", () => {
  it("returns all definitions when no orgId", async () => {
    prismaMock.customFieldDefinition.findMany.mockResolvedValue([mockDefinition as any]);
    const result = await listCustomFieldDefinitions();
    expect(result).toHaveLength(1);
    expect(prismaMock.customFieldDefinition.findMany).toHaveBeenCalledWith({
      where: {},
      include: { _count: { select: { values: true } } },
      orderBy: { sortOrder: "asc" },
    });
  });

  it("filters global + org-scoped when orgId provided", async () => {
    prismaMock.customFieldDefinition.findMany.mockResolvedValue([mockDefinition as any]);
    await listCustomFieldDefinitions("org-1");
    expect(prismaMock.customFieldDefinition.findMany).toHaveBeenCalledWith({
      where: { OR: [{ organizationId: null }, { organizationId: "org-1" }] },
      include: { _count: { select: { values: true } } },
      orderBy: { sortOrder: "asc" },
    });
  });
});

describe("getCustomFieldsForDataset", () => {
  it("returns record keyed by definition name", async () => {
    prismaMock.datasetCustomFieldValue.findMany.mockResolvedValue([
      {
        id: "v1",
        datasetId: "ds-1",
        definitionId: "cfd-1",
        value: "ABC123",
        definition: { ...mockDefinition },
      },
    ] as any);

    const result = await getCustomFieldsForDataset("ds-1");
    expect(result).toEqual({ department_code: "ABC123" });
  });

  it("returns empty object for dataset with no custom fields", async () => {
    prismaMock.datasetCustomFieldValue.findMany.mockResolvedValue([]);
    const result = await getCustomFieldsForDataset("ds-1");
    expect(result).toEqual({});
  });
});
