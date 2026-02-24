import path from "path";
import { randomUUID } from "crypto";
import { getStorageProvider } from "@/lib/storage/factory";

export const ALLOWED_TYPES = [
  "text/csv",
  "application/json",
  "application/xml",
  "text/xml",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/geo+json",
  "text/plain",
  "application/zip",
];

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export interface UploadResult {
  fileName: string;
  filePath: string;
  publicUrl: string;
  fileSize: number;
  mediaType: string;
}

export async function saveUploadedFile(file: File): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
    );
  }

  const ext = path.extname(file.name);
  const key = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const storage = getStorageProvider();
  const publicUrl = await storage.upload(key, buffer, file.type);

  return {
    fileName: file.name,
    filePath: key,
    publicUrl,
    fileSize: file.size,
    mediaType: file.type,
  };
}
