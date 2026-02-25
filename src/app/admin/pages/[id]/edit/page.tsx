"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface PageData {
  id: string;
  title: string;
  slug: string;
  content: string;
  published: boolean;
  sortOrder: number;
}

export default function EditPagePage() {
  const params = useParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<PageData | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  useEffect(() => {
    async function load() {
      const { getPage } = await import("@/lib/actions/pages");
      const p = await getPage(params.id as string);
      if (p) {
        setPage(p);
        setTitle(p.title);
        setSlug(p.slug);
        setContent(p.content);
        setPublished(p.published);
        setSortOrder(p.sortOrder);
      }
    }
    load();
  }, [params.id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const { updatePage } = await import("@/lib/actions/pages");
        await updatePage(params.id as string, {
          title,
          slug,
          content,
          published,
          sortOrder,
        });
        router.push("/admin/pages");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update page");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const { deletePage } = await import("@/lib/actions/pages");
      await deletePage(params.id as string);
      router.push("/admin/pages");
    });
  }

  if (!page) return <p>Loading...</p>;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Pages", href: "/admin/pages" },
          { label: "Edit Page" },
        ]}
      />
      <AdminPageHeader title="Edit Page">
        <ConfirmDeleteButton entityName="this page" onConfirm={handleDelete} />
      </AdminPageHeader>
      {error && (
        <div className="mb-4 rounded bg-danger-subtle p-3 text-sm text-danger-text">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Slug</Label>
          <Input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
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
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              className="w-20"
            />
          </div>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Page"}
        </Button>
      </form>
    </div>
  );
}
