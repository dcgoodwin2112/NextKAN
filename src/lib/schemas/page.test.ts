import { describe, it, expect } from "vitest";
import { pageCreateSchema, NAV_LOCATIONS, PAGE_TEMPLATES } from "./page";

describe("pageCreateSchema", () => {
  const validInput = {
    title: "About Us",
    content: "# About",
  };

  it("accepts valid input with defaults", () => {
    const result = pageCreateSchema.parse(validInput);
    expect(result.navLocation).toBe("header");
    expect(result.template).toBe("default");
    expect(result.published).toBe(false);
    expect(result.sortOrder).toBe(0);
  });

  it("accepts all valid navLocation values", () => {
    for (const loc of NAV_LOCATIONS) {
      const result = pageCreateSchema.parse({ ...validInput, navLocation: loc });
      expect(result.navLocation).toBe(loc);
    }
  });

  it("rejects invalid navLocation", () => {
    expect(() =>
      pageCreateSchema.parse({ ...validInput, navLocation: "sidebar" })
    ).toThrow();
  });

  it("accepts all valid template values", () => {
    for (const tmpl of PAGE_TEMPLATES) {
      const result = pageCreateSchema.parse({ ...validInput, template: tmpl });
      expect(result.template).toBe(tmpl);
    }
  });

  it("rejects invalid template", () => {
    expect(() =>
      pageCreateSchema.parse({ ...validInput, template: "fancy" })
    ).toThrow();
  });

  it("enforces metaTitle max length of 70", () => {
    expect(() =>
      pageCreateSchema.parse({ ...validInput, metaTitle: "a".repeat(71) })
    ).toThrow();
    const result = pageCreateSchema.parse({ ...validInput, metaTitle: "a".repeat(70) });
    expect(result.metaTitle).toBe("a".repeat(70));
  });

  it("enforces metaDescription max length of 160", () => {
    expect(() =>
      pageCreateSchema.parse({ ...validInput, metaDescription: "a".repeat(161) })
    ).toThrow();
    const result = pageCreateSchema.parse({ ...validInput, metaDescription: "a".repeat(160) });
    expect(result.metaDescription).toBe("a".repeat(160));
  });

  it("accepts valid imageUrl", () => {
    const result = pageCreateSchema.parse({
      ...validInput,
      imageUrl: "https://example.com/image.jpg",
    });
    expect(result.imageUrl).toBe("https://example.com/image.jpg");
  });

  it("accepts empty string imageUrl", () => {
    const result = pageCreateSchema.parse({ ...validInput, imageUrl: "" });
    expect(result.imageUrl).toBe("");
  });

  it("rejects invalid imageUrl", () => {
    expect(() =>
      pageCreateSchema.parse({ ...validInput, imageUrl: "not-a-url" })
    ).toThrow();
  });

  it("accepts nullable parentId", () => {
    const result = pageCreateSchema.parse({ ...validInput, parentId: null });
    expect(result.parentId).toBeNull();
  });
});
