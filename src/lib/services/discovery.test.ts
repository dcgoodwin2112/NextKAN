// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    dataset: { count: vi.fn() },
    organization: { count: vi.fn() },
    distribution: { count: vi.fn(), groupBy: vi.fn() },
  },
}));

import { getCatalogStats } from "./discovery";
import { prisma } from "@/lib/db";

const mocked = vi.mocked;

describe("getCatalogStats", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns correct stats for published datasets", async () => {
    mocked(prisma.dataset.count).mockResolvedValue(5);
    mocked(prisma.organization.count).mockResolvedValue(3);
    mocked(prisma.distribution.count).mockResolvedValue(12);
    mocked(prisma.distribution.groupBy).mockResolvedValue([
      { format: "CSV", _count: { _all: 0 }, _avg: {}, _sum: {}, _min: {}, _max: {} },
      { format: "JSON", _count: { _all: 0 }, _avg: {}, _sum: {}, _min: {}, _max: {} },
      { format: "PDF", _count: { _all: 0 }, _avg: {}, _sum: {}, _min: {}, _max: {} },
    ] as never);

    const stats = await getCatalogStats();

    expect(stats).toEqual({
      datasets: 5,
      organizations: 3,
      distributions: 12,
      formats: 3,
    });
  });

  it("filters by published and non-deleted datasets", async () => {
    mocked(prisma.dataset.count).mockResolvedValue(0);
    mocked(prisma.organization.count).mockResolvedValue(0);
    mocked(prisma.distribution.count).mockResolvedValue(0);
    mocked(prisma.distribution.groupBy).mockResolvedValue([] as never);

    await getCatalogStats();

    expect(prisma.dataset.count).toHaveBeenCalledWith({
      where: { status: "published", deletedAt: null },
    });
    expect(prisma.distribution.count).toHaveBeenCalledWith({
      where: { dataset: { status: "published", deletedAt: null } },
    });
  });

  it("counts unique formats only", async () => {
    mocked(prisma.dataset.count).mockResolvedValue(2);
    mocked(prisma.organization.count).mockResolvedValue(1);
    mocked(prisma.distribution.count).mockResolvedValue(5);
    mocked(prisma.distribution.groupBy).mockResolvedValue([
      { format: "CSV", _count: { _all: 0 }, _avg: {}, _sum: {}, _min: {}, _max: {} },
    ] as never);

    const stats = await getCatalogStats();
    expect(stats.formats).toBe(1);
  });
});
