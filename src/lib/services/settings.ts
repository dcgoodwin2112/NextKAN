import { prisma } from "@/lib/db";

/** All DB-backed setting keys with their defaults */
const SETTING_DEFAULTS: Record<string, string> = {
  SITE_NAME: "NextKAN",
  SITE_DESCRIPTION: "Open data catalog — browse and download public datasets",
  SITE_URL: "http://localhost:3000",
  SITE_LOGO: "",
  HERO_TITLE: "",
  HERO_DESCRIPTION: "",
  ENABLE_COMMENTS: "false",
  COMMENT_MODERATION: "true",
  ENABLE_WORKFLOW: "false",
  ENABLE_PLUGINS: "false",
  DCAT_US_VERSION: "v1.1",
  HARVEST_API_KEY: "",
  USER_REGISTRATION_MODE: "disabled",
  USER_DEFAULT_ROLE: "viewer",
  ENABLE_PUBLIC_FRONTEND: "true",
  BANNER_TEXT: "",
  FOOTER_ABOUT: "",
};

export const SETTING_KEYS = Object.keys(SETTING_DEFAULTS);

let cache: Map<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000;

/** Synchronous read — cache → env → fallback. Zero caller changes needed. */
export function getSetting(key: string, fallback?: string): string {
  if (cache && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
  }
  return process.env[key] || fallback || SETTING_DEFAULTS[key] || "";
}

/** Load all settings from DB into cache, return current values for all 12 keys */
export async function getAllSettings(): Promise<Record<string, string>> {
  await refreshCache();
  const result: Record<string, string> = {};
  for (const key of SETTING_KEYS) {
    result[key] = getSetting(key);
  }
  return result;
}

/** Upsert a single setting */
export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  invalidateCache();
}

/** Upsert multiple settings at once */
export async function setSettings(
  settings: Record<string, string>
): Promise<void> {
  const ops = Object.entries(settings).map(([key, value]) =>
    prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  );
  await Promise.all(ops);
  invalidateCache();
}

/** Eagerly load settings into cache. Called at server startup. */
export async function initSettingsCache(): Promise<void> {
  await refreshCache();
}

/** Reset cache — for testing only */
export function resetSettingsCache(): void {
  cache = null;
  cacheTimestamp = 0;
}

async function refreshCache(): Promise<void> {
  const rows = await prisma.setting.findMany();
  cache = new Map();
  // Start with defaults
  for (const [key, val] of Object.entries(SETTING_DEFAULTS)) {
    // env var takes precedence over default, DB value takes precedence over env
    cache.set(key, process.env[key] || val);
  }
  // DB values override
  for (const row of rows) {
    cache.set(row.key, row.value);
  }
  cacheTimestamp = Date.now();
}

export function getUserRegistrationMode(): "disabled" | "approval" | "open" {
  return getSetting("USER_REGISTRATION_MODE", "disabled") as "disabled" | "approval" | "open";
}

export function getUserDefaultRole(): string {
  return getSetting("USER_DEFAULT_ROLE", "viewer");
}

export function isPublicFrontendEnabled(): boolean {
  return getSetting("ENABLE_PUBLIC_FRONTEND") === "true";
}

function invalidateCache(): void {
  cache = null;
  cacheTimestamp = 0;
}
