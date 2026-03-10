"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { SeriesCreateInput } from "@/lib/schemas/series";

interface SeriesData {
  id: string;
  title: string;
  identifier: string;
  description: string | null;
}

interface SeriesFormProps {
  initialData?: SeriesData;
  onSubmit: (data: SeriesCreateInput) => Promise<void>;
}

export function SeriesForm({ initialData, onSubmit }: SeriesFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title || "");
  const [identifier, setIdentifier] = useState(initialData?.identifier || "");
  const [description, setDescription] = useState(initialData?.description || "");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!identifier.trim()) {
      setError("Identifier is required");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        identifier: identifier.trim(),
        description: description.trim() || undefined,
      });
      router.push("/admin/series");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      {error && (
        <div className="rounded bg-danger-subtle p-3 text-sm text-danger-text" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Climate Data Annual"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="identifier">Identifier *</Label>
        <Input
          id="identifier"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="e.g. climate-data-annual"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData ? "Update" : "Create"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/series")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
