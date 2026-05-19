import { describe, expect, it } from "vitest";

import {
  buildToolCallPreviews,
  type PreviewColumn,
  type PreviewDataset,
} from "./index";

function col(overrides: Partial<PreviewColumn> = {}): PreviewColumn {
  return {
    name: "id",
    type: "integer",
    filterable: true,
    aggregatable: true,
    ...overrides,
  };
}

function dataset(overrides: Partial<PreviewDataset> = {}): PreviewDataset {
  return {
    id: "ds-1",
    identifier: "id-1",
    title: "Quarterly Sales",
    resources: [
      {
        id: "dist-1",
        name: "sales.csv",
        queryable: true,
        rowCount: 1000,
        columns: [
          col({ name: "id", type: "integer", filterable: true, aggregatable: true }),
          col({
            name: "region",
            type: "string",
            filterable: true,
            aggregatable: false,
            enumValues: ["East", "West"],
          }),
          col({ name: "amount", type: "number", filterable: false, aggregatable: true }),
          col({ name: "notes", type: "string", filterable: false, aggregatable: false }),
        ],
      },
    ],
    ...overrides,
  };
}

describe("buildToolCallPreviews", () => {
  it("always returns all six tool previews", () => {
    const previews = buildToolCallPreviews(dataset());
    expect(previews.map((p) => p.name)).toEqual([
      "list_datasets",
      "get_dataset",
      "get_schema",
      "query_dataset",
      "aggregate_dataset",
      "sample_dataset",
    ]);
  });

  it("seeds list_datasets.query from the first word of the title", () => {
    const previews = buildToolCallPreviews(dataset({ title: "Quarterly Sales" }));
    const list = previews.find((p) => p.name === "list_datasets");
    expect(list?.arguments).toMatchObject({ query: "quarterly", limit: 10 });
    expect(list?.synthesized).toBe(true);
  });

  it("uses the dataset id for get_dataset", () => {
    const previews = buildToolCallPreviews(dataset({ id: "abc" }));
    const get = previews.find((p) => p.name === "get_dataset");
    expect(get?.arguments).toEqual({ datasetId: "abc" });
  });

  it("uses an enum/sample value to build a concrete filter example", () => {
    const previews = buildToolCallPreviews(dataset());
    const q = previews.find((p) => p.name === "query_dataset");
    expect(q?.arguments).toMatchObject({
      resourceId: "dist-1",
      columns: ["id", "region", "amount", "notes"],
      filters: [{ column: "region", operator: "=", value: "East" }],
      limit: 20,
    });
  });

  it("falls back to is_not_null on date/numeric columns when no sample exists", () => {
    const ds = dataset({
      resources: [
        {
          id: "r1",
          name: "x",
          queryable: true,
          columns: [
            col({ name: "joined_at", type: "date", filterable: true, aggregatable: false }),
            col({ name: "amount", type: "number", filterable: false, aggregatable: true }),
          ],
        },
      ],
    });
    const q = buildToolCallPreviews(ds).find((p) => p.name === "query_dataset");
    expect(q?.arguments).toMatchObject({
      filters: [{ column: "joined_at", operator: "is_not_null" }],
    });
  });

  it("picks the first filterable column for groupBy and the first aggregatable for the metric", () => {
    const previews = buildToolCallPreviews(dataset());
    const agg = previews.find((p) => p.name === "aggregate_dataset");
    expect(agg?.arguments).toMatchObject({
      resourceId: "dist-1",
      groupBy: ["id"],
      metrics: [
        { function: "count_all" },
        { column: "id", function: "sum" },
      ],
    });
    expect(agg?.unavailable).toBeUndefined();
  });

  it("marks DuckDB tools unavailable when no resource is queryable", () => {
    const ds = dataset({
      resources: [{ id: "r1", name: "x", queryable: false, columns: [] }],
    });
    const previews = buildToolCallPreviews(ds);
    expect(previews.find((p) => p.name === "query_dataset")?.unavailable).toBeTruthy();
    expect(previews.find((p) => p.name === "aggregate_dataset")?.unavailable).toBeTruthy();
    expect(previews.find((p) => p.name === "sample_dataset")?.unavailable).toBeTruthy();
    expect(previews.find((p) => p.name === "get_schema")?.unavailable).toBeUndefined();
  });

  it("marks get_schema unavailable when the dataset has no resources", () => {
    const ds = dataset({ resources: [] });
    const previews = buildToolCallPreviews(ds);
    expect(previews.find((p) => p.name === "get_schema")?.unavailable).toBeTruthy();
  });

  it("marks aggregate_dataset unavailable when no aggregatable columns exist", () => {
    const ds = dataset({
      resources: [
        {
          id: "r1",
          name: "x",
          queryable: true,
          columns: [
            col({ name: "region", type: "string", filterable: true, aggregatable: false }),
          ],
        },
      ],
    });
    const agg = buildToolCallPreviews(ds).find((p) => p.name === "aggregate_dataset");
    expect(agg?.unavailable).toMatch(/aggregatable column/);
  });
});
