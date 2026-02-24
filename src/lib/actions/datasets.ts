"use server";

import { prisma } from "@/lib/db";
import {
  datasetCreateSchema,
  datasetUpdateSchema,
  type DatasetCreateInput,
  type DatasetUpdateInput,
} from "@/lib/schemas/dataset";
import { generateSlug } from "@/lib/utils/slug";
import { buildSearchWhere, type SearchParams } from "@/lib/utils/search";
import { distributionSchema, type DistributionInput } from "@/lib/schemas/distribution";

const datasetIncludes = {
  publisher: { include: { parent: true } },
  distributions: true,
  keywords: true,
  themes: { include: { theme: true } },
} as const;

export async function createDataset(input: DatasetCreateInput, createdById?: string) {
  const data = datasetCreateSchema.parse(input);
  const slug = generateSlug(data.title);

  return prisma.$transaction(async (tx) => {
    const dataset = await tx.dataset.create({
      data: {
        title: data.title,
        description: data.description,
        slug,
        identifier: data.identifier || undefined,
        accessLevel: data.accessLevel,
        status: data.status,
        publisherId: data.publisherId,
        createdById: createdById || null,
        contactName: data.contactName || null,
        contactEmail: data.contactEmail || null,
        bureauCode: data.bureauCode || null,
        programCode: data.programCode || null,
        license: data.license || null,
        rights: data.rights || null,
        spatial: data.spatial || null,
        temporal: data.temporal || null,
        issued: data.issued ? new Date(data.issued) : null,
        accrualPeriodicity: data.accrualPeriodicity || null,
        conformsTo: data.conformsTo || null,
        dataQuality: data.dataQuality ?? null,
        describedBy: data.describedBy || null,
        isPartOf: data.isPartOf || null,
        landingPage: data.landingPage || null,
        language: data.language || null,
        references: data.references ? JSON.stringify(data.references) : null,
        modified: new Date(),
      },
      include: datasetIncludes,
    });

    if (data.keywords.length > 0) {
      await tx.datasetKeyword.createMany({
        data: data.keywords.map((keyword) => ({
          keyword,
          datasetId: dataset.id,
        })),
      });
    }

    if (data.themeIds?.length) {
      await tx.datasetTheme.createMany({
        data: data.themeIds.map((themeId) => ({
          themeId,
          datasetId: dataset.id,
        })),
      });
    }

    return tx.dataset.findUniqueOrThrow({
      where: { id: dataset.id },
      include: datasetIncludes,
    });
  });
}

export async function updateDataset(id: string, input: DatasetUpdateInput) {
  const data = datasetUpdateSchema.parse(input);
  const updateData: Record<string, unknown> = { modified: new Date() };

  if (data.title !== undefined) {
    updateData.title = data.title;
    updateData.slug = generateSlug(data.title);
  }
  if (data.description !== undefined) updateData.description = data.description;
  if (data.accessLevel !== undefined) updateData.accessLevel = data.accessLevel;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.publisherId !== undefined) updateData.publisherId = data.publisherId;
  if (data.contactName !== undefined) updateData.contactName = data.contactName || null;
  if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail || null;
  if (data.bureauCode !== undefined) updateData.bureauCode = data.bureauCode || null;
  if (data.programCode !== undefined) updateData.programCode = data.programCode || null;
  if (data.license !== undefined) updateData.license = data.license || null;
  if (data.rights !== undefined) updateData.rights = data.rights || null;
  if (data.spatial !== undefined) updateData.spatial = data.spatial || null;
  if (data.temporal !== undefined) updateData.temporal = data.temporal || null;
  if (data.issued !== undefined) updateData.issued = data.issued ? new Date(data.issued) : null;
  if (data.accrualPeriodicity !== undefined) updateData.accrualPeriodicity = data.accrualPeriodicity || null;
  if (data.conformsTo !== undefined) updateData.conformsTo = data.conformsTo || null;
  if (data.dataQuality !== undefined) updateData.dataQuality = data.dataQuality ?? null;
  if (data.describedBy !== undefined) updateData.describedBy = data.describedBy || null;
  if (data.isPartOf !== undefined) updateData.isPartOf = data.isPartOf || null;
  if (data.landingPage !== undefined) updateData.landingPage = data.landingPage || null;
  if (data.language !== undefined) updateData.language = data.language || null;
  if (data.references !== undefined) updateData.references = data.references ? JSON.stringify(data.references) : null;
  if (data.identifier !== undefined) updateData.identifier = data.identifier;

  return prisma.$transaction(async (tx) => {
    await tx.dataset.update({
      where: { id },
      data: updateData,
    });

    if (data.keywords !== undefined) {
      await tx.datasetKeyword.deleteMany({ where: { datasetId: id } });
      if (data.keywords.length > 0) {
        await tx.datasetKeyword.createMany({
          data: data.keywords.map((keyword) => ({
            keyword,
            datasetId: id,
          })),
        });
      }
    }

    if (data.themeIds !== undefined) {
      await tx.datasetTheme.deleteMany({ where: { datasetId: id } });
      if (data.themeIds.length > 0) {
        await tx.datasetTheme.createMany({
          data: data.themeIds.map((themeId) => ({
            themeId,
            datasetId: id,
          })),
        });
      }
    }

    return tx.dataset.findUniqueOrThrow({
      where: { id },
      include: datasetIncludes,
    });
  });
}

export async function deleteDataset(id: string) {
  await prisma.dataset.delete({ where: { id } });
}

export async function getDataset(id: string) {
  return prisma.dataset.findUnique({
    where: { id },
    include: datasetIncludes,
  });
}

export async function getDatasetBySlug(slug: string) {
  return prisma.dataset.findUnique({
    where: { slug },
    include: datasetIncludes,
  });
}

export async function listDatasets(params?: {
  page?: number;
  limit?: number;
  search?: string;
  organizationId?: string;
  status?: string;
  keyword?: string;
  format?: string;
  theme?: string;
  accessLevel?: string;
}) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const skip = (page - 1) * limit;

  const searchParams: SearchParams = {};
  if (params?.search) searchParams.query = params.search;
  if (params?.organizationId) searchParams.organizationId = params.organizationId;
  if (params?.keyword) searchParams.keyword = params.keyword;
  if (params?.format) searchParams.format = params.format;
  if (params?.theme) searchParams.theme = params.theme;
  if (params?.accessLevel) searchParams.accessLevel = params.accessLevel;

  const where: Record<string, unknown> = { ...buildSearchWhere(searchParams) };

  if (params?.status) {
    where.status = params.status;
  }

  const [datasets, total] = await Promise.all([
    prisma.dataset.findMany({
      where,
      include: datasetIncludes,
      orderBy: { modified: "desc" },
      skip,
      take: limit,
    }),
    prisma.dataset.count({ where }),
  ]);

  return { datasets, total };
}

// Distribution actions

export async function addDistribution(datasetId: string, input: DistributionInput) {
  const data = distributionSchema.parse(input);
  return prisma.distribution.create({
    data: {
      datasetId,
      title: data.title || null,
      description: data.description || null,
      downloadURL: data.downloadURL || null,
      accessURL: data.accessURL || null,
      mediaType: data.mediaType || null,
      format: data.format || null,
      conformsTo: data.conformsTo || null,
      describedBy: data.describedBy || null,
    },
  });
}

export async function updateDistribution(id: string, input: Partial<DistributionInput>) {
  return prisma.distribution.update({
    where: { id },
    data: input,
  });
}

export async function removeDistribution(id: string) {
  await prisma.distribution.delete({ where: { id } });
}
