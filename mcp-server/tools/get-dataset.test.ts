// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { buildApp } from "../transport";
import { callTool, unpack } from "./test-helpers";

interface GetDatasetResult {
  id: string;
  title: string;
  resources: Array<{
    id: string;
    queryable: boolean;
    columns: Array<{ name: string; filterable: boolean; aggregatable: boolean }>;
  }>;
}

function makeDataset(overrides: Record<string, unknown> = {}) {
  return {
    id: "ds-1",
    identifier: "id-1",
    slug: "sales",
    title: "Sales",
    description: "Quarterly sales",
    modified: new Date("2026-05-01T00:00:00Z"),
    accessLevel: "public",
    contactName: "Ops",
    contactEmail: "ops@example.com",
    license: "CC0",
    temporal: null,
    spatial: null,
    status: "published",
    deletedAt: null,
    publisher: { name: "Acme" },
    themes: [{ theme: { slug: "finance" } }],
    keywords: [{ keyword: "sales" }],
    distributions: [
      {
        id: "dist-a",
        title: "CSV",
        description: null,
        mediaType: "text/csv",
        rowCount: 100,
        fileName: "sales.csv",
        downloadURL: null,
        parquetPath: "resources/dist-a/data.parquet",
        dataDictionary: {
          fields: [
            { name: "amount", type: "number", title: null, description: null, filterable: false, aggregatable: true, isPii: false, isGeometry: false, sortOrder: 0 },
            { name: "region", type: "string", title: null, description: null, filterable: true, aggregatable: false, isPii: false, isGeometry: false, sortOrder: 1 },
          ],
        },
      },
      {
        id: "dist-b",
        title: "PDF report",
        description: null,
        mediaType: "application/pdf",
        rowCount: null,
        fileName: "report.pdf",
        downloadURL: "https://x/r.pdf",
        parquetPath: null,
        dataDictionary: null,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("get_dataset tool", () => {
  it("returns the dataset with resources and column flags", async () => {
    prismaMock.dataset.findFirst.mockResolvedValue(makeDataset() as any);

    const { app } = buildApp();
    const env = await callTool(app, "get_dataset", { datasetId: "ds-1" });
    expect(env.error).toBeUndefined();
    const result = unpack<GetDatasetResult>(env);

    expect(result.id).toBe("ds-1");
    expect(result.resources).toHaveLength(2);
    expect(result.resources[0].queryable).toBe(true);
    expect(result.resources[1].queryable).toBe(false);
    expect(result.resources[0].columns).toEqual([
      { name: "amount", type: "number", filterable: false, aggregatable: true, isPii: false, isGeometry: false },
      { name: "region", type: "string", filterable: true, aggregatable: false, isPii: false, isGeometry: false },
    ]);
  });

  it("returns DATASET_NOT_FOUND when missing", async () => {
    prismaMock.dataset.findFirst.mockResolvedValue(null as any);

    const { app } = buildApp();
    const env = await callTool(app, "get_dataset", { datasetId: "missing" });
    expect(env.result?.isError).toBe(true);
    const payload = env.result?.structuredContent as { errorType?: string };
    expect(payload?.errorType).toBe("DATASET_NOT_FOUND");
  });
});
