// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", async () => {
  const mock = await import("@/__mocks__/prisma");
  return { prisma: mock.default };
});

vi.mock("@/lib/actions/datasets", () => ({
  createDataset: vi.fn(),
  updateDataset: vi.fn(),
  addDistribution: vi.fn(),
}));

vi.mock("@/lib/services/activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
  computeDiff: vi.fn(),
}));

vi.mock("@/lib/services/email", () => ({
  getEmailService: () => ({ send: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("@/lib/email-templates/harvest-complete", () => ({
  harvestCompleteEmail: vi.fn().mockReturnValue({
    subject: "",
    text: "",
    html: "",
  }),
}));

vi.mock("@/lib/email-templates/dataset-created", () => ({
  datasetCreatedEmail: vi.fn().mockReturnValue({
    subject: "",
    text: "",
    html: "",
  }),
}));

import { prismaMock } from "@/__mocks__/prisma";
import { createDataset, updateDataset, addDistribution } from "@/lib/actions/datasets";
import { runHarvest } from "./harvest";

const mockCreateDataset = createDataset as ReturnType<typeof vi.fn>;
const mockUpdateDataset = updateDataset as ReturnType<typeof vi.fn>;
const mockAddDistribution = addDistribution as ReturnType<typeof vi.fn>;

const mockSource = {
  id: "source-1",
  name: "Test Source",
  url: "http://example.com/data.json",
  type: "dcat-us",
  schedule: null,
  enabled: true,
  organizationId: "a1b2c3d4-e5f6-1234-a567-123456789abc",
  lastHarvestAt: null,
  lastStatus: null,
  lastErrorMsg: null,
  datasetCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCatalog = {
  "@context": "https://project-open-data.cio.gov/v1.1/schema/catalog.jsonld",
  "@id": "http://example.com/data.json",
  "@type": "dcat:Catalog",
  conformsTo: "https://project-open-data.cio.gov/v1.1/schema",
  describedBy: "https://project-open-data.cio.gov/v1.1/schema/catalog.json",
  dataset: [
    {
      "@type": "dcat:Dataset",
      title: "Remote Dataset 1",
      description: "A remote dataset",
      keyword: ["remote"],
      modified: "2024-01-01",
      publisher: { "@type": "org:Organization", name: "Remote Org" },
      contactPoint: {
        "@type": "vcard:Contact",
        fn: "Contact",
        hasEmail: "mailto:contact@example.com",
      },
      identifier: "remote-1",
      accessLevel: "public",
      distribution: [
        {
          "@type": "dcat:Distribution",
          downloadURL: "http://example.com/data.csv",
          mediaType: "text/csv",
        },
      ],
    },
  ],
};

describe("harvest service", () => {
  beforeEach(() => {
    mockCreateDataset.mockReset();
    mockUpdateDataset.mockReset();
    mockAddDistribution.mockReset();
    vi.clearAllMocks();

    // Default mocks
    (prismaMock.harvestSource.findUniqueOrThrow as any).mockResolvedValue(mockSource);
    (prismaMock.harvestJob.create as any).mockResolvedValue({ id: "job-1" });
    (prismaMock.harvestJob.update as any).mockResolvedValue({});
    (prismaMock.harvestSource.update as any).mockResolvedValue({});
    (prismaMock.dataset.findFirst as any).mockResolvedValue(null);
    (prismaMock.dataset.findMany as any).mockResolvedValue([]);
    (prismaMock.dataset.update as any).mockResolvedValue({});

    mockCreateDataset.mockResolvedValue({
      id: "ds-new",
      title: "Remote Dataset 1",
      slug: "remote-dataset-1",
      status: "published",
      publisher: { name: "Org" },
      keywords: [],
      distributions: [],
      themes: [],
    });
    mockAddDistribution.mockResolvedValue({ id: "dist-1" });
  });

  it("fetches URL and creates datasets", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCatalog,
    });

    const result = await runHarvest("source-1");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://example.com/data.json",
      expect.any(Object)
    );
    expect(result.datasetsCreated).toBe(1);
    expect(mockCreateDataset).toHaveBeenCalled();
  });

  it("creates distributions for new datasets", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCatalog,
    });

    await runHarvest("source-1");

    expect(mockAddDistribution).toHaveBeenCalledWith(
      "ds-new",
      expect.objectContaining({
        downloadURL: "http://example.com/data.csv",
        mediaType: "text/csv",
      })
    );
  });

  it("updates existing dataset when found", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCatalog,
    });

    (prismaMock.dataset.findFirst as any).mockResolvedValue({
      id: "existing-ds",
      harvestSourceId: "source-1",
      harvestIdentifier: "remote-1",
    });

    mockUpdateDataset.mockResolvedValue({});

    const result = await runHarvest("source-1");

    expect(result.datasetsUpdated).toBe(1);
    expect(result.datasetsCreated).toBe(0);
    expect(mockUpdateDataset).toHaveBeenCalledWith(
      "existing-ds",
      expect.objectContaining({ title: "Remote Dataset 1" })
    );
  });

  it("archives local datasets not in remote", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockCatalog,
        dataset: [], // Empty remote
      }),
    });

    (prismaMock.dataset.findMany as any).mockResolvedValue([
      { id: "local-1", harvestIdentifier: "old-dataset" },
    ]);

    const result = await runHarvest("source-1");

    expect(result.datasetsDeleted).toBe(1);
    expect(prismaMock.dataset.update).toHaveBeenCalledWith({
      where: { id: "local-1" },
      data: { status: "archived" },
    });
  });

  it("records harvest job", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCatalog,
    });

    await runHarvest("source-1");

    expect(prismaMock.harvestJob.create).toHaveBeenCalledWith({
      data: { sourceId: "source-1", status: "running" },
    });
    expect(prismaMock.harvestJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job-1" },
        data: expect.objectContaining({ status: "success" }),
      })
    );
  });

  it("handles fetch errors", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await runHarvest("source-1");

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Network error");
    expect(prismaMock.harvestJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "error" }),
      })
    );
  });

  it("handles malformed JSON response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });

    const result = await runHarvest("source-1");

    expect(result.errors).toHaveLength(1);
  });

  it("maps fields correctly from DCAT-US", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCatalog,
    });

    await runHarvest("source-1");

    expect(mockCreateDataset).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Remote Dataset 1",
        description: "A remote dataset",
        keywords: ["remote"],
        accessLevel: "public",
        contactName: "Contact",
        contactEmail: "contact@example.com",
      })
    );
  });
});
