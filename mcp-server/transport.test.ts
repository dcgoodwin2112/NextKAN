// @vitest-environment node
import { describe, expect, it } from "vitest";

import { buildApp } from "./transport";

const MCP_PROTOCOL_VERSION = "2025-11-25";

async function initializeRequest(app: ReturnType<typeof buildApp>["app"]) {
  return app.request("/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "test-client", version: "0.0.0" },
      },
    }),
  });
}

describe("buildApp", () => {
  it("responds to /health", async () => {
    const { app } = buildApp();
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("nextkan-mcp");
  });

  it("advertises the six tools via tools/list", async () => {
    const { app } = buildApp();
    const res = await app.request("/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result?: { tools: Array<{ name: string }> };
      error?: unknown;
    };
    expect(body.error).toBeUndefined();
    const names = body.result?.tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "aggregate_dataset",
      "get_dataset",
      "get_schema",
      "list_datasets",
      "query_dataset",
      "sample_dataset",
    ]);
  });

  it("handles the MCP initialize handshake", async () => {
    const { app } = buildApp();
    const res = await initializeRequest(app);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      jsonrpc: string;
      id: number;
      result?: { protocolVersion: string; serverInfo: { name: string } };
      error?: unknown;
    };
    expect(body.jsonrpc).toBe("2.0");
    expect(body.error).toBeUndefined();
    expect(body.result?.protocolVersion).toBeTruthy();
    expect(body.result?.serverInfo.name).toBe("nextkan-mcp");
  });
});
