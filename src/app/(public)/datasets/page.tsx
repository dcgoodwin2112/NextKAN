import { Suspense } from "react";
import { listDatasets } from "@/lib/actions/datasets";
import { getFacetCounts } from "@/lib/actions/facets";
import { DatasetCard } from "@/components/datasets/DatasetCard";
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
      status: "published",
    }),
    getFacetCounts(),
  ]);

  const totalPages = Math.ceil(total / limit);
  const hasActiveFilters = !!(params.org || params.keyword || params.format || params.theme || params.accessLevel);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Datasets</h1>

      <div className="max-w-xl mb-6">
        <SearchBar />
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-64 shrink-0">
          <Suspense fallback={null}>
            <FacetSidebar facets={facets} />
          </Suspense>
        </div>

        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-4">
            {total} dataset{total !== 1 ? "s" : ""} found
            {search ? ` for "${search}"` : ""}
            {hasActiveFilters ? " (filtered)" : ""}
          </p>

          {datasets.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {datasets.map((dataset) => (
                <DatasetCard key={dataset.id} dataset={dataset} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
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
