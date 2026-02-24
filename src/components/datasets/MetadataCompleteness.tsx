"use client";

interface MetadataField {
  key: string;
  label: string;
  required: boolean;
}

const DCAT_FIELDS: MetadataField[] = [
  { key: "title", label: "Title", required: true },
  { key: "description", label: "Description", required: true },
  { key: "keywords", label: "Keywords", required: true },
  { key: "publisherId", label: "Publisher", required: true },
  { key: "contactName", label: "Contact Name", required: false },
  { key: "contactEmail", label: "Contact Email", required: false },
  { key: "accessLevel", label: "Access Level", required: true },
  { key: "license", label: "License", required: false },
  { key: "rights", label: "Rights", required: false },
  { key: "spatial", label: "Spatial Coverage", required: false },
  { key: "temporal", label: "Temporal Coverage", required: false },
  { key: "accrualPeriodicity", label: "Update Frequency", required: false },
  { key: "landingPage", label: "Landing Page", required: false },
  { key: "issued", label: "Release Date", required: false },
  { key: "language", label: "Language", required: false },
];

interface MetadataCompletenessProps {
  values: Record<string, unknown>;
}

function isFieldFilled(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function MetadataCompleteness({ values }: MetadataCompletenessProps) {
  const filled = DCAT_FIELDS.filter((f) => isFieldFilled(values[f.key]));
  const percentage = Math.round((filled.length / DCAT_FIELDS.length) * 100);
  const missing = DCAT_FIELDS.filter((f) => !isFieldFilled(values[f.key]));

  return (
    <div className="rounded border p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Metadata Completeness</h3>
        <span className="text-sm font-medium">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all ${
            percentage === 100 ? "bg-green-500" : percentage >= 60 ? "bg-blue-500" : "bg-yellow-500"
          }`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {missing.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Missing fields:</p>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {missing.map((f) => (
              <li key={f.key} className="flex items-center gap-1">
                <span className={f.required ? "text-red-500" : "text-gray-500"}>
                  {f.required ? "*" : "-"}
                </span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
