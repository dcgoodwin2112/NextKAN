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
import { PageReorderButtons } from "./PageReorderButtons";

export default async function AdminPagesPage() {
  const pages = await listPages();

  // Group: parents first, then children under them
  const topLevel = pages.filter((p) => !p.parentId);
  const children = pages.filter((p) => p.parentId);
  const childrenByParent = new Map<string, typeof pages>();
  for (const child of children) {
    const list = childrenByParent.get(child.parentId!) || [];
    list.push(child);
    childrenByParent.set(child.parentId!, list);
  }

  // Build flat ordered list with hierarchy info
  const orderedPages: {
    page: (typeof pages)[number];
    isChild: boolean;
    isFirst: boolean;
    isLast: boolean;
  }[] = [];

  for (let i = 0; i < topLevel.length; i++) {
    const p = topLevel[i];
    orderedPages.push({
      page: p,
      isChild: false,
      isFirst: i === 0,
      isLast: i === topLevel.length - 1,
    });
    const kids = childrenByParent.get(p.id) || [];
    for (let j = 0; j < kids.length; j++) {
      orderedPages.push({
        page: kids[j],
        isChild: true,
        isFirst: j === 0,
        isLast: j === kids.length - 1,
      });
    }
  }

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
              <TableHead>Nav</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Order</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderedPages.map(({ page, isChild, isFirst, isLast }) => (
              <TableRow key={page.id}>
                <TableCell className="font-medium">
                  {isChild && (
                    <span className="text-text-muted mr-1">↳</span>
                  )}
                  <span className={isChild ? "pl-4" : ""}>
                    {page.title}
                  </span>
                </TableCell>
                <TableCell className="text-text-muted">
                  /pages/{page.slug}
                </TableCell>
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
                <TableCell className="text-text-muted capitalize">
                  {page.navLocation}
                </TableCell>
                <TableCell className="text-text-muted capitalize">
                  {page.template}
                </TableCell>
                <TableCell>
                  <PageReorderButtons
                    pageId={page.id}
                    isFirst={isFirst}
                    isLast={isLast}
                  />
                </TableCell>
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
