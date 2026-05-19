// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

import { logger } from "../logger";
import { toolError } from "./errors";
import { withToolErrorHandling } from "./helpers";

describe("withToolErrorHandling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured result on success without logging", async () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    const result = await withToolErrorHandling("test_tool", { id: "abc" }, async () => ({
      ok: true,
    }));

    expect("isError" in result ? result.isError : false).toBe(false);
    expect(result.structuredContent).toEqual({ ok: true });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("logs the error with tool name + args when a tool throws", async () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    const result = await withToolErrorHandling("query_dataset", { resourceId: "missing" }, async () => {
      throw toolError({
        errorType: "RESOURCE_NOT_FOUND",
        message: "Resource not found: missing",
      });
    });

    expect("isError" in result && result.isError).toBe(true);
    expect(result.structuredContent.errorType).toBe("RESOURCE_NOT_FOUND");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [payload, msg] = errorSpy.mock.calls[0]!;
    expect(payload).toMatchObject({
      tool: "query_dataset",
      args: { resourceId: "missing" },
    });
    expect((payload as { err: Error }).err).toBeInstanceOf(Error);
    expect(msg).toBe("mcp tool query_dataset failed");
  });
});
