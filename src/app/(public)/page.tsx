import Link from "next/link";
import { listDatasets } from "@/lib/actions/datasets";
import { getCatalogStats } from "@/lib/services/discovery";
import { siteConfig } from "@/lib/config";
import { prisma } from "@/lib/db";
import { HeroSection } from "@/components/public/HeroSection";
import { StatsBar } from "@/components/public/StatsBar";
import { TopicGrid } from "@/components/public/TopicGrid";
import { PublicDatasetCard } from "@/components/public/PublicDatasetCard";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const [{ datasets, total }, stats, themes, orgs] = await Promise.all([
    listDatasets({ limit: 8, status: "published" }),
    getCatalogStats(),
    prisma.theme.findMany({
      include: {
        _count: {
          select: {
            datasets: { where: { dataset: { status: "published", deletedAt: null } } },
          },
        },
      },
      orderBy: { name: "asc" },
      take: 8,
    }),
    prisma.organization.findMany({
      include: {
        _count: {
          select: { datasets: { where: { status: "published", deletedAt: null } } },
        },
      },
      orderBy: { name: "asc" },
      take: 6,
    }),
  ]);

  const topTopics = themes
    .filter((t) => t._count.datasets > 0)
    .map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      color: t.color,
      datasetCount: t._count.datasets,
    }));

  const topOrgs = orgs.filter((o) => o._count.datasets > 0);

  return (
    <div>
      <HeroSection
        title={siteConfig.heroTitle}
        subtitle={siteConfig.heroDescription}
        datasetCount={total}
      />

      <div className="mx-auto max-w-7xl px-4 py-10 space-y-12">
        <StatsBar stats={stats} />

        {topTopics.length > 0 && <TopicGrid topics={topTopics} />}

        {/* Recent datasets */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Recent Datasets</h2>
            {total > 8 && (
              <Link href="/datasets">
                <Button variant="outline" size="sm">
                  Browse all
                </Button>
              </Link>
            )}
          </div>
          {datasets.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {datasets.map((dataset) => (
                <PublicDatasetCard key={dataset.id} dataset={dataset} />
              ))}
            </div>
          ) : (
            <p className="text-text-muted">No datasets published yet.</p>
          )}
        </section>

        {/* Organizations */}
        {topOrgs.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Organizations</h2>
              <Link href="/organizations">
                <Button variant="outline" size="sm">
                  View all
                </Button>
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topOrgs.map((org) => (
                <Link
                  key={org.id}
                  href={`/datasets?org=${org.id}`}
                  className="rounded-lg border border-border p-4 hover:shadow-md transition-shadow bg-card"
                >
                  <h3 className="font-semibold text-sm">{org.name}</h3>
                  <p className="text-xs text-text-muted mt-1">
                    {org._count.datasets} dataset{org._count.datasets !== 1 ? "s" : ""}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
