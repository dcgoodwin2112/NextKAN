"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTemplate } from "@/lib/actions/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { TemplateFields } from "@/lib/schemas/template";

interface Organization {
  id: string;
  name: string;
}

interface DatasetFields {
  publisherId?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  accessLevel?: string;
  keywords?: { keyword: string }[];
  themes?: { theme: { id: string } }[];
  bureauCode?: string | null;
  programCode?: string | null;
  license?: string | null;
  rights?: string | null;
  landingPage?: string | null;
  spatial?: string | null;
  temporal?: string | null;
  accrualPeriodicity?: string | null;
  conformsTo?: string | null;
  dataQuality?: boolean | null;
  describedBy?: string | null;
  isPartOf?: string | null;
  language?: string | null;
  version?: string | null;
  versionNotes?: string | null;
  seriesId?: string | null;
  previousVersion?: string | null;
}

interface SaveAsTemplateButtonProps {
  datasetFields: DatasetFields;
  organizations: Organization[];
}

export function SaveAsTemplateButton({
  datasetFields,
  organizations,
}: SaveAsTemplateButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [loading, setLoading] = useState(false);

  /** Extract non-empty fields from the dataset into a TemplateFields object. */
  function extractFields(): TemplateFields {
    const f: TemplateFields = {};
    const d = datasetFields;
    if (d.publisherId) f.publisherId = d.publisherId;
    if (d.contactName) f.contactName = d.contactName;
    if (d.contactEmail) f.contactEmail = d.contactEmail;
    if (d.accessLevel) f.accessLevel = d.accessLevel as TemplateFields["accessLevel"];
    if (d.keywords?.length) f.keywords = d.keywords.map((k) => k.keyword);
    if (d.themes?.length) f.themeIds = d.themes.map((t) => t.theme.id);
    if (d.bureauCode) f.bureauCode = d.bureauCode;
    if (d.programCode) f.programCode = d.programCode;
    if (d.license) f.license = d.license;
    if (d.rights) f.rights = d.rights;
    if (d.landingPage) f.landingPage = d.landingPage;
    if (d.spatial) f.spatial = d.spatial;
    if (d.temporal) f.temporal = d.temporal;
    if (d.accrualPeriodicity) f.accrualPeriodicity = d.accrualPeriodicity;
    if (d.conformsTo) f.conformsTo = d.conformsTo;
    if (d.dataQuality != null) f.dataQuality = d.dataQuality;
    if (d.describedBy) f.describedBy = d.describedBy;
    if (d.isPartOf) f.isPartOf = d.isPartOf;
    if (d.language) f.language = d.language;
    if (d.version) f.version = d.version;
    if (d.versionNotes) f.versionNotes = d.versionNotes;
    if (d.seriesId) f.seriesId = d.seriesId;
    if (d.previousVersion) f.previousVersion = d.previousVersion;
    return f;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createTemplate({
        name,
        description: description || undefined,
        organizationId: organizationId || undefined,
        fields: extractFields(),
      });
      toast.success("Template created");
      setOpen(false);
      setName("");
      setDescription("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Save as Template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Dataset as Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tpl-name">Template Name *</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Federal Health Dataset"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tpl-desc">Description</Label>
            <Textarea
              id="tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tpl-org">Scope</Label>
            <NativeSelect
              id="tpl-org"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
            >
              <option value="">Global (available to all)</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <p className="text-sm text-text-muted">
            {Object.keys(extractFields()).length} field(s) will be saved.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
