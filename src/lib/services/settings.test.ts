import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/db", async () => ({
  prisma: (await import("@/__mocks__/prisma")).default,
}));

import { prismaMock } from "@/__mocks__/prisma";
import {
  getSetting,
  getAllSettings,
  setSetting,
  setSettings,
  initSettingsCache,
  resetSettingsCache,
  SETTING_KEYS,
  getUserRegistrationMode,
  getUserDefaultRole,
} from "./settings";

describe("settings service", () => {
  beforeEach(() => {
    resetSettingsCache();
    vi.resetAllMocks();
  });

  afterEach(() => {
    resetSettingsCache();
    delete process.env.SITE_NAME;
    delete process.env.ENABLE_COMMENTS;
    delete process.env.USER_REGISTRATION_MODE;
    delete process.env.USER_DEFAULT_ROLE;
  });

  describe("getSetting", () => {
    it("returns default when cache is empty and no env var", () => {
      expect(getSetting("SITE_NAME")).toBe("NextKAN");
    });

    it("returns env var when cache is empty", () => {
      process.env.SITE_NAME = "EnvCatalog";
      expect(getSetting("SITE_NAME")).toBe("EnvCatalog");
    });

    it("returns explicit fallback when cache is empty and no env/default", () => {
      expect(getSetting("UNKNOWN_KEY", "fb")).toBe("fb");
    });

    it("returns empty string for unknown key with no fallback", () => {
      expect(getSetting("TOTALLY_UNKNOWN")).toBe("");
    });

    it("returns cached value after cache is populated", async () => {
      prismaMock.setting.findMany.mockResolvedValue([
        { key: "SITE_NAME", value: "DBCatalog", updatedAt: new Date() },
      ]);
      await initSettingsCache();
      expect(getSetting("SITE_NAME")).toBe("DBCatalog");
    });

    it("DB value overrides env var", async () => {
      process.env.SITE_NAME = "EnvCatalog";
      prismaMock.setting.findMany.mockResolvedValue([
        { key: "SITE_NAME", value: "DBCatalog", updatedAt: new Date() },
      ]);
      await initSettingsCache();
      expect(getSetting("SITE_NAME")).toBe("DBCatalog");
    });
  });

  describe("getAllSettings", () => {
    it("returns all 12 keys with defaults", async () => {
      prismaMock.setting.findMany.mockResolvedValue([]);
      const all = await getAllSettings();
      expect(Object.keys(all)).toHaveLength(SETTING_KEYS.length);
      expect(all.SITE_NAME).toBe("NextKAN");
      expect(all.ENABLE_COMMENTS).toBe("false");
      expect(all.DCAT_US_VERSION).toBe("v1.1");
    });

    it("includes DB overrides", async () => {
      prismaMock.setting.findMany.mockResolvedValue([
        { key: "SITE_NAME", value: "Custom", updatedAt: new Date() },
      ]);
      const all = await getAllSettings();
      expect(all.SITE_NAME).toBe("Custom");
    });
  });

  describe("setSetting", () => {
    it("upserts a single setting and invalidates cache", async () => {
      prismaMock.setting.upsert.mockResolvedValue({
        key: "SITE_NAME",
        value: "New",
        updatedAt: new Date(),
      });
      await setSetting("SITE_NAME", "New");
      expect(prismaMock.setting.upsert).toHaveBeenCalledWith({
        where: { key: "SITE_NAME" },
        update: { value: "New" },
        create: { key: "SITE_NAME", value: "New" },
      });
    });
  });

  describe("setSettings", () => {
    it("upserts multiple settings", async () => {
      prismaMock.setting.upsert.mockResolvedValue({
        key: "k",
        value: "v",
        updatedAt: new Date(),
      });
      await setSettings({ SITE_NAME: "A", SITE_URL: "https://a.com" });
      expect(prismaMock.setting.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe("initSettingsCache", () => {
    it("populates cache from DB", async () => {
      prismaMock.setting.findMany.mockResolvedValue([
        { key: "ENABLE_COMMENTS", value: "true", updatedAt: new Date() },
      ]);
      await initSettingsCache();
      expect(getSetting("ENABLE_COMMENTS")).toBe("true");
    });
  });

  describe("resetSettingsCache", () => {
    it("clears cache so getSetting falls back to env/defaults", async () => {
      prismaMock.setting.findMany.mockResolvedValue([
        { key: "SITE_NAME", value: "Cached", updatedAt: new Date() },
      ]);
      await initSettingsCache();
      expect(getSetting("SITE_NAME")).toBe("Cached");

      resetSettingsCache();
      expect(getSetting("SITE_NAME")).toBe("NextKAN");
    });
  });

  describe("getUserRegistrationMode", () => {
    it("returns disabled by default", () => {
      expect(getUserRegistrationMode()).toBe("disabled");
    });

    it("returns env var when set", () => {
      process.env.USER_REGISTRATION_MODE = "open";
      expect(getUserRegistrationMode()).toBe("open");
    });
  });

  describe("getUserDefaultRole", () => {
    it("returns viewer by default", () => {
      expect(getUserDefaultRole()).toBe("viewer");
    });

    it("returns env var when set", () => {
      process.env.USER_DEFAULT_ROLE = "editor";
      expect(getUserDefaultRole()).toBe("editor");
    });
  });
});
