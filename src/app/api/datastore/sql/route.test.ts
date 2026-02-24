// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExecuteSql } = vi.hoisted(() => ({
  mockExecuteSql: vi.fn(),
}));

vi.mock("@/lib/services/datastore", () => ({
  executeSql: mockExecuteSql,
}));

import { POST } from "./route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/datastore/sql", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/datastore/sql", () => {
  beforeEach(() => {
    mockExecuteSql.mockReset();
  });

  it("executes valid SELECT and returns results", async () => {
    mockExecuteSql.mockReturnValue({
      columns: ["name", "age"],
      records: [{ name: "Alice", age: 30 }],
      executionTime: 5,
    });

    const res = await POST(
      makeRequest({ sql: "SELECT * FROM ds_abc12345 LIMIT 5" })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.columns).toEqual(["name", "age"]);
    expect(json.records).toHaveLength(1);
    expect(json.executionTime).toBe(5);
  });

  it("returns 500 for non-SELECT statement", async () => {
    mockExecuteSql.mockImplementation(() => {
      throw new Error("Only SELECT statements are allowed");
    });

    const res = await POST(
      makeRequest({ sql: "DROP TABLE ds_abc12345" })
    );

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("SELECT");
  });

  it("returns 500 for non-ds_ table", async () => {
    mockExecuteSql.mockImplementation(() => {
      throw new Error("Access denied to table: User");
    });

    const res = await POST(
      makeRequest({ sql: "SELECT * FROM User" })
    );

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("Access denied");
  });

  it("returns 400 for missing sql field", async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
  });
});
