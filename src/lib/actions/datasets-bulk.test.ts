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

vi.mock("@/lib/plugins/hooks", () => ({
  hooks: { run: vi.fn().mockResolvedValue([]) },
}));
vi.mock("@/lib/plugins/loader", () => ({
  isPluginsEnabled: vi.fn().mockReturnValue(false),
}));

import { bulkUpdateDatasets, bulkDeleteDatasets } from "./datasets";
import { logActivity } from "@/lib/services/activity";

const id1 = "a1b2c3d4-e5f6-1234-a567-123456789abc";
const id2 = "b2c3d4e5-f6a7-2345-b678-234567890bcd";

const makeDataset = (id: string, overrides = {}) => ({
  id,
  title: `Dataset ${id.slice(0, 4)}`,
  slug: `dataset-${id.slice(0, 4)}`,
  description: "Test",
  status: "draft",
  deletedAt: null,
  modified: new Date(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
});

describe("bulkUpdateDatasets", () => {
  it("updates status for multiple datasets", async () => {
    prismaMock.dataset.findUnique
      .mockResolvedValueOnce(makeDataset(id1) as any)
      .mockResolvedValueOnce(makeDataset(id2) as any);
    prismaMock.dataset.update.mockResolvedValue({} as any);

    const result = await bulkUpdateDatasets([id1, id2], { status: "published" });

    expect(result.success).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(prismaMock.dataset.update).toHaveBeenCalledTimes(2);
    expect(logActivity).toHaveBeenCalledTimes(2);
  });

  it("skips deleted datasets", async () => {
    prismaMock.dataset.findUnique.mockResolvedValueOnce(
      makeDataset(id1, { deletedAt: new Date() }) as any
    );
    prismaMock.dataset.update.mockResolvedValue({} as any);

    const result = await bulkUpdateDatasets([id1], { status: "published" });

    expect(result.success).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("not found or deleted");
  });

  it("skips non-existent datasets", async () => {
    prismaMock.dataset.findUnique.mockResolvedValueOnce(null);

    const result = await bulkUpdateDatasets([id1], { status: "draft" });

    expect(result.success).toBe(0);
    expect(result.errors).toHaveLength(1);
  });

  it("supports org change", async () => {
    const newOrgId = "c3d4e5f6-a7b8-3456-a789-345678901cde";
    prismaMock.dataset.findUnique.mockResolvedValueOnce(makeDataset(id1) as any);
    prismaMock.dataset.update.mockResolvedValue({} as any);

    const result = await bulkUpdateDatasets([id1], { publisherId: newOrgId });

    expect(result.success).toBe(1);
    expect(prismaMock.dataset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ publisherId: newOrgId }),
      })
    );
  });
});

describe("bulkDeleteDatasets", () => {
  it("soft deletes multiple datasets", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([
      makeDataset(id1),
      makeDataset(id2),
    ] as any);
    prismaMock.dataset.updateMany.mockResolvedValue({ count: 2 });

    const result = await bulkDeleteDatasets([id1, id2]);

    expect(result.success).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(prismaMock.dataset.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
    expect(logActivity).toHaveBeenCalledTimes(2);
  });

  it("reports already-deleted datasets", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([makeDataset(id1)] as any);
    prismaMock.dataset.updateMany.mockResolvedValue({ count: 1 });

    const result = await bulkDeleteDatasets([id1, id2]);

    expect(result.success).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("1 dataset(s)");
  });
});
