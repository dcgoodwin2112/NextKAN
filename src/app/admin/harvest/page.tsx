import { Suspense } from "react";
import Link from "next/link";
import { listHarvestSources } from "@/lib/actions/harvest";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;

export default async function AdminHarvestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const { items: sources, total } = await listHarvestSources({
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <AdminPageHeader title="Harvest Sources">
        <Button asChild size="sm">
          <Link href="/admin/harvest/new">New Source</Link>
        </Button>
      </AdminPageHeader>

      <div className="space-y-4 mb-6">
        <div className="max-w-xl">
          <Suspense fallback={null}>
            <SearchBar action="/admin/harvest" placeholder="Search harvest sources..." />
          </Suspense>
        </div>
      </div>

      {total > 0 && (
        <p className="text-sm text-text-muted mb-4">
          Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} source{total !== 1 ? "s" : ""}
        </p>
      )}

      {sources.length === 0 ? (
        search ? (
          <EmptyState
            title="No sources match your search"
            description="Try adjusting your search term."
            actionLabel="Clear search"
            actionHref="/admin/harvest"
          />
        ) : (
          <EmptyState
            title="No harvest sources configured"
            description="Create one to start harvesting datasets from external catalogs."
            actionLabel="New Source"
            actionHref="/admin/harvest/new"
          />
        )
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Datasets</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((source) => (
              <TableRow key={source.id}>
                <TableCell className="font-medium">{source.name}</TableCell>
                <TableCell className="text-text-muted">{source.type}</TableCell>
                <TableCell>
                  {source.lastStatus && (
                    <Badge
                      variant={
                        source.lastStatus === "success"
                          ? "default"
                          : source.lastStatus === "partial"
                            ? "secondary"
                            : "destructive"
                      }
                      className={
                        source.lastStatus === "success"
                          ? "bg-success-subtle text-success-text hover:bg-success-subtle"
                          : source.lastStatus === "partial"
                            ? "bg-warning-subtle text-warning-text hover:bg-warning-subtle"
                            : ""
                      }
                    >
                      {source.lastStatus}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{source.datasetCount}</TableCell>
                <TableCell className="text-text-muted">
                  {source.lastHarvestAt
                    ? new Date(source.lastHarvestAt).toLocaleString()
                    : "Never"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={source.enabled ? "default" : "secondary"}
                    className={
                      source.enabled
                        ? "bg-success-subtle text-success-text hover:bg-success-subtle"
                        : "bg-surface-alt text-text-muted hover:bg-surface-alt"
                    }
                  >
                    {source.enabled ? "Yes" : "No"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/harvest/${source.id}`}
                    className="text-primary hover:underline"
                  >
                    Manage
                  </Link>
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
          basePath="/admin/harvest"
        />
      </Suspense>
    </div>
  );
}
