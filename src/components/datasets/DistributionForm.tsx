"use client";

import { useState } from "react";

interface DistributionFormProps {
  onAdd: (distribution: {
    title?: string;
    description?: string;
    downloadURL?: string;
    accessURL?: string;
    mediaType?: string;
    format?: string;
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
    });
  }

  return (
    <div className="rounded border bg-gray-50 p-4 space-y-3" data-testid="distribution-form">
      {error && (
        <div className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</div>
      )}
      <div>
        <label htmlFor="dist-title" className="block text-sm font-medium mb-1">
          Title
        </label>
        <input
          id="dist-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="dist-description" className="block text-sm font-medium mb-1">
          Description
        </label>
        <input
          id="dist-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="dist-file" className="block text-sm font-medium mb-1">
          Upload File
        </label>
        <input
          id="dist-file"
          type="file"
          onChange={handleFileUpload}
          disabled={uploading}
          className="text-sm"
        />
        {uploading && <span className="text-sm text-gray-500 ml-2">Uploading...</span>}
      </div>
      <div>
        <label htmlFor="dist-downloadURL" className="block text-sm font-medium mb-1">
          Download URL
        </label>
        <input
          id="dist-downloadURL"
          type="url"
          value={downloadURL}
          onChange={(e) => setDownloadURL(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="https://"
        />
      </div>
      <div>
        <label htmlFor="dist-accessURL" className="block text-sm font-medium mb-1">
          Access URL
        </label>
        <input
          id="dist-accessURL"
          type="url"
          value={accessURL}
          onChange={(e) => setAccessURL(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="https://"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="dist-mediaType" className="block text-sm font-medium mb-1">
            Media Type
          </label>
          <input
            id="dist-mediaType"
            type="text"
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="text/csv"
          />
        </div>
        <div>
          <label htmlFor="dist-format" className="block text-sm font-medium mb-1">
            Format
          </label>
          <input
            id="dist-format"
            type="text"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="CSV"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
        >
          Add Distribution
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
