"use server";

import { prisma } from "@/lib/db";
import {
  seriesCreateSchema,
  seriesUpdateSchema,
  type SeriesCreateInput,
  type SeriesUpdateInput,
} from "@/lib/schemas/series";
import { generateSlug } from "@/lib/utils/slug";

const seriesIncludes = {
  datasets: { include: { publisher: true } },
} as const;

export async function createSeries(input: SeriesCreateInput) {
  const data = seriesCreateSchema.parse(input);
  const slug = generateSlug(data.title);
  return prisma.datasetSeries.create({
    data: {
      title: data.title,
      identifier: data.identifier,
      description: data.description || null,
      slug,
    },
    include: seriesIncludes,
  });
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

  return prisma.datasetSeries.update({
    where: { id },
    data: updateData,
    include: seriesIncludes,
  });
}

export async function deleteSeries(id: string) {
  // Unlink datasets first
  await prisma.dataset.updateMany({
    where: { seriesId: id },
    data: { seriesId: null },
  });
  return prisma.datasetSeries.delete({ where: { id } });
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

export async function listSeries() {
  return prisma.datasetSeries.findMany({
    include: { _count: { select: { datasets: true } } },
    orderBy: { title: "asc" },
  });
}
