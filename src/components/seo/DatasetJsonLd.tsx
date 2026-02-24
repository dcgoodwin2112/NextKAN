import type { DatasetWithRelations } from "@/lib/schemas/dcat-us";
import { siteConfig } from "@/lib/config";

interface DatasetJsonLdProps {
  dataset: DatasetWithRelations;
}

export function DatasetJsonLd({ dataset }: DatasetJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: dataset.title,
    description: dataset.description,
    url: `${siteConfig.url}/datasets/${dataset.slug}`,
    identifier: dataset.identifier,
    dateModified: dataset.modified.toISOString().split("T")[0],
    ...(dataset.issued && {
      datePublished: dataset.issued.toISOString().split("T")[0],
    }),
    ...(dataset.license && { license: dataset.license }),
    ...(dataset.spatial && {
      spatialCoverage: dataset.spatial,
    }),
    ...(dataset.temporal && {
      temporalCoverage: dataset.temporal,
    }),
    creator: {
      "@type": "Organization",
      name: dataset.publisher.name,
    },
    keywords: dataset.keywords.map((k) => k.keyword),
    ...(dataset.distributions.length > 0 && {
      distribution: dataset.distributions.map((d) => ({
        "@type": "DataDownload",
        ...(d.downloadURL && { contentUrl: d.downloadURL }),
        ...(d.accessURL && { contentUrl: d.accessURL }),
        ...(d.mediaType && { encodingFormat: d.mediaType }),
        ...(d.title && { name: d.title }),
      })),
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
