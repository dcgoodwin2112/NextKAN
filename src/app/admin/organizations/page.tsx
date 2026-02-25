import Link from "next/link";
import { listOrganizations } from "@/lib/actions/organizations";
import { OrganizationCard } from "@/components/organizations/OrganizationCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";

export default async function AdminOrganizationsPage() {
  const organizations = await listOrganizations();

  return (
    <div>
      <AdminPageHeader title="Organizations">
        <Button asChild>
          <Link href="/admin/organizations/new">New Organization</Link>
        </Button>
      </AdminPageHeader>
      {organizations.length === 0 ? (
        <EmptyState
          title="No organizations yet"
          description="Create an organization to start publishing datasets."
          actionLabel="New Organization"
          actionHref="/admin/organizations/new"
        />
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
