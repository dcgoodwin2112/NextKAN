interface CommentData {
  id: string;
  authorName: string;
  content: string;
  createdAt: string | Date;
  replies?: CommentData[];
}

interface CommentListProps {
  comments: CommentData[];
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function CommentItem({ comment, isReply = false }: { comment: CommentData; isReply?: boolean }) {
  return (
    <div className={`${isReply ? "ml-8 border-l-2 border-gray-200 pl-4" : ""} py-3`}>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
        <span className="font-medium text-gray-700">{comment.authorName}</span>
        <span>&middot;</span>
        <time>{formatDate(comment.createdAt)}</time>
      </div>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment.content}</p>
    </div>
  );
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return <p className="text-sm text-gray-500">No comments yet.</p>;
  }

  return (
    <div className="divide-y">
      {comments.map((comment) => (
        <div key={comment.id}>
          <CommentItem comment={comment} />
          {comment.replies?.map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply />
          ))}
        </div>
      ))}
    </div>
  );
}
