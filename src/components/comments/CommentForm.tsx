"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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
        <p className="text-sm text-success-text bg-success-subtle px-3 py-2 rounded">
          Comment submitted for moderation.
        </p>
      )}
      {status === "error" && errorMsg && (
        <p className="text-sm text-danger-text bg-danger-subtle px-3 py-2 rounded">{errorMsg}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="authorName">Name</Label>
          <Input
            id="authorName"
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="authorEmail">Email</Label>
          <Input
            id="authorEmail"
            type="email"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            placeholder="your@email.com"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="commentContent">Comment</Label>
        <Textarea
          id="commentContent"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Leave a comment..."
        />
      </div>
      <Button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Submitting..." : "Submit Comment"}
      </Button>
    </form>
  );
}
