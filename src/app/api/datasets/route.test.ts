// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

const mockListDatasets = vi.fn();
const mockCreateDataset = vi.fn();
const mockAuth = vi.fn();

vi.mock("@/lib/actions/datasets", () => ({
  listDatasets: (...args: unknown[]) => mockListDatasets(...args),
  createDataset: (...args: unknown[]) => mockCreateDataset(...args),
}));

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(url, options);
}

describe("GET /api/datasets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated dataset list", async () => {
    const datasets = [{ id: "1", title: "Test" }];
    mockListDatasets.mockResolvedValue({ datasets, total: 1 });

    const response = await GET(
      makeRequest("http://localhost/api/datasets")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.datasets).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
  });

  it("applies search query parameter", async () => {
    mockListDatasets.mockResolvedValue({ datasets: [], total: 0 });

    await GET(
      makeRequest("http://localhost/api/datasets?search=climate&page=2")
    );

    expect(mockListDatasets).toHaveBeenCalledWith(
      expect.objectContaining({
        search: "climate",
        page: 2,
      })
    );
  });
});

describe("POST /api/datasets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates dataset and returns 201 with auth", async () => {
    mockAuth.mockResolvedValue({ user: { id: "1", role: "admin" } });
    const dataset = { id: "new", title: "New Dataset" };
    mockCreateDataset.mockResolvedValue(dataset);

    const response = await POST(
      makeRequest("http://localhost/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Dataset",
          description: "Description",
          publisherId: "a1b2c3d4-e5f6-1234-a567-123456789abc",
          keywords: ["test"],
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.title).toBe("New Dataset");
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(
      makeRequest("http://localhost/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Test" }),
      })
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid input", async () => {
    mockAuth.mockResolvedValue({ user: { id: "1", role: "admin" } });
    mockCreateDataset.mockRejectedValue(
      new (await import("zod")).ZodError([
        {
          code: "invalid_type",
          expected: "string",
          received: "undefined",
          path: ["title"],
          message: "Required",
        },
      ])
    );

    const response = await POST(
      makeRequest("http://localhost/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(400);
  });
});
