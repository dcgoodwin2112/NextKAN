import Link from "next/link";
import { listDatasets } from "@/lib/actions/datasets";
import { DatasetCard } from "@/components/datasets/DatasetCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { siteConfig } from "@/lib/config";

export default async function HomePage() {
  const { datasets, total } = await listDatasets({
    limit: 8,
    status: "published",
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{siteConfig.heroTitle}</h1>
        <p className="text-lg text-text-tertiary mb-6">{siteConfig.heroDescription}</p>
        <div className="max-w-xl mx-auto">
          <SearchBar />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Recent Datasets</h2>
          <span className="text-sm text-text-muted">{total} total datasets</span>
        </div>

        {datasets.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {datasets.map((dataset) => (
              <DatasetCard key={dataset.id} dataset={dataset} />
            ))}
          </div>
        ) : (
          <p className="text-text-muted">No datasets published yet.</p>
        )}

        {total > 8 && (
          <div className="text-center mt-6">
            <Link
              href="/datasets"
              className="text-primary hover:underline font-medium"
            >
              Browse all datasets
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
