import { describe, it, expect, vi } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

import { addDistribution, removeDistribution } from "./datasets";

describe("addDistribution", () => {
  it("validates input", async () => {
    prismaMock.distribution.create.mockResolvedValue({
      id: "dist-1",
      title: "CSV Data",
      description: null,
      downloadURL: "https://example.com/data.csv",
      accessURL: null,
      mediaType: "text/csv",
      format: "CSV",
      conformsTo: null,
      describedBy: null,
      fileName: null,
      filePath: null,
      fileSize: null,
      datasetId: "ds-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await addDistribution("ds-1", {
      title: "CSV Data",
      downloadURL: "https://example.com/data.csv",
      mediaType: "text/csv",
      format: "CSV",
    });

    expect(result.title).toBe("CSV Data");
    expect(prismaMock.distribution.create).toHaveBeenCalled();
  });

  it("rejects when neither downloadURL nor accessURL provided", async () => {
    await expect(
      addDistribution("ds-1", { title: "Bad dist" })
    ).rejects.toThrow();
  });
});

describe("removeDistribution", () => {
  it("calls Prisma delete", async () => {
    prismaMock.distribution.delete.mockResolvedValue({} as any);
    await removeDistribution("dist-1");
    expect(prismaMock.distribution.delete).toHaveBeenCalledWith({
      where: { id: "dist-1" },
    });
  });
});
