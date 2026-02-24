"use client";

import { useState } from "react";

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
      setError("Version is required");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(version.trim(), changelog.trim() || undefined);
      setVersion("");
      setChangelog("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create version");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="version" className="block text-sm font-medium text-text-secondary">
          Version
        </label>
        <input
          id="version"
          type="text"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="e.g. 1.0.0"
          className="mt-1 block w-full rounded border border-input-border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="changelog" className="block text-sm font-medium text-text-secondary">
          Changelog (optional)
        </label>
        <textarea
          id="changelog"
          value={changelog}
          onChange={(e) => setChangelog(e.target.value)}
          placeholder="Describe what changed..."
          rows={2}
          className="mt-1 block w-full rounded border border-input-border px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create Version"}
      </button>
    </form>
  );
}
