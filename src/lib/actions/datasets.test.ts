import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/services/activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
  computeDiff: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/services/email", () => ({
  getEmailService: () => ({ send: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("@/lib/email-templates/dataset-created", () => ({
  datasetCreatedEmail: vi.fn().mockReturnValue({
    subject: "test",
    html: "<p>test</p>",
    text: "test",
  }),
}));

vi.mock("@/lib/plugins/hooks", () => ({ hooks: { run: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/lib/plugins/loader", () => ({ isPluginsEnabled: vi.fn().mockReturnValue(false) }));

import {
  createDataset,
  updateDataset,
  deleteDataset,
  getDataset,
  getDatasetBySlug,
  listDatasets,
  listDeletedDatasets,
  restoreDataset,
  purgeDataset,
} from "./datasets";

const validInput = {
  title: "Test Dataset",
  description: "A test dataset",
  publisherId: "a1b2c3d4-e5f6-1234-a567-123456789abc",
  keywords: ["test", "data"],
  accessLevel: "public" as const,
};

const mockDataset = {
  id: "ds-1",
  title: "Test Dataset",
  slug: "test-dataset",
  description: "A test dataset",
  identifier: "ds-1",
  accessLevel: "public",
  publisherId: "a1b2c3d4-e5f6-1234-a567-123456789abc",
  contactName: null,
  contactEmail: null,
  bureauCode: null,
  programCode: null,
  license: null,
  rights: null,
  spatial: null,
  temporal: null,
  issued: null,
  accrualPeriodicity: null,
  conformsTo: null,
  dataQuality: null,
  describedBy: null,
  isPartOf: null,
  landingPage: null,
  language: null,
  primaryITInvestmentUII: null,
  references: null,
  systemOfRecords: null,
  status: "published",
  deletedAt: null,
  createdById: null,
  modified: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  publisher: {
    id: "a1b2c3d4-e5f6-1234-a567-123456789abc",
    name: "Test Org",
    slug: "test-org",
    description: null,
    imageUrl: null,
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    parent: null,
  },
  distributions: [],
  keywords: [
    { id: "kw-1", keyword: "test", datasetId: "ds-1" },
    { id: "kw-2", keyword: "data", datasetId: "ds-1" },
  ],
  themes: [],
};

beforeEach(() => {
  prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
});

describe("createDataset", () => {
  it("validates input with Zod before database call", async () => {
    prismaMock.dataset.create.mockResolvedValue(mockDataset as any);
    prismaMock.datasetKeyword.createMany.mockResolvedValue({ count: 2 });
    prismaMock.dataset.findUniqueOrThrow.mockResolvedValue(mockDataset as any);

    const result = await createDataset(validInput);
    expect(result.title).toBe("Test Dataset");
    expect(prismaMock.dataset.create).toHaveBeenCalled();
  });

  it("generates a slug from the title", async () => {
    prismaMock.dataset.create.mockResolvedValue(mockDataset as any);
    prismaMock.datasetKeyword.createMany.mockResolvedValue({ count: 2 });
    prismaMock.dataset.findUniqueOrThrow.mockResolvedValue(mockDataset as any);

    await createDataset(validInput);
    expect(prismaMock.dataset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: "test-dataset" }),
      })
    );
  });

  it("creates keywords in the same transaction", async () => {
    prismaMock.dataset.create.mockResolvedValue(mockDataset as any);
    prismaMock.datasetKeyword.createMany.mockResolvedValue({ count: 2 });
    prismaMock.dataset.findUniqueOrThrow.mockResolvedValue(mockDataset as any);

    await createDataset(validInput);
    expect(prismaMock.datasetKeyword.createMany).toHaveBeenCalledWith({
      data: [
        { keyword: "test", datasetId: "ds-1" },
        { keyword: "data", datasetId: "ds-1" },
      ],
    });
  });

  it("sets modified to current date", async () => {
    prismaMock.dataset.create.mockResolvedValue(mockDataset as any);
    prismaMock.datasetKeyword.createMany.mockResolvedValue({ count: 2 });
    prismaMock.dataset.findUniqueOrThrow.mockResolvedValue(mockDataset as any);

    const before = new Date();
    await createDataset(validInput);
    const createCall = prismaMock.dataset.create.mock.calls[0][0];
    const modified = createCall.data.modified as Date;
    expect(modified.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("uses custom identifier when provided", async () => {
    prismaMock.dataset.create.mockResolvedValue(mockDataset as any);
    prismaMock.datasetKeyword.createMany.mockResolvedValue({ count: 2 });
    prismaMock.dataset.findUniqueOrThrow.mockResolvedValue(mockDataset as any);

    await createDataset({ ...validInput, identifier: "CUSTOM-ID-001" });
    expect(prismaMock.dataset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ identifier: "CUSTOM-ID-001" }),
      })
    );
  });

  it("auto-generates UUID identifier when omitted", async () => {
    prismaMock.dataset.create.mockResolvedValue(mockDataset as any);
    prismaMock.datasetKeyword.createMany.mockResolvedValue({ count: 2 });
    prismaMock.dataset.findUniqueOrThrow.mockResolvedValue(mockDataset as any);

    await createDataset(validInput);
    // When identifier is not provided, it should be undefined (Prisma uses @default(uuid()))
    expect(prismaMock.dataset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ identifier: undefined }),
      })
    );
  });

  it("rejects invalid input with descriptive errors", async () => {
    await expect(
      createDataset({ ...validInput, title: "", keywords: [] })
    ).rejects.toThrow();
  });
});

describe("updateDataset", () => {
  it("updates modified timestamp", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue(mockDataset as any);
    prismaMock.dataset.update.mockResolvedValue(mockDataset as any);
    prismaMock.dataset.findUniqueOrThrow.mockResolvedValue(mockDataset as any);

    const before = new Date();
    await updateDataset("ds-1", { title: "Updated Title" });
    const updateCall = prismaMock.dataset.update.mock.calls[0][0];
    const modified = updateCall.data.modified as Date;
    expect(modified.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("syncs keywords (deletes old, creates new)", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue(mockDataset as any);
    prismaMock.dataset.update.mockResolvedValue(mockDataset as any);
    prismaMock.datasetKeyword.deleteMany.mockResolvedValue({ count: 2 });
    prismaMock.datasetKeyword.createMany.mockResolvedValue({ count: 1 });
    prismaMock.dataset.findUniqueOrThrow.mockResolvedValue(mockDataset as any);

    await updateDataset("ds-1", { keywords: ["new-keyword"] });
    expect(prismaMock.datasetKeyword.deleteMany).toHaveBeenCalledWith({
      where: { datasetId: "ds-1" },
    });
    expect(prismaMock.datasetKeyword.createMany).toHaveBeenCalledWith({
      data: [{ keyword: "new-keyword", datasetId: "ds-1" }],
    });
  });
});

describe("deleteDataset", () => {
  it("soft-deletes by setting deletedAt via update", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue(mockDataset as any);
    prismaMock.dataset.update.mockResolvedValue(mockDataset as any);
    await deleteDataset("ds-1");
    expect(prismaMock.dataset.update).toHaveBeenCalledWith({
      where: { id: "ds-1" },
      data: { deletedAt: expect.any(Date) },
    });
    expect(prismaMock.dataset.delete).not.toHaveBeenCalled();
  });

  it("skips already-deleted datasets", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue({
      ...mockDataset,
      deletedAt: new Date(),
    } as any);
    await deleteDataset("ds-1");
    expect(prismaMock.dataset.update).not.toHaveBeenCalled();
  });
});

describe("getDataset", () => {
  it("returns null for non-existent ID", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue(null);
    const result = await getDataset("nonexistent");
    expect(result).toBeNull();
  });

  it("returns null for soft-deleted dataset", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue({
      ...mockDataset,
      deletedAt: new Date(),
    } as any);
    const result = await getDataset("ds-1");
    expect(result).toBeNull();
  });
});

describe("getDatasetBySlug", () => {
  it("includes publisher, distributions, keywords", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue(mockDataset as any);
    await getDatasetBySlug("test-dataset");
    expect(prismaMock.dataset.findUnique).toHaveBeenCalledWith({
      where: { slug: "test-dataset" },
      include: {
        publisher: { include: { parent: true } },
        distributions: true,
        keywords: true,
        themes: { include: { theme: true } },
        series: true,
        customFieldValues: { include: { definition: true } },
      },
    });
  });

  it("returns null for soft-deleted dataset", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue({
      ...mockDataset,
      deletedAt: new Date(),
    } as any);
    const result = await getDatasetBySlug("test-dataset");
    expect(result).toBeNull();
  });
});

describe("listDatasets", () => {
  it("returns paginated results with total count", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([mockDataset as any]);
    prismaMock.dataset.count.mockResolvedValue(1);

    const result = await listDatasets({ page: 1, limit: 20 });
    expect(result).toHaveProperty("datasets");
    expect(result).toHaveProperty("total");
    expect(result.total).toBe(1);
  });

  it("applies search filter", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([]);
    prismaMock.dataset.count.mockResolvedValue(0);

    await listDatasets({ search: "climate" });
    const call = prismaMock.dataset.findMany.mock.calls[0][0];
    expect(call?.where).toHaveProperty("AND");
  });

  it("applies organizationId filter", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([]);
    prismaMock.dataset.count.mockResolvedValue(0);

    await listDatasets({ organizationId: "org-1" });
    const call = prismaMock.dataset.findMany.mock.calls[0][0];
    expect(call?.where).toHaveProperty("publisherId", "org-1");
  });

  it("applies status filter", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([]);
    prismaMock.dataset.count.mockResolvedValue(0);

    await listDatasets({ status: "draft" });
    const call = prismaMock.dataset.findMany.mock.calls[0][0];
    expect(call?.where).toHaveProperty("status", "draft");
  });

  it("applies sort parameter", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([]);
    prismaMock.dataset.count.mockResolvedValue(0);

    await listDatasets({ sort: "title_asc" });
    const call = prismaMock.dataset.findMany.mock.calls[0][0];
    expect(call?.orderBy).toEqual({ title: "asc" });
  });

  it("defaults to modified_desc when no sort provided", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([]);
    prismaMock.dataset.count.mockResolvedValue(0);

    await listDatasets();
    const call = prismaMock.dataset.findMany.mock.calls[0][0];
    expect(call?.orderBy).toEqual({ modified: "desc" });
  });

  it("always includes deletedAt: null filter", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([]);
    prismaMock.dataset.count.mockResolvedValue(0);

    await listDatasets();
    const call = prismaMock.dataset.findMany.mock.calls[0][0];
    expect(call?.where).toHaveProperty("deletedAt", null);
  });
});

describe("listDeletedDatasets", () => {
  it("returns only deleted datasets", async () => {
    const deletedDataset = { ...mockDataset, deletedAt: new Date() };
    prismaMock.dataset.findMany.mockResolvedValue([deletedDataset as any]);
    prismaMock.dataset.count.mockResolvedValue(1);

    const result = await listDeletedDatasets();
    expect(result.total).toBe(1);
    const call = prismaMock.dataset.findMany.mock.calls[0][0];
    expect(call?.where).toHaveProperty("deletedAt", { not: null });
  });

  it("supports search parameter", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([]);
    prismaMock.dataset.count.mockResolvedValue(0);

    await listDeletedDatasets({ search: "test" });
    const call = prismaMock.dataset.findMany.mock.calls[0][0];
    expect(call?.where).toHaveProperty("AND");
    expect(call?.where).toHaveProperty("deletedAt", { not: null });
  });

  it("supports pagination", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([]);
    prismaMock.dataset.count.mockResolvedValue(0);

    await listDeletedDatasets({ page: 2, limit: 10 });
    const call = prismaMock.dataset.findMany.mock.calls[0][0];
    expect(call?.skip).toBe(10);
    expect(call?.take).toBe(10);
  });
});

describe("restoreDataset", () => {
  it("clears deletedAt", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue({
      ...mockDataset,
      deletedAt: new Date(),
    } as any);
    prismaMock.dataset.update.mockResolvedValue(mockDataset as any);

    await restoreDataset("ds-1");
    expect(prismaMock.dataset.update).toHaveBeenCalledWith({
      where: { id: "ds-1" },
      data: { deletedAt: null },
    });
  });

  it("throws if dataset is not in trash", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue(mockDataset as any);
    await expect(restoreDataset("ds-1")).rejects.toThrow("not in trash");
  });

  it("throws if dataset not found", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue(null);
    await expect(restoreDataset("nonexistent")).rejects.toThrow("not found");
  });
});

describe("purgeDataset", () => {
  it("calls prisma.dataset.delete for trashed dataset", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue({
      ...mockDataset,
      deletedAt: new Date(),
    } as any);
    prismaMock.dataset.delete.mockResolvedValue(mockDataset as any);

    await purgeDataset("ds-1");
    expect(prismaMock.dataset.delete).toHaveBeenCalledWith({
      where: { id: "ds-1" },
    });
  });

  it("throws if dataset is not in trash", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue(mockDataset as any);
    await expect(purgeDataset("ds-1")).rejects.toThrow("Cannot purge a live dataset");
  });

  it("throws if dataset not found", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue(null);
    await expect(purgeDataset("nonexistent")).rejects.toThrow("not found");
  });
});

describe("updateDataset", () => {
  it("throws if dataset is soft-deleted", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue({
      ...mockDataset,
      deletedAt: new Date(),
    } as any);
    await expect(updateDataset("ds-1", { title: "New" })).rejects.toThrow(
      "Cannot update a deleted dataset"
    );
  });
});
