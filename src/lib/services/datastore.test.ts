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
  importJsonToDatastore,
  importGeoJsonToDatastore,
  flattenObject,
  stringifyValues,
  extractJsonArray,
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

describe("flattenObject", () => {
  it("returns flat object as-is", () => {
    expect(flattenObject({ a: 1, b: "two" })).toEqual({ a: 1, b: "two" });
  });

  it("flattens nested objects with dot notation", () => {
    expect(flattenObject({ a: { b: 1, c: { d: 2 } } })).toEqual({
      "a.b": 1,
      "a.c.d": 2,
    });
  });

  it("stops at maxDepth and preserves value as-is", () => {
    const result = flattenObject({ a: { b: { c: "deep" } } }, "", 0, 1);
    expect(result).toEqual({ "a.b": { c: "deep" } });
  });

  it("preserves arrays as-is", () => {
    expect(flattenObject({ tags: [1, 2, 3] })).toEqual({ tags: [1, 2, 3] });
  });

  it("preserves null values", () => {
    expect(flattenObject({ a: null })).toEqual({ a: null });
  });

  it("handles empty object", () => {
    expect(flattenObject({})).toEqual({});
  });
});

describe("stringifyValues", () => {
  it("passes strings through", () => {
    expect(stringifyValues({ a: "hello" })).toEqual({ a: "hello" });
  });

  it("converts numbers to strings", () => {
    expect(stringifyValues({ a: 42 })).toEqual({ a: "42" });
  });

  it("converts booleans to strings", () => {
    expect(stringifyValues({ a: true, b: false })).toEqual({
      a: "true",
      b: "false",
    });
  });

  it("converts null to empty string", () => {
    expect(stringifyValues({ a: null })).toEqual({ a: "" });
  });

  it("converts undefined to empty string", () => {
    expect(stringifyValues({ a: undefined })).toEqual({ a: "" });
  });

  it("converts objects to JSON strings", () => {
    expect(stringifyValues({ a: { x: 1 } })).toEqual({ a: '{"x":1}' });
  });

  it("converts arrays to JSON strings", () => {
    expect(stringifyValues({ a: [1, 2] })).toEqual({ a: "[1,2]" });
  });
});

describe("extractJsonArray", () => {
  it("returns root array of objects", () => {
    const data = [{ a: 1 }, { a: 2 }];
    expect(extractJsonArray(data)).toEqual(data);
  });

  it("finds nested array in object", () => {
    const data = { results: [{ a: 1 }, { a: 2 }] };
    expect(extractJsonArray(data)).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("throws for empty array", () => {
    expect(() => extractJsonArray([])).toThrow("JSON array is empty");
  });

  it("throws for array of primitives", () => {
    expect(() => extractJsonArray([1, 2, 3])).toThrow(
      "JSON array must contain objects"
    );
  });

  it("throws when no array found in object", () => {
    expect(() => extractJsonArray({ a: "string" })).toThrow(
      "No array of objects found"
    );
  });

  it("throws for null", () => {
    expect(() => extractJsonArray(null)).toThrow("No array of objects found");
  });
});

describe("importJsonToDatastore", () => {
  const mockDistribution = {
    id: "a1b2c3d4-e5f6-1234-a567-123456789abc",
    filePath: "/tmp/test.json",
    mediaType: "application/json",
    datasetId: "ds-1",
    title: null,
    description: null,
    downloadURL: null,
    accessURL: null,
    format: null,
    conformsTo: null,
    describedBy: null,
    fileName: "test.json",
    fileSize: 200,
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

  it("imports a JSON array into datastore", async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify([{ name: "Alice", age: 30 }, { name: "Bob", age: 25 }])
    );

    await importJsonToDatastore(mockDistribution);

    expect(prismaMock.datastoreTable.create).toHaveBeenCalled();
    expect(prismaMock.datastoreTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ready", rowCount: 2 }),
      })
    );
  });

  it("handles sparse objects by union of keys", async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify([{ a: 1 }, { b: 2 }])
    );

    await importJsonToDatastore(mockDistribution);

    expect(prismaMock.datastoreTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ready", rowCount: 2 }),
      })
    );
  });

  it("flattens nested objects", async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify([{ info: { name: "Alice" } }])
    );

    await importJsonToDatastore(mockDistribution);

    expect(prismaMock.datastoreTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ready",
          columns: expect.stringContaining("info_name"),
        }),
      })
    );
  });

  it("handles nested array property in object", async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({ data: [{ x: 1 }] })
    );

    await importJsonToDatastore(mockDistribution);

    expect(prismaMock.datastoreTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ready", rowCount: 1 }),
      })
    );
  });

  it("sets error status for invalid JSON", async () => {
    vi.mocked(readFile).mockResolvedValue("not valid json{{{");

    await importJsonToDatastore(mockDistribution);

    expect(prismaMock.datastoreTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "error" }),
      })
    );
  });

  it("sets error status when no filePath", async () => {
    const noPath = { ...mockDistribution, filePath: null } as Distribution;

    await importJsonToDatastore(noPath);

    expect(prismaMock.datastoreTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "error",
          errorMessage: "No file path for distribution",
        }),
      })
    );
  });
});

describe("importGeoJsonToDatastore", () => {
  const mockDistribution = {
    id: "a1b2c3d4-e5f6-1234-a567-123456789abc",
    filePath: "/tmp/test.geojson",
    mediaType: "application/geo+json",
    datasetId: "ds-1",
    title: null,
    description: null,
    downloadURL: null,
    accessURL: null,
    format: null,
    conformsTo: null,
    describedBy: null,
    fileName: "test.geojson",
    fileSize: 500,
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

  it("imports a FeatureCollection into datastore", async () => {
    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "Park", area: 500 },
          geometry: { type: "Point", coordinates: [-77.0, 38.9] },
        },
        {
          type: "Feature",
          properties: { name: "Lake", area: 1200 },
          geometry: { type: "Point", coordinates: [-76.5, 39.0] },
        },
      ],
    };
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(geojson));

    await importGeoJsonToDatastore(mockDistribution);

    expect(prismaMock.datastoreTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ready", rowCount: 2 }),
      })
    );
  });

  it("stores geometry as TEXT column", async () => {
    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "A" },
          geometry: { type: "Point", coordinates: [0, 0] },
        },
      ],
    };
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(geojson));

    await importGeoJsonToDatastore(mockDistribution);

    expect(prismaMock.datastoreTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          columns: expect.stringContaining("geometry"),
        }),
      })
    );
  });

  it("handles features without properties", async () => {
    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [1, 2] },
        },
      ],
    };
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(geojson));

    await importGeoJsonToDatastore(mockDistribution);

    expect(prismaMock.datastoreTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ready", rowCount: 1 }),
      })
    );
  });

  it("accepts bare features array", async () => {
    const features = [
      {
        properties: { id: 1 },
        geometry: { type: "Point", coordinates: [0, 0] },
      },
    ];
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(features));

    await importGeoJsonToDatastore(mockDistribution);

    expect(prismaMock.datastoreTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ready", rowCount: 1 }),
      })
    );
  });

  it("sets error status for invalid GeoJSON", async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ type: "Bad" }));

    await importGeoJsonToDatastore(mockDistribution);

    expect(prismaMock.datastoreTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "error",
          errorMessage: "Invalid GeoJSON: must have features array",
        }),
      })
    );
  });

  it("sets error status for empty features", async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({ type: "FeatureCollection", features: [] })
    );

    await importGeoJsonToDatastore(mockDistribution);

    expect(prismaMock.datastoreTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "error",
          errorMessage: "GeoJSON features array is empty",
        }),
      })
    );
  });

  it("sets error status when no filePath", async () => {
    const noPath = { ...mockDistribution, filePath: null } as Distribution;

    await importGeoJsonToDatastore(noPath);

    expect(prismaMock.datastoreTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "error",
          errorMessage: "No file path for distribution",
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
