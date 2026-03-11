import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSeriesBySlug } from "@/lib/actions/series";
import { siteConfig } from "@/lib/config";
import { PublicBreadcrumbs } from "@/components/public/PublicBreadcrumbs";
import { PublicDatasetCard } from "@/components/public/PublicDatasetCard";
import { Badge } from "@/components/ui/badge";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const series = await getSeriesBySlug(slug);
  if (!series) {
    return { title: "Series Not Found" };
  }
  return {
    title: `${series.title} | ${siteConfig.name}`,
    description: series.description || `Dataset series: ${series.title}`,
  };
}

export default async function SeriesDetailPage({ params }: Props) {
  const { slug } = await params;
  const series = await getSeriesBySlug(slug);
  if (!series) notFound();

  const publishedDatasets = series.datasets
    .filter((d) => d.status === "published")
    .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PublicBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Series", href: "/series" },
          { label: series.title },
        ]}
      />

      <h1 className="text-3xl font-bold mb-2">{series.title}</h1>
      {series.description && (
        <p className="text-text-muted mb-4">{series.description}</p>
      )}
      <div className="flex gap-3 mb-8">
        <Badge variant="outline">{series.identifier}</Badge>
        <Badge variant="secondary">
          {publishedDatasets.length} dataset{publishedDatasets.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <h2 className="text-xl font-semibold mb-4">Datasets</h2>
      {publishedDatasets.length === 0 ? (
        <p className="text-text-muted">No published datasets in this series.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publishedDatasets.map((d) => (
            <PublicDatasetCard
              key={d.id}
              dataset={{
                ...d,
                description: d.description || "",
                distributions: [],
                keywords: [],
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
