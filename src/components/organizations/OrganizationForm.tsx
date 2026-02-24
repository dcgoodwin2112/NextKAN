"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Organization } from "@/generated/prisma/client";

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
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Name *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border px-3 py-2"
          required
        />
      </div>
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded border px-3 py-2"
          rows={3}
        />
      </div>
      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium mb-1">
          Image URL
        </label>
        <input
          id="imageUrl"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="parentId" className="block text-sm font-medium mb-1">
          Parent Organization
        </label>
        <select
          id="parentId"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="w-full rounded border px-3 py-2"
        >
          <option value="">None</option>
          {organizations
            .filter((o) => o.id !== initialData?.id)
            .map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-primary px-4 py-2 text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? "Saving..." : initialData ? "Update" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/organizations")}
          className="rounded border border-border px-4 py-2 hover:bg-surface"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
