import { describe, it, expect } from "vitest";

import { isAggregatable, isFilterable } from "./heuristics";

describe("isFilterable", () => {
  it("is true for numeric/date/boolean types regardless of cardinality", () => {
    expect(isFilterable("integer", null)).toBe(true);
    expect(isFilterable("number", null)).toBe(true);
    expect(isFilterable("date", null)).toBe(true);
    expect(isFilterable("datetime", null)).toBe(true);
    expect(isFilterable("boolean", null)).toBe(true);
  });

  it("is true for low-cardinality strings", () => {
    expect(isFilterable("string", 200)).toBe(true);
  });

  it("is false for high-cardinality strings", () => {
    expect(isFilterable("string", 1_000_000)).toBe(false);
  });

  it("is false for string columns with unknown cardinality", () => {
    expect(isFilterable("string", null)).toBe(false);
    expect(isFilterable("string", undefined)).toBe(false);
  });
});

describe("isAggregatable", () => {
  it("is true for any numeric type", () => {
    expect(isAggregatable("integer", null, null)).toBe(true);
    expect(isAggregatable("number", null, null)).toBe(true);
  });

  it("is true for dates when they group meaningfully", () => {
    expect(isAggregatable("date", 30, 1000)).toBe(true);
  });

  it("is false for dates that are basically primary-key-unique", () => {
    expect(isAggregatable("date", 1000, 1000)).toBe(false);
  });

  it("is false for non-numeric, non-date types", () => {
    expect(isAggregatable("string", 5, 100)).toBe(false);
    expect(isAggregatable("boolean", 2, 100)).toBe(false);
    expect(isAggregatable("geometry", 5, 100)).toBe(false);
  });
});
