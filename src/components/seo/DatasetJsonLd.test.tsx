import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DatasetJsonLd } from "./DatasetJsonLd";

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
  bureauCode: null,
  programCode: null,
  license: "https://creativecommons.org/publicdomain/zero/1.0/",
  rights: null,
  spatial: "United States",
  temporal: "2020-01-01/2024-12-31",
  issued: new Date("2020-01-01"),
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
  publisherId: "pub-id",
  createdById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  publisher: {
    id: "pub-id",
    name: "Department of Testing",
    slug: "dept-testing",
    description: null,
    imageUrl: null,
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    parent: null,
  },
  distributions: [
    {
      id: "dist-1",
      title: "CSV Download",
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
      datasetId: "test-id",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  keywords: [{ id: "kw-1", keyword: "health", datasetId: "test-id" }],
  themes: [],
} as any;

describe("DatasetJsonLd", () => {
  it("renders a script tag with application/ld+json", () => {
    const { container } = render(<DatasetJsonLd dataset={mockDataset} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();
  });

  it("includes correct @type", () => {
    const { container } = render(<DatasetJsonLd dataset={mockDataset} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script!.textContent!);
    expect(data["@type"]).toBe("Dataset");
    expect(data["@context"]).toBe("https://schema.org");
  });

  it("maps fields correctly", () => {
    const { container } = render(<DatasetJsonLd dataset={mockDataset} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script!.textContent!);
    expect(data.name).toBe("Test Dataset");
    expect(data.description).toBe("A test dataset");
    expect(data.identifier).toBe("test-identifier");
    expect(data.license).toBe("https://creativecommons.org/publicdomain/zero/1.0/");
    expect(data.spatialCoverage).toBe("United States");
  });

  it("includes DataDownload distributions", () => {
    const { container } = render(<DatasetJsonLd dataset={mockDataset} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script!.textContent!);
    expect(data.distribution).toHaveLength(1);
    expect(data.distribution[0]["@type"]).toBe("DataDownload");
    expect(data.distribution[0].contentUrl).toBe("https://example.gov/data.csv");
    expect(data.distribution[0].encodingFormat).toBe("text/csv");
  });

  it("includes creator organization", () => {
    const { container } = render(<DatasetJsonLd dataset={mockDataset} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script!.textContent!);
    expect(data.creator["@type"]).toBe("Organization");
    expect(data.creator.name).toBe("Department of Testing");
  });
});
