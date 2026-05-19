// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { buildApp } from "../transport";
import { callTool, unpack } from "./test-helpers";

interface GetSchemaResult {
  resourceId: string;
  rowCount?: number;
  columns: Array<{
    name: string;
    position: number;
    type: string;
    nullable: boolean;
    filterable: boolean;
    aggregatable: boolean;
    isPii: boolean;
    distinctCount?: number;
    sampleValues?: unknown[];
    enumValues?: unknown[];
  }>;
}

function makeDistribution(overrides: Record<string, unknown> = {}) {
  return {
    id: "dist-1",
    rowCount: 100,
    dataset: { status: "published", deletedAt: null },
    dataDictionary: {
      fields: [
        {
          name: "id",
          type: "integer",
          title: null,
          description: null,
          sortOrder: 0,
          duckdbType: "BIGINT",
          rowCount: 100,
          nullCount: 0,
          distinctCount: 100,
          min: "1",
          max: "100",
          sampleValues: JSON.stringify([1, 2, 3]),
          enumValues: null,
          filterable: true,
          aggregatable: true,
          isPii: false,
          isGeometry: false,
          crs: null,
        },
        {
          name: "region",
          type: "string",
          title: null,
          description: "Sales region",
          sortOrder: 1,
          duckdbType: "VARCHAR",
          rowCount: 100,
          nullCount: 5,
          distinctCount: 4,
          min: "East",
          max: "West",
          sampleValues: JSON.stringify(["East", "West"]),
          enumValues: JSON.stringify(["East", "North", "South", "West"]),
          filterable: true,
          aggregatable: false,
          isPii: false,
          isGeometry: false,
          crs: null,
        },
      ],
    },
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("get_schema tool", () => {
  it("returns column metadata with parsed JSON arrays", async () => {
    prismaMock.distribution.findUnique.mockResolvedValue(makeDistribution() as any);

    const { app } = buildApp();
    const env = await callTool(app, "get_schema", { resourceId: "dist-1" });
    const result = unpack<GetSchemaResult>(env);

    expect(result.resourceId).toBe("dist-1");
    expect(result.rowCount).toBe(100);
    expect(result.columns).toHaveLength(2);
    expect(result.columns[0]).toMatchObject({
      name: "id",
      position: 0,
      filterable: true,
      aggregatable: true,
      nullable: false,
      distinctCount: 100,
      sampleValues: [1, 2, 3],
    });
    expect(result.columns[1].nullable).toBe(true);
    expect(result.columns[1].enumValues).toEqual(["East", "North", "South", "West"]);
  });

  it("returns RESOURCE_NOT_FOUND when missing", async () => {
    prismaMock.distribution.findUnique.mockResolvedValue(null as any);
    const { app } = buildApp();
    const env = await callTool(app, "get_schema", { resourceId: "missing" });
    expect(env.result?.isError).toBe(true);
    expect(
      (env.result?.structuredContent as { errorType: string }).errorType,
    ).toBe("RESOURCE_NOT_FOUND");
  });

  it("returns RESOURCE_NOT_FOUND when dataset is not published", async () => {
    prismaMock.distribution.findUnique.mockResolvedValue(
      makeDistribution({ dataset: { status: "draft", deletedAt: null } }) as any,
    );
    const { app } = buildApp();
    const env = await callTool(app, "get_schema", { resourceId: "dist-1" });
    expect(
      (env.result?.structuredContent as { errorType: string }).errorType,
    ).toBe("RESOURCE_NOT_FOUND");
  });
});
