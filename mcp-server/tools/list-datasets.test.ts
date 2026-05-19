// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { buildApp } from "../transport";
import { callTool, unpack } from "./test-helpers";

interface ListDatasetsResult {
  datasets: Array<{
    id: string;
    title: string;
    themes: string[];
    keywords: string[];
    publisher: string;
    resourceCount: number;
  }>;
  totalCount: number;
  hasMore: boolean;
}

function makeDataset(overrides: Record<string, unknown> = {}) {
  return {
    id: "ds-1",
    identifier: "id-1",
    title: "Sales",
    description: "Quarterly sales",
    modified: new Date("2026-05-01T00:00:00Z"),
    publisher: { name: "Acme" },
    themes: [{ theme: { slug: "finance" } }],
    keywords: [{ keyword: "sales" }],
    _count: { distributions: 2 },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("list_datasets tool", () => {
  it("returns published datasets with totalCount and hasMore", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([makeDataset()] as any);
    prismaMock.dataset.count.mockResolvedValue(1 as any);

    const { app } = buildApp();
    const env = await callTool(app, "list_datasets", {});
    expect(env.error).toBeUndefined();
    const result = unpack<ListDatasetsResult>(env);
    expect(result.totalCount).toBe(1);
    expect(result.hasMore).toBe(false);
    expect(result.datasets).toHaveLength(1);
    expect(result.datasets[0]).toMatchObject({
      id: "ds-1",
      title: "Sales",
      themes: ["finance"],
      keywords: ["sales"],
      publisher: "Acme",
      resourceCount: 2,
    });
  });

  it("forwards query, themes, limit, offset to Prisma", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([] as any);
    prismaMock.dataset.count.mockResolvedValue(0 as any);

    const { app } = buildApp();
    await callTool(app, "list_datasets", {
      query: "sales",
      themes: ["finance"],
      limit: 5,
      offset: 10,
    });

    const arg = prismaMock.dataset.findMany.mock.calls[0][0] as any;
    expect(arg.skip).toBe(10);
    expect(arg.take).toBe(5);
    expect(arg.where.status).toBe("published");
    expect(arg.where.OR).toEqual([
      { title: { contains: "sales" } },
      { description: { contains: "sales" } },
    ]);
    expect(arg.where.themes).toBeDefined();
  });

  it("hasMore=true when totalCount exceeds offset+rows", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([
      makeDataset({ id: "a" }),
      makeDataset({ id: "b" }),
    ] as any);
    prismaMock.dataset.count.mockResolvedValue(50 as any);

    const { app } = buildApp();
    const env = await callTool(app, "list_datasets", { limit: 2 });
    const result = unpack<ListDatasetsResult>(env);
    expect(result.hasMore).toBe(true);
  });
});
