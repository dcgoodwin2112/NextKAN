import { describe, it, expect, vi } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

import { generateSlug, ensureUniqueSlug } from "./slug";

describe("generateSlug", () => {
  it("lowercases and hyphenates", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("strips special characters", () => {
    expect(generateSlug("Test & Data!")).toBe("test-and-data");
  });
});

describe("ensureUniqueSlug", () => {
  it("returns candidate when no collision", async () => {
    prismaMock.dataset.findFirst.mockResolvedValue(null);
    const result = await ensureUniqueSlug("test-dataset");
    expect(result).toBe("test-dataset");
  });

  it("appends suffix on collision", async () => {
    prismaMock.dataset.findFirst
      .mockResolvedValueOnce({ id: "existing" } as any)
      .mockResolvedValueOnce(null);
    const result = await ensureUniqueSlug("test-dataset");
    expect(result).toBe("test-dataset-2");
  });

  it("increments suffix until unique", async () => {
    prismaMock.dataset.findFirst
      .mockResolvedValueOnce({ id: "existing-1" } as any)
      .mockResolvedValueOnce({ id: "existing-2" } as any)
      .mockResolvedValueOnce(null);
    const result = await ensureUniqueSlug("my-dataset");
    expect(result).toBe("my-dataset-3");
  });

  it("excludes current dataset id on update", async () => {
    prismaMock.dataset.findFirst.mockResolvedValue(null);
    await ensureUniqueSlug("test-dataset", "ds-1");
    expect(prismaMock.dataset.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: "ds-1" },
        }),
      })
    );
  });
});
