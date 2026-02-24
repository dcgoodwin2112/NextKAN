// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock(import("fs/promises"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  };
});

import { saveUploadedFile } from "./upload";

function createMockFile(name: string, type: string, size: number): File {
  const buffer = new ArrayBuffer(Math.min(size, 1024));
  const file = new File([buffer], name, { type });
  if (size > 1024) {
    Object.defineProperty(file, "size", { value: size });
  }
  return file;
}

describe("saveUploadedFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects disallowed MIME types", async () => {
    const file = createMockFile("test.exe", "application/x-msdownload", 100);
    await expect(saveUploadedFile(file)).rejects.toThrow(
      "File type application/x-msdownload is not allowed"
    );
  });

  it("rejects files exceeding size limit", async () => {
    const file = createMockFile("big.csv", "text/csv", 101 * 1024 * 1024);
    await expect(saveUploadedFile(file)).rejects.toThrow(/exceeds/);
  });

  it("generates a unique filename with correct extension", async () => {
    const file = createMockFile("data.csv", "text/csv", 100);
    const result = await saveUploadedFile(file);
    expect(result.fileName).toBe("data.csv");
    expect(result.publicUrl).toMatch(/\/uploads\/.*\.csv$/);
  });

  it("returns correct publicUrl path", async () => {
    const file = createMockFile("report.json", "application/json", 200);
    const result = await saveUploadedFile(file);
    expect(result.publicUrl).toMatch(/^\/uploads\//);
    expect(result.publicUrl).toMatch(/\.json$/);
    expect(result.mediaType).toBe("application/json");
    expect(result.fileSize).toBe(200);
  });
});
