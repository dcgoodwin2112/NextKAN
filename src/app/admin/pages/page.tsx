import Link from "next/link";
import { listPages } from "@/lib/actions/pages";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Order</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.map((page) => (
              <TableRow key={page.id}>
                <TableCell className="font-medium">{page.title}</TableCell>
                <TableCell className="text-text-muted">/pages/{page.slug}</TableCell>
                <TableCell>
                  <Badge
                    variant={page.published ? "default" : "secondary"}
                    className={
                      page.published
                        ? "bg-success-subtle text-success-text hover:bg-success-subtle"
                        : "bg-surface-alt text-text-tertiary hover:bg-surface-alt"
                    }
                  >
                    {page.published ? "Published" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell className="text-text-muted">{page.sortOrder}</TableCell>
                <TableCell>
                  <Link
                    href={`/admin/pages/${page.id}/edit`}
                    className="text-primary hover:underline"
                  >
                    Edit
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
