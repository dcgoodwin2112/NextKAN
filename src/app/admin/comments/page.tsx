import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPendingComments, moderateComment, deleteComment } from "@/lib/services/comments";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
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
        <div className="rounded border bg-background overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Author</th>
                <th className="text-left px-4 py-3 font-medium">Content</th>
                <th className="text-left px-4 py-3 font-medium">Dataset</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((comment: any) => (
                <tr key={comment.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{comment.authorName}</div>
                    <div className="text-xs text-text-muted">{comment.authorEmail}</div>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">{comment.content}</td>
                  <td className="px-4 py-3 text-text-tertiary">
                    {comment.dataset?.title ?? "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <form action={approveAction}>
                        <input type="hidden" name="id" value={comment.id} />
                        <button
                          type="submit"
                          className="rounded bg-success px-3 py-1 text-xs text-white hover:opacity-90"
                        >
                          Approve
                        </button>
                      </form>
                      <CommentDeleteButton
                        commentId={comment.id}
                        onDelete={deleteAction}
                      />
                    </div>
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
