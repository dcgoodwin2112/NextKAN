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

import {
  createDataset,
  updateDataset,
  deleteDataset,
  getDataset,
  getDatasetBySlug,
  listDatasets,
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
  it("calls Prisma delete", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue(mockDataset as any);
    prismaMock.dataset.delete.mockResolvedValue(mockDataset as any);
    await deleteDataset("ds-1");
    expect(prismaMock.dataset.delete).toHaveBeenCalledWith({
      where: { id: "ds-1" },
    });
  });
});

describe("getDataset", () => {
  it("returns null for non-existent ID", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue(null);
    const result = await getDataset("nonexistent");
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
      },
    });
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
});
