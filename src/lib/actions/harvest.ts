"use server";

import { prisma } from "@/lib/db";
import {
  harvestSourceCreateSchema,
  harvestSourceUpdateSchema,
  type HarvestSourceCreateInput,
  type HarvestSourceUpdateInput,
} from "@/lib/schemas/harvest";
import { runHarvest } from "@/lib/services/harvest";

export async function createHarvestSource(input: HarvestSourceCreateInput) {
  const data = harvestSourceCreateSchema.parse(input);
  return prisma.harvestSource.create({
    data: {
      name: data.name,
      url: data.url,
      type: data.type,
      schedule: data.schedule || null,
      organizationId: data.organizationId,
      enabled: data.enabled,
    },
  });
}

export async function updateHarvestSource(
  id: string,
  input: HarvestSourceUpdateInput
) {
  const data = harvestSourceUpdateSchema.parse(input);
  return prisma.harvestSource.update({
    where: { id },
    data,
  });
}

export async function deleteHarvestSource(id: string) {
  // Delete associated harvest jobs first
  await prisma.harvestJob.deleteMany({ where: { sourceId: id } });
  return prisma.harvestSource.delete({ where: { id } });
}

export async function getHarvestSource(id: string) {
  return prisma.harvestSource.findUnique({
    where: { id },
    include: { organization: true },
  });
}

export async function listHarvestSources() {
  return prisma.harvestSource.findMany({
    include: { organization: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listHarvestJobs(sourceId: string) {
  return prisma.harvestJob.findMany({
    where: { sourceId },
    orderBy: { startedAt: "desc" },
    take: 20,
  });
}

export async function triggerHarvest(sourceId: string) {
  return runHarvest(sourceId);
}
