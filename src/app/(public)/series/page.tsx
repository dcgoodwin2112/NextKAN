import type { Metadata } from "next";
import { listSeries } from "@/lib/actions/series";
import { siteConfig } from "@/lib/config";
import { PublicBreadcrumbs } from "@/components/public/PublicBreadcrumbs";
import { PublicSeriesCard } from "@/components/public/PublicSeriesCard";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Series | ${siteConfig.name}`,
    description: "Browse dataset series",
  };
}

export default async function SeriesPage() {
  const { items: series } = await listSeries();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PublicBreadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Series" }]}
      />

      <h1 className="text-3xl font-bold mb-2">Series</h1>
      <p className="text-text-muted mb-8">Browse dataset series</p>

      {series.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {series.map((s) => (
            <PublicSeriesCard
              key={s.id}
              series={{
                id: s.id,
                title: s.title,
                slug: s.slug,
                identifier: s.identifier,
                description: s.description,
                datasetCount: s._count.datasets,
              }}
            />
          ))}
        </div>
      ) : (
        <p className="text-text-muted">No series defined yet.</p>
      )}
    </div>
  );
}
