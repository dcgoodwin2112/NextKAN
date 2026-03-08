import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getOrganizationBySlug } from "@/lib/actions/organizations";
import { DatasetCard } from "@/components/datasets/DatasetCard";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {org.parent && (
        <Breadcrumbs
          items={[
            { label: "Organizations", href: "/organizations" },
            { label: org.parent.name, href: `/organizations/${org.parent.slug}` },
            { label: org.name },
          ]}
        />
      )}

      <h1 className="text-3xl font-bold mb-2">{org.name}</h1>
      {org.description && (
        <p className="text-text-tertiary mb-6">{org.description}</p>
      )}

      {org.children && org.children.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Sub-organizations ({org.children.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {org.children.map((child) => (
              <Link
                key={child.id}
                href={`/organizations/${child.slug}`}
                className="rounded-lg border border-border p-4 hover:shadow-sm transition-shadow block"
              >
                <h3 className="font-semibold">{child.name}</h3>
                {child.description && (
                  <p className="text-sm text-text-tertiary mt-1">
                    {child.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-4">
          Published Datasets ({org.datasets.length})
        </h2>

        {org.datasets.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {org.datasets.map((dataset) => (
              <DatasetCard
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
