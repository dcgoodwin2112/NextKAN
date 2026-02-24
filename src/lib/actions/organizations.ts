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
    where: { publisherId: id },
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
        where: { status: "published" },
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
