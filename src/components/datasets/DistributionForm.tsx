"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface DistributionFormProps {
  onAdd: (distribution: {
    title?: string;
    description?: string;
    downloadURL?: string;
    accessURL?: string;
    mediaType?: string;
    format?: string;
    fileName?: string;
    filePath?: string;
    fileSize?: number;
  }) => void;
  onCancel: () => void;
}

export function DistributionForm({ onAdd, onCancel }: DistributionFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [downloadURL, setDownloadURL] = useState("");
  const [accessURL, setAccessURL] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [format, setFormat] = useState("");
  const [filePath, setFilePath] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState<number | undefined>();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      setDownloadURL(data.publicUrl);
      setMediaType(data.mediaType);
      setFilePath(data.filePath);
      setFileName(data.fileName);
      setFileSize(data.fileSize);
      if (!title) setTitle(file.name);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!downloadURL && !accessURL) {
      setError("Either download URL or access URL is required");
      return;
    }
    onAdd({
      title: title || undefined,
      description: description || undefined,
      downloadURL: downloadURL || undefined,
      accessURL: accessURL || undefined,
      mediaType: mediaType || undefined,
      format: format || undefined,
      fileName: fileName || undefined,
      filePath: filePath || undefined,
      fileSize: fileSize || undefined,
    });
  }

  return (
    <div className="rounded border border-border bg-surface p-4 space-y-3" data-testid="distribution-form">
      {error && (
        <div className="rounded bg-danger-subtle p-2 text-sm text-danger-text">{error}</div>
      )}
      <div className="space-y-2">
        <Label htmlFor="dist-title">Title</Label>
        <Input
          id="dist-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dist-description">Description</Label>
        <Input
          id="dist-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dist-file">Upload File</Label>
        <input
          id="dist-file"
          type="file"
          onChange={handleFileUpload}
          disabled={uploading}
          className="text-sm"
        />
        {uploading && <span className="text-sm text-text-muted ml-2">Uploading...</span>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="dist-downloadURL">Download URL</Label>
        <Input
          id="dist-downloadURL"
          type="url"
          value={downloadURL}
          onChange={(e) => setDownloadURL(e.target.value)}
          placeholder="https://"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dist-accessURL">Access URL</Label>
        <Input
          id="dist-accessURL"
          type="url"
          value={accessURL}
          onChange={(e) => setAccessURL(e.target.value)}
          placeholder="https://"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="dist-mediaType">Media Type</Label>
          <Input
            id="dist-mediaType"
            type="text"
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value)}
            placeholder="text/csv"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dist-format">Format</Label>
          <Input
            id="dist-format"
            type="text"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            placeholder="CSV"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleSubmit}
          className="bg-success hover:bg-success/90"
        >
          Add Distribution
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
