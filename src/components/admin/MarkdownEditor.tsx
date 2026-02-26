"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { remark } from "remark";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type EditorMode = "edit" | "split" | "preview";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const [mode, setMode] = useState<EditorMode>("edit");
  const [renderedHtml, setRenderedHtml] = useState("");
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const renderMarkdown = useCallback(async (content: string) => {
    const result = await remark()
      .use(remarkRehype)
      .use(rehypeSanitize)
      .use(rehypeSlug)
      .use(rehypeStringify)
      .process(content);
    setRenderedHtml(result.toString());
  }, []);

  // Render preview on mode change
  useEffect(() => {
    if (mode === "preview") {
      renderMarkdown(value);
    }
  }, [mode, value, renderMarkdown]);

  // Debounced live preview in split mode
  useEffect(() => {
    if (mode !== "split") return;
    const timer = setTimeout(() => {
      renderMarkdown(value);
    }, 300);
    return () => clearTimeout(timer);
  }, [mode, value, renderMarkdown]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      // Insert markdown image at cursor
      const textarea = textareaRef.current;
      const imageMarkdown = `![${file.name}](${data.publicUrl})`;
      if (textarea) {
        const start = textarea.selectionStart;
        const before = value.slice(0, start);
        const after = value.slice(start);
        onChange(before + imageMarkdown + after);
      } else {
        onChange(value + "\n" + imageMarkdown);
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const previewPanel = (
    <div
      className="prose dark:prose-invert max-w-none rounded border border-border p-4 overflow-auto"
      style={{ minHeight: "20rem" }}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );

  return (
    <div>
      <div className="mb-2 flex gap-2 flex-wrap">
        <Button
          type="button"
          variant={mode === "edit" ? "default" : "secondary"}
          size="sm"
          onClick={() => setMode("edit")}
        >
          Edit
        </Button>
        <Button
          type="button"
          variant={mode === "split" ? "default" : "secondary"}
          size="sm"
          onClick={() => setMode("split")}
        >
          Split
        </Button>
        <Button
          type="button"
          variant={mode === "preview" ? "default" : "secondary"}
          size="sm"
          onClick={() => setMode("preview")}
        >
          Preview
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={uploading || mode === "preview"}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "Uploading..." : "Insert Image"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      {mode === "preview" ? (
        previewPanel
      ) : mode === "split" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="font-mono"
            rows={20}
            placeholder="Write your content in Markdown..."
          />
          {previewPanel}
        </div>
      ) : (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono"
          rows={20}
          placeholder="Write your content in Markdown..."
        />
      )}
    </div>
  );
}
