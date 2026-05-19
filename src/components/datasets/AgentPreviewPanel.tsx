"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  buildToolCallPreviews,
  type PreviewDataset,
  type ToolCallPreview,
} from "@/lib/agent-preview";

interface AgentPreviewPanelProps {
  dataset: PreviewDataset;
  /** Full MCP endpoint URL, e.g. "http://localhost:3001/mcp". */
  mcpUrl: string;
}

interface ResponseState {
  pending: boolean;
  body?: unknown;
  error?: string;
  ms?: number;
}

export function AgentPreviewPanel({ dataset, mcpUrl }: AgentPreviewPanelProps) {
  const previews = useMemo(() => buildToolCallPreviews(dataset), [dataset]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">
        These are the JSON-RPC calls an MCP client would make against this
        dataset. Click <em>Try it</em> to hit the local MCP server at{" "}
        <code className="font-mono">{mcpUrl}</code>.
      </p>
      <div className="space-y-2">
        {previews.map((preview) => (
          <PreviewCard key={preview.name} preview={preview} mcpUrl={mcpUrl} />
        ))}
      </div>
    </div>
  );
}

function PreviewCard({
  preview,
  mcpUrl,
}: {
  preview: ToolCallPreview;
  mcpUrl: string;
}) {
  const [response, setResponse] = useState<ResponseState>({ pending: false });
  const [isPending, startTransition] = useTransition();

  const payload = useMemo(
    () => ({
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1_000_000),
      method: "tools/call",
      params: { name: preview.name, arguments: preview.arguments },
    }),
    [preview],
  );

  function handleTry() {
    setResponse({ pending: true });
    startTransition(async () => {
      const start = performance.now();
      try {
        const res = await fetch(mcpUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
            "MCP-Protocol-Version": "2025-11-25",
          },
          body: JSON.stringify(payload),
        });
        const ms = Math.round(performance.now() - start);
        if (!res.ok) {
          setResponse({
            pending: false,
            error: `HTTP ${res.status} ${res.statusText}`,
            ms,
          });
          return;
        }
        const body = await res.json();
        setResponse({ pending: false, body, ms });
      } catch (err) {
        setResponse({
          pending: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }

  const disabled = preview.unavailable != null;

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <code className="font-mono text-sm">{preview.name}</code>
          {preview.synthesized && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-text-muted">
              example values
            </span>
          )}
          {disabled && (
            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
              unavailable
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleTry}
          disabled={disabled || isPending}
        >
          {isPending ? "Calling…" : "Try it"}
        </Button>
      </div>
      <p className="mt-1 text-xs text-text-muted">{preview.description}</p>
      {preview.unavailable && (
        <p className="mt-1 text-xs text-destructive">{preview.unavailable}</p>
      )}
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-text-muted">
          Request payload
        </summary>
        <pre className="mt-1 overflow-x-auto rounded bg-muted/30 p-2 text-xs">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </details>
      {response.body !== undefined && (
        <details open className="mt-2">
          <summary className="cursor-pointer text-xs text-text-muted">
            Response{response.ms != null ? ` (${response.ms} ms)` : ""}
          </summary>
          <pre className="mt-1 max-h-72 overflow-auto rounded bg-muted/30 p-2 text-xs">
            {JSON.stringify(response.body, null, 2)}
          </pre>
        </details>
      )}
      {response.error && (
        <p className="mt-2 text-xs text-destructive">Error: {response.error}</p>
      )}
    </div>
  );
}
