// @vitest-environment node
import { describe, it, expect } from "vitest";
import path from "node:path";

import {
  countRows,
  relationForPath,
  sampleColumn,
  summarizeRelation,
} from "./summarize";
import { withDuckDb } from "./connection";

const fixture = (name: string) =>
  path.join(process.cwd(), "test-data", name);

describe("summarizeRelation", () => {
  it("produces one row per column with stats", async () => {
    const relation = relationForPath(fixture("profile-basic.csv"));
    const summary = await withDuckDb((conn) => summarizeRelation(conn, relation));
    const byName = new Map(summary.map((s) => [s.name, s]));

    expect(byName.has("id")).toBe(true);
    expect(byName.get("name")?.duckdbType).toBe("VARCHAR");
    expect(byName.get("name")?.min).toBe("Alice");
    expect(byName.get("name")?.max).toBe("Eve");

    const score = byName.get("score");
    expect(score?.duckdbType).toBe("DOUBLE");
    expect(Number(score?.min)).toBeCloseTo(0.58, 2);
    expect(Number(score?.max)).toBeCloseTo(9.81, 2);

    expect(byName.get("is_active")?.duckdbType).toBe("BOOLEAN");
  });
});

describe("countRows", () => {
  it("returns total row count", async () => {
    const relation = relationForPath(fixture("profile-basic.csv"));
    const total = await withDuckDb((conn) => countRows(conn, relation));
    expect(total).toBe(5);
  });
});

describe("sampleColumn", () => {
  it("returns up to N non-null values from a column", async () => {
    const relation = relationForPath(fixture("profile-basic.csv"));
    const samples = await withDuckDb((conn) =>
      sampleColumn(conn, relation, "name", 3),
    );
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.length).toBeLessThanOrEqual(3);
    for (const v of samples) expect(typeof v).toBe("string");
  });
});

describe("relationForPath", () => {
  it("picks read_csv_auto for CSV", () => {
    expect(relationForPath("/tmp/data.csv")).toContain("read_csv_auto");
  });

  it("picks read_parquet for Parquet", () => {
    expect(relationForPath("/tmp/data.parquet")).toContain("read_parquet");
  });

  it("picks read_json_auto for JSON variants", () => {
    expect(relationForPath("/tmp/data.json")).toContain("read_json_auto");
    expect(relationForPath("/tmp/data.ndjson")).toContain("read_json_auto");
    expect(relationForPath("/tmp/data.jsonl")).toContain("read_json_auto");
  });
});
