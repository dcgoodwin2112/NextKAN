// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mockFindFirst = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    dataset: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

const mockDataset = {
  id: "a1b2c3d4-e5f6-1234-a567-123456789abc",
  slug: "census-data",
  title: "Census Data",
  description: "Census data description",
  identifier: "CENSUS-001",
  status: "published",
  contactName: "Jane",
  contactEmail: "jane@example.gov",
  license: "",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-15"),
  publisher: {
    id: "pub-1",
    name: "Census Bureau",
    slug: "census-bureau",
    description: "US Census",
  },
  distributions: [],
  keywords: [{ keyword: "census" }],
  themes: [],
};

describe("GET /api/3/action/package_show", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns CKAN-formatted dataset", async () => {
    mockFindFirst.mockResolvedValue(mockDataset);

    const request = new NextRequest("http://localhost/api/3/action/package_show?id=census-data");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.result.title).toBe("Census Data");
    expect(body.result.name).toBe("census-data");
    expect(body.result.organization.title).toBe("Census Bureau");
  });

  it("returns 404 for non-existent ID", async () => {
    mockFindFirst.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/3/action/package_show?id=nonexistent");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
  });

  it("returns 400 when id parameter is missing", async () => {
    const request = new NextRequest("http://localhost/api/3/action/package_show");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });
});
