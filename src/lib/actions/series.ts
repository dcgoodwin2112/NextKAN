"use server";

import { prisma } from "@/lib/db";
import {
  seriesCreateSchema,
  seriesUpdateSchema,
  type SeriesCreateInput,
  type SeriesUpdateInput,
} from "@/lib/schemas/series";
import { logActivity } from "@/lib/services/activity";
import { generateSlug } from "@/lib/utils/slug";
import { silentCatch } from "@/lib/utils/log";

const seriesIncludes = {
  datasets: { include: { publisher: true } },
} as const;

export async function createSeries(input: SeriesCreateInput) {
  const data = seriesCreateSchema.parse(input);
  const slug = generateSlug(data.title);
  const series = await prisma.datasetSeries.create({
    data: {
      title: data.title,
      identifier: data.identifier,
      description: data.description || null,
      slug,
    },
    include: seriesIncludes,
  });

  silentCatch(
    logActivity({
      action: "create",
      entityType: "series",
      entityId: series.id,
      entityName: series.title,
    }),
    "activity"
  );

  return series;
}

export async function updateSeries(id: string, input: SeriesUpdateInput) {
  const data = seriesUpdateSchema.parse(input);
  const updateData: Record<string, unknown> = {};

  if (data.title !== undefined) {
    updateData.title = data.title;
    updateData.slug = generateSlug(data.title);
  }
  if (data.identifier !== undefined) updateData.identifier = data.identifier;
  if (data.description !== undefined) updateData.description = data.description || null;

  const series = await prisma.datasetSeries.update({
    where: { id },
    data: updateData,
    include: seriesIncludes,
  });

  silentCatch(
    logActivity({
      action: "update",
      entityType: "series",
      entityId: series.id,
      entityName: series.title,
    }),
    "activity"
  );

  return series;
}

export async function deleteSeries(id: string) {
  // Unlink datasets first
  await prisma.dataset.updateMany({
    where: { seriesId: id },
    data: { seriesId: null },
  });
  const series = await prisma.datasetSeries.delete({ where: { id } });

  silentCatch(
    logActivity({
      action: "delete",
      entityType: "series",
      entityId: id,
      entityName: series.title,
    }),
    "activity"
  );

  return series;
}

export async function getSeries(id: string) {
  return prisma.datasetSeries.findUnique({
    where: { id },
    include: seriesIncludes,
  });
}

export async function getSeriesBySlug(slug: string) {
  return prisma.datasetSeries.findUnique({
    where: { slug },
    include: seriesIncludes,
  });
}

export interface ListSeriesOptions {
  search?: string;
  page?: number;
  limit?: number;
}

export async function listSeries(options: ListSeriesOptions = {}) {
  const { search, page = 1, limit = 0 } = options;

  const where = search
    ? { title: { contains: search } }
    : {};

  const [items, total] = await Promise.all([
    prisma.datasetSeries.findMany({
      where,
      include: { _count: { select: { datasets: true } } },
      orderBy: { title: "asc" },
      ...(limit > 0 ? { skip: (page - 1) * limit, take: limit } : {}),
    }),
    prisma.datasetSeries.count({ where }),
  ]);

  return { items, total };
}
