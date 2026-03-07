"use server";

import { prisma } from "@/lib/db";
import {
  pageCreateSchema,
  pageUpdateSchema,
  type PageCreateInput,
  type PageUpdateInput,
} from "@/lib/schemas/page";
import { generateSlug } from "@/lib/utils/slug";
import { logActivity } from "@/lib/services/activity";

export async function createPage(
  input: PageCreateInput,
  createdById?: string
) {
  const data = pageCreateSchema.parse(input);
  const slug = data.slug || generateSlug(data.title);

  const page = await prisma.page.create({
    data: {
      title: data.title,
      slug,
      content: data.content,
      published: data.published ?? false,
      sortOrder: data.sortOrder ?? 0,
      navLocation: data.navLocation ?? "header",
      parentId: data.parentId ?? null,
      metaTitle: data.metaTitle ?? null,
      metaDescription: data.metaDescription ?? null,
      imageUrl: data.imageUrl || null,
      template: data.template ?? "default",
      createdById: createdById || null,
    },
  });

  logActivity({
    action: "create",
    entityType: "page",
    entityId: page.id,
    entityName: page.title,
    userId: createdById,
  }).catch(() => {});

  return page;
}

export async function updatePage(id: string, input: PageUpdateInput) {
  const data = pageUpdateSchema.parse(input);
  const updateData: Record<string, unknown> = {};

  if (data.title !== undefined) {
    updateData.title = data.title;
    if (!data.slug) {
      updateData.slug = generateSlug(data.title);
    }
  }
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.published !== undefined) updateData.published = data.published;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.navLocation !== undefined) updateData.navLocation = data.navLocation;
  if (data.parentId !== undefined) updateData.parentId = data.parentId;
  if (data.metaTitle !== undefined) updateData.metaTitle = data.metaTitle || null;
  if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription || null;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null;
  if (data.template !== undefined) updateData.template = data.template;

  const page = await prisma.page.update({ where: { id }, data: updateData });

  logActivity({
    action: "update",
    entityType: "page",
    entityId: page.id,
    entityName: page.title,
  }).catch(() => {});

  return page;
}

export async function deletePage(id: string) {
  // Orphan children before deleting
  await prisma.page.updateMany({
    where: { parentId: id },
    data: { parentId: null },
  });

  const page = await prisma.page.delete({ where: { id } });

  logActivity({
    action: "delete",
    entityType: "page",
    entityId: id,
    entityName: page.title,
  }).catch(() => {});

  return page;
}

export async function getPageBySlug(slug: string) {
  return prisma.page.findUnique({
    where: { slug },
    include: {
      parent: {
        include: {
          children: {
            where: { published: true },
            orderBy: { sortOrder: "asc" },
            select: { id: true, title: true, slug: true },
          },
        },
      },
      children: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function getPage(id: string) {
  return prisma.page.findUnique({
    where: { id },
    include: {
      parent: {
        include: {
          children: {
            where: { published: true },
            orderBy: { sortOrder: "asc" },
            select: { id: true, title: true, slug: true },
          },
        },
      },
      children: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function listPages() {
  return prisma.page.findMany({
    orderBy: { sortOrder: "asc" },
    include: { parent: true },
  });
}

export async function listPublishedPages() {
  return prisma.page.findMany({
    where: { published: true, parentId: null },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, slug: true, navLocation: true },
  });
}

export async function listPublishedPagesByLocation(
  location: "header" | "footer"
) {
  return prisma.page.findMany({
    where: {
      published: true,
      parentId: null,
      navLocation: { in: [location, "both"] },
    },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, slug: true },
  });
}

// Bulk actions

export async function bulkUpdatePages(
  ids: string[],
  update: { published?: boolean }
) {
  const { bulkPageUpdateSchema } = await import("@/lib/schemas/bulk");
  const validated = bulkPageUpdateSchema.parse({ ids, update });

  const result = await prisma.page.updateMany({
    where: { id: { in: validated.ids } },
    data: validated.update,
  });

  const pages = await prisma.page.findMany({
    where: { id: { in: validated.ids } },
    select: { id: true, title: true },
  });

  for (const page of pages) {
    logActivity({
      action: "update",
      entityType: "page",
      entityId: page.id,
      entityName: page.title,
      details: { bulk: true, ...validated.update },
    }).catch(() => {});
  }

  return { success: result.count, errors: [] as string[] };
}

export async function bulkDeletePages(ids: string[]) {
  const { bulkIdsSchema } = await import("@/lib/schemas/bulk");
  const validatedIds = bulkIdsSchema.parse(ids);

  // Orphan children first
  await prisma.page.updateMany({
    where: { parentId: { in: validatedIds } },
    data: { parentId: null },
  });

  const pages = await prisma.page.findMany({
    where: { id: { in: validatedIds } },
    select: { id: true, title: true },
  });

  const result = await prisma.page.deleteMany({
    where: { id: { in: validatedIds } },
  });

  for (const page of pages) {
    logActivity({
      action: "delete",
      entityType: "page",
      entityId: page.id,
      entityName: page.title,
      details: { bulk: true },
    }).catch(() => {});
  }

  return { success: result.count, errors: [] as string[] };
}

export async function reorderPages(id: string, direction: "up" | "down") {
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) throw new Error("Page not found");

  // Find adjacent sibling with same parent
  const sibling = await prisma.page.findFirst({
    where: {
      parentId: page.parentId,
      sortOrder: direction === "up"
        ? { lt: page.sortOrder }
        : { gt: page.sortOrder },
    },
    orderBy: {
      sortOrder: direction === "up" ? "desc" : "asc",
    },
  });

  if (!sibling) return page; // Already at boundary

  // Swap sortOrder values
  await prisma.$transaction([
    prisma.page.update({
      where: { id: page.id },
      data: { sortOrder: sibling.sortOrder },
    }),
    prisma.page.update({
      where: { id: sibling.id },
      data: { sortOrder: page.sortOrder },
    }),
  ]);

  return prisma.page.findUnique({ where: { id } });
}
