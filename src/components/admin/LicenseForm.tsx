"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { LicenseCreateInput } from "@/lib/schemas/license";

interface LicenseData {
  id: string;
  name: string;
  url: string | null;
  description: string | null;
  isDefault: boolean;
  sortOrder: number;
}

interface LicenseFormProps {
  initialData?: LicenseData;
  onSubmit: (data: LicenseCreateInput) => Promise<void>;
}

export function LicenseForm({ initialData, onSubmit }: LicenseFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialData?.name || "");
  const [url, setUrl] = useState(initialData?.url || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [isDefault, setIsDefault] = useState(initialData?.isDefault ?? false);
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder ?? 0);

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
        url: url.trim() || undefined,
        description: description.trim() || undefined,
        isDefault,
        sortOrder,
      });
      router.push("/admin/licenses");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      toast.error(message);
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
          placeholder="e.g. Creative Commons Zero (CC0 1.0)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://creativecommons.org/publicdomain/zero/1.0/"
        />
        <p className="text-xs text-text-muted">Link to the full license text (stored in dataset metadata and data.json output).</p>
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

      <div className="flex items-center gap-2">
        <Checkbox
          id="isDefault"
          checked={isDefault}
          onCheckedChange={(c) => setIsDefault(c === true)}
        />
        <label htmlFor="isDefault" className="text-sm font-medium">
          Default license
        </label>
      </div>
      <p className="text-xs text-text-muted ml-6">Pre-selected when creating new datasets.</p>

      <div className="space-y-2">
        <Label htmlFor="sortOrder">Sort Order</Label>
        <Input
          id="sortOrder"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
          min={0}
          className="w-24"
        />
        <p className="text-xs text-text-muted">Display order in the license dropdown (lower numbers appear first).</p>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData ? "Update" : "Create"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/licenses")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
