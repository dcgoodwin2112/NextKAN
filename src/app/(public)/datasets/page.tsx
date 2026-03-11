import { Suspense } from "react";
import { listDatasets } from "@/lib/actions/datasets";
import { getFacetCounts } from "@/lib/actions/facets";
import { PublicDatasetCard } from "@/components/public/PublicDatasetCard";
import { PublicBreadcrumbs } from "@/components/public/PublicBreadcrumbs";
import { DatasetListHeader } from "@/components/public/DatasetListHeader";
import { ActiveFilters } from "@/components/public/ActiveFilters";
import { SearchBar } from "@/components/ui/SearchBar";
import { Pagination } from "@/components/ui/Pagination";
import { FacetSidebar } from "@/components/search/FacetSidebar";

export default async function DatasetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const sort = params.sort || "modified_desc";
  const limit = 20;

  const [{ datasets, total }, facets] = await Promise.all([
    listDatasets({
      search: search || undefined,
      organizationId: params.org || undefined,
      keyword: params.keyword || undefined,
      format: params.format || undefined,
      theme: params.theme || undefined,
      accessLevel: params.accessLevel || undefined,
      page,
      limit,
      sort,
      status: "published",
    }),
    getFacetCounts(),
  ]);

  const totalPages = Math.ceil(total / limit);
  const hasActiveFilters = !!(
    params.org ||
    params.keyword ||
    params.format ||
    params.theme ||
    params.accessLevel
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PublicBreadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Datasets" }]}
      />

      <h1 className="text-3xl font-bold mb-6">Datasets</h1>

      <div className="max-w-xl mb-6">
        <SearchBar />
      </div>

      <Suspense fallback={null}>
        <ActiveFilters facets={facets} />
      </Suspense>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-[280px] shrink-0">
          <Suspense fallback={null}>
            <FacetSidebar facets={facets} />
          </Suspense>
        </div>

        <div className="flex-1">
          <Suspense fallback={null}>
            <DatasetListHeader
              total={total}
              search={search || undefined}
              hasFilters={hasActiveFilters}
            />
          </Suspense>

          {datasets.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {datasets.map((dataset) => (
                <PublicDatasetCard key={dataset.id} dataset={dataset} />
              ))}
            </div>
          ) : (
            <p className="text-text-muted">
              {search
                ? `No datasets found for "${search}".`
                : hasActiveFilters
                  ? "No datasets match your filters."
                  : "No datasets published yet."}
            </p>
          )}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            basePath="/datasets"
          />
        </div>
      </div>
    </div>
  );
}
