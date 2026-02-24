import { prisma } from "@/lib/db";
import type { DatastoreColumn } from "@/lib/schemas/datastore";
import type { DataDictionaryFieldInput } from "@/lib/schemas/data-dictionary";

const datastoreTypeToDictType: Record<string, string> = {
  TEXT: "string",
  INTEGER: "integer",
  REAL: "number",
  BOOLEAN: "boolean",
};

/** Auto-generate a data dictionary from datastore column info. */
export async function autoGenerateFromDatastore(
  distributionId: string,
  columns: DatastoreColumn[]
): Promise<void> {
  // Remove existing dictionary if any
  const existing = await prisma.dataDictionary.findUnique({
    where: { distributionId },
  });
  if (existing) {
    await prisma.dataDictionary.delete({ where: { id: existing.id } });
  }

  await prisma.dataDictionary.create({
    data: {
      distributionId,
      fields: {
        create: columns.map((col, index) => ({
          name: col.name,
          type: datastoreTypeToDictType[col.type] || "string",
          sortOrder: index,
        })),
      },
    },
  });
}

/** Get data dictionary for a distribution. */
export async function getDataDictionary(distributionId: string) {
  return prisma.dataDictionary.findUnique({
    where: { distributionId },
    include: { fields: { orderBy: { sortOrder: "asc" } } },
  });
}

/** Update data dictionary fields. */
export async function updateDataDictionary(
  distributionId: string,
  fields: DataDictionaryFieldInput[]
): Promise<void> {
  let dictionary = await prisma.dataDictionary.findUnique({
    where: { distributionId },
  });

  if (!dictionary) {
    dictionary = await prisma.dataDictionary.create({
      data: { distributionId },
    });
  }

  // Delete all existing fields and recreate
  await prisma.dataDictionaryField.deleteMany({
    where: { dictionaryId: dictionary.id },
  });

  await prisma.dataDictionaryField.createMany({
    data: fields.map((f, index) => ({
      dictionaryId: dictionary.id,
      name: f.name,
      title: f.title || null,
      type: f.type,
      description: f.description || null,
      format: f.format || null,
      constraints: f.constraints || null,
      sortOrder: f.sortOrder ?? index,
    })),
  });
}

/** Export as Frictionless Table Schema. */
export async function exportFrictionless(distributionId: string) {
  const dictionary = await getDataDictionary(distributionId);
  if (!dictionary) return null;

  return {
    fields: dictionary.fields.map((f) => ({
      name: f.name,
      type: f.type,
      ...(f.title && { title: f.title }),
      ...(f.description && { description: f.description }),
      ...(f.format && { format: f.format }),
      ...(f.constraints &&
        (() => {
          try {
            return { constraints: JSON.parse(f.constraints) };
          } catch {
            return {};
          }
        })()),
    })),
  };
}
