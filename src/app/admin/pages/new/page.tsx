"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function NewPagePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const { createPage } = await import("@/lib/actions/pages");
        await createPage({
          title,
          slug: slug || undefined,
          content,
          published,
          sortOrder,
        });
        router.push("/admin/pages");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create page");
      }
    });
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Pages", href: "/admin/pages" },
          { label: "New Page" },
        ]}
      />
      <AdminPageHeader title="New Page" />
      {error && (
        <div className="mb-4 rounded bg-danger-subtle p-3 text-sm text-danger-text">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug (auto-generated if empty)</Label>
          <Input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="about-us"
          />
        </div>
        <div className="space-y-2">
          <Label>Content (Markdown)</Label>
          <MarkdownEditor value={content} onChange={setContent} />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Published
          </label>
          <div className="flex items-center gap-2">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input
              id="sortOrder"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              className="w-20"
            />
          </div>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create Page"}
        </Button>
      </form>
    </div>
  );
}
