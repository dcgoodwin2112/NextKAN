import { prisma } from "@/lib/db";
import { calculateQualityScore } from "@/lib/services/data-quality";
import { isWorkflowEnabled } from "@/lib/services/workflow";
import { isCommentsEnabled } from "@/lib/services/comments";
import type { DatasetWithRelations } from "@/lib/schemas/dcat-us";

const datasetIncludes = {
  publisher: { include: { parent: true } },
  distributions: true,
  keywords: true,
  themes: { include: { theme: true } },
} as const;

/** Maps accrualPeriodicity to day thresholds for staleness detection. */
const PERIODICITY_THRESHOLDS: Record<string, number> = {
  "R/P1D": 2,
  "R/P1W": 10,
  "R/P2W": 21,
  "R/P1M": 45,
  "R/P3M": 120,
  "R/P6M": 210,
  "R/P1Y": 400,
};

const DEFAULT_STALE_DAYS = 180;

// --- Types ---

export interface DashboardStats {
  publishedCount: number;
  publishedTrend: number;
  downloadsThisMonth: number;
  pendingReviewCount: number | null;
  avgQualityScore: number;
}

export interface ActionItems {
  pendingReview: { id: string; title: string; submittedAt: Date | null }[];
  pendingComments: { count: number; oldestId: string; oldestDate: Date } | null;
  failedHarvests: { sourceId: string; sourceName: string; errorMsg: string | null }[];
  lowestQuality: { id: string; title: string; score: number }[];
}

export interface CatalogHealth {
  staleDatasets: { id: string; title: string; daysSinceUpdate: number }[];
  noDistributions: { id: string; title: string }[];
  missingFields: { field: string; count: number }[];
  dictionaryCoverage: { total: number; withDictionary: number; percent: number };
  emptyOrgs: { id: string; name: string }[];
}

export interface TrendData {
  publishingRate: { month: string; count: number }[];
  viewsAndDownloads: { date: string; views: number; downloads: number }[];
  mostViewed: { id: string; title: string; views: number }[];
  mostDownloaded: { id: string; title: string; downloads: number }[];
}

export interface DashboardData {
  stats: DashboardStats;
  actionItems: ActionItems;
  catalogHealth: CatalogHealth;
  trends: TrendData;
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

// --- Internal helpers ---

function getStats(
  allDatasets: DatasetWithRelations[],
  qualityScores: Map<string, number>,
  workflowEnabled: boolean,
  now: Date
): Promise<DashboardStats> {
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const published = allDatasets.filter((d) => d.status === "published");
  const publishedCount = published.length;

  const current30d = published.filter(
    (d) => d.publishedAt && d.publishedAt >= thirtyDaysAgo
  ).length;
  const prior30d = published.filter(
    (d) => d.publishedAt && d.publishedAt >= sixtyDaysAgo && d.publishedAt < thirtyDaysAgo
  ).length;
  const publishedTrend = current30d - prior30d;

  return Promise.all([
    prisma.analyticsEvent.count({
      where: { eventType: "download", createdAt: { gte: startOfMonth } },
    }),
    workflowEnabled
      ? prisma.dataset.count({ where: { workflowStatus: "pending_review" } })
      : Promise.resolve(null),
  ]).then(([downloadsThisMonth, pendingReviewCount]) => {
    let avgQualityScore = 0;
    if (qualityScores.size > 0) {
      const sum = Array.from(qualityScores.values()).reduce((a, b) => a + b, 0);
      avgQualityScore = Math.round(sum / qualityScores.size);
    }

    return {
      publishedCount,
      publishedTrend,
      downloadsThisMonth,
      pendingReviewCount,
      avgQualityScore,
    };
  });
}

async function getActionItems(
  qualityScores: Map<string, number>,
  allDatasets: DatasetWithRelations[],
  workflowEnabled: boolean,
  commentsEnabled: boolean
): Promise<ActionItems> {
  const [pendingReviewRaw, pendingCommentsRaw, failedHarvestsRaw] = await Promise.all([
    workflowEnabled
      ? prisma.dataset.findMany({
          where: { workflowStatus: "pending_review" },
          select: { id: true, title: true, submittedAt: true },
          orderBy: { submittedAt: "asc" },
          take: 5,
        })
      : Promise.resolve([]),
    commentsEnabled
      ? prisma.comment.findMany({
          where: { approved: false },
          orderBy: { createdAt: "asc" },
          select: { id: true, createdAt: true },
        })
      : Promise.resolve(null),
    prisma.harvestJob.findMany({
      where: { status: "error" },
      include: { source: { select: { name: true } } },
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
  ]);

  // Deduplicate failed harvests by sourceId
  const seenSources = new Set<string>();
  const failedHarvests: ActionItems["failedHarvests"] = [];
  for (const job of failedHarvestsRaw) {
    if (!seenSources.has(job.sourceId)) {
      seenSources.add(job.sourceId);
      failedHarvests.push({
        sourceId: job.sourceId,
        sourceName: job.source.name,
        errorMsg: job.errors,
      });
      if (failedHarvests.length >= 5) break;
    }
  }

  // Bottom 5 quality datasets
  const sortedByQuality = allDatasets
    .filter((d) => qualityScores.has(d.id))
    .map((d) => ({ id: d.id, title: d.title, score: qualityScores.get(d.id)! }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  // Pending comments
  let pendingComments: ActionItems["pendingComments"] = null;
  if (pendingCommentsRaw && pendingCommentsRaw.length > 0) {
    pendingComments = {
      count: pendingCommentsRaw.length,
      oldestId: pendingCommentsRaw[0].id,
      oldestDate: pendingCommentsRaw[0].createdAt,
    };
  }

  return {
    pendingReview: pendingReviewRaw,
    pendingComments,
    failedHarvests,
    lowestQuality: sortedByQuality,
  };
}

async function getCatalogHealth(
  allDatasets: DatasetWithRelations[],
  now: Date
): Promise<CatalogHealth> {
  const published = allDatasets.filter((d) => d.status === "published");

  // Stale datasets
  const staleDatasets: CatalogHealth["staleDatasets"] = [];
  for (const d of published) {
    const threshold =
      (d.accrualPeriodicity && PERIODICITY_THRESHOLDS[d.accrualPeriodicity]) ||
      DEFAULT_STALE_DAYS;
    const daysSinceUpdate = Math.floor(
      (now.getTime() - new Date(d.modified).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceUpdate > threshold) {
      staleDatasets.push({ id: d.id, title: d.title, daysSinceUpdate });
    }
  }
  staleDatasets.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);

  // No distributions
  const noDistributions = published
    .filter((d) => d.distributions.length === 0)
    .map((d) => ({ id: d.id, title: d.title }));

  // Missing required-ish fields
  const fieldChecks: { field: string; check: (d: DatasetWithRelations) => boolean }[] = [
    { field: "contactEmail", check: (d) => !d.contactEmail },
    { field: "contactName", check: (d) => !d.contactName },
    { field: "license", check: (d) => !d.license },
    { field: "description", check: (d) => !d.description || d.description.length < 20 },
    { field: "keywords", check: (d) => d.keywords.length === 0 },
  ];
  const missingFields: CatalogHealth["missingFields"] = [];
  for (const { field, check } of fieldChecks) {
    const count = published.filter(check).length;
    if (count > 0) missingFields.push({ field, count });
  }
  missingFields.sort((a, b) => b.count - a.count);

  // Dictionary coverage
  const [dictionaryCount, distributionCount, emptyOrgsRaw] = await Promise.all([
    prisma.dataDictionary.count(),
    prisma.distribution.count(),
    prisma.organization.findMany({
      where: { datasets: { none: { status: "published" } } },
      select: { id: true, name: true },
    }),
  ]);

  const dictionaryCoverage = {
    total: distributionCount,
    withDictionary: dictionaryCount,
    percent: distributionCount > 0 ? Math.round((dictionaryCount / distributionCount) * 100) : 0,
  };

  return {
    staleDatasets,
    noDistributions,
    missingFields,
    dictionaryCoverage,
    emptyOrgs: emptyOrgsRaw,
  };
}

async function getTrends(
  allDatasets: DatasetWithRelations[],
  now: Date
): Promise<TrendData> {
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Publishing rate — group published datasets by month
  const published = allDatasets.filter((d) => d.status === "published" && d.publishedAt);
  const monthMap = new Map<string, number>();
  for (const d of published) {
    const month = d.publishedAt!.toISOString().slice(0, 7); // YYYY-MM
    monthMap.set(month, (monthMap.get(month) || 0) + 1);
  }
  const publishingRate = Array.from(monthMap.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Views and downloads — last 90 days
  const events = await prisma.analyticsEvent.findMany({
    where: {
      createdAt: { gte: ninetyDaysAgo },
      eventType: { in: ["page_view", "download"] },
    },
    select: { eventType: true, entityId: true, entityType: true, createdAt: true },
  });

  const dailyMap = new Map<string, { views: number; downloads: number }>();
  const viewMap = new Map<string, number>();
  const downloadMap = new Map<string, number>();

  for (const event of events) {
    const dateStr = event.createdAt.toISOString().split("T")[0];
    const entry = dailyMap.get(dateStr) || { views: 0, downloads: 0 };
    if (event.eventType === "page_view") entry.views++;
    if (event.eventType === "download") entry.downloads++;
    dailyMap.set(dateStr, entry);

    if (event.entityType === "dataset" && event.entityId) {
      if (event.eventType === "page_view") {
        viewMap.set(event.entityId, (viewMap.get(event.entityId) || 0) + 1);
      }
      if (event.eventType === "download") {
        downloadMap.set(event.entityId, (downloadMap.get(event.entityId) || 0) + 1);
      }
    }
  }

  const viewsAndDownloads = Array.from(dailyMap.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top 5 most viewed/downloaded — look up titles
  const topViewedIds = Array.from(viewMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const topDownloadedIds = Array.from(downloadMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const allIds = [
    ...topViewedIds.map(([id]) => id),
    ...topDownloadedIds.map(([id]) => id),
  ];
  const uniqueIds = [...new Set(allIds)];

  const titleLookup =
    uniqueIds.length > 0
      ? await prisma.dataset.findMany({
          where: { id: { in: uniqueIds } },
          select: { id: true, title: true },
        })
      : [];
  const titleMap = new Map(titleLookup.map((d) => [d.id, d.title]));

  const mostViewed = topViewedIds.map(([id, views]) => ({
    id,
    title: titleMap.get(id) || "Unknown",
    views,
  }));
  const mostDownloaded = topDownloadedIds.map(([id, downloads]) => ({
    id,
    title: titleMap.get(id) || "Unknown",
    downloads,
  }));

  return { publishingRate, viewsAndDownloads, mostViewed, mostDownloaded };
}

// --- Orchestrator ---

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const workflowEnabled = isWorkflowEnabled();
  const commentsEnabled = isCommentsEnabled();

  // Fetch all datasets once with full relations (reused for quality, health, trends)
  const allDatasets = (await prisma.dataset.findMany({
    include: datasetIncludes,
    orderBy: { title: "asc" },
  })) as unknown as DatasetWithRelations[];

  // Score all datasets once
  const qualityScores = new Map<string, number>();
  for (const d of allDatasets) {
    qualityScores.set(d.id, calculateQualityScore(d).overall);
  }

  const [stats, actionItems, catalogHealth, trends, recentActivity] = await Promise.all([
    getStats(allDatasets, qualityScores, workflowEnabled, now),
    getActionItems(qualityScores, allDatasets, workflowEnabled, commentsEnabled),
    getCatalogHealth(allDatasets, now),
    getTrends(allDatasets, now),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return { stats, actionItems, catalogHealth, trends, recentActivity };
}
