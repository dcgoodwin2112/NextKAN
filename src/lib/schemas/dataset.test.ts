import { describe, it, expect } from "vitest";
import { datasetCreateSchema, datasetUpdateSchema, datasetStatusEnum } from "./dataset";

const validInput = {
  title: "Census Data 2024",
  description: "Annual census data for all counties",
  accessLevel: "public" as const,
  publisherId: "550e8400-e29b-41d4-a716-446655440000",
  keywords: ["census", "population", "demographics"],
  contactName: "Jane Smith",
  contactEmail: "jane@example.gov",
};

describe("datasetCreateSchema", () => {
  it("accepts valid complete input", () => {
    const result = datasetCreateSchema.safeParse({
      ...validInput,
      bureauCode: "015:11",
      programCode: "015:001",
      license: "https://creativecommons.org/publicdomain/zero/1.0/",
      landingPage: "https://example.gov/data",
      identifier: "HHS-2024-0042",
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal required-only input", () => {
    const result = datasetCreateSchema.safeParse({
      title: "Minimal Dataset",
      description: "Minimal",
      publisherId: "550e8400-e29b-41d4-a716-446655440000",
      keywords: ["test"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = datasetCreateSchema.safeParse({
      ...validInput,
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    const result = datasetCreateSchema.safeParse({
      ...validInput,
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing publisherId", () => {
    const result = datasetCreateSchema.safeParse({
      ...validInput,
      publisherId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty keywords array", () => {
    const result = datasetCreateSchema.safeParse({
      ...validInput,
      keywords: [],
    });
    expect(result.success).toBe(false);
  });

  it("validates accessLevel enum", () => {
    for (const level of ["public", "restricted public", "non-public"]) {
      const result = datasetCreateSchema.safeParse({
        ...validInput,
        accessLevel: level,
      });
      expect(result.success).toBe(true);
    }
    const bad = datasetCreateSchema.safeParse({
      ...validInput,
      accessLevel: "secret",
    });
    expect(bad.success).toBe(false);
  });

  it("validates bureauCode format regex", () => {
    const good = datasetCreateSchema.safeParse({
      ...validInput,
      bureauCode: "015:11",
    });
    expect(good.success).toBe(true);

    const bad = datasetCreateSchema.safeParse({
      ...validInput,
      bureauCode: "15:1",
    });
    expect(bad.success).toBe(false);
  });

  it("validates programCode format regex", () => {
    const good = datasetCreateSchema.safeParse({
      ...validInput,
      programCode: "015:001",
    });
    expect(good.success).toBe(true);

    const bad = datasetCreateSchema.safeParse({
      ...validInput,
      programCode: "15:1",
    });
    expect(bad.success).toBe(false);
  });

  it("validates email format for contactEmail", () => {
    const bad = datasetCreateSchema.safeParse({
      ...validInput,
      contactEmail: "not-an-email",
    });
    expect(bad.success).toBe(false);
  });

  it("validates URL format for license, landingPage, conformsTo, describedBy", () => {
    for (const field of [
      "license",
      "landingPage",
      "conformsTo",
      "describedBy",
    ]) {
      const bad = datasetCreateSchema.safeParse({
        ...validInput,
        [field]: "not-a-url",
      });
      expect(bad.success).toBe(false);
    }
  });

  it("accepts optional custom identifier string", () => {
    const result = datasetCreateSchema.safeParse({
      ...validInput,
      identifier: "HHS-2024-0042",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.identifier).toBe("HHS-2024-0042");
    }
  });

  it("defaults language to en-us", () => {
    const result = datasetCreateSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe("en-us");
    }
  });
});

describe("datasetStatusEnum", () => {
  it("accepts valid status values", () => {
    for (const status of ["draft", "published", "archived"]) {
      expect(datasetStatusEnum.safeParse(status).success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    expect(datasetStatusEnum.safeParse("deleted").success).toBe(false);
  });
});

describe("datasetCreateSchema status field", () => {
  it("defaults status to draft", () => {
    const result = datasetCreateSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("draft");
    }
  });

  it("accepts explicit status", () => {
    const result = datasetCreateSchema.safeParse({
      ...validInput,
      status: "published",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("published");
    }
  });
});

describe("datasetUpdateSchema", () => {
  it("allows partial input (all fields optional)", () => {
    const result = datasetUpdateSchema.safeParse({ title: "New Title" });
    expect(result.success).toBe(true);
  });

  it("allows updating status only", () => {
    const result = datasetUpdateSchema.safeParse({ status: "archived" });
    expect(result.success).toBe(true);
  });
});
