import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { searchComments, moderateComment, deleteComment } from "@/lib/services/comments";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { Pagination } from "@/components/ui/Pagination";
import { CommentFilterBar } from "@/components/admin/CommentFilterBar";
import { hasPermission } from "@/lib/auth/roles";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CommentDeleteButton } from "./CommentDeleteButton";

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user || !hasPermission((session.user as any).role, "user:manage")) {
    redirect("/admin");
  }

  const params = await searchParams;
  const search = params.search || "";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const status = params.status || undefined;
  const sort = params.sort || undefined;
  const limit = 20;

  const { comments, total } = await searchComments({
    search: search || undefined,
    status,
    sort,
    page,
    limit,
  });

  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const hasActiveFilters = !!(search || status || sort);

  async function approveAction(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await moderateComment(id, true);
    redirect("/admin/comments");
  }

  async function deleteAction(id: string) {
    "use server";
    await deleteComment(id);
    redirect("/admin/comments");
  }

  return (
    <div>
      <AdminPageHeader title="Comment Moderation" />

      <div className="space-y-4 mb-6">
        <div className="max-w-xl">
          <Suspense fallback={null}>
            <SearchBar action="/admin/comments" />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <CommentFilterBar />
        </Suspense>
      </div>

      {total > 0 && (
        <p className="text-sm text-text-muted mb-4">
          Showing {start}–{end} of {total} comment{total !== 1 ? "s" : ""}
        </p>
      )}

      {comments.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            title="No comments match your filters"
            description="Try adjusting your search or filter criteria."
            actionLabel="Clear filters"
            actionHref="/admin/comments"
          />
        ) : (
          <EmptyState
            title="No pending comments"
            description="Comments awaiting moderation will appear here."
          />
        )
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Author</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Dataset</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comments.map((comment: { id: string; authorName: string; authorEmail: string; content: string; approved: boolean; createdAt: Date; dataset?: { title: string } | null }) => (
              <TableRow key={comment.id}>
                <TableCell>
                  <div className="font-medium">{comment.authorName}</div>
                  <div className="text-xs text-text-muted">{comment.authorEmail}</div>
                </TableCell>
                <TableCell className="max-w-xs truncate">{comment.content}</TableCell>
                <TableCell className="text-text-tertiary">
                  {comment.dataset?.title ?? "Unknown"}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={comment.approved ? "approved" : "pending"}
                    label={comment.approved ? "Approved" : "Pending"}
                  />
                </TableCell>
                <TableCell className="text-text-muted text-xs">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {!comment.approved && (
                      <form action={approveAction}>
                        <input type="hidden" name="id" value={comment.id} />
                        <Button type="submit" size="xs" variant="outline" className="border-success text-success hover:bg-success-subtle">
                          <Check /> Approve
                        </Button>
                      </form>
                    )}
                    <CommentDeleteButton
                      commentId={comment.id}
                      onDelete={deleteAction}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Suspense fallback={null}>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/admin/comments"
        />
      </Suspense>
    </div>
  );
}
