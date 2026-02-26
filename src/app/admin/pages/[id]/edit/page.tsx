"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { NAV_LOCATIONS, PAGE_TEMPLATES } from "@/lib/schemas/page";

interface PageData {
  id: string;
  title: string;
  slug: string;
  content: string;
  published: boolean;
  sortOrder: number;
  navLocation: string;
  parentId: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  imageUrl: string | null;
  template: string;
}

interface PageOption {
  id: string;
  title: string;
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
  const [navLocation, setNavLocation] = useState("header");
  const [parentId, setParentId] = useState("");
  const [template, setTemplate] = useState("default");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pageOptions, setPageOptions] = useState<PageOption[]>([]);

  useEffect(() => {
    async function load() {
      const { getPage, listPages } = await import("@/lib/actions/pages");
      const [p, allPages] = await Promise.all([
        getPage(params.id as string),
        listPages(),
      ]);
      if (p) {
        setPage(p as PageData);
        setTitle(p.title);
        setSlug(p.slug);
        setContent(p.content);
        setPublished(p.published);
        setSortOrder(p.sortOrder);
        setNavLocation(p.navLocation);
        setParentId(p.parentId || "");
        setTemplate(p.template);
        setMetaTitle(p.metaTitle || "");
        setMetaDescription(p.metaDescription || "");
        setImageUrl(p.imageUrl || "");
      }
      // Exclude self from parent options
      setPageOptions(
        allPages
          .filter((pg) => pg.id !== params.id)
          .map((pg) => ({ id: pg.id, title: pg.title }))
      );
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
          navLocation: navLocation as (typeof NAV_LOCATIONS)[number],
          parentId: parentId || null,
          template: template as (typeof PAGE_TEMPLATES)[number],
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
          imageUrl: imageUrl || undefined,
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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setImageUrl(data.publicUrl);
    } catch {
      setError("Failed to upload image");
    }
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
      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
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

        {/* Settings section */}
        <fieldset className="space-y-4 rounded border border-border p-4">
          <legend className="px-2 text-sm font-medium">Settings</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="navLocation">Nav Location</Label>
              <NativeSelect
                id="navLocation"
                value={navLocation}
                onChange={(e) => setNavLocation(e.target.value)}
              >
                {NAV_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc.charAt(0).toUpperCase() + loc.slice(1)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentPage">Parent Page</Label>
              <NativeSelect
                id="parentPage"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                <option value="">None (top-level)</option>
                {pageOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <NativeSelect
                id="template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              >
                {PAGE_TEMPLATES.map((tmpl) => (
                  <option key={tmpl} value={tmpl}>
                    {tmpl.charAt(0).toUpperCase() + tmpl.slice(1).replace("-", " ")}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-xs text-text-muted">
                {template === "full-width"
                  ? "Wide layout using more horizontal space. Max width 1280px."
                  : template === "sidebar"
                    ? "Wide layout with a left sidebar showing section navigation and table of contents."
                    : "Narrow, centered layout optimized for reading. Max width 896px."}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Published
          </label>
        </fieldset>

        {/* SEO section */}
        <fieldset className="space-y-4 rounded border border-border p-4">
          <legend className="px-2 text-sm font-medium">SEO</legend>
          <div className="space-y-2">
            <Label htmlFor="metaTitle">Meta Title (max 70 chars)</Label>
            <Input
              id="metaTitle"
              type="text"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              maxLength={70}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="metaDescription">Meta Description (max 160 chars)</Label>
            <Textarea
              id="metaDescription"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              maxLength={160}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroImage">Hero Image</Label>
            <div className="flex items-center gap-3">
              <Button type="button" variant="secondary" size="sm" asChild>
                <label className="cursor-pointer">
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </Button>
              {imageUrl && (
                <div className="flex items-center gap-2">
                  <img
                    src={imageUrl}
                    alt="Hero preview"
                    className="h-10 w-10 rounded object-cover"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageUrl("")}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </div>
        </fieldset>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Page"}
        </Button>
      </form>
    </div>
  );
}
