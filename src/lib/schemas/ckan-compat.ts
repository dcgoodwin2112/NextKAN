import type { DatasetWithRelations } from "./dcat-us";

export interface CKANPackage {
  id: string;
  name: string;
  title: string;
  notes: string;
  metadata_created: string;
  metadata_modified: string;
  organization: {
    id: string;
    name: string;
    title: string;
    description: string;
  };
  tags: { name: string }[];
  resources: CKANResource[];
  license_id: string;
  license_title: string;
  author: string;
  author_email: string;
  maintainer: string;
  maintainer_email: string;
  state: string;
  type: string;
  num_resources: number;
  num_tags: number;
}

export interface CKANResource {
  id: string;
  url: string;
  name: string;
  format: string;
  mimetype: string;
  description: string;
}

export interface CKANOrganization {
  id: string;
  name: string;
  title: string;
  description: string;
  image_url: string;
  state: string;
  package_count: number;
}

export interface CKANActionResponse<T> {
  success: boolean;
  result: T;
}

export function datasetToCKAN(dataset: DatasetWithRelations): CKANPackage {
  return {
    id: dataset.identifier,
    name: dataset.slug,
    title: dataset.title,
    notes: dataset.description,
    metadata_created: dataset.createdAt.toISOString(),
    metadata_modified: dataset.updatedAt.toISOString(),
    organization: {
      id: dataset.publisher.id,
      name: dataset.publisher.slug,
      title: dataset.publisher.name,
      description: dataset.publisher.description || "",
    },
    tags: dataset.keywords.map((k) => ({ name: k.keyword })),
    resources: dataset.distributions.map((d) => ({
      id: d.id,
      url: d.downloadURL || d.accessURL || "",
      name: d.title || d.fileName || "",
      format: d.format || "",
      mimetype: d.mediaType || "",
      description: d.description || "",
    })),
    license_id: dataset.license || "",
    license_title: dataset.license || "",
    author: dataset.contactName || "",
    author_email: dataset.contactEmail || "",
    maintainer: dataset.contactName || "",
    maintainer_email: dataset.contactEmail || "",
    state: dataset.status === "published" ? "active" : "draft",
    type: "dataset",
    num_resources: dataset.distributions.length,
    num_tags: dataset.keywords.length,
  };
}

export function organizationToCKAN(
  org: { id: string; name: string; slug: string; description: string | null; imageUrl: string | null },
  packageCount: number
): CKANOrganization {
  return {
    id: org.id,
    name: org.slug,
    title: org.name,
    description: org.description || "",
    image_url: org.imageUrl || "",
    state: "active",
    package_count: packageCount,
  };
}
