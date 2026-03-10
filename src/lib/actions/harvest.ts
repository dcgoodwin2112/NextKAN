"use server";

import { prisma } from "@/lib/db";
import {
  harvestSourceCreateSchema,
  harvestSourceUpdateSchema,
  type HarvestSourceCreateInput,
  type HarvestSourceUpdateInput,
} from "@/lib/schemas/harvest";
import { runHarvest } from "@/lib/services/harvest";
import { logActivity } from "@/lib/services/activity";
import { silentCatch } from "@/lib/utils/log";

export async function createHarvestSource(input: HarvestSourceCreateInput) {
  const data = harvestSourceCreateSchema.parse(input);
  const source = await prisma.harvestSource.create({
    data: {
      name: data.name,
      url: data.url,
      type: data.type,
      schedule: data.schedule || null,
      organizationId: data.organizationId,
      enabled: data.enabled,
    },
  });

  silentCatch(
    logActivity({
      action: "create",
      entityType: "harvest_source",
      entityId: source.id,
      entityName: source.name,
    }),
    "activity"
  );

  return source;
}

export async function updateHarvestSource(
  id: string,
  input: HarvestSourceUpdateInput
) {
  const data = harvestSourceUpdateSchema.parse(input);
  const source = await prisma.harvestSource.update({
    where: { id },
    data,
  });

  silentCatch(
    logActivity({
      action: "update",
      entityType: "harvest_source",
      entityId: source.id,
      entityName: source.name,
    }),
    "activity"
  );

  return source;
}

export async function deleteHarvestSource(id: string) {
  // Delete associated harvest jobs first
  await prisma.harvestJob.deleteMany({ where: { sourceId: id } });
  const source = await prisma.harvestSource.delete({ where: { id } });

  silentCatch(
    logActivity({
      action: "delete",
      entityType: "harvest_source",
      entityId: id,
      entityName: source.name,
    }),
    "activity"
  );

  return source;
}

export async function getHarvestSource(id: string) {
  return prisma.harvestSource.findUnique({
    where: { id },
    include: { organization: true },
  });
}

export interface ListHarvestSourcesOptions {
  search?: string;
  page?: number;
  limit?: number;
}

export async function listHarvestSources(options: ListHarvestSourcesOptions = {}) {
  const { search, page = 1, limit = 0 } = options;

  const where = search
    ? { name: { contains: search } }
    : {};

  const [items, total] = await Promise.all([
    prisma.harvestSource.findMany({
      where,
      include: { organization: true },
      orderBy: { createdAt: "desc" },
      ...(limit > 0 ? { skip: (page - 1) * limit, take: limit } : {}),
    }),
    prisma.harvestSource.count({ where }),
  ]);

  return { items, total };
}

export async function listHarvestJobs(sourceId: string) {
  return prisma.harvestJob.findMany({
    where: { sourceId },
    orderBy: { startedAt: "desc" },
    take: 20,
  });
}

export async function triggerHarvest(sourceId: string) {
  const source = await prisma.harvestSource.findUnique({ where: { id: sourceId } });

  silentCatch(
    logActivity({
      action: "trigger",
      entityType: "harvest_source",
      entityId: sourceId,
      entityName: source?.name || sourceId,
    }),
    "activity"
  );

  return runHarvest(sourceId);
}
