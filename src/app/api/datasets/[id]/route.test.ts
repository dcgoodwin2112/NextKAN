// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "./route";

const mockGetDataset = vi.fn();
const mockUpdateDataset = vi.fn();
const mockDeleteDataset = vi.fn();
const mockAuth = vi.fn();

vi.mock("@/lib/actions/datasets", () => ({
  getDataset: (...args: unknown[]) => mockGetDataset(...args),
  updateDataset: (...args: unknown[]) => mockUpdateDataset(...args),
  deleteDataset: (...args: unknown[]) => mockDeleteDataset(...args),
}));

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

const testId = "a1b2c3d4-e5f6-1234-a567-123456789abc";

function makeRequest(url: string, options?: RequestInit) {
  return new Request(url, options) as any;
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/datasets/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns dataset by ID", async () => {
    const dataset = { id: testId, title: "Test Dataset" };
    mockGetDataset.mockResolvedValue(dataset);

    const response = await GET(
      makeRequest(`http://localhost/api/datasets/${testId}`),
      makeParams(testId)
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.title).toBe("Test Dataset");
  });

  it("returns 404 for non-existent ID", async () => {
    mockGetDataset.mockResolvedValue(null);

    const response = await GET(
      makeRequest(`http://localhost/api/datasets/${testId}`),
      makeParams(testId)
    );

    expect(response.status).toBe(404);
  });
});

describe("PUT /api/datasets/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates and returns 200 with auth", async () => {
    mockAuth.mockResolvedValue({ user: { id: "1", role: "admin" } });
    const updated = { id: testId, title: "Updated" };
    mockUpdateDataset.mockResolvedValue(updated);

    const response = await PUT(
      makeRequest(`http://localhost/api/datasets/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      }),
      makeParams(testId)
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.title).toBe("Updated");
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await PUT(
      makeRequest(`http://localhost/api/datasets/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      }),
      makeParams(testId)
    );

    expect(response.status).toBe(401);
  });
});

describe("DELETE /api/datasets/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 204 with auth", async () => {
    mockAuth.mockResolvedValue({ user: { id: "1", role: "admin" } });
    mockDeleteDataset.mockResolvedValue(undefined);

    const response = await DELETE(
      makeRequest(`http://localhost/api/datasets/${testId}`, {
        method: "DELETE",
      }),
      makeParams(testId)
    );

    expect(response.status).toBe(204);
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await DELETE(
      makeRequest(`http://localhost/api/datasets/${testId}`, {
        method: "DELETE",
      }),
      makeParams(testId)
    );

    expect(response.status).toBe(401);
  });
});
