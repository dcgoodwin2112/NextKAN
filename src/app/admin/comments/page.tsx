import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPendingComments, moderateComment, deleteComment } from "@/lib/services/comments";

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

  async function deleteAction(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await deleteComment(id);
    const { redirect: redir } = await import("next/navigation");
    redir("/admin/comments");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Comment Moderation</h1>

      {comments.length === 0 ? (
        <p className="text-gray-500">No pending comments.</p>
      ) : (
        <div className="rounded border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
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
                    <div className="text-xs text-gray-500">{comment.authorEmail}</div>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">{comment.content}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {comment.dataset?.title ?? "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <form action={approveAction}>
                        <input type="hidden" name="id" value={comment.id} />
                        <button
                          type="submit"
                          className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={deleteAction}>
                        <input type="hidden" name="id" value={comment.id} />
                        <button
                          type="submit"
                          className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </form>
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
