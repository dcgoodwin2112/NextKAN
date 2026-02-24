"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DistributionForm } from "./DistributionForm";
import { DistributionList } from "./DistributionList";
import { LICENSES, getLicenseByUrl } from "@/lib/data/licenses";
import { MetadataCompleteness } from "./MetadataCompleteness";
import type { DatasetCreateInput } from "@/lib/schemas/dataset";

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

interface DatasetFormProps {
  initialData?: DatasetWithRelations;
  organizations: Organization[];
  themes?: ThemeOption[];
  series?: SeriesOption[];
  onSubmit: (data: DatasetCreateInput & { distributions?: Distribution[] }) => Promise<void>;
}

export function DatasetForm({
  initialData,
  organizations,
  themes: availableThemes = [],
  series: availableSeries = [],
  onSubmit,
}: DatasetFormProps) {
  const router = useRouter();

  // Basic Info
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [identifier, setIdentifier] = useState(initialData?.identifier || "");
  const [accessLevel, setAccessLevel] = useState(initialData?.accessLevel || "public");
  const [status, setStatus] = useState(initialData?.status || "draft");
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>(
    initialData?.keywords.map((k) => k.keyword) || []
  );

  // Themes
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>(
    initialData?.themes?.map((t) => t.theme.id) || []
  );

  // Publisher & Contact
  const [publisherId, setPublisherId] = useState(initialData?.publisherId || "");
  const [contactName, setContactName] = useState(initialData?.contactName || "");
  const [contactEmail, setContactEmail] = useState(initialData?.contactEmail || "");

  // Federal
  const [bureauCode, setBureauCode] = useState(initialData?.bureauCode || "");
  const [programCode, setProgramCode] = useState(initialData?.programCode || "");

  // Access & License
  const initialLicenseMatch = initialData?.license ? getLicenseByUrl(initialData.license) : undefined;
  const [licenseId, setLicenseId] = useState(initialLicenseMatch?.id || (initialData?.license ? "other" : ""));
  const [customLicenseUrl, setCustomLicenseUrl] = useState(
    initialLicenseMatch ? "" : (initialData?.license || "")
  );
  const [rights, setRights] = useState(initialData?.rights || "");
  const [landingPage, setLandingPage] = useState(initialData?.landingPage || "");

  // Coverage
  const [spatial, setSpatial] = useState(initialData?.spatial || "");
  const [temporal, setTemporal] = useState(initialData?.temporal || "");

  // Additional
  const [issued, setIssued] = useState(
    initialData?.issued ? new Date(initialData.issued).toISOString().split("T")[0] : ""
  );
  const [accrualPeriodicity, setAccrualPeriodicity] = useState(initialData?.accrualPeriodicity || "");
  const [conformsTo, setConformsTo] = useState(initialData?.conformsTo || "");
  const [dataQuality, setDataQuality] = useState(initialData?.dataQuality ?? undefined);
  const [describedBy, setDescribedBy] = useState(initialData?.describedBy || "");
  const [isPartOf, setIsPartOf] = useState(initialData?.isPartOf || "");
  const [language, setLanguage] = useState(initialData?.language || "en-us");

  // DCAT-US v3.0
  const [dcatVersion, setDcatVersion] = useState(initialData?.version || "");
  const [dcatVersionNotes, setDcatVersionNotes] = useState(initialData?.versionNotes || "");
  const [seriesId, setSeriesId] = useState(initialData?.seriesId || "");
  const [previousVersion, setPreviousVersion] = useState(initialData?.previousVersion || "");
  const [showV3, setShowV3] = useState(false);

  // Distributions
  const [distributions, setDistributions] = useState<Distribution[]>(
    initialData?.distributions || []
  );
  const [showDistForm, setShowDistForm] = useState(false);

  // Collapsible sections
  const [showFederal, setShowFederal] = useState(false);
  const [showAccess, setShowAccess] = useState(false);
  const [showCoverage, setShowCoverage] = useState(false);
  const [showAdditional, setShowAdditional] = useState(false);

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
        <div className="rounded bg-red-50 p-3 text-sm text-red-600" role="alert">
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
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description *
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded border px-3 py-2"
            rows={4}
          />
        </div>
        <div>
          <label htmlFor="identifier" className="block text-sm font-medium mb-1">
            Identifier
          </label>
          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="Auto-generated if blank"
          />
        </div>
        <div>
          <label htmlFor="keywords" className="block text-sm font-medium mb-1">
            Keywords * (press Enter to add)
          </label>
          <input
            id="keywords"
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={addKeyword}
            className="w-full rounded border px-3 py-2"
            placeholder="Type keyword and press Enter"
          />
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-sm text-blue-700"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    className="text-blue-500 hover:text-blue-800"
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
            <label className="block text-sm font-medium mb-1">Themes</label>
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
        <div>
          <label htmlFor="accessLevel" className="block text-sm font-medium mb-1">
            Access Level
          </label>
          <select
            id="accessLevel"
            value={accessLevel}
            onChange={(e) => setAccessLevel(e.target.value)}
            className="w-full rounded border px-3 py-2"
          >
            <option value="public">Public</option>
            <option value="restricted public">Restricted Public</option>
            <option value="non-public">Non-Public</option>
          </select>
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium mb-1">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded border px-3 py-2"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </fieldset>

      {/* Publisher & Contact */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Publisher & Contact</legend>
        <div>
          <label htmlFor="publisherId" className="block text-sm font-medium mb-1">
            Publisher *
          </label>
          <select
            id="publisherId"
            value={publisherId}
            onChange={(e) => setPublisherId(e.target.value)}
            className="w-full rounded border px-3 py-2"
          >
            <option value="">Select publisher...</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="contactName" className="block text-sm font-medium mb-1">
            Contact Name
          </label>
          <input
            id="contactName"
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="contactEmail" className="block text-sm font-medium mb-1">
            Contact Email
          </label>
          <input
            id="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>
      </fieldset>

      {/* Federal Fields */}
      <fieldset className="space-y-4">
        <button
          type="button"
          onClick={() => setShowFederal(!showFederal)}
          className="text-lg font-semibold flex items-center gap-2"
        >
          <span>{showFederal ? "▼" : "▶"}</span> Federal Fields
        </button>
        {showFederal && (
          <div className="space-y-4 pl-4">
            <div>
              <label htmlFor="bureauCode" className="block text-sm font-medium mb-1">
                Bureau Code
              </label>
              <input
                id="bureauCode"
                type="text"
                value={bureauCode}
                onChange={(e) => setBureauCode(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="015:11"
              />
            </div>
            <div>
              <label htmlFor="programCode" className="block text-sm font-medium mb-1">
                Program Code
              </label>
              <input
                id="programCode"
                type="text"
                value={programCode}
                onChange={(e) => setProgramCode(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="015:001"
              />
            </div>
          </div>
        )}
      </fieldset>

      {/* Access & License */}
      <fieldset className="space-y-4">
        <button
          type="button"
          onClick={() => setShowAccess(!showAccess)}
          className="text-lg font-semibold flex items-center gap-2"
        >
          <span>{showAccess ? "▼" : "▶"}</span> Access & License
        </button>
        {showAccess && (
          <div className="space-y-4 pl-4">
            <div>
              <label htmlFor="license" className="block text-sm font-medium mb-1">
                License
              </label>
              <select
                id="license"
                value={licenseId}
                onChange={(e) => setLicenseId(e.target.value)}
                className="w-full rounded border px-3 py-2"
              >
                <option value="">No license selected</option>
                {LICENSES.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              {licenseId === "other" && (
                <input
                  id="customLicenseUrl"
                  type="url"
                  value={customLicenseUrl}
                  onChange={(e) => setCustomLicenseUrl(e.target.value)}
                  className="w-full rounded border px-3 py-2 mt-2"
                  placeholder="Enter license URL"
                />
              )}
            </div>
            <div>
              <label htmlFor="rights" className="block text-sm font-medium mb-1">
                Rights
              </label>
              <input
                id="rights"
                type="text"
                value={rights}
                onChange={(e) => setRights(e.target.value)}
                className="w-full rounded border px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="landingPage" className="block text-sm font-medium mb-1">
                Landing Page
              </label>
              <input
                id="landingPage"
                type="url"
                value={landingPage}
                onChange={(e) => setLandingPage(e.target.value)}
                className="w-full rounded border px-3 py-2"
              />
            </div>
          </div>
        )}
      </fieldset>

      {/* Coverage */}
      <fieldset className="space-y-4">
        <button
          type="button"
          onClick={() => setShowCoverage(!showCoverage)}
          className="text-lg font-semibold flex items-center gap-2"
        >
          <span>{showCoverage ? "▼" : "▶"}</span> Coverage
        </button>
        {showCoverage && (
          <div className="space-y-4 pl-4">
            <div>
              <label htmlFor="spatial" className="block text-sm font-medium mb-1">
                Spatial
              </label>
              <input
                id="spatial"
                type="text"
                value={spatial}
                onChange={(e) => setSpatial(e.target.value)}
                className="w-full rounded border px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="temporal" className="block text-sm font-medium mb-1">
                Temporal
              </label>
              <input
                id="temporal"
                type="text"
                value={temporal}
                onChange={(e) => setTemporal(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="2020-01-01/2024-12-31"
              />
            </div>
          </div>
        )}
      </fieldset>

      {/* Additional Metadata */}
      <fieldset className="space-y-4">
        <button
          type="button"
          onClick={() => setShowAdditional(!showAdditional)}
          className="text-lg font-semibold flex items-center gap-2"
        >
          <span>{showAdditional ? "▼" : "▶"}</span> Additional Metadata
        </button>
        {showAdditional && (
          <div className="space-y-4 pl-4">
            <div>
              <label htmlFor="issued" className="block text-sm font-medium mb-1">
                Issued Date
              </label>
              <input
                id="issued"
                type="date"
                value={issued}
                onChange={(e) => setIssued(e.target.value)}
                className="w-full rounded border px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="accrualPeriodicity" className="block text-sm font-medium mb-1">
                Accrual Periodicity
              </label>
              <input
                id="accrualPeriodicity"
                type="text"
                value={accrualPeriodicity}
                onChange={(e) => setAccrualPeriodicity(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="R/P1Y"
              />
            </div>
            <div>
              <label htmlFor="conformsTo" className="block text-sm font-medium mb-1">
                Conforms To
              </label>
              <input
                id="conformsTo"
                type="url"
                value={conformsTo}
                onChange={(e) => setConformsTo(e.target.value)}
                className="w-full rounded border px-3 py-2"
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
            <div>
              <label htmlFor="describedBy" className="block text-sm font-medium mb-1">
                Described By
              </label>
              <input
                id="describedBy"
                type="url"
                value={describedBy}
                onChange={(e) => setDescribedBy(e.target.value)}
                className="w-full rounded border px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="isPartOf" className="block text-sm font-medium mb-1">
                Is Part Of
              </label>
              <input
                id="isPartOf"
                type="text"
                value={isPartOf}
                onChange={(e) => setIsPartOf(e.target.value)}
                className="w-full rounded border px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="language" className="block text-sm font-medium mb-1">
                Language
              </label>
              <input
                id="language"
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded border px-3 py-2"
              />
            </div>
          </div>
        )}
      </fieldset>

      {/* DCAT-US v3.0 */}
      {availableSeries.length > 0 && (
        <fieldset className="space-y-4">
          <button
            type="button"
            onClick={() => setShowV3(!showV3)}
            className="text-lg font-semibold flex items-center gap-2"
          >
            <span>{showV3 ? "▼" : "▶"}</span> DCAT-US v3.0
          </button>
          {showV3 && (
            <div className="space-y-4 pl-4">
              <div>
                <label htmlFor="seriesId" className="block text-sm font-medium mb-1">
                  Series
                </label>
                <select
                  id="seriesId"
                  value={seriesId}
                  onChange={(e) => setSeriesId(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                >
                  <option value="">No series</option>
                  {availableSeries.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dcatVersion" className="block text-sm font-medium mb-1">
                  Version
                </label>
                <input
                  id="dcatVersion"
                  type="text"
                  value={dcatVersion}
                  onChange={(e) => setDcatVersion(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                  placeholder="e.g. 2.1"
                />
              </div>
              <div>
                <label htmlFor="dcatVersionNotes" className="block text-sm font-medium mb-1">
                  Version Notes
                </label>
                <textarea
                  id="dcatVersionNotes"
                  value={dcatVersionNotes}
                  onChange={(e) => setDcatVersionNotes(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                  rows={2}
                />
              </div>
              <div>
                <label htmlFor="previousVersion" className="block text-sm font-medium mb-1">
                  Previous Version
                </label>
                <input
                  id="previousVersion"
                  type="text"
                  value={previousVersion}
                  onChange={(e) => setPreviousVersion(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                  placeholder="URL or identifier of previous version"
                />
              </div>
            </div>
          )}
        </fieldset>
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
          <button
            type="button"
            onClick={() => setShowDistForm(true)}
            className="rounded border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-800"
          >
            + Add Distribution
          </button>
        )}
      </fieldset>

      {/* Submit */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : initialData ? "Update" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/datasets")}
          className="rounded border px-4 py-2 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
