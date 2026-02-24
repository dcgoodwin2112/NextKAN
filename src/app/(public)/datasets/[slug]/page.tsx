import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getDatasetBySlug } from "@/lib/actions/datasets";
import { DistributionList } from "@/components/datasets/DistributionList";
import { DataPreview } from "@/components/datasets/DataPreview";
import { DataDictionaryView } from "@/components/datasets/DataDictionaryView";
import { DatasetJsonLd } from "@/components/seo/DatasetJsonLd";
import { ChartBuilder } from "@/components/visualizations/ChartBuilder";
import { SpatialPreview } from "@/components/visualizations/SpatialPreview";
import { VersionHistory } from "@/components/datasets/VersionHistory";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { CommentSection } from "@/components/comments/CommentSection";
import { siteConfig } from "@/lib/config";
import { prisma } from "@/lib/db";
import { getVersionHistory } from "@/lib/services/versioning";
import { isCommentsEnabled } from "@/lib/services/comments";

interface DatasetDetailProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: DatasetDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const dataset = await getDatasetBySlug(slug);
  if (!dataset || dataset.status !== "published") {
    return { title: "Dataset Not Found" };
  }

  const url = `${siteConfig.url}/datasets/${dataset.slug}`;

  return {
    title: dataset.title,
    description: dataset.description,
    alternates: { canonical: url },
    openGraph: {
      title: dataset.title,
      description: dataset.description,
      url,
      type: "website",
      siteName: siteConfig.name,
    },
    twitter: {
      card: "summary",
      title: dataset.title,
      description: dataset.description,
    },
  };
}

export default async function DatasetDetailPage({
  params,
}: DatasetDetailProps) {
  const { slug } = await params;
  const dataset = await getDatasetBySlug(slug);

  if (!dataset || dataset.status !== "published") {
    notFound();
  }

  const versions = await getVersionHistory(dataset.id);
  const commentsEnabled = isCommentsEnabled();

  // Load data dictionaries and datastore tables for each distribution
  const distributionExtras = await Promise.all(
    dataset.distributions.map(async (dist) => {
      const [dictionary, datastoreTable] = await Promise.all([
        prisma.dataDictionary.findUnique({
          where: { distributionId: dist.id },
          include: { fields: { orderBy: { sortOrder: "asc" } } },
        }),
        prisma.datastoreTable.findUnique({
          where: { distributionId: dist.id },
        }),
      ]);
      return { distributionId: dist.id, dictionary, datastoreTable };
    })
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <DatasetJsonLd dataset={dataset as any} />
      <PageViewTracker entityType="dataset" entityId={dataset.id} />

      <h1 className="text-3xl font-bold mb-2">{dataset.title}</h1>
      <p className="text-sm text-text-muted mb-2">
        Published by {dataset.publisher.name}
      </p>
      {(dataset as any).series && (
        <p className="text-sm mb-6">
          <Link
            href={`/series/${(dataset as any).series.slug}`}
            className="inline-flex items-center rounded bg-primary-subtle px-2 py-1 text-primary-subtle-text hover:opacity-80"
          >
            Part of series: {(dataset as any).series.title}
          </Link>
        </p>
      )}
      {!(dataset as any).series && <div className="mb-4" />}

      <section className="mb-8">
        <p className="text-text-secondary whitespace-pre-wrap">
          {dataset.description}
        </p>
      </section>

      {dataset.keywords.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Keywords</h2>
          <div className="flex flex-wrap gap-2">
            {dataset.keywords.map((k) => (
              <span
                key={k.keyword}
                className="rounded bg-surface-alt px-2 py-1 text-sm text-text-tertiary"
              >
                {k.keyword}
              </span>
            ))}
          </div>
        </section>
      )}

      {dataset.themes.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Themes</h2>
          <div className="flex flex-wrap gap-2">
            {dataset.themes.map((t) => (
              <span
                key={t.theme.id}
                className="rounded bg-primary-subtle px-2 py-1 text-sm text-primary-subtle-text"
              >
                {t.theme.name}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Distributions</h2>
        <DistributionList distributions={dataset.distributions} />

        {dataset.distributions.map((dist) => {
          const extras = distributionExtras.find(
            (e) => e.distributionId === dist.id
          );
          return (
            <div key={dist.id} className="mt-6 space-y-4">
              {(dist.filePath || dist.downloadURL) && (
                <div>
                  <h3 className="text-md font-semibold mb-2">Data Preview</h3>
                  <DataPreview
                    distributionId={dist.id}
                    format={dist.format}
                    filePath={dist.filePath}
                    downloadURL={dist.downloadURL}
                  />
                </div>
              )}

              {extras?.dictionary && extras.dictionary.fields.length > 0 && (
                <div>
                  <h3 className="text-md font-semibold mb-2">
                    Data Dictionary
                    {dist.title ? ` — ${dist.title}` : ""}
                  </h3>
                  <DataDictionaryView fields={extras.dictionary.fields} />
                </div>
              )}

              {extras?.datastoreTable?.status === "ready" && (
                <ChartBuilder distributionId={dist.id} />
              )}
            </div>
          );
        })}
      </section>

      {dataset.spatial && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Spatial Coverage</h2>
          <SpatialPreview spatial={dataset.spatial} />
        </section>
      )}

      <section className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-4">Metadata</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
          {dataset.accessLevel && (
            <div>
              <dt className="font-medium text-text-muted">Access Level</dt>
              <dd>{dataset.accessLevel}</dd>
            </div>
          )}
          {dataset.contactName && (
            <div>
              <dt className="font-medium text-text-muted">Contact</dt>
              <dd>
                {dataset.contactName}
                {dataset.contactEmail && (
                  <> ({dataset.contactEmail})</>
                )}
              </dd>
            </div>
          )}
          {dataset.license && (
            <div>
              <dt className="font-medium text-text-muted">License</dt>
              <dd>{dataset.license}</dd>
            </div>
          )}
          {dataset.accrualPeriodicity && (
            <div>
              <dt className="font-medium text-text-muted">Update Frequency</dt>
              <dd>{dataset.accrualPeriodicity}</dd>
            </div>
          )}
          {dataset.temporal && (
            <div>
              <dt className="font-medium text-text-muted">Temporal Coverage</dt>
              <dd>{dataset.temporal}</dd>
            </div>
          )}
          {dataset.spatial && (
            <div>
              <dt className="font-medium text-text-muted">Spatial Coverage</dt>
              <dd>{dataset.spatial}</dd>
            </div>
          )}
          {dataset.issued && (
            <div>
              <dt className="font-medium text-text-muted">Release Date</dt>
              <dd>{new Date(dataset.issued).toLocaleDateString()}</dd>
            </div>
          )}
          <div>
            <dt className="font-medium text-text-muted">Last Modified</dt>
            <dd>{new Date(dataset.modified).toLocaleDateString()}</dd>
          </div>
        </dl>
      </section>

      {versions.length > 0 && (
        <section className="border-t pt-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Version History</h2>
          <VersionHistory
            versions={versions.map((v) => ({
              id: v.id,
              version: v.version,
              changelog: v.changelog,
              createdAt: v.createdAt.toISOString(),
            }))}
          />
        </section>
      )}

      {commentsEnabled && (
        <section className="border-t pt-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Comments</h2>
          <CommentSection datasetId={dataset.id} />
        </section>
      )}
    </div>
  );
}
