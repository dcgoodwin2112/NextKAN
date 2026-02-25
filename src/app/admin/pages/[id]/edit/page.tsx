"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";

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
        <div>
          <label className="block text-sm font-medium text-text-secondary">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary">
            Slug
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Content (Markdown)
          </label>
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
          <div>
            <label className="text-sm font-medium text-text-secondary mr-2">
              Sort Order
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              className="w-20 rounded border px-2 py-1 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-primary px-4 py-2 text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Page"}
        </button>
      </form>
    </div>
  );
}
