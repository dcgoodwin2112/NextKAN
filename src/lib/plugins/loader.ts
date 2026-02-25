import { type HookRegistry, hooks } from "./hooks";
import { getSetting } from "@/lib/services/settings";

export interface Plugin {
  name: string;
  version: string;
  register(hooks: HookRegistry): void;
}

export function isPluginsEnabled(): boolean {
  return getSetting("ENABLE_PLUGINS", "false") === "true";
}

let loaded = false;

/**
 * Load plugins from the `plugins/` directory. Only called from instrumentation.ts
 * at server startup. Uses eval-based require to prevent bundler static analysis.
 */
export async function loadPlugins(): Promise<Plugin[]> {
  if (!isPluginsEnabled() || loaded) return [];

  // Use eval to prevent the bundler from statically analyzing these requires
  // This is safe because loadPlugins only runs at server startup via instrumentation.ts
  const nodeRequire = eval("require") as NodeRequire;
  const fs = nodeRequire("fs") as typeof import("fs");
  const path = nodeRequire("path") as typeof import("path");
  const pluginsDir = path.join(process.cwd(), "plugins");

  if (!fs.existsSync(pluginsDir)) {
    loaded = true;
    return [];
  }

  const entries = fs.readdirSync(pluginsDir).filter((f: string) =>
    f.endsWith(".js") || f.endsWith(".ts")
  );

  const plugins: Plugin[] = [];

  for (const entry of entries) {
    try {
      const pluginPath = path.join(pluginsDir, entry);
      const mod = nodeRequire(pluginPath);
      const plugin: Plugin = mod.default || mod;

      if (plugin.name && plugin.version && typeof plugin.register === "function") {
        plugin.register(hooks);
        plugins.push(plugin);
      }
    } catch {
      // Graceful per-plugin error handling — one bad plugin doesn't break others
    }
  }

  loaded = true;
  return plugins;
}

/** Reset loaded flag — for testing only */
export function resetPluginLoader(): void {
  loaded = false;
}
