import Link from "next/link";
import { listPages } from "@/lib/actions/pages";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";

export default async function AdminPagesPage() {
  const pages = await listPages();

  return (
    <div>
      <AdminPageHeader title="Pages">
        <Button asChild size="sm">
          <Link href="/admin/pages/new">New Page</Link>
        </Button>
      </AdminPageHeader>

      {pages.length === 0 ? (
        <EmptyState
          title="No pages yet"
          description="Create content pages for your catalog site."
          actionLabel="New Page"
          actionHref="/admin/pages/new"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-text-muted">Title</th>
                <th className="px-4 py-2 text-left font-medium text-text-muted">Slug</th>
                <th className="px-4 py-2 text-left font-medium text-text-muted">Status</th>
                <th className="px-4 py-2 text-left font-medium text-text-muted">Order</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pages.map((page) => (
                <tr key={page.id}>
                  <td className="px-4 py-2 font-medium">{page.title}</td>
                  <td className="px-4 py-2 text-text-muted">/pages/{page.slug}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        page.published
                          ? "bg-success-subtle text-success-text"
                          : "bg-surface-alt text-text-tertiary"
                      }`}
                    >
                      {page.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-text-muted">{page.sortOrder}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/pages/${page.id}/edit`}
                      className="text-primary hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
