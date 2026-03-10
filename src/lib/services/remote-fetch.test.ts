// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";

const { mockImportCsv, mockImportJson, mockImportGeoJson, mockImportExcel, mockGenerateTableName, mockUpload } = vi.hoisted(() => ({
  mockImportCsv: vi.fn(),
  mockImportJson: vi.fn(),
  mockImportGeoJson: vi.fn(),
  mockImportExcel: vi.fn(),
  mockGenerateTableName: vi.fn((id: string) => `ds_${id.replace(/-/g, "").slice(0, 8)}`),
  mockUpload: vi.fn().mockResolvedValue("https://example.com/uploads/file.csv"),
}));

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/services/datastore", () => ({
  importCsvToDatastore: mockImportCsv,
  importJsonToDatastore: mockImportJson,
  importGeoJsonToDatastore: mockImportGeoJson,
  importExcelToDatastore: mockImportExcel,
  generateTableName: (id: string) => mockGenerateTableName(id),
}));

vi.mock("@/lib/storage/factory", () => ({
  getStorageProvider: () => ({
    upload: mockUpload,
  }),
}));

vi.mock("crypto", async () => {
  const actual = await vi.importActual<typeof import("crypto")>("crypto");
  return {
    ...actual,
    randomUUID: () => "test-uuid-1234",
  };
});

import {
  detectMediaType,
  extractFilenameFromURL,
  fetchAndImportRemoteResource,
} from "./remote-fetch";

describe("detectMediaType", () => {
  it("returns Content-Type header value", () => {
    expect(detectMediaType("text/csv", "https://example.com/file", null)).toBe("text/csv");
  });

  it("strips charset/parameters from Content-Type", () => {
    expect(detectMediaType("text/csv; charset=utf-8", "https://example.com/file", null)).toBe("text/csv");
  });

  it("ignores application/octet-stream, falls to extension", () => {
    expect(detectMediaType("application/octet-stream", "https://example.com/data.csv", null)).toBe("text/csv");
  });

  it(".csv → text/csv", () => {
    expect(detectMediaType(null, "https://example.com/data.csv", null)).toBe("text/csv");
  });

  it(".json → application/json", () => {
    expect(detectMediaType(null, "https://example.com/data.json", null)).toBe("application/json");
  });

  it(".geojson → application/geo+json", () => {
    expect(detectMediaType(null, "https://example.com/data.geojson", null)).toBe("application/geo+json");
  });

  it(".xlsx → application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", () => {
    expect(detectMediaType(null, "https://example.com/data.xlsx", null)).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  });

  it(".xls → application/vnd.ms-excel", () => {
    expect(detectMediaType(null, "https://example.com/data.xls", null)).toBe(
      "application/vnd.ms-excel"
    );
  });

  it("falls back to existingMediaType", () => {
    expect(detectMediaType(null, "https://example.com/file", "application/pdf")).toBe("application/pdf");
  });

  it("returns null when everything is null", () => {
    expect(detectMediaType(null, "https://example.com/file", null)).toBeNull();
  });
});

describe("extractFilenameFromURL", () => {
  it("extracts filename from path", () => {
    expect(extractFilenameFromURL("https://example.com/path/to/data.csv")).toBe("data.csv");
  });

  it("handles query parameters", () => {
    expect(extractFilenameFromURL("https://example.com/data.csv?token=abc")).toBe("data.csv");
  });

  it("returns null for bare domain", () => {
    expect(extractFilenameFromURL("https://example.com")).toBeNull();
    expect(extractFilenameFromURL("https://example.com/")).toBeNull();
  });
});

describe("fetchAndImportRemoteResource", () => {
  const mockDistribution = {
    id: "dist-1",
    title: "Test",
    description: null,
    downloadURL: "https://example.com/data.csv",
    accessURL: null,
    mediaType: null,
    format: null,
    conformsTo: null,
    describedBy: null,
    fileName: null,
    filePath: null,
    fileSize: null,
    datasetId: "ds-1",
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mockUpload.mockResolvedValue("https://example.com/uploads/file");
    mockGenerateTableName.mockImplementation((id: string) => `ds_${id.replace(/-/g, "").slice(0, 8)}`);
    delete process.env.STORAGE_PROVIDER;
    delete process.env.REMOTE_DOWNLOAD_MAX_SIZE;
  });

  it("downloads, saves via storage, updates distribution record", async () => {
    const csvData = "name,age\nAlice,30";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(csvData, {
        status: 200,
        headers: { "Content-Type": "text/csv" },
      })
    );
    prismaMock.distribution.findUnique.mockResolvedValue(mockDistribution);
    prismaMock.distribution.update.mockResolvedValue({ ...mockDistribution, filePath: "/uploads/test.csv" });

    // Second findUnique call for re-fetch before import
    prismaMock.distribution.findUnique.mockResolvedValueOnce(mockDistribution);
    prismaMock.distribution.findUnique.mockResolvedValueOnce({
      ...mockDistribution,
      filePath: "/some/path/test-uuid-1234.csv",
      mediaType: "text/csv",
    });

    await fetchAndImportRemoteResource("dist-1", "https://example.com/data.csv");

    expect(mockUpload).toHaveBeenCalledWith(
      "test-uuid-1234.csv",
      expect.any(Buffer),
      "text/csv"
    );
    expect(prismaMock.distribution.update).toHaveBeenCalledWith({
      where: { id: "dist-1" },
      data: expect.objectContaining({
        fileName: "data.csv",
        fileSize: csvData.length,
        mediaType: "text/csv",
      }),
    });
  });

  it("detects media type from Content-Type", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('{"a":1}', {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      })
    );
    prismaMock.distribution.findUnique.mockResolvedValue(mockDistribution);
    prismaMock.distribution.update.mockResolvedValue(mockDistribution);
    prismaMock.distribution.findUnique
      .mockResolvedValueOnce(mockDistribution)
      .mockResolvedValueOnce({ ...mockDistribution, mediaType: "application/json", filePath: "/path" });

    await fetchAndImportRemoteResource("dist-1", "https://example.com/data");

    expect(prismaMock.distribution.update).toHaveBeenCalledWith({
      where: { id: "dist-1" },
      data: expect.objectContaining({ mediaType: "application/json" }),
    });
  });

  it("calls importCsvToDatastore for CSV on local storage", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("a,b\n1,2", {
        status: 200,
        headers: { "Content-Type": "text/csv" },
      })
    );
    const updated = { ...mockDistribution, filePath: "/path/test.csv", mediaType: "text/csv" };
    prismaMock.distribution.findUnique
      .mockResolvedValueOnce(mockDistribution)
      .mockResolvedValueOnce(updated);
    prismaMock.distribution.update.mockResolvedValue(updated);

    await fetchAndImportRemoteResource("dist-1", "https://example.com/data.csv");

    expect(mockImportCsv).toHaveBeenCalledWith(updated);
  });

  it("calls importJsonToDatastore for JSON on local storage", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('[{"a":1}]', {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const updated = { ...mockDistribution, filePath: "/path/test.json", mediaType: "application/json" };
    prismaMock.distribution.findUnique
      .mockResolvedValueOnce(mockDistribution)
      .mockResolvedValueOnce(updated);
    prismaMock.distribution.update.mockResolvedValue(updated);

    await fetchAndImportRemoteResource("dist-1", "https://example.com/data.json");

    expect(mockImportJson).toHaveBeenCalledWith(updated);
  });

  it("calls importGeoJsonToDatastore for GeoJSON on local storage", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('{"type":"FeatureCollection","features":[]}', {
        status: 200,
        headers: { "Content-Type": "application/geo+json" },
      })
    );
    const updated = { ...mockDistribution, filePath: "/path/test.geojson", mediaType: "application/geo+json" };
    prismaMock.distribution.findUnique
      .mockResolvedValueOnce(mockDistribution)
      .mockResolvedValueOnce(updated);
    prismaMock.distribution.update.mockResolvedValue(updated);

    await fetchAndImportRemoteResource("dist-1", "https://example.com/data.geojson");

    expect(mockImportGeoJson).toHaveBeenCalledWith(updated);
  });

  it("calls importExcelToDatastore for XLSX on local storage", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(Buffer.from("fake xlsx"), {
        status: 200,
        headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
      })
    );
    const updated = {
      ...mockDistribution,
      filePath: "/path/test.xlsx",
      mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
    prismaMock.distribution.findUnique
      .mockResolvedValueOnce(mockDistribution)
      .mockResolvedValueOnce(updated);
    prismaMock.distribution.update.mockResolvedValue(updated);

    await fetchAndImportRemoteResource("dist-1", "https://example.com/data.xlsx");

    expect(mockImportExcel).toHaveBeenCalledWith(updated);
  });

  it("calls importExcelToDatastore for XLS on local storage", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(Buffer.from("fake xls"), {
        status: 200,
        headers: { "Content-Type": "application/vnd.ms-excel" },
      })
    );
    const updated = {
      ...mockDistribution,
      filePath: "/path/test.xls",
      mediaType: "application/vnd.ms-excel",
    };
    prismaMock.distribution.findUnique
      .mockResolvedValueOnce(mockDistribution)
      .mockResolvedValueOnce(updated);
    prismaMock.distribution.update.mockResolvedValue(updated);

    await fetchAndImportRemoteResource("dist-1", "https://example.com/data.xls");

    expect(mockImportExcel).toHaveBeenCalledWith(updated);
  });

  it("skips import when storage is S3", async () => {
    process.env.STORAGE_PROVIDER = "s3";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("a,b\n1,2", {
        status: 200,
        headers: { "Content-Type": "text/csv" },
      })
    );
    prismaMock.distribution.findUnique.mockResolvedValue(mockDistribution);
    prismaMock.distribution.update.mockResolvedValue(mockDistribution);

    await fetchAndImportRemoteResource("dist-1", "https://example.com/data.csv");

    expect(mockImportCsv).not.toHaveBeenCalled();
    expect(mockImportJson).not.toHaveBeenCalled();
    expect(mockImportGeoJson).not.toHaveBeenCalled();
  });

  it("skips import for non-importable types", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("pdf content", {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      })
    );
    prismaMock.distribution.findUnique.mockResolvedValue(mockDistribution);
    prismaMock.distribution.update.mockResolvedValue(mockDistribution);

    await fetchAndImportRemoteResource("dist-1", "https://example.com/doc.pdf");

    expect(mockImportCsv).not.toHaveBeenCalled();
    expect(mockImportJson).not.toHaveBeenCalled();
    expect(mockImportGeoJson).not.toHaveBeenCalled();
  });

  it("creates error DatastoreTable on HTTP 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Not Found", { status: 404, statusText: "Not Found" })
    );
    prismaMock.distribution.findUnique.mockResolvedValue(mockDistribution);
    prismaMock.datastoreTable.create.mockResolvedValue({} as any);

    await fetchAndImportRemoteResource("dist-1", "https://example.com/missing.csv");

    expect(prismaMock.datastoreTable.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        distributionId: "dist-1",
        status: "error",
        errorMessage: "HTTP 404: Not Found",
      }),
    });
  });

  it("creates error DatastoreTable on network timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("The operation was aborted"));
    prismaMock.distribution.findUnique.mockResolvedValue(mockDistribution);
    prismaMock.datastoreTable.create.mockResolvedValue({} as any);

    await fetchAndImportRemoteResource("dist-1", "https://example.com/slow.csv");

    expect(prismaMock.datastoreTable.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "error",
        errorMessage: "The operation was aborted",
      }),
    });
  });

  it("rejects when Content-Length exceeds max", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("x", {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Length": "999999999999",
        },
      })
    );
    prismaMock.distribution.findUnique.mockResolvedValue(mockDistribution);
    prismaMock.datastoreTable.create.mockResolvedValue({} as any);

    await fetchAndImportRemoteResource("dist-1", "https://example.com/huge.csv");

    expect(prismaMock.datastoreTable.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "error",
        errorMessage: expect.stringContaining("File too large"),
      }),
    });
  });

  it("rejects when body exceeds max (no Content-Length)", async () => {
    // Create a buffer larger than 100MB default
    const bigBuffer = Buffer.alloc(101 * 1024 * 1024);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(bigBuffer, {
        status: 200,
        headers: { "Content-Type": "text/csv" },
      })
    );
    prismaMock.distribution.findUnique.mockResolvedValue(mockDistribution);
    prismaMock.datastoreTable.create.mockResolvedValue({} as any);

    await fetchAndImportRemoteResource("dist-1", "https://example.com/huge.csv");

    expect(prismaMock.datastoreTable.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "error",
        errorMessage: expect.stringContaining("File too large"),
      }),
    });
  });

  it("returns early when distribution not found", async () => {
    prismaMock.distribution.findUnique.mockResolvedValue(null);

    await fetchAndImportRemoteResource("nonexistent", "https://example.com/data.csv");

    expect(mockUpload).not.toHaveBeenCalled();
    expect(prismaMock.distribution.update).not.toHaveBeenCalled();
  });
});
