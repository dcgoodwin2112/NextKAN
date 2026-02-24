"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";

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
    if (!confirm("Are you sure you want to delete this page?")) return;
    startTransition(async () => {
      const { deletePage } = await import("@/lib/actions/pages");
      await deletePage(params.id as string);
      router.push("/admin/pages");
    });
  }

  if (!page) return <p>Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Edit Page</h1>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
        <div>
          <label className="block text-sm font-medium text-gray-700">
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
          <label className="block text-sm font-medium text-gray-700">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="text-sm font-medium text-gray-700 mr-2">
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
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Page"}
        </button>
      </form>
    </div>
  );
}
