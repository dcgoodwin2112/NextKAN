"use server";

import { prisma } from "@/lib/db";
import { organizationSchema, type OrganizationInput } from "@/lib/schemas/organization";
import { generateSlug } from "@/lib/utils/slug";
import { logActivity } from "@/lib/services/activity";

export async function createOrganization(input: OrganizationInput) {
  const data = organizationSchema.parse(input);
  const slug = generateSlug(data.name);

  const result = await prisma.organization.create({
    data: {
      name: data.name,
      slug,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      parentId: data.parentId || null,
    },
  });

  logActivity({
    action: "organization:created",
    entityType: "organization",
    entityId: result.id,
    entityName: result.name,
  }).catch(() => {});

  return result;
}

export async function updateOrganization(
  id: string,
  input: Partial<OrganizationInput>
) {
  const data = organizationSchema.partial().parse(input);
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = generateSlug(data.name);
  }
  if (data.description !== undefined)
    updateData.description = data.description || null;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null;
  if (data.parentId !== undefined) updateData.parentId = data.parentId || null;

  const result = await prisma.organization.update({
    where: { id },
    data: updateData,
  });

  logActivity({
    action: "organization:updated",
    entityType: "organization",
    entityId: id,
    entityName: result.name,
  }).catch(() => {});

  return result;
}

export async function deleteOrganization(id: string) {
  const datasetCount = await prisma.dataset.count({
    where: { publisherId: id, deletedAt: null },
  });

  if (datasetCount > 0) {
    throw new Error(
      "Cannot delete organization with existing datasets. Reassign or delete datasets first."
    );
  }

  const org = await prisma.organization.findUnique({ where: { id } });
  await prisma.organization.delete({ where: { id } });

  if (org) {
    logActivity({
      action: "organization:deleted",
      entityType: "organization",
      entityId: id,
      entityName: org.name,
    }).catch(() => {});
  }
}

export async function getOrganization(id: string) {
  return prisma.organization.findUnique({
    where: { id },
    include: { parent: true, children: true },
  });
}

export async function getOrganizationBySlug(slug: string) {
  return prisma.organization.findUnique({
    where: { slug },
    include: {
      parent: true,
      children: true,
      datasets: {
        where: { status: "published", deletedAt: null },
        include: { keywords: true, distributions: true },
        orderBy: { modified: "desc" },
      },
    },
  });
}

export async function listOrganizations() {
  return prisma.organization.findMany({
    include: {
      _count: { select: { datasets: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function searchOrganizations(params?: {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
}) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (params?.search?.trim()) {
    const terms = params.search.trim().split(/\s+/);
    where.AND = terms.map((term) => ({
      OR: [
        { name: { contains: term } },
        { description: { contains: term } },
      ],
    }));
  }

  type OrgOrderBy = Record<string, string | Record<string, string>>;
  const sortMap: Record<string, OrgOrderBy> = {
    name_asc: { name: "asc" },
    name_desc: { name: "desc" },
    created_desc: { createdAt: "desc" },
    created_asc: { createdAt: "asc" },
    datasets_desc: { datasets: { _count: "desc" } },
    datasets_asc: { datasets: { _count: "asc" } },
  };
  const orderBy = sortMap[params?.sort ?? ""] ?? { name: "asc" };

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      include: {
        _count: { select: { datasets: true } },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.organization.count({ where }),
  ]);

  return { organizations, total };
}
