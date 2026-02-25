"use client";

import { useState } from "react";
import { remark } from "remark";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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
        <Button
          type="button"
          variant={preview ? "default" : "secondary"}
          size="sm"
          onClick={togglePreview}
        >
          {preview ? "Edit" : "Preview"}
        </Button>
      </div>
      {preview ? (
        <div
          className="prose dark:prose-invert max-w-none rounded border border-border p-4"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      ) : (
        <Textarea
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
