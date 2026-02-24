import { prisma } from "@/lib/db";

export interface AnalyticsSummary {
  totalViews: number;
  totalDownloads: number;
  totalApiCalls: number;
  totalSearches: number;
  uniqueVisitors: number;
  dailyTrend: { date: string; views: number; downloads: number }[];
  topDatasets: {
    entityId: string;
    title: string;
    views: number;
    downloads: number;
  }[];
  topSearchTerms: { term: string; count: number }[];
}

export interface DatasetAnalytics {
  views: number;
  downloads: number;
  dailyTrend: { date: string; views: number; downloads: number }[];
}

/** Records an analytics event. Fire-and-forget — never throws. */
export async function trackEvent(params: {
  eventType: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string;
}): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType: params.eventType,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        ipHash: params.ipHash || null,
      },
    });
  } catch {
    // Fire-and-forget: never throw
  }
}

/** Aggregates analytics across all events in the given date range. */
export async function getAnalyticsSummary(
  startDate: Date,
  endDate: Date
): Promise<AnalyticsSummary> {
  const events = await prisma.analyticsEvent.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
  });

  let totalViews = 0;
  let totalDownloads = 0;
  let totalApiCalls = 0;
  let totalSearches = 0;
  const ipHashes = new Set<string>();

  const dailyMap = new Map<string, { views: number; downloads: number }>();
  const datasetMap = new Map<
    string,
    { views: number; downloads: number }
  >();
  const searchTermMap = new Map<string, number>();

  for (const event of events) {
    // Count by type
    switch (event.eventType) {
      case "page_view":
        totalViews++;
        break;
      case "download":
        totalDownloads++;
        break;
      case "api_call":
        totalApiCalls++;
        break;
      case "search":
        totalSearches++;
        break;
    }

    // Unique visitors
    if (event.ipHash) {
      ipHashes.add(event.ipHash);
    }

    // Daily trend
    const dateStr = event.createdAt.toISOString().split("T")[0];
    const dayEntry = dailyMap.get(dateStr) || { views: 0, downloads: 0 };
    if (event.eventType === "page_view") dayEntry.views++;
    if (event.eventType === "download") dayEntry.downloads++;
    dailyMap.set(dateStr, dayEntry);

    // Top datasets
    if (event.entityType === "dataset" && event.entityId) {
      const dsEntry = datasetMap.get(event.entityId) || {
        views: 0,
        downloads: 0,
      };
      if (event.eventType === "page_view") dsEntry.views++;
      if (event.eventType === "download") dsEntry.downloads++;
      datasetMap.set(event.entityId, dsEntry);
    }

    // Search terms
    if (event.eventType === "search" && event.metadata) {
      try {
        const meta =
          typeof event.metadata === "string"
            ? JSON.parse(event.metadata)
            : event.metadata;
        if (meta.query) {
          const term = String(meta.query);
          searchTermMap.set(term, (searchTermMap.get(term) || 0) + 1);
        }
      } catch {
        // Skip malformed metadata
      }
    }
  }

  // Build daily trend sorted by date
  const dailyTrend = Array.from(dailyMap.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Build top datasets (top 10 by views + downloads)
  const datasetEntries = Array.from(datasetMap.entries())
    .map(([entityId, counts]) => ({ entityId, ...counts }))
    .sort((a, b) => b.views + b.downloads - (a.views + a.downloads))
    .slice(0, 10);

  // Look up dataset titles
  const datasetIds = datasetEntries.map((d) => d.entityId);
  const datasets =
    datasetIds.length > 0
      ? await prisma.dataset.findMany({
          where: { id: { in: datasetIds } },
          select: { id: true, title: true },
        })
      : [];
  const titleMap = new Map(datasets.map((d) => [d.id, d.title]));

  const topDatasets = datasetEntries.map((d) => ({
    entityId: d.entityId,
    title: titleMap.get(d.entityId) || "Unknown",
    views: d.views,
    downloads: d.downloads,
  }));

  // Build top search terms (top 10)
  const topSearchTerms = Array.from(searchTermMap.entries())
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalViews,
    totalDownloads,
    totalApiCalls,
    totalSearches,
    uniqueVisitors: ipHashes.size,
    dailyTrend,
    topDatasets,
    topSearchTerms,
  };
}

/** Returns analytics for a specific dataset in the given date range. */
export async function getDatasetAnalytics(
  datasetId: string,
  startDate: Date,
  endDate: Date
): Promise<DatasetAnalytics> {
  const events = await prisma.analyticsEvent.findMany({
    where: {
      entityId: datasetId,
      createdAt: { gte: startDate, lte: endDate },
    },
  });

  let views = 0;
  let downloads = 0;
  const dailyMap = new Map<string, { views: number; downloads: number }>();

  for (const event of events) {
    if (event.eventType === "page_view") views++;
    if (event.eventType === "download") downloads++;

    const dateStr = event.createdAt.toISOString().split("T")[0];
    const dayEntry = dailyMap.get(dateStr) || { views: 0, downloads: 0 };
    if (event.eventType === "page_view") dayEntry.views++;
    if (event.eventType === "download") dayEntry.downloads++;
    dailyMap.set(dateStr, dayEntry);
  }

  const dailyTrend = Array.from(dailyMap.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { views, downloads, dailyTrend };
}
