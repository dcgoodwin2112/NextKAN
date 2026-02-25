export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initSettingsCache } = await import("@/lib/services/settings");
    await initSettingsCache();

    if (process.env.ENABLE_PLUGINS === "true") {
      const { loadPlugins } = await import("@/lib/plugins/loader");
      await loadPlugins();
    }
  }
}
