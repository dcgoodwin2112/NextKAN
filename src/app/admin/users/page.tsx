import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth/roles";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { Pagination } from "@/components/ui/Pagination";
import { UserFilterBar } from "@/components/admin/UserFilterBar";
import { UserList } from "./UserList";
import { searchUsers } from "@/lib/actions/users";
import { prisma } from "@/lib/db";
import { listOrganizations } from "@/lib/actions/organizations";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role as string;

  if (!hasPermission(role, "user:manage")) {
    redirect("/admin");
  }

  const params = await searchParams;
  const search = params.search || "";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const roleFilter = params.role || undefined;
  const statusFilter = params.status || undefined;
  const org = params.org || undefined;
  const sort = params.sort || undefined;
  const limit = 20;

  const [{ users, total }, organizations, pendingCount] = await Promise.all([
    searchUsers({ search: search || undefined, role: roleFilter, status: statusFilter, organizationId: org, sort, page, limit }),
    listOrganizations(),
    prisma.user.count({ where: { status: "pending" } }),
  ]);

  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const hasActiveFilters = !!(search || roleFilter || statusFilter || org || sort);

  return (
    <div>
      <AdminPageHeader
        title={
          pendingCount > 0
            ? `User Management (${pendingCount} pending)`
            : "User Management"
        }
      />

      <div className="space-y-4 mb-6">
        <div className="max-w-xl">
          <Suspense fallback={null}>
            <SearchBar action="/admin/users" />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <UserFilterBar organizations={organizations} />
        </Suspense>
      </div>

      {total > 0 && (
        <p className="text-sm text-text-muted mb-4">
          Showing {start}–{end} of {total} user{total !== 1 ? "s" : ""}
        </p>
      )}

      {users.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            title="No users match your filters"
            description="Try adjusting your search or filter criteria."
            actionLabel="Clear filters"
            actionHref="/admin/users"
          />
        ) : (
          <EmptyState
            title="No users yet"
            description="Create a user to get started."
          />
        )
      ) : (
        <UserList users={users} organizations={organizations} />
      )}

      <Suspense fallback={null}>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/admin/users"
        />
      </Suspense>
    </div>
  );
}
