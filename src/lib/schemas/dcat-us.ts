import {
  Dataset,
  Distribution,
  Organization,
  DatasetKeyword,
  DatasetTheme,
  Theme,
} from "@/generated/prisma/client";

type OrganizationWithParent = Organization & {
  parent: Organization | null;
};

type DatasetThemeWithTheme = DatasetTheme & {
  theme: Theme;
};

export type DatasetWithRelations = Dataset & {
  publisher: OrganizationWithParent;
  distributions: Distribution[];
  keywords: DatasetKeyword[];
  themes: DatasetThemeWithTheme[];
};

export interface DCATUSCatalog {
  "@context": string;
  "@id": string;
  "@type": string;
  conformsTo: string;
  describedBy: string;
  dataset: DCATUSDataset[];
}

export interface DCATUSDataset {
  "@type": string;
  title: string;
  description: string;
  keyword: string[];
  modified: string;
  publisher: {
    "@type": string;
    name: string;
    subOrganizationOf?: {
      "@type": string;
      name: string;
    };
  };
  contactPoint: {
    "@type": string;
    fn: string;
    hasEmail: string;
  };
  identifier: string;
  accessLevel: string;
  bureauCode?: string[];
  programCode?: string[];
  license?: string;
  rights?: string;
  spatial?: string;
  temporal?: string;
  distribution?: DCATUSDistribution[];
  accrualPeriodicity?: string;
  conformsTo?: string;
  dataQuality?: boolean;
  describedBy?: string;
  isPartOf?: string;
  issued?: string;
  language?: string[];
  landingPage?: string;
  references?: string[];
  systemOfRecords?: string;
  theme?: string[];
}

export interface DCATUSDistribution {
  "@type": string;
  title?: string;
  description?: string;
  downloadURL?: string;
  accessURL?: string;
  mediaType?: string;
  format?: string;
  conformsTo?: string;
  describedBy?: string;
}

export function transformDatasetToDCATUS(
  dataset: DatasetWithRelations
): DCATUSDataset {
  const result: DCATUSDataset = {
    "@type": "dcat:Dataset",
    title: dataset.title,
    description: dataset.description,
    keyword: dataset.keywords.map((k) => k.keyword),
    modified: dataset.modified.toISOString().split("T")[0],
    publisher: {
      "@type": "org:Organization",
      name: dataset.publisher.name,
      ...(dataset.publisher.parent && {
        subOrganizationOf: {
          "@type": "org:Organization",
          name: dataset.publisher.parent.name,
        },
      }),
    },
    contactPoint: {
      "@type": "vcard:Contact",
      fn: dataset.contactName || "",
      hasEmail: dataset.contactEmail
        ? `mailto:${dataset.contactEmail}`
        : "",
    },
    identifier: dataset.identifier,
    accessLevel: dataset.accessLevel,
  };

  if (dataset.bureauCode) result.bureauCode = [dataset.bureauCode];
  if (dataset.programCode) result.programCode = [dataset.programCode];

  if (dataset.license) result.license = dataset.license;
  if (dataset.rights) result.rights = dataset.rights;
  if (dataset.spatial) result.spatial = dataset.spatial;
  if (dataset.temporal) result.temporal = dataset.temporal;

  if (dataset.distributions.length > 0) {
    result.distribution = dataset.distributions.map(transformDistribution);
  }

  if (dataset.accrualPeriodicity)
    result.accrualPeriodicity = dataset.accrualPeriodicity;
  if (dataset.conformsTo) result.conformsTo = dataset.conformsTo;
  if (dataset.dataQuality !== null && dataset.dataQuality !== undefined)
    result.dataQuality = dataset.dataQuality;
  if (dataset.describedBy) result.describedBy = dataset.describedBy;
  if (dataset.isPartOf) result.isPartOf = dataset.isPartOf;
  if (dataset.issued)
    result.issued = dataset.issued.toISOString().split("T")[0];
  if (dataset.language) result.language = [dataset.language];
  if (dataset.landingPage) result.landingPage = dataset.landingPage;
  if (dataset.systemOfRecords)
    result.systemOfRecords = dataset.systemOfRecords;

  if (dataset.references) {
    try {
      result.references = JSON.parse(dataset.references);
    } catch {
      // ignore invalid JSON
    }
  }
  if (dataset.themes?.length > 0) {
    result.theme = dataset.themes.map((t) => t.theme.name);
  }

  return result;
}

function transformDistribution(dist: Distribution): DCATUSDistribution {
  const result: DCATUSDistribution = { "@type": "dcat:Distribution" };
  if (dist.title) result.title = dist.title;
  if (dist.description) result.description = dist.description;
  if (dist.downloadURL) result.downloadURL = dist.downloadURL;
  if (dist.accessURL) result.accessURL = dist.accessURL;
  if (dist.mediaType) result.mediaType = dist.mediaType;
  if (dist.format) result.format = dist.format;
  if (dist.conformsTo) result.conformsTo = dist.conformsTo;
  if (dist.describedBy) result.describedBy = dist.describedBy;
  return result;
}

export function buildCatalog(
  datasets: DatasetWithRelations[],
  siteUrl: string
): DCATUSCatalog {
  return {
    "@context":
      "https://project-open-data.cio.gov/v1.1/schema/catalog.jsonld",
    "@id": `${siteUrl}/data.json`,
    "@type": "dcat:Catalog",
    conformsTo: "https://project-open-data.cio.gov/v1.1/schema",
    describedBy:
      "https://project-open-data.cio.gov/v1.1/schema/catalog.json",
    dataset: datasets.map(transformDatasetToDCATUS),
  };
}

/** Reverse-map a DCAT-US dataset to a DatasetCreateInput-like object. */
export function reverseDCATUSToDatasetInput(
  dcatDataset: DCATUSDataset,
  publisherId: string
) {
  const contactEmail = dcatDataset.contactPoint?.hasEmail?.replace(
    /^mailto:/,
    ""
  );

  const accessLevel = (
    ["public", "restricted public", "non-public"].includes(
      dcatDataset.accessLevel
    )
      ? dcatDataset.accessLevel
      : "public"
  ) as "public" | "restricted public" | "non-public";

  return {
    title: dcatDataset.title,
    description: dcatDataset.description,
    identifier: dcatDataset.identifier,
    accessLevel,
    status: "published" as const,
    publisherId,
    contactName: dcatDataset.contactPoint?.fn || undefined,
    contactEmail: contactEmail || undefined,
    keywords: dcatDataset.keyword || [],
    bureauCode: dcatDataset.bureauCode?.[0] || undefined,
    programCode: dcatDataset.programCode?.[0] || undefined,
    license: dcatDataset.license || undefined,
    rights: dcatDataset.rights || undefined,
    spatial: dcatDataset.spatial || undefined,
    temporal: dcatDataset.temporal || undefined,
    issued: dcatDataset.issued || undefined,
    accrualPeriodicity: dcatDataset.accrualPeriodicity || undefined,
    conformsTo: dcatDataset.conformsTo || undefined,
    dataQuality: dcatDataset.dataQuality,
    describedBy: dcatDataset.describedBy || undefined,
    isPartOf: dcatDataset.isPartOf || undefined,
    landingPage: dcatDataset.landingPage || undefined,
    language: dcatDataset.language?.[0] || "en-us",
    references: dcatDataset.references || undefined,
    distributions: dcatDataset.distribution?.map((d) => ({
      title: d.title || undefined,
      description: d.description || undefined,
      downloadURL: d.downloadURL || undefined,
      accessURL: d.accessURL || undefined,
      mediaType: d.mediaType || undefined,
      format: d.format || undefined,
      conformsTo: d.conformsTo || undefined,
      describedBy: d.describedBy || undefined,
    })),
  };
}
