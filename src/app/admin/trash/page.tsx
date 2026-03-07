import { Suspense } from "react";
import { listDeletedDatasets } from "@/lib/actions/datasets";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { Pagination } from "@/components/ui/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrashActions } from "./TrashActions";

export default async function TrashPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const limit = 20;

  const { datasets, total } = await listDeletedDatasets({
    search: search || undefined,
    page,
    limit,
  });

  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div>
      <AdminPageHeader title="Trash" />

      <div className="space-y-4 mb-6">
        <div className="max-w-xl">
          <Suspense fallback={null}>
            <SearchBar action="/admin/trash" />
          </Suspense>
        </div>
      </div>

      {total > 0 && (
        <p className="text-sm text-text-muted mb-4">
          Showing {start}–{end} of {total} deleted dataset{total !== 1 ? "s" : ""}
        </p>
      )}

      {datasets.length === 0 ? (
        <EmptyState
          title="Trash is empty"
          description="Deleted datasets will appear here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Deleted At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {datasets.map((dataset) => (
              <TableRow key={dataset.id}>
                <TableCell className="font-medium">{dataset.title}</TableCell>
                <TableCell className="text-text-tertiary">
                  {dataset.publisher.name}
                </TableCell>
                <TableCell className="text-text-muted">
                  {dataset.deletedAt
                    ? new Date(dataset.deletedAt).toLocaleDateString()
                    : "—"}
                </TableCell>
                <TableCell>
                  <TrashActions
                    datasetId={dataset.id}
                    datasetTitle={dataset.title}
                  />
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
          basePath="/admin/trash"
        />
      </Suspense>
    </div>
  );
}
