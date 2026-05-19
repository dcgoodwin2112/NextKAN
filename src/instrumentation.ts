export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initSettingsCache } = await import("@/lib/services/settings");
    await initSettingsCache();
  }
}
