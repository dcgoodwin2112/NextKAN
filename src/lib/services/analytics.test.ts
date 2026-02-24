import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", async () => ({
  prisma: (await import("@/__mocks__/prisma")).default,
}));

import { prismaMock } from "@/__mocks__/prisma";
import { trackEvent, getAnalyticsSummary, getDatasetAnalytics } from "./analytics";

describe("trackEvent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates an AnalyticsEvent record", async () => {
    prismaMock.analyticsEvent.create.mockResolvedValue({} as any);

    await trackEvent({
      eventType: "page_view",
      entityType: "dataset",
      entityId: "a1b2c3d4-e5f6-1234-a567-123456789abc",
      ipHash: "abc123",
    });

    expect(prismaMock.analyticsEvent.create).toHaveBeenCalledWith({
      data: {
        eventType: "page_view",
        entityType: "dataset",
        entityId: "a1b2c3d4-e5f6-1234-a567-123456789abc",
        metadata: null,
        ipHash: "abc123",
      },
    });
  });

  it("serializes metadata as JSON", async () => {
    prismaMock.analyticsEvent.create.mockResolvedValue({} as any);

    await trackEvent({
      eventType: "search",
      metadata: { query: "parks" },
    });

    expect(prismaMock.analyticsEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: JSON.stringify({ query: "parks" }),
      }),
    });
  });

  it("does not throw on database error", async () => {
    prismaMock.analyticsEvent.create.mockRejectedValue(new Error("DB error"));

    await expect(
      trackEvent({ eventType: "page_view" })
    ).resolves.toBeUndefined();
  });
});

describe("getAnalyticsSummary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const startDate = new Date("2026-01-01");
  const endDate = new Date("2026-01-31");

  it("aggregates counts by event type", async () => {
    const events = [
      { id: "1", eventType: "page_view", entityType: null, entityId: null, metadata: null, ipHash: "h1", createdAt: new Date("2026-01-10") },
      { id: "2", eventType: "page_view", entityType: null, entityId: null, metadata: null, ipHash: "h2", createdAt: new Date("2026-01-10") },
      { id: "3", eventType: "download", entityType: null, entityId: null, metadata: null, ipHash: "h1", createdAt: new Date("2026-01-10") },
      { id: "4", eventType: "api_call", entityType: null, entityId: null, metadata: null, ipHash: "h3", createdAt: new Date("2026-01-11") },
      { id: "5", eventType: "search", entityType: null, entityId: null, metadata: JSON.stringify({ query: "parks" }), ipHash: "h1", createdAt: new Date("2026-01-11") },
    ];

    prismaMock.analyticsEvent.findMany.mockResolvedValue(events as any);
    prismaMock.dataset.findMany.mockResolvedValue([]);

    const summary = await getAnalyticsSummary(startDate, endDate);

    expect(summary.totalViews).toBe(2);
    expect(summary.totalDownloads).toBe(1);
    expect(summary.totalApiCalls).toBe(1);
    expect(summary.totalSearches).toBe(1);
    expect(summary.uniqueVisitors).toBe(3);
  });

  it("calculates daily trends", async () => {
    const events = [
      { id: "1", eventType: "page_view", entityType: null, entityId: null, metadata: null, ipHash: null, createdAt: new Date("2026-01-10T12:00:00Z") },
      { id: "2", eventType: "download", entityType: null, entityId: null, metadata: null, ipHash: null, createdAt: new Date("2026-01-10T14:00:00Z") },
      { id: "3", eventType: "page_view", entityType: null, entityId: null, metadata: null, ipHash: null, createdAt: new Date("2026-01-11T10:00:00Z") },
    ];

    prismaMock.analyticsEvent.findMany.mockResolvedValue(events as any);
    prismaMock.dataset.findMany.mockResolvedValue([]);

    const summary = await getAnalyticsSummary(startDate, endDate);

    expect(summary.dailyTrend).toEqual([
      { date: "2026-01-10", views: 1, downloads: 1 },
      { date: "2026-01-11", views: 1, downloads: 0 },
    ]);
  });

  it("builds top datasets with titles", async () => {
    const dsId = "a1b2c3d4-e5f6-1234-a567-123456789abc";
    const events = [
      { id: "1", eventType: "page_view", entityType: "dataset", entityId: dsId, metadata: null, ipHash: null, createdAt: new Date("2026-01-10") },
      { id: "2", eventType: "page_view", entityType: "dataset", entityId: dsId, metadata: null, ipHash: null, createdAt: new Date("2026-01-10") },
      { id: "3", eventType: "download", entityType: "dataset", entityId: dsId, metadata: null, ipHash: null, createdAt: new Date("2026-01-11") },
    ];

    prismaMock.analyticsEvent.findMany.mockResolvedValue(events as any);
    prismaMock.dataset.findMany.mockResolvedValue([
      { id: dsId, title: "Parks Data" },
    ] as any);

    const summary = await getAnalyticsSummary(startDate, endDate);

    expect(summary.topDatasets).toEqual([
      { entityId: dsId, title: "Parks Data", views: 2, downloads: 1 },
    ]);
  });

  it("builds top search terms from metadata", async () => {
    const events = [
      { id: "1", eventType: "search", entityType: null, entityId: null, metadata: JSON.stringify({ query: "parks" }), ipHash: null, createdAt: new Date("2026-01-10") },
      { id: "2", eventType: "search", entityType: null, entityId: null, metadata: JSON.stringify({ query: "parks" }), ipHash: null, createdAt: new Date("2026-01-10") },
      { id: "3", eventType: "search", entityType: null, entityId: null, metadata: JSON.stringify({ query: "budget" }), ipHash: null, createdAt: new Date("2026-01-11") },
    ];

    prismaMock.analyticsEvent.findMany.mockResolvedValue(events as any);
    prismaMock.dataset.findMany.mockResolvedValue([]);

    const summary = await getAnalyticsSummary(startDate, endDate);

    expect(summary.topSearchTerms).toEqual([
      { term: "parks", count: 2 },
      { term: "budget", count: 1 },
    ]);
  });

  it("returns zeros when no events exist", async () => {
    prismaMock.analyticsEvent.findMany.mockResolvedValue([]);

    const summary = await getAnalyticsSummary(startDate, endDate);

    expect(summary.totalViews).toBe(0);
    expect(summary.totalDownloads).toBe(0);
    expect(summary.totalApiCalls).toBe(0);
    expect(summary.totalSearches).toBe(0);
    expect(summary.uniqueVisitors).toBe(0);
    expect(summary.dailyTrend).toEqual([]);
    expect(summary.topDatasets).toEqual([]);
    expect(summary.topSearchTerms).toEqual([]);
  });
});

describe("getDatasetAnalytics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const dsId = "a1b2c3d4-e5f6-1234-a567-123456789abc";
  const startDate = new Date("2026-01-01");
  const endDate = new Date("2026-01-31");

  it("returns per-dataset metrics", async () => {
    const events = [
      { id: "1", eventType: "page_view", entityType: "dataset", entityId: dsId, metadata: null, ipHash: null, createdAt: new Date("2026-01-10T10:00:00Z") },
      { id: "2", eventType: "page_view", entityType: "dataset", entityId: dsId, metadata: null, ipHash: null, createdAt: new Date("2026-01-10T12:00:00Z") },
      { id: "3", eventType: "download", entityType: "dataset", entityId: dsId, metadata: null, ipHash: null, createdAt: new Date("2026-01-11T08:00:00Z") },
    ];

    prismaMock.analyticsEvent.findMany.mockResolvedValue(events as any);

    const analytics = await getDatasetAnalytics(dsId, startDate, endDate);

    expect(analytics.views).toBe(2);
    expect(analytics.downloads).toBe(1);
    expect(analytics.dailyTrend).toEqual([
      { date: "2026-01-10", views: 2, downloads: 0 },
      { date: "2026-01-11", views: 0, downloads: 1 },
    ]);
  });

  it("returns zeros for dataset with no events", async () => {
    prismaMock.analyticsEvent.findMany.mockResolvedValue([]);

    const analytics = await getDatasetAnalytics(dsId, startDate, endDate);

    expect(analytics.views).toBe(0);
    expect(analytics.downloads).toBe(0);
    expect(analytics.dailyTrend).toEqual([]);
  });
});
