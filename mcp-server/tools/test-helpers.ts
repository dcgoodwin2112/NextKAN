// @vitest-environment node
import type { Hono } from "hono";

const MCP_PROTOCOL_VERSION = "2025-11-25";

export interface ToolErrorPayload {
  errorType: string;
  message: string;
  [key: string]: unknown;
}

export interface ToolCallEnvelope<T = unknown> {
  jsonrpc: string;
  id: number;
  result?: {
    content: Array<{ type: string; text: string }>;
    structuredContent?: T | ToolErrorPayload;
    isError?: boolean;
  };
  error?: { code: number; message: string; data?: unknown };
}

/** Send a JSON-RPC request to /mcp and return the parsed JSON-RPC envelope. */
export async function callTool<T = unknown>(
  app: Hono,
  toolName: string,
  args: Record<string, unknown>,
): Promise<ToolCallEnvelope<T>> {
  const res = await app.request("/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1_000_000),
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  });
  return await res.json();
}

/** Parse the JSON text-content payload as a typed object. */
export function unpack<T>(envelope: {
  result?: { content: Array<{ type: string; text: string }> };
}): T {
  const text = envelope.result?.content?.[0]?.text;
  if (!text) throw new Error("Tool result has no text content");
  return JSON.parse(text) as T;
}
