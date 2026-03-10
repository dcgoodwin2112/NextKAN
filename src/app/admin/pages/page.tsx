import Link from "next/link";
import { listPages } from "@/lib/actions/pages";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AdminPageListClient } from "./AdminPageListClient";

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
          <Link href="/admin/pages/new"><Plus /> New Page</Link>
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
        <AdminPageListClient orderedPages={orderedPages} />
      )}
    </div>
  );
}
