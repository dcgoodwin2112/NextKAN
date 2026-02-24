import { describe, it, expect } from "vitest";
import { datasetToCKAN, organizationToCKAN } from "./ckan-compat";
import type { DatasetWithRelations } from "./dcat-us";

const mockDataset: DatasetWithRelations = {
  id: "a1b2c3d4-e5f6-1234-a567-123456789abc",
  slug: "census-data-2024",
  title: "Census Data 2024",
  description: "Annual census data for the United States",
  modified: new Date("2024-01-15"),
  accessLevel: "public",
  identifier: "CENSUS-2024-001",
  publisherId: "b1c2d3e4-f5a6-1234-b567-234567890abc",
  contactName: "Jane Smith",
  contactEmail: "jane@example.gov",
  bureauCode: "015:11",
  programCode: "015:001",
  license: "https://creativecommons.org/publicdomain/zero/1.0/",
  rights: null,
  spatial: null,
  temporal: "2024-01-01/2024-12-31",
  issued: null,
  accrualPeriodicity: "R/P1Y",
  conformsTo: null,
  dataQuality: true,
  describedBy: null,
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
  workflowStatus: "published",
  reviewerId: null,
  reviewNote: null,
  submittedAt: null,
  reviewedAt: null,
  publishedAt: new Date("2024-01-15"),
  publisher: {
    id: "b1c2d3e4-f5a6-1234-b567-234567890abc",
    name: "Census Bureau",
    slug: "census-bureau",
    description: "United States Census Bureau",
    imageUrl: null,
    parentId: null,
    parent: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  distributions: [
    {
      id: "d1e2f3a4-b5c6-1234-d567-345678901abc",
      title: "CSV Download",
      description: "Full dataset in CSV format",
      downloadURL: "https://example.gov/census/data.csv",
      accessURL: null,
      mediaType: "text/csv",
      format: "CSV",
      conformsTo: null,
      describedBy: null,
      fileName: "data.csv",
      filePath: null,
      fileSize: 1024,
      datasetId: "a1b2c3d4-e5f6-1234-a567-123456789abc",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
  ],
  keywords: [
    { id: "k1", keyword: "census", datasetId: "a1b2c3d4-e5f6-1234-a567-123456789abc" },
    { id: "k2", keyword: "population", datasetId: "a1b2c3d4-e5f6-1234-a567-123456789abc" },
  ],
  themes: [],
};

describe("datasetToCKAN", () => {
  it("maps title, notes, and tags correctly", () => {
    const result = datasetToCKAN(mockDataset);
    expect(result.title).toBe("Census Data 2024");
    expect(result.notes).toBe("Annual census data for the United States");
    expect(result.tags).toEqual([{ name: "census" }, { name: "population" }]);
  });

  it("maps resources from distributions", () => {
    const result = datasetToCKAN(mockDataset);
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0]).toEqual({
      id: "d1e2f3a4-b5c6-1234-d567-345678901abc",
      url: "https://example.gov/census/data.csv",
      name: "CSV Download",
      format: "CSV",
      mimetype: "text/csv",
      description: "Full dataset in CSV format",
    });
  });

  it("maps organization correctly", () => {
    const result = datasetToCKAN(mockDataset);
    expect(result.organization).toEqual({
      id: "b1c2d3e4-f5a6-1234-b567-234567890abc",
      name: "census-bureau",
      title: "Census Bureau",
      description: "United States Census Bureau",
    });
  });

  it("maps id and name fields", () => {
    const result = datasetToCKAN(mockDataset);
    expect(result.id).toBe("CENSUS-2024-001");
    expect(result.name).toBe("census-data-2024");
  });

  it("maps contact info to author/maintainer", () => {
    const result = datasetToCKAN(mockDataset);
    expect(result.author).toBe("Jane Smith");
    expect(result.author_email).toBe("jane@example.gov");
    expect(result.maintainer).toBe("Jane Smith");
    expect(result.maintainer_email).toBe("jane@example.gov");
  });

  it("maps published status to active state", () => {
    const result = datasetToCKAN(mockDataset);
    expect(result.state).toBe("active");
    expect(result.type).toBe("dataset");
  });

  it("maps draft status to draft state", () => {
    const draft = { ...mockDataset, status: "draft" };
    const result = datasetToCKAN(draft);
    expect(result.state).toBe("draft");
  });

  it("maps counts correctly", () => {
    const result = datasetToCKAN(mockDataset);
    expect(result.num_resources).toBe(1);
    expect(result.num_tags).toBe(2);
  });

  it("handles empty distributions and keywords", () => {
    const empty = { ...mockDataset, distributions: [], keywords: [] };
    const result = datasetToCKAN(empty);
    expect(result.resources).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.num_resources).toBe(0);
    expect(result.num_tags).toBe(0);
  });
});

describe("organizationToCKAN", () => {
  it("maps organization fields correctly", () => {
    const result = organizationToCKAN(
      { id: "org-1", name: "Census Bureau", slug: "census-bureau", description: "US Census", imageUrl: null },
      42
    );
    expect(result).toEqual({
      id: "org-1",
      name: "census-bureau",
      title: "Census Bureau",
      description: "US Census",
      image_url: "",
      state: "active",
      package_count: 42,
    });
  });
});
