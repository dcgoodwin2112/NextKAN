import { describe, it, expect } from "vitest";
import {
  datastoreColumnSchema,
  datastoreQuerySchema,
  datastoreSqlSchema,
} from "./datastore";

describe("datastoreColumnSchema", () => {
  it("accepts valid column definitions", () => {
    expect(
      datastoreColumnSchema.parse({ name: "age", type: "INTEGER" })
    ).toEqual({ name: "age", type: "INTEGER" });
  });

  it("rejects invalid type", () => {
    expect(() =>
      datastoreColumnSchema.parse({ name: "x", type: "VARCHAR" })
    ).toThrow();
  });
});

describe("datastoreQuerySchema", () => {
  it("applies defaults when no params provided", () => {
    const result = datastoreQuerySchema.parse({});
    expect(result.limit).toBe(100);
    expect(result.offset).toBe(0);
    expect(result.order).toBe("asc");
  });

  it("parses explicit values", () => {
    const result = datastoreQuerySchema.parse({
      limit: "50",
      offset: "10",
      sort: "name",
      order: "desc",
    });
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(10);
    expect(result.sort).toBe("name");
    expect(result.order).toBe("desc");
  });

  it("rejects limit below 1", () => {
    expect(() => datastoreQuerySchema.parse({ limit: "0" })).toThrow();
  });

  it("rejects limit above 10000", () => {
    expect(() => datastoreQuerySchema.parse({ limit: "10001" })).toThrow();
  });

  it("rejects negative offset", () => {
    expect(() => datastoreQuerySchema.parse({ offset: "-1" })).toThrow();
  });

  it("parses valid filters JSON", () => {
    const filters = JSON.stringify([
      { column: "age", operator: ">", value: 18 },
    ]);
    const result = datastoreQuerySchema.parse({ filters });
    expect(result.filters).toEqual([
      { column: "age", operator: ">", value: 18 },
    ]);
  });

  it("rejects malformed filters JSON", () => {
    expect(() =>
      datastoreQuerySchema.parse({ filters: "not-json" })
    ).toThrow();
  });

  it("rejects filters with invalid operator", () => {
    const filters = JSON.stringify([
      { column: "x", operator: "LIKE", value: "y" },
    ]);
    expect(() => datastoreQuerySchema.parse({ filters })).toThrow();
  });
});

describe("datastoreSqlSchema", () => {
  it("accepts valid SQL string", () => {
    const result = datastoreSqlSchema.parse({
      sql: "SELECT * FROM ds_abc12345",
    });
    expect(result.sql).toBe("SELECT * FROM ds_abc12345");
  });

  it("rejects empty SQL", () => {
    expect(() => datastoreSqlSchema.parse({ sql: "" })).toThrow();
  });

  it("rejects SQL exceeding 10000 chars", () => {
    expect(() =>
      datastoreSqlSchema.parse({ sql: "S".repeat(10001) })
    ).toThrow();
  });
});
