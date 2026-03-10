// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

vi.mock("@/lib/db", () => ({
  prisma: {
    distribution: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/data-dictionary", () => ({
  exportFrictionless: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { exportFrictionless } from "@/lib/services/data-dictionary";

const mockFindMany = prisma.distribution.findMany as ReturnType<typeof vi.fn>;
const mockExportFrictionless = exportFrictionless as ReturnType<typeof vi.fn>;

describe("GET /api/datasets/[id]/dictionary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockDistributions = [
    {
      id: "dist-1",
      title: "My CSV",
      fileName: "data.csv",
      format: "CSV",
      dataDictionary: { id: "dd-1" },
    },
  ];

  const mockSchema = {
    fields: [
      { name: "id", type: "integer", title: "Record ID" },
      { name: "value", type: "string" },
    ],
  };

  it("returns JSON response by default", async () => {
    mockFindMany.mockResolvedValue(mockDistributions);
    mockExportFrictionless.mockResolvedValue(mockSchema);

    const request = new NextRequest("http://localhost/api/datasets/ds-1/dictionary");
    const response = await GET(request, { params: Promise.resolve({ id: "ds-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].schema.fields).toHaveLength(2);
  });

  it("returns CSV with ?format=csv", async () => {
    mockFindMany.mockResolvedValue(mockDistributions);
    mockExportFrictionless.mockResolvedValue(mockSchema);

    const request = new NextRequest(
      "http://localhost/api/datasets/ds-1/dictionary?format=csv"
    );
    const response = await GET(request, { params: Promise.resolve({ id: "ds-1" }) });

    expect(response.headers.get("Content-Type")).toBe("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain("dictionary-ds-1.csv");

    const body = await response.text();
    expect(body).toContain("distributionTitle");
    expect(body).toContain("My CSV");
    expect(body).toContain("integer");
  });

  it("returns JSON with ?format=json (same as default)", async () => {
    mockFindMany.mockResolvedValue(mockDistributions);
    mockExportFrictionless.mockResolvedValue(mockSchema);

    const request = new NextRequest(
      "http://localhost/api/datasets/ds-1/dictionary?format=json"
    );
    const response = await GET(request, { params: Promise.resolve({ id: "ds-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
  });
});
