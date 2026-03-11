import type { Metadata } from "next";
import { listOrganizations } from "@/lib/actions/organizations";
import { siteConfig } from "@/lib/config";
import { PublicBreadcrumbs } from "@/components/public/PublicBreadcrumbs";
import { PublicOrganizationCard } from "@/components/public/PublicOrganizationCard";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Organizations | ${siteConfig.name}`,
    description: "Browse datasets by publishing organization",
  };
}

export default async function OrganizationsPage() {
  const organizations = await listOrganizations();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PublicBreadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Organizations" }]}
      />

      <h1 className="text-4xl font-bold mb-2">Organizations</h1>
      <p className="text-text-muted mb-8">
        Browse datasets by publishing organization
      </p>

      {organizations.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <PublicOrganizationCard key={org.id} organization={org} />
          ))}
        </div>
      ) : (
        <p className="text-text-muted">No organizations yet.</p>
      )}
    </div>
  );
}
