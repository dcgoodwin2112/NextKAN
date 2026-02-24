// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { getStorageProvider, resetStorageProvider } from "./factory";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";

describe("getStorageProvider", () => {
  beforeEach(() => {
    resetStorageProvider();
  });

  it("returns LocalStorage by default", () => {
    delete process.env.STORAGE_PROVIDER;
    const provider = getStorageProvider();
    expect(provider).toBeInstanceOf(LocalStorage);
  });

  it("returns LocalStorage when STORAGE_PROVIDER=local", () => {
    process.env.STORAGE_PROVIDER = "local";
    const provider = getStorageProvider();
    expect(provider).toBeInstanceOf(LocalStorage);
  });

  it("returns S3Storage when STORAGE_PROVIDER=s3", () => {
    process.env.STORAGE_PROVIDER = "s3";
    const provider = getStorageProvider();
    expect(provider).toBeInstanceOf(S3Storage);
  });

  it("returns same singleton on repeated calls", () => {
    delete process.env.STORAGE_PROVIDER;
    const a = getStorageProvider();
    const b = getStorageProvider();
    expect(a).toBe(b);
  });
});
