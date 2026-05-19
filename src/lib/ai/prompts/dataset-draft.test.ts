import { describe, expect, it } from "vitest";

import type { ColumnProfile } from "@/lib/profiling";

import { buildDatasetDraftPrompt } from "./dataset-draft";

function makeCol(overrides: Partial<ColumnProfile> = {}): ColumnProfile {
  return {
    name: "id",
    type: "integer",
    duckdbType: "BIGINT",
    rowCount: 100,
    nullCount: 0,
    distinctCount: 100,
    min: "1",
    max: "100",
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

describe("buildDatasetDraftPrompt", () => {
  it("includes the source filename and row count", () => {
    const prompt = buildDatasetDraftPrompt({
      sourceName: "sales-2024.csv",
      rowCount: 1234,
      columns: [makeCol()],
    });
    expect(prompt).toContain("Source filename: sales-2024.csv");
    expect(prompt).toContain("Row count: 1234");
  });

  it("lists every column with its type", () => {
    const prompt = buildDatasetDraftPrompt({
      sourceName: "x.csv",
      rowCount: 5,
      columns: [
        makeCol({ name: "amount", type: "number" }),
        makeCol({ name: "date", type: "date" }),
      ],
    });
    expect(prompt).toContain("- amount: number");
    expect(prompt).toContain("- date: date");
  });

  it("flags PII columns explicitly", () => {
    const prompt = buildDatasetDraftPrompt({
      sourceName: "x.csv",
      rowCount: 1,
      columns: [
        makeCol({ name: "email", type: "string", isPii: true }),
      ],
    });
    expect(prompt).toContain("PII");
  });

  it("is deterministic for the same profile", () => {
    const profile = {
      sourceName: "x.csv",
      rowCount: 10,
      columns: [makeCol()],
    };
    expect(buildDatasetDraftPrompt(profile)).toBe(
      buildDatasetDraftPrompt(profile),
    );
  });
});
