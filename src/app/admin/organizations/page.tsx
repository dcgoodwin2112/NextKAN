import Link from "next/link";
import { listOrganizations } from "@/lib/actions/organizations";
import { OrganizationCard } from "@/components/organizations/OrganizationCard";

export default async function AdminOrganizationsPage() {
  const organizations = await listOrganizations();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Organizations</h1>
        <Link
          href="/admin/organizations/new"
          className="rounded bg-primary px-4 py-2 text-white hover:bg-primary-hover"
        >
          New Organization
        </Link>
      </div>
      {organizations.length === 0 ? (
        <p className="text-text-muted">No organizations yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <OrganizationCard key={org.id} organization={org} adminView />
          ))}
        </div>
      )}
    </div>
  );
}
