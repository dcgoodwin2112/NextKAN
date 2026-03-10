import { Suspense } from "react";
import Link from "next/link";
import { searchOrganizations } from "@/lib/actions/organizations";
import { OrganizationCard } from "@/components/organizations/OrganizationCard";
import { OrganizationTable } from "@/components/organizations/OrganizationTable";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ViewToggle } from "@/components/admin/ViewToggle";
import { EmptyState } from "@/components/admin/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { Pagination } from "@/components/ui/Pagination";
import { OrgFilterBar } from "@/components/admin/OrgFilterBar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

/** Sort organizations so children appear immediately after their parent. */
function sortTreeOrder<
  T extends { id: string; parentId?: string | null; name: string },
>(orgs: T[]): T[] {
  const byParent = new Map<string | null, T[]>();
  for (const org of orgs) {
    const key = org.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(org);
    byParent.set(key, list);
  }

  const result: T[] = [];
  function addChildren(parentId: string | null) {
    const children = byParent.get(parentId) ?? [];
    for (const child of children) {
      result.push(child);
      addChildren(child.id);
    }
  }
  addChildren(null);

  // Append any orgs whose parent wasn't in the result set (e.g., filtered out)
  for (const org of orgs) {
    if (!result.includes(org)) {
      result.push(org);
    }
  }

  return result;
}

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const sort = params.sort || undefined;
  const view = params.view === "list" ? "list" : "grid";
  const limit = 20;

  const { organizations, total } = await searchOrganizations({
    search: search || undefined,
    sort,
    page,
    limit,
  });

  const sortedOrgs = sortTreeOrder(organizations);
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const hasActiveFilters = !!(search || sort);

  return (
    <div>
      <AdminPageHeader title="Organizations">
        <Button asChild>
          <Link href="/admin/organizations/new"><Plus /> New Organization</Link>
        </Button>
      </AdminPageHeader>

      <div className="space-y-4 mb-6">
        <div className="max-w-xl">
          <Suspense fallback={null}>
            <SearchBar action="/admin/organizations" />
          </Suspense>
        </div>
        <div className="flex items-end justify-between gap-4">
          <Suspense fallback={null}>
            <OrgFilterBar />
          </Suspense>
          <Suspense fallback={null}>
            <ViewToggle basePath="/admin/organizations" />
          </Suspense>
        </div>
      </div>

      {total > 0 && (
        <p className="text-sm text-text-muted mb-4">
          Showing {start}–{end} of {total} organization{total !== 1 ? "s" : ""}
        </p>
      )}

      {organizations.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            title="No organizations match your filters"
            description="Try adjusting your search or filter criteria."
            actionLabel="Clear filters"
            actionHref="/admin/organizations"
          />
        ) : (
          <EmptyState
            title="No organizations yet"
            description="Create an organization to start publishing datasets."
            actionLabel="New Organization"
            actionHref="/admin/organizations/new"
          />
        )
      ) : (
        view === "list" ? (
          <OrganizationTable organizations={sortedOrgs} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedOrgs.map((org) => (
              <OrganizationCard key={org.id} organization={org} adminView />
            ))}
          </div>
        )
      )}

      <Suspense fallback={null}>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/admin/organizations"
        />
      </Suspense>
    </div>
  );
}
