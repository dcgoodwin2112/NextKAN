// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock(import("fs/promises"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
  };
});

import { LocalStorage } from "./local";
import { writeFile, mkdir, unlink } from "fs/promises";

describe("LocalStorage", () => {
  let storage: LocalStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new LocalStorage("./public/uploads");
  });

  it("creates directory and writes file on upload", async () => {
    const data = Buffer.from("test content");
    const url = await storage.upload("test.csv", data, "text/csv");

    expect(mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining("test.csv"), data);
    expect(url).toBe("/uploads/test.csv");
  });

  it("calls unlink on delete", async () => {
    await storage.delete("test.csv");
    expect(unlink).toHaveBeenCalledWith(expect.stringContaining("test.csv"));
  });

  it("returns public path for getSignedUrl", async () => {
    const url = await storage.getSignedUrl("test.csv");
    expect(url).toBe("/uploads/test.csv");
  });
});
