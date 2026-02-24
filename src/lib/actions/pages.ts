"use server";

import { prisma } from "@/lib/db";
import {
  pageCreateSchema,
  pageUpdateSchema,
  type PageCreateInput,
  type PageUpdateInput,
} from "@/lib/schemas/page";
import { generateSlug } from "@/lib/utils/slug";

export async function createPage(
  input: PageCreateInput,
  createdById?: string
) {
  const data = pageCreateSchema.parse(input);
  const slug = data.slug || generateSlug(data.title);

  return prisma.page.create({
    data: {
      title: data.title,
      slug,
      content: data.content,
      published: data.published ?? false,
      sortOrder: data.sortOrder ?? 0,
      createdById: createdById || null,
    },
  });
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

  return prisma.page.update({ where: { id }, data: updateData });
}

export async function deletePage(id: string) {
  return prisma.page.delete({ where: { id } });
}

export async function getPageBySlug(slug: string) {
  return prisma.page.findUnique({ where: { slug } });
}

export async function getPage(id: string) {
  return prisma.page.findUnique({ where: { id } });
}

export async function listPages() {
  return prisma.page.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function listPublishedPages() {
  return prisma.page.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, slug: true },
  });
}
