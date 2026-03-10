"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LICENSES, getLicenseByUrl } from "@/lib/data/licenses";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { CollapsibleSection } from "@/components/admin/CollapsibleSection";
import { toast } from "sonner";
import type { TemplateCreateInput, TemplateFields } from "@/lib/schemas/template";

interface Organization {
  id: string;
  name: string;
}

interface ThemeOption {
  id: string;
  name: string;
}

interface SeriesOption {
  id: string;
  title: string;
}

interface TemplateData {
  id: string;
  name: string;
  description: string | null;
  organizationId: string | null;
  fields: TemplateFields;
}

interface LicenseOption {
  id: string;
  name: string;
  url: string | null;
}

interface TemplateFormProps {
  initialData?: TemplateData;
  organizations: Organization[];
  themes?: ThemeOption[];
  series?: SeriesOption[];
  licenses?: LicenseOption[];
  onSubmit: (data: TemplateCreateInput) => Promise<void>;
}

export function TemplateForm({
  initialData,
  organizations,
  themes: availableThemes = [],
  series: availableSeries = [],
  licenses: dbLicenses,
  onSubmit,
}: TemplateFormProps) {
  const router = useRouter();
  const fields = initialData?.fields || {};

  // Use DB licenses if provided, otherwise fall back to hardcoded list
  const activeLicenses = dbLicenses && dbLicenses.length > 0
    ? dbLicenses.map((l) => ({ id: l.id, name: l.name, url: l.url || "" }))
    : LICENSES;
  const findLicenseByUrl = (url: string) => activeLicenses.find((l) => l.url === url);

  // Template info
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [organizationId, setOrganizationId] = useState(initialData?.organizationId || "");

  // Publisher & Contact
  const [publisherId, setPublisherId] = useState(fields.publisherId || "");
  const [contactName, setContactName] = useState(fields.contactName || "");
  const [contactEmail, setContactEmail] = useState(fields.contactEmail || "");

  // Keywords & Themes
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>(fields.keywords || []);
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>(fields.themeIds || []);

  // Classification
  const [accessLevel, setAccessLevel] = useState(fields.accessLevel || "");

  // Federal
  const [bureauCode, setBureauCode] = useState(fields.bureauCode || "");
  const [programCode, setProgramCode] = useState(fields.programCode || "");

  // License
  const initialLicenseMatch = fields.license ? findLicenseByUrl(fields.license) : undefined;
  const [licenseId, setLicenseId] = useState(initialLicenseMatch?.id || (fields.license ? "other" : ""));
  const [customLicenseUrl, setCustomLicenseUrl] = useState(
    initialLicenseMatch ? "" : (fields.license || "")
  );
  const [rights, setRights] = useState(fields.rights || "");
  const [landingPage, setLandingPage] = useState(fields.landingPage || "");

  // Coverage
  const [spatial, setSpatial] = useState(fields.spatial || "");
  const [temporal, setTemporal] = useState(fields.temporal || "");

  // Additional
  const [accrualPeriodicity, setAccrualPeriodicity] = useState(fields.accrualPeriodicity || "");
  const [conformsTo, setConformsTo] = useState(fields.conformsTo || "");
  const [dataQuality, setDataQuality] = useState(fields.dataQuality ?? undefined);
  const [describedBy, setDescribedBy] = useState(fields.describedBy || "");
  const [isPartOf, setIsPartOf] = useState(fields.isPartOf || "");
  const [language, setLanguage] = useState(fields.language || "");

  // DCAT-US v3.0
  const [dcatVersion, setDcatVersion] = useState(fields.version || "");
  const [dcatVersionNotes, setDcatVersionNotes] = useState(fields.versionNotes || "");
  const [seriesId, setSeriesId] = useState(fields.seriesId || "");
  const [previousVersion, setPreviousVersion] = useState(fields.previousVersion || "");

  // UI state
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function addKeyword(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      const kw = keywordInput.trim();
      if (kw && !keywords.includes(kw)) {
        setKeywords([...keywords, kw]);
      }
      setKeywordInput("");
    }
  }

  function removeKeyword(kw: string) {
    setKeywords(keywords.filter((k) => k !== kw));
  }

  /** Build the fields object, stripping empty/undefined values. */
  function buildFields(): TemplateFields {
    const f: TemplateFields = {};
    if (publisherId) f.publisherId = publisherId;
    if (contactName) f.contactName = contactName;
    if (contactEmail) f.contactEmail = contactEmail;
    if (keywords.length > 0) f.keywords = keywords;
    if (selectedThemeIds.length > 0) f.themeIds = selectedThemeIds;
    if (accessLevel) f.accessLevel = accessLevel as TemplateFields["accessLevel"];
    if (bureauCode) f.bureauCode = bureauCode;
    if (programCode) f.programCode = programCode;
    const licenseUrl = licenseId === "other" ? customLicenseUrl : (activeLicenses.find(l => l.id === licenseId)?.url || "");
    if (licenseUrl) f.license = licenseUrl;
    if (rights) f.rights = rights;
    if (landingPage) f.landingPage = landingPage;
    if (spatial) f.spatial = spatial;
    if (temporal) f.temporal = temporal;
    if (accrualPeriodicity) f.accrualPeriodicity = accrualPeriodicity;
    if (conformsTo) f.conformsTo = conformsTo;
    if (dataQuality !== undefined) f.dataQuality = dataQuality;
    if (describedBy) f.describedBy = describedBy;
    if (isPartOf) f.isPartOf = isPartOf;
    if (language) f.language = language;
    if (dcatVersion) f.version = dcatVersion;
    if (dcatVersionNotes) f.versionNotes = dcatVersionNotes;
    if (seriesId) f.seriesId = seriesId;
    if (previousVersion) f.previousVersion = previousVersion;
    return f;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Template name is required");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name,
        description: description || undefined,
        organizationId: organizationId || undefined,
        fields: buildFields(),
      });
      router.push("/admin/templates");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {error && (
        <div className="rounded bg-danger-subtle p-3 text-sm text-danger-text" role="alert">
          {error}
        </div>
      )}

      {/* Template Info */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Template Info</legend>
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="organizationId">Scope</Label>
          <NativeSelect
            id="organizationId"
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
      </fieldset>

      {/* Publisher & Contact Presets */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Publisher & Contact</legend>
        <div className="space-y-2">
          <Label htmlFor="publisherId">Publisher</Label>
          <NativeSelect
            id="publisherId"
            value={publisherId}
            onChange={(e) => setPublisherId(e.target.value)}
          >
            <option value="">No default</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactName">Contact Name</Label>
          <Input
            id="contactName"
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </div>
      </fieldset>

      {/* Keywords & Themes */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Keywords & Themes</legend>
        <div className="space-y-2">
          <Label htmlFor="keywords">Default Keywords (press Enter to add)</Label>
          <Input
            id="keywords"
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={addKeyword}
            placeholder="Type keyword and press Enter"
          />
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 rounded bg-primary-subtle px-2 py-0.5 text-sm text-primary-subtle-text"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    className="text-primary hover:opacity-80"
                    aria-label={`Remove keyword ${kw}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        {availableThemes.length > 0 && (
          <div>
            <Label className="mb-1">Default Themes</Label>
            <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto border rounded p-2">
              {availableThemes.map((theme) => (
                <label key={theme.id} className="flex items-center gap-2 text-sm py-0.5">
                  <Checkbox
                    checked={selectedThemeIds.includes(theme.id)}
                    onCheckedChange={(c) => {
                      if (c === true) {
                        setSelectedThemeIds([...selectedThemeIds, theme.id]);
                      } else {
                        setSelectedThemeIds(selectedThemeIds.filter((id) => id !== theme.id));
                      }
                    }}
                  />
                  {theme.name}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="accessLevel">Access Level</Label>
          <NativeSelect
            id="accessLevel"
            value={accessLevel}
            onChange={(e) => setAccessLevel(e.target.value)}
          >
            <option value="">No default</option>
            <option value="public">Public</option>
            <option value="restricted public">Restricted Public</option>
            <option value="non-public">Non-Public</option>
          </NativeSelect>
        </div>
      </fieldset>

      {/* Federal Fields */}
      <CollapsibleSection title="Federal Fields" defaultOpen={false} headingLevel="h2">
        <fieldset className="space-y-4 pl-4">
          <div className="space-y-2">
            <Label htmlFor="bureauCode">Bureau Code</Label>
            <Input
              id="bureauCode"
              type="text"
              value={bureauCode}
              onChange={(e) => setBureauCode(e.target.value)}
              placeholder="015:11"
            />
            <p className="text-xs text-text-muted">OMB agency/bureau code (format: 000:00).</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="programCode">Program Code</Label>
            <Input
              id="programCode"
              type="text"
              value={programCode}
              onChange={(e) => setProgramCode(e.target.value)}
              placeholder="015:001"
            />
            <p className="text-xs text-text-muted">Federal program inventory code (format: 000:000).</p>
          </div>
        </fieldset>
      </CollapsibleSection>

      {/* Access & License */}
      <CollapsibleSection title="Access & License" defaultOpen={false} headingLevel="h2">
        <fieldset className="space-y-4 pl-4">
          <div className="space-y-2">
            <Label htmlFor="license">License</Label>
            <NativeSelect
              id="license"
              value={licenseId}
              onChange={(e) => setLicenseId(e.target.value)}
            >
              <option value="">No default</option>
              {activeLicenses.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </NativeSelect>
            {licenseId === "other" && (
              <Input
                id="customLicenseUrl"
                type="url"
                value={customLicenseUrl}
                onChange={(e) => setCustomLicenseUrl(e.target.value)}
                className="mt-2"
                placeholder="Enter license URL"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rights">Rights</Label>
            <Input
              id="rights"
              type="text"
              value={rights}
              onChange={(e) => setRights(e.target.value)}
            />
            <p className="text-xs text-text-muted">Additional access or use restrictions beyond the license.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="landingPage">Landing Page</Label>
            <Input
              id="landingPage"
              type="url"
              value={landingPage}
              onChange={(e) => setLandingPage(e.target.value)}
            />
          </div>
        </fieldset>
      </CollapsibleSection>

      {/* Coverage */}
      <CollapsibleSection title="Coverage" defaultOpen={false} headingLevel="h2">
        <fieldset className="space-y-4 pl-4">
          <div className="space-y-2">
            <Label htmlFor="spatial">Spatial Coverage</Label>
            <Input
              id="spatial"
              type="text"
              value={spatial}
              onChange={(e) => setSpatial(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="temporal">Temporal Coverage</Label>
            <Input
              id="temporal"
              type="text"
              value={temporal}
              onChange={(e) => setTemporal(e.target.value)}
              placeholder="2020-01-01/2024-12-31"
            />
            <p className="text-xs text-text-muted">Time period covered as start/end dates.</p>
          </div>
        </fieldset>
      </CollapsibleSection>

      {/* Additional Metadata */}
      <CollapsibleSection title="Additional Metadata" defaultOpen={false} headingLevel="h2">
        <fieldset className="space-y-4 pl-4">
          <div className="space-y-2">
            <Label htmlFor="accrualPeriodicity">Update Frequency</Label>
            <Input
              id="accrualPeriodicity"
              type="text"
              value={accrualPeriodicity}
              onChange={(e) => setAccrualPeriodicity(e.target.value)}
              placeholder="R/P1Y"
            />
            <p className="text-xs text-text-muted">ISO 8601 duration: R/P1D (daily), R/P1W (weekly), R/P1M (monthly), R/P1Y (annually).</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="conformsTo">Conforms To</Label>
            <Input
              id="conformsTo"
              type="url"
              value={conformsTo}
              onChange={(e) => setConformsTo(e.target.value)}
            />
            <p className="text-xs text-text-muted">URL of a standard or schema this dataset conforms to.</p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="dataQuality"
              checked={dataQuality === true}
              onCheckedChange={(c) => setDataQuality(c === true ? true : undefined)}
            />
            <label htmlFor="dataQuality" className="text-sm font-medium">
              Data Quality
            </label>
          </div>
          <p className="text-xs text-text-muted ml-6">Certifies this data meets your agency&apos;s quality standards.</p>
          <div className="space-y-2">
            <Label htmlFor="describedBy">Described By</Label>
            <Input
              id="describedBy"
              type="url"
              value={describedBy}
              onChange={(e) => setDescribedBy(e.target.value)}
            />
            <p className="text-xs text-text-muted">URL to a data dictionary or schema describing this dataset&apos;s structure.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="isPartOf">Is Part Of</Label>
            <Input
              id="isPartOf"
              type="text"
              value={isPartOf}
              onChange={(e) => setIsPartOf(e.target.value)}
            />
            <p className="text-xs text-text-muted">Identifier of a parent dataset or collection this belongs to.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Input
              id="language"
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
            <p className="text-xs text-text-muted">BCP 47 language code (e.g., en-US, es, fr).</p>
          </div>
        </fieldset>
      </CollapsibleSection>

      {/* DCAT-US v3.0 */}
      {availableSeries.length > 0 && (
        <CollapsibleSection title="DCAT-US v3.0" defaultOpen={false} headingLevel="h2">
          <fieldset className="space-y-4 pl-4">
            <div className="space-y-2">
              <Label htmlFor="seriesId">Series</Label>
              <NativeSelect
                id="seriesId"
                value={seriesId}
                onChange={(e) => setSeriesId(e.target.value)}
              >
                <option value="">No default</option>
                {availableSeries.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dcatVersion">Data Version</Label>
              <Input
                id="dcatVersion"
                type="text"
                value={dcatVersion}
                onChange={(e) => setDcatVersion(e.target.value)}
                placeholder="e.g. 2.1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dcatVersionNotes">Version Notes</Label>
              <Textarea
                id="dcatVersionNotes"
                value={dcatVersionNotes}
                onChange={(e) => setDcatVersionNotes(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="previousVersion">Previous Version</Label>
              <Input
                id="previousVersion"
                type="text"
                value={previousVersion}
                onChange={(e) => setPreviousVersion(e.target.value)}
                placeholder="URL or identifier of previous version"
              />
            </div>
          </fieldset>
        </CollapsibleSection>
      )}

      {/* Submit */}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData ? "Update Template" : "Create Template"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/templates")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
