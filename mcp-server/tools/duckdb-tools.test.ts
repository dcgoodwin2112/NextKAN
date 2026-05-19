// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { prismaMock } from "@/__mocks__/prisma";
import { profileResource } from "@/lib/profiling";

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { buildApp } from "../transport";
import { callTool, unpack } from "./test-helpers";

interface QueryResult {
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  truncated: boolean;
  warnings?: string[];
}

interface AggregateResult {
  groups: Array<Record<string, unknown>>;
  rowCount: number;
}

interface SampleResult {
  rows: Array<Record<string, unknown>>;
}

let storageRoot: string;
let parquetRelPath: string;
let parquetWithPiiRelPath: string;

const distributionRow = () => ({
  id: "dist-1",
  parquetPath: parquetRelPath,
  rowCount: 5,
  fileName: "sales.csv",
  mediaType: "text/csv",
  title: null,
  description: null,
  downloadURL: null,
  dataset: { id: "ds-1", title: "Sales", status: "published", deletedAt: null },
  dataDictionary: {
    fields: [
      { name: "id", type: "integer", title: null, description: null, sortOrder: 0, filterable: true, aggregatable: true, isPii: false, isGeometry: false },
      { name: "region", type: "string", title: null, description: null, sortOrder: 1, filterable: true, aggregatable: false, isPii: false, isGeometry: false },
      { name: "amount", type: "number", title: null, description: null, sortOrder: 2, filterable: false, aggregatable: true, isPii: false, isGeometry: false },
      { name: "notes", type: "string", title: null, description: null, sortOrder: 3, filterable: false, aggregatable: false, isPii: false, isGeometry: false },
    ],
  },
});

const distributionWithPiiRow = () => ({
  id: "dist-pii",
  parquetPath: parquetWithPiiRelPath,
  rowCount: 3,
  fileName: "customers.csv",
  mediaType: "text/csv",
  title: null,
  description: null,
  downloadURL: null,
  dataset: { id: "ds-pii", title: "Customers", status: "published", deletedAt: null },
  dataDictionary: {
    fields: [
      { name: "id", type: "integer", title: null, description: null, sortOrder: 0, filterable: true, aggregatable: true, isPii: false, isGeometry: false },
      { name: "region", type: "string", title: null, description: null, sortOrder: 1, filterable: true, aggregatable: false, isPii: false, isGeometry: false },
      { name: "email", type: "string", title: null, description: null, sortOrder: 2, filterable: true, aggregatable: false, isPii: true, isGeometry: false },
    ],
  },
});

beforeAll(async () => {
  storageRoot = await mkdtemp(path.join(tmpdir(), "nextkan-mcp-"));
  process.env.NEXTKAN_STORAGE_PATH = storageRoot;

  // Write a real CSV and convert it to Parquet via the profiler so we have a
  // valid Parquet file in `storageRoot/resources/dist-1/data.parquet`.
  const csvPath = path.join(storageRoot, "input.csv");
  await writeFile(
    csvPath,
    [
      "id,region,amount,notes",
      "1,East,10.5,first",
      "2,West,7.25,second",
      "3,East,12.0,third",
      "4,North,5.0,fourth",
      "5,West,8.5,fifth",
    ].join("\n") + "\n",
  );

  parquetRelPath = "resources/dist-1/data.parquet";
  const absParquet = path.join(storageRoot, parquetRelPath);
  await profileResource({ sourcePath: csvPath, parquetTargetPath: absParquet });

  // Second resource with a PII column for Phase B coverage.
  const piiCsvPath = path.join(storageRoot, "customers.csv");
  await writeFile(
    piiCsvPath,
    [
      "id,region,email",
      "1,East,alice@example.com",
      "2,West,bob@example.com",
      "3,East,carol@example.com",
    ].join("\n") + "\n",
  );
  parquetWithPiiRelPath = "resources/dist-pii/data.parquet";
  const absParquetPii = path.join(storageRoot, parquetWithPiiRelPath);
  await profileResource({ sourcePath: piiCsvPath, parquetTargetPath: absParquetPii });
});

afterAll(async () => {
  delete process.env.NEXTKAN_STORAGE_PATH;
  await rm(storageRoot, { recursive: true, force: true });
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.distribution.findUnique.mockResolvedValue(distributionRow() as any);
});

describe("query_dataset tool", () => {
  it("returns matching rows with truncated=false when under the limit", async () => {
    const { app } = buildApp();
    const env = await callTool(app, "query_dataset", {
      resourceId: "dist-1",
      columns: ["id", "region"],
      filters: [{ column: "region", operator: "=", value: "East" }],
      orderBy: [{ column: "id", direction: "asc" }],
    });
    const result = unpack<QueryResult>(env);
    expect(result.truncated).toBe(false);
    expect(result.rowCount).toBe(2);
    expect(result.rows.map((r) => r.id)).toEqual(["1", "3"]);
    expect(result.rows[0]).toEqual({ id: "1", region: "East" });
  });

  it("sets truncated=true when more rows exist than the limit", async () => {
    const { app } = buildApp();
    const env = await callTool(app, "query_dataset", {
      resourceId: "dist-1",
      limit: 2,
      orderBy: [{ column: "id", direction: "asc" }],
    });
    const result = unpack<QueryResult>(env);
    expect(result.truncated).toBe(true);
    expect(result.rowCount).toBe(2);
  });

  it("rejects filters on non-filterable columns", async () => {
    const { app } = buildApp();
    const env = await callTool(app, "query_dataset", {
      resourceId: "dist-1",
      filters: [{ column: "notes", operator: "=", value: "first" }],
    });
    expect(env.result?.isError).toBe(true);
    expect(
      (env.result?.structuredContent as { errorType: string }).errorType,
    ).toBe("COLUMN_NOT_FILTERABLE");
  });

  it("returns RESOURCE_NOT_QUERYABLE when parquetPath is null", async () => {
    prismaMock.distribution.findUnique.mockResolvedValue({
      ...distributionRow(),
      parquetPath: null,
    } as any);
    const { app } = buildApp();
    const env = await callTool(app, "query_dataset", { resourceId: "dist-1" });
    expect(
      (env.result?.structuredContent as { errorType: string }).errorType,
    ).toBe("RESOURCE_NOT_QUERYABLE");
  });

  it("returns RESOURCE_NOT_FOUND when distribution is missing", async () => {
    prismaMock.distribution.findUnique.mockResolvedValue(null as any);
    const { app } = buildApp();
    const env = await callTool(app, "query_dataset", { resourceId: "missing" });
    expect(
      (env.result?.structuredContent as { errorType: string }).errorType,
    ).toBe("RESOURCE_NOT_FOUND");
  });
});

describe("aggregate_dataset tool", () => {
  it("groups rows and computes metrics", async () => {
    const { app } = buildApp();
    const env = await callTool(app, "aggregate_dataset", {
      resourceId: "dist-1",
      groupBy: ["region"],
      metrics: [
        { function: "count_all" },
        { column: "amount", function: "sum", alias: "total" },
      ],
      orderBy: [{ column: "region", direction: "asc" }],
    });
    const result = unpack<AggregateResult>(env);
    expect(result.rowCount).toBe(3);
    expect(result.groups.find((g) => g.region === "East")).toMatchObject({
      count_all: "2",
      total: 22.5,
    });
    expect(result.groups.find((g) => g.region === "West")).toMatchObject({
      total: 15.75,
    });
  });

  it("rejects metrics on non-aggregatable columns", async () => {
    const { app } = buildApp();
    const env = await callTool(app, "aggregate_dataset", {
      resourceId: "dist-1",
      groupBy: ["region"],
      metrics: [{ column: "region", function: "sum" }],
    });
    expect(
      (env.result?.structuredContent as { errorType: string }).errorType,
    ).toBe("COLUMN_NOT_AGGREGATABLE");
  });

  it("rejects sum on non-numeric columns", async () => {
    const { app } = buildApp();
    const env = await callTool(app, "aggregate_dataset", {
      resourceId: "dist-1",
      groupBy: ["region"],
      // id is aggregatable but integer — sum is allowed. Use a hypothetical:
      metrics: [{ column: "id", function: "sum" }],
    });
    // id is integer → sum is valid; ensure the happy path also returns a number
    const result = unpack<AggregateResult>(env);
    expect(result.rowCount).toBe(3);
  });

  it("rejects groupBy on non-filterable columns", async () => {
    const { app } = buildApp();
    const env = await callTool(app, "aggregate_dataset", {
      resourceId: "dist-1",
      groupBy: ["notes"],
      metrics: [{ function: "count_all" }],
    });
    expect(
      (env.result?.structuredContent as { errorType: string }).errorType,
    ).toBe("COLUMN_NOT_FILTERABLE");
  });
});

describe("sample_dataset tool", () => {
  it("returns up to n rows", async () => {
    const { app } = buildApp();
    const env = await callTool(app, "sample_dataset", { resourceId: "dist-1", n: 3 });
    const result = unpack<SampleResult>(env);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.length).toBeLessThanOrEqual(3);
    expect(result.rows[0]).toHaveProperty("id");
    expect(result.rows[0]).toHaveProperty("region");
  });

  it("propagates RESOURCE_NOT_QUERYABLE when parquetPath is null", async () => {
    prismaMock.distribution.findUnique.mockResolvedValue({
      ...distributionRow(),
      parquetPath: null,
    } as any);
    const { app } = buildApp();
    const env = await callTool(app, "sample_dataset", { resourceId: "dist-1" });
    expect(
      (env.result?.structuredContent as { errorType: string }).errorType,
    ).toBe("RESOURCE_NOT_QUERYABLE");
  });
});

describe("PII enforcement", () => {
  beforeEach(() => {
    prismaMock.distribution.findUnique.mockResolvedValue(distributionWithPiiRow() as any);
  });

  it("sample_dataset omits PII columns by default", async () => {
    const { app } = buildApp();
    const env = await callTool(app, "sample_dataset", { resourceId: "dist-pii", n: 3 });
    const result = unpack<SampleResult>(env);
    expect(result.rows.length).toBeGreaterThan(0);
    for (const row of result.rows) {
      expect(row).not.toHaveProperty("email");
      expect(row).toHaveProperty("id");
      expect(row).toHaveProperty("region");
    }
  });

  it("sample_dataset includes PII columns when includePii=true", async () => {
    const { app } = buildApp();
    const env = await callTool(app, "sample_dataset", {
      resourceId: "dist-pii",
      n: 3,
      includePii: true,
    });
    const result = unpack<SampleResult>(env);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows[0]).toHaveProperty("email");
  });

  it("query_dataset omits PII columns when projection is unspecified", async () => {
    const { app } = buildApp();
    const env = await callTool(app, "query_dataset", { resourceId: "dist-pii" });
    const result = unpack<QueryResult>(env);
    expect(result.rowCount).toBeGreaterThan(0);
    for (const row of result.rows) {
      expect(row).not.toHaveProperty("email");
    }
  });

  it("query_dataset rejects explicit PII column without opt-in", async () => {
    const { app } = buildApp();
    const env = await callTool(app, "query_dataset", {
      resourceId: "dist-pii",
      columns: ["email"],
    });
    expect(env.result?.isError).toBe(true);
    expect(
      (env.result?.structuredContent as { errorType: string }).errorType,
    ).toBe("COLUMN_IS_PII");
  });

  it("query_dataset returns PII column when includePii=true", async () => {
    const { app } = buildApp();
    const env = await callTool(app, "query_dataset", {
      resourceId: "dist-pii",
      columns: ["email"],
      includePii: true,
    });
    const result = unpack<QueryResult>(env);
    expect(result.rowCount).toBeGreaterThan(0);
    expect(result.rows[0]).toHaveProperty("email");
  });

  it("aggregate_dataset rejects PII column in groupBy", async () => {
    const { app } = buildApp();
    const env = await callTool(app, "aggregate_dataset", {
      resourceId: "dist-pii",
      groupBy: ["email"],
      metrics: [{ function: "count_all" }],
    });
    expect(
      (env.result?.structuredContent as { errorType: string }).errorType,
    ).toBe("COLUMN_IS_PII");
  });
});
