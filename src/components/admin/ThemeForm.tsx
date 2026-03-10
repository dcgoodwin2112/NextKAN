"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ThemeCreateInput } from "@/lib/schemas/theme";

interface ThemeData {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
}

interface ThemeFormProps {
  initialData?: ThemeData;
  onSubmit: (data: ThemeCreateInput) => Promise<void>;
}

export function ThemeForm({ initialData, onSubmit }: ThemeFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [color, setColor] = useState(initialData?.color || "#3b82f6");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        color: color.trim() || undefined,
      });
      router.push("/admin/themes");
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
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Transportation"
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

      <div className="space-y-2">
        <Label htmlFor="color">Color</Label>
        <div className="flex items-center gap-3">
          <input
            id="colorPicker"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded border border-border"
          />
          <Input
            id="color"
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="#3b82f6"
            className="w-32"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData ? "Update" : "Create"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/themes")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
