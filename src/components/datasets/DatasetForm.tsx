"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DistributionForm } from "./DistributionForm";
import { DistributionList } from "./DistributionList";
import { LICENSES, getLicenseByUrl } from "@/lib/data/licenses";
import { MetadataCompleteness } from "./MetadataCompleteness";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { CollapsibleSection } from "@/components/admin/CollapsibleSection";
import type { DatasetCreateInput } from "@/lib/schemas/dataset";
import type { TemplateFields } from "@/lib/schemas/template";

interface Organization {
  id: string;
  name: string;
}

interface ThemeOption {
  id: string;
  name: string;
}

interface Distribution {
  id?: string;
  title?: string | null;
  description?: string | null;
  downloadURL?: string | null;
  accessURL?: string | null;
  mediaType?: string | null;
  format?: string | null;
}

interface SeriesOption {
  id: string;
  title: string;
}

interface DatasetWithRelations {
  id: string;
  title: string;
  description: string;
  identifier: string;
  accessLevel: string;
  status: string;
  publisherId: string;
  contactName?: string | null;
  contactEmail?: string | null;
  bureauCode?: string | null;
  programCode?: string | null;
  license?: string | null;
  rights?: string | null;
  spatial?: string | null;
  temporal?: string | null;
  issued?: Date | null;
  accrualPeriodicity?: string | null;
  conformsTo?: string | null;
  dataQuality?: boolean | null;
  describedBy?: string | null;
  isPartOf?: string | null;
  landingPage?: string | null;
  language?: string | null;
  references?: string | null;
  keywords: { keyword: string }[];
  distributions: Distribution[];
  themes?: { theme: { id: string; name: string } }[];
  // DCAT-US v3.0
  version?: string | null;
  versionNotes?: string | null;
  seriesId?: string | null;
  previousVersion?: string | null;
}

interface CustomFieldDef {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  options: string[] | null;
  sortOrder: number;
}

interface DatasetFormProps {
  initialData?: DatasetWithRelations;
  defaultValues?: Partial<TemplateFields> & { customFields?: Record<string, string> };
  organizations: Organization[];
  themes?: ThemeOption[];
  series?: SeriesOption[];
  customFieldDefinitions?: CustomFieldDef[];
  initialCustomFieldValues?: Record<string, string>;
  onSubmit: (data: DatasetCreateInput & { distributions?: Distribution[]; customFields?: Record<string, string> }) => Promise<void>;
}

export function DatasetForm({
  initialData,
  defaultValues,
  organizations,
  themes: availableThemes = [],
  series: availableSeries = [],
  customFieldDefinitions: cfDefs = [],
  initialCustomFieldValues,
  onSubmit,
}: DatasetFormProps) {
  const router = useRouter();
  const dv = defaultValues || {};

  // Resolve license from defaultValues
  const dvLicenseMatch = dv.license ? getLicenseByUrl(dv.license) : undefined;

  // Basic Info
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [identifier, setIdentifier] = useState(initialData?.identifier || "");
  const [accessLevel, setAccessLevel] = useState(initialData?.accessLevel || dv.accessLevel || "public");
  const [status, setStatus] = useState(initialData?.status || "draft");
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>(
    initialData?.keywords.map((k) => k.keyword) || dv.keywords || []
  );

  // Themes
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>(
    initialData?.themes?.map((t) => t.theme.id) || dv.themeIds || []
  );

  // Publisher & Contact
  const [publisherId, setPublisherId] = useState(initialData?.publisherId || dv.publisherId || "");
  const [contactName, setContactName] = useState(initialData?.contactName || dv.contactName || "");
  const [contactEmail, setContactEmail] = useState(initialData?.contactEmail || dv.contactEmail || "");

  // Federal
  const [bureauCode, setBureauCode] = useState(initialData?.bureauCode || dv.bureauCode || "");
  const [programCode, setProgramCode] = useState(initialData?.programCode || dv.programCode || "");

  // Access & License
  const initialLicenseMatch = initialData?.license ? getLicenseByUrl(initialData.license) : undefined;
  const [licenseId, setLicenseId] = useState(
    initialLicenseMatch?.id || (initialData?.license ? "other" : "")
    || dvLicenseMatch?.id || (dv.license ? "other" : "")
  );
  const [customLicenseUrl, setCustomLicenseUrl] = useState(
    initialLicenseMatch ? "" : (initialData?.license || "")
    || (dvLicenseMatch ? "" : (dv.license || ""))
  );
  const [rights, setRights] = useState(initialData?.rights || dv.rights || "");
  const [landingPage, setLandingPage] = useState(initialData?.landingPage || dv.landingPage || "");

  // Coverage
  const [spatial, setSpatial] = useState(initialData?.spatial || dv.spatial || "");
  const [temporal, setTemporal] = useState(initialData?.temporal || dv.temporal || "");

  // Additional
  const [issued, setIssued] = useState(
    initialData?.issued ? new Date(initialData.issued).toISOString().split("T")[0] : ""
  );
  const [accrualPeriodicity, setAccrualPeriodicity] = useState(initialData?.accrualPeriodicity || dv.accrualPeriodicity || "");
  const [conformsTo, setConformsTo] = useState(initialData?.conformsTo || dv.conformsTo || "");
  const [dataQuality, setDataQuality] = useState(initialData?.dataQuality ?? dv.dataQuality ?? undefined);
  const [describedBy, setDescribedBy] = useState(initialData?.describedBy || dv.describedBy || "");
  const [isPartOf, setIsPartOf] = useState(initialData?.isPartOf || dv.isPartOf || "");
  const [language, setLanguage] = useState(initialData?.language || dv.language || "en-us");

  // DCAT-US v3.0
  const [dcatVersion, setDcatVersion] = useState(initialData?.version || dv.version || "");
  const [dcatVersionNotes, setDcatVersionNotes] = useState(initialData?.versionNotes || dv.versionNotes || "");
  const [seriesId, setSeriesId] = useState(initialData?.seriesId || dv.seriesId || "");
  const [previousVersion, setPreviousVersion] = useState(initialData?.previousVersion || dv.previousVersion || "");

  // Custom Fields
  const [customFields, setCustomFields] = useState<Record<string, string>>(() => {
    const initial = initialCustomFieldValues || dv.customFields || {};
    return { ...initial };
  });

  // Distributions
  const [distributions, setDistributions] = useState<Distribution[]>(
    initialData?.distributions || []
  );
  const [showDistForm, setShowDistForm] = useState(false);

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

  function addDistribution(dist: Distribution) {
    setDistributions([...distributions, dist]);
    setShowDistForm(false);
  }

  function removeDistribution(index: number) {
    setDistributions(distributions.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (!publisherId) {
      setError("Publisher is required");
      return;
    }
    if (keywords.length === 0) {
      setError("At least one keyword is required");
      return;
    }

    for (const def of cfDefs) {
      if (def.required && !customFields[def.name]?.trim()) {
        setError(`Custom field "${def.label}" is required`);
        return;
      }
    }

    setLoading(true);

    try {
      await onSubmit({
        title,
        description,
        identifier: identifier || undefined,
        accessLevel: accessLevel as "public" | "restricted public" | "non-public",
        status: status as "draft" | "published" | "archived",
        publisherId,
        contactName: contactName || undefined,
        contactEmail: contactEmail || undefined,
        keywords,
        themeIds: selectedThemeIds.length > 0 ? selectedThemeIds : undefined,
        bureauCode: bureauCode || undefined,
        programCode: programCode || undefined,
        license: licenseId === "other" ? (customLicenseUrl || undefined) : (LICENSES.find(l => l.id === licenseId)?.url || undefined),
        rights: rights || undefined,
        spatial: spatial || undefined,
        temporal: temporal || undefined,
        issued: issued ? new Date(issued).toISOString() : undefined,
        accrualPeriodicity: accrualPeriodicity || undefined,
        conformsTo: conformsTo || undefined,
        dataQuality,
        describedBy: describedBy || undefined,
        isPartOf: isPartOf || undefined,
        landingPage: landingPage || undefined,
        language: language || undefined,
        version: dcatVersion || undefined,
        versionNotes: dcatVersionNotes || undefined,
        seriesId: seriesId || undefined,
        previousVersion: previousVersion || undefined,
        distributions,
        customFields: cfDefs.length > 0 ? customFields : undefined,
      });
      router.push("/admin/datasets");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
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

      <MetadataCompleteness
        values={{
          title,
          description,
          keywords,
          publisherId,
          contactName,
          contactEmail,
          accessLevel,
          license: licenseId === "other" ? customLicenseUrl : (LICENSES.find(l => l.id === licenseId)?.url || ""),
          rights,
          spatial,
          temporal,
          accrualPeriodicity,
          landingPage,
          issued,
          language,
        }}
      />

      {/* Basic Info */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Basic Info</legend>
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="identifier">Identifier</Label>
          <Input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Auto-generated if blank"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="keywords">Keywords * (press Enter to add)</Label>
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
            <Label className="mb-1">Themes</Label>
            <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto border rounded p-2">
              {availableThemes.map((theme) => (
                <label key={theme.id} className="flex items-center gap-2 text-sm py-0.5">
                  <input
                    type="checkbox"
                    checked={selectedThemeIds.includes(theme.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
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
            <option value="public">Public</option>
            <option value="restricted public">Restricted Public</option>
            <option value="non-public">Non-Public</option>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </NativeSelect>
        </div>
      </fieldset>

      {/* Publisher & Contact */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Publisher & Contact</legend>
        <div className="space-y-2">
          <Label htmlFor="publisherId">Publisher *</Label>
          <NativeSelect
            id="publisherId"
            value={publisherId}
            onChange={(e) => setPublisherId(e.target.value)}
          >
            <option value="">Select publisher...</option>
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

      {/* Federal Fields */}
      <CollapsibleSection title="Federal Fields" defaultOpen={false} headingLevel="h3">
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
          </div>
        </fieldset>
      </CollapsibleSection>

      {/* Access & License */}
      <CollapsibleSection title="Access & License" defaultOpen={false} headingLevel="h3">
        <fieldset className="space-y-4 pl-4">
          <div className="space-y-2">
            <Label htmlFor="license">License</Label>
            <NativeSelect
              id="license"
              value={licenseId}
              onChange={(e) => setLicenseId(e.target.value)}
            >
              <option value="">No license selected</option>
              {LICENSES.map((l) => (
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
      <CollapsibleSection title="Coverage" defaultOpen={false} headingLevel="h3">
        <fieldset className="space-y-4 pl-4">
          <div className="space-y-2">
            <Label htmlFor="spatial">Spatial</Label>
            <Input
              id="spatial"
              type="text"
              value={spatial}
              onChange={(e) => setSpatial(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="temporal">Temporal</Label>
            <Input
              id="temporal"
              type="text"
              value={temporal}
              onChange={(e) => setTemporal(e.target.value)}
              placeholder="2020-01-01/2024-12-31"
            />
          </div>
        </fieldset>
      </CollapsibleSection>

      {/* Additional Metadata */}
      <CollapsibleSection title="Additional Metadata" defaultOpen={false} headingLevel="h3">
        <fieldset className="space-y-4 pl-4">
          <div className="space-y-2">
            <Label htmlFor="issued">Issued Date</Label>
            <Input
              id="issued"
              type="date"
              value={issued}
              onChange={(e) => setIssued(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accrualPeriodicity">Accrual Periodicity</Label>
            <Input
              id="accrualPeriodicity"
              type="text"
              value={accrualPeriodicity}
              onChange={(e) => setAccrualPeriodicity(e.target.value)}
              placeholder="R/P1Y"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conformsTo">Conforms To</Label>
            <Input
              id="conformsTo"
              type="url"
              value={conformsTo}
              onChange={(e) => setConformsTo(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="dataQuality"
              type="checkbox"
              checked={dataQuality === true}
              onChange={(e) => setDataQuality(e.target.checked ? true : undefined)}
            />
            <label htmlFor="dataQuality" className="text-sm font-medium">
              Data Quality
            </label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="describedBy">Described By</Label>
            <Input
              id="describedBy"
              type="url"
              value={describedBy}
              onChange={(e) => setDescribedBy(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="isPartOf">Is Part Of</Label>
            <Input
              id="isPartOf"
              type="text"
              value={isPartOf}
              onChange={(e) => setIsPartOf(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Input
              id="language"
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
          </div>
        </fieldset>
      </CollapsibleSection>

      {/* DCAT-US v3.0 */}
      {availableSeries.length > 0 && (
        <CollapsibleSection title="DCAT-US v3.0" defaultOpen={false} headingLevel="h3">
          <fieldset className="space-y-4 pl-4">
            <div className="space-y-2">
              <Label htmlFor="seriesId">Series</Label>
              <NativeSelect
                id="seriesId"
                value={seriesId}
                onChange={(e) => setSeriesId(e.target.value)}
              >
                <option value="">No series</option>
                {availableSeries.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dcatVersion">Version</Label>
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

      {/* Custom Fields */}
      {cfDefs.length > 0 && (
        <CollapsibleSection title="Custom Fields" defaultOpen={true} headingLevel="h3">
          <fieldset className="space-y-4 pl-4">
            {cfDefs.map((def) => {
              const cfValue = customFields[def.name] || "";
              const setCfValue = (v: string) =>
                setCustomFields({ ...customFields, [def.name]: v });

              if (def.type === "boolean") {
                return (
                  <div key={def.id} className="flex items-center gap-2">
                    <input
                      id={`cf-${def.name}`}
                      type="checkbox"
                      checked={cfValue === "true"}
                      onChange={(e) => setCfValue(e.target.checked ? "true" : "false")}
                    />
                    <label htmlFor={`cf-${def.name}`} className="text-sm font-medium">
                      {def.label}{def.required ? " *" : ""}
                    </label>
                  </div>
                );
              }

              if (def.type === "select") {
                return (
                  <div key={def.id} className="space-y-2">
                    <Label htmlFor={`cf-${def.name}`}>
                      {def.label}{def.required ? " *" : ""}
                    </Label>
                    <NativeSelect
                      id={`cf-${def.name}`}
                      value={cfValue}
                      onChange={(e) => setCfValue(e.target.value)}
                    >
                      <option value="">Select...</option>
                      {(def.options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </NativeSelect>
                  </div>
                );
              }

              if (def.type === "multiselect") {
                const selected: string[] = cfValue ? (() => { try { return JSON.parse(cfValue); } catch { return []; } })() : [];
                return (
                  <div key={def.id} className="space-y-2">
                    <Label>
                      {def.label}{def.required ? " *" : ""}
                    </Label>
                    <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto border rounded p-2">
                      {(def.options || []).map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-sm py-0.5">
                          <input
                            type="checkbox"
                            checked={selected.includes(opt)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...selected, opt]
                                : selected.filter((s) => s !== opt);
                              setCfValue(JSON.stringify(next));
                            }}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div key={def.id} className="space-y-2">
                  <Label htmlFor={`cf-${def.name}`}>
                    {def.label}{def.required ? " *" : ""}
                  </Label>
                  <Input
                    id={`cf-${def.name}`}
                    type={def.type === "number" ? "number" : def.type === "date" ? "date" : "text"}
                    value={cfValue}
                    onChange={(e) => setCfValue(e.target.value)}
                  />
                </div>
              );
            })}
          </fieldset>
        </CollapsibleSection>
      )}

      {/* Distributions */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Distributions</legend>
        <DistributionList
          distributions={distributions}
          onRemove={removeDistribution}
          editable
        />
        {showDistForm ? (
          <DistributionForm
            onAdd={addDistribution}
            onCancel={() => setShowDistForm(false)}
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDistForm(true)}
            className="border-dashed"
          >
            + Add Distribution
          </Button>
        )}
      </fieldset>

      {/* Submit */}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData ? "Update" : "Create"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/datasets")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
