import { prisma } from "@/lib/db";
import { calculateQualityScore } from "@/lib/services/data-quality";
import type { DatasetWithRelations } from "@/lib/schemas/dcat-us";

const datasetIncludes = {
  publisher: { include: { parent: true } },
  distributions: true,
  keywords: true,
  themes: { include: { theme: true } },
} as const;

export interface OrgDashboardData {
  organization: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    createdAt: Date;
  };
  members: { id: string; name: string | null; email: string; role: string }[];
  datasetCounts: { draft: number; published: number; archived: number; total: number };
  topDatasets: { id: string; title: string; status: string; qualityScore: number; modified: Date }[];
  avgQualityScore: number;
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    entityName: string;
    userId: string | null;
    userName: string | null;
    details: string | null;
    createdAt: Date;
  }[];
}

export async function getOrgDashboardData(orgId: string): Promise<OrgDashboardData | null> {
  const [org, members, datasets] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, slug: true, description: true, imageUrl: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.dataset.findMany({
      where: { publisherId: orgId, deletedAt: null },
      include: datasetIncludes,
    }) as Promise<unknown> as Promise<DatasetWithRelations[]>,
  ]);

  if (!org) return null;

  // Count by status
  const datasetCounts = { draft: 0, published: 0, archived: 0, total: datasets.length };
  for (const d of datasets) {
    if (d.status === "draft") datasetCounts.draft++;
    else if (d.status === "published") datasetCounts.published++;
    else if (d.status === "archived") datasetCounts.archived++;
  }

  // Quality scores for published datasets
  const scored: { id: string; title: string; status: string; qualityScore: number; modified: Date }[] = [];
  let qualitySum = 0;
  let qualityCount = 0;
  for (const d of datasets) {
    const score = calculateQualityScore(d).overall;
    scored.push({ id: d.id, title: d.title, status: d.status, qualityScore: score, modified: d.modified });
    if (d.status === "published") {
      qualitySum += score;
      qualityCount++;
    }
  }

  const avgQualityScore = qualityCount > 0 ? Math.round(qualitySum / qualityCount) : 0;

  // Top 10 datasets sorted by quality descending
  const topDatasets = scored
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, 10);

  // Activity: org events + dataset events
  const datasetIds = datasets.map((d) => d.id);
  const activityWhere =
    datasetIds.length > 0
      ? {
          OR: [
            { entityType: "dataset", entityId: { in: datasetIds } },
            { entityType: "organization", entityId: orgId },
          ],
        }
      : { entityType: "organization", entityId: orgId };

  const recentActivity = await prisma.activityLog.findMany({
    where: activityWhere,
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return {
    organization: org,
    members,
    datasetCounts,
    topDatasets,
    avgQualityScore,
    recentActivity,
  };
}
