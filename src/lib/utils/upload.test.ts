// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpload = vi.fn().mockResolvedValue("/uploads/mock-file.csv");

vi.mock(import("@/lib/storage/factory"), async () => {
  return {
    getStorageProvider: () => ({
      upload: mockUpload,
      delete: vi.fn(),
      getSignedUrl: vi.fn(),
    }),
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
    expect(result.publicUrl).toBe("/uploads/mock-file.csv");
  });

  it("delegates to storage provider", async () => {
    const file = createMockFile("report.json", "application/json", 200);
    const result = await saveUploadedFile(file);

    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/\.json$/),
      expect.any(Buffer),
      "application/json"
    );
    expect(result.mediaType).toBe("application/json");
    expect(result.fileSize).toBe(200);
  });
});
