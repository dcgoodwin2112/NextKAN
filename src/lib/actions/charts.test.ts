import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", async () => {
  const mock = await import("@/__mocks__/prisma");
  return { prisma: mock.default };
});

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-1", role: "admin" },
  }),
}));

import { prismaMock } from "@/__mocks__/prisma";
import {
  listCharts,
  getChart,
  updateChart,
  deleteChart,
  createChart,
  listChartableDistributions,
} from "./charts";

describe("charts actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listCharts", () => {
    it("returns charts with distribution/dataset relations", async () => {
      const mockCharts = [
        {
          id: "chart-1",
          title: "Test Chart",
          chartType: "bar",
          distribution: {
            id: "dist-1",
            dataset: {
              id: "ds-1",
              title: "Dataset One",
              slug: "dataset-one",
              publisher: { name: "Org A" },
            },
          },
        },
      ];
      (prismaMock.savedChart.findMany as any).mockResolvedValue(mockCharts);

      const result = await listCharts();

      expect(result).toHaveLength(1);
      expect(result[0].distribution.dataset.title).toBe("Dataset One");
      expect(prismaMock.savedChart.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        include: expect.objectContaining({
          distribution: expect.objectContaining({
            include: expect.objectContaining({
              dataset: expect.any(Object),
            }),
          }),
        }),
      });
    });
  });

  describe("getChart", () => {
    it("returns chart by ID", async () => {
      const mockChart = {
        id: "chart-1",
        title: "My Chart",
        chartType: "line",
        distribution: {
          id: "dist-1",
          dataset: {
            id: "ds-1",
            title: "Dataset",
            slug: "dataset",
            publisher: { name: "Org" },
          },
        },
      };
      (prismaMock.savedChart.findUnique as any).mockResolvedValue(mockChart);

      const result = await getChart("chart-1");

      expect(result?.title).toBe("My Chart");
      expect(prismaMock.savedChart.findUnique).toHaveBeenCalledWith({
        where: { id: "chart-1" },
        include: expect.any(Object),
      });
    });

    it("returns null for missing ID", async () => {
      (prismaMock.savedChart.findUnique as any).mockResolvedValue(null);

      const result = await getChart("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("updateChart", () => {
    it("updates title and chartType", async () => {
      (prismaMock.savedChart.update as any).mockResolvedValue({
        id: "chart-1",
        title: "Updated Title",
        chartType: "pie",
      });

      await updateChart("chart-1", {
        title: "Updated Title",
        chartType: "pie",
      });

      expect(prismaMock.savedChart.update).toHaveBeenCalledWith({
        where: { id: "chart-1" },
        data: { title: "Updated Title", chartType: "pie" },
      });
    });

    it("validates input via schema", async () => {
      await expect(
        updateChart("chart-1", { chartType: "invalid" as any })
      ).rejects.toThrow();
    });
  });

  describe("deleteChart", () => {
    it("removes chart", async () => {
      (prismaMock.savedChart.delete as any).mockResolvedValue({
        id: "chart-1",
      });

      await deleteChart("chart-1");

      expect(prismaMock.savedChart.delete).toHaveBeenCalledWith({
        where: { id: "chart-1" },
      });
    });
  });

  describe("createChart", () => {
    it("creates chart with correct data", async () => {
      const input = {
        distributionId: "dist-1",
        title: "Revenue Chart",
        chartType: "bar" as const,
        config: { xColumn: "month", yColumns: ["revenue"] },
      };
      (prismaMock.savedChart.create as any).mockResolvedValue({
        id: "chart-new",
        ...input,
        config: JSON.stringify(input.config),
      });

      const result = await createChart(input);

      expect(result.id).toBe("chart-new");
      expect(prismaMock.savedChart.create).toHaveBeenCalledWith({
        data: {
          distributionId: "dist-1",
          title: "Revenue Chart",
          chartType: "bar",
          config: JSON.stringify({ xColumn: "month", yColumns: ["revenue"] }),
          createdById: "user-1",
        },
      });
    });

    it("validates input via schema", async () => {
      await expect(
        createChart({
          distributionId: "",
          chartType: "invalid" as any,
          config: { xColumn: "", yColumns: [] },
        })
      ).rejects.toThrow();
    });
  });

  describe("listChartableDistributions", () => {
    it("returns only ready distributions with structured fields", async () => {
      (prismaMock.datastoreTable.findMany as any).mockResolvedValue([
        {
          distributionId: "dist-1",
          rowCount: 50,
          distribution: {
            title: "data.csv",
            format: "CSV",
            dataset: { title: "Budget Data", publisher: { name: "Finance" } },
          },
        },
      ]);

      const result = await listChartableDistributions();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        distributionId: "dist-1",
        datasetTitle: "Budget Data",
        distributionTitle: "data.csv",
        format: "CSV",
        organization: "Finance",
        rowCount: 50,
      });
      expect(prismaMock.datastoreTable.findMany).toHaveBeenCalledWith({
        where: { status: "ready" },
        include: expect.objectContaining({
          distribution: expect.any(Object),
        }),
      });
    });

    it("returns empty array when none ready", async () => {
      (prismaMock.datastoreTable.findMany as any).mockResolvedValue([]);

      const result = await listChartableDistributions();

      expect(result).toEqual([]);
    });
  });
});
