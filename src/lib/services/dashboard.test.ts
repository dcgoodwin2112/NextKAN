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
import { getSetting } from "@/lib/services/settings";
import { getDashboardData } from "./dashboard";
import type { DatasetWithRelations } from "@/lib/schemas/dcat-us";

const mockedGetSetting = vi.mocked(getSetting);

function makeDataset(overrides: Partial<DatasetWithRelations> = {}): DatasetWithRelations {
  return {
    id: "a1b2c3d4-e5f6-1234-a567-123456789abc",
    slug: "test-dataset",
    title: "Census Dataset 2024",
    description: "A comprehensive dataset containing census data for all US states",
    modified: new Date("2024-01-15"),
    accessLevel: "public",
    identifier: "TEST-001",
    publisherId: "pub-1",
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
      id: "pub-1",
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

function setupDefaultMocks(datasets: DatasetWithRelations[] = []) {
  prismaMock.dataset.findMany.mockResolvedValue(datasets as any);
  prismaMock.analyticsEvent.count.mockResolvedValue(0);
  prismaMock.dataset.count.mockResolvedValue(0);
  prismaMock.comment.findMany.mockResolvedValue([]);
  prismaMock.harvestJob.findMany.mockResolvedValue([]);
  prismaMock.dataDictionary.count.mockResolvedValue(0);
  prismaMock.distribution.count.mockResolvedValue(0);
  prismaMock.organization.findMany.mockResolvedValue([]);
  prismaMock.analyticsEvent.findMany.mockResolvedValue([]);
  prismaMock.activityLog.findMany.mockResolvedValue([]);
}

beforeEach(() => {
  vi.resetAllMocks();
  mockedGetSetting.mockReturnValue("false");
});

describe("getDashboardData — stats", () => {
  it("returns published dataset count", async () => {
    const ds1 = makeDataset({ id: "d1", status: "published" });
    const ds2 = makeDataset({ id: "d2", status: "draft" });
    setupDefaultMocks([ds1, ds2]);

    const data = await getDashboardData();
    expect(data.stats.publishedCount).toBe(1);
  });

  it("computes positive publishing trend", async () => {
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 86400000);
    const ds1 = makeDataset({ id: "d1", publishedAt: tenDaysAgo });
    const ds2 = makeDataset({ id: "d2", publishedAt: tenDaysAgo });
    setupDefaultMocks([ds1, ds2]);

    const data = await getDashboardData();
    // 2 in current 30d, 0 in prior 30d → trend = +2
    expect(data.stats.publishedTrend).toBe(2);
  });

  it("computes negative publishing trend", async () => {
    const now = new Date();
    const fortyDaysAgo = new Date(now.getTime() - 40 * 86400000);
    const ds1 = makeDataset({ id: "d1", publishedAt: fortyDaysAgo });
    setupDefaultMocks([ds1]);

    const data = await getDashboardData();
    // 0 in current 30d, 1 in prior 30d → trend = -1
    expect(data.stats.publishedTrend).toBe(-1);
  });

  it("returns zero trend when no publishedAt dates", async () => {
    const ds1 = makeDataset({ id: "d1", publishedAt: null });
    setupDefaultMocks([ds1]);

    const data = await getDashboardData();
    expect(data.stats.publishedTrend).toBe(0);
  });

  it("returns downloads this month from analytics count", async () => {
    setupDefaultMocks([]);
    prismaMock.analyticsEvent.count.mockResolvedValue(42);

    const data = await getDashboardData();
    expect(data.stats.downloadsThisMonth).toBe(42);
  });

  it("returns pendingReviewCount as null when workflow disabled", async () => {
    setupDefaultMocks([]);

    const data = await getDashboardData();
    expect(data.stats.pendingReviewCount).toBeNull();
  });

  it("returns avg quality score across all datasets", async () => {
    // A fully complete dataset scores 100, a minimal scores 0
    const complete = makeDataset({
      id: "d1",
      title: "Complete Census Dataset 2024",
      description: "A comprehensive dataset containing census data for all US states and territories with demographic breakdowns",
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
      distributions: [{
        id: "dist-1", title: "CSV", description: null, downloadURL: null, accessURL: null,
        mediaType: "text/csv", format: "CSV", conformsTo: null, describedBy: null,
        fileName: null, filePath: null, fileSize: null, datasetId: "d1",
        createdAt: new Date(), updatedAt: new Date(),
      }],
      themes: [{
        id: "dt1", datasetId: "d1", themeId: "t1",
        theme: { id: "t1", name: "Test", slug: "test", description: null, color: null, createdAt: new Date(), updatedAt: new Date() },
      }],
    });
    const minimal = makeDataset({
      id: "d2",
      title: "",
      description: "",
      contactName: null,
      contactEmail: null,
      license: null,
      distributions: [],
      keywords: [],
      themes: [],
      spatial: null,
      temporal: null,
      accrualPeriodicity: null,
      conformsTo: null,
      describedBy: null,
      landingPage: null,
    });
    setupDefaultMocks([complete, minimal]);

    const data = await getDashboardData();
    // Should be avg of 100 and 0 = 50
    expect(data.stats.avgQualityScore).toBe(50);
  });
});

describe("getDashboardData — action items", () => {
  it("returns pending review datasets sorted oldest first when workflow enabled", async () => {
    mockedGetSetting.mockImplementation((key: string) =>
      key === "ENABLE_WORKFLOW" ? "true" : "false"
    );
    setupDefaultMocks([]);
    prismaMock.dataset.findMany.mockResolvedValueOnce([] as any); // allDatasets
    prismaMock.dataset.findMany.mockResolvedValueOnce([
      { id: "d1", title: "Old", submittedAt: new Date("2024-01-01") },
      { id: "d2", title: "Newer", submittedAt: new Date("2024-06-01") },
    ] as any);
    prismaMock.dataset.count.mockResolvedValue(2);

    const data = await getDashboardData();
    expect(data.actionItems.pendingReview).toHaveLength(2);
    expect(data.actionItems.pendingReview[0].title).toBe("Old");
  });

  it("returns pendingComments as null when comments disabled", async () => {
    setupDefaultMocks([]);

    const data = await getDashboardData();
    expect(data.actionItems.pendingComments).toBeNull();
  });

  it("returns pending comment count and oldest when comments enabled", async () => {
    mockedGetSetting.mockImplementation((key: string) =>
      key === "ENABLE_COMMENTS" ? "true" : "false"
    );
    setupDefaultMocks([]);
    prismaMock.comment.findMany.mockResolvedValue([
      { id: "c1", createdAt: new Date("2024-01-15") },
      { id: "c2", createdAt: new Date("2024-03-01") },
    ] as any);

    const data = await getDashboardData();
    expect(data.actionItems.pendingComments).not.toBeNull();
    expect(data.actionItems.pendingComments!.count).toBe(2);
    expect(data.actionItems.pendingComments!.oldestId).toBe("c1");
  });

  it("returns failed harvests with source names, deduplicated", async () => {
    setupDefaultMocks([]);
    prismaMock.harvestJob.findMany.mockResolvedValue([
      { sourceId: "s1", source: { name: "Source A" }, errors: "timeout" },
      { sourceId: "s1", source: { name: "Source A" }, errors: "other" },
      { sourceId: "s2", source: { name: "Source B" }, errors: "404" },
    ] as any);

    const data = await getDashboardData();
    expect(data.actionItems.failedHarvests).toHaveLength(2);
    expect(data.actionItems.failedHarvests[0].sourceName).toBe("Source A");
    expect(data.actionItems.failedHarvests[1].sourceName).toBe("Source B");
  });

  it("returns bottom 5 quality datasets", async () => {
    const datasets = Array.from({ length: 7 }, (_, i) =>
      makeDataset({
        id: `d${i}`,
        title: `Dataset ${i}`,
        // Vary quality by toggling license/description
        license: i < 3 ? null : "https://example.com",
        description: i < 2 ? "" : "A long enough description for quality scoring purposes here",
      })
    );
    setupDefaultMocks(datasets);

    const data = await getDashboardData();
    expect(data.actionItems.lowestQuality).toHaveLength(5);
    // Should be sorted by score ascending
    for (let i = 0; i < data.actionItems.lowestQuality.length - 1; i++) {
      expect(data.actionItems.lowestQuality[i].score).toBeLessThanOrEqual(
        data.actionItems.lowestQuality[i + 1].score
      );
    }
  });
});

describe("getDashboardData — catalog health", () => {
  it("detects stale datasets by accrualPeriodicity", async () => {
    const now = new Date();
    const ds = makeDataset({
      id: "d1",
      accrualPeriodicity: "R/P1D", // threshold: 2 days
      modified: new Date(now.getTime() - 5 * 86400000), // 5 days ago
    });
    setupDefaultMocks([ds]);

    const data = await getDashboardData();
    expect(data.catalogHealth.staleDatasets).toHaveLength(1);
    expect(data.catalogHealth.staleDatasets[0].daysSinceUpdate).toBeGreaterThanOrEqual(4);
  });

  it("uses 180-day default for unknown periodicity", async () => {
    const now = new Date();
    const ds = makeDataset({
      id: "d1",
      accrualPeriodicity: "R/PT1H", // unknown → 180d default
      modified: new Date(now.getTime() - 200 * 86400000), // 200 days ago
    });
    setupDefaultMocks([ds]);

    const data = await getDashboardData();
    expect(data.catalogHealth.staleDatasets).toHaveLength(1);
  });

  it("does not flag recently updated datasets as stale", async () => {
    const now = new Date();
    const ds = makeDataset({
      id: "d1",
      accrualPeriodicity: "R/P1Y", // threshold: 400 days
      modified: new Date(now.getTime() - 100 * 86400000), // 100 days ago
    });
    setupDefaultMocks([ds]);

    const data = await getDashboardData();
    expect(data.catalogHealth.staleDatasets).toHaveLength(0);
  });

  it("detects datasets with no distributions", async () => {
    const ds = makeDataset({ id: "d1", distributions: [] });
    setupDefaultMocks([ds]);

    const data = await getDashboardData();
    expect(data.catalogHealth.noDistributions).toHaveLength(1);
    expect(data.catalogHealth.noDistributions[0].id).toBe("d1");
  });

  it("detects missing fields across published datasets", async () => {
    const ds = makeDataset({ id: "d1", contactEmail: null, license: null });
    setupDefaultMocks([ds]);

    const data = await getDashboardData();
    const fieldNames = data.catalogHealth.missingFields.map((f) => f.field);
    expect(fieldNames).toContain("contactEmail");
    expect(fieldNames).toContain("license");
  });

  it("computes dictionary coverage percentage", async () => {
    setupDefaultMocks([]);
    prismaMock.dataDictionary.count.mockResolvedValue(3);
    prismaMock.distribution.count.mockResolvedValue(10);

    const data = await getDashboardData();
    expect(data.catalogHealth.dictionaryCoverage.percent).toBe(30);
  });

  it("detects empty organizations", async () => {
    setupDefaultMocks([]);
    prismaMock.organization.findMany.mockResolvedValue([
      { id: "o1", name: "Empty Org" },
    ] as any);

    const data = await getDashboardData();
    expect(data.catalogHealth.emptyOrgs).toHaveLength(1);
    expect(data.catalogHealth.emptyOrgs[0].name).toBe("Empty Org");
  });

  it("returns empty arrays when all healthy", async () => {
    const now = new Date();
    const ds = makeDataset({
      id: "d1",
      modified: now,
      contactEmail: "a@b.com",
      contactName: "Name",
      license: "https://example.com",
      description: "Long enough description for completeness check",
      keywords: [{ id: "k1", keyword: "test", datasetId: "d1" }],
    });
    setupDefaultMocks([ds]);

    const data = await getDashboardData();
    expect(data.catalogHealth.staleDatasets).toHaveLength(0);
    expect(data.catalogHealth.noDistributions).toHaveLength(0);
    expect(data.catalogHealth.missingFields).toHaveLength(0);
  });
});

describe("getDashboardData — trends", () => {
  it("groups published datasets by month", async () => {
    const ds1 = makeDataset({ id: "d1", publishedAt: new Date("2024-06-15") });
    const ds2 = makeDataset({ id: "d2", publishedAt: new Date("2024-06-20") });
    const ds3 = makeDataset({ id: "d3", publishedAt: new Date("2024-07-01") });
    setupDefaultMocks([ds1, ds2, ds3]);

    const data = await getDashboardData();
    const june = data.trends.publishingRate.find((r) => r.month === "2024-06");
    const july = data.trends.publishingRate.find((r) => r.month === "2024-07");
    expect(june?.count).toBe(2);
    expect(july?.count).toBe(1);
  });

  it("groups analytics events into daily views and downloads", async () => {
    setupDefaultMocks([]);
    prismaMock.analyticsEvent.findMany.mockResolvedValue([
      { eventType: "page_view", entityType: null, entityId: null, createdAt: new Date("2024-06-01T10:00:00Z") },
      { eventType: "page_view", entityType: null, entityId: null, createdAt: new Date("2024-06-01T11:00:00Z") },
      { eventType: "download", entityType: null, entityId: null, createdAt: new Date("2024-06-01T12:00:00Z") },
      { eventType: "page_view", entityType: null, entityId: null, createdAt: new Date("2024-06-02T10:00:00Z") },
    ] as any);

    const data = await getDashboardData();
    const day1 = data.trends.viewsAndDownloads.find((d) => d.date === "2024-06-01");
    expect(day1?.views).toBe(2);
    expect(day1?.downloads).toBe(1);
    const day2 = data.trends.viewsAndDownloads.find((d) => d.date === "2024-06-02");
    expect(day2?.views).toBe(1);
  });

  it("computes top 5 most viewed datasets", async () => {
    setupDefaultMocks([]);
    const events = Array.from({ length: 15 }, (_, i) => ({
      eventType: "page_view",
      entityType: "dataset",
      entityId: `d${i % 6}`,
      createdAt: new Date("2024-06-01T10:00:00Z"),
    }));
    prismaMock.analyticsEvent.findMany.mockResolvedValue(events as any);
    prismaMock.dataset.findMany
      .mockResolvedValueOnce([] as any) // allDatasets
      .mockResolvedValueOnce(
        Array.from({ length: 6 }, (_, i) => ({ id: `d${i}`, title: `Dataset ${i}` })) as any
      ); // title lookup

    const data = await getDashboardData();
    expect(data.trends.mostViewed.length).toBeLessThanOrEqual(5);
    expect(data.trends.mostViewed[0].views).toBeGreaterThanOrEqual(
      data.trends.mostViewed[data.trends.mostViewed.length - 1].views
    );
  });

  it("computes top 5 most downloaded datasets", async () => {
    setupDefaultMocks([]);
    const events = Array.from({ length: 12 }, (_, i) => ({
      eventType: "download",
      entityType: "dataset",
      entityId: `d${i % 4}`,
      createdAt: new Date("2024-06-01T10:00:00Z"),
    }));
    prismaMock.analyticsEvent.findMany.mockResolvedValue(events as any);
    prismaMock.dataset.findMany
      .mockResolvedValueOnce([] as any) // allDatasets
      .mockResolvedValueOnce(
        Array.from({ length: 4 }, (_, i) => ({ id: `d${i}`, title: `Dataset ${i}` })) as any
      ); // title lookup

    const data = await getDashboardData();
    expect(data.trends.mostDownloaded.length).toBeLessThanOrEqual(4);
    expect(data.trends.mostDownloaded[0].downloads).toBeGreaterThanOrEqual(
      data.trends.mostDownloaded[data.trends.mostDownloaded.length - 1].downloads
    );
  });

  it("returns empty trends when no data", async () => {
    setupDefaultMocks([]);

    const data = await getDashboardData();
    expect(data.trends.publishingRate).toHaveLength(0);
    expect(data.trends.viewsAndDownloads).toHaveLength(0);
    expect(data.trends.mostViewed).toHaveLength(0);
    expect(data.trends.mostDownloaded).toHaveLength(0);
  });
});

describe("getDashboardData — orchestrator", () => {
  it("returns full data shape", async () => {
    setupDefaultMocks([]);

    const data = await getDashboardData();
    expect(data).toHaveProperty("stats");
    expect(data).toHaveProperty("actionItems");
    expect(data).toHaveProperty("catalogHealth");
    expect(data).toHaveProperty("trends");
    expect(data).toHaveProperty("recentActivity");
  });

  it("passes workflow flag through", async () => {
    mockedGetSetting.mockImplementation((key: string) =>
      key === "ENABLE_WORKFLOW" ? "true" : "false"
    );
    setupDefaultMocks([]);
    prismaMock.dataset.count.mockResolvedValue(3);
    prismaMock.dataset.findMany.mockResolvedValueOnce([] as any); // allDatasets
    prismaMock.dataset.findMany.mockResolvedValueOnce([] as any); // pending review

    const data = await getDashboardData();
    expect(data.stats.pendingReviewCount).toBe(3);
  });

  it("passes comments flag through", async () => {
    mockedGetSetting.mockImplementation((key: string) =>
      key === "ENABLE_COMMENTS" ? "true" : "false"
    );
    setupDefaultMocks([]);
    prismaMock.comment.findMany.mockResolvedValue([
      { id: "c1", createdAt: new Date("2024-01-01") },
    ] as any);

    const data = await getDashboardData();
    expect(data.actionItems.pendingComments).not.toBeNull();
    expect(data.actionItems.pendingComments!.count).toBe(1);
  });
});
