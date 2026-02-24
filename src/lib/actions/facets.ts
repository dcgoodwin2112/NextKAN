"use server";

import { prisma } from "@/lib/db";

export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

export interface FacetGroup {
  name: string;
  key: string;
  values: FacetValue[];
}

export async function getFacetCounts(): Promise<FacetGroup[]> {
  const [orgs, keywords, themes, formats, accessLevels] = await Promise.all([
    // Organizations with published dataset counts
    prisma.organization.findMany({
      include: {
        _count: {
          select: { datasets: { where: { status: "published" } } },
        },
      },
      orderBy: { name: "asc" },
    }),

    // Keywords grouped by keyword with count of distinct published datasets
    prisma.datasetKeyword.groupBy({
      by: ["keyword"],
      _count: { datasetId: true },
      where: { dataset: { status: "published" } },
      orderBy: { _count: { datasetId: "desc" } },
      take: 20,
    }),

    // Themes with published dataset counts
    prisma.theme.findMany({
      include: {
        _count: {
          select: {
            datasets: { where: { dataset: { status: "published" } } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),

    // Formats from distributions of published datasets
    prisma.distribution.groupBy({
      by: ["format"],
      _count: { datasetId: true },
      where: {
        format: { not: null },
        dataset: { status: "published" },
      },
      orderBy: { _count: { datasetId: "desc" } },
    }),

    // Access levels
    prisma.dataset.groupBy({
      by: ["accessLevel"],
      _count: { id: true },
      where: { status: "published" },
    }),
  ]);

  const facets: FacetGroup[] = [];

  const orgValues = orgs
    .filter((o) => o._count.datasets > 0)
    .map((o) => ({ value: o.id, label: o.name, count: o._count.datasets }));
  if (orgValues.length > 0) {
    facets.push({ name: "Organization", key: "org", values: orgValues });
  }

  const themeValues = themes
    .filter((t) => t._count.datasets > 0)
    .map((t) => ({ value: t.slug, label: t.name, count: t._count.datasets }));
  if (themeValues.length > 0) {
    facets.push({ name: "Theme", key: "theme", values: themeValues });
  }

  const keywordValues = keywords.map((k) => ({
    value: k.keyword,
    label: k.keyword,
    count: k._count.datasetId,
  }));
  if (keywordValues.length > 0) {
    facets.push({ name: "Keyword", key: "keyword", values: keywordValues });
  }

  const formatValues = formats
    .filter((f) => f.format)
    .map((f) => ({
      value: f.format!,
      label: f.format!,
      count: f._count.datasetId,
    }));
  if (formatValues.length > 0) {
    facets.push({ name: "Format", key: "format", values: formatValues });
  }

  const accessValues = accessLevels.map((a) => ({
    value: a.accessLevel,
    label: a.accessLevel,
    count: a._count.id,
  }));
  if (accessValues.length > 0) {
    facets.push({ name: "Access Level", key: "accessLevel", values: accessValues });
  }

  return facets;
}
