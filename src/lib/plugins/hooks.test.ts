import { describe, it, expect, beforeEach } from "vitest";
import { HookRegistry } from "./hooks";

let registry: HookRegistry;

beforeEach(() => {
  registry = new HookRegistry();
});

describe("HookRegistry", () => {
  it("register adds callback to hook", () => {
    const cb = async () => "result";
    registry.register("test:hook", cb);
    // Verify by running
    return registry.run("test:hook").then((results) => {
      expect(results).toEqual(["result"]);
    });
  });

  it("run executes all registered callbacks in order", async () => {
    const order: number[] = [];
    registry.register("test:hook", async () => { order.push(1); return 1; });
    registry.register("test:hook", async () => { order.push(2); return 2; });
    registry.register("test:hook", async () => { order.push(3); return 3; });
    await registry.run("test:hook");
    expect(order).toEqual([1, 2, 3]);
  });

  it("run passes arguments to callbacks", async () => {
    let receivedArgs: any[] = [];
    registry.register("test:hook", async (...args) => {
      receivedArgs = args;
    });
    await registry.run("test:hook", "arg1", 42, { key: "value" });
    expect(receivedArgs).toEqual(["arg1", 42, { key: "value" }]);
  });

  it("run returns array of results", async () => {
    registry.register("test:hook", async () => "a");
    registry.register("test:hook", async () => "b");
    const results = await registry.run("test:hook");
    expect(results).toEqual(["a", "b"]);
  });

  it("run handles async callbacks", async () => {
    registry.register("test:hook", async () => {
      return new Promise((resolve) => setTimeout(() => resolve("async-result"), 10));
    });
    const results = await registry.run("test:hook");
    expect(results).toEqual(["async-result"]);
  });

  it("run returns empty array for unregistered hook name", async () => {
    const results = await registry.run("nonexistent:hook");
    expect(results).toEqual([]);
  });
});
