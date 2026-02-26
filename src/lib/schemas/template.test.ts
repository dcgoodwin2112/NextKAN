import { describe, it, expect } from "vitest";
import {
  templateFieldsSchema,
  templateCreateSchema,
  templateUpdateSchema,
} from "./template";

describe("templateFieldsSchema", () => {
  it("accepts empty object", () => {
    const result = templateFieldsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid partial fields", () => {
    const result = templateFieldsSchema.safeParse({
      publisherId: "a1b2c3d4-e5f6-1234-a567-123456789abc",
      contactName: "Jane Doe",
      keywords: ["open-data", "health"],
      accessLevel: "public",
      license: "https://creativecommons.org/publicdomain/zero/1.0/",
      language: "en-us",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid publisherId", () => {
    const result = templateFieldsSchema.safeParse({
      publisherId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid accessLevel", () => {
    const result = templateFieldsSchema.safeParse({
      accessLevel: "secret",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty string for optional URL fields", () => {
    const result = templateFieldsSchema.safeParse({
      license: "",
      conformsTo: "",
      bureauCode: "",
      programCode: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("templateCreateSchema", () => {
  it("requires name", () => {
    const result = templateCreateSchema.safeParse({
      fields: {},
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid create input", () => {
    const result = templateCreateSchema.safeParse({
      name: "Federal Dataset Template",
      description: "Common fields for federal datasets",
      organizationId: "a1b2c3d4-e5f6-1234-a567-123456789abc",
      fields: {
        bureauCode: "015:11",
        programCode: "015:001",
        accessLevel: "public",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts global template (empty organizationId)", () => {
    const result = templateCreateSchema.safeParse({
      name: "Global Template",
      organizationId: "",
      fields: { language: "en-us" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects name exceeding max length", () => {
    const result = templateCreateSchema.safeParse({
      name: "x".repeat(256),
      fields: {},
    });
    expect(result.success).toBe(false);
  });
});

describe("templateUpdateSchema", () => {
  it("accepts partial update", () => {
    const result = templateUpdateSchema.safeParse({
      name: "Updated Name",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = templateUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
