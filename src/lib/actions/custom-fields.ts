"use server";

import { prisma } from "@/lib/db";
import {
  customFieldDefinitionCreateSchema,
  customFieldDefinitionUpdateSchema,
  type CustomFieldDefinitionCreateInput,
  type CustomFieldDefinitionUpdateInput,
} from "@/lib/schemas/custom-field";
import { logActivity } from "@/lib/services/activity";
import { silentCatch } from "@/lib/utils/log";

export async function createCustomFieldDefinition(input: CustomFieldDefinitionCreateInput) {
  const data = customFieldDefinitionCreateSchema.parse(input);

  const definition = await prisma.customFieldDefinition.create({
    data: {
      name: data.name,
      label: data.label,
      type: data.type,
      required: data.required ?? false,
      options: data.options ? JSON.stringify(data.options) : null,
      sortOrder: data.sortOrder ?? 0,
      organizationId: data.organizationId || null,
    },
  });

  silentCatch(logActivity({
    action: "custom_field:created",
    entityType: "custom_field",
    entityId: definition.id,
    entityName: definition.label,
  }), "activity");

  return definition;
}

export async function updateCustomFieldDefinition(id: string, input: CustomFieldDefinitionUpdateInput) {
  const data = customFieldDefinitionUpdateSchema.parse(input);
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.label !== undefined) updateData.label = data.label;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.required !== undefined) updateData.required = data.required;
  if (data.options !== undefined) updateData.options = data.options ? JSON.stringify(data.options) : null;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.organizationId !== undefined) updateData.organizationId = data.organizationId || null;

  const definition = await prisma.customFieldDefinition.update({
    where: { id },
    data: updateData,
  });

  silentCatch(logActivity({
    action: "custom_field:updated",
    entityType: "custom_field",
    entityId: definition.id,
    entityName: definition.label,
  }), "activity");

  return definition;
}

export async function deleteCustomFieldDefinition(id: string) {
  const definition = await prisma.customFieldDefinition.findUnique({ where: { id } });
  if (!definition) throw new Error("Custom field definition not found");

  await prisma.customFieldDefinition.delete({ where: { id } });

  silentCatch(logActivity({
    action: "custom_field:deleted",
    entityType: "custom_field",
    entityId: id,
    entityName: definition.label,
  }), "activity");
}

export async function getCustomFieldDefinition(id: string) {
  return prisma.customFieldDefinition.findUnique({ where: { id } });
}

/** Returns global definitions + definitions scoped to the given org. */
export async function listCustomFieldDefinitions(organizationId?: string) {
  const where = organizationId
    ? { OR: [{ organizationId: null }, { organizationId }] }
    : {};

  return prisma.customFieldDefinition.findMany({
    where,
    include: { _count: { select: { values: true } } },
    orderBy: { sortOrder: "asc" },
  });
}

/** Returns custom field values for a dataset as a Record keyed by definition name. */
export async function getCustomFieldsForDataset(datasetId: string): Promise<Record<string, string>> {
  const values = await prisma.datasetCustomFieldValue.findMany({
    where: { datasetId },
    include: { definition: true },
  });

  const result: Record<string, string> = {};
  for (const v of values) {
    result[v.definition.name] = v.value;
  }
  return result;
}
