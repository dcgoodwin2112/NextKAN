import { describe, it, expect } from "vitest";
import { buildSearchWhere } from "./search";

describe("buildSearchWhere", () => {
  it("returns empty object for empty query", () => {
    expect(buildSearchWhere("")).toEqual({});
    expect(buildSearchWhere("   ")).toEqual({});
    expect(buildSearchWhere({})).toEqual({});
  });

  it("creates OR conditions across title, description, keywords", () => {
    const result = buildSearchWhere("census");
    expect(result.AND).toHaveLength(1);
    const orConditions = (result.AND as any[])[0].OR;
    expect(orConditions).toHaveLength(3);
    expect(orConditions[0]).toHaveProperty("title");
    expect(orConditions[1]).toHaveProperty("description");
    expect(orConditions[2]).toHaveProperty("keywords");
  });

  it("handles multi-word queries with AND logic", () => {
    const result = buildSearchWhere("census data");
    expect(result.AND).toHaveLength(2);
  });

  it("uses contains filter for title and description", () => {
    const result = buildSearchWhere("test");
    const orConditions = (result.AND as any[])[0].OR;
    expect(orConditions[0].title.contains).toBe("test");
    expect(orConditions[1].description.contains).toBe("test");
  });

  it("handles special characters safely", () => {
    const result = buildSearchWhere("test%query");
    expect(result.AND).toHaveLength(1);
  });

  it("filters by organizationId", () => {
    const result = buildSearchWhere({ organizationId: "org-1" });
    expect(result).toEqual({ publisherId: "org-1" });
  });

  it("filters by keyword", () => {
    const result = buildSearchWhere({ keyword: "health" });
    expect(result).toEqual({ keywords: { some: { keyword: "health" } } });
  });

  it("filters by format via distribution relation", () => {
    const result = buildSearchWhere({ format: "CSV" });
    expect(result).toEqual({ distributions: { some: { format: "CSV" } } });
  });

  it("filters by theme via slug relation", () => {
    const result = buildSearchWhere({ theme: "health" });
    expect(result).toEqual({ themes: { some: { theme: { slug: "health" } } } });
  });

  it("filters by accessLevel", () => {
    const result = buildSearchWhere({ accessLevel: "public" });
    expect(result).toEqual({ accessLevel: "public" });
  });

  it("combines multiple filters with AND", () => {
    const result = buildSearchWhere({ query: "census", format: "CSV", accessLevel: "public" });
    expect(result.AND).toBeDefined();
    const conditions = result.AND as any[];
    expect(conditions.length).toBe(3);
  });
});
