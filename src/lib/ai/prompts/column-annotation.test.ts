import { describe, expect, it } from "vitest";

import type { ColumnProfile } from "@/lib/profiling";

import { buildColumnAnnotationPrompt } from "./column-annotation";

function makeCol(overrides: Partial<ColumnProfile> = {}): ColumnProfile {
  return {
    name: "id",
    type: "integer",
    duckdbType: "BIGINT",
    rowCount: 10,
    nullCount: 0,
    distinctCount: 10,
    min: "1",
    max: "10",
    sampleValues: [1, 2, 3],
    enumValues: null,
    filterable: true,
    aggregatable: true,
    isPii: false,
    isGeometry: false,
    crs: null,
    ...overrides,
  };
}

describe("buildColumnAnnotationPrompt", () => {
  it("includes the dataset context for grounding", () => {
    const prompt = buildColumnAnnotationPrompt({
      datasetTitle: "Quarterly Sales",
      datasetDescription: "Sales by region by quarter.",
      columns: [makeCol()],
    });
    expect(prompt).toContain("Dataset: Quarterly Sales");
    expect(prompt).toContain("Description: Sales by region by quarter.");
  });

  it("lists each column with its type", () => {
    const prompt = buildColumnAnnotationPrompt({
      datasetTitle: "x",
      datasetDescription: "y",
      columns: [
        makeCol({ name: "revenue", type: "number" }),
        makeCol({ name: "region", type: "string" }),
      ],
    });
    expect(prompt).toContain("- revenue (number)");
    expect(prompt).toContain("- region (string)");
  });

  it("flags PII columns", () => {
    const prompt = buildColumnAnnotationPrompt({
      datasetTitle: "x",
      datasetDescription: "y",
      columns: [makeCol({ name: "email", type: "string", isPii: true })],
    });
    expect(prompt).toContain("PII");
  });

  it("requests the response keyed by column name", () => {
    const prompt = buildColumnAnnotationPrompt({
      datasetTitle: "x",
      datasetDescription: "y",
      columns: [makeCol()],
    });
    expect(prompt).toContain('"<columnName>": { "description": "...", "unit"');
  });
});
