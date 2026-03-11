import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOrganizationBySlug } from "@/lib/actions/organizations";
import { PublicBreadcrumbs } from "@/components/public/PublicBreadcrumbs";
import { PublicDatasetCard } from "@/components/public/PublicDatasetCard";
import { PublicOrganizationCard } from "@/components/public/PublicOrganizationCard";
import { Badge } from "@/components/ui/badge";

interface OrgDetailProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: OrgDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) {
    return { title: "Organization Not Found" };
  }
  return {
    title: org.name,
    description: org.description || `Datasets published by ${org.name}`,
    openGraph: {
      title: org.name,
      description: org.description || `Datasets published by ${org.name}`,
    },
  };
}

export default async function OrganizationDetailPage({
  params,
}: OrgDetailProps) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);

  if (!org) {
    notFound();
  }

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Organizations", href: "/organizations" },
    ...(org.parent
      ? [{ label: org.parent.name, href: `/organizations/${org.parent.slug}` }]
      : []),
    { label: org.name },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PublicBreadcrumbs items={breadcrumbItems} />

      <h1 className="text-3xl font-bold mb-2">{org.name}</h1>
      {org.description && (
        <p className="text-text-muted mb-4">{org.description}</p>
      )}

      <div className="flex gap-3 mb-8">
        <Badge variant="secondary">
          {org.datasets.length} dataset{org.datasets.length !== 1 ? "s" : ""}
        </Badge>
        {org.children && org.children.length > 0 && (
          <Badge variant="outline">
            {org.children.length} sub-organization{org.children.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {org.children && org.children.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Sub-organizations</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {org.children.map((child) => (
              <PublicOrganizationCard key={child.id} organization={child} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-4">Published Datasets</h2>

        {org.datasets.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {org.datasets.map((dataset) => (
              <PublicDatasetCard
                key={dataset.id}
                dataset={{
                  ...dataset,
                  publisher: { name: org.name },
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-text-muted">No published datasets yet.</p>
        )}
      </section>
    </div>
  );
}
