import type { StorageProvider } from "./index";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";

let instance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (instance) return instance;

  const provider = process.env.STORAGE_PROVIDER || "local";

  if (provider === "s3") {
    instance = new S3Storage();
  } else {
    instance = new LocalStorage();
  }

  return instance;
}

/** Reset singleton (for testing) */
export function resetStorageProvider(): void {
  instance = null;
}
