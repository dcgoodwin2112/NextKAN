// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mockFindMany = vi.fn();
const mockCount = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    dataset: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

vi.mock("@/lib/utils/search", () => ({
  buildSearchWhere: (params: { query?: string }) => {
    if (params.query) {
      return { title: { contains: params.query } };
    }
    return {};
  },
}));

const mockDataset = {
  id: "a1b2c3d4-e5f6-1234-a567-123456789abc",
  slug: "census-data",
  title: "Census Data",
  description: "Census data",
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
    description: "",
  },
  distributions: [],
  keywords: [],
  themes: [],
};

describe("GET /api/3/action/package_search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns search results with count", async () => {
    mockFindMany.mockResolvedValue([mockDataset]);
    mockCount.mockResolvedValue(1);

    const request = new NextRequest("http://localhost/api/3/action/package_search");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.result.count).toBe(1);
    expect(body.result.results).toHaveLength(1);
    expect(body.result.results[0].title).toBe("Census Data");
  });

  it("applies search query", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const request = new NextRequest("http://localhost/api/3/action/package_search?q=census");
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          title: { contains: "census" },
          status: "published",
        }),
      })
    );
  });

  it("applies rows and start parameters", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const request = new NextRequest("http://localhost/api/3/action/package_search?rows=5&start=10");
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 5,
      })
    );
  });
});
