// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn().mockResolvedValue({});

vi.mock(import("@aws-sdk/client-s3"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    S3Client: class MockS3Client {
      send = mockSend;
      constructor() {}
    },
  };
});

vi.mock(import("@aws-sdk/s3-request-presigner"), async () => {
  return {
    getSignedUrl: vi.fn().mockResolvedValue("https://signed-url.example.com/file.csv"),
  };
});

import { S3Storage } from "./s3";

describe("S3Storage", () => {
  let storage: S3Storage;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.S3_BUCKET = "test-bucket";
    process.env.S3_REGION = "us-east-1";
    process.env.S3_ACCESS_KEY_ID = "test-key";
    process.env.S3_SECRET_ACCESS_KEY = "test-secret";
    storage = new S3Storage();
  });

  it("sends PutObjectCommand on upload", async () => {
    const data = Buffer.from("csv data");
    const url = await storage.upload("data.csv", data, "text/csv");

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input).toEqual({
      Bucket: "test-bucket",
      Key: "data.csv",
      Body: data,
      ContentType: "text/csv",
    });
    expect(url).toBe("https://test-bucket.s3.amazonaws.com/data.csv");
  });

  it("sends DeleteObjectCommand on delete", async () => {
    await storage.delete("data.csv");

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input).toEqual({
      Bucket: "test-bucket",
      Key: "data.csv",
    });
  });

  it("returns signed URL from getSignedUrl", async () => {
    const url = await storage.getSignedUrl("data.csv");
    expect(url).toBe("https://signed-url.example.com/file.csv");
  });
});
