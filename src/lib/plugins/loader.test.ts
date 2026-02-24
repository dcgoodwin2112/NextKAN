import { describe, it, expect, vi, afterEach } from "vitest";
import { isPluginsEnabled, loadPlugins, resetPluginLoader } from "./loader";

afterEach(() => {
  vi.unstubAllEnvs();
  resetPluginLoader();
});

describe("isPluginsEnabled", () => {
  it("returns false when ENABLE_PLUGINS is not set", () => {
    expect(isPluginsEnabled()).toBe(false);
  });

  it("returns true when ENABLE_PLUGINS is 'true'", () => {
    vi.stubEnv("ENABLE_PLUGINS", "true");
    expect(isPluginsEnabled()).toBe(true);
  });
});

describe("loadPlugins", () => {
  it("returns empty array when plugins disabled", async () => {
    const result = await loadPlugins();
    expect(result).toEqual([]);
  });

  it("handles missing plugins directory gracefully", async () => {
    vi.stubEnv("ENABLE_PLUGINS", "true");
    // plugins/ dir doesn't exist by default in the test env
    const result = await loadPlugins();
    expect(result).toEqual([]);
  });
});
