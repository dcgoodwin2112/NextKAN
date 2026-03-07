import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteConfig } from "@/lib/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const datasets = await prisma.dataset.findMany({
    where: { status: "published", deletedAt: null },
    select: { slug: true, modified: true },
  });

  const datasetEntries: MetadataRoute.Sitemap = datasets.map((d) => ({
    url: `${siteConfig.url}/datasets/${d.slug}`,
    lastModified: d.modified,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteConfig.url}/datasets`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...datasetEntries,
  ];
}
