import { describe, it, expect } from "vitest";
import { organizationSchema } from "./organization";

describe("organizationSchema", () => {
  it("accepts valid input", () => {
    const result = organizationSchema.safeParse({
      name: "Department of Testing",
      description: "A test organization",
      imageUrl: "https://example.gov/logo.png",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = organizationSchema.safeParse({
      name: "",
    });
    expect(result.success).toBe(false);
  });
});
