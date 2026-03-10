import { describe, it, expect, vi } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";

const mockImportCsv = vi.fn();
const mockImportJson = vi.fn();
const mockImportGeoJson = vi.fn();
const mockImportExcel = vi.fn();
const mockDeleteTable = vi.fn();
const mockFetchAndImport = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/services/datastore", () => ({
  importCsvToDatastore: mockImportCsv,
  importJsonToDatastore: mockImportJson,
  importGeoJsonToDatastore: mockImportGeoJson,
  importExcelToDatastore: mockImportExcel,
  deleteDatastoreTable: mockDeleteTable,
}));

vi.mock("@/lib/services/activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
  computeDiff: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/services/email", () => ({
  getEmailService: () => ({ send: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("@/lib/email-templates/dataset-created", () => ({
  datasetCreatedEmail: vi.fn().mockReturnValue({
    subject: "test",
    html: "<p>test</p>",
    text: "test",
  }),
}));

vi.mock("@/lib/services/remote-fetch", () => ({
  fetchAndImportRemoteResource: mockFetchAndImport,
}));

import { addDistribution, removeDistribution } from "./datasets";

import { beforeEach } from "vitest";

describe("addDistribution", () => {
  beforeEach(() => {
    mockImportCsv.mockClear();
    mockImportJson.mockClear();
    mockImportGeoJson.mockClear();
    mockImportExcel.mockClear();
  });
  it("validates input", async () => {
    prismaMock.distribution.create.mockResolvedValue({
      id: "dist-1",
      title: "CSV Data",
      description: null,
      downloadURL: "https://example.com/data.csv",
      accessURL: null,
      mediaType: "text/csv",
      format: "CSV",
      conformsTo: null,
      describedBy: null,
      fileName: null,
      filePath: null,
      fileSize: null,
      datasetId: "ds-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await addDistribution("ds-1", {
      title: "CSV Data",
      downloadURL: "https://example.com/data.csv",
      mediaType: "text/csv",
      format: "CSV",
    });

    expect(result.title).toBe("CSV Data");
    expect(prismaMock.distribution.create).toHaveBeenCalled();
  });

  it("rejects when neither downloadURL nor accessURL provided", async () => {
    await expect(
      addDistribution("ds-1", { title: "Bad dist" })
    ).rejects.toThrow();
  });

  it("triggers datastore import for CSV with filePath", async () => {
    const dist = {
      id: "dist-csv",
      title: "CSV",
      description: null,
      downloadURL: "https://example.com/data.csv",
      accessURL: null,
      mediaType: "text/csv",
      format: "CSV",
      conformsTo: null,
      describedBy: null,
      fileName: "data.csv",
      filePath: "/uploads/data.csv",
      fileSize: 1024,
      datasetId: "ds-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaMock.distribution.create.mockResolvedValue(dist);

    await addDistribution("ds-1", {
      title: "CSV",
      downloadURL: "https://example.com/data.csv",
      mediaType: "text/csv",
      format: "CSV",
      fileName: "data.csv",
      filePath: "/uploads/data.csv",
      fileSize: 1024,
    });

    expect(mockImportCsv).toHaveBeenCalledWith(dist);
  });

  it("triggers datastore import for JSON with filePath", async () => {
    const dist = {
      id: "dist-json",
      title: "JSON",
      description: null,
      downloadURL: "https://example.com/data.json",
      accessURL: null,
      mediaType: "application/json",
      format: "JSON",
      conformsTo: null,
      describedBy: null,
      fileName: "data.json",
      filePath: "/uploads/data.json",
      fileSize: 512,
      datasetId: "ds-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaMock.distribution.create.mockResolvedValue(dist);

    await addDistribution("ds-1", {
      title: "JSON",
      downloadURL: "https://example.com/data.json",
      mediaType: "application/json",
      format: "JSON",
      fileName: "data.json",
      filePath: "/uploads/data.json",
      fileSize: 512,
    });

    expect(mockImportJson).toHaveBeenCalledWith(dist);
    expect(mockImportCsv).not.toHaveBeenCalled();
  });

  it("triggers datastore import for GeoJSON with filePath", async () => {
    const dist = {
      id: "dist-geojson",
      title: "GeoJSON",
      description: null,
      downloadURL: "https://example.com/data.geojson",
      accessURL: null,
      mediaType: "application/geo+json",
      format: "GeoJSON",
      conformsTo: null,
      describedBy: null,
      fileName: "data.geojson",
      filePath: "/uploads/data.geojson",
      fileSize: 1024,
      datasetId: "ds-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaMock.distribution.create.mockResolvedValue(dist);

    await addDistribution("ds-1", {
      title: "GeoJSON",
      downloadURL: "https://example.com/data.geojson",
      mediaType: "application/geo+json",
      format: "GeoJSON",
      fileName: "data.geojson",
      filePath: "/uploads/data.geojson",
      fileSize: 1024,
    });

    expect(mockImportGeoJson).toHaveBeenCalledWith(dist);
    expect(mockImportCsv).not.toHaveBeenCalled();
    expect(mockImportJson).not.toHaveBeenCalled();
  });

  it("triggers datastore import for XLSX with filePath", async () => {
    const dist = {
      id: "dist-xlsx",
      title: "Excel",
      description: null,
      downloadURL: "https://example.com/data.xlsx",
      accessURL: null,
      mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      format: "XLSX",
      conformsTo: null,
      describedBy: null,
      fileName: "data.xlsx",
      filePath: "/uploads/data.xlsx",
      fileSize: 4096,
      datasetId: "ds-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaMock.distribution.create.mockResolvedValue(dist);

    await addDistribution("ds-1", {
      title: "Excel",
      downloadURL: "https://example.com/data.xlsx",
      mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      format: "XLSX",
      fileName: "data.xlsx",
      filePath: "/uploads/data.xlsx",
      fileSize: 4096,
    });

    expect(mockImportExcel).toHaveBeenCalledWith(dist);
    expect(mockImportCsv).not.toHaveBeenCalled();
  });

  it("triggers datastore import for XLS with filePath", async () => {
    const dist = {
      id: "dist-xls",
      title: "Legacy Excel",
      description: null,
      downloadURL: "https://example.com/data.xls",
      accessURL: null,
      mediaType: "application/vnd.ms-excel",
      format: "XLS",
      conformsTo: null,
      describedBy: null,
      fileName: "data.xls",
      filePath: "/uploads/data.xls",
      fileSize: 2048,
      datasetId: "ds-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaMock.distribution.create.mockResolvedValue(dist);

    await addDistribution("ds-1", {
      title: "Legacy Excel",
      downloadURL: "https://example.com/data.xls",
      mediaType: "application/vnd.ms-excel",
      format: "XLS",
      fileName: "data.xls",
      filePath: "/uploads/data.xls",
      fileSize: 2048,
    });

    expect(mockImportExcel).toHaveBeenCalledWith(dist);
    expect(mockImportCsv).not.toHaveBeenCalled();
  });

  it("does not trigger import for unsupported types", async () => {
    prismaMock.distribution.create.mockResolvedValue({
      id: "dist-pdf",
      title: "PDF",
      description: null,
      downloadURL: "https://example.com/doc.pdf",
      accessURL: null,
      mediaType: "application/pdf",
      format: "PDF",
      conformsTo: null,
      describedBy: null,
      fileName: "doc.pdf",
      filePath: "/uploads/doc.pdf",
      fileSize: 2048,
      datasetId: "ds-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await addDistribution("ds-1", {
      title: "PDF",
      downloadURL: "https://example.com/doc.pdf",
      mediaType: "application/pdf",
      format: "PDF",
      fileName: "doc.pdf",
      filePath: "/uploads/doc.pdf",
      fileSize: 2048,
    });

    expect(mockImportCsv).not.toHaveBeenCalled();
    expect(mockImportJson).not.toHaveBeenCalled();
    expect(mockImportGeoJson).not.toHaveBeenCalled();
  });
});

describe("addDistribution remote fetch", () => {
  beforeEach(() => {
    mockFetchAndImport.mockClear();
  });

  it("calls fetchAndImportRemoteResource when downloadURL present, no filePath", async () => {
    const dist = {
      id: "dist-remote",
      title: "Remote CSV",
      description: null,
      downloadURL: "https://example.com/data.csv",
      accessURL: null,
      mediaType: "text/csv",
      format: "CSV",
      conformsTo: null,
      describedBy: null,
      fileName: null,
      filePath: null,
      fileSize: null,
      datasetId: "ds-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaMock.distribution.create.mockResolvedValue(dist);

    await addDistribution("ds-1", {
      title: "Remote CSV",
      downloadURL: "https://example.com/data.csv",
      mediaType: "text/csv",
      format: "CSV",
    });

    expect(mockFetchAndImport).toHaveBeenCalledWith("dist-remote", "https://example.com/data.csv");
  });

  it("does NOT call fetchAndImportRemoteResource when filePath is present", async () => {
    const dist = {
      id: "dist-local",
      title: "Local CSV",
      description: null,
      downloadURL: "https://example.com/data.csv",
      accessURL: null,
      mediaType: "text/csv",
      format: "CSV",
      conformsTo: null,
      describedBy: null,
      fileName: "data.csv",
      filePath: "/uploads/data.csv",
      fileSize: 1024,
      datasetId: "ds-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaMock.distribution.create.mockResolvedValue(dist);

    await addDistribution("ds-1", {
      title: "Local CSV",
      downloadURL: "https://example.com/data.csv",
      mediaType: "text/csv",
      format: "CSV",
      fileName: "data.csv",
      filePath: "/uploads/data.csv",
      fileSize: 1024,
    });

    expect(mockFetchAndImport).not.toHaveBeenCalled();
  });

  it("does NOT call fetchAndImportRemoteResource when downloadURL is absent", async () => {
    const dist = {
      id: "dist-access",
      title: "Access Only",
      description: null,
      downloadURL: null,
      accessURL: "https://example.com/api",
      mediaType: null,
      format: null,
      conformsTo: null,
      describedBy: null,
      fileName: null,
      filePath: null,
      fileSize: null,
      datasetId: "ds-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaMock.distribution.create.mockResolvedValue(dist);

    await addDistribution("ds-1", {
      title: "Access Only",
      accessURL: "https://example.com/api",
    });

    expect(mockFetchAndImport).not.toHaveBeenCalled();
  });
});

describe("removeDistribution", () => {
  it("calls Prisma delete", async () => {
    prismaMock.datastoreTable.findUnique.mockResolvedValue(null);
    prismaMock.distribution.delete.mockResolvedValue({} as any);
    await removeDistribution("dist-1");
    expect(prismaMock.distribution.delete).toHaveBeenCalledWith({
      where: { id: "dist-1" },
    });
  });

  it("deletes datastore table before removing distribution", async () => {
    prismaMock.datastoreTable.findUnique.mockResolvedValue({
      id: "dt-1",
      distributionId: "dist-1",
      tableName: "ds_abc12345",
      columns: "[]",
      rowCount: 10,
      status: "ready",
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prismaMock.distribution.delete.mockResolvedValue({} as any);

    await removeDistribution("dist-1");

    expect(mockDeleteTable).toHaveBeenCalledWith("ds_abc12345");
    expect(prismaMock.distribution.delete).toHaveBeenCalledWith({
      where: { id: "dist-1" },
    });
  });
});
