import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDatasetBySlug } from "@/lib/actions/datasets";
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
import { getCustomFieldsForDataset } from "@/lib/actions/custom-fields";
import { PublicBreadcrumbs } from "@/components/public/PublicBreadcrumbs";
import { DatasetHeader } from "@/components/public/DatasetHeader";
import { DatasetMetadata } from "@/components/public/DatasetMetadata";
import { DatasetTabs } from "@/components/public/DatasetTabs";
import { ResourceCard } from "@/components/public/ResourceCard";
import { Badge } from "@/components/ui/badge";

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

  const [versions, commentsEnabled, customFieldValues] = await Promise.all([
    getVersionHistory(dataset.id),
    Promise.resolve(isCommentsEnabled()),
    getCustomFieldsForDataset(dataset.id),
  ]);

  const customFieldDefs =
    Object.keys(customFieldValues).length > 0
      ? await prisma.customFieldDefinition.findMany({
          where: { name: { in: Object.keys(customFieldValues) } },
          orderBy: { sortOrder: "asc" },
        })
      : [];

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

  const series = (dataset as any).series as
    | { title: string; slug: string }
    | undefined;

  const hasVisualizations =
    dataset.spatial ||
    distributionExtras.some((e) => e.datastoreTable?.status === "ready");

  // Build custom fields for metadata sidebar
  const customFieldsMeta = customFieldDefs.map((def) => ({
    label: def.label,
    value: customFieldValues[def.name] || "",
    type: def.type,
  })).filter((f) => f.value);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <DatasetJsonLd dataset={dataset as any} />
      <PageViewTracker entityType="dataset" entityId={dataset.id} />

      <PublicBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Datasets", href: "/datasets" },
          { label: dataset.title },
        ]}
      />

      <DatasetHeader
        title={dataset.title}
        publisher={dataset.publisher}
        series={series}
        accessLevel={dataset.accessLevel}
        modified={dataset.modified}
      />

      {/* Keywords + Themes */}
      <div className="flex flex-wrap gap-2 mb-6">
        {dataset.keywords.map((k) => (
          <Badge key={k.keyword} variant="outline" className="text-sm">
            {k.keyword}
          </Badge>
        ))}
        {dataset.themes.map((t) => (
          <Badge key={t.theme.id} variant="secondary" className="text-sm">
            {t.theme.name}
          </Badge>
        ))}
      </div>

      {/* Description */}
      <p className="text-text-secondary whitespace-pre-wrap mb-8">
        {dataset.description}
      </p>

      {/* Main content: tabs + sidebar */}
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
          <DatasetTabs
            showVisualizations={!!hasVisualizations}
            showHistory={versions.length > 0}
            showComments={commentsEnabled}
            resourcesContent={
              <div className="space-y-3">
                {dataset.distributions.map((dist, i) => {
                  const extras = distributionExtras.find(
                    (e) => e.distributionId === dist.id
                  );
                  return (
                    <ResourceCard
                      key={dist.id}
                      distribution={dist}
                      index={i}
                      previewContent={
                        (dist.filePath || dist.downloadURL) ? (
                          <div>
                            <h4 className="text-base font-medium mb-2">
                              Data Preview
                            </h4>
                            <DataPreview
                              distributionId={dist.id}
                              format={dist.format}
                              filePath={dist.filePath}
                              downloadURL={dist.downloadURL}
                            />
                          </div>
                        ) : undefined
                      }
                      dictionaryContent={
                        extras?.dictionary &&
                        extras.dictionary.fields.length > 0 ? (
                          <div>
                            <h4 className="text-base font-medium mb-2">
                              Data Dictionary
                            </h4>
                            <DataDictionaryView
                              fields={extras.dictionary.fields}
                            />
                          </div>
                        ) : undefined
                      }
                    />
                  );
                })}
                {dataset.distributions.length === 0 && (
                  <p className="text-base text-text-muted">
                    No resources available.
                  </p>
                )}
              </div>
            }
            visualizationsContent={
              <div className="space-y-6">
                {dataset.spatial && (
                  <div>
                    <h3 className="text-base font-semibold mb-2">
                      Spatial Coverage
                    </h3>
                    <SpatialPreview spatial={dataset.spatial} />
                  </div>
                )}
                {dataset.distributions.map((dist) => {
                  const extras = distributionExtras.find(
                    (e) => e.distributionId === dist.id
                  );
                  if (extras?.datastoreTable?.status !== "ready") return null;
                  return (
                    <div key={dist.id}>
                      <h3 className="text-base font-semibold mb-2">
                        {dist.title || "Chart Builder"}
                      </h3>
                      <ChartBuilder distributionId={dist.id} />
                    </div>
                  );
                })}
              </div>
            }
            historyContent={
              <VersionHistory
                datasetId={dataset.id}
                versions={versions.map((v) => ({
                  id: v.id,
                  version: v.version,
                  changelog: v.changelog,
                  createdAt: v.createdAt.toISOString(),
                }))}
              />
            }
            commentsContent={<CommentSection datasetId={dataset.id} />}
          />
        </div>

        {/* Metadata sidebar */}
        <div className="lg:w-[300px] shrink-0">
          <DatasetMetadata
            dataset={dataset}
            customFields={customFieldsMeta}
          />
        </div>
      </div>
    </div>
  );
}
