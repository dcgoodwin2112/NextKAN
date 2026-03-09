import { describe, it, expect } from "vitest";
import { calculateQualityScore, getQualityTier } from "./data-quality";
import type { DatasetWithRelations } from "@/lib/schemas/dcat-us";

function makeDataset(overrides: Partial<DatasetWithRelations> = {}): DatasetWithRelations {
  return {
    id: "a1b2c3d4-e5f6-1234-a567-123456789abc",
    slug: "test-dataset",
    title: "Complete Census Dataset 2024",
    description: "A comprehensive dataset containing census data for all US states and territories with demographic breakdowns",
    modified: new Date("2024-01-15"),
    accessLevel: "public",
    identifier: "TEST-001",
    publisherId: "pub-1",
    contactName: "Jane Smith",
    contactEmail: "jane@example.gov",
    bureauCode: "015:11",
    programCode: "015:001",
    license: "https://creativecommons.org/publicdomain/zero/1.0/",
    rights: null,
    spatial: "United States",
    temporal: "2024-01-01/2024-12-31",
    issued: null,
    accrualPeriodicity: "R/P1Y",
    conformsTo: "https://example.gov/standard",
    dataQuality: true,
    describedBy: "https://example.gov/dictionary",
    isPartOf: null,
    landingPage: "https://example.gov/census",
    language: "en",
    primaryITInvestmentUII: null,
    references: null,
    systemOfRecords: null,
    status: "published",
    createdById: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
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
      {
        id: "dist-2",
        title: "JSON Download",
        description: "Full data in JSON",
        downloadURL: "https://example.gov/data.json",
        accessURL: null,
        mediaType: "application/json",
        format: "JSON",
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
      { id: "k2", keyword: "population", datasetId: "a1b2c3d4-e5f6-1234-a567-123456789abc" },
      { id: "k3", keyword: "demographics", datasetId: "a1b2c3d4-e5f6-1234-a567-123456789abc" },
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

describe("calculateQualityScore", () => {
  it("fully complete dataset scores 100", () => {
    const dataset = makeDataset();
    const result = calculateQualityScore(dataset);
    expect(result.overall).toBe(100);
    expect(result.suggestions).toHaveLength(0);
  });

  it("dataset missing title/description scores lower", () => {
    const dataset = makeDataset({ title: "", description: "" });
    const result = calculateQualityScore(dataset);
    expect(result.overall).toBeLessThan(100);
    const titleBreakdown = result.breakdown.find((b) => b.category === "Title");
    expect(titleBreakdown!.score).toBe(0);
    const descBreakdown = result.breakdown.find((b) => b.category === "Description");
    expect(descBreakdown!.score).toBe(0);
  });

  it("dataset with no distributions loses distribution points", () => {
    const dataset = makeDataset({ distributions: [] });
    const result = calculateQualityScore(dataset);
    const distBreakdown = result.breakdown.find((b) => b.category === "Distributions");
    expect(distBreakdown!.score).toBe(0);
    const mediaBreakdown = result.breakdown.find((b) => b.category === "Distribution Media Types");
    expect(mediaBreakdown!.score).toBe(0);
    expect(result.overall).toBeLessThan(100);
  });

  it("dataset with data dictionary gets full points", () => {
    const dataset = makeDataset({ describedBy: "https://example.gov/dict" });
    const result = calculateQualityScore(dataset);
    const dictBreakdown = result.breakdown.find((b) => b.category === "Data Dictionary");
    expect(dictBreakdown!.score).toBe(10);
  });

  it("dataset without data dictionary gets zero for that category", () => {
    const dataset = makeDataset({ describedBy: null });
    const result = calculateQualityScore(dataset);
    const dictBreakdown = result.breakdown.find((b) => b.category === "Data Dictionary");
    expect(dictBreakdown!.score).toBe(0);
  });

  it("suggestions array lists missing recommended fields", () => {
    const dataset = makeDataset({
      license: null,
      spatial: null,
      temporal: null,
      accrualPeriodicity: null,
    });
    const result = calculateQualityScore(dataset);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions.some((s) => s.includes("license"))).toBe(true);
    expect(result.suggestions.some((s) => s.includes("spatial") || s.includes("Spatial"))).toBe(true);
  });

  it("score breakdown sums to overall score", () => {
    const dataset = makeDataset({ license: null, temporal: null });
    const result = calculateQualityScore(dataset);
    const breakdownSum = result.breakdown.reduce((sum, b) => sum + b.score, 0);
    expect(breakdownSum).toBe(result.overall);
  });

  it("short title gets partial score", () => {
    const dataset = makeDataset({ title: "Short" });
    const result = calculateQualityScore(dataset);
    const titleBreakdown = result.breakdown.find((b) => b.category === "Title");
    expect(titleBreakdown!.score).toBe(2);
  });

  it("brief description gets partial score", () => {
    const dataset = makeDataset({ description: "Brief description" });
    const result = calculateQualityScore(dataset);
    const descBreakdown = result.breakdown.find((b) => b.category === "Description");
    expect(descBreakdown!.score).toBe(5);
  });

  it("fewer than 3 keywords gets partial score", () => {
    const dataset = makeDataset({
      keywords: [{ id: "k1", keyword: "test", datasetId: "a1b2c3d4-e5f6-1234-a567-123456789abc" }],
    });
    const result = calculateQualityScore(dataset);
    const kwBreakdown = result.breakdown.find((b) => b.category === "Keywords");
    expect(kwBreakdown!.score).toBe(5);
  });

  it("minimal dataset scores very low", () => {
    const dataset = makeDataset({
      title: "",
      description: "",
      contactName: null,
      contactEmail: null,
      license: null,
      distributions: [],
      keywords: [],
      spatial: null,
      temporal: null,
      accrualPeriodicity: null,
      describedBy: null,
      landingPage: null,
      conformsTo: null,
      themes: [],
    });
    const result = calculateQualityScore(dataset);
    expect(result.overall).toBe(0);
    expect(result.suggestions.length).toBe(14); // One per check
  });
});

describe("getQualityTier", () => {
  it("returns A for scores >= 90", () => {
    expect(getQualityTier(90)).toEqual({ label: "A", color: "text-success-text" });
    expect(getQualityTier(100).label).toBe("A");
  });

  it("returns B for scores 80-89", () => {
    expect(getQualityTier(80)).toEqual({ label: "B", color: "text-primary" });
    expect(getQualityTier(89).label).toBe("B");
  });

  it("returns C for scores 70-79", () => {
    expect(getQualityTier(70)).toEqual({ label: "C", color: "text-warning-text" });
    expect(getQualityTier(79).label).toBe("C");
  });

  it("returns D for scores 60-69", () => {
    expect(getQualityTier(60)).toEqual({ label: "D", color: "text-warning-text" });
    expect(getQualityTier(69).label).toBe("D");
  });

  it("returns F for scores < 60", () => {
    expect(getQualityTier(0)).toEqual({ label: "F", color: "text-danger-text" });
    expect(getQualityTier(59).label).toBe("F");
  });
});
