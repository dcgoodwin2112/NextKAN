// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { MiddlewareHandler } from "hono";

import { mcpAuthContext, type McpAuthContext } from "./context";
import { buildApp } from "./transport";

const MCP_PROTOCOL_VERSION = "2025-11-25";

function adminAuthMiddleware(): MiddlewareHandler {
  const auth: McpAuthContext = {
    user: {
      id: "user-admin",
      email: "admin@example.com",
      name: "Admin",
      role: "admin",
      organizationId: null,
    },
    scope: "admin",
    rateLimitMultiplier: 1,
  };
  return async (_c, next) => mcpAuthContext.run(auth, () => next());
}

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

  it("advertises only the six public tools to anonymous clients via tools/list", async () => {
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
    // Sanity: the admin tool's name does not leak into anonymous discovery.
    expect(names).not.toContain("update_dataset_description");
  });

  it("exposes admin tools to admin-scoped clients via tools/list", async () => {
    const { app } = buildApp({ authMiddleware: adminAuthMiddleware() });
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
    };
    const names = body.result?.tools.map((t) => t.name) ?? [];
    expect(names).toContain("update_dataset_description");
    // Public tools remain available alongside the admin tools.
    expect(names).toContain("get_dataset");
    expect(names.length).toBe(7);
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
