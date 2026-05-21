import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

import type { McpTokenAuth, validateMcpToken } from "@/lib/services/api-tokens";

import { mcpAuthContext } from "../context";
import { createAuthMiddleware } from "./auth";

type Validate = typeof validateMcpToken;

function fakeUser(overrides: Partial<McpTokenAuth["user"]> = {}): McpTokenAuth["user"] {
  return {
    id: "user-1",
    email: "user@example.com",
    name: "Test User",
    role: "admin",
    organizationId: null,
    ...overrides,
  };
}

/** Build an app where the auth middleware runs first, and the test route
 *  echoes whatever it found in `mcpAuthContext` so we can assert on it. */
function makeApp(validate: Validate) {
  const app = new Hono();
  app.use("*", createAuthMiddleware({ validate }));
  app.all("/mcp", (c) => {
    const auth = mcpAuthContext.getStore();
    return c.json({ auth: auth ?? null });
  });
  return app;
}

describe("createAuthMiddleware", () => {
  it("passes through with null context when no Authorization header is present", async () => {
    const validate: Validate = vi.fn(async () => null);
    const app = makeApp(validate);

    const res = await app.request("/mcp", { method: "POST" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { auth: unknown };
    expect(body.auth).toBeNull();
    expect(validate).not.toHaveBeenCalled();
  });

  it("treats an empty Authorization value as anonymous", async () => {
    const validate: Validate = vi.fn(async () => null);
    const app = makeApp(validate);

    const res = await app.request("/mcp", {
      method: "POST",
      headers: { Authorization: "   " },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { auth: unknown };
    expect(body.auth).toBeNull();
    expect(validate).not.toHaveBeenCalled();
  });

  it("populates the context with the resolved auth on a valid bearer", async () => {
    const validate: Validate = vi.fn(async () => ({
      user: fakeUser(),
      scope: "admin",
      rateLimitMultiplier: 5,
    }));
    const app = makeApp(validate);

    const res = await app.request("/mcp", {
      method: "POST",
      headers: { Authorization: "Bearer nkan_valid" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { auth: McpTokenAuth };
    expect(body.auth.scope).toBe("admin");
    expect(body.auth.rateLimitMultiplier).toBe(5);
    expect(body.auth.user.id).toBe("user-1");
    expect(validate).toHaveBeenCalledWith("Bearer nkan_valid");
  });

  it("returns 401 with JSON-RPC -32003 envelope when the bearer is invalid", async () => {
    const validate: Validate = vi.fn(async () => null);
    const app = makeApp(validate);

    const res = await app.request("/mcp", {
      method: "POST",
      headers: { Authorization: "Bearer nkan_garbage" },
    });
    expect(res.status).toBe(401);

    const body = (await res.json()) as {
      jsonrpc: string;
      id: unknown;
      error: { code: number; message: string; data?: { errorType?: string } };
    };
    expect(body.jsonrpc).toBe("2.0");
    expect(body.id).toBeNull();
    expect(body.error.code).toBe(-32003);
    expect(body.error.message).toBe("Invalid bearer token");
    expect(body.error.data?.errorType).toBe("UNAUTHORIZED");
  });

  it("returns 401 for a non-Bearer Authorization header (anything that fails to validate)", async () => {
    const validate: Validate = vi.fn(async () => null);
    const app = makeApp(validate);

    const res = await app.request("/mcp", {
      method: "POST",
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(res.status).toBe(401);
    // The validator is the single source of truth for "is this a valid
    // credential" — middleware should not pre-filter by scheme.
    expect(validate).toHaveBeenCalledWith("Basic dXNlcjpwYXNz");
  });

  it("does not let the auth context leak across requests", async () => {
    let firstSeen: unknown = "untouched";
    let secondSeen: unknown = "untouched";

    const validate: Validate = vi.fn(async () => ({
      user: fakeUser(),
      scope: "admin",
      rateLimitMultiplier: 1,
    }));

    const app = new Hono();
    app.use("*", createAuthMiddleware({ validate }));
    app.all("/mcp", (c) => {
      const auth = mcpAuthContext.getStore();
      if (c.req.header("x-test-tag") === "first") firstSeen = auth ?? null;
      else secondSeen = auth ?? null;
      return c.text("ok");
    });

    await app.request("/mcp", {
      method: "POST",
      headers: { Authorization: "Bearer nkan_valid", "x-test-tag": "first" },
    });
    await app.request("/mcp", {
      method: "POST",
      headers: { "x-test-tag": "second" },
    });

    expect((firstSeen as McpTokenAuth | null)?.scope).toBe("admin");
    expect(secondSeen).toBeNull();
  });
});
