"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  savedChartCreateSchema,
  savedChartUpdateSchema,
  type SavedChartCreateInput,
  type ChartUpdateInput,
} from "@/lib/schemas/chart";
import { logActivity } from "@/lib/services/activity";
import { silentCatch } from "@/lib/utils/log";

const chartIncludes = {
  distribution: {
    include: {
      dataset: {
        select: {
          id: true,
          title: true,
          slug: true,
          publisher: { select: { name: true } },
        },
      },
    },
  },
} as const;

export interface ListChartsOptions {
  search?: string;
  datasetId?: string;
  page?: number;
  limit?: number;
}

export async function listCharts(options: ListChartsOptions = {}) {
  const { search, datasetId, page = 1, limit = 0 } = options;

  const where: Record<string, unknown> = {};
  if (search) {
    where.title = { contains: search };
  }
  if (datasetId) {
    where.distribution = { dataset: { id: datasetId } };
  }

  const [items, total] = await Promise.all([
    prisma.savedChart.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: chartIncludes,
      ...(limit > 0 ? { skip: (page - 1) * limit, take: limit } : {}),
    }),
    prisma.savedChart.count({ where }),
  ]);

  return { items, total };
}

export async function getChart(id: string) {
  return prisma.savedChart.findUnique({
    where: { id },
    include: chartIncludes,
  });
}

export async function updateChart(id: string, input: ChartUpdateInput) {
  const data = savedChartUpdateSchema.parse(input);
  const updateData: Record<string, unknown> = {};

  if (data.title !== undefined) updateData.title = data.title || null;
  if (data.chartType !== undefined) updateData.chartType = data.chartType;
  if (data.config !== undefined) updateData.config = JSON.stringify(data.config);

  const chart = await prisma.savedChart.update({ where: { id }, data: updateData });

  silentCatch(
    logActivity({
      action: "update",
      entityType: "chart",
      entityId: chart.id,
      entityName: chart.title || "Untitled Chart",
    }),
    "activity"
  );

  return chart;
}

export async function deleteChart(id: string) {
  const chart = await prisma.savedChart.delete({ where: { id } });

  silentCatch(
    logActivity({
      action: "delete",
      entityType: "chart",
      entityId: id,
      entityName: chart.title || "Untitled Chart",
    }),
    "activity"
  );
}

export async function createChart(input: SavedChartCreateInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const data = savedChartCreateSchema.parse(input);
  const chart = await prisma.savedChart.create({
    data: {
      distributionId: data.distributionId,
      title: data.title || null,
      chartType: data.chartType,
      config: JSON.stringify(data.config),
      createdById: session.user.id,
    },
  });

  silentCatch(
    logActivity({
      action: "create",
      entityType: "chart",
      entityId: chart.id,
      entityName: chart.title || "Untitled Chart",
    }),
    "activity"
  );

  return chart;
}

export async function listChartableDistributions() {
  const tables = await prisma.datastoreTable.findMany({
    where: { status: "ready" },
    include: {
      distribution: {
        include: {
          dataset: {
            select: {
              title: true,
              publisher: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  return tables.map((t) => ({
    distributionId: t.distributionId,
    datasetTitle: t.distribution.dataset.title,
    distributionTitle:
      t.distribution.title || t.distribution.format || "Distribution",
    format: t.distribution.format || "",
    organization: t.distribution.dataset.publisher?.name || "",
    rowCount: t.rowCount,
  }));
}
