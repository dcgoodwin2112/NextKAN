// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const mockFindMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    dataset: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

describe("GET /api/3/action/package_list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns array of dataset slugs", async () => {
    mockFindMany.mockResolvedValue([
      { slug: "census-data" },
      { slug: "weather-data" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.result).toEqual(["census-data", "weather-data"]);
  });

  it("returns empty array when no datasets", async () => {
    mockFindMany.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.result).toEqual([]);
  });

  it("only queries published datasets", async () => {
    mockFindMany.mockResolvedValue([]);
    await GET();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "published", deletedAt: null },
      })
    );
  });
});
