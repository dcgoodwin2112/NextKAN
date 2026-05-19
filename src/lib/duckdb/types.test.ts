import { describe, it, expect } from "vitest";

import { duckdbTypeToNextKan } from "./types";

describe("duckdbTypeToNextKan", () => {
  it("maps boolean types", () => {
    expect(duckdbTypeToNextKan("BOOLEAN")).toBe("boolean");
    expect(duckdbTypeToNextKan("bool")).toBe("boolean");
  });

  it("maps integer family", () => {
    for (const t of [
      "TINYINT",
      "SMALLINT",
      "INTEGER",
      "BIGINT",
      "HUGEINT",
      "UTINYINT",
      "USMALLINT",
      "UINTEGER",
      "UBIGINT",
    ]) {
      expect(duckdbTypeToNextKan(t)).toBe("integer");
    }
  });

  it("maps floating-point types to number", () => {
    expect(duckdbTypeToNextKan("FLOAT")).toBe("number");
    expect(duckdbTypeToNextKan("DOUBLE")).toBe("number");
    expect(duckdbTypeToNextKan("REAL")).toBe("number");
  });

  it("maps decimal/numeric to number even when parameterised", () => {
    expect(duckdbTypeToNextKan("DECIMAL(10,2)")).toBe("number");
    expect(duckdbTypeToNextKan("NUMERIC(38, 8)")).toBe("number");
  });

  it("maps string types", () => {
    expect(duckdbTypeToNextKan("VARCHAR")).toBe("string");
    expect(duckdbTypeToNextKan("TEXT")).toBe("string");
    expect(duckdbTypeToNextKan("UUID")).toBe("string");
  });

  it("maps date types", () => {
    expect(duckdbTypeToNextKan("DATE")).toBe("date");
  });

  it("maps timestamp/time types to datetime", () => {
    expect(duckdbTypeToNextKan("TIMESTAMP")).toBe("datetime");
    expect(duckdbTypeToNextKan("TIMESTAMP_NS")).toBe("datetime");
    expect(duckdbTypeToNextKan("TIMESTAMP WITH TIME ZONE")).toBe("datetime");
    expect(duckdbTypeToNextKan("TIME")).toBe("datetime");
  });

  it("maps complex types to json", () => {
    expect(duckdbTypeToNextKan("JSON")).toBe("json");
    expect(duckdbTypeToNextKan("STRUCT(a INTEGER, b VARCHAR)")).toBe("json");
    expect(duckdbTypeToNextKan("MAP(VARCHAR, INTEGER)")).toBe("json");
    expect(duckdbTypeToNextKan("LIST(VARCHAR)")).toBe("json");
    expect(duckdbTypeToNextKan("VARCHAR[]")).toBe("json");
  });

  it("maps GEOMETRY", () => {
    expect(duckdbTypeToNextKan("GEOMETRY")).toBe("geometry");
  });

  it("falls back to string for unknown types", () => {
    expect(duckdbTypeToNextKan("ENUM('a','b')")).toBe("string");
    expect(duckdbTypeToNextKan("MYSTERY")).toBe("string");
  });
});
