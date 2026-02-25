"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateSettings } from "@/lib/actions/settings";

interface SettingsFormProps {
  initialSettings: Record<string, string>;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  function update(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-6">
      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="setting-site-name">Site Name</Label>
            <Input
              id="setting-site-name"
              value={settings.SITE_NAME}
              onChange={(e) => update("SITE_NAME", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="setting-site-description">Site Description</Label>
            <Input
              id="setting-site-description"
              value={settings.SITE_DESCRIPTION}
              onChange={(e) => update("SITE_DESCRIPTION", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="setting-site-url">Site URL</Label>
            <Input
              id="setting-site-url"
              type="url"
              value={settings.SITE_URL}
              onChange={(e) => update("SITE_URL", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="setting-site-logo">Logo URL</Label>
            <Input
              id="setting-site-logo"
              value={settings.SITE_LOGO}
              onChange={(e) => update("SITE_LOGO", e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="setting-hero-title">Hero Title</Label>
            <Input
              id="setting-hero-title"
              value={settings.HERO_TITLE}
              onChange={(e) => update("HERO_TITLE", e.target.value)}
              placeholder="Falls back to Site Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="setting-hero-description">Hero Description</Label>
            <Input
              id="setting-hero-description"
              value={settings.HERO_DESCRIPTION}
              onChange={(e) => update("HERO_DESCRIPTION", e.target.value)}
              placeholder="Falls back to Site Description"
            />
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleField
            id="setting-enable-comments"
            label="Enable Comments"
            value={settings.ENABLE_COMMENTS}
            onChange={(v) => update("ENABLE_COMMENTS", v)}
          />
          <ToggleField
            id="setting-comment-moderation"
            label="Comment Moderation"
            value={settings.COMMENT_MODERATION}
            onChange={(v) => update("COMMENT_MODERATION", v)}
          />
          <ToggleField
            id="setting-enable-workflow"
            label="Enable Editorial Workflow"
            value={settings.ENABLE_WORKFLOW}
            onChange={(v) => update("ENABLE_WORKFLOW", v)}
          />
          <ToggleField
            id="setting-enable-plugins"
            label="Enable Plugins"
            value={settings.ENABLE_PLUGINS}
            onChange={(v) => update("ENABLE_PLUGINS", v)}
          />
        </CardContent>
      </Card>

      {/* Catalog */}
      <Card>
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="setting-dcat-version">DCAT-US Version</Label>
            <select
              id="setting-dcat-version"
              value={settings.DCAT_US_VERSION}
              onChange={(e) => update("DCAT_US_VERSION", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="v1.1">v1.1</option>
              <option value="v3.0">v3.0</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="setting-harvest-api-key">Harvest API Key</Label>
            <Input
              id="setting-harvest-api-key"
              value={settings.HARVEST_API_KEY}
              onChange={(e) => update("HARVEST_API_KEY", e.target.value)}
              placeholder="Optional"
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}

function ToggleField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
      >
        <option value="true">Enabled</option>
        <option value="false">Disabled</option>
      </select>
    </div>
  );
}
