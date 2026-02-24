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

import { prismaMock } from "@/__mocks__/prisma";
import {
  createPage,
  updatePage,
  deletePage,
  getPageBySlug,
  listPages,
  listPublishedPages,
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
  });

  describe("deletePage", () => {
    it("deletes a page", async () => {
      (prismaMock.page.delete as any).mockResolvedValue({ id: "page-1" });

      await deletePage("page-1");

      expect(prismaMock.page.delete).toHaveBeenCalledWith({
        where: { id: "page-1" },
      });
    });
  });

  describe("getPageBySlug", () => {
    it("finds page by slug", async () => {
      (prismaMock.page.findUnique as any).mockResolvedValue({
        id: "page-1",
        slug: "about",
      });

      const result = await getPageBySlug("about");

      expect(result?.slug).toBe("about");
    });
  });

  describe("listPages", () => {
    it("returns all pages ordered by sortOrder", async () => {
      (prismaMock.page.findMany as any).mockResolvedValue([
        { id: "p1", sortOrder: 0 },
        { id: "p2", sortOrder: 1 },
      ]);

      const result = await listPages();

      expect(result).toHaveLength(2);
      expect(prismaMock.page.findMany).toHaveBeenCalledWith({
        orderBy: { sortOrder: "asc" },
      });
    });
  });

  describe("listPublishedPages", () => {
    it("returns only published pages", async () => {
      (prismaMock.page.findMany as any).mockResolvedValue([
        { id: "p1", title: "About", slug: "about" },
      ]);

      const result = await listPublishedPages();

      expect(prismaMock.page.findMany).toHaveBeenCalledWith({
        where: { published: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true, slug: true },
      });
      expect(result).toHaveLength(1);
    });
  });
});
