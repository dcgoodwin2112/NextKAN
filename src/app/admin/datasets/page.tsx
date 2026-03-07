import { Suspense } from "react";
import Link from "next/link";
import { listDatasets } from "@/lib/actions/datasets";
import { listOrganizations } from "@/lib/actions/organizations";
import { AdminDatasetListClient } from "./AdminDatasetListClient";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ViewToggle } from "@/components/admin/ViewToggle";
import { EmptyState } from "@/components/admin/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { Pagination } from "@/components/ui/Pagination";
import { DatasetFilterBar } from "@/components/admin/DatasetFilterBar";
import { Button } from "@/components/ui/button";

export default async function AdminDatasetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const status = params.status || undefined;
  const org = params.org || undefined;
  const sort = params.sort || undefined;
  const view = params.view === "list" ? "list" : "grid";
  const limit = 20;

  const [{ datasets, total }, organizations] = await Promise.all([
    listDatasets({
      search: search || undefined,
      organizationId: org,
      status,
      sort,
      page,
      limit,
    }),
    listOrganizations(),
  ]);

  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const hasActiveFilters = !!(search || status || org || sort);
  const orgOptions = organizations.map((o) => ({ id: o.id, name: o.name }));

  return (
    <div>
      <AdminPageHeader title="Datasets">
        <Button asChild>
          <Link href="/admin/datasets/new">New Dataset</Link>
        </Button>
      </AdminPageHeader>

      <div className="space-y-4 mb-6">
        <div className="max-w-xl">
          <Suspense fallback={null}>
            <SearchBar action="/admin/datasets" />
          </Suspense>
        </div>
        <div className="flex items-end justify-between gap-4">
          <Suspense fallback={null}>
            <DatasetFilterBar organizations={orgOptions} />
          </Suspense>
          <Suspense fallback={null}>
            <ViewToggle basePath="/admin/datasets" />
          </Suspense>
        </div>
      </div>

      {total > 0 && (
        <p className="text-sm text-text-muted mb-4">
          Showing {start}–{end} of {total} dataset{total !== 1 ? "s" : ""}
        </p>
      )}

      {datasets.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            title="No datasets match your filters"
            description="Try adjusting your search or filter criteria."
            actionLabel="Clear filters"
            actionHref="/admin/datasets"
          />
        ) : (
          <EmptyState
            title="No datasets yet"
            description="Create your first dataset to get started."
            actionLabel="New Dataset"
            actionHref="/admin/datasets/new"
          />
        )
      ) : (
        <AdminDatasetListClient
          datasets={datasets}
          organizations={orgOptions}
          view={view}
        />
      )}

      <Suspense fallback={null}>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/admin/datasets"
        />
      </Suspense>
    </div>
  );
}
