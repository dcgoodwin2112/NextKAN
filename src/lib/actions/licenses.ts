"use server";

import { prisma } from "@/lib/db";
import {
  licenseCreateSchema,
  licenseUpdateSchema,
  type LicenseCreateInput,
  type LicenseUpdateInput,
} from "@/lib/schemas/license";
import { logActivity } from "@/lib/services/activity";
import { silentCatch } from "@/lib/utils/log";

export async function createLicense(input: LicenseCreateInput) {
  const data = licenseCreateSchema.parse(input);

  const license = await prisma.license.create({
    data: {
      name: data.name,
      url: data.url || null,
      description: data.description || null,
      isDefault: data.isDefault ?? false,
      sortOrder: data.sortOrder ?? 0,
    },
  });

  // If this license is default, unset other defaults
  if (license.isDefault) {
    await prisma.license.updateMany({
      where: { id: { not: license.id }, isDefault: true },
      data: { isDefault: false },
    });
  }

  silentCatch(
    logActivity({
      action: "create",
      entityType: "license",
      entityId: license.id,
      entityName: license.name,
    }),
    "activity"
  );

  return license;
}

export async function updateLicense(id: string, input: LicenseUpdateInput) {
  const data = licenseUpdateSchema.parse(input);
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.url !== undefined) updateData.url = data.url || null;
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

  const license = await prisma.license.update({
    where: { id },
    data: updateData,
  });

  // If this license is now default, unset other defaults
  if (data.isDefault === true) {
    await prisma.license.updateMany({
      where: { id: { not: license.id }, isDefault: true },
      data: { isDefault: false },
    });
  }

  silentCatch(
    logActivity({
      action: "update",
      entityType: "license",
      entityId: license.id,
      entityName: license.name,
    }),
    "activity"
  );

  return license;
}

export async function deleteLicense(id: string) {
  const license = await prisma.license.delete({ where: { id } });

  silentCatch(
    logActivity({
      action: "delete",
      entityType: "license",
      entityId: id,
      entityName: license.name,
    }),
    "activity"
  );

  return license;
}

export async function getLicense(id: string) {
  return prisma.license.findUnique({ where: { id } });
}

export async function listLicenses() {
  return prisma.license.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
