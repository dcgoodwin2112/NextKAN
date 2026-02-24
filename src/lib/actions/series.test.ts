import { describe, it, expect, vi } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

import {
  createSeries,
  updateSeries,
  deleteSeries,
  getSeries,
  getSeriesBySlug,
  listSeries,
} from "./series";

const mockSeries = {
  id: "a1b2c3d4-e5f6-1234-a567-123456789abc",
  title: "Climate Data Series",
  identifier: "climate-data-series",
  description: "A series of climate datasets",
  slug: "climate-data-series",
  createdAt: new Date(),
  updatedAt: new Date(),
  datasets: [],
};

describe("createSeries", () => {
  it("creates a series with slug from title", async () => {
    prismaMock.datasetSeries.create.mockResolvedValue(mockSeries as any);
    const result = await createSeries({
      title: "Climate Data Series",
      identifier: "climate-data-series",
      description: "A series of climate datasets",
    });
    expect(prismaMock.datasetSeries.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Climate Data Series",
          slug: "climate-data-series",
        }),
      })
    );
    expect(result).toEqual(mockSeries);
  });
});

describe("updateSeries", () => {
  it("updates title and regenerates slug", async () => {
    prismaMock.datasetSeries.update.mockResolvedValue({
      ...mockSeries,
      title: "Updated Series",
      slug: "updated-series",
    } as any);
    await updateSeries(mockSeries.id, { title: "Updated Series" });
    expect(prismaMock.datasetSeries.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Updated Series",
          slug: "updated-series",
        }),
      })
    );
  });
});

describe("deleteSeries", () => {
  it("unlinks datasets then deletes series", async () => {
    prismaMock.dataset.updateMany.mockResolvedValue({ count: 2 });
    prismaMock.datasetSeries.delete.mockResolvedValue(mockSeries as any);
    await deleteSeries(mockSeries.id);
    expect(prismaMock.dataset.updateMany).toHaveBeenCalledWith({
      where: { seriesId: mockSeries.id },
      data: { seriesId: null },
    });
    expect(prismaMock.datasetSeries.delete).toHaveBeenCalledWith({
      where: { id: mockSeries.id },
    });
  });
});

describe("listSeries", () => {
  it("returns series with dataset count", async () => {
    prismaMock.datasetSeries.findMany.mockResolvedValue([
      { ...mockSeries, _count: { datasets: 3 } },
    ] as any);
    const result = await listSeries();
    expect(result).toHaveLength(1);
    expect(prismaMock.datasetSeries.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { _count: { select: { datasets: true } } },
      })
    );
  });
});

describe("getSeries", () => {
  it("returns series by id", async () => {
    prismaMock.datasetSeries.findUnique.mockResolvedValue(mockSeries as any);
    const result = await getSeries(mockSeries.id);
    expect(result).toEqual(mockSeries);
  });
});

describe("getSeriesBySlug", () => {
  it("returns series by slug", async () => {
    prismaMock.datasetSeries.findUnique.mockResolvedValue(mockSeries as any);
    const result = await getSeriesBySlug("climate-data-series");
    expect(result).toEqual(mockSeries);
    expect(prismaMock.datasetSeries.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "climate-data-series" } })
    );
  });
});
