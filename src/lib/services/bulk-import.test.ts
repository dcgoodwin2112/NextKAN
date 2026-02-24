import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", async () => {
  const mock = await import("@/__mocks__/prisma");
  return { prisma: mock.default };
});

vi.mock("@/lib/actions/datasets", () => ({
  createDataset: vi.fn(),
  addDistribution: vi.fn(),
}));

vi.mock("@/lib/services/activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
  computeDiff: vi.fn(),
}));

vi.mock("@/lib/services/email", () => ({
  getEmailService: () => ({ send: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("@/lib/email-templates/dataset-created", () => ({
  datasetCreatedEmail: vi.fn().mockReturnValue({ subject: "", text: "", html: "" }),
}));

import { createDataset, addDistribution } from "@/lib/actions/datasets";
import { bulkImportCSV, bulkImportJSON } from "./bulk-import";

const mockCreateDataset = createDataset as ReturnType<typeof vi.fn>;
const mockAddDistribution = addDistribution as ReturnType<typeof vi.fn>;

describe("bulk-import", () => {
  beforeEach(() => {
    mockCreateDataset.mockReset();
    mockAddDistribution.mockReset();
    mockCreateDataset.mockResolvedValue({
      id: "ds-1",
      title: "Test",
      slug: "test",
      status: "published",
      publisher: { name: "Org" },
      keywords: [],
      distributions: [],
      themes: [],
    });
    mockAddDistribution.mockResolvedValue({ id: "dist-1" });
  });

  describe("bulkImportCSV", () => {
    it("parses CSV and creates datasets", async () => {
      const csv = `title,description,keywords,accessLevel
Dataset One,Description one,health;data,public
Dataset Two,Description two,finance,public`;

      const result = await bulkImportCSV(csv, "a1b2c3d4-e5f6-1234-a567-123456789abc");

      expect(result.created).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(mockCreateDataset).toHaveBeenCalledTimes(2);
    });

    it("reports per-row errors for invalid data", async () => {
      mockCreateDataset
        .mockResolvedValueOnce({ id: "ds-1", publisher: { name: "Org" }, keywords: [], distributions: [], themes: [] })
        .mockRejectedValueOnce(new Error("Validation failed"));

      const csv = `title,description,keywords,accessLevel
Good Dataset,Valid description,tag,public
,Missing title,,public`;

      const result = await bulkImportCSV(csv, "a1b2c3d4-e5f6-1234-a567-123456789abc");

      expect(result.created).toBe(1);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });

    it("skips rows with missing required fields", async () => {
      mockCreateDataset.mockRejectedValueOnce(new Error("Validation"));

      const csv = `title,description,keywords,accessLevel
,,,`;

      const result = await bulkImportCSV(csv, "a1b2c3d4-e5f6-1234-a567-123456789abc");

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("bulkImportJSON", () => {
    it("parses DCAT-US catalog and creates datasets", async () => {
      const catalog = {
        "@context": "https://project-open-data.cio.gov/v1.1/schema/catalog.jsonld",
        "@id": "http://example.com/data.json",
        "@type": "dcat:Catalog",
        conformsTo: "https://project-open-data.cio.gov/v1.1/schema",
        describedBy: "https://project-open-data.cio.gov/v1.1/schema/catalog.json",
        dataset: [
          {
            "@type": "dcat:Dataset",
            title: "Test Dataset",
            description: "A test",
            keyword: ["test"],
            modified: "2024-01-01",
            publisher: { "@type": "org:Organization", name: "Test Org" },
            contactPoint: {
              "@type": "vcard:Contact",
              fn: "John",
              hasEmail: "mailto:john@example.com",
            },
            identifier: "test-1",
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

      const result = await bulkImportJSON(catalog as any, "a1b2c3d4-e5f6-1234-a567-123456789abc");

      expect(result.created).toBe(1);
      expect(mockCreateDataset).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Test Dataset",
          description: "A test",
          keywords: ["test"],
          publisherId: "a1b2c3d4-e5f6-1234-a567-123456789abc",
        })
      );
      expect(mockAddDistribution).toHaveBeenCalledWith(
        "ds-1",
        expect.objectContaining({
          downloadURL: "http://example.com/data.csv",
          mediaType: "text/csv",
        })
      );
    });

    it("maps all DCAT-US fields correctly", async () => {
      const catalog = {
        "@context": "",
        "@id": "",
        "@type": "dcat:Catalog",
        conformsTo: "",
        describedBy: "",
        dataset: [
          {
            "@type": "dcat:Dataset",
            title: "Full Dataset",
            description: "Full desc",
            keyword: ["a", "b"],
            modified: "2024-01-01",
            publisher: { "@type": "org:Organization", name: "Org" },
            contactPoint: {
              "@type": "vcard:Contact",
              fn: "Jane",
              hasEmail: "mailto:jane@example.com",
            },
            identifier: "full-1",
            accessLevel: "restricted public",
            license: "http://opendefinition.org/licenses/cc-by/",
            spatial: "United States",
            temporal: "2020-01-01/2024-12-31",
            accrualPeriodicity: "R/P1Y",
          },
        ],
      };

      const result = await bulkImportJSON(catalog as any, "a1b2c3d4-e5f6-1234-a567-123456789abc");

      expect(result.created).toBe(1);
      expect(mockCreateDataset).toHaveBeenCalledWith(
        expect.objectContaining({
          accessLevel: "restricted public",
          license: "http://opendefinition.org/licenses/cc-by/",
          spatial: "United States",
          temporal: "2020-01-01/2024-12-31",
          contactName: "Jane",
          contactEmail: "jane@example.com",
        })
      );
    });
  });
});
