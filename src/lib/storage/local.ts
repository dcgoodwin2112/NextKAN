import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import type { StorageProvider } from "./index";

export class LocalStorage implements StorageProvider {
  private uploadDir: string;

  constructor(uploadDir?: string) {
    this.uploadDir = uploadDir || process.env.UPLOAD_DIR || "./public/uploads";
  }

  async upload(key: string, data: Buffer, _contentType: string): Promise<string> {
    const dir = path.resolve(this.uploadDir);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, key), data);
    return `/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(path.resolve(this.uploadDir), key);
    await unlink(filePath);
  }

  async getSignedUrl(key: string): Promise<string> {
    return `/uploads/${key}`;
  }
}
