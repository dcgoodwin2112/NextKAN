"use server";

import { prisma } from "@/lib/db";
import { organizationSchema, type OrganizationInput } from "@/lib/schemas/organization";
import { generateSlug } from "@/lib/utils/slug";
import { logActivity } from "@/lib/services/activity";
import { requireOrgPermission } from "@/lib/auth/check-permission";
import { silentCatch } from "@/lib/utils/log";

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

  silentCatch(logActivity({
    action: "organization:created",
    entityType: "organization",
    entityId: result.id,
    entityName: result.name,
  }), "activity");

  return result;
}

export async function updateOrganization(
  id: string,
  input: Partial<OrganizationInput>
) {
  await requireOrgPermission("org:edit", id);
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

  silentCatch(logActivity({
    action: "organization:updated",
    entityType: "organization",
    entityId: id,
    entityName: result.name,
  }), "activity");

  return result;
}

export async function deleteOrganization(id: string) {
  await requireOrgPermission("org:delete", id);
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
    silentCatch(logActivity({
      action: "organization:deleted",
      entityType: "organization",
      entityId: id,
      entityName: org.name,
    }), "activity");
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

export async function listOrgMembers(orgId: string) {
  return prisma.user.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function addMember(orgId: string, userId: string) {
  await requireOrgPermission("org:update", orgId);

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
  const user = await prisma.user.update({
    where: { id: userId },
    data: { organizationId: orgId },
  });

  silentCatch(logActivity({
    action: "organization:member_added",
    entityType: "organization",
    entityId: orgId,
    entityName: org?.name ?? orgId,
    details: { userId, userName: user.name, userEmail: user.email },
  }), "activity");

  return user;
}

export async function removeMember(orgId: string, userId: string) {
  await requireOrgPermission("org:update", orgId);

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
  const user = await prisma.user.update({
    where: { id: userId },
    data: { organizationId: null },
  });

  silentCatch(logActivity({
    action: "organization:member_removed",
    entityType: "organization",
    entityId: orgId,
    entityName: org?.name ?? orgId,
    details: { userId, userName: user.name, userEmail: user.email },
  }), "activity");

  return user;
}

export async function listAvailableUsers() {
  return prisma.user.findMany({
    where: { organizationId: null, status: "active" },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function listOrganizations(options?: { limit?: number }) {
  return prisma.organization.findMany({
    include: {
      _count: { select: { datasets: true } },
    },
    orderBy: { name: "asc" },
    take: options?.limit ?? 100,
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
        parent: true,
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.organization.count({ where }),
  ]);

  return { organizations, total };
}
