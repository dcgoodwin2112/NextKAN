"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Organization } from "@/generated/prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

interface OrganizationFormProps {
  initialData?: Organization;
  organizations?: Organization[];
  onSubmit: (data: {
    name: string;
    description?: string;
    imageUrl?: string;
    parentId?: string;
  }) => Promise<void>;
}

export function OrganizationForm({
  initialData,
  organizations = [],
  onSubmit,
}: OrganizationFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
  const [parentId, setParentId] = useState(initialData?.parentId || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await onSubmit({
        name,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        parentId: parentId || undefined,
      });
      router.push("/admin/organizations");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      {error && (
        <div className="rounded bg-danger-subtle p-3 text-sm text-danger-text">
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
          required
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
        <Label htmlFor="imageUrl">Image URL</Label>
        <Input
          id="imageUrl"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <p className="text-xs text-text-muted">Logo or image displayed on organization cards and detail pages.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="parentId">Parent Organization</Label>
        <NativeSelect
          id="parentId"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
        >
          <option value="">None</option>
          {organizations
            .filter((o) => o.id !== initialData?.id)
            .map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
        </NativeSelect>
        <p className="text-xs text-text-muted">Creates a hierarchy. Sub-organizations appear nested under the parent.</p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData ? "Update" : "Create"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/organizations")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
