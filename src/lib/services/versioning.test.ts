import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockFindMany = vi.fn();
const mockVersionFindUnique = vi.fn();
const mockOrgFindFirst = vi.fn();
const mockThemeFindMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    dataset: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    datasetVersion: {
      create: (...args: unknown[]) => mockCreate(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockVersionFindUnique(...args),
    },
    organization: {
      findFirst: (...args: unknown[]) => mockOrgFindFirst(...args),
    },
    theme: {
      findMany: (...args: unknown[]) => mockThemeFindMany(...args),
    },
  },
}));

vi.mock("@/lib/services/activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
  computeDiff: vi.fn().mockReturnValue({}),
}));

const mockUpdateDataset = vi.fn().mockResolvedValue({});
vi.mock("@/lib/actions/datasets", () => ({
  updateDataset: (...args: unknown[]) => mockUpdateDataset(...args),
}));

vi.mock("@/lib/plugins/hooks", () => ({
  hooks: { run: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/lib/plugins/loader", () => ({
  isPluginsEnabled: vi.fn().mockReturnValue(false),
}));

import {
  createVersion,
  compareVersions,
  getVersionById,
  revertToVersion,
} from "./versioning";

const mockDataset = {
  id: "a1b2c3d4-e5f6-1234-a567-123456789abc",
  slug: "test-dataset",
  title: "Test Dataset",
  description: "A test dataset description",
  modified: new Date("2024-06-01"),
  accessLevel: "public",
  identifier: "TEST-001",
  publisherId: "pub-1",
  contactName: "Jane",
  contactEmail: "jane@example.gov",
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
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-06-01"),
  harvestSourceId: null,
  harvestIdentifier: null,
  publisher: {
    id: "pub-1",
    name: "Test Agency",
    slug: "test-agency",
    description: null,
    imageUrl: null,
    parentId: null,
    parent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  distributions: [
    {
      id: "dist-1",
      title: "CSV File",
      description: null,
      downloadURL: "https://example.gov/data.csv",
      accessURL: null,
      mediaType: "text/csv",
      format: "CSV",
      conformsTo: null,
      describedBy: null,
      fileName: null,
      filePath: null,
      fileSize: null,
      datasetId: "a1b2c3d4-e5f6-1234-a567-123456789abc",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  keywords: [
    {
      id: "k1",
      keyword: "test",
      datasetId: "a1b2c3d4-e5f6-1234-a567-123456789abc",
    },
  ],
  themes: [],
};

describe("createVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("snapshots full dataset metadata as JSON", async () => {
    mockFindUnique.mockResolvedValue(mockDataset);
    mockCreate.mockImplementation(({ data }) => Promise.resolve({
      id: "ver-1",
      ...data,
      createdAt: new Date(),
    }));

    const result = await createVersion(
      mockDataset.id,
      "1.0.0",
      "Initial release"
    );

    const snapshot = JSON.parse(result.snapshot);
    expect(snapshot["@type"]).toBe("dcat:Dataset");
    expect(snapshot.title).toBe("Test Dataset");
    expect(snapshot.description).toBe("A test dataset description");
    expect(snapshot.identifier).toBe("TEST-001");
    expect(snapshot.distribution).toHaveLength(1);
    expect(snapshot.distribution[0].downloadURL).toBe(
      "https://example.gov/data.csv"
    );
  });

  it("stores version string on record", async () => {
    mockFindUnique.mockResolvedValue(mockDataset);
    mockCreate.mockImplementation(({ data }) => Promise.resolve({
      id: "ver-1",
      ...data,
      createdAt: new Date(),
    }));

    await createVersion(mockDataset.id, "2.0.0", "Major update", "user-1");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          version: "2.0.0",
          datasetId: mockDataset.id,
          createdById: "user-1",
        }),
      })
    );
  });
});

describe("compareVersions", () => {
  it("detects changed fields", () => {
    const snapshotA = JSON.stringify({
      "@type": "dcat:Dataset",
      title: "Old Title",
      description: "Same description",
    });
    const snapshotB = JSON.stringify({
      "@type": "dcat:Dataset",
      title: "New Title",
      description: "Same description",
    });

    const diffs = compareVersions(snapshotA, snapshotB);

    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toEqual({
      field: "title",
      from: "Old Title",
      to: "New Title",
    });
  });

  it("handles added/removed distributions", () => {
    const snapshotA = JSON.stringify({
      "@type": "dcat:Dataset",
      title: "Dataset",
      distribution: [
        { "@type": "dcat:Distribution", title: "CSV", format: "CSV" },
      ],
    });
    const snapshotB = JSON.stringify({
      "@type": "dcat:Dataset",
      title: "Dataset",
      distribution: [
        { "@type": "dcat:Distribution", title: "CSV", format: "CSV" },
        { "@type": "dcat:Distribution", title: "JSON", format: "JSON" },
      ],
    });

    const diffs = compareVersions(snapshotA, snapshotB);

    expect(diffs).toHaveLength(1);
    expect(diffs[0].field).toBe("distribution");
    expect(diffs[0].from).toHaveLength(1);
    expect(diffs[0].to).toHaveLength(2);
  });
});

describe("getVersionById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns version record by ID", async () => {
    const mockVersion = {
      id: "ver-1",
      datasetId: "ds-1",
      version: "1.0.0",
      snapshot: "{}",
      changelog: null,
      createdAt: new Date(),
      createdById: null,
    };
    mockVersionFindUnique.mockResolvedValue(mockVersion);

    const result = await getVersionById("ver-1");

    expect(result).toEqual(mockVersion);
    expect(mockVersionFindUnique).toHaveBeenCalledWith({
      where: { id: "ver-1" },
    });
  });

  it("returns null for missing ID", async () => {
    mockVersionFindUnique.mockResolvedValue(null);

    const result = await getVersionById("nonexistent");

    expect(result).toBeNull();
  });
});

describe("revertToVersion", () => {
  const datasetId = "a1b2c3d4-e5f6-1234-a567-123456789abc";
  const versionId = "ver-1";
  const snapshotData = {
    "@type": "dcat:Dataset",
    title: "Old Title",
    description: "Old description",
    identifier: "TEST-001",
    accessLevel: "public",
    modified: "2024-01-01",
    keyword: ["old-keyword"],
    theme: ["Government"],
    publisher: {
      "@type": "org:Organization",
      name: "Test Agency",
    },
    contactPoint: {
      "@type": "vcard:Contact",
      fn: "Jane",
      hasEmail: "mailto:jane@example.gov",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls updateDataset with reversed snapshot fields", async () => {
    mockVersionFindUnique.mockResolvedValue({
      id: versionId,
      datasetId,
      version: "1.0.0",
      snapshot: JSON.stringify(snapshotData),
      changelog: null,
      createdAt: new Date(),
      createdById: null,
    });
    mockOrgFindFirst.mockResolvedValue({ id: "pub-1", name: "Test Agency" });
    mockThemeFindMany.mockResolvedValue([
      { id: "theme-1", name: "Government" },
    ]);
    // Mock for createVersion's dataset lookup
    mockFindUnique.mockResolvedValue(mockDataset);
    mockCreate.mockImplementation(({ data }) =>
      Promise.resolve({ id: "ver-new", ...data, createdAt: new Date() })
    );

    await revertToVersion(datasetId, versionId, "user-1");

    expect(mockUpdateDataset).toHaveBeenCalledWith(
      datasetId,
      expect.objectContaining({
        title: "Old Title",
        description: "Old description",
        identifier: "TEST-001",
        accessLevel: "public",
        keywords: ["old-keyword"],
        themeIds: ["theme-1"],
      })
    );
  });

  it("auto-creates new version with revert changelog", async () => {
    mockVersionFindUnique.mockResolvedValue({
      id: versionId,
      datasetId,
      version: "1.0.0",
      snapshot: JSON.stringify(snapshotData),
      changelog: null,
      createdAt: new Date(),
      createdById: null,
    });
    mockOrgFindFirst.mockResolvedValue({ id: "pub-1", name: "Test Agency" });
    mockThemeFindMany.mockResolvedValue([]);
    mockFindUnique.mockResolvedValue(mockDataset);
    mockCreate.mockImplementation(({ data }) =>
      Promise.resolve({ id: "ver-new", ...data, createdAt: new Date() })
    );

    await revertToVersion(datasetId, versionId, "user-1");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          datasetId,
          changelog: "Reverted to v1.0.0",
          createdById: "user-1",
        }),
      })
    );
  });

  it("throws if version not found", async () => {
    mockVersionFindUnique.mockResolvedValue(null);

    await expect(
      revertToVersion(datasetId, "nonexistent")
    ).rejects.toThrow("Version not found");
  });
});
