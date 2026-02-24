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
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          New Organization
        </Link>
      </div>
      {organizations.length === 0 ? (
        <p className="text-gray-500">No organizations yet.</p>
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
