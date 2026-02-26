"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  savedChartCreateSchema,
  savedChartUpdateSchema,
  type SavedChartCreateInput,
  type ChartUpdateInput,
} from "@/lib/schemas/chart";

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

export async function listCharts() {
  return prisma.savedChart.findMany({
    orderBy: { createdAt: "desc" },
    include: chartIncludes,
  });
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

  return prisma.savedChart.update({ where: { id }, data: updateData });
}

export async function deleteChart(id: string) {
  await prisma.savedChart.delete({ where: { id } });
}

export async function createChart(input: SavedChartCreateInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const data = savedChartCreateSchema.parse(input);
  return prisma.savedChart.create({
    data: {
      distributionId: data.distributionId,
      title: data.title || null,
      chartType: data.chartType,
      config: JSON.stringify(data.config),
      createdById: session.user.id,
    },
  });
}

export async function listChartableDistributions() {
  const tables = await prisma.datastoreTable.findMany({
    where: { status: "ready" },
    include: {
      distribution: {
        include: {
          dataset: { select: { title: true } },
        },
      },
    },
  });

  return tables.map((t) => ({
    distributionId: t.distributionId,
    label: `${t.distribution.dataset.title} — ${t.distribution.title || t.distribution.format || "Distribution"}`,
    rowCount: t.rowCount,
  }));
}
