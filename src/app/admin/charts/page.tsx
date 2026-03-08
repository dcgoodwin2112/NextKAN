import { Suspense } from "react";
import Link from "next/link";
import { listCharts } from "@/lib/actions/charts";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartDeleteButton } from "./ChartDeleteButton";

const PAGE_SIZE = 20;

export default async function AdminChartsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const datasetId = params.dataset || undefined;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const { items: charts, total } = await listCharts({
    search: search || undefined,
    datasetId,
    page,
    limit: PAGE_SIZE,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasActiveFilters = !!(search || datasetId);

  return (
    <div>
      <AdminPageHeader title="Charts">
        <Button asChild>
          <Link href="/admin/charts/new">New Chart</Link>
        </Button>
      </AdminPageHeader>

      <div className="space-y-4 mb-6">
        <div className="max-w-xl">
          <Suspense fallback={null}>
            <SearchBar action="/admin/charts" placeholder="Search charts..." />
          </Suspense>
        </div>
      </div>

      {total > 0 && (
        <p className="text-sm text-text-muted mb-4">
          Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} chart{total !== 1 ? "s" : ""}
        </p>
      )}

      {charts.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            title="No charts match your search"
            description="Try adjusting your search or filter criteria."
            actionLabel="Clear filters"
            actionHref="/admin/charts"
          />
        ) : (
          <EmptyState
            title="No charts yet"
            description="Create a chart from a distribution with datastore data."
            actionLabel="New Chart"
            actionHref="/admin/charts/new"
          />
        )
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Dataset</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Created</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {charts.map((chart) => (
              <TableRow key={chart.id}>
                <TableCell className="font-medium">
                  {chart.title || "Untitled"}
                </TableCell>
                <TableCell className="text-text-muted">
                  {chart.distribution.dataset.title}
                  <span className="ml-1 text-xs text-text-tertiary">
                    ({chart.distribution.dataset.publisher.name})
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{chart.chartType}</Badge>
                </TableCell>
                <TableCell className="text-text-muted">
                  {new Date(chart.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/charts/${chart.id}/edit`}
                      className="text-primary hover:underline text-sm"
                    >
                      Edit
                    </Link>
                    <ChartDeleteButton chartId={chart.id} />
                  </div>
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
          basePath="/admin/charts"
        />
      </Suspense>
    </div>
  );
}
