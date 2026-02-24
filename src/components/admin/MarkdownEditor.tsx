"use client";

import { useState } from "react";
import { remark } from "remark";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const [preview, setPreview] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState("");

  async function togglePreview() {
    if (!preview) {
      const result = await remark()
        .use(remarkRehype)
        .use(rehypeSanitize)
        .use(rehypeStringify)
        .process(value);
      setRenderedHtml(result.toString());
    }
    setPreview(!preview);
  }

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <button
          type="button"
          onClick={togglePreview}
          className={`rounded px-3 py-1 text-sm ${
            preview
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {preview ? "Edit" : "Preview"}
        </button>
      </div>
      {preview ? (
        <div
          className="prose max-w-none rounded border p-4"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border p-3 font-mono text-sm"
          rows={20}
          placeholder="Write your content in Markdown..."
        />
      )}
    </div>
  );
}
