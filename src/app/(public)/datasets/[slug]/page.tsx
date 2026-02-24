import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDatasetBySlug } from "@/lib/actions/datasets";
import { DistributionList } from "@/components/datasets/DistributionList";
import { DataPreview } from "@/components/datasets/DataPreview";
import { DataDictionaryView } from "@/components/datasets/DataDictionaryView";
import { DatasetJsonLd } from "@/components/seo/DatasetJsonLd";
import { ChartBuilder } from "@/components/visualizations/ChartBuilder";
import { SpatialPreview } from "@/components/visualizations/SpatialPreview";
import { siteConfig } from "@/lib/config";
import { prisma } from "@/lib/db";

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

      <h1 className="text-3xl font-bold mb-2">{dataset.title}</h1>
      <p className="text-sm text-gray-500 mb-6">
        Published by {dataset.publisher.name}
      </p>

      <section className="mb-8">
        <p className="text-gray-700 whitespace-pre-wrap">
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
                className="rounded bg-gray-100 px-2 py-1 text-sm text-gray-600"
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
                className="rounded bg-blue-50 px-2 py-1 text-sm text-blue-700"
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
              <dt className="font-medium text-gray-500">Access Level</dt>
              <dd>{dataset.accessLevel}</dd>
            </div>
          )}
          {dataset.contactName && (
            <div>
              <dt className="font-medium text-gray-500">Contact</dt>
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
              <dt className="font-medium text-gray-500">License</dt>
              <dd>{dataset.license}</dd>
            </div>
          )}
          {dataset.accrualPeriodicity && (
            <div>
              <dt className="font-medium text-gray-500">Update Frequency</dt>
              <dd>{dataset.accrualPeriodicity}</dd>
            </div>
          )}
          {dataset.temporal && (
            <div>
              <dt className="font-medium text-gray-500">Temporal Coverage</dt>
              <dd>{dataset.temporal}</dd>
            </div>
          )}
          {dataset.spatial && (
            <div>
              <dt className="font-medium text-gray-500">Spatial Coverage</dt>
              <dd>{dataset.spatial}</dd>
            </div>
          )}
          {dataset.issued && (
            <div>
              <dt className="font-medium text-gray-500">Release Date</dt>
              <dd>{new Date(dataset.issued).toLocaleDateString()}</dd>
            </div>
          )}
          <div>
            <dt className="font-medium text-gray-500">Last Modified</dt>
            <dd>{new Date(dataset.modified).toLocaleDateString()}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
