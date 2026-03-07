import { describe, it, expect } from "vitest";
import {
  customFieldDefinitionCreateSchema,
  customFieldDefinitionUpdateSchema,
  validateCustomFieldValue,
} from "./custom-field";

describe("customFieldDefinitionCreateSchema", () => {
  const validInput = {
    name: "department_code",
    label: "Department Code",
    type: "text" as const,
  };

  it("accepts valid input", () => {
    const result = customFieldDefinitionCreateSchema.parse(validInput);
    expect(result.name).toBe("department_code");
    expect(result.required).toBe(false);
    expect(result.sortOrder).toBe(0);
  });

  it("rejects names starting with uppercase", () => {
    expect(() =>
      customFieldDefinitionCreateSchema.parse({ ...validInput, name: "Department" })
    ).toThrow();
  });

  it("rejects names starting with number", () => {
    expect(() =>
      customFieldDefinitionCreateSchema.parse({ ...validInput, name: "1field" })
    ).toThrow();
  });

  it("rejects names with spaces", () => {
    expect(() =>
      customFieldDefinitionCreateSchema.parse({ ...validInput, name: "my field" })
    ).toThrow();
  });

  it("accepts names with underscores and numbers", () => {
    const result = customFieldDefinitionCreateSchema.parse({ ...validInput, name: "field_123" });
    expect(result.name).toBe("field_123");
  });

  it("rejects invalid type", () => {
    expect(() =>
      customFieldDefinitionCreateSchema.parse({ ...validInput, type: "invalid" })
    ).toThrow();
  });

  it("accepts all valid types", () => {
    for (const type of ["text", "number", "date", "url", "select", "multiselect", "boolean"]) {
      const result = customFieldDefinitionCreateSchema.parse({ ...validInput, type });
      expect(result.type).toBe(type);
    }
  });

  it("accepts options array", () => {
    const result = customFieldDefinitionCreateSchema.parse({
      ...validInput,
      type: "select",
      options: ["a", "b", "c"],
    });
    expect(result.options).toEqual(["a", "b", "c"]);
  });

  it("accepts optional organizationId as empty string", () => {
    const result = customFieldDefinitionCreateSchema.parse({ ...validInput, organizationId: "" });
    expect(result.organizationId).toBe("");
  });

  it("rejects empty label", () => {
    expect(() =>
      customFieldDefinitionCreateSchema.parse({ ...validInput, label: "" })
    ).toThrow();
  });
});

describe("customFieldDefinitionUpdateSchema", () => {
  it("allows partial updates", () => {
    const result = customFieldDefinitionUpdateSchema.parse({ label: "New Label" });
    expect(result.label).toBe("New Label");
    expect(result.name).toBeUndefined();
  });

  it("allows empty object", () => {
    const result = customFieldDefinitionUpdateSchema.parse({});
    expect(result.name).toBeUndefined();
    expect(result.label).toBeUndefined();
    expect(result.type).toBeUndefined();
  });
});

describe("validateCustomFieldValue", () => {
  it("returns null for empty non-required value", () => {
    expect(validateCustomFieldValue("", { type: "text" })).toBeNull();
  });

  it("returns error for empty required value", () => {
    expect(validateCustomFieldValue("", { type: "text", required: true })).toBe("This field is required");
  });

  it("returns null for valid text", () => {
    expect(validateCustomFieldValue("hello", { type: "text" })).toBeNull();
  });

  it("validates number type", () => {
    expect(validateCustomFieldValue("42", { type: "number" })).toBeNull();
    expect(validateCustomFieldValue("3.14", { type: "number" })).toBeNull();
    expect(validateCustomFieldValue("abc", { type: "number" })).toBe("Must be a valid number");
  });

  it("validates date type", () => {
    expect(validateCustomFieldValue("2024-01-15", { type: "date" })).toBeNull();
    expect(validateCustomFieldValue("not-a-date", { type: "date" })).toBe("Must be a valid date");
  });

  it("validates url type", () => {
    expect(validateCustomFieldValue("https://example.com", { type: "url" })).toBeNull();
    expect(validateCustomFieldValue("not-a-url", { type: "url" })).toBe("Must be a valid URL");
  });

  it("validates boolean type", () => {
    expect(validateCustomFieldValue("true", { type: "boolean" })).toBeNull();
    expect(validateCustomFieldValue("false", { type: "boolean" })).toBeNull();
    expect(validateCustomFieldValue("yes", { type: "boolean" })).toBe('Must be "true" or "false"');
  });

  it("validates select type against options", () => {
    const def = { type: "select", options: JSON.stringify(["a", "b", "c"]) };
    expect(validateCustomFieldValue("a", def)).toBeNull();
    expect(validateCustomFieldValue("d", def)).toBe("Must be one of: a, b, c");
  });

  it("validates multiselect type", () => {
    const def = { type: "multiselect", options: JSON.stringify(["x", "y", "z"]) };
    expect(validateCustomFieldValue(JSON.stringify(["x", "y"]), def)).toBeNull();
    expect(validateCustomFieldValue(JSON.stringify(["x", "w"]), def)).toBe("Invalid options: w");
    expect(validateCustomFieldValue("not-json", def)).toBe("Must be a JSON array of strings");
  });

  it("allows select with no options defined", () => {
    expect(validateCustomFieldValue("anything", { type: "select" })).toBeNull();
  });
});
