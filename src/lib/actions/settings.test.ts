import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSession = vi.hoisted(() => ({
  user: {
    id: "admin-user-1",
    name: "Admin",
    email: "admin@example.com",
    role: "admin",
  },
}));

vi.mock("@/lib/db", async () => ({
  prisma: (await import("@/__mocks__/prisma")).default,
}));

vi.mock("@/lib/auth/check-permission", () => ({
  requirePermission: vi.fn().mockResolvedValue(mockSession),
  PermissionError: class PermissionError extends Error {
    constructor(p: string) {
      super(`Insufficient permissions: ${p} required`);
      this.name = "PermissionError";
    }
  },
}));

vi.mock("@/lib/services/activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/settings", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/services/settings")
  >("@/lib/services/settings");
  return {
    ...actual,
    getAllSettings: vi.fn().mockResolvedValue({
      SITE_NAME: "NextKAN",
      SITE_DESCRIPTION: "Open data catalog",
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
    }),
    setSettings: vi.fn().mockResolvedValue(undefined),
  };
});

import { getSettings, updateSettings } from "./settings";
import { logActivity } from "@/lib/services/activity";
import { setSettings } from "@/lib/services/settings";
import { requirePermission } from "@/lib/auth/check-permission";

describe("settings actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSettings", () => {
    it("requires admin permission", async () => {
      await getSettings();
      expect(requirePermission).toHaveBeenCalledWith("user:manage");
    });

    it("returns all settings", async () => {
      const result = await getSettings();
      expect(result).toHaveProperty("SITE_NAME");
      expect(result).toHaveProperty("ENABLE_COMMENTS");
      expect(Object.keys(result)).toHaveLength(12);
    });
  });

  describe("updateSettings", () => {
    it("requires admin permission", async () => {
      await updateSettings({ SITE_NAME: "Test" });
      expect(requirePermission).toHaveBeenCalledWith("user:manage");
    });

    it("calls setSettings with validated data", async () => {
      await updateSettings({ SITE_NAME: "New Name", ENABLE_COMMENTS: "true" });
      expect(setSettings).toHaveBeenCalledWith({
        SITE_NAME: "New Name",
        ENABLE_COMMENTS: "true",
      });
    });

    it("logs activity after update", async () => {
      await updateSettings({ SITE_NAME: "New Name" });
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "update",
          entityType: "settings",
          entityId: "site-settings",
        })
      );
    });

    it("does not call setSettings for empty input", async () => {
      await updateSettings({});
      expect(setSettings).not.toHaveBeenCalled();
    });

    it("rejects invalid SITE_URL", async () => {
      await expect(updateSettings({ SITE_URL: "bad" })).rejects.toThrow();
    });

    it("rejects invalid toggle value", async () => {
      await expect(
        updateSettings({ ENABLE_COMMENTS: "yes" } as any)
      ).rejects.toThrow();
    });
  });
});
