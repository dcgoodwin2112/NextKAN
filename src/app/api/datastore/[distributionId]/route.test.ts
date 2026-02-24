// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";

const { mockQueryDatastore } = vi.hoisted(() => ({
  mockQueryDatastore: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/services/datastore", () => ({
  queryDatastore: mockQueryDatastore,
}));

import { GET } from "./route";
import { NextRequest } from "next/server";

const columns = [
  { name: "name", type: "TEXT" },
  { name: "age", type: "INTEGER" },
];

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

function makeParams(distributionId: string) {
  return { params: Promise.resolve({ distributionId }) };
}

describe("GET /api/datastore/[distributionId]", () => {
  beforeEach(() => {
    mockQueryDatastore.mockReset();
  });

  it("returns records with default pagination", async () => {
    prismaMock.datastoreTable.findUnique.mockResolvedValue({
      id: "dt-1",
      distributionId: "dist-1",
      tableName: "ds_abc12345",
      columns: JSON.stringify(columns),
      rowCount: 2,
      status: "ready",
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockQueryDatastore.mockReturnValue({
      records: [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ],
      total: 2,
    });

    const res = await GET(
      makeRequest("/api/datastore/dist-1"),
      makeParams("dist-1")
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.columns).toEqual(["name", "age"]);
    expect(json.records).toHaveLength(2);
    expect(json.total).toBe(2);
    expect(json.limit).toBe(100);
    expect(json.offset).toBe(0);
  });

  it("passes limit and offset to query", async () => {
    prismaMock.datastoreTable.findUnique.mockResolvedValue({
      id: "dt-1",
      distributionId: "dist-1",
      tableName: "ds_abc12345",
      columns: JSON.stringify(columns),
      rowCount: 100,
      status: "ready",
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockQueryDatastore.mockReturnValue({ records: [], total: 100 });

    const res = await GET(
      makeRequest("/api/datastore/dist-1?limit=10&offset=20"),
      makeParams("dist-1")
    );
    const json = await res.json();

    expect(json.limit).toBe(10);
    expect(json.offset).toBe(20);
    expect(mockQueryDatastore).toHaveBeenCalledWith(
      "ds_abc12345",
      columns,
      expect.objectContaining({ limit: 10, offset: 20 })
    );
  });

  it("passes sort and order", async () => {
    prismaMock.datastoreTable.findUnique.mockResolvedValue({
      id: "dt-1",
      distributionId: "dist-1",
      tableName: "ds_abc12345",
      columns: JSON.stringify(columns),
      rowCount: 10,
      status: "ready",
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockQueryDatastore.mockReturnValue({ records: [], total: 10 });

    await GET(
      makeRequest("/api/datastore/dist-1?sort=name&order=desc"),
      makeParams("dist-1")
    );

    expect(mockQueryDatastore).toHaveBeenCalledWith(
      "ds_abc12345",
      columns,
      expect.objectContaining({ sort: "name", order: "desc" })
    );
  });

  it("returns 404 when datastore not found", async () => {
    prismaMock.datastoreTable.findUnique.mockResolvedValue(null);

    const res = await GET(
      makeRequest("/api/datastore/nonexistent"),
      makeParams("nonexistent")
    );

    expect(res.status).toBe(404);
  });

  it("returns 404 when status is not ready", async () => {
    prismaMock.datastoreTable.findUnique.mockResolvedValue({
      id: "dt-1",
      distributionId: "dist-1",
      tableName: "ds_abc12345",
      columns: "[]",
      rowCount: 0,
      status: "error",
      errorMessage: "Import failed",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await GET(
      makeRequest("/api/datastore/dist-1"),
      makeParams("dist-1")
    );

    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid query params", async () => {
    prismaMock.datastoreTable.findUnique.mockResolvedValue({
      id: "dt-1",
      distributionId: "dist-1",
      tableName: "ds_abc12345",
      columns: JSON.stringify(columns),
      rowCount: 10,
      status: "ready",
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await GET(
      makeRequest("/api/datastore/dist-1?limit=-1"),
      makeParams("dist-1")
    );

    expect(res.status).toBe(400);
  });
});
