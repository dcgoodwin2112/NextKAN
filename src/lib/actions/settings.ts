"use server";

import { requirePermission } from "@/lib/auth/check-permission";
import { logActivity } from "@/lib/services/activity";
import {
  getAllSettings,
  setSettings,
} from "@/lib/services/settings";
import {
  settingsUpdateSchema,
  type SettingsUpdateInput,
} from "@/lib/schemas/settings";

export async function getSettings(): Promise<Record<string, string>> {
  await requirePermission("user:manage");
  return getAllSettings();
}

export async function updateSettings(
  input: SettingsUpdateInput
): Promise<Record<string, string>> {
  const session = await requirePermission("user:manage");
  const data = settingsUpdateSchema.parse(input);

  // Filter out undefined values
  const toSave: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      toSave[key] = value;
    }
  }

  if (Object.keys(toSave).length > 0) {
    await setSettings(toSave);

    logActivity({
      action: "update",
      entityType: "settings",
      entityId: "site-settings",
      entityName: "Site Settings",
      userId: (session.user as any)?.id,
      userName: session.user?.name,
      details: { keys: Object.keys(toSave) },
    }).catch(() => {});
  }

  return getAllSettings();
}
