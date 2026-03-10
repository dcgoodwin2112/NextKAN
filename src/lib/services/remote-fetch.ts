import { prisma } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage/factory";
import { generateTableName } from "@/lib/services/datastore";
import { randomUUID } from "crypto";
import path from "path";

const REMOTE_DOWNLOAD_MAX_SIZE =
  parseInt(process.env.REMOTE_DOWNLOAD_MAX_SIZE || "") || 100 * 1024 * 1024;

const IMPORTABLE_MEDIA_TYPES = [
  "text/csv",
  "application/json",
  "application/geo+json",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

const EXTENSION_TO_MEDIA_TYPE: Record<string, string> = {
  ".csv": "text/csv",
  ".json": "application/json",
  ".geojson": "application/geo+json",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
};

const MEDIA_TYPE_TO_EXTENSION: Record<string, string> = {
  "text/csv": ".csv",
  "application/json": ".json",
  "application/geo+json": ".geojson",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-excel": ".xls",
};

/** Detect media type from Content-Type header, URL extension, or existing distribution value. */
export function detectMediaType(
  contentTypeHeader: string | null,
  url: string,
  existingMediaType: string | null
): string | null {
  // 1. Content-Type header (ignore application/octet-stream)
  if (contentTypeHeader) {
    const parsed = contentTypeHeader.split(";")[0].trim().toLowerCase();
    if (parsed && parsed !== "application/octet-stream") {
      return parsed;
    }
  }

  // 2. File extension from URL
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    if (ext && EXTENSION_TO_MEDIA_TYPE[ext]) {
      return EXTENSION_TO_MEDIA_TYPE[ext];
    }
  } catch {
    // Invalid URL — skip
  }

  // 3. Existing mediaType on distribution
  if (existingMediaType) {
    return existingMediaType;
  }

  return null;
}

/** Extract filename from URL pathname. Returns null for bare domains. */
export function extractFilenameFromURL(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;
    const last = segments[segments.length - 1];
    return decodeURIComponent(last);
  } catch {
    return null;
  }
}

/** Download a remote resource, save via storage provider, update distribution, and import if applicable. */
export async function fetchAndImportRemoteResource(
  distributionId: string,
  downloadURL: string
): Promise<void> {
  const distribution = await prisma.distribution.findUnique({
    where: { id: distributionId },
  });
  if (!distribution) return;

  try {
    const response = await fetch(downloadURL, {
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check Content-Length before downloading
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > REMOTE_DOWNLOAD_MAX_SIZE) {
      throw new Error(
        `File too large: ${contentLength} bytes exceeds ${REMOTE_DOWNLOAD_MAX_SIZE} byte limit`
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Check actual size
    if (buffer.length > REMOTE_DOWNLOAD_MAX_SIZE) {
      throw new Error(
        `File too large: ${buffer.length} bytes exceeds ${REMOTE_DOWNLOAD_MAX_SIZE} byte limit`
      );
    }

    const mediaType = detectMediaType(
      response.headers.get("content-type"),
      downloadURL,
      distribution.mediaType
    );

    // Determine extension for storage key
    const ext =
      (mediaType && MEDIA_TYPE_TO_EXTENSION[mediaType]) ||
      path.extname(new URL(downloadURL).pathname) ||
      "";

    const key = `${randomUUID()}${ext}`;
    const storage = getStorageProvider();
    await storage.upload(key, buffer, mediaType || "application/octet-stream");

    // Resolve file path for local storage
    const uploadDir = process.env.UPLOAD_DIR || "./public/uploads";
    const filePath = path.resolve(uploadDir, key);
    const fileName =
      extractFilenameFromURL(downloadURL) || `download${ext}`;

    // Update distribution record
    await prisma.distribution.update({
      where: { id: distributionId },
      data: {
        filePath,
        fileName,
        fileSize: buffer.length,
        ...(mediaType ? { mediaType } : {}),
      },
    });

    // Import into datastore if local storage and importable type
    const storageProvider = process.env.STORAGE_PROVIDER || "local";
    if (storageProvider === "local" && mediaType && IMPORTABLE_MEDIA_TYPES.includes(mediaType)) {
      // Re-fetch the updated distribution for import functions
      const updated = await prisma.distribution.findUnique({
        where: { id: distributionId },
      });
      if (!updated) return;

      if (mediaType === "text/csv") {
        const { importCsvToDatastore } = await import("@/lib/services/datastore");
        await importCsvToDatastore(updated);
      } else if (mediaType === "application/json") {
        const { importJsonToDatastore } = await import("@/lib/services/datastore");
        await importJsonToDatastore(updated);
      } else if (mediaType === "application/geo+json") {
        const { importGeoJsonToDatastore } = await import("@/lib/services/datastore");
        await importGeoJsonToDatastore(updated);
      } else if (
        mediaType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        mediaType === "application/vnd.ms-excel"
      ) {
        const { importExcelToDatastore } = await import("@/lib/services/datastore");
        await importExcelToDatastore(updated);
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown remote fetch error";
    const tableName = generateTableName(distributionId);

    await prisma.datastoreTable.create({
      data: {
        distributionId,
        tableName,
        columns: "[]",
        status: "error",
        errorMessage: message,
      },
    });
  }
}
