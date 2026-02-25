import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", async () => ({
  prisma: (await import("@/__mocks__/prisma")).default,
}));

vi.mock("@/lib/services/settings", () => ({
  getSetting: vi.fn(() => "false"),
  SETTING_KEYS: [],
  initSettingsCache: vi.fn(),
}));

import { prismaMock } from "@/__mocks__/prisma";
import { getOrgDashboardData } from "./org-dashboard";
import type { DatasetWithRelations } from "@/lib/schemas/dcat-us";

function makeDataset(overrides: Partial<DatasetWithRelations> = {}): DatasetWithRelations {
  return {
    id: "a1b2c3d4-e5f6-1234-a567-123456789abc",
    slug: "test-dataset",
    title: "Census Dataset 2024",
    description: "A comprehensive dataset containing census data for all US states",
    modified: new Date("2024-01-15"),
    accessLevel: "public",
    identifier: "TEST-001",
    publisherId: "org-1",
    contactName: "Jane Smith",
    contactEmail: "jane@example.gov",
    bureauCode: null,
    programCode: null,
    license: "https://creativecommons.org/publicdomain/zero/1.0/",
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
    updatedAt: new Date("2024-01-15"),
    workflowStatus: "published",
    reviewerId: null,
    reviewNote: null,
    submittedAt: null,
    reviewedAt: null,
    publishedAt: new Date("2024-01-10"),
    version: null,
    versionNotes: null,
    seriesId: null,
    previousVersion: null,
    harvestSourceId: null,
    harvestIdentifier: null,
    publisher: {
      id: "org-1",
      name: "Census Bureau",
      slug: "census-bureau",
      description: null,
      imageUrl: null,
      parentId: null,
      parent: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    distributions: [
      {
        id: "dist-1",
        title: "CSV Download",
        description: "Full data",
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
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    ],
    keywords: [
      { id: "k1", keyword: "census", datasetId: "a1b2c3d4-e5f6-1234-a567-123456789abc" },
    ],
    themes: [
      {
        id: "dt1",
        datasetId: "a1b2c3d4-e5f6-1234-a567-123456789abc",
        themeId: "t1",
        theme: { id: "t1", name: "Demographics", slug: "demographics", description: null, color: null, createdAt: new Date(), updatedAt: new Date() },
      },
    ],
    ...overrides,
  } as DatasetWithRelations;
}

const mockOrg = {
  id: "org-1",
  name: "Census Bureau",
  slug: "census-bureau",
  description: "Official census data",
  imageUrl: null,
  createdAt: new Date("2024-01-01"),
};

const mockMembers = [
  { id: "u1", name: "Alice", email: "alice@example.gov", role: "orgAdmin" },
  { id: "u2", name: "Bob", email: "bob@example.gov", role: "editor" },
];

function setupDefaultMocks(datasets: DatasetWithRelations[] = []) {
  prismaMock.organization.findUnique.mockResolvedValue(mockOrg as any);
  prismaMock.user.findMany.mockResolvedValue(mockMembers as any);
  prismaMock.dataset.findMany.mockResolvedValue(datasets as any);
  prismaMock.activityLog.findMany.mockResolvedValue([]);
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getOrgDashboardData", () => {
  it("returns null for missing org", async () => {
    prismaMock.organization.findUnique.mockResolvedValue(null);
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.dataset.findMany.mockResolvedValue([] as any);

    const result = await getOrgDashboardData("nonexistent");
    expect(result).toBeNull();
  });

  it("returns organization details", async () => {
    setupDefaultMocks([]);

    const result = await getOrgDashboardData("org-1");
    expect(result).not.toBeNull();
    expect(result!.organization.name).toBe("Census Bureau");
    expect(result!.organization.slug).toBe("census-bureau");
    expect(result!.organization.description).toBe("Official census data");
  });

  it("returns members list", async () => {
    setupDefaultMocks([]);

    const result = await getOrgDashboardData("org-1");
    expect(result!.members).toHaveLength(2);
    expect(result!.members[0].name).toBe("Alice");
    expect(result!.members[1].role).toBe("editor");
  });

  it("counts datasets by status", async () => {
    const datasets = [
      makeDataset({ id: "d1", status: "published" }),
      makeDataset({ id: "d2", status: "published" }),
      makeDataset({ id: "d3", status: "draft" }),
      makeDataset({ id: "d4", status: "archived" }),
    ];
    setupDefaultMocks(datasets);

    const result = await getOrgDashboardData("org-1");
    expect(result!.datasetCounts).toEqual({
      draft: 1,
      published: 2,
      archived: 1,
      total: 4,
    });
  });

  it("computes average quality score for published datasets only", async () => {
    const published = makeDataset({
      id: "d1",
      status: "published",
      title: "Complete Census Dataset 2024",
      description: "A comprehensive dataset containing census data for all US states and territories",
      contactName: "Jane",
      contactEmail: "jane@gov.us",
      license: "https://example.com/license",
      spatial: "US",
      temporal: "2024/2025",
      accrualPeriodicity: "R/P1Y",
      conformsTo: "https://example.com",
      describedBy: "https://example.com/dict",
      landingPage: "https://example.com",
      keywords: [
        { id: "k1", keyword: "a", datasetId: "d1" },
        { id: "k2", keyword: "b", datasetId: "d1" },
        { id: "k3", keyword: "c", datasetId: "d1" },
      ],
    });
    const draft = makeDataset({
      id: "d2",
      status: "draft",
      title: "",
      description: "",
      contactName: null,
      contactEmail: null,
      license: null,
      distributions: [],
      keywords: [],
      themes: [],
    });
    setupDefaultMocks([published, draft]);

    const result = await getOrgDashboardData("org-1");
    // Only published dataset contributes to avg — should score 100
    expect(result!.avgQualityScore).toBe(100);
  });

  it("returns 0 avg quality when no published datasets", async () => {
    const draft = makeDataset({ id: "d1", status: "draft" });
    setupDefaultMocks([draft]);

    const result = await getOrgDashboardData("org-1");
    expect(result!.avgQualityScore).toBe(0);
  });

  it("returns top datasets sorted by quality descending", async () => {
    const high = makeDataset({
      id: "d1",
      title: "High Quality Dataset With Full Metadata",
      description: "A comprehensive dataset with all metadata fields properly filled",
      contactName: "Jane",
      contactEmail: "jane@gov.us",
      license: "https://example.com/license",
    });
    const low = makeDataset({
      id: "d2",
      title: "Low Quality Dataset",
      description: "",
      contactName: null,
      contactEmail: null,
      license: null,
      distributions: [],
      keywords: [],
      themes: [],
    });
    setupDefaultMocks([low, high]);

    const result = await getOrgDashboardData("org-1");
    expect(result!.topDatasets).toHaveLength(2);
    expect(result!.topDatasets[0].qualityScore).toBeGreaterThan(result!.topDatasets[1].qualityScore);
  });

  it("queries activity log with OR clause for datasets and org", async () => {
    const ds = makeDataset({ id: "d1" });
    setupDefaultMocks([ds]);
    prismaMock.activityLog.findMany.mockResolvedValue([
      { id: "a1", action: "dataset:updated", entityType: "dataset", entityId: "d1", entityName: "Test", userId: null, userName: null, details: null, createdAt: new Date() },
    ] as any);

    const result = await getOrgDashboardData("org-1");
    expect(result!.recentActivity).toHaveLength(1);

    const call = prismaMock.activityLog.findMany.mock.calls[0][0];
    expect(call?.where).toHaveProperty("OR");
    const orClause = (call?.where as any).OR;
    expect(orClause).toHaveLength(2);
    expect(orClause[0]).toEqual({ entityType: "dataset", entityId: { in: ["d1"] } });
    expect(orClause[1]).toEqual({ entityType: "organization", entityId: "org-1" });
  });

  it("queries activity for org only when no datasets", async () => {
    setupDefaultMocks([]);

    await getOrgDashboardData("org-1");

    const call = prismaMock.activityLog.findMany.mock.calls[0][0];
    expect(call?.where).toEqual({ entityType: "organization", entityId: "org-1" });
  });

  it("handles empty state (no members, no datasets)", async () => {
    prismaMock.organization.findUnique.mockResolvedValue(mockOrg as any);
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.dataset.findMany.mockResolvedValue([] as any);
    prismaMock.activityLog.findMany.mockResolvedValue([]);

    const result = await getOrgDashboardData("org-1");
    expect(result!.members).toHaveLength(0);
    expect(result!.datasetCounts.total).toBe(0);
    expect(result!.topDatasets).toHaveLength(0);
    expect(result!.avgQualityScore).toBe(0);
    expect(result!.recentActivity).toHaveLength(0);
  });
});
