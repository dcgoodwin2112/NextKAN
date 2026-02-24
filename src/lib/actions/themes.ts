"use server";

import { prisma } from "@/lib/db";
import { themeCreateSchema, themeUpdateSchema, type ThemeCreateInput, type ThemeUpdateInput } from "@/lib/schemas/theme";
import { generateSlug } from "@/lib/utils/slug";

export async function listThemes() {
  return prisma.theme.findMany({
    include: { _count: { select: { datasets: true } } },
    orderBy: { name: "asc" },
  });
}

export async function getTheme(id: string) {
  return prisma.theme.findUnique({ where: { id } });
}

export async function getThemeBySlug(slug: string) {
  return prisma.theme.findUnique({
    where: { slug },
    include: { _count: { select: { datasets: true } } },
  });
}

export async function createTheme(input: ThemeCreateInput) {
  const data = themeCreateSchema.parse(input);
  const slug = generateSlug(data.name);

  return prisma.theme.create({
    data: {
      name: data.name,
      slug,
      description: data.description || null,
      color: data.color || null,
    },
  });
}

export async function updateTheme(id: string, input: ThemeUpdateInput) {
  const data = themeUpdateSchema.parse(input);
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = generateSlug(data.name);
  }
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.color !== undefined) updateData.color = data.color || null;

  return prisma.theme.update({ where: { id }, data: updateData });
}

export async function deleteTheme(id: string) {
  await prisma.theme.delete({ where: { id } });
}
