export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.ENABLE_PLUGINS === "true") {
    const { loadPlugins } = await import("@/lib/plugins/loader");
    await loadPlugins();
  }
}
