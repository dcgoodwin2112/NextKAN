import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOrganizationBySlug } from "@/lib/actions/organizations";
import { DatasetCard } from "@/components/datasets/DatasetCard";

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
      <h1 className="text-3xl font-bold mb-2">{org.name}</h1>
      {org.description && (
        <p className="text-text-tertiary mb-6">{org.description}</p>
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
