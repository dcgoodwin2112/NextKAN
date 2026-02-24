"use client";

import { useState } from "react";

interface CommentFormProps {
  datasetId: string;
  parentId?: string;
  onSubmitted?: () => void;
}

export function CommentForm({ datasetId, parentId, onSubmitted }: CommentFormProps) {
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim() || !authorEmail.trim() || !content.trim()) {
      setErrorMsg("All fields are required.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/datasets/${datasetId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: authorName.trim(),
          authorEmail: authorEmail.trim(),
          content: content.trim(),
          parentId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit comment");
      }

      setStatus("success");
      setAuthorName("");
      setAuthorEmail("");
      setContent("");
      onSubmitted?.();
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {status === "success" && (
        <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded">
          Comment submitted for moderation.
        </p>
      )}
      {status === "error" && errorMsg && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{errorMsg}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="authorName" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            id="authorName"
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="authorEmail" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="authorEmail"
            type="email"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="your@email.com"
          />
        </div>
      </div>
      <div>
        <label htmlFor="commentContent" className="block text-sm font-medium text-gray-700 mb-1">
          Comment
        </label>
        <textarea
          id="commentContent"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
          rows={3}
          placeholder="Leave a comment..."
        />
      </div>
      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {status === "submitting" ? "Submitting..." : "Submit Comment"}
      </button>
    </form>
  );
}
