import { describe, it, expect } from "vitest";
import { distributionSchema } from "./distribution";

describe("distributionSchema", () => {
  it("accepts valid input with downloadURL", () => {
    const result = distributionSchema.safeParse({
      title: "CSV Download",
      downloadURL: "https://example.gov/data.csv",
      mediaType: "text/csv",
      format: "CSV",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with accessURL", () => {
    const result = distributionSchema.safeParse({
      title: "API Endpoint",
      accessURL: "https://example.gov/api/v1",
      mediaType: "application/json",
    });
    expect(result.success).toBe(true);
  });

  it("rejects input with neither downloadURL nor accessURL", () => {
    const result = distributionSchema.safeParse({
      title: "No URL",
      mediaType: "text/csv",
    });
    expect(result.success).toBe(false);
  });

  it("validates URL format", () => {
    const result = distributionSchema.safeParse({
      downloadURL: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});
