"use server";

import { prisma } from "@/lib/db";

export interface CatalogStats {
  datasets: number;
  organizations: number;
  distributions: number;
  formats: number;
}

export async function getCatalogStats(): Promise<CatalogStats> {
  const publishedFilter = { status: "published", deletedAt: null };

  const [datasets, organizations, distributions, formatGroups] =
    await Promise.all([
      prisma.dataset.count({ where: publishedFilter }),
      prisma.organization.count(),
      prisma.distribution.count({
        where: { dataset: publishedFilter },
      }),
      prisma.distribution.groupBy({
        by: ["format"],
        where: {
          format: { not: null },
          dataset: publishedFilter,
        },
      }),
    ]);

  return {
    datasets,
    organizations,
    distributions,
    formats: formatGroups.length,
  };
}
