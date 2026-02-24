"use client";

import { useEffect, useState, useCallback } from "react";
import { CommentList } from "./CommentList";
import { CommentForm } from "./CommentForm";

interface CommentData {
  id: string;
  authorName: string;
  content: string;
  createdAt: string | Date;
  replies?: CommentData[];
}

interface CommentSectionProps {
  datasetId: string;
}

export function CommentSection({ datasetId }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/datasets/${datasetId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch {
      // Silently fail — comments are non-critical
    } finally {
      setLoading(false);
    }
  }, [datasetId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return (
    <div className="space-y-6">
      {loading ? (
        <p className="text-sm text-text-muted">Loading comments...</p>
      ) : (
        <CommentList comments={comments} />
      )}
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold mb-3">Leave a Comment</h3>
        <CommentForm datasetId={datasetId} onSubmitted={fetchComments} />
      </div>
    </div>
  );
}
