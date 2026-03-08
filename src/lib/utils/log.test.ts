import { describe, it, expect, vi } from "vitest";
import { silentCatch } from "./log";

describe("silentCatch", () => {
  it("does not throw on rejected promise", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = Promise.reject(new Error("test error"));

    silentCatch(failing, "test-context");

    // Give the microtask queue time to process
    await new Promise((r) => setTimeout(r, 10));

    expect(consoleSpy).toHaveBeenCalledWith(
      "[test-context]",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it("does nothing on resolved promise", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    silentCatch(Promise.resolve("ok"), "test-context");

    await new Promise((r) => setTimeout(r, 10));
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
