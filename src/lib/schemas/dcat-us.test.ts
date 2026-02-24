import { describe, it, expect, vi, afterEach } from "vitest";
import { transformDatasetToDCATUS, buildCatalog } from "./dcat-us";

const baseMockOrg = {
  id: "pub-id",
  name: "Department of Testing",
  slug: "dept-testing",
  description: null,
  imageUrl: null,
  parentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDataset = {
  id: "test-id",
  slug: "test-dataset",
  title: "Test Dataset",
  description: "A test dataset",
  modified: new Date("2024-01-15"),
  accessLevel: "public",
  identifier: "test-identifier",
  contactName: "John Doe",
  contactEmail: "john@example.gov",
  bureauCode: "015:11",
  programCode: "015:001",
  license: "https://creativecommons.org/publicdomain/zero/1.0/",
  rights: null,
  spatial: "United States",
  temporal: "2020-01-01/2024-12-31",
  issued: new Date("2020-01-01"),
  accrualPeriodicity: "R/P1Y",
  conformsTo: null,
  dataQuality: true,
  describedBy: null,
  isPartOf: null,
  landingPage: "https://example.gov/datasets/test",
  language: "en",
  primaryITInvestmentUII: null,
  references: null,
  systemOfRecords: null,
  status: "published",
  publisherId: "pub-id",
  createdById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  // Workflow
  workflowStatus: "published",
  reviewerId: null,
  reviewNote: null,
  submittedAt: null,
  reviewedAt: null,
  publishedAt: null,
  // DCAT-US v3.0
  version: null,
  versionNotes: null,
  seriesId: null,
  series: null,
  previousVersion: null,
  // Harvesting
  harvestSourceId: null,
  harvestIdentifier: null,
  publisher: { ...baseMockOrg, parent: null },
  distributions: [
    {
      id: "dist-1",
      title: "CSV Download",
      description: "Full dataset as CSV",
      downloadURL: "https://example.gov/data/test.csv",
      accessURL: null,
      mediaType: "text/csv",
      format: "CSV",
      conformsTo: null,
      describedBy: null,
      fileName: null,
      filePath: null,
      fileSize: null,
      datasetId: "test-id",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  keywords: [
    { id: "kw-1", keyword: "health", datasetId: "test-id" },
    { id: "kw-2", keyword: "education", datasetId: "test-id" },
  ],
  themes: [
    { id: "dt-1", datasetId: "test-id", themeId: "th-1", theme: { id: "th-1", name: "Health", slug: "health", description: null, color: null, createdAt: new Date(), updatedAt: new Date() } },
    { id: "dt-2", datasetId: "test-id", themeId: "th-2", theme: { id: "th-2", name: "Education", slug: "education", description: null, color: null, createdAt: new Date(), updatedAt: new Date() } },
  ],
};

describe("transformDatasetToDCATUS", () => {
  it("includes all required DCAT-US fields", () => {
    const result = transformDatasetToDCATUS(mockDataset as any);
    expect(result["@type"]).toBe("dcat:Dataset");
    expect(result.title).toBe("Test Dataset");
    expect(result.description).toBe("A test dataset");
    expect(result.keyword).toEqual(["health", "education"]);
    expect(result.modified).toBe("2024-01-15");
    expect(result.identifier).toBe("test-identifier");
    expect(result.accessLevel).toBe("public");
  });

  it("formats publisher as org:Organization", () => {
    const result = transformDatasetToDCATUS(mockDataset as any);
    expect(result.publisher).toEqual({
      "@type": "org:Organization",
      name: "Department of Testing",
    });
  });

  it("includes subOrganizationOf when publisher has parent org", () => {
    const withParent = {
      ...mockDataset,
      publisher: {
        ...baseMockOrg,
        parentId: "parent-id",
        parent: { ...baseMockOrg, id: "parent-id", name: "Parent Org" },
      },
    };
    const result = transformDatasetToDCATUS(withParent as any);
    expect(result.publisher.subOrganizationOf).toEqual({
      "@type": "org:Organization",
      name: "Parent Org",
    });
  });

  it("omits subOrganizationOf when publisher has no parent", () => {
    const result = transformDatasetToDCATUS(mockDataset as any);
    expect(result.publisher.subOrganizationOf).toBeUndefined();
  });

  it("formats contactPoint as vcard:Contact with mailto: prefix", () => {
    const result = transformDatasetToDCATUS(mockDataset as any);
    expect(result.contactPoint).toEqual({
      "@type": "vcard:Contact",
      fn: "John Doe",
      hasEmail: "mailto:john@example.gov",
    });
  });

  it("formats modified date as YYYY-MM-DD string", () => {
    const result = transformDatasetToDCATUS(mockDataset as any);
    expect(result.modified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("includes distributions with @type dcat:Distribution", () => {
    const result = transformDatasetToDCATUS(mockDataset as any);
    expect(result.distribution).toHaveLength(1);
    expect(result.distribution![0]["@type"]).toBe("dcat:Distribution");
    expect(result.distribution![0].downloadURL).toBe(
      "https://example.gov/data/test.csv"
    );
    expect(result.distribution![0].mediaType).toBe("text/csv");
  });

  it("includes bureauCode/programCode as arrays when present", () => {
    const result = transformDatasetToDCATUS(mockDataset as any);
    expect(result.bureauCode).toEqual(["015:11"]);
    expect(result.programCode).toEqual(["015:001"]);
  });

  it("omits null/undefined optional fields", () => {
    const result = transformDatasetToDCATUS(mockDataset as any);
    expect(result).not.toHaveProperty("conformsTo");
    expect(result).not.toHaveProperty("describedBy");
    expect(result).not.toHaveProperty("systemOfRecords");
  });

  it("maps theme names from relation and parses references", () => {
    const withRefs = {
      ...mockDataset,
      references: '["https://example.gov/ref1"]',
    };
    const result = transformDatasetToDCATUS(withRefs as any);
    expect(result.theme).toEqual(["Health", "Education"]);
    expect(result.references).toEqual(["https://example.gov/ref1"]);
  });
});

describe("buildCatalog", () => {
  it("sets correct conformsTo URI", () => {
    const catalog = buildCatalog([mockDataset as any], "https://example.gov");
    expect(catalog.conformsTo).toBe(
      "https://project-open-data.cio.gov/v1.1/schema"
    );
  });

  it("sets correct @context JSON-LD URL", () => {
    const catalog = buildCatalog([], "https://example.gov");
    expect(catalog["@context"]).toBe(
      "https://project-open-data.cio.gov/v1.1/schema/catalog.jsonld"
    );
  });

  it("sets @id to {siteUrl}/data.json", () => {
    const catalog = buildCatalog([], "https://example.gov");
    expect(catalog["@id"]).toBe("https://example.gov/data.json");
  });

  it("returns empty dataset array for empty input", () => {
    const catalog = buildCatalog([], "https://example.gov");
    expect(catalog.dataset).toEqual([]);
  });
});

describe("DCAT-US v3.0", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("v3.0 output includes dcat:version when present", () => {
    vi.stubEnv("DCAT_US_VERSION", "v3.0");
    const withVersion = { ...mockDataset, version: "2.1" };
    const result = transformDatasetToDCATUS(withVersion as any);
    expect(result["dcat:version"]).toBe("2.1");
  });

  it("v3.0 output includes dcat:inSeries reference", () => {
    vi.stubEnv("DCAT_US_VERSION", "v3.0");
    const withSeries = {
      ...mockDataset,
      series: {
        id: "series-1",
        title: "Climate Series",
        identifier: "climate-series",
        slug: "climate-series",
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
    const result = transformDatasetToDCATUS(withSeries as any);
    expect(result["dcat:inSeries"]).toBe("climate-series");
  });

  it("v3.0 output includes dcat:previousVersion when present", () => {
    vi.stubEnv("DCAT_US_VERSION", "v3.0");
    const withPrev = { ...mockDataset, previousVersion: "https://example.gov/datasets/v1" };
    const result = transformDatasetToDCATUS(withPrev as any);
    expect(result["dcat:previousVersion"]).toBe("https://example.gov/datasets/v1");
  });

  it("v3.0 changes conformsTo to v3.0 schema URI", () => {
    vi.stubEnv("DCAT_US_VERSION", "v3.0");
    const catalog = buildCatalog([], "https://example.gov");
    expect(catalog.conformsTo).toBe("https://doi-do.github.io/dcat-us/v3.0/schema");
    expect(catalog["@context"]).toBe("https://doi-do.github.io/dcat-us/v3.0/schema/catalog.jsonld");
    expect(catalog.describedBy).toBe("https://doi-do.github.io/dcat-us/v3.0/schema/catalog.json");
  });

  it("v1.1 output unchanged when v3.0 not enabled", () => {
    // Default is v1.1 (no env var set)
    const withVersion = { ...mockDataset, version: "2.1" };
    const result = transformDatasetToDCATUS(withVersion as any);
    expect(result["dcat:version"]).toBeUndefined();

    const catalog = buildCatalog([], "https://example.gov");
    expect(catalog.conformsTo).toBe("https://project-open-data.cio.gov/v1.1/schema");
  });
});
