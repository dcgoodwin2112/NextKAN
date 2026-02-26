"use server";

import { prisma } from "@/lib/db";
import {
  templateCreateSchema,
  templateUpdateSchema,
  type TemplateCreateInput,
  type TemplateUpdateInput,
  type TemplateFields,
} from "@/lib/schemas/template";
import { logActivity } from "@/lib/services/activity";

export async function createTemplate(
  input: TemplateCreateInput,
  createdById?: string
) {
  const data = templateCreateSchema.parse(input);

  const template = await prisma.datasetTemplate.create({
    data: {
      name: data.name,
      description: data.description || null,
      organizationId: data.organizationId || null,
      fields: JSON.stringify(data.fields),
      createdById: createdById || null,
    },
  });

  logActivity({
    action: "create",
    entityType: "template",
    entityId: template.id,
    entityName: template.name,
    userId: createdById,
  }).catch(() => {});

  return template;
}

export async function updateTemplate(id: string, input: TemplateUpdateInput) {
  const data = templateUpdateSchema.parse(input);
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined)
    updateData.description = data.description || null;
  if (data.organizationId !== undefined)
    updateData.organizationId = data.organizationId || null;
  if (data.fields !== undefined) updateData.fields = JSON.stringify(data.fields);

  const template = await prisma.datasetTemplate.update({
    where: { id },
    data: updateData,
  });

  logActivity({
    action: "update",
    entityType: "template",
    entityId: template.id,
    entityName: template.name,
  }).catch(() => {});

  return template;
}

export async function deleteTemplate(id: string) {
  const template = await prisma.datasetTemplate.delete({ where: { id } });

  logActivity({
    action: "delete",
    entityType: "template",
    entityId: id,
    entityName: template.name,
  }).catch(() => {});

  return template;
}

export async function getTemplate(id: string) {
  const template = await prisma.datasetTemplate.findUnique({
    where: { id },
    include: { organization: true },
  });
  if (!template) return null;

  return {
    ...template,
    fields: JSON.parse(template.fields) as TemplateFields,
  };
}

export async function listTemplates() {
  const templates = await prisma.datasetTemplate.findMany({
    orderBy: { name: "asc" },
    include: { organization: true },
  });

  return templates.map((t) => ({
    ...t,
    fields: JSON.parse(t.fields) as TemplateFields,
  }));
}

export async function listAvailableTemplates(userOrgId?: string | null) {
  const where = userOrgId
    ? {
        OR: [{ organizationId: null }, { organizationId: userOrgId }],
      }
    : { organizationId: null };

  const templates = await prisma.datasetTemplate.findMany({
    where,
    orderBy: { name: "asc" },
    include: { organization: true },
  });

  return templates.map((t) => ({
    ...t,
    fields: JSON.parse(t.fields) as TemplateFields,
  }));
}
