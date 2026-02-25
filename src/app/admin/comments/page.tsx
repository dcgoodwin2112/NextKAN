import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPendingComments, moderateComment, deleteComment } from "@/lib/services/comments";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CommentDeleteButton } from "./CommentDeleteButton";

export default async function CommentsPage() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    redirect("/login");
  }

  const comments = await getPendingComments();

  async function approveAction(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await moderateComment(id, true);
    const { redirect: redir } = await import("next/navigation");
    redir("/admin/comments");
  }

  async function deleteAction(id: string) {
    "use server";
    await deleteComment(id);
    const { redirect: redir } = await import("next/navigation");
    redir("/admin/comments");
  }

  return (
    <div>
      <AdminPageHeader title="Comment Moderation" />

      {comments.length === 0 ? (
        <EmptyState
          title="No pending comments"
          description="Comments awaiting moderation will appear here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Author</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Dataset</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comments.map((comment: any) => (
              <TableRow key={comment.id}>
                <TableCell>
                  <div className="font-medium">{comment.authorName}</div>
                  <div className="text-xs text-text-muted">{comment.authorEmail}</div>
                </TableCell>
                <TableCell className="max-w-xs truncate">{comment.content}</TableCell>
                <TableCell className="text-text-tertiary">
                  {comment.dataset?.title ?? "Unknown"}
                </TableCell>
                <TableCell className="text-text-muted text-xs">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <form action={approveAction}>
                      <input type="hidden" name="id" value={comment.id} />
                      <Button type="submit" size="xs" className="bg-success hover:bg-success/90">
                        Approve
                      </Button>
                    </form>
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
    </div>
  );
}
