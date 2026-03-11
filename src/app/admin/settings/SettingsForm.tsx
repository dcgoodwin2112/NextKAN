"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Zap, Database } from "lucide-react";
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
          <CardTitle className="flex items-center gap-2"><Settings className="size-5" /> General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="setting-site-name">Site Name</Label>
            <Input
              id="setting-site-name"
              value={settings.SITE_NAME}
              onChange={(e) => update("SITE_NAME", e.target.value)}
            />
            <p className="text-xs text-text-muted">Appears in the header, browser tabs, and catalog metadata.</p>
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
            <p className="text-xs text-text-muted">Base URL for absolute links in feeds, emails, and sitemaps (e.g., https://data.example.gov).</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="setting-site-logo">Logo URL</Label>
            <Input
              id="setting-site-logo"
              value={settings.SITE_LOGO}
              onChange={(e) => update("SITE_LOGO", e.target.value)}
              placeholder="Optional"
            />
            <p className="text-xs text-text-muted">URL to a logo image shown in the site header.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="setting-banner-text">Banner Text</Label>
            <Input
              id="setting-banner-text"
              value={settings.BANNER_TEXT}
              onChange={(e) => update("BANNER_TEXT", e.target.value)}
              placeholder="Optional"
            />
            <p className="text-xs text-text-muted">Slim banner above the header (e.g., &quot;An official open data catalog&quot;). Leave blank to hide.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="setting-footer-about">Footer About Text</Label>
            <Input
              id="setting-footer-about"
              value={settings.FOOTER_ABOUT}
              onChange={(e) => update("FOOTER_ABOUT", e.target.value)}
              placeholder="Optional"
            />
            <p className="text-xs text-text-muted">Short description displayed in the footer. Leave blank to hide.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="setting-hero-title">Hero Title</Label>
            <Input
              id="setting-hero-title"
              value={settings.HERO_TITLE}
              onChange={(e) => update("HERO_TITLE", e.target.value)}
              placeholder="Falls back to Site Name"
            />
            <p className="text-xs text-text-muted">Large headline on the homepage. Falls back to Site Name if blank.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="setting-hero-description">Hero Description</Label>
            <Input
              id="setting-hero-description"
              value={settings.HERO_DESCRIPTION}
              onChange={(e) => update("HERO_DESCRIPTION", e.target.value)}
              placeholder="Falls back to Site Description"
            />
            <p className="text-xs text-text-muted">Subheadline on the homepage. Falls back to Site Description if blank.</p>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="size-5" /> Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleField
            id="setting-enable-public-frontend"
            label="Public Frontend"
            value={settings.ENABLE_PUBLIC_FRONTEND}
            onChange={(v) => update("ENABLE_PUBLIC_FRONTEND", v)}
            help="Enable the built-in public frontend. Disable to serve your own frontend while keeping the API and admin."
          />
          <ToggleField
            id="setting-enable-comments"
            label="Enable Comments"
            value={settings.ENABLE_COMMENTS}
            onChange={(v) => update("ENABLE_COMMENTS", v)}
            help="Allow public users to post comments on dataset pages."
          />
          <ToggleField
            id="setting-comment-moderation"
            label="Comment Moderation"
            value={settings.COMMENT_MODERATION}
            onChange={(v) => update("COMMENT_MODERATION", v)}
            help="Require admin approval before comments appear publicly. Only applies when comments are enabled."
          />
          <ToggleField
            id="setting-enable-workflow"
            label="Enable Editorial Workflow"
            value={settings.ENABLE_WORKFLOW}
            onChange={(v) => update("ENABLE_WORKFLOW", v)}
            help="Require datasets to go through review before publishing (draft → pending review → approved → published)."
          />
          <ToggleField
            id="setting-enable-plugins"
            label="Enable Plugins"
            value={settings.ENABLE_PLUGINS}
            onChange={(v) => update("ENABLE_PLUGINS", v)}
            help="Load custom plugin modules from the ./plugins/ directory at server startup."
          />

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="setting-registration-mode">User Registration</Label>
              <NativeSelect
                id="setting-registration-mode"
                value={settings.USER_REGISTRATION_MODE}
                onChange={(e) => update("USER_REGISTRATION_MODE", e.target.value)}
                className="w-48"
              >
                <option value="disabled">Disabled</option>
                <option value="approval">Requires Approval</option>
                <option value="open">Open</option>
              </NativeSelect>
            </div>
            <p className="text-xs text-text-muted mt-1">disabled: no public signup. approval: admin must approve new accounts. open: instant access after email verification.</p>
          </div>

          {settings.USER_REGISTRATION_MODE !== "disabled" && (
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="setting-default-role">Default Registration Role</Label>
                <NativeSelect
                  id="setting-default-role"
                  value={settings.USER_DEFAULT_ROLE}
                  onChange={(e) => update("USER_DEFAULT_ROLE", e.target.value)}
                  className="w-48"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </NativeSelect>
              </div>
              <p className="text-xs text-text-muted mt-1">Role assigned to newly registered users. viewer: read-only. editor: can create and edit own datasets.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Catalog */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="size-5" /> Catalog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="setting-dcat-version">DCAT-US Version</Label>
            <NativeSelect
              id="setting-dcat-version"
              value={settings.DCAT_US_VERSION}
              onChange={(e) => update("DCAT_US_VERSION", e.target.value)}
            >
              <option value="v1.1">v1.1</option>
              <option value="v3.0">v3.0</option>
            </NativeSelect>
            <p className="text-xs text-text-muted">Schema version for the /data.json catalog endpoint. v3.0 adds versioning and series support.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="setting-harvest-api-key">Harvest API Key</Label>
            <Input
              id="setting-harvest-api-key"
              value={settings.HARVEST_API_KEY}
              onChange={(e) => update("HARVEST_API_KEY", e.target.value)}
              placeholder="Optional"
            />
            <p className="text-xs text-text-muted">Sent as authorization header when fetching from password-protected harvest sources.</p>
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
  help,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <NativeSelect
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-32"
        >
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </NativeSelect>
      </div>
      {help && <p className="text-xs text-text-muted mt-1">{help}</p>}
    </div>
  );
}
