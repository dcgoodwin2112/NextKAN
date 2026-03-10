"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CreateVersionFormProps {
  onSubmit: (version: string, changelog?: string) => Promise<void>;
}

export function CreateVersionForm({ onSubmit }: CreateVersionFormProps) {
  const [version, setVersion] = useState("");
  const [changelog, setChangelog] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!version.trim()) {
      setError("Revision label is required");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(version.trim(), changelog.trim() || undefined);
      setVersion("");
      setChangelog("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create version";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="version">Revision Label</Label>
        <Input
          id="version"
          type="text"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="e.g. v1, 2024-03-10"
        />
        <p className="text-xs text-text-muted">A label for this snapshot of the dataset metadata</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="changelog">Changelog (optional)</Label>
        <Textarea
          id="changelog"
          value={changelog}
          onChange={(e) => setChangelog(e.target.value)}
          placeholder="Describe what changed..."
          rows={2}
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Creating..." : "Create Version"}
      </Button>
    </form>
  );
}
