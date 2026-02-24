export interface StorageProvider {
  /** Upload a file and return its public URL */
  upload(key: string, data: Buffer, contentType: string): Promise<string>;
  /** Delete a file by key */
  delete(key: string): Promise<void>;
  /** Get a signed/public URL for a file */
  getSignedUrl(key: string): Promise<string>;
}
