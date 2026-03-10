// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    distribution: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
}));

vi.mock("xlsx", () => ({
  read: vi.fn(),
  utils: { sheet_to_json: vi.fn() },
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import * as XLSX from "xlsx";

const mockFindUnique = prisma.distribution.findUnique as ReturnType<typeof vi.fn>;
const mockReadFile = readFile as ReturnType<typeof vi.fn>;

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/preview/dist-1");
}

function makeParams(distributionId = "dist-1") {
  return { params: Promise.resolve({ distributionId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/preview/[distributionId]", () => {
  it("returns 404 when distribution not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Distribution not found");
  });

  it("returns 404 when no filePath", async () => {
    mockFindUnique.mockResolvedValue({ id: "dist-1", filePath: null });
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("No file available for preview");
  });

  it("returns CSV preview", async () => {
    mockFindUnique.mockResolvedValue({
      id: "dist-1",
      filePath: "/uploads/data.csv",
      format: "CSV",
      mediaType: "text/csv",
    });
    mockReadFile.mockResolvedValue("name,value\nAlice,100\nBob,200");

    const res = await GET(makeRequest(), makeParams());
    const body = await res.json();
    expect(body.type).toBe("csv");
    expect(body.columns).toEqual(["name", "value"]);
    expect(body.rows).toHaveLength(2);
    expect(body.totalRows).toBe(2);
  });

  it("returns json-table for array-of-objects JSON", async () => {
    mockFindUnique.mockResolvedValue({
      id: "dist-1",
      filePath: "/uploads/data.json",
      format: "JSON",
      mediaType: "application/json",
    });
    mockReadFile.mockResolvedValue(
      JSON.stringify([
        { city: "Springfield", pop: 50000 },
        { city: "Shelbyville", pop: 30000 },
      ])
    );

    const res = await GET(makeRequest(), makeParams());
    const body = await res.json();
    expect(body.type).toBe("json-table");
    expect(body.columns).toContain("city");
    expect(body.columns).toContain("pop");
    expect(body.rows).toHaveLength(2);
  });

  it("returns raw json for non-tabular JSON", async () => {
    mockFindUnique.mockResolvedValue({
      id: "dist-1",
      filePath: "/uploads/config.json",
      format: "JSON",
      mediaType: "application/json",
    });
    mockReadFile.mockResolvedValue(JSON.stringify({ key: "value", nested: { a: 1 } }));

    const res = await GET(makeRequest(), makeParams());
    const body = await res.json();
    expect(body.type).toBe("json");
    expect(body.content).toBeTruthy();
  });

  it("returns geojson preview with columns, rows, and raw geojson", async () => {
    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "Park A", area: 500 },
          geometry: { type: "Point", coordinates: [-89.6, 39.8] },
        },
      ],
    };
    mockFindUnique.mockResolvedValue({
      id: "dist-1",
      filePath: "/uploads/data.geojson",
      format: "GEOJSON",
      mediaType: "application/geo+json",
    });
    mockReadFile.mockResolvedValue(JSON.stringify(geojson));

    const res = await GET(makeRequest(), makeParams());
    const body = await res.json();
    expect(body.type).toBe("geojson");
    expect(body.columns).toContain("name");
    expect(body.columns).toContain("area");
    expect(body.columns).toContain("geometry");
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].name).toBe("Park A");
    expect(body.geojson).toEqual(geojson);
    expect(body.totalRows).toBe(1);
  });

  it("returns csv-shaped preview for Excel", async () => {
    mockFindUnique.mockResolvedValue({
      id: "dist-1",
      filePath: "/uploads/budget.xlsx",
      format: "XLSX",
      mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    mockReadFile.mockResolvedValue(Buffer.from("fake-excel"));
    (XLSX.read as ReturnType<typeof vi.fn>).mockReturnValue({
      SheetNames: ["Sheet1"],
      Sheets: { Sheet1: {} },
    });
    (XLSX.utils.sheet_to_json as ReturnType<typeof vi.fn>).mockReturnValue([
      { Department: "Parks", Budget: 50000 },
      { Department: "Fire", Budget: 80000 },
    ]);

    const res = await GET(makeRequest(), makeParams());
    const body = await res.json();
    expect(body.type).toBe("csv");
    expect(body.columns).toContain("Department");
    expect(body.columns).toContain("Budget");
    expect(body.rows).toHaveLength(2);
    expect(body.rows[0].Budget).toBe("50000");
  });

  it("returns unsupported for unknown formats", async () => {
    mockFindUnique.mockResolvedValue({
      id: "dist-1",
      filePath: "/uploads/data.xyz",
      format: "XYZ",
      mediaType: null,
    });
    mockReadFile.mockResolvedValue("binary stuff");

    const res = await GET(makeRequest(), makeParams());
    const body = await res.json();
    expect(body.type).toBe("unsupported");
  });

  it("returns 500 on file read error", async () => {
    mockFindUnique.mockResolvedValue({
      id: "dist-1",
      filePath: "/uploads/missing.csv",
      format: "CSV",
      mediaType: "text/csv",
    });
    mockReadFile.mockRejectedValue(new Error("ENOENT"));

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to read file");
  });
});
