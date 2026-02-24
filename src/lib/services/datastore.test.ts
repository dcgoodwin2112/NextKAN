// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("better-sqlite3", () => {
  const mockStmt = {
    run: vi.fn(),
    all: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue({ count: 0 }),
  };
  const mockDb = {
    exec: vi.fn(),
    prepare: vi.fn().mockReturnValue(mockStmt),
    close: vi.fn(),
  };
  function MockDatabase() {
    return mockDb;
  }
  return { default: MockDatabase };
});

vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
}));

import {
  generateTableName,
  sanitizeColumnName,
  inferColumnTypes,
  buildFilterClause,
  validateSql,
  importCsvToDatastore,
  deleteDatastoreTable,
} from "./datastore";
import { readFile } from "fs/promises";
import type { Distribution } from "@/generated/prisma/client";

describe("generateTableName", () => {
  it("generates ds_ prefix with first 8 hex chars", () => {
    const result = generateTableName("a1b2c3d4-e5f6-1234-a567-123456789abc");
    expect(result).toBe("ds_a1b2c3d4");
  });

  it("strips hyphens before extracting", () => {
    const result = generateTableName("aaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(result).toBe("ds_aaaabbbb");
  });
});

describe("sanitizeColumnName", () => {
  it("replaces non-alphanumeric with underscores", () => {
    expect(sanitizeColumnName("my column!")).toBe("my_column");
  });

  it("prefixes digit-leading names", () => {
    expect(sanitizeColumnName("123col")).toBe("col_123col");
  });

  it("handles empty string", () => {
    expect(sanitizeColumnName("")).toBe("col_");
  });

  it("lowercases names", () => {
    expect(sanitizeColumnName("FirstName")).toBe("firstname");
  });

  it("deduplicates underscores", () => {
    expect(sanitizeColumnName("a  b")).toBe("a_b");
  });
});

describe("inferColumnTypes", () => {
  it("infers INTEGER for integer-only values", () => {
    const result = inferColumnTypes(["count"], [
      { count: "1" },
      { count: "42" },
      { count: "-3" },
    ]);
    expect(result[0].type).toBe("INTEGER");
  });

  it("infers REAL for decimal values", () => {
    const result = inferColumnTypes(["price"], [
      { price: "1.5" },
      { price: "2.99" },
    ]);
    expect(result[0].type).toBe("REAL");
  });

  it("infers BOOLEAN for boolean-like values", () => {
    const result = inferColumnTypes(["active"], [
      { active: "true" },
      { active: "false" },
      { active: "yes" },
    ]);
    expect(result[0].type).toBe("BOOLEAN");
  });

  it("defaults to TEXT for mixed values", () => {
    const result = inferColumnTypes(["data"], [
      { data: "hello" },
      { data: "42" },
    ]);
    expect(result[0].type).toBe("TEXT");
  });

  it("defaults to TEXT for empty values", () => {
    const result = inferColumnTypes(["empty"], [
      { empty: "" },
      { empty: "" },
    ]);
    expect(result[0].type).toBe("TEXT");
  });
});

describe("buildFilterClause", () => {
  const columns = [
    { name: "name", type: "TEXT" as const },
    { name: "age", type: "INTEGER" as const },
  ];

  it("returns empty for no filters", () => {
    const result = buildFilterClause([], columns);
    expect(result.where).toBe("");
    expect(result.params).toEqual([]);
  });

  it("builds equality filter", () => {
    const result = buildFilterClause(
      [{ column: "name", operator: "=", value: "Alice" }],
      columns
    );
    expect(result.where).toBe('WHERE "name" = ?');
    expect(result.params).toEqual(["Alice"]);
  });

  it("builds contains filter with LIKE", () => {
    const result = buildFilterClause(
      [{ column: "name", operator: "contains", value: "li" }],
      columns
    );
    expect(result.where).toBe('WHERE "name" LIKE ?');
    expect(result.params).toEqual(["%li%"]);
  });

  it("builds starts_with filter", () => {
    const result = buildFilterClause(
      [{ column: "name", operator: "starts_with", value: "A" }],
      columns
    );
    expect(result.where).toBe('WHERE "name" LIKE ?');
    expect(result.params).toEqual(["A%"]);
  });

  it("throws for unknown column", () => {
    expect(() =>
      buildFilterClause(
        [{ column: "unknown", operator: "=", value: "x" }],
        columns
      )
    ).toThrow("Unknown column: unknown");
  });

  it("combines multiple filters with AND", () => {
    const result = buildFilterClause(
      [
        { column: "name", operator: "=", value: "Alice" },
        { column: "age", operator: ">", value: 18 },
      ],
      columns
    );
    expect(result.where).toBe('WHERE "name" = ? AND "age" > ?');
    expect(result.params).toEqual(["Alice", 18]);
  });
});

describe("validateSql", () => {
  it("accepts valid SELECT from ds_ table", () => {
    const result = validateSql("SELECT * FROM ds_abc12345");
    expect(result.valid).toBe(true);
  });

  it("accepts SELECT with JOIN on ds_ tables", () => {
    const result = validateSql(
      "SELECT a.x FROM ds_abc a JOIN ds_def b ON a.id = b.id"
    );
    expect(result.valid).toBe(true);
  });

  it("rejects non-SELECT statements", () => {
    expect(validateSql("INSERT INTO ds_abc VALUES (1)").valid).toBe(false);
  });

  it("rejects DROP statements", () => {
    expect(validateSql("SELECT 1; DROP TABLE ds_abc").valid).toBe(false);
  });

  it("rejects access to non-ds_ tables", () => {
    const result = validateSql("SELECT * FROM User");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Access denied");
  });

  it("rejects multiple statements (semicolons)", () => {
    const result = validateSql("SELECT 1; SELECT 2");
    expect(result.valid).toBe(false);
  });

  it("rejects DELETE keyword", () => {
    expect(
      validateSql("SELECT * FROM ds_abc WHERE DELETE = 1").valid
    ).toBe(false);
  });

  it("rejects PRAGMA", () => {
    expect(validateSql("PRAGMA table_info(ds_abc)").valid).toBe(false);
  });
});

describe("importCsvToDatastore", () => {
  const mockDistribution = {
    id: "a1b2c3d4-e5f6-1234-a567-123456789abc",
    filePath: "/tmp/test.csv",
    mediaType: "text/csv",
    datasetId: "ds-1",
    title: null,
    description: null,
    downloadURL: null,
    accessURL: null,
    format: null,
    conformsTo: null,
    describedBy: null,
    fileName: "test.csv",
    fileSize: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Distribution;

  beforeEach(() => {
    prismaMock.datastoreTable.create.mockResolvedValue({
      id: "dt-1",
      distributionId: mockDistribution.id,
      tableName: "ds_a1b2c3d4",
      columns: "[]",
      rowCount: 0,
      status: "pending",
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prismaMock.datastoreTable.update.mockResolvedValue({} as any);
  });

  it("creates DatastoreTable record and processes CSV", async () => {
    vi.mocked(readFile).mockResolvedValue("name,age\nAlice,30\nBob,25");

    await importCsvToDatastore(mockDistribution);

    expect(prismaMock.datastoreTable.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          distributionId: mockDistribution.id,
          status: "pending",
        }),
      })
    );

    expect(prismaMock.datastoreTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ready" }),
      })
    );
  });

  it("sets error status on failure", async () => {
    vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

    await importCsvToDatastore(mockDistribution);

    expect(prismaMock.datastoreTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "error",
          errorMessage: "File not found",
        }),
      })
    );
  });
});

describe("deleteDatastoreTable", () => {
  it("throws for non-ds_ table names", () => {
    expect(() => deleteDatastoreTable("User")).toThrow(
      "Invalid datastore table name"
    );
  });

  it("executes DROP for valid ds_ table", () => {
    deleteDatastoreTable("ds_abc12345");
    // no throw = success (mock db)
  });
});
