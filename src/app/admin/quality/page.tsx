import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { calculateQualityScore } from "@/lib/services/data-quality";
import { QualityBadge } from "@/components/datasets/QualityBadge";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { Pagination } from "@/components/ui/Pagination";
import { QualityFilterBar } from "@/components/admin/QualityFilterBar";
import { Database, BarChart3, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listOrganizations } from "@/lib/actions/organizations";
import type { DatasetWithRelations } from "@/lib/schemas/dcat-us";

const datasetIncludes = {
  publisher: { include: { parent: true } },
  distributions: true,
  keywords: true,
  themes: { include: { theme: true } },
} as const;

const scoreRanges: Record<string, [number, number]> = {
  poor: [0, 59],
  fair: [60, 69],
  good: [70, 89],
  excellent: [90, 100],
};

export default async function QualityReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const scoreFilter = params.score || undefined;
  const orgFilter = params.org || undefined;
  const sort = params.sort || undefined;
  const limit = 20;

  // Build Prisma where clause for search + org filter
  const where: Record<string, unknown> = {};

  if (search.trim()) {
    const terms = search.trim().split(/\s+/);
    where.AND = terms.map((term) => ({
      OR: [
        { title: { contains: term } },
        { description: { contains: term } },
      ],
    }));
  }

  if (orgFilter) {
    where.publisherId = orgFilter;
  }

  // Exclude soft-deleted datasets
  where.deletedAt = null;

  const [datasets, organizations] = await Promise.all([
    prisma.dataset.findMany({
      where,
      include: datasetIncludes,
      orderBy: { title: "asc" },
    }),
    listOrganizations(),
  ]);

  // Compute quality scores
  let scored = datasets.map((d) => ({
    dataset: d,
    quality: calculateQualityScore(d as unknown as DatasetWithRelations),
  }));

  // Apply score-range filter
  if (scoreFilter && scoreRanges[scoreFilter]) {
    const [min, max] = scoreRanges[scoreFilter];
    scored = scored.filter((s) => s.quality.overall >= min && s.quality.overall <= max);
  }

  // Sort
  switch (sort) {
    case "score_desc":
      scored.sort((a, b) => b.quality.overall - a.quality.overall);
      break;
    case "name_asc":
      scored.sort((a, b) => a.dataset.title.localeCompare(b.dataset.title));
      break;
    case "name_desc":
      scored.sort((a, b) => b.dataset.title.localeCompare(a.dataset.title));
      break;
    default: // score_asc (default)
      scored.sort((a, b) => a.quality.overall - b.quality.overall);
      break;
  }

  // Summary stats (from full filtered set, before pagination)
  const total = scored.length;
  const avgScore =
    total > 0
      ? Math.round(scored.reduce((sum, s) => sum + s.quality.overall, 0) / total)
      : 0;

  const missingCounts: Record<string, number> = {};
  for (const s of scored) {
    for (const b of s.quality.breakdown) {
      if (b.score < b.maxScore) {
        missingCounts[b.category] = (missingCounts[b.category] || 0) + 1;
      }
    }
  }
  const topMissing = Object.entries(missingCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Paginate in-memory
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = Math.min(page * limit, total);
  const pageItems = scored.slice(start, end);

  const hasActiveFilters = !!(search || scoreFilter || orgFilter || sort);

  return (
    <div>
      <AdminPageHeader title="Data Quality Report" />

      <div className="space-y-4 mb-6">
        <div className="max-w-xl">
          <Suspense fallback={null}>
            <SearchBar action="/admin/quality" />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <QualityFilterBar organizations={organizations} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-text-muted"><Database className="size-4" /> Total Datasets</div>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-text-muted"><BarChart3 className="size-4" /> Average Quality Score</div>
            <p className="text-2xl font-bold">{avgScore}/100</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-text-muted"><AlertTriangle className="size-4" /> Most Common Gap</div>
            <p className="text-2xl font-bold">{topMissing[0]?.[0] || "None"}</p>
          </CardContent>
        </Card>
      </div>

      {topMissing.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Most Common Missing Fields</h2>
          <div className="flex flex-wrap gap-2">
            {topMissing.map(([field, count]) => (
              <Badge key={field} variant="secondary" className="gap-1">
                {field} <span className="text-text-muted">({count})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {total > 0 && (
        <p className="text-sm text-text-muted mb-4">
          Showing {start + 1}–{end} of {total} dataset{total !== 1 ? "s" : ""}
        </p>
      )}

      {pageItems.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            title="No datasets match your filters"
            description="Try adjusting your search or filter criteria."
            actionLabel="Clear filters"
            actionHref="/admin/quality"
          />
        ) : (
          <EmptyState
            title="No datasets yet"
            description="Create datasets to see quality scores."
            actionLabel="New Dataset"
            actionHref="/admin/datasets/new"
          />
        )
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dataset</TableHead>
              <TableHead>Publisher</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Top Suggestion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map(({ dataset, quality }) => (
              <TableRow key={dataset.id}>
                <TableCell>
                  <Link href={`/admin/datasets/${dataset.id}/edit`} className="text-primary hover:underline">
                    {dataset.title}
                  </Link>
                </TableCell>
                <TableCell className="text-text-tertiary">{dataset.publisher.name}</TableCell>
                <TableCell className="font-mono">{quality.overall}/100</TableCell>
                <TableCell>
                  <QualityBadge score={quality.overall} showScore={false} />
                </TableCell>
                <TableCell className="text-text-muted text-xs">
                  {quality.suggestions[0] || "Complete"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Suspense fallback={null}>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/admin/quality"
        />
      </Suspense>
    </div>
  );
}
