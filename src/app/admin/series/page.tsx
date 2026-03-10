import { Suspense } from "react";
import Link from "next/link";
import { listSeries } from "@/lib/actions/series";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;

export default async function SeriesListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const { items: series, total } = await listSeries({
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <AdminPageHeader title="Dataset Series">
        <Button asChild>
          <Link href="/admin/series/new"><Plus /> New Series</Link>
        </Button>
      </AdminPageHeader>

      <div className="space-y-4 mb-6">
        <div className="max-w-xl">
          <Suspense fallback={null}>
            <SearchBar action="/admin/series" placeholder="Search series..." />
          </Suspense>
        </div>
      </div>

      {total > 0 && (
        <p className="text-sm text-text-muted mb-4">
          Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} series
        </p>
      )}

      {series.length === 0 ? (
        search ? (
          <EmptyState
            title="No series match your search"
            description="Try adjusting your search term."
            actionLabel="Clear search"
            actionHref="/admin/series"
          />
        ) : (
          <EmptyState
            title="No series created yet"
            description="Create a series to group related datasets together."
            actionLabel="New Series"
            actionHref="/admin/series/new"
          />
        )
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Identifier</TableHead>
              <TableHead>Datasets</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {series.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.title}</TableCell>
                <TableCell className="text-text-muted">{s.identifier}</TableCell>
                <TableCell>{(s as any)._count?.datasets ?? 0}</TableCell>
                <TableCell>
                  <Link
                    href={`/admin/series/${s.id}`}
                    className="text-primary hover:underline"
                  >
                    Edit
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
          basePath="/admin/series"
        />
      </Suspense>
    </div>
  );
}
