// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSession, mockUploadResult, mockUploadError } = vi.hoisted(() => ({
  mockSession: { value: { user: { id: "user-1" } } as unknown },
  mockUploadResult: {
    value: {
      fileName: "data.csv",
      filePath: "/uploads/uuid.csv",
      publicUrl: "/uploads/uuid.csv",
      fileSize: 9,
      mediaType: "text/csv",
    } as unknown,
  },
  mockUploadError: { value: null as Error | null },
}));

vi.mock("@/lib/auth", () => ({
  auth: () => Promise.resolve(mockSession.value),
}));

vi.mock("@/lib/utils/upload", () => ({
  saveUploadedFile: () => {
    if (mockUploadError.value) return Promise.reject(mockUploadError.value);
    return Promise.resolve(mockUploadResult.value);
  },
}));

import { POST } from "./route";

function buildRequest(file?: File) {
  const formData = new FormData();
  if (file) formData.append("file", file);
  return new Request("http://localhost:3000/api/upload", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/upload", () => {
  beforeEach(() => {
    mockSession.value = { user: { id: "user-1" } };
    mockUploadError.value = null;
    mockUploadResult.value = {
      fileName: "data.csv",
      filePath: "/uploads/uuid.csv",
      publicUrl: "/uploads/uuid.csv",
      fileSize: 9,
      mediaType: "text/csv",
    };
  });

  it("returns 400 when no file provided", async () => {
    const req = buildRequest();
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("No file provided");
  });

  it("returns 400 for disallowed file types", async () => {
    mockUploadError.value = new Error(
      "File type application/x-msdownload is not allowed"
    );
    const file = new File(["data"], "test.exe", {
      type: "application/x-msdownload",
    });
    const req = buildRequest(file);
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("returns 201 with result for valid file", async () => {
    const file = new File(["test,data"], "data.csv", { type: "text/csv" });
    const req = buildRequest(file);
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.fileName).toBe("data.csv");
  });

  it("rejects unauthenticated requests", async () => {
    mockSession.value = null;
    const file = new File(["test"], "data.csv", { type: "text/csv" });
    const req = buildRequest(file);
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });
});
