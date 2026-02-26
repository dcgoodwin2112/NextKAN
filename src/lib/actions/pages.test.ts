import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", async () => {
  const mock = await import("@/__mocks__/prisma");
  return { prisma: mock.default };
});

vi.mock("@/lib/utils/slug", () => ({
  generateSlug: vi.fn((title: string) =>
    title.toLowerCase().replace(/\s+/g, "-")
  ),
}));

vi.mock("@/lib/services/activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

import { prismaMock } from "@/__mocks__/prisma";
import {
  createPage,
  updatePage,
  deletePage,
  getPageBySlug,
  getPage,
  listPages,
  listPublishedPages,
  listPublishedPagesByLocation,
  reorderPages,
} from "./pages";

describe("pages actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPage", () => {
    it("creates a page with generated slug", async () => {
      (prismaMock.page.create as any).mockResolvedValue({
        id: "page-1",
        title: "About Us",
        slug: "about-us",
        content: "# About",
        published: false,
        sortOrder: 0,
        navLocation: "header",
        template: "default",
      });

      const result = await createPage({
        title: "About Us",
        content: "# About",
        published: false,
        sortOrder: 0,
      });

      expect(prismaMock.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "About Us",
          slug: "about-us",
          content: "# About",
          published: false,
          sortOrder: 0,
          navLocation: "header",
          template: "default",
        }),
      });
      expect(result.title).toBe("About Us");
    });

    it("uses custom slug when provided", async () => {
      (prismaMock.page.create as any).mockResolvedValue({
        id: "page-2",
        slug: "custom-slug",
      });

      await createPage({
        title: "Test",
        slug: "custom-slug",
        content: "Content",
        published: false,
        sortOrder: 0,
      });

      expect(prismaMock.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ slug: "custom-slug" }),
      });
    });

    it("passes new fields to create", async () => {
      (prismaMock.page.create as any).mockResolvedValue({
        id: "page-3",
        title: "Footer Page",
        navLocation: "footer",
        parentId: "parent-1",
        metaTitle: "SEO Title",
        metaDescription: "SEO Description",
        imageUrl: "https://example.com/img.jpg",
        template: "full-width",
      });

      await createPage({
        title: "Footer Page",
        content: "Content",
        navLocation: "footer",
        parentId: "parent-1",
        metaTitle: "SEO Title",
        metaDescription: "SEO Description",
        imageUrl: "https://example.com/img.jpg",
        template: "full-width",
      });

      expect(prismaMock.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          navLocation: "footer",
          parentId: "parent-1",
          metaTitle: "SEO Title",
          metaDescription: "SEO Description",
          imageUrl: "https://example.com/img.jpg",
          template: "full-width",
        }),
      });
    });
  });

  describe("updatePage", () => {
    it("updates page fields", async () => {
      (prismaMock.page.update as any).mockResolvedValue({
        id: "page-1",
        title: "New Title",
      });

      await updatePage("page-1", {
        title: "New Title",
        published: true,
      });

      expect(prismaMock.page.update).toHaveBeenCalledWith({
        where: { id: "page-1" },
        data: expect.objectContaining({
          title: "New Title",
          published: true,
        }),
      });
    });

    it("updates new fields", async () => {
      (prismaMock.page.update as any).mockResolvedValue({
        id: "page-1",
        title: "Page",
        navLocation: "footer",
        template: "sidebar",
      });

      await updatePage("page-1", {
        navLocation: "footer",
        template: "sidebar",
        metaTitle: "Updated SEO",
        parentId: "parent-2",
      });

      expect(prismaMock.page.update).toHaveBeenCalledWith({
        where: { id: "page-1" },
        data: expect.objectContaining({
          navLocation: "footer",
          template: "sidebar",
          metaTitle: "Updated SEO",
          parentId: "parent-2",
        }),
      });
    });
  });

  describe("deletePage", () => {
    it("orphans children before deleting", async () => {
      (prismaMock.page.updateMany as any).mockResolvedValue({ count: 2 });
      (prismaMock.page.delete as any).mockResolvedValue({
        id: "page-1",
        title: "Deleted",
      });

      await deletePage("page-1");

      expect(prismaMock.page.updateMany).toHaveBeenCalledWith({
        where: { parentId: "page-1" },
        data: { parentId: null },
      });
      expect(prismaMock.page.delete).toHaveBeenCalledWith({
        where: { id: "page-1" },
      });
    });
  });

  describe("getPageBySlug", () => {
    it("finds page by slug with relations including siblings", async () => {
      (prismaMock.page.findUnique as any).mockResolvedValue({
        id: "page-1",
        slug: "about",
        parent: null,
        children: [],
      });

      const result = await getPageBySlug("about");

      expect(result?.slug).toBe("about");
      expect(prismaMock.page.findUnique).toHaveBeenCalledWith({
        where: { slug: "about" },
        include: {
          parent: {
            include: {
              children: {
                where: { published: true },
                orderBy: { sortOrder: "asc" },
                select: { id: true, title: true, slug: true },
              },
            },
          },
          children: { orderBy: { sortOrder: "asc" } },
        },
      });
    });
  });

  describe("getPage", () => {
    it("finds page by id with relations including siblings", async () => {
      (prismaMock.page.findUnique as any).mockResolvedValue({
        id: "page-1",
        parent: null,
        children: [],
      });

      await getPage("page-1");

      expect(prismaMock.page.findUnique).toHaveBeenCalledWith({
        where: { id: "page-1" },
        include: {
          parent: {
            include: {
              children: {
                where: { published: true },
                orderBy: { sortOrder: "asc" },
                select: { id: true, title: true, slug: true },
              },
            },
          },
          children: { orderBy: { sortOrder: "asc" } },
        },
      });
    });
  });

  describe("listPages", () => {
    it("returns all pages with parent relation", async () => {
      (prismaMock.page.findMany as any).mockResolvedValue([
        { id: "p1", sortOrder: 0, parent: null },
        { id: "p2", sortOrder: 1, parent: null },
      ]);

      const result = await listPages();

      expect(result).toHaveLength(2);
      expect(prismaMock.page.findMany).toHaveBeenCalledWith({
        orderBy: { sortOrder: "asc" },
        include: { parent: true },
      });
    });
  });

  describe("listPublishedPages", () => {
    it("returns only published top-level pages", async () => {
      (prismaMock.page.findMany as any).mockResolvedValue([
        { id: "p1", title: "About", slug: "about", navLocation: "header" },
      ]);

      const result = await listPublishedPages();

      expect(prismaMock.page.findMany).toHaveBeenCalledWith({
        where: { published: true, parentId: null },
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true, slug: true, navLocation: true },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("listPublishedPagesByLocation", () => {
    it("returns header pages including 'both'", async () => {
      (prismaMock.page.findMany as any).mockResolvedValue([
        { id: "p1", title: "About", slug: "about" },
      ]);

      await listPublishedPagesByLocation("header");

      expect(prismaMock.page.findMany).toHaveBeenCalledWith({
        where: {
          published: true,
          parentId: null,
          navLocation: { in: ["header", "both"] },
        },
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true, slug: true },
      });
    });

    it("returns footer pages including 'both'", async () => {
      (prismaMock.page.findMany as any).mockResolvedValue([]);

      await listPublishedPagesByLocation("footer");

      expect(prismaMock.page.findMany).toHaveBeenCalledWith({
        where: {
          published: true,
          parentId: null,
          navLocation: { in: ["footer", "both"] },
        },
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true, slug: true },
      });
    });
  });

  describe("reorderPages", () => {
    it("swaps sortOrder with adjacent sibling", async () => {
      (prismaMock.page.findUnique as any).mockResolvedValue({
        id: "p1",
        parentId: null,
        sortOrder: 0,
      });
      (prismaMock.page.findFirst as any).mockResolvedValue({
        id: "p2",
        parentId: null,
        sortOrder: 1,
      });
      (prismaMock.$transaction as any).mockResolvedValue([]);
      // Return value after swap
      (prismaMock.page.findUnique as any).mockResolvedValueOnce({
        id: "p1",
        parentId: null,
        sortOrder: 0,
      });

      await reorderPages("p1", "down");

      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it("returns page unchanged at boundary", async () => {
      (prismaMock.page.findUnique as any).mockResolvedValue({
        id: "p1",
        parentId: null,
        sortOrder: 0,
      });
      (prismaMock.page.findFirst as any).mockResolvedValue(null);

      const result = await reorderPages("p1", "up");

      expect(result).toEqual({ id: "p1", parentId: null, sortOrder: 0 });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("scopes reorder to same parent", async () => {
      (prismaMock.page.findUnique as any).mockResolvedValue({
        id: "child-1",
        parentId: "parent-1",
        sortOrder: 1,
      });
      (prismaMock.page.findFirst as any).mockResolvedValue(null);

      await reorderPages("child-1", "up");

      expect(prismaMock.page.findFirst).toHaveBeenCalledWith({
        where: {
          parentId: "parent-1",
          sortOrder: { lt: 1 },
        },
        orderBy: { sortOrder: "desc" },
      });
    });

    it("throws when page not found", async () => {
      (prismaMock.page.findUnique as any).mockResolvedValue(null);

      await expect(reorderPages("nonexistent", "up")).rejects.toThrow(
        "Page not found"
      );
    });
  });
});
