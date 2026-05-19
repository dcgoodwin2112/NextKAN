import { describe, expect, it } from "vitest";

import {
  buildOrderClause,
  buildProjection,
  buildWhereClause,
  type Filter,
} from "./sql-builder";
import type { ResourceWithColumns } from "./helpers";

function res(): ResourceWithColumns {
  return {
    id: "r1",
    parquetPath: "resources/r1/data.parquet",
    rowCount: 10,
    fileName: null,
    mediaType: "text/csv",
    title: null,
    description: null,
    downloadURL: null,
    datasetId: "d1",
    datasetTitle: "Test",
    datasetStatus: "published",
    columns: [
      { name: "id", type: "integer", filterable: true, aggregatable: true, isPii: false, isGeometry: false, position: 0 },
      { name: "name", type: "string", filterable: true, aggregatable: false, isPii: false, isGeometry: false, position: 1 },
      { name: "free_text", type: "string", filterable: false, aggregatable: false, isPii: false, isGeometry: false, position: 2 },
      { name: "amount", type: "number", filterable: false, aggregatable: true, isPii: false, isGeometry: false, position: 3 },
      { name: "joined_at", type: "date", filterable: true, aggregatable: false, isPii: false, isGeometry: false, position: 4 },
    ],
  };
}

function resWithPii(): ResourceWithColumns {
  return {
    ...res(),
    columns: [
      { name: "id", type: "integer", filterable: true, aggregatable: true, isPii: false, isGeometry: false, position: 0 },
      { name: "name", type: "string", filterable: true, aggregatable: false, isPii: false, isGeometry: false, position: 1 },
      { name: "email", type: "string", filterable: true, aggregatable: false, isPii: true, isGeometry: false, position: 2 },
    ],
  };
}

describe("buildWhereClause", () => {
  it("returns null with no filters", () => {
    expect(buildWhereClause(res(), undefined)).toBeNull();
    expect(buildWhereClause(res(), [])).toBeNull();
  });

  it("renders simple equality with proper escaping", () => {
    const sql = buildWhereClause(res(), [
      { column: "name", operator: "=", value: "O'Hara" },
    ]);
    expect(sql).toBe(`"name" = 'O''Hara'`);
  });

  it("renders numeric comparisons without quoting", () => {
    const sql = buildWhereClause(res(), [
      { column: "id", operator: ">", value: 100 },
    ]);
    expect(sql).toBe(`"id" > 100`);
  });

  it("renders IN with a value list", () => {
    const sql = buildWhereClause(res(), [
      { column: "name", operator: "in", value: ["a", "b"] },
    ]);
    expect(sql).toBe(`"name" IN ('a', 'b')`);
  });

  it("renders IS NULL / IS NOT NULL without a value", () => {
    expect(
      buildWhereClause(res(), [{ column: "name", operator: "is_null" }]),
    ).toBe(`"name" IS NULL`);
    expect(
      buildWhereClause(res(), [{ column: "name", operator: "is_not_null" }]),
    ).toBe(`"name" IS NOT NULL`);
  });

  it("renders contains and starts_with", () => {
    expect(
      buildWhereClause(res(), [
        { column: "name", operator: "contains", value: "ali" },
      ]),
    ).toBe(`"name" LIKE '%ali%'`);
    expect(
      buildWhereClause(res(), [
        { column: "name", operator: "starts_with", value: "Al" },
      ]),
    ).toBe(`"name" LIKE 'Al%'`);
  });

  it("rejects filters on non-filterable columns", () => {
    expect(() =>
      buildWhereClause(res(), [
        { column: "free_text", operator: "=", value: "x" },
      ]),
    ).toThrow(/not filterable/);
  });

  it("rejects ordering operators on string columns", () => {
    expect(() =>
      buildWhereClause(res(), [
        { column: "name", operator: ">", value: "x" },
      ]),
    ).toThrow(/Operator '>' is not valid/);
  });

  it("rejects starts_with on non-string columns", () => {
    expect(() =>
      buildWhereClause(res(), [
        { column: "joined_at", operator: "starts_with", value: "2024" },
      ]),
    ).toThrow(/only valid on string columns/);
  });

  it("rejects unknown columns", () => {
    expect(() =>
      buildWhereClause(res(), [
        { column: "ghost", operator: "=", value: 1 } as Filter,
      ]),
    ).toThrow(/not found/i);
  });

  it("rejects empty IN value", () => {
    expect(() =>
      buildWhereClause(res(), [{ column: "name", operator: "in", value: [] }]),
    ).toThrow(/non-empty value array/);
  });
});

describe("buildOrderClause", () => {
  it("returns null with no orderBy", () => {
    expect(buildOrderClause(res(), undefined)).toBeNull();
  });

  it("renders ORDER BY clauses for known columns", () => {
    expect(
      buildOrderClause(res(), [
        { column: "id", direction: "asc" },
        { column: "name", direction: "desc" },
      ]),
    ).toBe(`"id" ASC, "name" DESC`);
  });

  it("rejects unknown columns", () => {
    expect(() =>
      buildOrderClause(res(), [{ column: "ghost", direction: "asc" }]),
    ).toThrow(/not found/i);
  });
});

describe("buildProjection", () => {
  it("projects all columns when none requested and no PII", () => {
    expect(buildProjection(res(), undefined, false)).toBe(
      `"id", "name", "free_text", "amount", "joined_at"`,
    );
    expect(buildProjection(res(), [], false)).toBe(
      `"id", "name", "free_text", "amount", "joined_at"`,
    );
  });

  it("emits quoted column list", () => {
    expect(buildProjection(res(), ["id", "name"], false)).toBe(`"id", "name"`);
  });

  it("rejects unknown columns", () => {
    expect(() => buildProjection(res(), ["ghost"], false)).toThrow(/not found/i);
  });

  it("omits PII columns when no projection requested and includePii is false", () => {
    expect(buildProjection(resWithPii(), undefined, false)).toBe(`"id", "name"`);
  });

  it("includes PII columns when no projection requested and includePii is true", () => {
    expect(buildProjection(resWithPii(), undefined, true)).toBe(
      `"id", "name", "email"`,
    );
  });

  it("rejects explicit PII column when includePii is false", () => {
    expect(() => buildProjection(resWithPii(), ["email"], false)).toThrow(
      /flagged as PII/,
    );
  });

  it("allows explicit PII column when includePii is true", () => {
    expect(buildProjection(resWithPii(), ["email"], true)).toBe(`"email"`);
  });
});
