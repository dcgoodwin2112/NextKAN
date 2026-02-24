import { describe, it, expect } from "vitest";
import { seriesCreateSchema, seriesUpdateSchema } from "./series";

describe("seriesCreateSchema", () => {
  it("accepts valid input", () => {
    const result = seriesCreateSchema.safeParse({
      title: "Climate Data Series",
      identifier: "climate-data-series",
      description: "A series of climate datasets",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = seriesCreateSchema.safeParse({
      identifier: "test-series",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing identifier", () => {
    const result = seriesCreateSchema.safeParse({
      title: "Test Series",
    });
    expect(result.success).toBe(false);
  });

  it("allows optional description", () => {
    const result = seriesCreateSchema.safeParse({
      title: "Test Series",
      identifier: "test-series",
    });
    expect(result.success).toBe(true);
  });
});

describe("seriesUpdateSchema", () => {
  it("accepts partial update", () => {
    const result = seriesUpdateSchema.safeParse({
      title: "Updated Title",
    });
    expect(result.success).toBe(true);
  });
});
