"use server";

import { prisma } from "@/lib/db";
import {
  datasetCreateSchema,
  datasetUpdateSchema,
  type DatasetCreateInput,
  type DatasetUpdateInput,
} from "@/lib/schemas/dataset";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { buildSearchWhere, type SearchParams } from "@/lib/utils/search";
import { distributionSchema, type DistributionInput } from "@/lib/schemas/distribution";
import { logActivity, computeDiff } from "@/lib/services/activity";
import { getEmailService } from "@/lib/services/email";
import { datasetCreatedEmail } from "@/lib/email-templates/dataset-created";
import { hooks } from "@/lib/plugins/hooks";
import { isPluginsEnabled } from "@/lib/plugins/loader";
import { validateCustomFieldValue } from "@/lib/schemas/custom-field";
import { silentCatch } from "@/lib/utils/log";

const datasetIncludes = {
  publisher: { include: { parent: true } },
  distributions: { orderBy: { sortOrder: "asc" as const } },
  keywords: true,
  themes: { include: { theme: true } },
  series: true,
  customFieldValues: { include: { definition: true } },
} as const;

export async function createDataset(
  input: DatasetCreateInput,
  createdById?: string,
  customFields?: Record<string, string>
) {
  const data = datasetCreateSchema.parse(input);
  const slug = await ensureUniqueSlug(generateSlug(data.title));

  if (isPluginsEnabled()) {
    silentCatch(hooks.run("dataset:beforeCreate", data), "hooks:dataset:beforeCreate");
  }

  const result = await prisma.$transaction(async (tx) => {
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
        version: data.version || null,
        versionNotes: data.versionNotes || null,
        seriesId: data.seriesId || null,
        previousVersion: data.previousVersion || null,
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

    if (customFields && Object.keys(customFields).length > 0) {
      const definitions = await tx.customFieldDefinition.findMany({
        where: { name: { in: Object.keys(customFields) } },
      });
      const cfData: { datasetId: string; definitionId: string; value: string }[] = [];
      for (const def of definitions) {
        const value = customFields[def.name];
        if (value !== undefined && value !== "") {
          const error = validateCustomFieldValue(value, def);
          if (error) throw new Error(`Custom field "${def.label}": ${error}`);
          cfData.push({ datasetId: dataset.id, definitionId: def.id, value });
        }
      }
      if (cfData.length > 0) {
        await tx.datasetCustomFieldValue.createMany({ data: cfData });
      }
    }

    return tx.dataset.findUniqueOrThrow({
      where: { id: dataset.id },
      include: datasetIncludes,
    });
  });

  // Fire-and-forget: activity log + email notification
  silentCatch(logActivity({
    action: "dataset:created",
    entityType: "dataset",
    entityId: result.id,
    entityName: result.title,
    userId: createdById,
  }), "activity");

  if (isPluginsEnabled()) {
    silentCatch(hooks.run("dataset:afterCreate", result), "hooks:dataset:afterCreate");
  }

  if (result.status === "published") {
    const siteUrl = process.env.SITE_URL || "http://localhost:3000";
    const email = datasetCreatedEmail({
      title: result.title,
      datasetUrl: `${siteUrl}/datasets/${result.slug}`,
      publisherName: result.publisher.name,
    });
    silentCatch(getEmailService().send({
      to: result.contactEmail || "admin@example.com",
      ...email,
    }), "email");
  }

  return result;
}

export async function updateDataset(id: string, input: DatasetUpdateInput, customFields?: Record<string, string>) {
  const data = datasetUpdateSchema.parse(input);
  const updateData: Record<string, unknown> = { modified: new Date() };

  if (data.title !== undefined) {
    updateData.title = data.title;
    updateData.slug = await ensureUniqueSlug(generateSlug(data.title), id);
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
  if (data.version !== undefined) updateData.version = data.version || null;
  if (data.versionNotes !== undefined) updateData.versionNotes = data.versionNotes || null;
  if (data.seriesId !== undefined) updateData.seriesId = data.seriesId || null;
  if (data.previousVersion !== undefined) updateData.previousVersion = data.previousVersion || null;

  if (isPluginsEnabled()) {
    silentCatch(hooks.run("dataset:beforeUpdate", id, data), "hooks:dataset:beforeUpdate");
  }

  // Fetch before-state for diff
  const before = await prisma.dataset.findUnique({ where: { id } });
  if (before?.deletedAt) {
    throw new Error("Cannot update a deleted dataset");
  }

  const result = await prisma.$transaction(async (tx) => {
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

    if (customFields !== undefined) {
      await tx.datasetCustomFieldValue.deleteMany({ where: { datasetId: id } });
      if (Object.keys(customFields).length > 0) {
        const definitions = await tx.customFieldDefinition.findMany({
          where: { name: { in: Object.keys(customFields) } },
        });
        const cfData: { datasetId: string; definitionId: string; value: string }[] = [];
        for (const def of definitions) {
          const value = customFields[def.name];
          if (value !== undefined && value !== "") {
            const error = validateCustomFieldValue(value, def);
            if (error) throw new Error(`Custom field "${def.label}": ${error}`);
            cfData.push({ datasetId: id, definitionId: def.id, value });
          }
        }
        if (cfData.length > 0) {
          await tx.datasetCustomFieldValue.createMany({ data: cfData });
        }
      }
    }

    return tx.dataset.findUniqueOrThrow({
      where: { id },
      include: datasetIncludes,
    });
  });

  if (isPluginsEnabled()) {
    silentCatch(hooks.run("dataset:afterUpdate", result), "hooks:dataset:afterUpdate");
  }

  // Fire-and-forget: activity log
  if (before) {
    const diff = computeDiff(
      before as unknown as Record<string, unknown>,
      result as unknown as Record<string, unknown>
    );
    silentCatch(logActivity({
      action: "dataset:updated",
      entityType: "dataset",
      entityId: id,
      entityName: result.title,
      details: diff,
    }), "activity");
  }

  return result;
}

export async function deleteDataset(id: string) {
  const dataset = await prisma.dataset.findUnique({ where: { id } });
  if (!dataset || dataset.deletedAt) return;

  if (isPluginsEnabled()) {
    silentCatch(hooks.run("dataset:beforeDelete", id), "hooks:dataset:beforeDelete");
  }

  await prisma.dataset.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  silentCatch(logActivity({
    action: "dataset:deleted",
    entityType: "dataset",
    entityId: id,
    entityName: dataset.title,
  }), "activity");

  if (isPluginsEnabled()) {
    silentCatch(hooks.run("dataset:afterDelete", id, dataset.title), "hooks:dataset:afterDelete");
  }
}

export async function getDataset(id: string) {
  const dataset = await prisma.dataset.findUnique({
    where: { id },
    include: datasetIncludes,
  });
  if (dataset?.deletedAt) return null;
  return dataset;
}

export async function getDatasetBySlug(slug: string) {
  const dataset = await prisma.dataset.findUnique({
    where: { slug },
    include: datasetIncludes,
  });
  if (dataset?.deletedAt) return null;
  return dataset;
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
  sort?: string;
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

  const sortMap: Record<string, Record<string, string>> = {
    modified_desc: { modified: "desc" },
    modified_asc: { modified: "asc" },
    title_asc: { title: "asc" },
    title_desc: { title: "desc" },
    created_desc: { issued: "desc" },
    created_asc: { issued: "asc" },
  };
  const orderBy = sortMap[params?.sort ?? ""] ?? { modified: "desc" };

  const [datasets, total] = await Promise.all([
    prisma.dataset.findMany({
      where,
      include: datasetIncludes,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.dataset.count({ where }),
  ]);

  return { datasets, total };
}

export async function listDeletedDatasets(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { deletedAt: { not: null } };

  if (params?.search?.trim()) {
    const terms = params.search.trim().split(/\s+/);
    where.AND = terms.map((term) => ({
      OR: [
        { title: { contains: term } },
        { description: { contains: term } },
      ],
    }));
  }

  const [datasets, total] = await Promise.all([
    prisma.dataset.findMany({
      where,
      include: { publisher: true },
      orderBy: { deletedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.dataset.count({ where }),
  ]);

  return { datasets, total };
}

export async function restoreDataset(id: string) {
  const dataset = await prisma.dataset.findUnique({ where: { id } });
  if (!dataset) throw new Error("Dataset not found");
  if (!dataset.deletedAt) throw new Error("Dataset is not in trash");

  await prisma.dataset.update({
    where: { id },
    data: { deletedAt: null },
  });

  silentCatch(logActivity({
    action: "dataset:restored",
    entityType: "dataset",
    entityId: id,
    entityName: dataset.title,
  }), "activity");
}

export async function purgeDataset(id: string) {
  const dataset = await prisma.dataset.findUnique({ where: { id } });
  if (!dataset) throw new Error("Dataset not found");
  if (!dataset.deletedAt) throw new Error("Cannot purge a live dataset. Move to trash first.");

  await prisma.dataset.delete({ where: { id } });

  silentCatch(logActivity({
    action: "dataset:purged",
    entityType: "dataset",
    entityId: id,
    entityName: dataset.title,
  }), "activity");
}

// Bulk actions

export async function bulkUpdateDatasets(
  ids: string[],
  update: { status?: string; publisherId?: string }
) {
  const { bulkDatasetUpdateSchema } = await import("@/lib/schemas/bulk");
  const validated = bulkDatasetUpdateSchema.parse({ ids, update });

  let success = 0;
  const errors: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const id of validated.ids) {
      try {
        const dataset = await tx.dataset.findUnique({ where: { id } });
        if (!dataset || dataset.deletedAt) {
          errors.push(`Dataset ${id} not found or deleted`);
          continue;
        }
        await tx.dataset.update({
          where: { id },
          data: { ...validated.update, modified: new Date() },
        });
        success++;

        silentCatch(logActivity({
          action: "dataset:updated",
          entityType: "dataset",
          entityId: id,
          entityName: dataset.title,
          details: { bulk: true, ...validated.update },
        }), "activity");

        if (isPluginsEnabled()) {
          silentCatch(hooks.run("dataset:afterUpdate", { ...dataset, ...validated.update }), "hooks:dataset:afterUpdate");
        }
      } catch (err) {
        errors.push(`Dataset ${id}: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    }
  });

  return { success, errors };
}

export async function bulkDeleteDatasets(ids: string[]) {
  const { bulkIdsSchema } = await import("@/lib/schemas/bulk");
  const validatedIds = bulkIdsSchema.parse(ids);

  const datasets = await prisma.dataset.findMany({
    where: { id: { in: validatedIds }, deletedAt: null },
    select: { id: true, title: true },
  });

  const result = await prisma.dataset.updateMany({
    where: { id: { in: datasets.map((d) => d.id) } },
    data: { deletedAt: new Date() },
  });

  for (const dataset of datasets) {
    silentCatch(logActivity({
      action: "dataset:deleted",
      entityType: "dataset",
      entityId: dataset.id,
      entityName: dataset.title,
      details: { bulk: true },
    }), "activity");

    if (isPluginsEnabled()) {
      silentCatch(hooks.run("dataset:afterDelete", dataset.id, dataset.title), "hooks:dataset:afterDelete");
    }
  }

  return {
    success: result.count,
    errors: validatedIds.length > datasets.length
      ? [`${validatedIds.length - datasets.length} dataset(s) were already deleted or not found`]
      : [],
  };
}

// Distribution actions

export async function addDistribution(datasetId: string, input: DistributionInput) {
  const data = distributionSchema.parse(input);
  const distribution = await prisma.distribution.create({
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
      fileName: data.fileName || null,
      filePath: data.filePath || null,
      fileSize: data.fileSize || null,
    },
  });

  const storageProvider = process.env.STORAGE_PROVIDER || "local";
  if (data.mediaType === "text/csv" && data.filePath && storageProvider === "local") {
    const { importCsvToDatastore } = await import("@/lib/services/datastore");
    await importCsvToDatastore(distribution);
  }

  return distribution;
}

export async function updateDistribution(id: string, input: Partial<DistributionInput>) {
  return prisma.distribution.update({
    where: { id },
    data: input,
  });
}

export async function removeDistribution(id: string) {
  const datastoreTable = await prisma.datastoreTable.findUnique({
    where: { distributionId: id },
  });

  if (datastoreTable) {
    const { deleteDatastoreTable } = await import("@/lib/services/datastore");
    await deleteDatastoreTable(datastoreTable.tableName);
  }

  await prisma.distribution.delete({ where: { id } });
}

export async function reorderDistributions(datasetId: string, distributionIds: string[]) {
  await prisma.$transaction(
    distributionIds.map((id, index) =>
      prisma.distribution.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );
}
