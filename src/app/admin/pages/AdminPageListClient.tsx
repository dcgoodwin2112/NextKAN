"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useSelection } from "@/hooks/useSelection";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BulkActionBar, type BulkAction } from "@/components/admin/BulkActionBar";
import { PageReorderButtons } from "./PageReorderButtons";
import { bulkUpdatePages, bulkDeletePages } from "@/lib/actions/pages";

interface OrderedPage {
  page: {
    id: string;
    title: string;
    slug: string;
    published: boolean;
    navLocation: string;
    template: string;
  };
  isChild: boolean;
  isFirst: boolean;
  isLast: boolean;
}

interface AdminPageListClientProps {
  orderedPages: OrderedPage[];
}

export function AdminPageListClient({ orderedPages }: AdminPageListClientProps) {
  const router = useRouter();
  const allIds = orderedPages.map((op) => op.page.id);
  const selection = useSelection(allIds);

  async function handleBulkPublish(published: boolean) {
    const result = await bulkUpdatePages(selection.ids, { published });
    toast.success(
      `${result.success} page${result.success !== 1 ? "s" : ""} ${published ? "published" : "unpublished"}`
    );
    selection.clear();
    router.refresh();
  }

  async function handleBulkDelete() {
    const result = await bulkDeletePages(selection.ids);
    toast.success(`${result.success} page${result.success !== 1 ? "s" : ""} deleted`);
    selection.clear();
    router.refresh();
  }

  const actions: BulkAction[] = [
    { label: "Publish", icon: Eye, onClick: () => handleBulkPublish(true) },
    { label: "Unpublish", icon: EyeOff, onClick: () => handleBulkPublish(false) },
    {
      label: "Delete",
      icon: Trash2,
      onClick: handleBulkDelete,
      variant: "destructive",
      requiresConfirmation: true,
      confirmTitle: "Delete pages?",
      confirmDescription: `This will permanently delete ${selection.count} page${selection.count !== 1 ? "s" : ""}. Children of deleted pages will become top-level pages.`,
    },
  ];

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={selection.isIndeterminate ? "indeterminate" : selection.isAllSelected}
                onCheckedChange={() => selection.toggleAll()}
                aria-label="Select all pages"
              />
            </TableHead>
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
              <TableCell>
                <Checkbox
                  checked={selection.isSelected(page.id)}
                  onCheckedChange={() => selection.toggle(page.id)}
                  aria-label={`Select ${page.title}`}
                />
              </TableCell>
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

      <BulkActionBar
        selectedCount={selection.count}
        onClear={selection.clear}
        actions={actions}
        entityName="page"
      />
    </>
  );
}
